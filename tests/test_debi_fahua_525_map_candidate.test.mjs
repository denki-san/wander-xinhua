import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const candidatePath = "docs/research/debi-fahua-525-map-candidate.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

function project({ lon, lat }, map) {
  const [centerLon, centerLat] = map.meta.centerWgs84;
  const metersPerLonDegree =
    111_320 * Math.cos(centerLat * Math.PI / 180);
  return [
    (lon - centerLon) * metersPerLonDegree / map.meta.metersPerSceneUnit,
    -(lat - centerLat) * 110_540 / map.meta.metersPerSceneUnit,
  ];
}

function openGeometry(geometry) {
  const first = geometry[0];
  const last = geometry.at(-1);
  return first.lon === last.lon && first.lat === last.lat
    ? geometry.slice(0, -1)
    : geometry;
}

function worldToSourceLocal([worldX, worldZ], placement) {
  const dx = (worldX - placement.position[0]) / placement.scale;
  const dz = (worldZ - placement.position[1]) / placement.scale;
  const cosine = Math.cos(placement.yaw);
  const sine = Math.sin(placement.yaw);
  return [
    cosine * dx - sine * dz,
    -sine * dx - cosine * dz,
  ];
}

function sourceLocalToWorld([localX, sourceZ], placement) {
  const cosine = Math.cos(placement.yaw);
  const sine = Math.sin(placement.yaw);
  return [
    placement.position[0]
      + placement.scale * (cosine * localX - sine * sourceZ),
    placement.position[1]
      + placement.scale * (-sine * localX - cosine * sourceZ),
  ];
}

function sourceBoundsRectangle(bounds, placement) {
  return [
    [bounds.minX, bounds.minZ],
    [bounds.maxX, bounds.minZ],
    [bounds.maxX, bounds.maxZ],
    [bounds.minX, bounds.maxZ],
  ].map((point) => sourceLocalToWorld(point, placement));
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
  const closest = [
    start[0] + dx * ratio,
    start[1] + dz * ratio,
  ];
  return {
    closest,
    distance: Math.hypot(
      point[0] - closest[0],
      point[1] - closest[1],
    ),
  };
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
  if (segmentsIntersect(a, b, c, d)) {
    return { distance: 0, leftPoint: a, rightPoint: a };
  }
  const candidates = [
    {
      ...pointToSegment(a, c, d),
      leftPoint: a,
      side: "left",
    },
    {
      ...pointToSegment(b, c, d),
      leftPoint: b,
      side: "left",
    },
    {
      ...pointToSegment(c, a, b),
      rightPoint: c,
      side: "right",
    },
    {
      ...pointToSegment(d, a, b),
      rightPoint: d,
      side: "right",
    },
  ].sort((left, right) => left.distance - right.distance);
  const best = candidates[0];
  return best.side === "left"
    ? {
      distance: best.distance,
      leftPoint: best.leftPoint,
      rightPoint: best.closest,
    }
    : {
      distance: best.distance,
      leftPoint: best.closest,
      rightPoint: best.rightPoint,
    };
}

function polygonToPolylineClosest(polygon, polyline) {
  let best = { distance: Infinity };
  for (let edgeIndex = 0; edgeIndex < polygon.length; edgeIndex += 1) {
    const edgeStart = polygon[edgeIndex];
    const edgeEnd = polygon[(edgeIndex + 1) % polygon.length];
    for (
      let segmentIndex = 0;
      segmentIndex < polyline.length - 1;
      segmentIndex += 1
    ) {
      const result = segmentDistance(
        edgeStart,
        edgeEnd,
        polyline[segmentIndex],
        polyline[segmentIndex + 1],
      );
      if (result.distance < best.distance) {
        best = { ...result, edgeIndex, segmentIndex };
      }
    }
  }
  return best;
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
        ).distance,
      );
    }
  }
  return minimum;
}

function wayById(snapshot, wayId) {
  const way = snapshot.elements.find(
    ({ type, id }) => type === "way" && id === wayId,
  );
  assert.ok(way?.geometry, `缺少 OSM way ${wayId}`);
  return way;
}

test("德必候选锁定现有 disposition、输入 SHA 与 Hero Hold 边界", async () => {
  const [candidate, disposition] = await Promise.all([
    readJson(candidatePath),
    readJson("docs/research/debi-fahua-525-final-disposition.json"),
  ]);

  for (const source of Object.values(candidate.sources)) {
    assert.equal(await sha256(source.path), source.sha256);
  }
  assert.equal(
    candidate.existingMassing.sourceCommit,
    disposition.isolatedMassingV3.commit,
  );
  assert.equal(
    candidate.existingMassing.glb.sha256,
    disposition.isolatedMassingV3.glb.sha256,
  );
  assert.equal(candidate.scope.browserOrXhsAccessed, false);
  assert.equal(candidate.scope.legacyHeroUsed, false);
  assert.equal(
    disposition.legacyHeroDisposition.status,
    "hold-scope-polluted-not-derived-from-accepted-massing",
  );
});

test("正式 transform 将原始 way864847922 零误差往返而未移动缩放", async () => {
  const [candidate, buildings, map, registry] = await Promise.all([
    readJson(candidatePath),
    readJson("docs/research/data/xinhua-buildings-osm-20260725-074802.json"),
    readJson("app/scene/xinhua-map-data.json"),
    readJson("app/scene/xinhua-road-landmarks-data.json"),
  ]);
  const landmark = registry.landmarks.find(
    ({ id }) => id === "debi-fahua-525",
  );
  const way = wayById(buildings, candidate.exactFootprint.sourceWayId);
  const world = openGeometry(way.geometry).map(
    (point) => project(point, map),
  );
  const local = world.map(
    (point) => worldToSourceLocal(point, candidate.formalPlacement),
  );
  const roundTrip = local.map(
    (point) => sourceLocalToWorld(point, candidate.formalPlacement),
  );
  const maximumError = Math.max(
    ...world.map(
      (point, index) => Math.hypot(
        point[0] - roundTrip[index][0],
        point[1] - roundTrip[index][1],
      ),
    ),
  );

  assert.deepEqual(candidate.formalPlacement.position, landmark.position);
  assert.equal(candidate.formalPlacement.yaw, landmark.yaw);
  assert.equal(candidate.formalPlacement.scale, landmark.scale);
  assert.equal(candidate.formalPlacement.transformChanged, false);
  assert.ok(maximumError < 1e-12);
  assert.deepEqual(world, candidate.exactFootprint.worldVertices);
});

test("法华镇路冲突来自真实 polygon，不是 rotated-AABB 假阳性", async () => {
  const [candidate, map] = await Promise.all([
    readJson(candidatePath),
    readJson("app/scene/xinhua-map-data.json"),
  ]);
  const roadRecord = candidate.roadClearance.fahuazhenRoad;
  const road = map.roads.find(({ osmWayId }) => osmWayId === roadRecord.osmWayId);
  const closest = polygonToPolylineClosest(
    candidate.exactFootprint.worldVertices,
    road.points,
  );
  const clearance =
    closest.distance - roadRecord.runtimeRenderedHalfWidthSceneUnits;

  assert.equal(closest.distance, roadRecord.exactFootprintToCenterlineSceneUnits);
  assert.deepEqual(closest.leftPoint, roadRecord.nearestFootprintVertex);
  assert.deepEqual(closest.rightPoint, roadRecord.nearestRoadPoint);
  assert.equal(clearance, roadRecord.asphaltClearanceSceneUnits);
  assert.ok(clearance < 0);
  assert.equal(roadRecord.status, "blocked-true-footprint-overlap");
});

test("单一 rotated AABB 误报定西路，但精确 polygon 对定西路通过", async () => {
  const [candidate, map] = await Promise.all([
    readJson(candidatePath),
    readJson("app/scene/xinhua-map-data.json"),
  ]);
  const roadRecord = candidate.roadClearance.dingxiRoad;
  const road = map.roads.find(({ osmWayId }) => osmWayId === roadRecord.osmWayId);
  const exactDistance = polygonToPolylineClosest(
    candidate.exactFootprint.worldVertices,
    road.points,
  ).distance;
  const sourceAabbDistance = polygonToPolylineClosest(
    sourceBoundsRectangle(
      candidate.exactFootprint.sourceLocalBounds,
      candidate.formalPlacement,
    ),
    road.points,
  ).distance;

  assert.equal(sourceAabbDistance, 0);
  assert.equal(
    candidate.rotatedAabbDiagnosis.singleSourceLocalAabb
      .dingxiAsphaltClearanceSceneUnits,
    -roadRecord.runtimeRenderedHalfWidthSceneUnits,
  );
  assert.equal(exactDistance, roadRecord.exactFootprintToCenterlineSceneUnits);
  assert.equal(
    exactDistance - roadRecord.runtimeRenderedHalfWidthSceneUnits,
    roadRecord.asphaltClearanceSceneUnits,
  );
  assert.ok(roadRecord.asphaltClearanceSceneUnits > 0);
});

test("法华镇路无 width/lanes，数值上限不是道路改窄授权", async () => {
  const [candidate, roads] = await Promise.all([
    readJson(candidatePath),
    readJson("docs/research/data/xinhua-roads-osm-20260716-080509.json"),
  ]);
  const record = candidate.roadClearance.fahuazhenRoad;
  const way = wayById(roads, record.osmWayId);
  const maximumWidth = 2 * record.exactFootprintToCenterlineSceneUnits;

  assert.equal(way.tags.highway, "tertiary");
  assert.equal(way.tags.surface, "asphalt");
  assert.equal(Object.hasOwn(way.tags, "width"), false);
  assert.equal(Object.hasOwn(way.tags, "lanes"), false);
  assert.equal(maximumWidth, record.maximumNonOverlappingFullWidthSceneUnits);
  assert.ok(record.runtimeRenderedFullWidthSceneUnits > maximumWidth);
  assert.equal(candidate.subjectBinding.primaryMembershipProofAvailable, false);
});

test("邻楼正净距成立，但完整覆盖壳仍不能移除真实道路顶点", async () => {
  const [candidate, buildings, map] = await Promise.all([
    readJson(candidatePath),
    readJson("docs/research/data/xinhua-buildings-osm-20260725-074802.json"),
    readJson("app/scene/xinhua-map-data.json"),
  ]);
  const neighbor = wayById(buildings, candidate.neighborClearance.nearestWayId);
  const neighborPolygon = openGeometry(neighbor.geometry).map(
    (point) => project(point, map),
  );
  const gap = polygonDistance(
    candidate.exactFootprint.worldVertices,
    neighborPolygon,
  );
  const nearestRoadVertex =
    candidate.roadClearance.fahuazhenRoad.nearestFootprintVertex;

  assert.equal(gap, candidate.neighborClearance.exactRawGapSceneUnits);
  assert.equal(
    gap - 0.4,
    candidate.neighborClearance.gapAfterBothPointTwoMarginsSceneUnits,
  );
  assert.ok(gap - 0.4 > 0);
  assert.ok(candidate.exactFootprint.worldVertices.some(
    ([x, z]) => x === nearestRoadVertex[0] && z === nearestRoadVertex[1],
  ));
  assert.equal(
    candidate.rotatedAabbDiagnosis.completeCoverSplitShell.status,
    "cannot-close-formal-road-gate",
  );
});

test("德必地图候选保持 blocked，不越权复用 Hero、修改 Identity 或公共文件", async () => {
  const candidate = await readJson(candidatePath);

  assert.equal(candidate.scope.binaryModified, false);
  assert.equal(candidate.scope.legacyHeroUsed, false);
  assert.equal(candidate.scope.identityModified, false);
  assert.equal(candidate.scope.publicRegistryModified, false);
  assert.equal(candidate.scope.sharedRuntimeModified, false);
  assert.equal(candidate.scope.roadContractModified, false);
  assert.equal(
    candidate.verdict.formalMapCandidate,
    "infeasible-current-fahuazhen-width-and-membership-evidence",
  );
  assert.equal(candidate.verdict.runtimeAcceptance, "blocked");
  assert.equal(candidate.verdict.hero, "hold-scope-polluted-no-reuse-no-rebuild");
  assert.equal(candidate.verdict.identity, "unchanged-blocked");
});

test("旧 runtime 碰撞代理不冒充本轮纯建筑 footprint", async () => {
  const [candidate, registry] = await Promise.all([
    readJson(candidatePath),
    readJson("app/scene/xinhua-road-landmarks-data.json"),
  ]);
  const landmark = registry.landmarks.find(
    ({ id }) => id === "debi-fahua-525",
  );

  assert.equal(landmark.model, "/models/requested-pois/debi-fahua-525.glb");
  assert.deepEqual(landmark.localBounds, {
    minX: -14,
    maxX: 14,
    minZ: -12,
    maxZ: 12,
  });
  assert.equal(landmark.localObstacles.length, 5);
  assert.notDeepEqual(
    landmark.localBounds,
    candidate.exactFootprint.sourceLocalBounds,
  );
  assert.equal(
    candidate.rotatedAabbDiagnosis.completeCoverSplitShell.status,
    "cannot-close-formal-road-gate",
  );
  assert.equal(candidate.verdict.runtimeAcceptance, "blocked");
});
