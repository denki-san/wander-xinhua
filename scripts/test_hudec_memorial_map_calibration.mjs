import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const OSM_WAY_ID = 494633921;
const PANYU_ROAD_OSM_WAY_ID = 11960339;
const RECOMMENDED_SCALE = 0.88;
const COLLISION_MARGIN = 0.2;
const PLAYER_RADIUS = 0.48;
const ROOT = new URL("../", import.meta.url);
const OUTPUT = new URL(
  "test_artifacts/test_hudec-memorial_map_calibration.json",
  ROOT,
);

function round(value, digits = 6) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function openGeometry(geometry) {
  const first = geometry[0];
  const last = geometry.at(-1);
  if (first.lon === last.lon && first.lat === last.lat) {
    return geometry.slice(0, -1);
  }
  return geometry;
}

function polygonCentroid(points) {
  let twiceArea = 0;
  let sumX = 0;
  let sumZ = 0;
  points.forEach(([x0, z0], index) => {
    const [x1, z1] = points[(index + 1) % points.length];
    const cross = x0 * z1 - x1 * z0;
    twiceArea += cross;
    sumX += (x0 + x1) * cross;
    sumZ += (z0 + z1) * cross;
  });
  return [
    sumX / (3 * twiceArea),
    sumZ / (3 * twiceArea),
  ];
}

function longestEdge(points) {
  return points.map((start, index) => {
    const end = points[(index + 1) % points.length];
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    return {
      start,
      end,
      dx,
      dz,
      length: Math.hypot(dx, dz),
      yaw: Math.atan2(-dz, dx),
    };
  }).sort((left, right) => right.length - left.length)[0];
}

function toAxisSpace([x, z], yaw) {
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  return [
    cosine * x - sine * z,
    sine * x + cosine * z,
  ];
}

function fromAxisSpace([x, z], yaw) {
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  return [
    cosine * x + sine * z,
    -sine * x + cosine * z,
  ];
}

function boundsOf(points) {
  const xs = points.map(([x]) => x);
  const zs = points.map(([, z]) => z);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
}

function transformPoint([x, z], position, yaw, scale) {
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  return [
    position[0] + scale * (cosine * x + sine * z),
    position[1] + scale * (-sine * x + cosine * z),
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
  polygon.forEach((start, index) => {
    const end = polygon[(index + 1) % polygon.length];
    for (let lineIndex = 1; lineIndex < polyline.length; lineIndex += 1) {
      minimum = Math.min(
        minimum,
        segmentDistance(start, end, polyline[lineIndex - 1], polyline[lineIndex]),
      );
    }
  });
  return minimum;
}

function transformObstacle(obstacle, position, yaw, scale) {
  const corners = [];
  for (const x of [obstacle.minX, obstacle.maxX]) {
    for (const z of [obstacle.minZ, obstacle.maxZ]) {
      corners.push(transformPoint([x, z], position, yaw, scale));
    }
  }
  const bounds = boundsOf(corners);
  return {
    id: obstacle.id,
    minX: round(bounds.minX - COLLISION_MARGIN),
    maxX: round(bounds.maxX + COLLISION_MARGIN),
    minZ: round(bounds.minZ - COLLISION_MARGIN),
    maxZ: round(bounds.maxZ + COLLISION_MARGIN),
  };
}

const [osmSnapshot, mapData, buildRecord, generator] = await Promise.all([
  readFile(
    new URL(
      "docs/research/data/requested-pois-osm-20260717-103840.json",
      ROOT,
    ),
    "utf8",
  ).then(JSON.parse),
  readFile(new URL("app/scene/xinhua-map-data.json", ROOT), "utf8").then(JSON.parse),
  readFile(
    new URL("docs/research/build-records/hudec-memorial-massing.json", ROOT),
    "utf8",
  ).then(JSON.parse),
  readFile(new URL("scripts/create_hudec_memorial_v2.py", ROOT), "utf8"),
]);

const osmWay = osmSnapshot.seed.elements.find(
  ({ type, id }) => type === "way" && id === OSM_WAY_ID,
);
assert.ok(osmWay?.geometry?.length, `缺少 OSM way ${OSM_WAY_ID}`);

const [centerLongitude, centerLatitude] = mapData.meta.centerWgs84;
const metersPerLongitudeDegree = 111_320
  * Math.cos(centerLatitude * Math.PI / 180);
const metersPerLatitudeDegree = 110_540;
const project = ({ lon, lat }) => [
  (lon - centerLongitude) * metersPerLongitudeDegree
    / mapData.meta.metersPerSceneUnit,
  -(lat - centerLatitude) * metersPerLatitudeDegree
    / mapData.meta.metersPerSceneUnit,
];
const osmFootprint = openGeometry(osmWay.geometry).map(project);
const osmCentroid = polygonCentroid(osmFootprint);
const majorEdge = longestEdge(osmFootprint);
const recommendedYaw = majorEdge.yaw;
const axisBounds = boundsOf(
  osmFootprint.map((point) => toAxisSpace(point, recommendedYaw)),
);
const osmOrientedCenter = fromAxisSpace([
  (axisBounds.minX + axisBounds.maxX) / 2,
  (axisBounds.minZ + axisBounds.maxZ) / 2,
], recommendedYaw);

const sourceBounds = buildRecord.structure.glbPositionBounds;
const runtimeLocalBounds = {
  minX: sourceBounds.min[0],
  maxX: sourceBounds.max[0],
  minZ: -sourceBounds.max[2],
  maxZ: -sourceBounds.min[2],
};
const runtimeLocalCenter = [
  (runtimeLocalBounds.minX + runtimeLocalBounds.maxX) / 2,
  (runtimeLocalBounds.minZ + runtimeLocalBounds.maxZ) / 2,
];
const centerOffset = transformPoint(
  runtimeLocalCenter,
  [0, 0],
  recommendedYaw,
  RECOMMENDED_SCALE,
);
const recommendedPosition = [
  osmOrientedCenter[0] - centerOffset[0],
  osmOrientedCenter[1] - centerOffset[1],
];
const runtimeFootprint = [
  [runtimeLocalBounds.minX, runtimeLocalBounds.minZ],
  [runtimeLocalBounds.maxX, runtimeLocalBounds.minZ],
  [runtimeLocalBounds.maxX, runtimeLocalBounds.maxZ],
  [runtimeLocalBounds.minX, runtimeLocalBounds.maxZ],
].map((point) => transformPoint(
  point,
  recommendedPosition,
  recommendedYaw,
  RECOMMENDED_SCALE,
));
const frontWorldVector = transformPoint(
  [0, -1],
  [0, 0],
  recommendedYaw,
  1,
);

const panyuRoad = mapData.roads.find(
  ({ osmWayId }) => osmWayId === PANYU_ROAD_OSM_WAY_ID,
);
assert.ok(panyuRoad, `缺少番禺路 OSM way ${PANYU_ROAD_OSM_WAY_ID}`);
const asphaltHalfWidth = 1.45 * mapData.meta.environmentScale / 2;
const osmToRoadCenterline = polygonToPolylineDistance(
  osmFootprint,
  panyuRoad.points,
);
const modelToRoadCenterline = polygonToPolylineDistance(
  runtimeFootprint,
  panyuRoad.points,
);
const osmToAsphaltEdge = osmToRoadCenterline - asphaltHalfWidth;
const modelToAsphaltEdge = modelToRoadCenterline - asphaltHalfWidth;

const numberFromSource = (pattern, label) => {
  const match = generator.match(pattern);
  assert.ok(match, `生成器缺少 ${label}`);
  return Number(match[1]);
};
const authoredScale = numberFromSource(
  /AUTHORED_SCALE\s*=\s*([0-9.]+)/,
  "AUTHORED_SCALE",
);
const porchWidth = numberFromSource(
  /porch_width\s*=\s*([0-9.]+)/,
  "porch_width",
);
const porchSideWidth = numberFromSource(
  /side_width\s*=\s*([0-9.]+)/,
  "side_width",
);
const localEntranceGap = (porchWidth - 2 * porchSideWidth) * authoredScale;
const worldEntranceGap = localEntranceGap * RECOMMENDED_SCALE;
const requiredEntranceGap = 2 * (PLAYER_RADIUS + COLLISION_MARGIN);

const localObstacles = [
  { id: "main-body", minX: -4.608, maxX: 4.104, minZ: -2.988, maxZ: 2.052 },
  { id: "end-wing", minX: 2.016, maxX: 4.752, minZ: -3.42, maxZ: 1.62 },
  { id: "low-glass-wing", minX: -4.5, maxX: -0.9, minZ: -3.762, maxZ: -1.35 },
  { id: "entrance-left", minX: 0.738, maxX: 1.1124, minZ: 1.926, maxZ: 3.186 },
  { id: "entrance-right", minX: 2.7036, maxX: 3.078, minZ: 1.926, maxZ: 3.186 },
  { id: "street-wall-left", minX: -6.048, maxX: -2.448, minZ: 4.5216, maxZ: 4.9104 },
  { id: "street-wall-right", minX: 2.448, maxX: 6.048, minZ: 4.5216, maxZ: 4.9104 },
];
const worldObstacles = localObstacles.map((obstacle) => (
  transformObstacle(
    obstacle,
    recommendedPosition,
    recommendedYaw,
    RECOMMENDED_SCALE,
  )
));

assert.ok(modelToAsphaltEdge > 0, "模型不得压到番禺路机动车道");
assert.ok(
  Math.abs(modelToAsphaltEdge - osmToAsphaltEdge) <= 1,
  "模型沿街退界与 OSM footprint 的真实退界差异不得超过 1 scene unit",
);
assert.ok(
  worldEntranceGap >= requiredEntranceGap,
  "建议缩放下的真实门廊净宽必须容纳玩家半径和碰撞 margin",
);

const result = {
  schemaVersion: 1,
  assetId: "hudec-memorial",
  status: "passed-static-map-recommendation-awaiting-main-runtime",
  generatedAt: "2026-07-26T02:26:03+08:00",
  sources: {
    osmSnapshot: "docs/research/data/requested-pois-osm-20260717-103840.json",
    osmWayId: OSM_WAY_ID,
    mapData: "app/scene/xinhua-map-data.json",
    panyuRoadOsmWayId: PANYU_ROAD_OSM_WAY_ID,
    buildRecord: "docs/research/build-records/hudec-memorial-massing.json",
  },
  recommendation: {
    position: recommendedPosition.map((value) => round(value)),
    yawRadians: round(recommendedYaw, 9),
    yawDegrees: round(recommendedYaw * 180 / Math.PI, 6),
    scale: RECOMMENDED_SCALE,
    sourceGlbPositionBounds: sourceBounds,
    runtimeLocalBounds: Object.fromEntries(
      Object.entries(runtimeLocalBounds).map(([key, value]) => [key, round(value)]),
    ),
    runtimeFootprint: runtimeFootprint.map((point) => (
      point.map((value) => round(value))
    )),
  },
  osmCalibration: {
    polygonCentroid: osmCentroid.map((value) => round(value)),
    orientedCenter: osmOrientedCenter.map((value) => round(value)),
    projectedFootprint: osmFootprint.map((point) => (
      point.map((value) => round(value))
    )),
    majorEdge: {
      lengthSceneUnits: round(majorEdge.length),
      yawRadians: round(majorEdge.yaw, 9),
      evidence: "OSM way 494633921 最长边，与西立面证据共同约束建筑东西长轴。",
    },
    orientedWidthSceneUnits: round(axisBounds.maxX - axisBounds.minX),
    orientedDepthSceneUnits: round(axisBounds.maxZ - axisBounds.minZ),
  },
  roadGate: {
    status: "pass",
    asphaltHalfWidthSceneUnits: round(asphaltHalfWidth),
    osmFootprintToRoadCenterlineSceneUnits: round(osmToRoadCenterline),
    modelToRoadCenterlineSceneUnits: round(modelToRoadCenterline),
    osmFootprintToAsphaltEdgeSceneUnits: round(osmToAsphaltEdge),
    modelToAsphaltEdgeSceneUnits: round(modelToAsphaltEdge),
    setbackDeltaSceneUnits: round(modelToAsphaltEdge - osmToAsphaltEdge),
    note: "建议模型退界复现 OSM footprint 自身退界，不压机动车道，也没有因手工锚点额外远离番禺路。",
  },
  orientationGate: {
    status: "pass-static-evidence",
    rejectedLegacyYawRadians: 1.5707963267948966,
    frontWorldVector: frontWorldVector.map((value) => round(value)),
    note: "旧 yaw=π/2 会把证据支持的东西长轴旋转近 90°；建议 yaw 来自 OSM 最长边，local -Y 入口面保持与西后侧证据一致。",
  },
  collisionRecommendation: {
    status: "pass-static-geometry",
    collisionMargin: COLLISION_MARGIN,
    playerRadius: PLAYER_RADIUS,
    requiredEntranceGap: round(requiredEntranceGap),
    localEntranceGap: round(localEntranceGap),
    worldEntranceGap: round(worldEntranceGap),
    remainingClearance: round(worldEntranceGap - requiredEntranceGap),
    localObstacles,
    worldObstacles,
    excluded: [
      "ground datum",
      "roof and dormers",
      "chimney already overlapped by main/low-wing blockers",
      "trees and decor",
    ],
  },
  integrationBoundary: {
    publicRegistryEdited: false,
    runtimeEdited: false,
    mcp1RequiredBeforeRuntimeGate: true,
  },
};

await writeFile(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
