import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(ROOT, relativePath), "utf8"),
);

const mapData = readJson("app/scene/xinhua-map-data.json");
const landmarkData = readJson("app/scene/xinhua-road-landmarks-data.json");
const requestedPoiOsm = readJson(
  "docs/research/data/requested-pois-osm-20260717-103840.json",
);
const currentBuildingsOsm = readJson(
  "docs/research/data/xinhua-buildings-osm-20260725-074802.json",
);
const recoveryRecord = readJson(
  "docs/research/build-records/tiers/xinhua-road/massing-v2/fics-xinhua-365-massing.json",
);

const targetId = "fics-xinhua-365";
const placement = recoveryRecord.placement;
const currentLandmark = landmarkData.landmarks.find(({ id }) => id === targetId);
const targetSnapshot = requestedPoiOsm.targets.find(
  ({ target }) => target.id === targetId,
);

if (!currentLandmark || !targetSnapshot) {
  throw new Error("缺少 FICS 新华365地图或 OSM 快照");
}

const [centerLongitude, centerLatitude] = mapData.meta.centerWgs84;
const metersPerLongitudeDegree = 111_320
  * Math.cos(centerLatitude * Math.PI / 180);
const metersPerLatitudeDegree = 110_540;
const metersPerSceneUnit = mapData.meta.metersPerSceneUnit;
const projectWgs84 = ({ lon, lat }) => [
  (lon - centerLongitude) * metersPerLongitudeDegree / metersPerSceneUnit,
  -(lat - centerLatitude) * metersPerLatitudeDegree / metersPerSceneUnit,
];

const candidateWayIds = recoveryRecord.children.map(({ sourceWayId }) => sourceWayId);
const candidateWayIdSet = new Set(candidateWayIds);
const sourceWays = new Map(
  targetSnapshot.overpass.elements
    .filter(({ type, geometry }) => type === "way" && geometry?.length >= 4)
    .map((way) => [way.id, way]),
);
const currentBuildingWays = currentBuildingsOsm.elements.filter(
  ({ type, tags, geometry }) => (
    type === "way"
    && tags?.building
    && geometry?.length >= 4
  ),
);

const openRing = (points) => {
  if (
    points.length > 1
    && points[0][0] === points.at(-1)[0]
    && points[0][1] === points.at(-1)[1]
  ) {
    return points.slice(0, -1);
  }
  return points;
};

const rawCandidatePolygons = new Map(candidateWayIds.map((wayId) => {
  const way = sourceWays.get(wayId);
  if (!way) throw new Error(`Recovery 候选 way/${wayId} 不在原始 OSM 快照`);
  return [wayId, openRing(way.geometry.map(projectWgs84))];
}));

const authoredToWorld = ([localX, localY]) => {
  const cosine = Math.cos(placement.yaw);
  const sine = Math.sin(placement.yaw);
  return [
    placement.position[0] + placement.scale * (
      cosine * localX + sine * localY
    ),
    placement.position[1] + placement.scale * (
      -sine * localX + cosine * localY
    ),
  ];
};

const authoredCandidatePolygons = new Map(recoveryRecord.children.map((child) => [
  child.sourceWayId,
  child.localFootprint.map(authoredToWorld),
]));

const pointDistance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const nearestPointError = (point, candidates) => Math.min(
  ...candidates.map((candidate) => pointDistance(point, candidate)),
);
const roundTripErrors = candidateWayIds.flatMap((wayId) => {
  const raw = rawCandidatePolygons.get(wayId);
  return authoredCandidatePolygons.get(wayId).map((point) => (
    nearestPointError(point, raw)
  ));
});

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
const pointToSegmentDistance = (point, start, end) => {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (
    (point[0] - start[0]) * dx + (point[1] - start[1]) * dz
  ) / lengthSquared));
  return pointDistance(point, [start[0] + dx * t, start[1] + dz * t]);
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
const edges = (polygon) => polygon.map(
  (point, index) => [point, polygon[(index + 1) % polygon.length]],
);
const pointInPolygon = (point, polygon) => {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index, index += 1) {
    const [xi, zi] = polygon[index];
    const [xj, zj] = polygon[previous];
    const crosses = (
      (zi > point[1]) !== (zj > point[1])
      && point[0] < (xj - xi) * (point[1] - zi) / (zj - zi) + xi
    );
    if (crosses) inside = !inside;
  }
  return inside;
};
const polygonDistance = (a, b) => {
  if (pointInPolygon(a[0], b) || pointInPolygon(b[0], a)) return 0;
  return Math.min(
    ...edges(a).flatMap(([a0, a1]) => (
      edges(b).map(([b0, b1]) => segmentDistance(a0, a1, b0, b1))
    )),
  );
};
const polygonToPolylineDistance = (polygon, points) => Math.min(
  ...edges(polygon).flatMap(([polygonStart, polygonEnd]) => (
    points.slice(0, -1).map((roadStart, index) => (
      segmentDistance(
        polygonStart,
        polygonEnd,
        roadStart,
        points[index + 1],
      )
    ))
  )),
);

const roadWidth = (road) => {
  if (road.name === "新华路" && road.highway.startsWith("tertiary")) return 4.9;
  if (road.highway.startsWith("trunk")) return 13.1;
  if (road.highway.startsWith("primary")) return 10.9;
  if (road.highway.startsWith("secondary")) return 9.1;
  if (road.highway.startsWith("tertiary")) return 7.25;
  if (road.highway === "residential") return 4.5;
  if (["living_street", "unclassified"].includes(road.highway)) return 3.4;
  return 2.5;
};
const surfaceRoads = mapData.roads.filter(({ tunnel, layer }) => !tunnel && layer >= 0);
const candidatePolygons = [...rawCandidatePolygons.values()];
const roadClearances = surfaceRoads.flatMap((road) => (
  candidateWayIds.map((wayId) => {
    const polygon = rawCandidatePolygons.get(wayId);
    const centerlineDistance = polygonToPolylineDistance(polygon, road.points);
    const width = roadWidth(road) * (road.highway.endsWith("_link") ? 0.78 : 1);
    return {
      candidateWayId: wayId,
      roadId: road.id,
      osmWayId: road.osmWayId,
      name: road.name || null,
      highway: road.highway,
      centerlineDistance,
      asphaltClearance: centerlineDistance - width / 2,
    };
  })
)).sort((a, b) => a.asphaltClearance - b.asphaltClearance);

const xinhuaRoadClearance = roadClearances
  .filter(({ name }) => name === "新华路")
  .sort((a, b) => a.asphaltClearance - b.asphaltClearance)[0];
const perCandidateRoadClearance = candidateWayIds.map((wayId) => ({
  wayId,
  nearestSurfaceRoad: roadClearances.find(
    ({ candidateWayId }) => candidateWayId === wayId,
  ),
  nearestXinhuaRoad: roadClearances.find(
    ({ candidateWayId, name }) => (
      candidateWayId === wayId && name === "新华路"
    ),
  ),
}));

const currentBuildingPolygons = currentBuildingWays.map((way) => ({
  wayId: way.id,
  tags: way.tags,
  polygon: openRing(way.geometry.map(projectWgs84)),
}));
const neighborClearances = currentBuildingPolygons
  .filter(({ wayId }) => !candidateWayIdSet.has(wayId))
  .map(({ wayId, tags, polygon }) => ({
    wayId,
    tags,
    nearestCandidateWayId: candidateWayIds
      .map((candidateWayId) => ({
        candidateWayId,
        clearance: polygonDistance(
          rawCandidatePolygons.get(candidateWayId),
          polygon,
        ),
      }))
      .sort((a, b) => a.clearance - b.clearance)[0].candidateWayId,
    clearance: Math.min(...candidatePolygons.map(
      (candidate) => polygonDistance(candidate, polygon),
    )),
  }))
  .sort((a, b) => a.clearance - b.clearance);

const runtimeLandmarkPolygon = (landmark) => {
  const { minX, maxX, minZ, maxZ } = landmark.localBounds;
  const cosine = Math.cos(landmark.yaw);
  const sine = Math.sin(landmark.yaw);
  return [
    [minX, minZ],
    [maxX, minZ],
    [maxX, maxZ],
    [minX, maxZ],
  ].map(([localX, sourceZ]) => {
    const localZ = -sourceZ;
    return [
      landmark.position[0] + landmark.scale * (
        cosine * localX + sine * localZ
      ),
      landmark.position[1] + landmark.scale * (
        -sine * localX + cosine * localZ
      ),
    ];
  });
};
const runtimeLandmarkClearances = landmarkData.landmarks
  .filter(({ id }) => id !== targetId)
  .map((landmark) => ({
    id: landmark.id,
    clearance: Math.min(...candidatePolygons.map(
      (candidate) => polygonDistance(candidate, runtimeLandmarkPolygon(landmark)),
    )),
  }))
  .sort((a, b) => a.clearance - b.clearance);
const candidateInternalClearances = candidateWayIds.flatMap(
  (wayId, index) => candidateWayIds.slice(index + 1).map((otherWayId) => ({
    wayIds: [wayId, otherWayId],
    clearance: polygonDistance(
      rawCandidatePolygons.get(wayId),
      rawCandidatePolygons.get(otherWayId),
    ),
  })),
).sort((a, b) => a.clearance - b.clearance);

const candidateBounds = candidatePolygons.flat().reduce(
  (bounds, [x, z]) => ({
    minX: Math.min(bounds.minX, x),
    maxX: Math.max(bounds.maxX, x),
    minZ: Math.min(bounds.minZ, z),
    maxZ: Math.max(bounds.maxZ, z),
  }),
  { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
);

const result = {
  assetId: targetId,
  auditedAt: "2026-07-26",
  sources: {
    recoveryCommit: "3044cd89f801250afcd477dfbcbc7da358bf4b11",
    integrationBaseline: "6132c9a03a16bffc1614b08b2a8cdb80bd0852ea",
    originalOsmSnapshot:
      "docs/research/data/requested-pois-osm-20260717-103840.json",
    currentBuildingSnapshot:
      "docs/research/data/xinhua-buildings-osm-20260725-074802.json",
    currentRoadMap: "app/scene/xinhua-map-data.json",
  },
  projection: {
    centerWgs84: mapData.meta.centerWgs84,
    metersPerSceneUnit,
    metersPerLongitudeDegree,
    metersPerLatitudeDegree,
  },
  placement,
  currentRuntimePlacement: {
    position: currentLandmark.position,
    yaw: currentLandmark.yaw,
    scale: currentLandmark.scale,
    positioning: currentLandmark.positioning,
  },
  candidateWayIds,
  candidateBounds,
  authoredToRawOsmRoundTrip: {
    maxSceneUnits: Math.max(...roundTripErrors),
    maxMeters: Math.max(...roundTripErrors) * metersPerSceneUnit,
  },
  roads: {
    nearestSurfaceRoad: roadClearances[0],
    nearestXinhuaRoad: xinhuaRoadClearance,
    xinhuaRoadAsphaltWidth: 4.9,
    xinhuaRoadVisibleOuterEdge:
      4.9 / 2 + 0.275 + 0.8 + 0.4,
    xinhuaRoadVisibleOuterClearance:
      xinhuaRoadClearance.centerlineDistance
      - (4.9 / 2 + 0.275 + 0.8 + 0.4),
    perCandidate: perCandidateRoadClearance,
  },
  candidateInternalClearance: candidateInternalClearances[0],
  nearestOtherBuildings: neighborClearances.slice(0, 8),
  nearestRuntimeLandmarks: runtimeLandmarkClearances.slice(0, 5),
  gates: {
    recoveryMassingStructure: "pass-retained",
    recoveryMassingRuntimeVisual: "pass-retained",
    formalMapAcceptance: "blocked-membership",
    identityAllowed: false,
    reason:
      "五个 OSM footprint 的几何和落点可复现，但 OSM 无名称、地址或园区边界，不能证明五栋恰为 FICS 园区完整成员。",
  },
};

console.log(JSON.stringify(result, null, 2));
