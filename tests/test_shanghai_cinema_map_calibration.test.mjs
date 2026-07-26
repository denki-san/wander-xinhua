import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

function projectOsmPoint({ lon, lat }, map) {
  const [centerLon, centerLat] = map.meta.centerWgs84;
  const metersPerLonDegree = 111_320 * Math.cos(centerLat * Math.PI / 180);
  return [
    (lon - centerLon) * metersPerLonDegree / map.meta.metersPerSceneUnit,
    -(lat - centerLat) * 110_540 / map.meta.metersPerSceneUnit,
  ];
}

function polygonCentroid(points) {
  let twiceArea = 0;
  let weightedX = 0;
  let weightedZ = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [startX, startZ] = points[index];
    const [endX, endZ] = points[(index + 1) % points.length];
    const cross = startX * endZ - endX * startZ;
    twiceArea += cross;
    weightedX += (startX + endX) * cross;
    weightedZ += (startZ + endZ) * cross;
  }
  return [
    weightedX / (3 * twiceArea),
    weightedZ / (3 * twiceArea),
  ];
}

function sourceLocalPoint([worldX, worldZ], placement) {
  const dx = (worldX - placement.position[0]) / placement.scale;
  const dz = (worldZ - placement.position[1]) / placement.scale;
  const cosine = Math.cos(placement.yaw);
  const sine = Math.sin(placement.yaw);
  return [
    cosine * dx - sine * dz,
    -(sine * dx + cosine * dz),
  ];
}

function transformedCorners(placement) {
  const cosine = Math.cos(placement.yaw);
  const sine = Math.sin(placement.yaw);
  const { minX, maxX, minZ, maxZ } = placement.localBounds;
  return [
    [minX, -minZ],
    [maxX, -minZ],
    [maxX, -maxZ],
    [minX, -maxZ],
  ].map(([localX, runtimeLocalZ]) => [
    placement.position[0] + placement.scale
      * (cosine * localX + sine * runtimeLocalZ),
    placement.position[1] + placement.scale
      * (-sine * localX + cosine * runtimeLocalZ),
  ]);
}

function orientation(start, end, point) {
  return (end[0] - start[0]) * (point[1] - start[1])
    - (end[1] - start[1]) * (point[0] - start[0]);
}

function pointOnSegment(point, start, end) {
  return Math.abs(orientation(start, end, point)) <= 1e-9
    && point[0] >= Math.min(start[0], end[0]) - 1e-9
    && point[0] <= Math.max(start[0], end[0]) + 1e-9
    && point[1] >= Math.min(start[1], end[1]) - 1e-9
    && point[1] <= Math.max(start[1], end[1]) + 1e-9;
}

function segmentsIntersect(startA, endA, startB, endB) {
  const aStartSide = orientation(startA, endA, startB);
  const aEndSide = orientation(startA, endA, endB);
  const bStartSide = orientation(startB, endB, startA);
  const bEndSide = orientation(startB, endB, endA);
  return aStartSide * aEndSide < 0 && bStartSide * bEndSide < 0
    || pointOnSegment(startA, startB, endB)
    || pointOnSegment(endA, startB, endB)
    || pointOnSegment(startB, startA, endA)
    || pointOnSegment(endB, startA, endA);
}

function pointToSegmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (
    (point[0] - start[0]) * dx + (point[1] - start[1]) * dz
  ) / lengthSquared));
  return Math.hypot(
    point[0] - start[0] - ratio * dx,
    point[1] - start[1] - ratio * dz,
  );
}

function segmentDistance(startA, endA, startB, endB) {
  if (segmentsIntersect(startA, endA, startB, endB)) return 0;
  return Math.min(
    pointToSegmentDistance(startA, startB, endB),
    pointToSegmentDistance(endA, startB, endB),
    pointToSegmentDistance(startB, startA, endA),
    pointToSegmentDistance(endB, startA, endA),
  );
}

function polygonToPolylineDistance(polygon, polyline) {
  let distance = Number.POSITIVE_INFINITY;
  for (let polygonIndex = 0; polygonIndex < polygon.length; polygonIndex += 1) {
    const polygonStart = polygon[polygonIndex];
    const polygonEnd = polygon[(polygonIndex + 1) % polygon.length];
    for (let lineIndex = 1; lineIndex < polyline.length; lineIndex += 1) {
      distance = Math.min(distance, segmentDistance(
        polygonStart,
        polygonEnd,
        polyline[lineIndex - 1],
        polyline[lineIndex],
      ));
    }
  }
  return distance;
}

function transformedObstacle(placement, localObstacle, margin) {
  const cosine = Math.cos(placement.yaw);
  const sine = Math.sin(placement.yaw);
  const worldX = [];
  const worldZ = [];
  for (const localX of [localObstacle.minX, localObstacle.maxX]) {
    for (const sourceZ of [localObstacle.minZ, localObstacle.maxZ]) {
      const runtimeLocalZ = -sourceZ;
      worldX.push(
        placement.position[0] + placement.scale
          * (cosine * localX + sine * runtimeLocalZ),
      );
      worldZ.push(
        placement.position[1] + placement.scale
          * (-sine * localX + cosine * runtimeLocalZ),
      );
    }
  }
  return {
    minX: Math.min(...worldX) - margin,
    maxX: Math.max(...worldX) + margin,
    minZ: Math.min(...worldZ) - margin,
    maxZ: Math.max(...worldZ) + margin,
  };
}

function aabbOverlap(first, second) {
  const overlapX = Math.min(first.maxX, second.maxX)
    - Math.max(first.minX, second.minX);
  const overlapZ = Math.min(first.maxZ, second.maxZ)
    - Math.max(first.minZ, second.minZ);
  return {
    overlapX,
    overlapZ,
    intersects: overlapX >= 0 && overlapZ >= 0,
  };
}

function pointHitsObstacle(point, obstacle, radius) {
  return point[0] >= obstacle.minX - radius
    && point[0] <= obstacle.maxX + radius
    && point[1] >= obstacle.minZ - radius
    && point[1] <= obstacle.maxZ + radius;
}

async function loadInputs() {
  return Promise.all([
    readFile(
      new URL("docs/research/shanghai-cinema-map-calibration-2026-07-26.json", root),
      "utf8",
    ).then(JSON.parse),
    readFile(new URL("app/scene/xinhua-map-data.json", root), "utf8").then(JSON.parse),
    readFile(
      new URL("app/scene/xinhua-road-landmarks-data.json", root),
      "utf8",
    ).then(JSON.parse),
    readFile(
      new URL("docs/research/data/xinhua-buildings-osm-20260725-074802.json", root),
      "utf8",
    ).then(JSON.parse),
    readFile(
      new URL("docs/research/data/xinhua-roads-osm-20260716-080509.json", root),
      "utf8",
    ).then(JSON.parse),
  ]);
}

test("上海影城离新华路过远来自规则 GLB 包络与非规则 OSM 综合体绑定，不是投影错误", async () => {
  const [audit, map, landmarkData, buildings, rawRoads] = await loadInputs();
  const cinema = landmarkData.landmarks.find(({ id }) => id === audit.assetId);
  const osmCinema = buildings.elements.find(
    ({ type, id }) => type === "way" && id === audit.sources.osmBuildingWayId,
  );
  assert.ok(cinema && osmCinema?.geometry);
  assert.equal(osmCinema.tags?.["name:zh"], "上海影城");
  assert.equal(osmCinema.tags?.["addr:housenumber"], "160");
  assert.equal(
    buildings.elements.some(({ type, tags }) => type === "node" && tags?.entrance),
    false,
    "已保存 OSM 快照没有可绑定到 GLB 入口的 node",
  );

  for (const [wayId, expectedName] of [
    [audit.sources.xinhuaRoadWayId, "新华路"],
    [audit.sources.panyuRoadWayId, "番禺路"],
  ]) {
    const rawRoad = rawRoads.elements.find(
      ({ type, id }) => type === "way" && id === wayId,
    );
    assert.equal(rawRoad?.tags?.name, expectedName);
    assert.equal(rawRoad?.tags?.surface, "asphalt");
  }

  assert.deepEqual(cinema.position, audit.currentPlacement.position);
  assert.equal(cinema.yaw, audit.currentPlacement.yaw);
  assert.equal(cinema.scale, audit.currentPlacement.scale);
  assert.deepEqual(cinema.localBounds, audit.currentPlacement.localBounds);

  const osmPolygon = osmCinema.geometry.slice(0, -1).map(
    (point) => projectOsmPoint(point, map),
  );
  const centroid = polygonCentroid(osmPolygon);
  for (let axis = 0; axis < 2; axis += 1) {
    assert.ok(
      Math.abs(centroid[axis] - audit.projectionDiagnosis.osmComplexCentroid[axis]) < 1e-9,
    );
  }
  const originDistance = Math.hypot(
    cinema.position[0] - centroid[0],
    cinema.position[1] - centroid[1],
  );
  assert.ok(
    Math.abs(
      originDistance
        - audit.projectionDiagnosis.currentOriginDistanceFromCentroidSceneUnits
    ) < 1e-9,
  );
  assert.ok(originDistance * map.meta.metersPerSceneUnit < 2.3);
  assert.equal(audit.projectionDiagnosis.projectionBug, false);

  const osmLocal = osmPolygon.map((point) => sourceLocalPoint(point, cinema));
  const localEnvelope = {
    minX: Math.min(...osmLocal.map(([x]) => x)),
    maxX: Math.max(...osmLocal.map(([x]) => x)),
    minZ: Math.min(...osmLocal.map(([, z]) => z)),
    maxZ: Math.max(...osmLocal.map(([, z]) => z)),
  };
  for (const key of ["minX", "maxX", "minZ", "maxZ"]) {
    assert.ok(
      Math.abs(
        localEnvelope[key]
          - audit.footprintDiagnosis.osmComplexInCurrentAssetSourceAxes[key]
      ) < 1e-9,
    );
  }
  const xinhuaVertex = audit.footprintDiagnosis.xinhuaSide;
  assert.deepEqual(
    osmCinema.geometry[xinhuaVertex.osmNearestVertexIndex],
    {
      lat: xinhuaVertex.osmNearestVertexWgs84[1],
      lon: xinhuaVertex.osmNearestVertexWgs84[0],
    },
  );
  for (let axis = 0; axis < 2; axis += 1) {
    assert.ok(
      Math.abs(
        osmLocal[xinhuaVertex.osmNearestVertexIndex][axis]
          - xinhuaVertex.osmNearestVertexAssetSourceLocal[axis]
      ) < 1e-9,
    );
  }
  assert.ok(xinhuaVertex.missingSourceDepthSceneUnits > 9.2);
  assert.ok(xinhuaVertex.missingSourceDepthMeters > 24.9);
});

test("生产道路几何同时证明当前包络离新华路过远且过度靠近番禺路", async () => {
  const [audit, map, landmarkData, buildings] = await loadInputs();
  const cinema = landmarkData.landmarks.find(({ id }) => id === audit.assetId);
  const osmCinema = buildings.elements.find(
    ({ type, id }) => type === "way" && id === audit.sources.osmBuildingWayId,
  );
  const osmPolygon = osmCinema.geometry.slice(0, -1).map(
    (point) => projectOsmPoint(point, map),
  );
  const currentCorners = transformedCorners(cinema);

  for (const [key, wayId] of [
    ["xinhuaRoad", audit.sources.xinhuaRoadWayId],
    ["panyuRoad", audit.sources.panyuRoadWayId],
  ]) {
    const roadAudit = audit.roadAudit[key];
    const road = map.roads.find(({ osmWayId }) => osmWayId === wayId);
    assert.ok(road);
    const visibleDistance = polygonToPolylineDistance(currentCorners, road.points);
    const osmDistance = polygonToPolylineDistance(osmPolygon, road.points);
    assert.ok(
      Math.abs(visibleDistance - roadAudit.currentVisibleEnvelopeCenterlineDistance) < 1e-9,
    );
    assert.ok(
      Math.abs(
        visibleDistance - roadAudit.renderedAsphaltWidth / 2
          - roadAudit.currentVisibleEnvelopeAsphaltEdgeClearance
      ) < 1e-9,
    );
    assert.ok(
      Math.abs(
        osmDistance - roadAudit.renderedAsphaltWidth / 2
          - roadAudit.osmComplexBoundaryAsphaltEdgeClearance
      ) < 1e-9,
    );
  }
  assert.ok(audit.roadAudit.xinhuaRoad.excessiveSetbackMeters > 24.6);
  assert.ok(
    audit.roadAudit.panyuRoad.currentVisibleEnvelopeAsphaltEdgeClearance
      < audit.roadAudit.panyuRoad.minimumRequiredClearance,
  );

  const rejected = {
    ...cinema,
    position: audit.placementCandidates.rejectedPriorMinimumMove.position,
  };
  const diagnostic = {
    ...cinema,
    position: audit.placementCandidates.diagnosticRoadEquivalenceOnly.position,
  };
  for (const [placement, expected] of [
    [rejected, audit.placementCandidates.rejectedPriorMinimumMove],
    [diagnostic, audit.placementCandidates.diagnosticRoadEquivalenceOnly],
  ]) {
    const placementCorners = transformedCorners(placement);
    for (const [roadKey, wayId] of [
      ["xinhuaRoad", audit.sources.xinhuaRoadWayId],
      ["panyuRoad", audit.sources.panyuRoadWayId],
    ]) {
      const road = map.roads.find(({ osmWayId }) => osmWayId === wayId);
      const clearance = polygonToPolylineDistance(
        placementCorners,
        road.points,
      ) - audit.roadAudit[roadKey].renderedAsphaltWidth / 2;
      assert.ok(
        Math.abs(clearance - expected[`${roadKey}AsphaltEdgeClearance`]) < 1e-9,
      );
    }
  }
  assert.equal(audit.placementCandidates.exact, null);
  assert.match(audit.placementCandidates.exactStatus, /^blocked-/u);
});

test("道路等价平移不是精确候选：它偏离 OSM 质心、破坏 start 朝向并增加邻栋 AABB 冲突", async () => {
  const [audit, , landmarkData] = await loadInputs();
  const cinema = landmarkData.landmarks.find(({ id }) => id === audit.assetId);
  const diagnosticRecord = audit.placementCandidates.diagnosticRoadEquivalenceOnly;
  const diagnostic = {
    ...cinema,
    position: diagnosticRecord.position,
  };
  const centroid = audit.projectionDiagnosis.osmComplexCentroid;
  assert.ok(
    Math.abs(
      Math.hypot(
        diagnostic.position[0] - centroid[0],
        diagnostic.position[1] - centroid[1],
      ) - diagnosticRecord.originDistanceFromOsmCentroidSceneUnits
    ) < 1e-9,
  );
  const forwardLength = Math.hypot(...diagnostic.forward);
  const toCenter = [
    diagnostic.position[0] - diagnostic.start[0],
    diagnostic.position[1] - diagnostic.start[1],
  ];
  const headingError = Math.acos((
    diagnostic.forward[0] * toCenter[0]
      + diagnostic.forward[1] * toCenter[1]
  ) / (forwardLength * Math.hypot(...toCenter))) * 180 / Math.PI;
  assert.ok(
    Math.abs(headingError - diagnosticRecord.retainedStartHeadingErrorDegrees) < 1e-9,
  );

  const diagnosticObstacles = diagnostic.localObstacles.map(
    (localObstacle) => transformedObstacle(
      diagnostic,
      localObstacle,
      landmarkData.collisionMargin,
    ),
  );
  const otherObstacles = landmarkData.landmarks
    .filter(({ id }) => id !== cinema.id)
    .flatMap((landmark) => landmark.localObstacles.map((localObstacle) => ({
      assetId: landmark.id,
      bounds: transformedObstacle(
        landmark,
        localObstacle,
        landmarkData.collisionMargin,
      ),
    })));
  const overlaps = diagnosticObstacles.flatMap((obstacle) => (
    otherObstacles.filter(({ bounds }) => aabbOverlap(obstacle, bounds).intersects)
  ));
  assert.equal(overlaps.length, diagnosticRecord.runtimeAabbNeighborOverlapPairs);
  assert.deepEqual([...new Set(overlaps.map(({ assetId }) => assetId))], ["film-art-center"]);
  assert.equal(diagnosticRecord.decision, "diagnostic-only-do-not-wire");
});

test("碰撞候选沿 local X 等分右侧翼，保持实体并消除全部邻栋 world AABB 相交", async () => {
  const [audit, , landmarkData] = await loadInputs();
  const cinema = landmarkData.landmarks.find(({ id }) => id === audit.assetId);
  const candidate = audit.collisionCandidate;
  assert.deepEqual(
    cinema.localObstacles[candidate.replaceObstacleIndex],
    candidate.original,
  );
  assert.equal(candidate.splitAt, (candidate.original.minX + candidate.original.maxX) / 2);
  assert.equal(candidate.pieces[0].maxX, candidate.pieces[1].minX);
  assert.equal(candidate.pieces[0].minX, candidate.original.minX);
  assert.equal(candidate.pieces[1].maxX, candidate.original.maxX);
  assert.equal(candidate.pieces[0].minZ, candidate.original.minZ);
  assert.equal(candidate.pieces[1].maxZ, candidate.original.maxZ);
  const area = ({ minX, maxX, minZ, maxZ }) => (
    (maxX - minX) * (maxZ - minZ)
  );
  assert.ok(
    Math.abs(
      candidate.pieces.reduce((sum, piece) => sum + area(piece), 0)
        - area(candidate.original)
    ) < 1e-12,
  );

  const candidateLocalObstacles = cinema.localObstacles.flatMap(
    (localObstacle, index) => (
      index === candidate.replaceObstacleIndex ? candidate.pieces : [localObstacle]
    ),
  );
  const candidateWorldObstacles = candidateLocalObstacles.map(
    (localObstacle) => transformedObstacle(
      cinema,
      localObstacle,
      landmarkData.collisionMargin,
    ),
  );
  const otherWorldObstacles = landmarkData.landmarks
    .filter(({ id }) => id !== cinema.id)
    .flatMap((landmark) => landmark.localObstacles.map((localObstacle) => (
      transformedObstacle(
        landmark,
        localObstacle,
        landmarkData.collisionMargin,
      )
    )));
  const overlapCount = candidateWorldObstacles.reduce((sum, obstacle) => (
    sum + otherWorldObstacles.filter(
      (other) => aabbOverlap(obstacle, other).intersects,
    ).length
  ), 0);
  assert.equal(overlapCount, candidate.runtimeAabbNeighborOverlapPairsAfter);
  assert.equal(overlapCount, 0);

  const forwardLength = Math.hypot(...cinema.forward);
  const camera = [
    cinema.start[0] - cinema.forward[0] / forwardLength
      * audit.currentPlacement.cameraArmSceneUnits,
    cinema.start[1] - cinema.forward[1] / forwardLength
      * audit.currentPlacement.cameraArmSceneUnits,
  ];
  for (const obstacle of [...candidateWorldObstacles, ...otherWorldObstacles]) {
    assert.equal(pointHitsObstacle(cinema.start, obstacle, 0.48), false);
    assert.equal(pointHitsObstacle(camera, obstacle, 0.25), false);
  }
  assert.equal(candidate.positionYawScale, "unchanged");
  assert.equal(candidate.decision, "eligible-for-main-window-collision-only-review");
});
