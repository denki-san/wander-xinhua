import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import {
  XINGFULI_OBSTACLES,
} from "../app/scene/xingfuli-collision.ts";
import {
  isPlanarPositionBlockedInPolygon,
  resolvePlanarSpringArm,
  transformMapObstacle,
  transformMapPoint,
} from "../app/scene/world-math.ts";

const root = new URL("../", import.meta.url);
const auditPath = "docs/research/xingfuli-west-fast-audit.json";
const referencePath = "docs/research/xingfuli-west-reference-manifest.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(new URL(relativePath, root)))
    .digest("hex");
}

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
}

function countTriangles(data) {
  return (data.meshes ?? []).reduce((meshTotal, mesh) => (
    meshTotal + mesh.primitives.reduce((primitiveTotal, primitive) => {
      const accessor = primitive.indices === undefined
        ? data.accessors[primitive.attributes.POSITION]
        : data.accessors[primitive.indices];
      return primitiveTotal + accessor.count / 3;
    }, 0)
  ), 0);
}

function mergedBounds(data) {
  const result = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  for (const mesh of data.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      const accessor = data.accessors[primitive.attributes.POSITION];
      for (let axis = 0; axis < 3; axis += 1) {
        result.min[axis] = Math.min(result.min[axis], accessor.min[axis]);
        result.max[axis] = Math.max(result.max[axis], accessor.max[axis]);
      }
    }
  }
  return result;
}

function imageDimensions(bytes) {
  assert.equal(bytes[0], 0xff);
  assert.equal(bytes[1], 0xd8);
  const startOfFrame = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  for (let offset = 2; offset < bytes.length - 8;) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = bytes.readUInt16BE(offset + 2);
    if (startOfFrame.has(marker)) {
      return [
        bytes.readUInt16BE(offset + 7),
        bytes.readUInt16BE(offset + 5),
      ];
    }
    offset += 2 + length;
  }
  assert.fail("西端入口证据不是可识别的 JPEG");
}

function close(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `预期 ${expected}，实际 ${actual}`,
  );
}

function closePoint(actual, expected, tolerance = 1e-9) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => close(value, expected[index], tolerance));
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

function pointToObstacleDistance(point, obstacle) {
  return Math.hypot(
    Math.max(obstacle.minX - point[0], 0, point[0] - obstacle.maxX),
    Math.max(obstacle.minZ - point[1], 0, point[1] - obstacle.maxZ),
  );
}

function westProductionTransform(map) {
  const placement = map.landmarks.xingfuli;
  const axisX = [
    Math.cos(placement.rotationY),
    -Math.sin(placement.rotationY),
  ];
  const position = [
    placement.position[0] - axisX[0] * 4.1 / 2,
    placement.position[1] - axisX[1] * 4.1 / 2,
  ];
  return {
    placement,
    axisX,
    position,
    longitudinalScale: placement.horizontalScale - 4.1 / 94,
  };
}

function transformPoint(localPoint, production) {
  return transformMapPoint(
    localPoint[0],
    localPoint[1],
    production.position,
    production.placement.rotationY,
    production.placement.horizontalScale,
    production.placement.localLaneCenterZ,
    production.longitudinalScale,
  );
}

function transformLocalObstacle(localObstacle, production) {
  return [
    [localObstacle.minX, localObstacle.minZ],
    [localObstacle.maxX, localObstacle.minZ],
    [localObstacle.maxX, localObstacle.maxZ],
    [localObstacle.minX, localObstacle.maxZ],
  ].map((point) => transformPoint(point, production));
}

function projectOsmPoint(point, boundaryBox, metersPerSceneUnit) {
  const [south, north, west, east] = boundaryBox.map(Number);
  const centerLat = (south + north) / 2;
  const centerLon = (west + east) / 2;
  const metersPerLonDegree = 111_320 * Math.cos(centerLat * Math.PI / 180);
  return [
    (point.lon - centerLon) * metersPerLonDegree / metersPerSceneUnit,
    -(point.lat - centerLat) * 110_540 / metersPerSceneUnit,
  ];
}

test("Xingfuli West 三档 GLB、Blend 与历史 build record 保持锁定", async () => {
  const audit = await readJson(auditPath);
  const sourcePaths = {
    generator: "scripts/create_xingfuli_models.py",
    brief: "docs/research/xingfuli-model-brief.md",
    referenceManifest: "docs/research/xingfuli-reference-manifest.json",
    heroBuildRecord: "docs/research/build-records/xingfuli.json",
    identityBuildRecord: "docs/research/build-records/xingfuli-identity.json",
    massingBuildRecord: "docs/research/build-records/xingfuli-massing.json",
  };

  assert.equal(audit.assetId, "xingfuli-west");
  assert.equal(audit.scope.existingAcceptedTiersRebuilt, false);
  assert.equal(audit.lineage.recoveryCommit, "3044cd89f801250afcd477dfbcbc7da358bf4b11");
  assert.equal(audit.lineage.gitBlobEquality.length, 12);
  assert.match(audit.lineage.status, /^pass-/);

  for (const [key, relativePath] of Object.entries(sourcePaths)) {
    assert.equal(await sha256(relativePath), audit.lineage.sourceSha256[key]);
  }

  for (const [tierName, tier] of Object.entries(audit.tiers)) {
    const buffer = await readFile(new URL(tier.glb, root));
    const data = parseGlb(buffer);
    const buildRecord = await readJson(tier.buildRecord);
    const buildOutput = buildRecord.outputs.segments.find(({ id }) => id === "west");

    assert.equal(await sha256(tier.glb), tier.glbSha256);
    assert.equal(await sha256(tier.blend), tier.blendSha256);
    assert.ok((await stat(new URL(tier.blend, root))).size > 0);
    assert.equal(buffer.length, tier.bytes);
    assert.equal(data.nodes?.length ?? 0, tier.nodes);
    assert.equal(data.meshes?.length ?? 0, tier.meshes);
    assert.equal(countTriangles(data), tier.triangles);
    assert.equal(data.materials?.length ?? 0, tier.materials);
    assert.equal(data.images?.length ?? 0, 0);
    assert.equal(data.textures?.length ?? 0, 0);
    assert.deepEqual(mergedBounds(data), tier.bounds);
    assert.equal(data.nodes[0].extras.asset, "xingfuli");
    assert.equal(data.nodes[0].extras.segment, "west");
    assert.equal(data.nodes[0].extras.stage, tier.stage);
    assert.equal(data.nodes[0].extras.reference_photos_embedded, false);
    assert.equal(data.nodes[0].matrix, undefined);
    assert.equal(data.nodes[0].translation, undefined);
    assert.equal(data.nodes[0].rotation, undefined);
    assert.equal(data.nodes[0].scale, undefined);
    assert.equal(buildOutput.sha256, tier.glbSha256);
    assert.equal(buildOutput.glb, tier.glb);
    assert.equal(buildOutput.blend, tier.blend);
    assert.equal(tierName === "hero", tier.stage === "final");
  }
});

test("Xingfuli West 幸福路入口三视角证据可追溯且不授权重建", async () => {
  const manifest = await readJson(referencePath);
  assert.equal(manifest.assetId, "xingfuli-west");
  assert.equal(manifest.inherits, "docs/research/xingfuli-reference-manifest.json");
  assert.equal(manifest.references.length, 3);
  assert.equal(manifest.coverageMatrix.every(({ status }) => status === "covered"), true);
  assert.equal(manifest.policy.rawImagesPreservedReadOnly, true);
  assert.equal(manifest.policy.embeddedInGlb, false);
  assert.equal(manifest.policy.authorizesTierRebuild, false);
  for (const reference of manifest.references) {
    const bytes = await readFile(new URL(reference.path, root));
    assert.equal(await sha256(reference.path), reference.sha256);
    assert.equal(bytes.length, reference.bytes);
    assert.deepEqual(imageDimensions(bytes), reference.dimensions);
    assert.equal(reference.usage, "research-only");
  }
});

test("Xingfuli OSM 长轴与生产变换可从原始快照确定性复算", async () => {
  const [audit, map, rawRoads, rawBoundary] = await Promise.all([
    readJson(auditPath),
    readJson("app/scene/xinhua-map-data.json"),
    readJson("docs/research/data/xinhua-roads-osm-20260716-080509.json"),
    readJson("docs/research/data/xinhua-boundary-osm-20260716-080509.json"),
  ]);
  const way = rawRoads.elements.find(({ id }) => id === 400066625);
  const boundary = rawBoundary.find(({ osm_id }) => osm_id === map.meta.osmRelationId);
  const projected = way.geometry.map((point) => projectOsmPoint(
    point,
    boundary.boundingbox,
    map.meta.metersPerSceneUnit,
  ));
  const directionDelta = [
    projected[1][0] - projected[0][0],
    projected[1][1] - projected[0][1],
  ];
  const lengthScene = Math.hypot(...directionDelta);
  const direction = directionDelta.map((value) => value / lengthScene);
  const midpoint = [
    (projected[0][0] + projected[1][0]) / 2,
    (projected[0][1] + projected[1][1]) / 2,
  ];
  const production = westProductionTransform(map);

  assert.equal(await sha256(audit.mapCalibration.sources.roads.path), audit.mapCalibration.sources.roads.sha256);
  assert.equal(await sha256(audit.mapCalibration.sources.boundary.path), audit.mapCalibration.sources.boundary.sha256);
  assert.equal(await sha256(audit.mapCalibration.sources.buildings.path), audit.mapCalibration.sources.buildings.sha256);
  assert.equal(rawRoads.osm3s.timestamp_osm_base, audit.mapCalibration.sources.roads.timestampOsmBase);
  closePoint(projected[0], audit.mapCalibration.projection.projectedEndpoints[0]);
  closePoint(projected[1], audit.mapCalibration.projection.projectedEndpoints[1]);
  closePoint(midpoint, audit.mapCalibration.projection.recomputedMidpoint);
  closePoint(direction, audit.mapCalibration.projection.recomputedDirection);
  close(-Math.atan2(direction[1], direction[0]), audit.mapCalibration.projection.recomputedRotationY);
  close(lengthScene, audit.mapCalibration.projection.recomputedLengthScene);
  close(lengthScene * map.meta.metersPerSceneUnit, audit.mapCalibration.projection.recomputedLengthMeters);
  close(lengthScene / 94, audit.mapCalibration.projection.recomputedHorizontalScale);
  closePoint(production.position, audit.mapCalibration.productionTransform.position);
  close(production.longitudinalScale, audit.mapCalibration.productionTransform.longitudinalScale);
  closePoint(
    transformPoint([-47, map.landmarks.xingfuli.localLaneCenterZ], production),
    audit.mapCalibration.productionTransform.xingfuEndpointWorld,
  );
  closePoint(
    transformPoint([47, map.landmarks.xingfuli.localLaneCenterZ], production),
    audit.mapCalibration.productionTransform.panyuEndpointWorldAfterClearance,
  );
});

test("Xingfuli West 当前矩形碰撞压入幸福路，而 OSM 临街轮廓保持正净距", async () => {
  const [audit, map, layout, rawBuildings, rawBoundary] = await Promise.all([
    readJson(auditPath),
    readJson("app/scene/xinhua-map-data.json"),
    readJson("app/scene/xingfuli-layout.json"),
    readJson("docs/research/data/xinhua-buildings-osm-20260725-074802.json"),
    readJson("docs/research/data/xinhua-boundary-osm-20260716-080509.json"),
  ]);
  const production = westProductionTransform(map);
  const xingfuRoads = map.roads.filter(({ osmWayId }) => osmWayId === 43763426);
  const halfRoadWidth = audit.roadGate.road.runtimeHalfWidthScene;
  const westBuildings = layout.buildings.filter(({ id }) => (
    id === "north-west" || id === "south-west"
  ));

  for (const building of westBuildings) {
    const localObstacle = {
      minX: building.x - building.width / 2 - 0.28,
      maxX: building.x + building.width / 2 + 0.28,
      minZ: building.side === "north"
        ? building.z - building.depth / 2
        : building.z - building.depth / 2 - 0.28,
      maxZ: building.side === "south"
        ? building.z + building.depth / 2
        : building.z + building.depth / 2 + 0.28,
    };
    const expected = audit.roadGate.currentAuthoredCollisionFootprints.find(
      ({ buildingId }) => buildingId === building.id,
    );
    const centerlineDistance = polygonToPolylinesDistance(
      transformLocalObstacle(localObstacle, production),
      xingfuRoads,
    );
    close(centerlineDistance, expected.roadCenterlineDistanceScene);
    close(centerlineDistance - halfRoadWidth, expected.asphaltEdgeClearanceScene);
    assert.ok(expected.asphaltEdgeClearanceScene < 0);
  }

  const boundaryBox = rawBoundary.find(
    ({ osm_id }) => osm_id === map.meta.osmRelationId,
  ).boundingbox;
  for (const comparison of audit.roadGate.sourceOsmComparison) {
    const osmId = Number(comparison.assetId.split("/")[1]);
    const way = rawBuildings.elements.find(({ id }) => id === osmId);
    const polygon = way.geometry.slice(0, -1).map((point) => projectOsmPoint(
      point,
      boundaryBox,
      map.meta.metersPerSceneUnit,
    ));
    const centerlineDistance = polygonToPolylinesDistance(polygon, xingfuRoads);
    close(centerlineDistance, comparison.roadCenterlineDistanceScene);
    close(centerlineDistance - halfRoadWidth, comparison.asphaltEdgeClearanceScene);
    assert.ok(comparison.asphaltEdgeClearanceScene > 0);
  }

  assert.equal(audit.roadGate.status, "blocked-current-authored-west-footprints-overlap-xingfu-road");
  assert.equal(audit.roadGate.verdict.mapGatePass, false);
  assert.equal(audit.roadGate.verdict.globalTranslationAuthorized, false);
  assert.equal(audit.roadGate.verdict.uniformOrNonUniformScaleHackAuthorized, false);
  assert.equal(audit.gates.threeJsRuntimeCollection, "blocked-until-map-road-fix");
});

test("Xingfuli West 邻栋结构不相交，产品起点、canonical 与初始相机保持净空", async () => {
  const [audit, map, layout, massingRecord, identityRecord, heroRecord] = await Promise.all([
    readJson(auditPath),
    readJson("app/scene/xinhua-map-data.json"),
    readJson("app/scene/xingfuli-layout.json"),
    readJson("docs/research/build-records/xingfuli-massing.json"),
    readJson("docs/research/build-records/xingfuli-identity.json"),
    readJson("docs/research/build-records/xingfuli.json"),
  ]);
  const production = westProductionTransform(map);
  for (const pair of audit.segmentAndNeighborCollision.neighborPairs) {
    const west = layout.buildings.find(({ id }) => id === pair.west);
    const center = layout.buildings.find(({ id }) => id === pair.center);
    const westMaxX = west.x + west.width / 2 + 0.28;
    const centerMinX = center.x - center.width / 2 - 0.28;
    close(centerMinX - westMaxX, pair.localStructuralGap);
    close(
      (centerMinX - westMaxX) * production.longitudinalScale,
      pair.worldStructuralGap,
    );
    assert.ok(pair.worldStructuralGap > 0);
    assert.ok(pair.worldStructuralGap < audit.segmentAndNeighborCollision.playerDiameterWorld);
  }

  for (const record of [massingRecord, identityRecord, heroRecord]) {
    const bounds = record.metrics.boundsBySegment;
    close(
      (bounds.west.max[0] - bounds.center.min[0]) * production.longitudinalScale,
      audit.segmentAndNeighborCollision.glbBoundsOverlapExplanation.westCenterOverlapWorld,
    );
  }

  const worldObstacles = XINGFULI_OBSTACLES.map((obstacle) => transformMapObstacle(
    obstacle,
    production.position,
    production.placement.rotationY,
    production.placement.horizontalScale,
    production.placement.localLaneCenterZ,
    production.longitudinalScale,
  ));
  for (const start of [
    audit.startAndCamera.productStart,
    audit.startAndCamera.fastQaStart,
  ]) {
    const world = transformPoint(start.local, production);
    closePoint(world, start.world);
    assert.equal(isPlanarPositionBlockedInPolygon(
      world[0],
      world[1],
      map.boundary,
      worldObstacles,
      audit.startAndCamera.playerRadiusWorld,
    ), false);
    const nearestDistance = Math.min(
      ...worldObstacles.map((obstacle) => pointToObstacleDistance(world, obstacle)),
    );
    close(nearestDistance, start.nearestObstacleDistanceScene);
    close(
      nearestDistance - audit.startAndCamera.playerRadiusWorld,
      start.clearanceAfterPlayerRadiusScene,
    );
  }

  const productStart = audit.startAndCamera.productStart.world;
  const forward = production.axisX;
  const cameraRight = [-forward[1], forward[0]];
  const detailScale = 1.65;
  const cameraTarget = [
    productStart[0] + cameraRight[0] * 0.12 / detailScale,
    productStart[1] + cameraRight[1] * 0.12 / detailScale,
  ];
  const desiredCamera = [
    productStart[0]
      + cameraRight[0] * 0.9 / detailScale
      - forward[0] * 5.35 / detailScale,
    productStart[1]
      + cameraRight[1] * 0.9 / detailScale
      - forward[1] * 5.35 / detailScale,
  ];
  const cameraResult = resolvePlanarSpringArm(
    cameraTarget[0],
    cameraTarget[1],
    desiredCamera[0],
    desiredCamera[1],
    map.boundary,
    worldObstacles,
    audit.startAndCamera.cameraCollisionRadiusWorld,
    0.08,
  );

  closePoint(cameraTarget, audit.startAndCamera.initialProductCamera.targetWorldBeforeDetailScale);
  closePoint(desiredCamera, audit.startAndCamera.initialProductCamera.desiredWorldBeforeDetailScale);
  close(cameraResult.planarDistance, audit.startAndCamera.initialProductCamera.planarDistanceScene);
  close(cameraResult.fraction, 1);
  assert.equal(cameraResult.blockerId, null);
});
