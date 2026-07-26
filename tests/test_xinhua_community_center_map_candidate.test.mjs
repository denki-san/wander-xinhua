import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const candidatePath = "docs/research/xinhua-community-center-map-candidate.json";

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

function closestPointOnSegment(point, start, end) {
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

function segmentDistance(leftStart, leftEnd, rightStart, rightEnd) {
  if (segmentsIntersect(leftStart, leftEnd, rightStart, rightEnd)) {
    return {
      distance: 0,
      leftPoint: leftStart,
      rightPoint: leftStart,
    };
  }
  const candidates = [
    {
      ...closestPointOnSegment(leftStart, rightStart, rightEnd),
      leftPoint: leftStart,
      side: "left",
    },
    {
      ...closestPointOnSegment(leftEnd, rightStart, rightEnd),
      leftPoint: leftEnd,
      side: "left",
    },
    {
      ...closestPointOnSegment(rightStart, leftStart, leftEnd),
      rightPoint: rightStart,
      side: "right",
    },
    {
      ...closestPointOnSegment(rightEnd, leftStart, leftEnd),
      rightPoint: rightEnd,
      side: "right",
    }
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

function collectMatchingWays(value, wayId, matches = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectMatchingWays(item, wayId, matches);
  } else if (value && typeof value === "object") {
    if (value.type === "way" && value.id === wayId) matches.push(value);
    for (const child of Object.values(value)) {
      collectMatchingWays(child, wayId, matches);
    }
  }
  return matches;
}

test("社区中心候选锁定正式 transform、OSM binding 与输入 SHA", async () => {
  const [candidate, binding, gate] = await Promise.all([
    readJson(candidatePath),
    readJson("docs/research/xinhua-community-center-osm-binding.json"),
    readJson("docs/research/xinhua-community-center-massing-map-gate.json"),
  ]);

  assert.deepEqual(
    candidate.buildingConstraint.placement,
    {
      position: gate.mapCalibrationCandidate.position,
      yaw: gate.mapCalibrationCandidate.yaw,
      scale: gate.mapCalibrationCandidate.scale,
    },
  );
  assert.equal(candidate.buildingConstraint.transformChanged, false);
  assert.equal(candidate.buildingConstraint.maximumVertexWorldErrorSceneUnits, 0);
  assert.equal(binding.namedPoi.insideBoundFootprint, true);
  assert.equal(binding.buildingFootprint.osmRef, "way/864493234");

  for (const source of Object.values(candidate.sources)) {
    if (!source.path || !source.sha256) continue;
    assert.equal(await sha256(source.path), source.sha256);
  }
});

test("OSM 支路没有 width 或 lanes，不能任意选择窄路宽度", async () => {
  const [candidate, raw, map] = await Promise.all([
    readJson(candidatePath),
    readJson("docs/research/data/requested-pois-osm-20260717-103840.json"),
    readJson("app/scene/xinhua-map-data.json"),
  ]);
  const ways = collectMatchingWays(raw, candidate.roadConstraint.roadWayId);
  const mapRoad = map.roads.find(
    ({ osmWayId }) => osmWayId === candidate.roadConstraint.roadWayId,
  );

  assert.ok(ways.length > 0);
  assert.ok(ways.every(({ tags }) => tags.highway === "service"));
  assert.ok(ways.every(({ tags }) => tags.name === "新华路345弄"));
  assert.ok(ways.every(({ tags }) => !Object.hasOwn(tags, "width")));
  assert.ok(ways.every(({ tags }) => !Object.hasOwn(tags, "lanes")));
  assert.equal(mapRoad.highway, "service");
  assert.equal(mapRoad.lanes, null);
  assert.equal(candidate.roadConstraint.osmWidthTagPresent, false);
  assert.equal(candidate.roadConstraint.osmLanesTagPresent, false);
});

test("真实 OSM 建筑边界而非 AABB 复算出 0.402635 支路压占", async () => {
  const [candidate, binding] = await Promise.all([
    readJson(candidatePath),
    readJson("docs/research/xinhua-community-center-osm-binding.json"),
  ]);
  const closest = polygonToPolylineClosest(
    binding.buildingFootprint.projectedWorld,
    binding.frontAccessRoad.worldPolyline,
  );
  const road = candidate.roadConstraint;
  const overlap =
    road.runtimeRenderedHalfWidthSceneUnits - closest.distance;

  assert.equal(
    rounded(closest.distance),
    rounded(road.physicalFootprintToCenterline.sceneUnits),
  );
  assert.equal(closest.edgeIndex, road.physicalFootprintToCenterline.buildingEdgeIndex);
  assert.equal(closest.segmentIndex, road.physicalFootprintToCenterline.roadSegmentIndex);
  assert.deepEqual(
    closest.leftPoint.map((value) => rounded(value)),
    road.physicalFootprintToCenterline.nearestBuildingPoint.map(
      (value) => rounded(value),
    ),
  );
  assert.deepEqual(
    closest.rightPoint.map((value) => rounded(value)),
    road.physicalFootprintToCenterline.nearestRoadPoint.map(
      (value) => rounded(value),
    ),
  );
  assert.equal(rounded(overlap), rounded(road.asphaltOverlap.sceneUnits));
  assert.ok(overlap > 0);
});

test("合法道路宽度上限由几何确定，但当前证据不能授权该宽度", async () => {
  const candidate = await readJson(candidatePath);
  const road = candidate.roadConstraint;
  const expectedMaximumWidth =
    2 * road.physicalFootprintToCenterline.sceneUnits;
  const expectedMaximumWidthWithMargin =
    2 * (
      road.physicalFootprintToCenterline.sceneUnits
      - road.runtimeCollisionMarginSceneUnits
    );

  assert.equal(
    rounded(expectedMaximumWidth),
    rounded(road.maximumNonOverlappingFullWidth.sceneUnits),
  );
  assert.equal(
    rounded(expectedMaximumWidth * 2.7),
    rounded(road.maximumNonOverlappingFullWidth.meters),
  );
  assert.equal(
    rounded(expectedMaximumWidthWithMargin),
    rounded(
      road.maximumNonOverlappingFullWidthWithPointTwoCollisionMargin.sceneUnits,
    ),
  );
  assert.ok(
    road.runtimeRenderedFullWidthSceneUnits
      > road.maximumNonOverlappingFullWidth.sceneUnits,
  );
  assert.equal(
    candidate.candidateAnalysis.roadWidthCalibration.status,
    "blocked-missing-measured-width",
  );
});

test("完整覆盖分片壳不能消除物理轮廓与道路面的相交", async () => {
  const [candidate, binding] = await Promise.all([
    readJson(candidatePath),
    readJson("docs/research/xinhua-community-center-osm-binding.json"),
  ]);
  const nearestPoint =
    candidate.roadConstraint.physicalFootprintToCenterline.nearestBuildingPoint;
  const splitTriangles = [
    [
      binding.buildingFootprint.projectedWorld[0],
      binding.buildingFootprint.projectedWorld[1],
      binding.buildingFootprint.projectedWorld[2],
    ],
    [
      binding.buildingFootprint.projectedWorld[0],
      binding.buildingFootprint.projectedWorld[2],
      binding.buildingFootprint.projectedWorld[3],
    ],
  ];

  assert.ok(splitTriangles.some(
    (triangle) => triangle.some(
      (point) => point[0] === nearestPoint[0] && point[1] === nearestPoint[1],
    ),
  ));
  assert.equal(
    candidate.candidateAnalysis.completeCoverSplitShell.status,
    "cannot-resolve-physical-road-surface-overlap",
  );
  assert.equal(candidate.candidateAnalysis.placementAdjustment.status, "rejected");
  assert.equal(candidate.candidateAnalysis.qaSuppression.status, "rejected");
});

test("社区中心保持 formal map blocked，不越权晋级或修改公共文件", async () => {
  const candidate = await readJson(candidatePath);

  assert.equal(
    candidate.status,
    "infeasible-under-current-osm-binding-and-runtime-road-contract",
  );
  assert.equal(candidate.scope.binaryModified, false);
  assert.equal(candidate.scope.publicRegistryModified, false);
  assert.equal(candidate.scope.sharedRuntimeModified, false);
  assert.equal(candidate.scope.roadContractModified, false);
  assert.equal(
    candidate.verdict.formalMapCandidate,
    "infeasible-under-current-runtime-road-width",
  );
  assert.equal(candidate.verdict.runtimeAcceptance, "blocked");
  assert.equal(candidate.verdict.heroAndIdentity, "hold");
});
