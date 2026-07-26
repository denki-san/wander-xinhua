import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

function rounded(value) {
  return Number(value.toFixed(6));
}

function sourceRectangle(bounds) {
  return [
    [bounds.minX, -bounds.maxZ],
    [bounds.maxX, -bounds.maxZ],
    [bounds.maxX, -bounds.minZ],
    [bounds.minX, -bounds.minZ],
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

function polygonToPolylineDistance(polygon, polyline) {
  let minimum = Infinity;
  for (let polygonIndex = 0; polygonIndex < polygon.length; polygonIndex += 1) {
    const polygonStart = polygon[polygonIndex];
    const polygonEnd = polygon[(polygonIndex + 1) % polygon.length];
    for (let lineIndex = 1; lineIndex < polyline.length; lineIndex += 1) {
      minimum = Math.min(
        minimum,
        segmentDistance(
          polygonStart,
          polygonEnd,
          polyline[lineIndex - 1],
          polyline[lineIndex],
        ),
      );
    }
  }
  return minimum;
}

function envelopePolygon(envelope) {
  return [
    [envelope.minX, envelope.minZ],
    [envelope.maxX, envelope.minZ],
    [envelope.maxX, envelope.maxZ],
    [envelope.minX, envelope.maxZ],
  ];
}

function intersectionCount(left, right) {
  return left.flatMap(
    (leftEnvelope) => right.map(
      (rightEnvelope) => aabbDistance(leftEnvelope, rightEnvelope),
    ),
  ).filter((distance) => distance === 0).length;
}

test("Villa Le Bec candidate 锁定已有 OSM transform 与输入 SHA", async () => {
  const record = await readJson("docs/research/villa-le-bec-map-candidate.json");
  const gate = await readJson("docs/research/villa-le-bec-massing-map-gate.json");

  assert.deepEqual(record.candidate.placement, {
    position: gate.mapCalibrationCandidate.placement.position,
    yaw: gate.mapCalibrationCandidate.placement.yawRadians,
    scale: gate.mapCalibrationCandidate.placement.scale,
  });
  assert.equal(record.candidate.transformChanged, false);
  assert.equal(
    await sha256(record.sources.referenceManifest.path),
    record.sources.referenceManifest.sha256,
  );
  assert.equal(
    await sha256(record.sources.priorMapGate.path),
    record.sources.priorMapGate.sha256,
  );
  assert.equal(
    await sha256(record.sources.house315AcceptedCandidate.path),
    record.sources.house315AcceptedCandidate.sha256,
  );
  assert.equal(
    await sha256(record.sources.massingGlb.path),
    record.sources.massingGlb.sha256,
  );
  assert.equal(record.subjectBinding.parcel.authoritativeCadastralBoundaryAvailable, false);
  assert.equal(record.subjectBinding.parcel.decision, "unknown-not-invented");
});

test("Villa Le Bec 旧五交叉不可复算，已验收 House315 placement 为零交叉", async () => {
  const [record, house] = await Promise.all([
    readJson("docs/research/villa-le-bec-map-candidate.json"),
    readJson("docs/research/house-315-map-position-candidate.json"),
  ]);
  const margin = record.candidate.runtimeCollisionMarginSceneUnits;
  const villaAabbs = record.candidate.sourceLocalObstacles.map(
    (obstacle) => bounds(
      transformLocal(sourceRectangle(obstacle), record.candidate.placement),
      margin,
    ),
  );
  const houseAabbs = (placement) => house.candidate.sourceLocalObstacles.map(
    (obstacle) => bounds(
      transformLocal(sourceRectangle(obstacle), placement),
      margin,
    ),
  );
  const legacyPlacement = {
    position: house.supersededPlacement.position,
    yaw: house.supersededPlacement.yaw,
    scale: house.supersededPlacement.scale,
  };
  const acceptedPlacement = {
    position: house.candidate.placement.position,
    yaw: house.candidate.placement.yaw,
    scale: house.candidate.placement.scale,
  };

  assert.equal(
    intersectionCount(houseAabbs(legacyPlacement), villaAabbs),
    record.clearance.house315.supersededPlacementReproducibleIntersectionCount,
  );
  assert.equal(record.clearance.house315.priorFiveCountReproducible, false);
  assert.equal(
    intersectionCount(houseAabbs(acceptedPlacement), villaAabbs),
    record.clearance.house315.acceptedPlacementIntersectionCount,
  );
  assert.equal(record.clearance.house315.acceptedPlacementIntersectionCount, 0);
});

test("Villa Le Bec 十二分片壳完整覆盖原 obstacle 且不缩放不平移", async () => {
  const record = await readJson("docs/research/villa-le-bec-map-candidate.json");
  const proxies = record.candidate.collisionShell.proxies;

  assert.equal(proxies.length, 12);
  for (const source of record.candidate.sourceLocalObstacles) {
    const strips = proxies.filter(
      ({ sourceWayId }) => sourceWayId === source.sourceWayId,
    );
    assert.equal(strips.length, 6);
    assert.equal(strips[0].minZ, source.minZ);
    assert.equal(strips.at(-1).maxZ, source.maxZ);
    assert.ok(strips.every(
      (strip) => strip.minX === source.minX && strip.maxX === source.maxX,
    ));
    for (let index = 1; index < strips.length; index += 1) {
      assert.equal(strips[index - 1].maxZ, strips[index].minZ);
    }
    const sourceArea =
      (source.maxX - source.minX) * (source.maxZ - source.minZ);
    const stripArea = strips.reduce(
      (total, strip) => total
        + (strip.maxX - strip.minX) * (strip.maxZ - strip.minZ),
      0,
    );
    assert.ok(Math.abs(sourceArea - stripArea) < 1e-9);
  }
});

test("Villa Le Bec 分片壳解决内部 rotated-AABB 误报并避开 House315", async () => {
  const [record, house] = await Promise.all([
    readJson("docs/research/villa-le-bec-map-candidate.json"),
    readJson("docs/research/house-315-map-position-candidate.json"),
  ]);
  const margin = record.candidate.runtimeCollisionMarginSceneUnits;
  const stripAabbs = record.candidate.collisionShell.proxies.map(
    (proxy) => bounds(
      transformLocal(sourceRectangle(proxy), record.candidate.placement),
      margin,
    ),
  );
  const houseAabbs = house.candidate.sourceLocalObstacles.map(
    (obstacle) => bounds(
      transformLocal(sourceRectangle(obstacle), {
        position: house.candidate.placement.position,
        yaw: house.candidate.placement.yaw,
        scale: house.candidate.placement.scale,
      }),
      margin,
    ),
  );
  const groups = record.candidate.sourceLocalObstacles.map(
    ({ sourceWayId }) => stripAabbs.filter(
      (_, index) => (
        record.candidate.collisionShell.proxies[index].sourceWayId
          === sourceWayId
      ),
    ),
  );
  const internalGap = Math.min(
    ...groups[0].flatMap(
      (street) => groups[1].map((garden) => aabbDistance(street, garden)),
    ),
  );
  const houseGaps = groups.map(
    (group) => Math.min(
      ...group.flatMap(
        (villa) => houseAabbs.map((houseAabb) => aabbDistance(villa, houseAabb)),
      ),
    ),
  );

  assert.equal(
    rounded(internalGap),
    record.clearance.betweenVillaBuildings.completeCoverCollisionShellGapSceneUnits,
  );
  assert.deepEqual(
    houseGaps.map(rounded),
    record.clearance.house315.collisionShellMinimumGapSceneUnits.map(
      ({ minimumGapSceneUnits }) => minimumGapSceneUnits,
    ),
  );
  assert.ok(internalGap > 0);
  assert.ok(houseGaps.every((gap) => gap > 0));
});

test("Villa Le Bec 实体与完整覆盖碰撞壳均离开新华路柏油面", async () => {
  const [record, map] = await Promise.all([
    readJson("docs/research/villa-le-bec-map-candidate.json"),
    readJson("app/scene/xinhua-map-data.json"),
  ]);
  const road = map.roads.find(
    ({ osmWayId, name, tunnel, layer }) => (
      osmWayId === record.sources.map.roadWayId
      && name === "新华路"
      && !tunnel
      && layer >= 0
    ),
  );
  assert.ok(road);
  const halfWidth = record.clearance.road.stylizedAsphaltHalfWidthSceneUnits;
  const physicalGaps = record.candidate.sourceLocalObstacles.map(
    (obstacle) => polygonToPolylineDistance(
      transformLocal(sourceRectangle(obstacle), record.candidate.placement),
      road.points,
    ) - halfWidth,
  );
  const proxyAabbs = record.candidate.collisionShell.proxies.map(
    (proxy) => bounds(
      transformLocal(sourceRectangle(proxy), record.candidate.placement),
      record.candidate.runtimeCollisionMarginSceneUnits,
    ),
  );
  const shellGaps = record.candidate.sourceLocalObstacles.map(
    ({ sourceWayId }) => Math.min(
      ...proxyAabbs
        .filter((_, index) => (
          record.candidate.collisionShell.proxies[index].sourceWayId
            === sourceWayId
        ))
        .map(
          (envelope) => polygonToPolylineDistance(
            envelopePolygon(envelope),
            road.points,
          ) - halfWidth,
        ),
    ),
  );

  assert.deepEqual(
    physicalGaps.map(rounded),
    record.clearance.road.physicalFootprintToAsphaltEdgeSceneUnits.map(
      ({ minimumGapSceneUnits }) => minimumGapSceneUnits,
    ),
  );
  assert.deepEqual(
    shellGaps.map(rounded),
    record.clearance.road.collisionShellToAsphaltEdgeSceneUnits.map(
      ({ minimumGapSceneUnits }) => minimumGapSceneUnits,
    ),
  );
  assert.ok(physicalGaps.every((gap) => gap > 0));
  assert.ok(shellGaps.every((gap) => gap > 0));
});

test("Villa Le Bec candidate 不越权宣称 runtime 或 Hero 完成", async () => {
  const record = await readJson("docs/research/villa-le-bec-map-candidate.json");

  assert.equal(record.scope.binaryModified, false);
  assert.equal(record.scope.publicRegistryModified, false);
  assert.equal(record.scope.sharedRuntimeModified, false);
  assert.equal(record.verdict.transformChanged, false);
  assert.equal(
    record.verdict.runtimeAcceptance,
    "pending-main-window-integration-and-deterministic-collision-qa",
  );
  assert.equal(record.verdict.heroAndIdentity, "hold");
});
