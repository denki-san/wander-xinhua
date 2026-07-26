import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const candidatePath = "docs/research/xingfuli-west-collision-proxy-candidate-2026-07-26.json";
const EPSILON = 1e-8;

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(new URL(relativePath, root)))
    .digest("hex");
}

function close(actual, expected, tolerance = 1e-8) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `预期 ${expected}，实际 ${actual}`,
  );
}

function polygonSignedArea(polygon) {
  return polygon.reduce((sum, point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2;
}

function polygonArea(polygon) {
  return Math.abs(polygonSignedArea(polygon));
}

function cross(a, b, c) {
  return (
    (b[0] - a[0]) * (c[1] - a[1])
    - (b[1] - a[1]) * (c[0] - a[0])
  );
}

function pointInTriangle(point, a, b, c) {
  const first = cross(a, b, point);
  const second = cross(b, c, point);
  const third = cross(c, a, point);
  return (
    first >= -EPSILON
    && second >= -EPSILON
    && third >= -EPSILON
  );
}

function triangulate(polygon) {
  const points = polygonSignedArea(polygon) > 0
    ? polygon.map((point) => [...point])
    : polygon.toReversed().map((point) => [...point]);
  const indices = points.map((_, index) => index);
  const triangles = [];

  while (indices.length > 3) {
    let earFound = false;
    for (let cursor = 0; cursor < indices.length; cursor += 1) {
      const previousIndex = indices[(cursor - 1 + indices.length) % indices.length];
      const currentIndex = indices[cursor];
      const nextIndex = indices[(cursor + 1) % indices.length];
      const triangle = [
        points[previousIndex],
        points[currentIndex],
        points[nextIndex],
      ];
      if (cross(...triangle) <= EPSILON) continue;

      const containsOtherVertex = indices.some((index) => (
        index !== previousIndex
        && index !== currentIndex
        && index !== nextIndex
        && pointInTriangle(points[index], ...triangle)
      ));
      if (containsOtherVertex) continue;

      triangles.push(triangle);
      indices.splice(cursor, 1);
      earFound = true;
      break;
    }
    assert.equal(earFound, true, "OSM 简单多边形应可确定性耳切");
  }
  triangles.push(indices.map((index) => points[index]));
  return triangles;
}

function clipPolygon(polygon, inside, intersection) {
  const output = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    const currentInside = inside(current);
    const nextInside = inside(next);
    if (currentInside && nextInside) {
      output.push(next);
    } else if (currentInside) {
      output.push(intersection(current, next));
    } else if (nextInside) {
      output.push(intersection(current, next), next);
    }
  }
  return output;
}

function clipXMaximum(polygon, maximum) {
  return clipPolygon(
    polygon,
    ([x]) => x <= maximum,
    (start, end) => {
      const ratio = (maximum - start[0]) / (end[0] - start[0]);
      return [maximum, start[1] + ratio * (end[1] - start[1])];
    },
  );
}

function clipXMinimum(polygon, minimum) {
  return clipPolygon(
    polygon,
    ([x]) => x >= minimum,
    (start, end) => {
      const ratio = (minimum - start[0]) / (end[0] - start[0]);
      return [minimum, start[1] + ratio * (end[1] - start[1])];
    },
  );
}

function clipZMaximum(polygon, maximum) {
  return clipPolygon(
    polygon,
    ([, z]) => z <= maximum,
    (start, end) => {
      const ratio = (maximum - start[1]) / (end[1] - start[1]);
      return [start[0] + ratio * (end[0] - start[0]), maximum];
    },
  );
}

function clipZMinimum(polygon, minimum) {
  return clipPolygon(
    polygon,
    ([, z]) => z >= minimum,
    (start, end) => {
      const ratio = (minimum - start[1]) / (end[1] - start[1]);
      return [start[0] + ratio * (end[0] - start[0]), minimum];
    },
  );
}

function pointOnSegment(point, start, end) {
  return (
    Math.abs(cross(start, end, point)) <= EPSILON
    && point[0] >= Math.min(start[0], end[0]) - EPSILON
    && point[0] <= Math.max(start[0], end[0]) + EPSILON
    && point[1] >= Math.min(start[1], end[1]) - EPSILON
    && point[1] <= Math.max(start[1], end[1]) + EPSILON
  );
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index, index += 1
  ) {
    if (pointOnSegment(point, polygon[previous], polygon[index])) return true;
    const current = polygon[index];
    const prior = polygon[previous];
    if (
      (current[1] > point[1]) !== (prior[1] > point[1])
      && point[0] < (
        (prior[0] - current[0]) * (point[1] - current[1])
        / (prior[1] - current[1])
        + current[0]
      )
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function pointToSegment(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const ratio = lengthSquared === 0
    ? 0
    : Math.max(
      0,
      Math.min(
        1,
        ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz)
          / lengthSquared,
      ),
    );
  return Math.hypot(
    point[0] - start[0] - ratio * dx,
    point[1] - start[1] - ratio * dz,
  );
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

function segmentDistance(a, b, c, d) {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(
    pointToSegment(a, c, d),
    pointToSegment(b, c, d),
    pointToSegment(c, a, b),
    pointToSegment(d, a, b),
  );
}

function polygonToPolylinesDistance(polygon, roads) {
  let minimum = Infinity;
  for (const road of roads) {
    for (let roadIndex = 1; roadIndex < road.points.length; roadIndex += 1) {
      for (let edgeIndex = 0; edgeIndex < polygon.length; edgeIndex += 1) {
        minimum = Math.min(
          minimum,
          segmentDistance(
            polygon[edgeIndex],
            polygon[(edgeIndex + 1) % polygon.length],
            road.points[roadIndex - 1],
            road.points[roadIndex],
          ),
        );
      }
    }
  }
  return minimum;
}

function horizontalIntersections(polygon, z) {
  const intersections = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    if (
      (start[1] <= z && end[1] >= z)
      || (end[1] <= z && start[1] >= z)
    ) {
      if (Math.abs(start[1] - end[1]) <= EPSILON) continue;
      const ratio = (z - start[1]) / (end[1] - start[1]);
      if (ratio >= 0 && ratio <= 1) {
        intersections.push(start[0] + ratio * (end[0] - start[0]));
      }
    }
  }
  return intersections.sort((a, b) => a - b);
}

function verticalIntersections(polygon, x) {
  const intersections = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    if (
      (start[0] <= x && end[0] >= x)
      || (end[0] <= x && start[0] >= x)
    ) {
      if (Math.abs(start[0] - end[0]) <= EPSILON) continue;
      const ratio = (x - start[0]) / (end[0] - start[0]);
      if (ratio >= 0 && ratio <= 1) {
        intersections.push(start[1] + ratio * (end[1] - start[1]));
      }
    }
  }
  return intersections.sort((a, b) => a - b);
}

function projectionContext(map, rawBoundary) {
  const boundary = rawBoundary.find(
    ({ osm_id: osmId }) => osmId === map.meta.osmRelationId,
  ).boundingbox.map(Number);
  const centerLat = (boundary[0] + boundary[1]) / 2;
  const centerLon = (boundary[2] + boundary[3]) / 2;
  return {
    centerLat,
    centerLon,
    metersPerLonDegree: 111_320 * Math.cos(centerLat * Math.PI / 180),
  };
}

function projectOsmPoint(point, map, projection) {
  return [
    (point.lon - projection.centerLon)
      * projection.metersPerLonDegree
      / map.meta.metersPerSceneUnit,
    -(point.lat - projection.centerLat)
      * 110_540
      / map.meta.metersPerSceneUnit,
  ];
}

function productionTransform(map) {
  const placement = map.landmarks.xingfuli;
  const cos = Math.cos(placement.rotationY);
  const sin = Math.sin(placement.rotationY);
  return {
    cos,
    sin,
    position: [
      placement.position[0] - cos * 4.1 / 2,
      placement.position[1] + sin * 4.1 / 2,
    ],
    rotationY: placement.rotationY,
    longitudinalScale: placement.horizontalScale - 4.1 / 94,
    crossScale: placement.horizontalScale,
    localCenterZ: placement.localLaneCenterZ,
  };
}

function worldToLocal(point, transform) {
  const dx = point[0] - transform.position[0];
  const dz = point[1] - transform.position[1];
  return [
    (dx * transform.cos - dz * transform.sin) / transform.longitudinalScale,
    (dx * transform.sin + dz * transform.cos) / transform.crossScale
      + transform.localCenterZ,
  ];
}

test("west 碰撞候选只读取证据，不修改资产、变换或生产碰撞", async () => {
  const candidate = await readJson(candidatePath);

  assert.equal(candidate.assetId, "xingfuli-west");
  assert.equal(candidate.scope.mode, "collision-proxy-candidate-only");
  assert.equal(candidate.scope.heroIdentityMassingModified, false);
  assert.equal(candidate.scope.placementMovedScaledOrRotated, false);
  assert.equal(candidate.scope.publicRegistryRuntimeOrManifestModified, false);
  assert.equal(candidate.scope.productionCollisionModified, false);

  for (const input of Object.values(candidate.inputs)) {
    if (typeof input !== "object") continue;
    assert.equal(await sha256(input.path), input.sha256);
  }
});

test("三个 OSM footprint 可被十个凸三角形完整无孔洞覆盖并避开幸福路", async () => {
  const [candidate, map, rawBuildings, rawBoundary] = await Promise.all([
    readJson(candidatePath),
    readJson("app/scene/xinhua-map-data.json"),
    readJson("docs/research/data/xinhua-buildings-osm-20260725-074802.json"),
    readJson("docs/research/data/xinhua-boundary-osm-20260716-080509.json"),
  ]);
  const projection = projectionContext(map, rawBoundary);
  const transform = productionTransform(map);
  const xingfuRoads = map.roads.filter(({ osmWayId }) => osmWayId === 43763426);
  const halfRoadWidth = 3.625;
  let pieceCount = 0;

  for (const footprint of candidate.exactFootprintAttempt.sourceFootprints) {
    const way = rawBuildings.elements.find(({ id }) => id === footprint.osmId);
    assert.deepEqual(way.tags, { building: "yes" });
    const worldPolygon = way.geometry.slice(0, -1).map(
      (point) => projectOsmPoint(point, map, projection),
    );
    const localPolygon = worldPolygon.map((point) => worldToLocal(point, transform));
    localPolygon.forEach((point, index) => {
      close(point[0], footprint.localPolygon[index][0]);
      close(point[1], footprint.localPolygon[index][1]);
    });

    const triangles = triangulate(localPolygon);
    pieceCount += triangles.length;
    close(
      triangles.reduce((sum, triangle) => sum + polygonArea(triangle), 0),
      polygonArea(localPolygon),
    );
    close(polygonArea(localPolygon), footprint.areaLocal);
    close(
      polygonArea(clipXMinimum(clipXMaximum(localPolygon, -22), -47)),
      footprint.westClipAreaLocal,
    );

    const roadClearance = polygonToPolylinesDistance(
      worldPolygon,
      xingfuRoads,
    ) - halfRoadWidth;
    close(roadClearance, footprint.roadClearanceScene);
    close(
      roadClearance * map.meta.metersPerSceneUnit,
      footprint.roadClearanceMeters,
    );
    assert.ok(roadClearance > 0);
  }

  assert.equal(pieceCount, candidate.exactFootprintAttempt.convexPieceCount);
  assert.equal(candidate.exactFootprintAttempt.coverageRatio, 1);
  assert.equal(
    candidate.exactFootprintAttempt.roadGate.status,
    "pass-exact-convex-footprints-only",
  );
});

test("完整 way/864823874 会封堵 OSM 步行线与现有主路线", async () => {
  const [candidate, map, rawRoads, rawBoundary, qaPaths] = await Promise.all([
    readJson(candidatePath),
    readJson("app/scene/xinhua-map-data.json"),
    readJson("docs/research/data/xinhua-roads-osm-20260716-080509.json"),
    readJson("docs/research/data/xinhua-boundary-osm-20260716-080509.json"),
    readJson("app/scene/xingfuli-qa-paths.json"),
  ]);
  const projection = projectionContext(map, rawBoundary);
  const transform = productionTransform(map);
  const pedestrianWay = rawRoads.elements.find(({ id }) => id === 400066625);
  assert.equal(pedestrianWay.tags.highway, "pedestrian");
  assert.equal(pedestrianWay.tags.name, "幸福里");

  const pedestrianLocal = pedestrianWay.geometry
    .map((point) => projectOsmPoint(point, map, projection))
    .map((point) => worldToLocal(point, transform));
  pedestrianLocal.forEach((point, index) => {
    close(point[0], candidate.pedestrianConflict.pedestrianLocalEndpoints[index][0]);
    close(point[1], candidate.pedestrianConflict.pedestrianLocalEndpoints[index][1]);
  });

  const footprint = candidate.exactFootprintAttempt.sourceFootprints.find(
    ({ osmId }) => osmId === 864823874,
  ).localPolygon;
  const lineZ = pedestrianLocal[0][1];
  const intersections = horizontalIntersections(footprint, lineZ);
  assert.equal(intersections.length, 2);
  intersections.forEach((value, index) => {
    close(value, candidate.pedestrianConflict.footprintIntersectionLocalX[index]);
  });

  const fullLength = intersections[1] - intersections[0];
  const westLength = Math.min(-22, intersections[1])
    - Math.max(-47, intersections[0]);
  close(fullLength, candidate.pedestrianConflict.fullOverlap.local);
  close(
    fullLength * transform.longitudinalScale,
    candidate.pedestrianConflict.fullOverlap.scene,
  );
  close(westLength, candidate.pedestrianConflict.westOwnershipOverlap.local);
  close(
    westLength * transform.longitudinalScale,
    candidate.pedestrianConflict.westOwnershipOverlap.scene,
  );

  const mainRoute = qaPaths.routes.find(({ id }) => id === "west-to-east-main");
  const blockedWaypoints = mainRoute.points.filter(
    (point) => pointInPolygon(point, footprint),
  );
  assert.deepEqual(
    blockedWaypoints,
    candidate.pedestrianConflict.blockedMainRouteWaypoints,
  );
  assert.equal(
    candidate.pedestrianConflict.entranceAndMainRouteGate,
    "fail-full-footprint-is-solid-at-player-height",
  );
});

test("west-center seam 没有人物尺寸孔洞，但这不能解除入口封堵", async () => {
  const [candidate, layout] = await Promise.all([
    readJson(candidatePath),
    readJson("app/scene/xingfuli-layout.json"),
  ]);
  const seam = candidate.westCenterSeam;

  for (const footprint of candidate.exactFootprintAttempt.sourceFootprints) {
    const interval = verticalIntersections(footprint.localPolygon, seam.localX);
    assert.equal(interval.length, 2);
    interval.forEach((value, index) => {
      close(
        value,
        seam.sourceIntervalsLocalZ[String(footprint.osmId)][index],
      );
    });
  }

  const north = layout.buildings.find(({ id }) => id === "north-inner-west");
  const south = layout.buildings.find(({ id }) => id === "south-inner-west");
  const centerNorth = [
    north.z - north.depth / 2,
    north.z + north.depth / 2 + 0.28,
  ];
  const centerSouth = [
    south.z - south.depth / 2 - 0.28,
    south.z + south.depth / 2,
  ];
  assert.deepEqual(centerNorth, seam.centerNorthObstacleLocalZ);
  assert.deepEqual(centerSouth, seam.centerSouthObstacleLocalZ);
  close(
    -22 - (north.x - north.width / 2 - 0.28),
    seam.localXOverlapWithCenterObstacles,
  );
  close(
    seam.localXOverlapWithCenterObstacles
      * candidate.unchangedProductionTransform.longitudinalScale,
    seam.worldXOverlapWithCenterObstacles,
  );

  const sourceIntervals = seam.sourceIntervalsLocalZ;
  close(
    (sourceIntervals["864823873"][0] - centerNorth[1])
      * candidate.unchangedProductionTransform.crossScale,
    seam.northOuterGapWorld,
  );
  close(
    (centerNorth[0] - sourceIntervals["864823874"][1])
      * candidate.unchangedProductionTransform.crossScale,
    seam.way874ToNorthGapWorld,
  );
  close(
    Math.min(sourceIntervals["864823875"][1], centerSouth[1])
      - Math.max(sourceIntervals["864823875"][0], centerSouth[0]),
    seam.southOverlapLocal,
  );
  assert.ok(seam.northOuterGapWorld < seam.playerDiameterWorld);
  assert.ok(seam.way874ToNorthGapWorld < seam.playerDiameterWorld);
  assert.ok(seam.southOverlapLocal > 0);
  assert.equal(seam.playerSizedSeamHole, false);
  assert.equal(candidate.verdict.candidatePromotable, false);
});

test("最低人物通道仍需挖掉 west footprint 的 20.61%，所以保持 blocker", async () => {
  const candidate = await readJson(candidatePath);
  const footprint = candidate.exactFootprintAttempt.sourceFootprints.find(
    ({ osmId }) => osmId === 864823874,
  ).localPolygon;
  const west = clipXMinimum(clipXMaximum(footprint, -22), -47);
  const lineZ = candidate.pedestrianConflict.pedestrianLocalEndpoints[0][1];
  const radiusLocal = candidate.minimumWalkableCarve.playerRadiusWorld
    / candidate.unchangedProductionTransform.crossScale;
  const corridor = clipZMinimum(
    clipZMaximum(west, lineZ + radiusLocal),
    lineZ - radiusLocal,
  );

  close(radiusLocal, candidate.minimumWalkableCarve.playerRadiusLocalCross);
  close(polygonArea(west), candidate.minimumWalkableCarve.way874WestAreaLocal);
  close(
    polygonArea(corridor),
    candidate.minimumWalkableCarve.minimumCarveArea.local,
  );
  close(
    polygonArea(corridor)
      * candidate.unchangedProductionTransform.longitudinalScale
      * candidate.unchangedProductionTransform.crossScale,
    candidate.minimumWalkableCarve.minimumCarveArea.scene,
  );
  close(
    polygonArea(corridor) / polygonArea(west),
    candidate.minimumWalkableCarve.removedFractionOfWay874West,
  );
  close(
    1 - polygonArea(corridor) / polygonArea(west),
    candidate.minimumWalkableCarve.remainingCoverageRatioOfWay874West,
  );

  assert.equal(candidate.minimumWalkableCarve.fullFootprintCoveragePreserved, false);
  assert.equal(
    candidate.minimumWalkableCarve.status,
    "reject-without-ground-level-passage-evidence",
  );
  assert.equal(
    candidate.verdict.status,
    "blocked-full-coverage-conflicts-with-pedestrian-passage",
  );
  assert.equal(candidate.verdict.productionRoadBlockerRemains, true);
  assert.equal(candidate.minimumFutureRepair.length, 5);
});
