import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bindingPath = path.join(ROOT, "docs/research/shanghai-orchestra-osm-binding.json");
const recordPath = path.join(
  ROOT,
  "docs/research/build-records/tiers/xinhua-road/massing-v2/shanghai-orchestra-massing.json",
);
const mapPath = path.join(ROOT, "app/scene/xinhua-map-data.json");
const outputPath = path.join(ROOT, "docs/research/shanghai-orchestra-massing-map-gate.json");

const binding = JSON.parse(fs.readFileSync(bindingPath, "utf8"));
const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
const mapData = JSON.parse(fs.readFileSync(mapPath, "utf8"));

const round = (value, digits = 6) => Number(value.toFixed(digits));

function projectWgs84([longitude, latitude]) {
  const [centerLongitude, centerLatitude] = binding.source.centerWgs84;
  const latitudeRadians = centerLatitude * Math.PI / 180;
  return [
    (longitude - centerLongitude) * 111_320 * Math.cos(latitudeRadians)
      / binding.source.metersPerSceneUnit,
    -(latitude - centerLatitude) * 110_540 / binding.source.metersPerSceneUnit,
  ];
}

function worldToLocal([worldX, worldZ]) {
  const { position, yaw, scale } = binding.runtimeTransform;
  const dx = worldX - position[0];
  const dz = worldZ - position[1];
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  return [
    (cosine * dx - sine * dz) / scale,
    (sine * dx + cosine * dz) / scale,
  ];
}

function localToWorld([localX, localZ]) {
  const { position, yaw, scale } = binding.runtimeTransform;
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  return [
    position[0] + scale * (cosine * localX + sine * localZ),
    position[1] + scale * (-sine * localX + cosine * localZ),
  ];
}

function pointSegmentDistance(point, segmentStart, segmentEnd) {
  const dx = segmentEnd[0] - segmentStart[0];
  const dz = segmentEnd[1] - segmentStart[1];
  const lengthSquared = dx * dx + dz * dz;
  const ratio = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, (
      (point[0] - segmentStart[0]) * dx
      + (point[1] - segmentStart[1]) * dz
    ) / lengthSquared));
  return Math.hypot(
    point[0] - (segmentStart[0] + dx * ratio),
    point[1] - (segmentStart[1] + dz * ratio),
  );
}

function orientation(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1])
    - (b[1] - a[1]) * (c[0] - a[0]);
}

function segmentsIntersect(a, b, c, d) {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  return (
    ((abC > 0 && abD < 0) || (abC < 0 && abD > 0))
    && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))
  );
}

function segmentDistance(a, b, c, d) {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(
    pointSegmentDistance(a, c, d),
    pointSegmentDistance(b, c, d),
    pointSegmentDistance(c, a, b),
    pointSegmentDistance(d, a, b),
  );
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current, current += 1) {
    const [currentX, currentZ] = polygon[current];
    const [previousX, previousZ] = polygon[previous];
    const crosses = (currentZ > point[1]) !== (previousZ > point[1])
      && point[0] < (
        (previousX - currentX) * (point[1] - currentZ)
        / (previousZ - currentZ)
        + currentX
      );
    if (crosses) inside = !inside;
  }
  return inside;
}

function polygonDistance(first, second) {
  if (pointInPolygon(first[0], second) || pointInPolygon(second[0], first)) {
    return 0;
  }
  let minimum = Number.POSITIVE_INFINITY;
  for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
    const firstNext = (firstIndex + 1) % first.length;
    for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
      const secondNext = (secondIndex + 1) % second.length;
      minimum = Math.min(
        minimum,
        segmentDistance(
          first[firstIndex],
          first[firstNext],
          second[secondIndex],
          second[secondNext],
        ),
      );
    }
  }
  return minimum;
}

function polygonPolylineDistance(polygon, points) {
  let minimum = Number.POSITIVE_INFINITY;
  for (let polygonIndex = 0; polygonIndex < polygon.length; polygonIndex += 1) {
    const polygonNext = (polygonIndex + 1) % polygon.length;
    for (let roadIndex = 0; roadIndex < points.length - 1; roadIndex += 1) {
      minimum = Math.min(
        minimum,
        segmentDistance(
          polygon[polygonIndex],
          polygon[polygonNext],
          points[roadIndex],
          points[roadIndex + 1],
        ),
      );
    }
  }
  return minimum;
}

function roadWidth(road) {
  const scale = mapData.meta.environmentScale;
  if (road.name === "新华路" && road.highway.startsWith("tertiary")) {
    return 0.98 * scale;
  }
  if (road.highway.startsWith("trunk")) return 2.62 * scale;
  if (road.highway.startsWith("primary")) return 2.18 * scale;
  if (road.highway.startsWith("secondary")) return 1.82 * scale;
  if (road.highway.startsWith("tertiary")) return 1.45 * scale;
  if (road.highway === "residential") return 0.9 * scale;
  if (road.highway === "living_street" || road.highway === "unclassified") {
    return 0.68 * scale;
  }
  return 0.5 * scale;
}

function roadDistance(polygon, roadName) {
  const roads = mapData.roads.filter((road) => (
    road.name === roadName && !road.tunnel && road.layer >= 0
  ));
  const candidates = roads.map((road) => {
    const centerline = polygonPolylineDistance(polygon, road.points);
    const width = roadWidth(road);
    return {
      osmWayId: road.osmWayId,
      highway: road.highway,
      centerlineSceneUnits: centerline,
      asphaltWidthSceneUnits: width,
      asphaltEdgeSceneUnits: centerline - width / 2,
    };
  });
  candidates.sort((left, right) => (
    left.asphaltEdgeSceneUnits - right.asphaltEdgeSceneUnits
  ));
  return candidates[0];
}

function longestEdgeYaw(polygon) {
  let selected = { length: -1, yaw: 0 };
  for (let index = 0; index < polygon.length; index += 1) {
    const next = (index + 1) % polygon.length;
    const dx = polygon[next][0] - polygon[index][0];
    const dz = polygon[next][1] - polygon[index][1];
    const length = Math.hypot(dx, dz);
    if (length > selected.length) {
      selected = { length, yaw: Math.atan2(dz, dx) };
    }
  }
  return selected;
}

const projectedCandidates = binding.candidateWays.map((candidate) => {
  const worldFootprint = candidate.wgs84Footprint.map(projectWgs84);
  const localFootprint = worldFootprint.map(worldToLocal);
  const roundTripMaximum = Math.max(
    ...worldFootprint.map((point, index) => (
      Math.hypot(
        point[0] - localToWorld(localFootprint[index])[0],
        point[1] - localToWorld(localFootprint[index])[1],
      )
    )),
  );
  const recoveryChild = record.children.find(
    (child) => child.sourceWayId === candidate.sourceWayId,
  );
  const recoveryMaximum = recoveryChild
    ? Math.max(...worldFootprint.map((point, index) => {
      const recovered = localToWorld(recoveryChild.localFootprint[index]);
      return Math.hypot(point[0] - recovered[0], point[1] - recovered[1]);
    }))
    : null;
  const axis = longestEdgeYaw(worldFootprint);
  return {
    sourceWayId: candidate.sourceWayId,
    candidateRole: candidate.candidateRole,
    worldFootprint,
    localFootprint,
    roundTripMaximum,
    recoveryMaximum,
    axis,
    roads: {
      xinhua: roadDistance(worldFootprint, "新华路"),
      fahuazhen: roadDistance(worldFootprint, "法华镇路"),
    },
  };
});

const projectedAdjacent = binding.adjacentUnknownWays.map((candidate) => ({
  sourceWayId: candidate.sourceWayId,
  exclusionReason: candidate.exclusionReason,
  worldFootprint: candidate.wgs84Footprint.map(projectWgs84),
}));

const candidatePairGaps = [];
for (let first = 0; first < projectedCandidates.length; first += 1) {
  for (let second = first + 1; second < projectedCandidates.length; second += 1) {
    candidatePairGaps.push({
      firstWayId: projectedCandidates[first].sourceWayId,
      secondWayId: projectedCandidates[second].sourceWayId,
      gapSceneUnits: polygonDistance(
        projectedCandidates[first].worldFootprint,
        projectedCandidates[second].worldFootprint,
      ),
    });
  }
}

const adjacentGaps = projectedCandidates.flatMap((candidate) => (
  projectedAdjacent.map((adjacent) => ({
    candidateWayId: candidate.sourceWayId,
    adjacentWayId: adjacent.sourceWayId,
    gapSceneUnits: polygonDistance(
      candidate.worldFootprint,
      adjacent.worldFootprint,
    ),
  }))
));

const currentStart = [-28.5, 60];
const startClearance = Math.min(...projectedCandidates.map((candidate) => (
  pointInPolygon(currentStart, candidate.worldFootprint)
    ? 0
    : Math.min(...candidate.worldFootprint.map((point, index) => (
      pointSegmentDistance(
        currentStart,
        point,
        candidate.worldFootprint[(index + 1) % candidate.worldFootprint.length],
      )
    )))
)));

const minXinhua = projectedCandidates.reduce((best, candidate) => (
  candidate.roads.xinhua.asphaltEdgeSceneUnits < best.asphaltEdgeSceneUnits
    ? { sourceWayId: candidate.sourceWayId, ...candidate.roads.xinhua }
    : best
), { asphaltEdgeSceneUnits: Number.POSITIVE_INFINITY });
const minFahuazhen = projectedCandidates.reduce((best, candidate) => (
  candidate.roads.fahuazhen.asphaltEdgeSceneUnits < best.asphaltEdgeSceneUnits
    ? { sourceWayId: candidate.sourceWayId, ...candidate.roads.fahuazhen }
    : best
), { asphaltEdgeSceneUnits: Number.POSITIVE_INFINITY });

const output = {
  version: 1,
  auditedAt: "2026-07-26",
  assetId: binding.assetId,
  status: "geometry-pass-membership-and-map-acceptance-blocked-evidence",
  sourceBinding: path.relative(ROOT, bindingPath),
  recoveryBuildRecord: path.relative(ROOT, recordPath),
  runtimeTransform: binding.runtimeTransform,
  mapContract: {
    centerWgs84: binding.source.centerWgs84,
    metersPerSceneUnit: binding.source.metersPerSceneUnit,
    projectionFormula: {
      x: "(lon-centerLon)*111320*cos(centerLat)/metersPerSceneUnit",
      z: "-(lat-centerLat)*110540/metersPerSceneUnit",
    },
    roadWidthSource: "app/scene/road-surface-contract.ts:roadWidth",
  },
  candidateChecks: projectedCandidates.map((candidate) => ({
    sourceWayId: candidate.sourceWayId,
    candidateRole: candidate.candidateRole,
    worldFootprint: candidate.worldFootprint.map((point) => point.map((value) => round(value))),
    localFootprint: candidate.localFootprint.map((point) => point.map((value) => round(value))),
    longestFootprintEdge: {
      lengthSceneUnits: round(candidate.axis.length),
      yawRadians: round(candidate.axis.yaw),
      evidence: "observed-osm-footprint-not-entrance-direction",
    },
    projectionRoundTripMaxSceneUnits: round(candidate.roundTripMaximum, 9),
    recoveryWorldDeltaMaxSceneUnits: round(candidate.recoveryMaximum, 9),
    roadDistance: {
      xinhua: Object.fromEntries(Object.entries(candidate.roads.xinhua).map(
        ([key, value]) => [key, typeof value === "number" ? round(value) : value],
      )),
      fahuazhen: Object.fromEntries(Object.entries(candidate.roads.fahuazhen).map(
        ([key, value]) => [key, typeof value === "number" ? round(value) : value],
      )),
    },
  })),
  compoundRoadClearance: {
    xinhua: Object.fromEntries(Object.entries(minXinhua).map(
      ([key, value]) => [key, typeof value === "number" ? round(value) : value],
    )),
    fahuazhen: Object.fromEntries(Object.entries(minFahuazhen).map(
      ([key, value]) => [key, typeof value === "number" ? round(value) : value],
    )),
    interpretation: "positive asphaltEdgeSceneUnits means no footprint enters the rendered asphalt",
  },
  adjacency: {
    candidatePairMinimumGapSceneUnits: round(Math.min(
      ...candidatePairGaps.map((entry) => entry.gapSceneUnits),
    )),
    candidatePairIntersections: candidatePairGaps
      .filter((entry) => entry.gapSceneUnits <= 1e-9)
      .map((entry) => [entry.firstWayId, entry.secondWayId]),
    adjacentUnknownMinimumGapSceneUnits: round(Math.min(
      ...adjacentGaps.map((entry) => entry.gapSceneUnits),
    )),
    adjacentUnknownIntersections: adjacentGaps
      .filter((entry) => entry.gapSceneUnits <= 1e-9)
      .map((entry) => [entry.candidateWayId, entry.adjacentWayId]),
    candidatePairGaps: candidatePairGaps.map((entry) => ({
      ...entry,
      gapSceneUnits: round(entry.gapSceneUnits),
    })),
    adjacentGaps: adjacentGaps.map((entry) => ({
      ...entry,
      gapSceneUnits: round(entry.gapSceneUnits),
    })),
  },
  currentApproach: {
    start: currentStart,
    forward: [-0.707, -0.707],
    minimumBuildingClearanceSceneUnits: round(startClearance),
    collisionFree: startClearance >= 1.36,
  },
  acceptance: {
    sourceProjection: "pass",
    recoveryGeometryAlignment: projectedCandidates.every(
      (candidate) => candidate.recoveryMaximum <= 0.00001,
    ) ? "pass" : "fail",
    asphaltOverlap: (
      minXinhua.asphaltEdgeSceneUnits >= 0
      && minFahuazhen.asphaltEdgeSceneUnits >= 0
    ) ? "pass" : "fail",
    footprintCollision: (
      candidatePairGaps.every((entry) => entry.gapSceneUnits > 0)
      && adjacentGaps.every((entry) => entry.gapSceneUnits > 0)
    ) ? "pass" : "fail",
    formalMembership: "blocked-evidence",
    mapAcceptance: "blocked-evidence",
    identityAllowed: false,
  },
  blocker: {
    reason: "TJAD photos prove the compound but do not map buildings 6, 7, 8 or retained volumes to the five OSM ways",
    retainedAssets: [
      "public/models/xinhua-road/shanghai-orchestra.glb",
      "assets/models/source/xinhua-road/shanghai-orchestra.blend",
      "public/models/tiers/xinhua-road/massing-v2/shanghai-orchestra-massing.glb",
      "assets/models/source/tiers/xinhua-road/massing-v2/shanghai-orchestra-massing.blend"
    ],
    nextGate: "Blender MCP1 only after formal member set is accepted or additional site-plan evidence is obtained",
  },
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({
  output: path.relative(ROOT, outputPath),
  maxRecoveryDelta: Math.max(
    ...projectedCandidates.map((candidate) => candidate.recoveryMaximum),
  ),
  xinhuaRoadEdgeClearance: minXinhua.asphaltEdgeSceneUnits,
  fahuazhenRoadEdgeClearance: minFahuazhen.asphaltEdgeSceneUnits,
  candidatePairMinimumGap: output.adjacency.candidatePairMinimumGapSceneUnits,
  adjacentMinimumGap: output.adjacency.adjacentUnknownMinimumGapSceneUnits,
  startClearance,
  acceptance: output.acceptance,
}, null, 2));
