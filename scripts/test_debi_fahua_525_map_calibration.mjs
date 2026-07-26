import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const TARGET_WAY_ID = 864847922;
const REGISTRY_POSITION = [-102, -49];
const REGISTRY_YAW = -2.6;
const REGISTRY_SCALE = 0.92;
const MAX_WORLD_VERTEX_ERROR = 0.000001;
const COLLISION_MARGIN = 0.2;

function round(value, digits = 6) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function openGeometry(geometry) {
  const first = geometry[0];
  const last = geometry.at(-1);
  return first.lon === last.lon && first.lat === last.lat
    ? geometry.slice(0, -1)
    : geometry;
}

function projectWgs84([longitude, latitude], mapMeta) {
  const [centerLongitude, centerLatitude] = mapMeta.centerWgs84;
  const metersPerLongitudeDegree = (
    111_320 * Math.cos(centerLatitude * Math.PI / 180)
  );
  return [
    (longitude - centerLongitude)
      * metersPerLongitudeDegree
      / mapMeta.metersPerSceneUnit,
    -(latitude - centerLatitude)
      * 110_540
      / mapMeta.metersPerSceneUnit,
  ];
}

function worldToSourceLocal([worldX, worldZ]) {
  const dx = (worldX - REGISTRY_POSITION[0]) / REGISTRY_SCALE;
  const dz = (worldZ - REGISTRY_POSITION[1]) / REGISTRY_SCALE;
  const cosine = Math.cos(REGISTRY_YAW);
  const sine = Math.sin(REGISTRY_YAW);
  return [
    cosine * dx - sine * dz,
    -sine * dx - cosine * dz,
  ];
}

function sourceLocalToWorld([localX, sourceZ]) {
  const cosine = Math.cos(REGISTRY_YAW);
  const sine = Math.sin(REGISTRY_YAW);
  return [
    REGISTRY_POSITION[0]
      + REGISTRY_SCALE * (cosine * localX - sine * sourceZ),
    REGISTRY_POSITION[1]
      + REGISTRY_SCALE * (-sine * localX - cosine * sourceZ),
  ];
}

function pointToSegmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, (
      (point[0] - start[0]) * dx + (point[1] - start[1]) * dz
    ) / lengthSquared));
  return Math.hypot(
    point[0] - (start[0] + dx * t),
    point[1] - (start[1] + dz * t),
  );
}

function segmentDistance(a0, a1, b0, b1) {
  return Math.min(
    pointToSegmentDistance(a0, b0, b1),
    pointToSegmentDistance(a1, b0, b1),
    pointToSegmentDistance(b0, a0, a1),
    pointToSegmentDistance(b1, a0, a1),
  );
}

function polygonToPolylineDistance(polygon, polyline) {
  let minimum = Infinity;
  polygon.forEach((start, polygonIndex) => {
    const end = polygon[(polygonIndex + 1) % polygon.length];
    for (let lineIndex = 1; lineIndex < polyline.length; lineIndex += 1) {
      minimum = Math.min(
        minimum,
        segmentDistance(
          start,
          end,
          polyline[lineIndex - 1],
          polyline[lineIndex],
        ),
      );
    }
  });
  return minimum;
}

function polygonDistance(left, right) {
  let minimum = Infinity;
  left.forEach((leftStart, leftIndex) => {
    const leftEnd = left[(leftIndex + 1) % left.length];
    right.forEach((rightStart, rightIndex) => {
      const rightEnd = right[(rightIndex + 1) % right.length];
      minimum = Math.min(
        minimum,
        segmentDistance(leftStart, leftEnd, rightStart, rightEnd),
      );
    });
  });
  return minimum;
}

function pointInPolygon([x, z], polygon) {
  let inside = false;
  polygon.forEach(([x0, z0], index) => {
    const [x1, z1] = polygon[(index + 1) % polygon.length];
    const crosses = (
      ((z0 > z) !== (z1 > z))
      && x < ((x1 - x0) * (z - z0)) / (z1 - z0) + x0
    );
    if (crosses) inside = !inside;
  });
  return inside;
}

function gcj02ToWgs84([longitude, latitude]) {
  const pi = Math.PI;
  const earthRadius = 6_378_245;
  const eccentricity = 0.00669342162296594323;
  const x = longitude - 105;
  const y = latitude - 35;
  const latitudeOffset = (
    -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y
    + 0.2 * Math.sqrt(Math.abs(x))
    + (20 * Math.sin(6 * x * pi) + 20 * Math.sin(2 * x * pi)) * 2 / 3
    + (20 * Math.sin(y * pi) + 40 * Math.sin(y / 3 * pi)) * 2 / 3
    + (160 * Math.sin(y / 12 * pi) + 320 * Math.sin(y * pi / 30)) * 2 / 3
  );
  const longitudeOffset = (
    300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y
    + 0.1 * Math.sqrt(Math.abs(x))
    + (20 * Math.sin(6 * x * pi) + 20 * Math.sin(2 * x * pi)) * 2 / 3
    + (20 * Math.sin(x * pi) + 40 * Math.sin(x / 3 * pi)) * 2 / 3
    + (150 * Math.sin(x / 12 * pi) + 300 * Math.sin(x / 30 * pi)) * 2 / 3
  );
  const latitudeRadians = latitude / 180 * pi;
  const magic = 1 - eccentricity * Math.sin(latitudeRadians) ** 2;
  const squareRootMagic = Math.sqrt(magic);
  const shiftedLatitude = latitude + (
    latitudeOffset * 180
    / ((earthRadius * (1 - eccentricity)) / (magic * squareRootMagic) * pi)
  );
  const shiftedLongitude = longitude + (
    longitudeOffset * 180
    / (earthRadius / squareRootMagic * Math.cos(latitudeRadians) * pi)
  );
  return [
    2 * longitude - shiftedLongitude,
    2 * latitude - shiftedLatitude,
  ];
}

const [buildingSnapshot, requestedPoiSnapshot, mapData] = await Promise.all([
  readFile(
    new URL(
      "docs/research/data/xinhua-buildings-osm-20260725-074802.json",
      ROOT,
    ),
    "utf8",
  ).then(JSON.parse),
  readFile(
    new URL(
      "docs/research/data/requested-pois-osm-20260717-103840.json",
      ROOT,
    ),
    "utf8",
  ).then(JSON.parse),
  readFile(new URL("app/scene/xinhua-map-data.json", ROOT), "utf8")
    .then(JSON.parse),
]);

const targetWay = buildingSnapshot.elements.find(
  ({ type, id }) => type === "way" && id === TARGET_WAY_ID,
);
assert.ok(targetWay, `缺少 OSM way/${TARGET_WAY_ID}`);

const footprintWorld = openGeometry(targetWay.geometry)
  .map(({ lon, lat }) => projectWgs84([lon, lat], mapData.meta));
const footprintLocal = footprintWorld.map(worldToSourceLocal);
const maximumWorldVertexError = Math.max(...footprintWorld.map(
  (point, index) => Math.hypot(
    point[0] - sourceLocalToWorld(footprintLocal[index])[0],
    point[1] - sourceLocalToWorld(footprintLocal[index])[1],
  ),
));
assert.ok(
  maximumWorldVertexError <= MAX_WORLD_VERTEX_ERROR,
  `way/${TARGET_WAY_ID} 回投误差 ${maximumWorldVertexError} 超标`,
);

const publicMapReferences = [
  {
    id: "smartshanghai-le-jardin-secret",
    sourceUrl: "https://www.smartshanghai.com/venue/6062/Le_Jardin_Secret",
    coordinateSystem: "gcj02-inferred-from-china-map-provider",
    providerCoordinate: [121.423927, 31.205664],
  },
  {
    id: "leju-fahua-525",
    sourceUrl: "https://house.leju.com/sh/47319/",
    coordinateSystem: "gcj02-inferred-from-china-map-provider",
    providerCoordinate: [121.42343, 31.205717],
  },
].map((reference) => {
  const wgs84 = gcj02ToWgs84(reference.providerCoordinate);
  const world = projectWgs84(wgs84, mapData.meta);
  return {
    ...reference,
    wgs84: wgs84.map((value) => round(value, 9)),
    world: world.map((value) => round(value)),
    insideTargetFootprint: pointInPolygon(world, footprintWorld),
    distanceToTargetFootprintSceneUnits: round(
      polygonToPolylineDistance([world], [
        ...footprintWorld,
        footprintWorld[0],
      ]),
    ),
  };
});

assert.equal(
  publicMapReferences[0].insideTargetFootprint,
  true,
  "SmartShanghai 地址点换算后应落在 way/864847922 内",
);

const roadMetrics = mapData.roads
  .filter(({ name, bridge, tunnel, layer }) => (
    ["法华镇路", "定西路"].includes(name)
    && !bridge
    && !tunnel
    && layer >= 0
  ))
  .map((road) => {
    const centerlineDistance = polygonToPolylineDistance(
      footprintWorld,
      road.points,
    );
    const fullWidth = road.highway.startsWith("tertiary")
      ? 1.45 * mapData.meta.environmentScale
      : 0.9 * mapData.meta.environmentScale;
    return {
      id: road.id,
      name: road.name,
      highway: road.highway,
      centerlineDistanceSceneUnits: round(centerlineDistance),
      asphaltHalfWidthSceneUnits: round(fullWidth / 2),
      asphaltClearanceSceneUnits: round(centerlineDistance - fullWidth / 2),
      asphaltClearanceMeters: round(
        (centerlineDistance - fullWidth / 2)
        * mapData.meta.metersPerSceneUnit,
      ),
    };
  })
  .sort((left, right) => (
    left.asphaltClearanceSceneUnits - right.asphaltClearanceSceneUnits
  ));

const nearbyBuildings = buildingSnapshot.elements
  .filter(({ type, id, tags }) => (
    type === "way" && id !== TARGET_WAY_ID && tags?.building
  ))
  .map((way) => {
    const world = openGeometry(way.geometry)
      .map(({ lon, lat }) => projectWgs84([lon, lat], mapData.meta));
    return {
      sourceWayId: way.id,
      name: way.tags.name ?? null,
      collisionGapSceneUnits: polygonDistance(footprintWorld, world),
    };
  })
  .sort((left, right) => (
    left.collisionGapSceneUnits - right.collisionGapSceneUnits
  ))
  .slice(0, 6)
  .map((item) => ({
    ...item,
    collisionGapSceneUnits: round(item.collisionGapSceneUnits),
    collisionGapAfterMarginsSceneUnits: round(
      item.collisionGapSceneUnits - COLLISION_MARGIN * 2,
    ),
    collisionGapMeters: round(
      item.collisionGapSceneUnits * mapData.meta.metersPerSceneUnit,
    ),
  }));

const targetResult = requestedPoiSnapshot.targets.find(
  ({ target }) => target.id === "debi-fahua-525",
);
assert.ok(targetResult, "缺少 debi-fahua-525 请求快照");
const universityBoundary = targetResult.overpass.elements.find(
  ({ type, id }) => type === "way" && id === 228966546,
);
assert.equal(
  universityBoundary?.tags?.name,
  "上海交通大学法华校区",
  "OSM 校区边界必须可追溯",
);

const rejectedRecoveryCandidates = [
  864847921,
  864847920,
  228966550,
  864847917,
  228966551,
].map((sourceWayId) => {
  const way = targetResult.overpass.elements.find(
    ({ type, id }) => type === "way" && id === sourceWayId,
  );
  assert.ok(way, `缺少 Recovery 候选 way/${sourceWayId}`);
  return {
    sourceWayId,
    osmName: way.tags?.name ?? null,
    reason: [228966550, 228966551].includes(sourceWayId)
      ? "named-university-campus-building"
      : "unbound-inside-overinclusive-university-boundary",
  };
});

const result = {
  assetId: "debi-fahua-525",
  targetWayId: TARGET_WAY_ID,
  registryPlacement: {
    position: REGISTRY_POSITION,
    yaw: REGISTRY_YAW,
    scale: REGISTRY_SCALE,
  },
  footprintWorld: footprintWorld.map(([x, z]) => [round(x), round(z)]),
  footprintLocal: footprintLocal.map(([x, z]) => [round(x), round(z)]),
  maximumWorldVertexErrorSceneUnits: round(maximumWorldVertexError, 9),
  publicMapReferences,
  roadMetrics,
  nearbyBuildings,
  rejectedRecoveryCandidates,
};

console.log(JSON.stringify(result, null, 2));
