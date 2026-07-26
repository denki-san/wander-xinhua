import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const candidate = Object.freeze({
  position: [73.61, 80.4],
  yaw: 2.761592653589793,
  scale: 1,
  start: [101, 112],
  forward: [-0.654, -0.756],
  cameraTargetHeight: 2.8,
});

function project({ lon, lat }, map) {
  const [centerLon, centerLat] = map.meta.centerWgs84;
  const metersPerLonDegree = 111_320 * Math.cos(centerLat * Math.PI / 180);
  return [
    (lon - centerLon) * metersPerLonDegree / map.meta.metersPerSceneUnit,
    -(lat - centerLat) * 110_540 / map.meta.metersPerSceneUnit,
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

function transformedCorners(landmark, placement) {
  const cosine = Math.cos(placement.yaw);
  const sine = Math.sin(placement.yaw);
  const { minX, maxX, minZ, maxZ } = landmark.localBounds;
  return [
    [minX, -minZ],
    [maxX, -minZ],
    [maxX, -maxZ],
    [minX, -maxZ],
  ].map(([localX, localZ]) => [
    placement.position[0] + placement.scale * (cosine * localX + sine * localZ),
    placement.position[1] + placement.scale * (-sine * localX + cosine * localZ),
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
  const ratio = Math.max(0, Math.min(1, (
    (point[0] - start[0]) * dx + (point[1] - start[1]) * dz
  ) / (dx * dx + dz * dz)));
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

function transformedObstacle(landmark, placement, obstacle, margin) {
  const cosine = Math.cos(placement.yaw);
  const sine = Math.sin(placement.yaw);
  const worldX = [];
  const worldZ = [];
  for (const localX of [obstacle.minX, obstacle.maxX]) {
    for (const sourceZ of [obstacle.minZ, obstacle.maxZ]) {
      const localZ = -sourceZ;
      worldX.push(placement.position[0] + placement.scale * (cosine * localX + sine * localZ));
      worldZ.push(placement.position[1] + placement.scale * (-sine * localX + cosine * localZ));
    }
  }
  return {
    minX: Math.min(...worldX) - margin,
    maxX: Math.max(...worldX) + margin,
    minZ: Math.min(...worldZ) - margin,
    maxZ: Math.max(...worldZ) + margin,
  };
}

function obstaclesOverlap(first, second) {
  return first.minX <= second.maxX && first.maxX >= second.minX
    && first.minZ <= second.maxZ && first.maxZ >= second.minZ;
}

function pointHitsObstacle(point, obstacle, radius) {
  return point[0] >= obstacle.minX - radius && point[0] <= obstacle.maxX + radius
    && point[1] >= obstacle.minZ - radius && point[1] <= obstacle.maxZ + radius;
}

test("上海影城位置候选保留为 blocked-map-position，且量化道路、相邻碰撞与起点安全", async () => {
  const [map, landmarks, buildings, roads, elevation] = await Promise.all([
    readFile(new URL("app/scene/xinhua-map-data.json", root), "utf8").then(JSON.parse),
    readFile(new URL("app/scene/xinhua-road-landmarks-data.json", root), "utf8").then(JSON.parse),
    readFile(new URL("docs/research/data/xinhua-buildings-osm-20260725-074802.json", root), "utf8").then(JSON.parse),
    readFile(new URL("docs/research/data/xinhua-roads-osm-20260716-080509.json", root), "utf8").then(JSON.parse),
    readFile(new URL("app/scene/xinhua-elevation-model.json", root), "utf8").then(JSON.parse),
  ]);
  const cinema = landmarks.landmarks.find(({ id }) => id === "shanghai-cinema");
  const osmCinema = buildings.elements.find(({ type, id }) => type === "way" && id === 292250766);
  const panyuRoad = roads.elements.find(({ type, id }) => type === "way" && id === 11960339);
  assert.ok(cinema && osmCinema?.geometry && panyuRoad?.geometry);
  assert.equal(osmCinema.tags?.["name:zh"], "上海影城");
  assert.equal(osmCinema.tags?.["addr:housenumber"], "160");
  assert.equal(panyuRoad.tags?.surface, "asphalt");

  const osmBoundary = osmCinema.geometry.slice(0, -1).map((point) => project(point, map));
  const [osmCenterX, osmCenterZ] = polygonCentroid(osmBoundary);
  assert.ok(Math.abs(osmCenterX - 74.4298520554) < 1e-6);
  assert.ok(Math.abs(osmCenterZ - 81.677068713) < 1e-6);

  const roadPoints = panyuRoad.geometry.map((point) => project(point, map));
  const asphaltHalfWidth = 1.45 * map.meta.environmentScale / 2;
  const distanceToRoad = (placement) => {
    const corners = transformedCorners(cinema, placement);
    let distance = Number.POSITIVE_INFINITY;
    for (let edge = 0; edge < corners.length; edge += 1) {
      for (let segment = 1; segment < roadPoints.length; segment += 1) {
        distance = Math.min(distance, segmentDistance(
          corners[edge], corners[(edge + 1) % corners.length],
          roadPoints[segment - 1], roadPoints[segment],
        ));
      }
    }
    return distance - asphaltHalfWidth;
  };

  const currentClearance = distanceToRoad(cinema);
  const candidateClearance = distanceToRoad(candidate);
  const osmCentroidClearance = distanceToRoad({ ...candidate, position: [osmCenterX, osmCenterZ] });
  assert.ok(currentClearance > 0 && currentClearance < 0.2);
  assert.ok(osmCentroidClearance < 0, "OSM 综合体质心不能直接用作固定 GLB 原点");
  assert.ok(candidateClearance >= 0.75, `候选柏油 edge 净距为 ${candidateClearance}`);

  const candidateObstacles = cinema.localObstacles.map((obstacle) => (
    transformedObstacle(cinema, candidate, obstacle, landmarks.collisionMargin)
  ));
  const otherObstacles = landmarks.landmarks
    .filter(({ id }) => id !== cinema.id)
    .flatMap((landmark) => (landmark.localObstacles ?? [landmark.localBounds]).map((obstacle) => (
      transformedObstacle(landmark, landmark, obstacle, landmarks.collisionMargin)
    )));
  for (const obstacle of candidateObstacles) {
    assert.equal(otherObstacles.some((other) => obstaclesOverlap(obstacle, other)), false);
  }

  const forwardLength = Math.hypot(...candidate.forward);
  const camera = [
    candidate.start[0] - candidate.forward[0] / forwardLength * 7.4,
    candidate.start[1] - candidate.forward[1] / forwardLength * 7.4,
  ];
  for (const obstacle of [...candidateObstacles, ...otherObstacles]) {
    assert.equal(pointHitsObstacle(candidate.start, obstacle, 0.48), false);
    assert.equal(pointHitsObstacle(camera, obstacle, 0.25), false);
  }

  const heading = [candidate.position[0] - candidate.start[0], candidate.position[1] - candidate.start[1]];
  const headingDegrees = Math.acos((candidate.forward[0] * heading[0] + candidate.forward[1] * heading[1])
    / (forwardLength * Math.hypot(...heading))) * 180 / Math.PI;
  assert.ok(headingDegrees < 0.6);
  assert.equal(candidate.yaw, cinema.yaw);
  assert.equal(candidate.scale, cinema.scale);
  assert.deepEqual(candidate.start, cinema.start);
  assert.deepEqual(candidate.forward, cinema.forward);
  assert.equal(candidate.cameraTargetHeight, cinema.cameraTargetHeight);

  const terrainY = elevation.model.referenceSceneHeight
    + candidate.position[0] * elevation.model.eastWestGrade
    + candidate.position[1] * elevation.model.sceneZGrade;
  assert.ok(Math.abs(terrainY - 0.9092080033) < 1e-10);
  assert.ok(Math.abs((terrainY + 0.1) - 1.0092080033) < 1e-10);
});
