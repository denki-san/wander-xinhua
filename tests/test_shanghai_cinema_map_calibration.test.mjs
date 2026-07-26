import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath = "docs/research/shanghai-cinema-map-calibration-2026-07-26.json";
const supersessionPath =
  "docs/research/shanghai-cinema-film-neighbor-supersession-2026-07-26.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

async function glbBounds(path) {
  const buffer = await readFile(new URL(path, root));
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  const gltf = JSON.parse(
    buffer.toString("utf8", 20, 20 + jsonLength).trim(),
  );
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const accessor = gltf.accessors[primitive.attributes.POSITION];
      for (let axis = 0; axis < 3; axis += 1) {
        bounds.min[axis] = Math.min(bounds.min[axis], accessor.min[axis]);
        bounds.max[axis] = Math.max(bounds.max[axis], accessor.max[axis]);
      }
    }
  }
  return bounds;
}

function projectOsmPoint(point, mapData) {
  const [centerLon, centerLat] = mapData.meta.centerWgs84;
  return [
    (point.lon - centerLon)
      * 111_320 * Math.cos(centerLat * Math.PI / 180)
      / mapData.meta.metersPerSceneUnit,
    -(point.lat - centerLat)
      * 110_540 / mapData.meta.metersPerSceneUnit,
  ];
}

function polygonCentroid(points) {
  let twiceArea = 0;
  let x = 0;
  let z = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [startX, startZ] = points[index];
    const [endX, endZ] = points[(index + 1) % points.length];
    const cross = startX * endZ - endX * startZ;
    twiceArea += cross;
    x += (startX + endX) * cross;
    z += (startZ + endZ) * cross;
  }
  return [x / (3 * twiceArea), z / (3 * twiceArea)];
}

function localizeWorldPoint([worldX, worldZ], landmark) {
  const dx = worldX - landmark.position[0];
  const dz = worldZ - landmark.position[1];
  const cosine = Math.cos(landmark.yaw);
  const sine = Math.sin(landmark.yaw);
  return [
    cosine * dx - sine * dz,
    -(sine * dx + cosine * dz),
  ];
}

function transformedCorners(landmark, bounds = landmark.localBounds) {
  const cosine = Math.cos(landmark.yaw);
  const sine = Math.sin(landmark.yaw);
  return [
    [bounds.minX, -bounds.minZ],
    [bounds.maxX, -bounds.minZ],
    [bounds.maxX, -bounds.maxZ],
    [bounds.minX, -bounds.maxZ],
  ].map(([localX, localZ]) => [
    landmark.position[0]
      + landmark.scale * (cosine * localX + sine * localZ),
    landmark.position[1]
      + landmark.scale * (-sine * localX + cosine * localZ),
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

function pointToSegmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(
    1,
    ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz)
      / lengthSquared,
  ));
  return Math.hypot(
    point[0] - start[0] - ratio * dx,
    point[1] - start[1] - ratio * dz,
  );
}

function segmentsIntersect(startA, endA, startB, endB) {
  const aStart = orientation(startA, endA, startB);
  const aEnd = orientation(startA, endA, endB);
  const bStart = orientation(startB, endB, startA);
  const bEnd = orientation(startB, endB, endA);
  return aStart * aEnd < 0 && bStart * bEnd < 0
    || pointOnSegment(startB, startA, endA)
    || pointOnSegment(endB, startA, endA)
    || pointOnSegment(startA, startB, endB)
    || pointOnSegment(endA, startB, endB);
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
  let distance = Infinity;
  for (let edge = 0; edge < polygon.length; edge += 1) {
    for (let segment = 1; segment < polyline.length; segment += 1) {
      distance = Math.min(distance, segmentDistance(
        polygon[edge],
        polygon[(edge + 1) % polygon.length],
        polyline[segment - 1],
        polyline[segment],
      ));
    }
  }
  return distance;
}

function transformedAabb(landmark, obstacle, margin) {
  const corners = transformedCorners(landmark, obstacle);
  return {
    minX: Math.min(...corners.map(([x]) => x)) - margin,
    maxX: Math.max(...corners.map(([x]) => x)) + margin,
    minZ: Math.min(...corners.map(([, z]) => z)) - margin,
    maxZ: Math.max(...corners.map(([, z]) => z)) + margin,
  };
}

function aabbOverlap(first, second) {
  const x = Math.min(first.maxX, second.maxX)
    - Math.max(first.minX, second.minX);
  const z = Math.min(first.maxZ, second.maxZ)
    - Math.max(first.minZ, second.minZ);
  return {
    intersects: x >= 0 && z >= 0,
    x,
    z,
    area: Math.max(0, x) * Math.max(0, z),
  };
}

function orientedOverlap(
  referenceLandmark,
  otherLandmark,
  referenceBounds,
  otherBounds,
  perAssetMargin,
) {
  assert.equal(referenceLandmark.yaw, otherLandmark.yaw);
  const cosine = Math.cos(referenceLandmark.yaw);
  const sine = Math.sin(referenceLandmark.yaw);
  const dx = otherLandmark.position[0] - referenceLandmark.position[0];
  const dz = otherLandmark.position[1] - referenceLandmark.position[1];
  const offsetX = cosine * dx - sine * dz;
  const offsetZ = -sine * dx - cosine * dz;
  const otherInReference = {
    minX: offsetX + otherBounds.minX - perAssetMargin,
    maxX: offsetX + otherBounds.maxX + perAssetMargin,
    minZ: offsetZ + otherBounds.minZ - perAssetMargin,
    maxZ: offsetZ + otherBounds.maxZ + perAssetMargin,
  };
  const x = Math.min(
    referenceBounds.maxX + perAssetMargin,
    otherInReference.maxX,
  ) - Math.max(
    referenceBounds.minX - perAssetMargin,
    otherInReference.minX,
  );
  const z = Math.min(
    referenceBounds.maxZ + perAssetMargin,
    otherInReference.maxZ,
  ) - Math.max(
    referenceBounds.minZ - perAssetMargin,
    otherInReference.minZ,
  );
  return {
    intersects: x >= 0 && z >= 0,
    x,
    z,
    area: Math.max(0, x) * Math.max(0, z),
  };
}

function pointHitsAabb(point, bounds, radius) {
  return point[0] >= bounds.minX - radius
    && point[0] <= bounds.maxX + radius
    && point[1] >= bounds.minZ - radius
    && point[1] <= bounds.maxZ + radius;
}

test("上海影城地图偏差来自规则 GLB 包络绑定，不是 WGS84 投影或质心错误", async () => {
  const [record, mapData, landmarkData, buildings, roads] = await Promise.all([
    readJson(recordPath),
    readJson("app/scene/xinhua-map-data.json"),
    readJson("app/scene/xinhua-road-landmarks-data.json"),
    readJson("docs/research/data/xinhua-buildings-osm-20260725-074802.json"),
    readJson("docs/research/data/xinhua-roads-osm-20260716-080509.json"),
  ]);
  const cinema = landmarkData.landmarks.find(({ id }) => id === "shanghai-cinema");
  const osmCinema = buildings.elements.find(({ type, id }) => (
    type === "way" && id === record.sources.osmBuildingWayId
  ));
  assert.ok(cinema && osmCinema?.geometry);
  assert.equal(osmCinema.tags?.["name:zh"], "上海影城");
  assert.equal(record.verdict.mapPlacement, "blocked-exact-subject-anchor");
  assert.equal(record.verdict.publicWiringAuthorized, false);
  assert.deepEqual(cinema.position, record.currentPlacement.position);
  assert.equal(cinema.yaw, record.currentPlacement.yaw);
  assert.equal(cinema.scale, record.currentPlacement.scale);

  for (const [wayId, name] of [
    [record.sources.xinhuaRoadWayId, "新华路"],
    [record.sources.panyuRoadWayId, "番禺路"],
  ]) {
    const rawRoad = roads.elements.find(({ type, id }) => (
      type === "way" && id === wayId
    ));
    assert.equal(rawRoad?.tags?.name, name);
    assert.equal(rawRoad?.tags?.surface, "asphalt");
  }

  const osmPolygon = osmCinema.geometry.slice(0, -1).map(
    (point) => projectOsmPoint(point, mapData),
  );
  const centroid = polygonCentroid(osmPolygon);
  assert.ok(Math.abs(
    centroid[0] - record.projectionDiagnosis.osmComplexCentroid[0],
  ) < 1e-9);
  assert.ok(Math.abs(
    centroid[1] - record.projectionDiagnosis.osmComplexCentroid[1],
  ) < 1e-9);
  assert.ok(Math.abs(
    Math.hypot(
      cinema.position[0] - centroid[0],
      cinema.position[1] - centroid[1],
    ) - record.projectionDiagnosis.currentOriginDistanceFromCentroidSceneUnits,
  ) < 1e-9);

  const osmLocal = osmPolygon.map((point) => localizeWorldPoint(point, cinema));
  const localBounds = {
    minX: Math.min(...osmLocal.map(([x]) => x)),
    maxX: Math.max(...osmLocal.map(([x]) => x)),
    minZ: Math.min(...osmLocal.map(([, z]) => z)),
    maxZ: Math.max(...osmLocal.map(([, z]) => z)),
  };
  for (const key of ["minX", "maxX", "minZ", "maxZ"]) {
    assert.ok(Math.abs(
      localBounds[key]
        - record.footprintDiagnosis.osmComplexInCurrentAssetSourceAxes[key],
    ) < 1e-9);
  }
  assert.ok(
    record.footprintDiagnosis.xinhuaSide.missingSourceDepthSceneUnits > 9,
  );

  for (const tier of ["hero", "identity", "massing"]) {
    const expected = record.footprintDiagnosis.exactBinaryEnvelopes[tier];
    assert.equal(await sha256(expected.path), expected.sha256);
    assert.deepEqual(await glbBounds(expected.path), {
      min: expected.min,
      max: expected.max,
    });
  }

  const visiblePolygon = transformedCorners(cinema);
  for (const key of ["xinhuaRoad", "panyuRoad"]) {
    const audit = record.roadAudit[key];
    const road = mapData.roads.find(({ osmWayId }) => (
      osmWayId === record.sources[
        key === "xinhuaRoad" ? "xinhuaRoadWayId" : "panyuRoadWayId"
      ]
    ));
    assert.ok(road);
    const visibleDistance = polygonToPolylineDistance(
      visiblePolygon,
      road.points,
    );
    const osmDistance = polygonToPolylineDistance(osmPolygon, road.points);
    assert.ok(Math.abs(
      visibleDistance - audit.currentVisibleEnvelopeCenterlineDistance,
    ) < 1e-9);
    assert.ok(Math.abs(
      visibleDistance - audit.renderedAsphaltWidth / 2
        - audit.currentVisibleEnvelopeAsphaltEdgeClearance,
    ) < 1e-9);
    if (key === "xinhuaRoad") {
      assert.ok(Math.abs(
        osmDistance - audit.renderedAsphaltWidth / 2
          - audit.osmComplexBoundaryAsphaltEdgeClearance,
      ) < 1e-9);
    }
  }
  assert.ok(record.roadAudit.xinhuaRoad.excessiveSetbackSceneUnits > 9);
  assert.ok(
    record.roadAudit.panyuRoad.currentVisibleEnvelopeAsphaltEdgeClearance
      < record.roadAudit.panyuRoad.minimumRequiredClearance,
  );
});

test("道路距离等价位置是历史数值反例，不是可接线 placement", async () => {
  const [record, mapData, landmarkData, supersession] = await Promise.all([
    readJson(recordPath),
    readJson("app/scene/xinhua-map-data.json"),
    readJson("app/scene/xinhua-road-landmarks-data.json"),
    readJson(supersessionPath),
  ]);
  const cinema = landmarkData.landmarks.find(({ id }) => id === "shanghai-cinema");
  const film = supersession.historicalAudit.filmArtCenter;
  const diagnostic = record.placementCandidates.diagnosticRoadEquivalenceOnly;
  const candidate = { ...cinema, position: diagnostic.position };

  for (const key of ["xinhuaRoad", "panyuRoad"]) {
    const road = mapData.roads.find(({ osmWayId }) => (
      osmWayId === record.sources[
        key === "xinhuaRoad" ? "xinhuaRoadWayId" : "panyuRoadWayId"
      ]
    ));
    const clearance = polygonToPolylineDistance(
      transformedCorners(candidate),
      road.points,
    ) - record.roadAudit[key].renderedAsphaltWidth / 2;
    assert.ok(Math.abs(
      clearance - diagnostic[`${key}AsphaltEdgeClearance`],
    ) < 1e-9);
    assert.ok(Math.abs(
      clearance - record.roadAudit[key].osmComplexBoundaryAsphaltEdgeClearance,
    ) < 1e-9);
  }

  const retainedForwardLength = Math.hypot(...candidate.forward);
  const centerHeading = [
    candidate.position[0] - candidate.start[0],
    candidate.position[1] - candidate.start[1],
  ];
  const headingError = Math.acos(
    (
      candidate.forward[0] * centerHeading[0]
      + candidate.forward[1] * centerHeading[1]
    ) / (retainedForwardLength * Math.hypot(...centerHeading)),
  ) * 180 / Math.PI;
  assert.ok(Math.abs(
    headingError - diagnostic.retainedStartHeadingErrorDegrees,
  ) < 1e-9);

  const overlap = orientedOverlap(
    candidate,
    film,
    candidate.localObstacles[
      diagnostic.orientedSolidOverlap.shanghaiCinemaObstacleIndex
    ],
    film.localObstacles[
      diagnostic.orientedSolidOverlap.filmArtCenterObstacleIndex
    ],
    landmarkData.collisionMargin,
  );
  assert.equal(overlap.intersects, true);
  assert.ok(Math.abs(
    overlap.area - diagnostic.orientedSolidOverlap.area,
  ) < 1e-9);
  assert.equal(diagnostic.decision, "diagnostic-only-do-not-wire");
  assert.equal(record.placementCandidates.exact, null);
});

test("碰撞候选保留旧 Film 快照并识别当前邻栋冲突已消除", async () => {
  const [record, landmarkData, supersession] = await Promise.all([
    readJson(recordPath),
    readJson("app/scene/xinhua-road-landmarks-data.json"),
    readJson(supersessionPath),
  ]);
  const cinema = landmarkData.landmarks.find(({ id }) => id === "shanghai-cinema");
  const currentFilm = landmarkData.landmarks.find(
    ({ id }) => id === "film-art-center",
  );
  const film = supersession.historicalAudit.filmArtCenter;
  const margin = landmarkData.collisionMargin;
  const collision = record.collisionCandidate;
  const original = cinema.localObstacles[collision.replaceObstacleIndex];

  assert.deepEqual(original, collision.original);
  assert.equal(collision.pieces[0].minX, original.minX);
  assert.equal(collision.pieces[0].maxX, collision.pieces[1].minX);
  assert.equal(collision.pieces[1].maxX, original.maxX);
  for (const piece of collision.pieces) {
    assert.equal(piece.minZ, original.minZ);
    assert.equal(piece.maxZ, original.maxZ);
  }
  const area = ({ minX, maxX, minZ, maxZ }) => (
    (maxX - minX) * (maxZ - minZ)
  );
  assert.ok(Math.abs(
    area(original) - collision.pieces.reduce(
      (total, piece) => total + area(piece),
      0,
    ),
  ) < 1e-12);

  const currentPair = aabbOverlap(
    transformedAabb(cinema, original, margin),
    transformedAabb(
      film,
      film.localObstacles[
        record.collisionAudit.currentRuntimeAabbOverlap
          .filmArtCenterObstacleIndex
      ],
      margin,
    ),
  );
  assert.equal(currentPair.intersects, true);
  assert.ok(Math.abs(
    currentPair.area - record.collisionAudit.currentRuntimeAabbOverlap.area,
  ) < 1e-9);
  const supersededPair = aabbOverlap(
    transformedAabb(cinema, original, margin),
    transformedAabb(
      currentFilm,
      currentFilm.localObstacles[0],
      margin,
    ),
  );
  assert.equal(supersededPair.intersects, false);
  assert.equal(supersession.currentRegistry.runtimeAabbOverlapPairs, 0);

  const orientedPair = orientedOverlap(
    cinema,
    film,
    original,
    film.localObstacles[
      record.collisionAudit.currentRuntimeAabbOverlap
        .filmArtCenterObstacleIndex
    ],
    margin,
  );
  assert.equal(orientedPair.intersects, false);

  const candidateObstacles = cinema.localObstacles.flatMap(
    (obstacle, index) => (
      index === collision.replaceObstacleIndex ? collision.pieces : [obstacle]
    ),
  );
  const historicalLandmarks = landmarkData.landmarks.map((landmark) => (
    landmark.id === film.id ? film : landmark
  ));
  const otherAabbs = historicalLandmarks
    .filter(({ id }) => id !== cinema.id)
    .flatMap((landmark) => (
      (landmark.localObstacles ?? [landmark.localBounds]).map(
        (obstacle) => transformedAabb(landmark, obstacle, margin),
      )
    ));
  const candidateAabbs = candidateObstacles.map(
    (obstacle) => transformedAabb(cinema, obstacle, margin),
  );
  let overlapPairs = 0;
  for (const candidateAabb of candidateAabbs) {
    for (const otherAabb of otherAabbs) {
      if (aabbOverlap(candidateAabb, otherAabb).intersects) overlapPairs += 1;
    }
  }
  assert.equal(overlapPairs, collision.runtimeAabbNeighborOverlapPairsAfter);

  const forwardLength = Math.hypot(...cinema.forward);
  const camera = [
    cinema.start[0] - cinema.forward[0] / forwardLength * 7.4,
    cinema.start[1] - cinema.forward[1] / forwardLength * 7.4,
  ];
  for (const bounds of [...candidateAabbs, ...otherAabbs]) {
    assert.equal(pointHitsAabb(cinema.start, bounds, 0.48), false);
    assert.equal(pointHitsAabb(camera, bounds, 0.25), false);
  }
  assert.equal(collision.decision, "eligible-for-main-window-collision-only-review");
  assert.equal(record.minimumEvidenceGap.osmEntranceNode, "absent-in-saved-snapshot");
  assert.equal(record.recoveryEvidence.addsGeoreferencedSubjectAnchor, false);
});
