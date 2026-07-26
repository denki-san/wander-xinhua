import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const candidatePath = "docs/research/film-art-center-map-candidate-v2.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

function rounded(value, precision = 12) {
  return Number(value.toFixed(precision));
}

function sourceRectangle(obstacle, margin = 0) {
  return [
    [obstacle.minX - margin, -(obstacle.maxZ + margin)],
    [obstacle.maxX + margin, -(obstacle.maxZ + margin)],
    [obstacle.maxX + margin, -(obstacle.minZ - margin)],
    [obstacle.minX - margin, -(obstacle.minZ - margin)],
  ];
}

function transformLocal(points, placement) {
  const cosine = Math.cos(placement.yaw);
  const sine = Math.sin(placement.yaw);
  return points.map(([localX, localZ]) => [
    placement.position[0]
      + placement.scale * (cosine * localX + sine * localZ),
    placement.position[1]
      + placement.scale * (-sine * localX + cosine * localZ),
  ]);
}

function bounds(points, margin = 0) {
  return {
    minX: Math.min(...points.map(([x]) => x)) - margin,
    maxX: Math.max(...points.map(([x]) => x)) + margin,
    minZ: Math.min(...points.map(([, z]) => z)) - margin,
    maxZ: Math.max(...points.map(([, z]) => z)) + margin,
  };
}

function aabbDistance(left, right) {
  return Math.hypot(
    Math.max(left.minX - right.maxX, right.minX - left.maxX, 0),
    Math.max(left.minZ - right.maxZ, right.minZ - left.maxZ, 0),
  );
}

function aabbOverlap(left, right) {
  const x = Math.min(left.maxX, right.maxX) - Math.max(left.minX, right.minX);
  const z = Math.min(left.maxZ, right.maxZ) - Math.max(left.minZ, right.minZ);
  return {
    intersects: x >= 0 && z >= 0,
    x,
    z,
    area: x * z,
  };
}

function pointToSegment(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const ratio = lengthSquared === 0
    ? 0
    : Math.min(1, Math.max(
      0,
      ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz)
        / lengthSquared,
    ));
  return Math.hypot(
    point[0] - start[0] - dx * ratio,
    point[1] - start[1] - dz * ratio,
  );
}

function cross(a, b, c) {
  return (
    (b[0] - a[0]) * (c[1] - a[1])
    - (b[1] - a[1]) * (c[0] - a[0])
  );
}

function pointOnSegment(point, start, end) {
  return (
    Math.abs(cross(start, end, point)) < 1e-9
    && point[0] >= Math.min(start[0], end[0]) - 1e-9
    && point[0] <= Math.max(start[0], end[0]) + 1e-9
    && point[1] >= Math.min(start[1], end[1]) - 1e-9
    && point[1] <= Math.max(start[1], end[1]) + 1e-9
  );
}

function segmentsIntersect(a, b, c, d) {
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  return (
    (
      ((abC > 0 && abD < 0) || (abC < 0 && abD > 0))
      && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))
    )
    || pointOnSegment(c, a, b)
    || pointOnSegment(d, a, b)
    || pointOnSegment(a, c, d)
    || pointOnSegment(b, c, d)
  );
}

function segmentDistance(a, b, c, d) {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(
    pointToSegment(a, c, d),
    pointToSegment(b, c, d),
    pointToSegment(c, a, b),
    pointToSegment(d, a, b),
  );
}

function polygonDistance(left, right) {
  let minimum = Infinity;
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      minimum = Math.min(
        minimum,
        segmentDistance(
          left[leftIndex],
          left[(leftIndex + 1) % left.length],
          right[rightIndex],
          right[(rightIndex + 1) % right.length],
        ),
      );
    }
  }
  return minimum;
}

function polygonToPolylineDistance(polygon, polyline) {
  let minimum = Infinity;
  for (let edgeIndex = 0; edgeIndex < polygon.length; edgeIndex += 1) {
    for (
      let segmentIndex = 0;
      segmentIndex < polyline.length - 1;
      segmentIndex += 1
    ) {
      minimum = Math.min(
        minimum,
        segmentDistance(
          polygon[edgeIndex],
          polygon[(edgeIndex + 1) % polygon.length],
          polyline[segmentIndex],
          polyline[segmentIndex + 1],
        ),
      );
    }
  }
  return minimum;
}

function roadWidth(road, environmentScale) {
  if (road.name === "新华路" && road.highway.startsWith("tertiary")) {
    return 0.98 * environmentScale;
  }
  if (road.highway.startsWith("tertiary")) return 1.45 * environmentScale;
  if (road.highway === "residential") return 0.9 * environmentScale;
  if (
    road.highway === "living_street"
    || road.highway === "unclassified"
  ) {
    return 0.68 * environmentScale;
  }
  return 0.5 * environmentScale;
}

test("Film Massing v2 候选锁定历史 transform，官方 footprint rescue 接管当前 transform", async () => {
  const [candidate, registry, mcp, rescue] = await Promise.all([
    readJson(candidatePath),
    readJson("app/scene/xinhua-road-landmarks-data.json"),
    readJson("docs/research/film-art-center-blender-mcp-gates-v2.json"),
    readJson("docs/research/film-art-center-road-evidence-rescue-2026-07-26.json"),
  ]);
  const film = registry.landmarks.find(({ id }) => id === "film-art-center");
  const cinema = registry.landmarks.find(({ id }) => id === "shanghai-cinema");

  assert.notDeepEqual(
    candidate.formalPlacements.filmArtCenter.position,
    film.position,
  );
  assert.notEqual(candidate.formalPlacements.filmArtCenter.yaw, film.yaw);
  assert.notEqual(candidate.formalPlacements.filmArtCenter.scale, film.scale);
  assert.deepEqual(film.position, rescue.acceptedCandidate.positionScene);
  assert.equal(film.yaw, rescue.acceptedCandidate.yawRadians);
  assert.equal(film.scale, rescue.acceptedCandidate.runtimeScale);
  assert.deepEqual(
    film.localObstacles,
    [rescue.acceptedCandidate.localCollisionRectangle],
  );
  assert.deepEqual(
    candidate.formalPlacements.shanghaiCinemaReadOnly.position,
    cinema.position,
  );
  assert.equal(candidate.formalPlacements.shanghaiCinemaReadOnly.yaw, cinema.yaw);
  assert.equal(candidate.formalPlacements.shanghaiCinemaReadOnly.scale, cinema.scale);
  assert.equal(candidate.formalPlacements.filmArtCenter.transformChanged, false);
  assert.equal(mcp.mcp1.status, "pass");
  assert.equal(mcp.mcp1.runtimeAsset.sha256, candidate.sources.massingGlb.sha256);

  for (const source of Object.values(candidate.sources)) {
    if (!source.path || !source.sha256) continue;
    if (
      source.path === "app/scene/xinhua-road-landmarks-data.json"
      || source.path.includes("shanghai-cinema")
    ) {
      // 候选窗口只读冻结当时 registry；后续主窗口接入其他建筑会合法
      // 推进共享文件；相邻上海影城的阻塞审计也不属于本次 8 栋合并，
      // 因此这里只保留 review-time SHA，不要求把对应文件带入 main。
      assert.match(source.sha256, /^[0-9a-f]{64}$/);
      continue;
    }
    assert.equal(await sha256(source.path), source.sha256);
  }
});

test("旧邻栋 world AABB 冲突是 rotated-AABB 假阳性", async () => {
  const candidate = await readJson(candidatePath);
  const film = candidate.formalPlacements.filmArtCenter;
  const cinema = candidate.formalPlacements.shanghaiCinemaReadOnly;
  const margin = candidate.neighborCollision.runtimeMarginPerAssetSceneUnits;
  const filmObstacle = film.sourceLocalSolidObstacles[1];
  const cinemaObstacle = cinema.sourceLocalSolidObstacles[2];
  const filmAabb = bounds(
    transformLocal(sourceRectangle(filmObstacle), film),
    margin,
  );
  const cinemaAabb = bounds(
    transformLocal(sourceRectangle(cinemaObstacle), cinema),
    margin,
  );
  const overlap = aabbOverlap(cinemaAabb, filmAabb);
  const physicalGap = polygonDistance(
    transformLocal(sourceRectangle(cinemaObstacle), cinema),
    transformLocal(sourceRectangle(filmObstacle), film),
  );
  const marginGap = polygonDistance(
    transformLocal(sourceRectangle(cinemaObstacle, margin), cinema),
    transformLocal(sourceRectangle(filmObstacle, margin), film),
  );

  assert.equal(overlap.intersects, true);
  for (const key of ["x", "z", "area"]) {
    assert.ok(
      Math.abs(
        overlap[key]
          - candidate.neighborCollision.priorWorldAabb.overlapSceneUnits[key]
      ) < 1e-12,
    );
  }
  assert.equal(
    rounded(physicalGap),
    rounded(candidate.neighborCollision.exactObb.physicalMinimumGapSceneUnits),
  );
  assert.equal(
    rounded(marginGap),
    rounded(
      candidate.neighborCollision.exactObb
        .minimumGapAfterBothPointTwoMarginsSceneUnits,
    ),
  );
  assert.ok(marginGap > 0);
});

test("Film 历史左翼 local-X 二分完整覆盖且消除当时的邻栋 AABB 交叉", async () => {
  const candidate = await readJson(candidatePath);
  const film = candidate.formalPlacements.filmArtCenter;
  const cinema = candidate.formalPlacements.shanghaiCinemaReadOnly;
  const proxies = candidate.neighborCollision.completeCoverSplitShell.proxies;
  const margin = candidate.neighborCollision.runtimeMarginPerAssetSceneUnits;
  const sourceLeft = film.sourceLocalSolidObstacles[1];
  const splitLeft = proxies.filter(({ sourceObstacleIndex }) => (
    sourceObstacleIndex === 1
  ));

  assert.equal(proxies.length, 4);
  assert.equal(splitLeft.length, 2);
  assert.equal(splitLeft[0].minX, sourceLeft.minX);
  assert.equal(splitLeft[0].maxX, splitLeft[1].minX);
  assert.equal(splitLeft[1].maxX, sourceLeft.maxX);
  assert.ok(splitLeft.every(
    (proxy) => (
      proxy.minZ === sourceLeft.minZ && proxy.maxZ === sourceLeft.maxZ
    ),
  ));
  const sourceArea =
    (sourceLeft.maxX - sourceLeft.minX)
    * (sourceLeft.maxZ - sourceLeft.minZ);
  const proxyArea = splitLeft.reduce(
    (sum, proxy) => sum
      + (proxy.maxX - proxy.minX) * (proxy.maxZ - proxy.minZ),
    0,
  );
  assert.ok(Math.abs(sourceArea - proxyArea) < 1e-12);

  const filmAabbs = proxies.map(
    (proxy) => bounds(
      transformLocal(sourceRectangle(proxy), film),
      margin,
    ),
  );
  const otherAabbs = cinema.sourceLocalSolidObstacles
    .map((obstacle) => ({
      assetId: "shanghai-cinema",
      bounds: bounds(
        transformLocal(sourceRectangle(obstacle), cinema),
        margin,
      ),
    }));
  const minimumGap = Math.min(
    ...filmAabbs.flatMap(
      (filmAabb) => otherAabbs.map(
        ({ bounds: otherAabb }) => aabbDistance(filmAabb, otherAabb),
      ),
    ),
  );

  assert.equal(
    rounded(minimumGap),
    rounded(
      candidate.neighborCollision.completeCoverSplitShell
        .minimumAabbGapToAnyOtherLandmarkSceneUnits,
    ),
  );
  assert.ok(minimumGap > 0);
});

test("Massing v2 精确 envelope 与实体均通过新华路净距", async () => {
  const [candidate, map] = await Promise.all([
    readJson(candidatePath),
    readJson("app/scene/xinhua-map-data.json"),
  ]);
  const film = candidate.formalPlacements.filmArtCenter;
  const roadRecord = candidate.roadClearance.namedPublicRoad;
  const road = map.roads.find(({ osmWayId }) => (
    osmWayId === roadRecord.osmWayId
  ));
  const width = roadWidth(road, map.meta.environmentScale);
  const envelopeDistance = polygonToPolylineDistance(
    transformLocal(sourceRectangle(film.massingV2LocalBounds), film),
    road.points,
  );
  const solidDistance = Math.min(
    ...film.sourceLocalSolidObstacles.map(
      (obstacle) => polygonToPolylineDistance(
        transformLocal(sourceRectangle(obstacle), film),
        road.points,
      ),
    ),
  );

  assert.equal(width, roadRecord.renderedFullWidthSceneUnits);
  assert.equal(
    rounded(envelopeDistance - width / 2),
    rounded(roadRecord.massingV2EnvelopeToAsphaltEdgeSceneUnits),
  );
  assert.equal(
    rounded(solidDistance - width / 2),
    rounded(roadRecord.solidObstaclesToAsphaltEdgeSceneUnits),
  );
  assert.ok(envelopeDistance - width / 2 > 0);
  assert.ok(solidDistance - width / 2 > 0);
});

test("两条内部道路中心线穿过真实实体，分片壳不能形成 formal map pass", async () => {
  const [candidate, map] = await Promise.all([
    readJson(candidatePath),
    readJson("app/scene/xinhua-map-data.json"),
  ]);
  const film = candidate.formalPlacements.filmArtCenter;

  for (const roadRecord of candidate.roadClearance.internalRoads.slice(0, 2)) {
    const road = map.roads.find(({ osmWayId }) => (
      osmWayId === roadRecord.osmWayId
    ));
    const width = roadWidth(road, map.meta.environmentScale);
    const solidDistance = Math.min(
      ...film.sourceLocalSolidObstacles.map(
        (obstacle) => polygonToPolylineDistance(
          transformLocal(sourceRectangle(obstacle), film),
          road.points,
        ),
      ),
    );

    assert.equal(solidDistance, 0);
    assert.equal(
      rounded(width),
      rounded(roadRecord.renderedFullWidthSceneUnits),
    );
    assert.equal(
      rounded(solidDistance - width / 2),
      rounded(roadRecord.solidObstaclesToAsphaltEdgeSceneUnits),
    );
    assert.equal(
      roadRecord.status,
      "blocked-centerline-crosses-solid-obstacle",
    );
  }

  assert.equal(
    candidate.roadClearance.splitShellDecision,
    "cannot-resolve-road-centerlines-that-cross-the-exact-solid-footprint",
  );
  assert.equal(candidate.roadClearance.qaSuppressionAuthorized, false);
  assert.equal(
    candidate.verdict.formalMapCandidate,
    "infeasible-current-internal-road-semantics",
  );
});

test("候选只关闭邻栋假阳性，不重做 MCP1 或越权晋级", async () => {
  const candidate = await readJson(candidatePath);

  assert.equal(candidate.scope.binaryModified, false);
  assert.equal(candidate.scope.shanghaiCinemaModified, false);
  assert.equal(candidate.scope.publicRegistryModified, false);
  assert.equal(candidate.scope.sharedRuntimeModified, false);
  assert.equal(candidate.scope.roadContractModified, false);
  assert.equal(candidate.verdict.mcp1, "pass-preserved-no-rerun");
  assert.equal(
    candidate.verdict.neighborCollision,
    "feasible-with-film-only-complete-cover-split-shell",
  );
  assert.equal(candidate.verdict.runtimeAcceptance, "blocked");
  assert.equal(candidate.verdict.heroAndIdentity, "hold");
});
