import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(ROOT, relativePath), "utf8"),
);
const sha256 = (relativePath) => crypto
  .createHash("sha256")
  .update(fs.readFileSync(path.join(ROOT, relativePath)))
  .digest("hex");

const mapData = readJson("app/scene/xinhua-map-data.json");
const layout = readJson("app/scene/xingfuli-layout.json");
const qaData = readJson("app/scene/xingfuli-qa-paths.json");
const roadSnapshot = readJson(
  "docs/research/data/xinhua-roads-osm-20260716-080509.json",
);
const heroRecord = readJson("docs/research/build-records/xingfuli.json");
const identityRecord = readJson(
  "docs/research/build-records/xingfuli-identity.json",
);
const massingRecord = readJson(
  "docs/research/build-records/xingfuli-massing.json",
);

const tierFiles = {
  hero: {
    glb: "public/models/xingfuli/xingfuli-center.glb",
    blend: "assets/models/source/xingfuli/xingfuli-center.blend",
    record: heroRecord,
  },
  identity: {
    glb: "public/models/xingfuli/xingfuli-center-identity.glb",
    blend: "assets/models/source/xingfuli/xingfuli-center-identity.blend",
    record: identityRecord,
  },
  massing: {
    glb: "public/models/xingfuli/xingfuli-center-massing.glb",
    blend: "assets/models/source/xingfuli/xingfuli-center-massing.blend",
    record: massingRecord,
  },
};

function inspectGlb(relativePath) {
  const file = fs.readFileSync(path.join(ROOT, relativePath));
  if (file.toString("utf8", 0, 4) !== "glTF") {
    throw new Error(`${relativePath} 不是 GLB`);
  }
  const jsonLength = file.readUInt32LE(12);
  const gltf = JSON.parse(file.subarray(20, 20 + jsonLength).toString("utf8"));
  let triangles = 0;
  const positionAccessors = [];
  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const indexAccessor = primitive.indices === undefined
        ? gltf.accessors[primitive.attributes.POSITION]
        : gltf.accessors[primitive.indices];
      triangles += indexAccessor.count / 3;
      positionAccessors.push(gltf.accessors[primitive.attributes.POSITION]);
    }
  }
  const bounds = positionAccessors.reduce(
    (result, accessor) => ({
      min: result.min.map((value, index) => Math.min(value, accessor.min[index])),
      max: result.max.map((value, index) => Math.max(value, accessor.max[index])),
    }),
    {
      min: [Infinity, Infinity, Infinity],
      max: [-Infinity, -Infinity, -Infinity],
    },
  );
  return {
    sha256: sha256(relativePath),
    bytes: file.byteLength,
    nodes: gltf.nodes?.length ?? 0,
    meshes: gltf.meshes?.length ?? 0,
    triangles,
    materials: gltf.materials?.length ?? 0,
    images: gltf.images?.length ?? 0,
    textures: gltf.textures?.length ?? 0,
    transformedNodes: (gltf.nodes ?? [])
      .filter((node) => (
        node.translation
        || node.rotation
        || node.scale
        || node.matrix
      ))
      .map(({ name, translation, rotation, scale, matrix }) => ({
        name: name ?? null,
        translation: translation ?? null,
        rotation: rotation ?? null,
        scale: scale ?? null,
        matrix: matrix ?? null,
      })),
    bounds,
  };
}

const tierAudit = Object.fromEntries(Object.entries(tierFiles).map(
  ([tier, files]) => {
    const glb = inspectGlb(files.glb);
    const recordSegment = files.record.outputs.segments.find(
      ({ id }) => id === "center",
    );
    return [tier, {
      glb: files.glb,
      blend: files.blend,
      ...glb,
      blendSha256: sha256(files.blend),
      recordSha256: recordSegment.sha256,
      recordMatchesCurrentGlb: recordSegment.sha256 === glb.sha256,
      generatedAt: files.record.generatedAt,
    }];
  },
));

const placement = mapData.landmarks.xingfuli;
const rawWay = roadSnapshot.elements.find(
  ({ type, id }) => type === "way" && id === placement.osmWayId,
);
if (!rawWay?.geometry?.length) {
  throw new Error("原始道路快照缺少幸福里 way/400066625");
}
const [centerLongitude, centerLatitude] = mapData.meta.centerWgs84;
const metersPerLongitudeDegree = 111_320
  * Math.cos(centerLatitude * Math.PI / 180);
const metersPerLatitudeDegree = 110_540;
const metersPerSceneUnit = mapData.meta.metersPerSceneUnit;
const project = ({ lon, lat }) => [
  (lon - centerLongitude) * metersPerLongitudeDegree / metersPerSceneUnit,
  -(lat - centerLatitude) * metersPerLatitudeDegree / metersPerSceneUnit,
];
const rawWayPoints = rawWay.geometry.map(project);
const rawStart = rawWayPoints[0];
const rawEnd = rawWayPoints.at(-1);
const rawLength = Math.hypot(rawEnd[0] - rawStart[0], rawEnd[1] - rawStart[1]);
const rawMidpoint = [
  (rawStart[0] + rawEnd[0]) / 2,
  (rawStart[1] + rawEnd[1]) / 2,
];
const rawDirection = [rawEnd[0] - rawStart[0], rawEnd[1] - rawStart[1]];
const expectedRotation = -Math.atan2(rawDirection[1], rawDirection[0]);
const axisX = [Math.cos(placement.rotationY), -Math.sin(placement.rotationY)];
const fanyuClearance = 4.1;
const modelLength = 94;
const longitudinalScale = placement.horizontalScale
  - fanyuClearance / modelLength;
const runtimePosition = [
  placement.position[0] - axisX[0] * fanyuClearance / 2,
  placement.position[1] - axisX[1] * fanyuClearance / 2,
];

const transformPoint = (x, z) => {
  const scaledX = x * longitudinalScale;
  const scaledZ = (z - placement.localLaneCenterZ) * placement.horizontalScale;
  const cosine = Math.cos(placement.rotationY);
  const sine = Math.sin(placement.rotationY);
  return [
    runtimePosition[0] + scaledX * cosine + scaledZ * sine,
    runtimePosition[1] - scaledX * sine + scaledZ * cosine,
  ];
};
const transformRectangle = ({ minX, maxX, minZ, maxZ }) => [
  transformPoint(minX, minZ),
  transformPoint(maxX, minZ),
  transformPoint(maxX, maxZ),
  transformPoint(minX, maxZ),
];
const transformAabb = (rectangle) => {
  const corners = transformRectangle(rectangle);
  return {
    minX: Math.min(...corners.map(([x]) => x)),
    maxX: Math.max(...corners.map(([x]) => x)),
    minZ: Math.min(...corners.map(([, z]) => z)),
    maxZ: Math.max(...corners.map(([, z]) => z)),
  };
};

const pointDistance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const pointToSegmentDistance = (point, start, end) => {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const squared = dx * dx + dz * dz;
  const ratio = squared === 0 ? 0 : Math.max(0, Math.min(1, (
    (point[0] - start[0]) * dx + (point[1] - start[1]) * dz
  ) / squared));
  return pointDistance(point, [
    start[0] + dx * ratio,
    start[1] + dz * ratio,
  ]);
};
const orient = (a, b, c) => (
  (b[0] - a[0]) * (c[1] - a[1])
  - (b[1] - a[1]) * (c[0] - a[0])
);
const onSegment = (a, b, point) => (
  Math.abs(orient(a, b, point)) < 1e-9
  && point[0] >= Math.min(a[0], b[0]) - 1e-9
  && point[0] <= Math.max(a[0], b[0]) + 1e-9
  && point[1] >= Math.min(a[1], b[1]) - 1e-9
  && point[1] <= Math.max(a[1], b[1]) + 1e-9
);
const segmentsIntersect = (a, b, c, d) => {
  const abC = orient(a, b, c);
  const abD = orient(a, b, d);
  const cdA = orient(c, d, a);
  const cdB = orient(c, d, b);
  if (
    ((abC > 0 && abD < 0) || (abC < 0 && abD > 0))
    && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))
  ) return true;
  return (
    onSegment(a, b, c)
    || onSegment(a, b, d)
    || onSegment(c, d, a)
    || onSegment(c, d, b)
  );
};
const segmentDistance = (a, b, c, d) => {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(
    pointToSegmentDistance(a, c, d),
    pointToSegmentDistance(b, c, d),
    pointToSegmentDistance(c, a, b),
    pointToSegmentDistance(d, a, b),
  );
};
const polygonEdges = (polygon) => polygon.map(
  (point, index) => [point, polygon[(index + 1) % polygon.length]],
);
const polygonToPolylineDistance = (polygon, points) => Math.min(
  ...polygonEdges(polygon).flatMap(([a, b]) => points.slice(0, -1).map(
    (c, index) => segmentDistance(a, b, c, points[index + 1]),
  )),
);
const rectangleDistance = (a, b) => Math.hypot(
  Math.max(0, a.minX - b.maxX, b.minX - a.maxX),
  Math.max(0, a.minZ - b.maxZ, b.minZ - a.maxZ),
);

const segmentForX = (x) => {
  if (x < -22) return "west";
  if (x < 22) return "center";
  return "east";
};
const buildingRectangles = layout.buildings.map((building) => ({
  id: building.id,
  segment: segmentForX(building.x),
  minX: building.x - building.width / 2 - 0.28,
  maxX: building.x + building.width / 2 + 0.28,
  minZ: building.side === "north"
    ? building.z - building.depth / 2
    : building.z - building.depth / 2 - 0.28,
  maxZ: building.side === "south"
    ? building.z + building.depth / 2
    : building.z + building.depth / 2 + 0.28,
}));
const centerBuildingPolygons = buildingRectangles
  .filter(({ segment }) => segment === "center")
  .map((rectangle) => ({
    id: rectangle.id,
    polygon: transformRectangle(rectangle),
  }));
const centerNorthLaneEdge = Math.min(...buildingRectangles
  .filter(({ segment, id }) => segment === "center" && id.startsWith("north-"))
  .map(({ minZ }) => minZ));
const centerSouthLaneEdge = Math.max(...buildingRectangles
  .filter(({ segment, id }) => segment === "center" && id.startsWith("south-"))
  .map(({ maxZ }) => maxZ));
const centerMainLaneClearanceLocal = centerNorthLaneEdge - centerSouthLaneEdge;
const splitObstacle = (obstacle) => {
  const width = obstacle.maxX - obstacle.minX;
  const count = Math.max(1, Math.ceil(width));
  const sliceWidth = width / count;
  return Array.from({ length: count }, (_, index) => ({
    minX: obstacle.minX + sliceWidth * index,
    maxX: obstacle.minX + sliceWidth * (index + 1),
    minZ: obstacle.minZ,
    maxZ: obstacle.maxZ,
  }));
};

const roadWidth = (road) => {
  const environmentScale = mapData.meta.environmentScale;
  if (road.name === "新华路" && road.highway.startsWith("tertiary")) {
    return 0.98 * environmentScale;
  }
  if (road.highway.startsWith("trunk")) return 2.62 * environmentScale;
  if (road.highway.startsWith("primary")) return 2.18 * environmentScale;
  if (road.highway.startsWith("secondary")) return 1.82 * environmentScale;
  if (road.highway.startsWith("tertiary")) return 1.45 * environmentScale;
  if (road.highway === "residential") return 0.9 * environmentScale;
  if (["living_street", "unclassified"].includes(road.highway)) {
    return 0.68 * environmentScale;
  }
  return 0.5 * environmentScale;
};
const roadClearances = mapData.roads
  .filter(({ tunnel, layer }) => !tunnel && layer >= 0)
  .flatMap((road) => (
  centerBuildingPolygons.map(({ id, polygon }) => {
    const width = roadWidth(road) * (road.highway.endsWith("_link") ? 0.78 : 1);
    const centerlineDistance = polygonToPolylineDistance(polygon, road.points);
    return {
      buildingId: id,
      roadId: road.id,
      osmWayId: road.osmWayId,
      name: road.name || null,
      highway: road.highway,
      centerlineDistance,
      asphaltClearance: centerlineDistance - width / 2,
    };
  })
)).sort((a, b) => a.asphaltClearance - b.asphaltClearance);

const adjacentCollisionClearances = ["west", "east"].map((segment) => {
  const centerLocalBoxes = buildingRectangles
    .filter(({ segment: candidateSegment }) => candidateSegment === "center");
  const adjacentLocalBoxes = buildingRectangles
    .filter(({ segment: candidateSegment }) => candidateSegment === segment);
  const centerBoxes = buildingRectangles
    .filter(({ segment: candidateSegment }) => candidateSegment === "center")
    .flatMap(splitObstacle)
    .map(transformAabb);
  const adjacentBoxes = buildingRectangles
    .filter(({ segment: candidateSegment }) => candidateSegment === segment)
    .flatMap(splitObstacle)
    .map(transformAabb);
  const clearances = centerBoxes.flatMap((centerBox) => (
    adjacentBoxes.map((adjacentBox) => rectangleDistance(centerBox, adjacentBox))
  ));
  const localClearances = centerLocalBoxes.flatMap((centerBox) => (
    adjacentLocalBoxes.map((adjacentBox) => rectangleDistance(centerBox, adjacentBox))
  ));
  return {
    segment,
    minimumLocalOrientedClearance: Math.min(...localClearances),
    minimumLongitudinalClearanceSceneUnits:
      Math.min(...localClearances) * longitudinalScale,
    minimumWorldAabbClearance: Math.min(...clearances),
    overlaps: clearances.filter((clearance) => clearance === 0).length,
    interpretation: clearances.some((clearance) => clearance === 0)
      ? "production-aabb-slices-merge-continuous-facade-gap"
      : "separate",
  };
});

const allLocalObstacles = [
  ...buildingRectangles,
  ...qaData.fixedObstacles,
];
const worldCollisionBoxes = allLocalObstacles
  .flatMap(splitObstacle)
  .map(transformAabb);
const evaluateStart = (start) => {
  const world = transformPoint(...start.local);
  const nearestObstacleDistance = Math.min(...worldCollisionBoxes.map(
    (obstacle) => Math.hypot(
      Math.max(0, obstacle.minX - world[0], world[0] - obstacle.maxX),
      Math.max(0, obstacle.minZ - world[1], world[1] - obstacle.maxZ),
    ),
  ));
  return {
    ...start,
    world,
    nearestObstacleDistance,
    playerRadius: qaData.playerRadiusWorld,
    blocked: nearestObstacleDistance < qaData.playerRadiusWorld,
  };
};
const starts = [
  { id: "xingfuli", local: [-39.5, -7], forward: axisX },
  { id: "xingfuli-canonical", local: [4, -7], forward: axisX },
  { id: "xingfuli-pool-detail", local: [5.5, -10.4], forward: axisX },
  {
    id: "xingfuli-entrance-detail",
    local: [45, -5.5],
    forward: [-axisX[0], -axisX[1]],
  },
].map(evaluateStart);
const entranceStartCandidate = evaluateStart({
  id: "xingfuli-entrance-detail-candidate",
  local: [46, -5.05],
  forward: [-axisX[0], -axisX[1]],
  source: "existing-west-to-east-main-qa-route-endpoint",
});

const modelEndpointWest = transformPoint(-47, placement.localLaneCenterZ);
const modelEndpointEast = transformPoint(47, placement.localLaneCenterZ);
const mapComparison = {
  rawLengthSceneUnits: rawLength,
  rawLengthMeters: rawLength * metersPerSceneUnit,
  rawMidpoint,
  storedMidpoint: placement.position,
  midpointError: pointDistance(rawMidpoint, placement.position),
  rawRotationY: expectedRotation,
  storedRotationY: placement.rotationY,
  rotationErrorRadians: Math.abs(expectedRotation - placement.rotationY),
  rawHorizontalScale: rawLength / modelLength,
  storedHorizontalScale: placement.horizontalScale,
  scaleError: Math.abs(rawLength / modelLength - placement.horizontalScale),
  runtimePosition,
  longitudinalScale,
  endpoints: {
    xingfuRoad: {
      raw: rawStart,
      model: modelEndpointWest,
      clearanceSceneUnits: pointDistance(rawStart, modelEndpointWest),
    },
    panyuRoad: {
      raw: rawEnd,
      model: modelEndpointEast,
      clearanceSceneUnits: pointDistance(rawEnd, modelEndpointEast),
    },
  },
};

const heroGeneratedAt = Date.parse(heroRecord.generatedAt);
const identityGeneratedAt = Date.parse(identityRecord.generatedAt);
const identityHasExplicitLineage = JSON.stringify(identityRecord).includes(
  "derivedFrom",
);

const result = {
  assetId: "xingfuli-center",
  auditedAt: "2026-07-26",
  integrationBaseline: "406f584be9dc036b4ab441ce5639ad00d127de4a",
  recoveryCommit: "3044cd89f801250afcd477dfbcbc7da358bf4b11",
  generator: {
    path: "scripts/create_xingfuli_models.py",
    sha256: sha256("scripts/create_xingfuli_models.py"),
    singleAssetCommand:
      "Blender --background --python scripts/create_xingfuli_models.py -- --segment=center --stage=<tier>",
  },
  tiers: tierAudit,
  lineage: {
    generatorSharedAcrossTiers: true,
    identityHasExplicitDerivedFrom: identityHasExplicitLineage,
    identityGeneratedBeforeFinalHero: identityGeneratedAt < heroGeneratedAt,
    identityStatus: (
      identityHasExplicitLineage && identityGeneratedAt >= heroGeneratedAt
        ? "pass"
        : "blocked-provisional"
    ),
    reason:
      "Identity build record 没有 final Hero source SHA/derivedFrom，且生成时间早于 final Hero。",
  },
  map: {
    osmWayId: placement.osmWayId,
    address: placement.address,
    projection: {
      centerWgs84: mapData.meta.centerWgs84,
      metersPerSceneUnit,
    },
    comparison: mapComparison,
    centerBuildingIds: centerBuildingPolygons.map(({ id }) => id),
    nearestVisibleRoad: roadClearances[0],
    nearestPanyuRoad: roadClearances.find(({ name }) => name === "番禺路"),
    nearestXingfuRoad: roadClearances.find(({ name }) => name === "幸福路"),
    adjacentCollisionClearances,
    centerMainLane: {
      clearanceLocalUnits: centerMainLaneClearanceLocal,
      clearanceSceneUnits:
        centerMainLaneClearanceLocal * placement.horizontalScale,
      clearanceMeters:
        centerMainLaneClearanceLocal * placement.horizontalScale
        * metersPerSceneUnit,
      remainingAfterPlayerDiameterSceneUnits:
        centerMainLaneClearanceLocal * placement.horizontalScale
        - qaData.playerRadiusWorld * 2,
    },
    starts,
    entranceStartCandidate,
  },
  gates: {
    evidence: "pass-package-medium-internal-member-confidence",
    hero: "pass-retained",
    massing: "pass-retained",
    identity: (
      identityHasExplicitLineage && identityGeneratedAt >= heroGeneratedAt
        ? "pass-retained"
        : "blocked-lineage"
    ),
    map: roadClearances[0].asphaltClearance > 0
      ? "pass-center-segment"
      : "blocked",
    collision: adjacentCollisionClearances.every(
      ({ minimumLocalOrientedClearance }) => minimumLocalOrientedClearance > 0,
    )
      ? "pass-primary-routes-retained-aabb-side-gaps-merged"
      : "blocked",
    startCamera: starts.every(({ blocked }) => !blocked)
      ? "pass-geometry"
      : "blocked",
    mcp123: "pending-main-window-batch",
    threeTierRuntime: "pending-main-window",
  },
};

console.log(JSON.stringify(result, null, 2));
