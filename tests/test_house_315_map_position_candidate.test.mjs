import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  HOUSE_315_PLACEMENT,
  HOUSE_315_SOURCE_GLTF_BOUNDS,
  HOUSE_315_SOURCE_LOCAL_OBSTACLES,
} from "../app/scene/house-315-tier-contract.mjs";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

function rounded(value, precision = 6) {
  return Number(value.toFixed(precision));
}

function roundedPoint(point) {
  return point.map((value) => rounded(value));
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

function sourceRectangle(bounds) {
  return [
    [bounds.minX, -bounds.maxZ],
    [bounds.maxX, -bounds.maxZ],
    [bounds.maxX, -bounds.minZ],
    [bounds.minX, -bounds.minZ],
  ];
}

function pointToSegment(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const ratio = lengthSquared === 0
    ? 0
    : Math.min(
      1,
      Math.max(
        0,
        ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz)
          / lengthSquared,
      ),
    );
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

function pointInPolygon(point, polygon) {
  let inside = false;
  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index, index += 1
  ) {
    const current = polygon[index];
    const prior = polygon[previous];
    if (pointOnSegment(point, prior, current)) return true;
    const crosses = (
      (current[1] > point[1]) !== (prior[1] > point[1])
      && point[0] < (
        (prior[0] - current[0]) * (point[1] - current[1])
          / (prior[1] - current[1])
        + current[0]
      )
    );
    if (crosses) inside = !inside;
  }
  return inside;
}

function segmentsIntersect(a, b, c, d) {
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  if (
    ((abC > 0 && abD < 0) || (abC < 0 && abD > 0))
    && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))
  ) return true;
  return (
    pointOnSegment(c, a, b)
    || pointOnSegment(d, a, b)
    || pointOnSegment(a, c, d)
    || pointOnSegment(b, c, d)
  );
}

function polygonDistance(left, right) {
  if (
    left.some((point) => pointInPolygon(point, right))
    || right.some((point) => pointInPolygon(point, left))
  ) return 0;
  let minimum = Infinity;
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const leftStart = left[leftIndex];
    const leftEnd = left[(leftIndex + 1) % left.length];
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const rightStart = right[rightIndex];
      const rightEnd = right[(rightIndex + 1) % right.length];
      if (segmentsIntersect(leftStart, leftEnd, rightStart, rightEnd)) return 0;
      minimum = Math.min(
        minimum,
        pointToSegment(leftStart, rightStart, rightEnd),
        pointToSegment(leftEnd, rightStart, rightEnd),
        pointToSegment(rightStart, leftStart, leftEnd),
        pointToSegment(rightEnd, leftStart, leftEnd),
      );
    }
  }
  return minimum;
}

function polygonToPolylineDistance(polygon, points) {
  let minimum = Infinity;
  for (const point of polygon) {
    for (let index = 1; index < points.length; index += 1) {
      minimum = Math.min(
        minimum,
        pointToSegment(point, points[index - 1], points[index]),
      );
    }
  }
  return minimum;
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

function wayById(raw, id) {
  const way = raw.elements.find(
    (element) => element.type === "way" && element.id === id,
  );
  assert.ok(way?.geometry?.length, `缺少 OSM way ${id}`);
  return way;
}

const villaPlacement = {
  position: [-34.1, 88.8],
  yaw: -0.38,
  scale: 0.82,
};
const villaRenderedFootprints = [
  [
    [-0.968515, -9.832885],
    [4.996285, -9.704577],
    [4.869218, -5.014079],
    [-1.095583, -5.142387],
  ],
  [
    [6.53115, -6.290767],
    [9.996342, -6.217839],
    [9.866713, -1.209116],
    [6.395668, -1.285091],
  ],
];
const villaSourceLocalObstacles = [
  {
    minX: -1.095583,
    maxX: 4.996285,
    minZ: 5.014079,
    maxZ: 9.832885,
  },
  {
    minX: 6.395668,
    maxX: 9.996342,
    minZ: 1.209116,
    maxZ: 6.290767,
  },
];

test("House315 原始位置与 Villa Le Bec 两栋均相交，旧地图门不能继承", async () => {
  const record = await readJson(
    "docs/research/house-315-map-position-candidate.json",
  );
  const legacyFootprint = transformLocal(
    sourceRectangle(HOUSE_315_SOURCE_GLTF_BOUNDS),
    {
      position: [-23.03, 85.67],
      yaw: -0.38,
      scale: 0.9,
    },
  );
  const villaFootprints = villaRenderedFootprints.map(
    (footprint) => transformLocal(footprint, villaPlacement),
  );

  assert.deepEqual(
    legacyFootprint.map(roundedPoint),
    record.supersededPlacement.worldFootprint,
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(bounds(legacyFootprint)).map(
        ([key, value]) => [key, rounded(value)],
      ),
    ),
    record.supersededPlacement.worldEnvelope,
  );
  assert.equal(polygonDistance(legacyFootprint, villaFootprints[0]), 0);
  assert.equal(polygonDistance(legacyFootprint, villaFootprints[1]), 0);
  assert.equal(record.supersededPlacement.intersectsVillaStreetEntity, true);
  assert.equal(record.supersededPlacement.intersectsVillaGardenEntity, true);
  assert.equal(record.verdict.priorPlacementWrong, true);
});

test("House315 candidate 从原始 OSM way 864485667 和同一投影确定性复算", async () => {
  const [record, raw, map] = await Promise.all([
    readJson("docs/research/house-315-map-position-candidate.json"),
    readJson("docs/research/data/xinhua-buildings-osm-20260725-074802.json"),
    readJson("app/scene/xinhua-map-data.json"),
  ]);
  const sourceWay = wayById(raw, 864485667);
  const osmFootprint = sourceWay.geometry.slice(0, -1).map(
    (point) => project(point, map),
  );
  const dominantEdge = [
    osmFootprint[6][0] - osmFootprint[5][0],
    osmFootprint[6][1] - osmFootprint[5][1],
  ];

  assert.equal(
    await sha256(record.sources.rawOsm.path),
    record.sources.rawOsm.sha256,
  );
  assert.equal(raw.osm3s.timestamp_osm_base, record.sources.rawOsm.timestampOsmBase);
  assert.deepEqual(map.meta.centerWgs84, record.sources.projection.centerWgs84);
  assert.equal(map.meta.metersPerSceneUnit, 2.7);
  assert.deepEqual(
    sourceWay.geometry.slice(0, -1).map(({ lon, lat }) => [lon, lat]),
    record.sourceWay.wgs84Footprint,
  );
  assert.deepEqual(osmFootprint.map(roundedPoint), record.sourceWay.worldFootprint);
  assert.equal(
    rounded(-Math.atan2(dominantEdge[1], dominantEdge[0]), 9),
    record.candidate.dominantOsmEdgeYawRadians,
  );
  assert.deepEqual(HOUSE_315_PLACEMENT.position, [-20.127789, 82.330463]);
  assert.equal(HOUSE_315_PLACEMENT.yaw, -0.401372);
  assert.equal(HOUSE_315_PLACEMENT.scale, 0.754254);
  assert.equal(HOUSE_315_PLACEMENT.mapSourceWayId, 864485667);
  assert.equal(record.subjectBinding.blockedMapPosition, false);
  assert.equal(record.subjectBinding.confidence, "medium-high");
});

test("House315 candidate 退出机动车道并与 Villa Le Bec 两实体保持物理间距", async () => {
  const [record, map] = await Promise.all([
    readJson("docs/research/house-315-map-position-candidate.json"),
    readJson("app/scene/xinhua-map-data.json"),
  ]);
  const houseFootprint = transformLocal(
    sourceRectangle(HOUSE_315_SOURCE_GLTF_BOUNDS),
    HOUSE_315_PLACEMENT,
  );
  const villaFootprints = villaRenderedFootprints.map(
    (footprint) => transformLocal(footprint, villaPlacement),
  );
  const road = map.roads.find(
    ({ osmWayId, name, tunnel, layer }) => (
      osmWayId === 682286683
      && name === "新华路"
      && !tunnel
      && layer >= 0
    ),
  );
  assert.ok(road);
  const centerlineDistance = polygonToPolylineDistance(
    houseFootprint,
    road.points,
  );
  const asphaltHalfWidth = 0.98 * map.meta.environmentScale / 2;

  assert.deepEqual(
    houseFootprint.map(roundedPoint),
    record.candidate.worldFootprint,
  );
  assert.equal(
    rounded(centerlineDistance),
    record.clearance.motorRoad.modelFootprintToCenterlineSceneUnits,
  );
  assert.equal(
    rounded(centerlineDistance - asphaltHalfWidth),
    record.clearance.motorRoad.modelFootprintToAsphaltEdgeSceneUnits,
  );
  assert.equal(
    rounded(polygonDistance(houseFootprint, villaFootprints[0])),
    record.clearance.villaLeBec.physicalModelFootprint[0].minimumGapSceneUnits,
  );
  assert.equal(
    rounded(polygonDistance(houseFootprint, villaFootprints[1])),
    record.clearance.villaLeBec.physicalModelFootprint[1].minimumGapSceneUnits,
  );
  assert.ok(record.clearance.motorRoad.modelFootprintToAsphaltEdgeSceneUnits > 3.5);
  assert.ok(
    record.clearance.villaLeBec.physicalModelFootprint.every(
      ({ minimumGapSceneUnits }) => minimumGapSceneUnits > 0,
    ),
  );
});

test("House315 三段 OSM 碰撞在 runtime margin 后仍不与 Villa Le Bec 重叠", async () => {
  const record = await readJson(
    "docs/research/house-315-map-position-candidate.json",
  );
  assert.deepEqual(
    HOUSE_315_SOURCE_LOCAL_OBSTACLES,
    record.candidate.sourceLocalObstacles.map(
      ({ role: _role, ...obstacle }) => obstacle,
    ),
  );
  assert.equal(HOUSE_315_SOURCE_LOCAL_OBSTACLES.length, 3);

  const houseAabbs = HOUSE_315_SOURCE_LOCAL_OBSTACLES.map(
    (obstacle) => bounds(
      transformLocal(sourceRectangle(obstacle), HOUSE_315_PLACEMENT),
      0.2,
    ),
  );
  const villaAabbs = villaSourceLocalObstacles.map(
    (obstacle) => bounds(
      transformLocal(sourceRectangle(obstacle), villaPlacement),
      0.2,
    ),
  );
  const gaps = villaAabbs.map(
    (villa) => Math.min(...houseAabbs.map((house) => aabbDistance(house, villa))),
  );

  assert.deepEqual(
    houseAabbs.map(
      (aabb) => Object.fromEntries(
        Object.entries(aabb).map(([key, value]) => [key, rounded(value)]),
      ),
    ),
    record.candidate.runtimeWorldObstacleEnvelopes,
  );
  assert.deepEqual(
    gaps.map((gap) => rounded(gap)),
    record.clearance.villaLeBec.runtimeCollisionAabbAfterBothMargins.map(
      ({ minimumGapSceneUnits }) => minimumGapSceneUnits,
    ),
  );
  assert.ok(gaps.every((gap) => gap > 0));
});

test("House315 入口朝向、start 和 camera arm 候选均保持安全", async () => {
  const record = await readJson(
    "docs/research/house-315-map-position-candidate.json",
  );
  const entrance = transformLocal(
    [record.entranceAndStart.entranceLocal],
    HOUSE_315_PLACEMENT,
  )[0];
  const [startX, startZ] = HOUSE_315_PLACEMENT.start;
  const toEntrance = [entrance[0] - startX, entrance[1] - startZ];
  const length = Math.hypot(...toEntrance);
  const expectedForward = toEntrance.map((value) => value / length);
  const cameraEndpoint = [
    startX - expectedForward[0] * 5.44,
    startZ - expectedForward[1] * 5.44,
  ];
  const houseFootprint = transformLocal(
    sourceRectangle(HOUSE_315_SOURCE_GLTF_BOUNDS),
    HOUSE_315_PLACEMENT,
  );
  const startDistance = Math.min(
    ...houseFootprint.map(
      (_, index) => pointToSegment(
        HOUSE_315_PLACEMENT.start,
        houseFootprint[index],
        houseFootprint[(index + 1) % houseFootprint.length],
      ),
    ),
  );

  assert.deepEqual(roundedPoint(entrance), record.entranceAndStart.entranceWorld);
  assert.deepEqual(roundedPoint(expectedForward), HOUSE_315_PLACEMENT.forward);
  assert.deepEqual(
    roundedPoint(cameraEndpoint),
    record.entranceAndStart.start.cameraEndpointForUpdatedForward,
  );
  assert.equal(
    rounded(startDistance),
    record.entranceAndStart.start.distanceToModelFootprintSceneUnits,
  );
  assert.ok(startDistance > 5.44);
  assert.equal(record.entranceAndStart.start.playerCollisionSafe, true);
  assert.equal(record.entranceAndStart.start.cameraAnalyticSafe, true);
});

test("House315 地图位置候选只改专属合同、记录和测试，三档二进制继续 Hold", async () => {
  const [record, runtimeQa] = await Promise.all([
    readJson("docs/research/house-315-map-position-candidate.json"),
    readJson("docs/research/house-315-three-tier-runtime-qa.json"),
  ]);

  for (const asset of Object.values(record.binaryHold)) {
    if (!asset?.path) continue;
    assert.equal(await sha256(asset.path), asset.sha256);
  }
  for (const [path, expectedSha] of Object.entries(runtimeQa.sharedBaseline.files)) {
    assert.equal(await sha256(path), expectedSha);
  }
  assert.equal(record.scope.binaryModified, false);
  assert.equal(record.scope.publicRegistryModified, false);
  assert.equal(record.scope.sharedRuntimeModified, false);
  assert.equal(record.scope.fastManifestModified, false);
  assert.equal(record.verdict.binaryRebuildRequired, false);
  assert.equal(record.verdict.finalRuntimeMapPass, false);
});
