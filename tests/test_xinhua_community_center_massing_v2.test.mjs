import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BINDING_PATH = "docs/research/xinhua-community-center-osm-binding.json";
const RECORD_PATH =
  "docs/research/build-records/tiers/xinhua-road/massing-v2/xinhua-community-center-massing.json";
const MANIFEST_PATH =
  "docs/research/xinhua-community-center-reference-manifest.json";
const MAP_GATE_PATH =
  "docs/research/xinhua-community-center-massing-map-gate.json";
const INTEGRATION_CANDIDATE_PATH =
  "docs/research/xinhua-community-center-massing-v2-integration-candidate.json";
const OSM_PATH =
  "docs/research/data/requested-pois-osm-20260717-103840.json";
const MAP_PATH = "app/scene/xinhua-map-data.json";
const REGISTRY_PATH = "app/scene/xinhua-road-landmarks-data.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(path.join(ROOT, relativePath)))
    .digest("hex");
}

async function parseGlb(relativePath) {
  const bytes = await readFile(path.join(ROOT, relativePath));
  assert.equal(bytes.subarray(0, 4).toString("utf8"), "glTF");
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  let offset = 12;
  while (offset < bytes.length) {
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    offset += 8;
    const chunk = bytes.subarray(offset, offset + chunkLength);
    offset += chunkLength;
    if (chunkType === 0x4e4f534a) {
      return JSON.parse(chunk.toString("utf8").replace(/\0+$/u, "").trim());
    }
  }
  throw new Error("GLB 缺少 JSON chunk");
}

function projectWgs84({ lon, lat }, map) {
  const [centerLon, centerLat] = map.meta.centerWgs84;
  const metersPerLonDegree =
    111_320 * Math.cos((centerLat * Math.PI) / 180);
  return [
    ((lon - centerLon) * metersPerLonDegree)
      / map.meta.metersPerSceneUnit,
    -((lat - centerLat) * 110_540) / map.meta.metersPerSceneUnit,
  ];
}

function localToWorld([x, z], placement) {
  const cosine = Math.cos(placement.yaw);
  const sine = Math.sin(placement.yaw);
  return [
    placement.position[0]
      + placement.scale * (cosine * x + sine * z),
    placement.position[1]
      + placement.scale * (-sine * x + cosine * z),
  ];
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (
    let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current, current += 1
  ) {
    const [currentX, currentZ] = polygon[current];
    const [previousX, previousZ] = polygon[previous];
    const crosses =
      currentZ > point[1] !== previousZ > point[1]
      && point[0]
        < ((previousX - currentX) * (point[1] - currentZ))
          / (previousZ - currentZ)
          + currentX;
    if (crosses) {
      inside = !inside;
    }
  }
  return inside;
}

function pointToSegmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const denominator = dx * dx + dz * dz;
  const projection = denominator === 0
    ? 0
    : Math.max(
      0,
      Math.min(
        1,
        (
          (point[0] - start[0]) * dx
          + (point[1] - start[1]) * dz
        ) / denominator,
      ),
    );
  return Math.hypot(
    point[0] - (start[0] + projection * dx),
    point[1] - (start[1] + projection * dz),
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

function polylineDistance(polygon, polyline) {
  return Math.min(
    ...polygon.flatMap((point, polygonIndex) => {
      const polygonEnd = polygon[(polygonIndex + 1) % polygon.length];
      return polyline.slice(1).map((roadEnd, roadIndex) => (
        segmentDistance(
          point,
          polygonEnd,
          polyline[roadIndex],
          roadEnd,
        )
      ));
    }),
  );
}

test("社区营造中心证据只授权4号楼保守 Massing", async () => {
  const [manifest, gate, record] = await Promise.all([
    readJson(MANIFEST_PATH),
    readJson(MAP_GATE_PATH),
    readJson(RECORD_PATH),
  ]);

  assert.equal(manifest.assetId, "xinhua-community-center");
  assert.equal(manifest.status, "evidence-pass-conservative-massing-only");
  assert.equal(manifest.references.length, 2);
  assert.equal(manifest.viewCoverageMatrix.canonical.status, "supported");
  assert.equal(manifest.viewCoverageMatrix.sideDepth.status, "unknown");
  assert.equal(manifest.evidenceGate.massingAuthorized, true);
  assert.equal(manifest.evidenceGate.identityAuthorized, false);
  assert.equal(manifest.evidenceGate.heroAuthorized, false);
  assert.deepEqual(gate.scope.includedOsmWays, [864493234]);
  assert.equal(gate.scope.outOfScopeAssetsCreated, 0);
  assert.equal(gate.scope.sharedRegistryModified, false);
  assert.equal(gate.scope.sharedRuntimeModified, false);
  assert.equal(gate.scope.sharedFastManifestModified, false);
  assert.equal(record.scope.includedOsmWays[0], 864493234);
  assert(record.massingGeometry.omitted.includes("trees"));
  assert(record.massingGeometry.omitted.includes("toy-exchange-house"));

  for (const reference of manifest.references) {
    assert.equal(await sha256(reference.localPath), reference.sha256);
  }
});

test("命名POI、目标footprint与支路均从原始OSM WGS84投影复核", async () => {
  const [binding, osm, map] = await Promise.all([
    readJson(BINDING_PATH),
    readJson(OSM_PATH),
    readJson(MAP_PATH),
  ]);
  const target = osm.targets.find(
    ({ target: candidate }) => candidate.id === "xinhua-community-center",
  );
  assert(target);
  const poiNode = target.overpass.elements.find(
    ({ type, id }) => type === "node" && id === 13765678129,
  );
  const building = target.overpass.elements.find(
    ({ type, id }) => type === "way" && id === 864493234,
  );
  const accessRoad = target.overpass.elements.find(
    ({ type, id }) => type === "way" && id === 577252269,
  );
  assert(poiNode);
  assert(building);
  assert(accessRoad);
  assert.equal(accessRoad.tags.name, "新华路345弄");
  assert.equal(accessRoad.tags.highway, "service");

  const projectedPoi = projectWgs84(poiNode, map);
  const projectedFootprint = building.geometry
    .slice(0, -1)
    .map((point) => projectWgs84(point, map));
  const projectedRoad = accessRoad.geometry.map((point) => (
    projectWgs84(point, map)
  ));
  assert.deepEqual(projectedPoi, binding.namedPoi.projectedWorld);
  for (const [index, point] of projectedFootprint.entries()) {
    assert(
      Math.hypot(
        point[0] - binding.buildingFootprint.projectedWorld[index][0],
        point[1] - binding.buildingFootprint.projectedWorld[index][1],
      ) < 1e-10,
    );
  }
  assert(pointInPolygon(projectedPoi, projectedFootprint));

  const roadGap = polylineDistance(projectedFootprint, projectedRoad);
  assert(
    Math.abs(
      roadGap
        - binding.frontAccessRoad.buildingBoundaryToCenterlineSceneUnits
    ) < 1e-10,
  );
  assert(
    Math.abs(
      roadGap * map.meta.metersPerSceneUnit
        - binding.frontAccessRoad.buildingBoundaryToCenterlineMeters
    ) < 1e-10,
  );
});

test("local footprint 通过候选 position/yaw/scale 回到OSM world且不靠scale掩盖", async () => {
  const binding = await readJson(BINDING_PATH);
  const placement = binding.runtimePlacementCandidate;
  assert.equal(placement.scale, 1);
  assert.equal(placement.authoredFront, "blender-local-negative-y");
  assert.equal(placement.gltfFront, "local-positive-z");

  let maximumError = 0;
  for (
    let index = 0;
    index < placement.localFootprint.length;
    index += 1
  ) {
    const reconstructed = localToWorld(
      placement.localFootprint[index],
      placement,
    );
    const expected = binding.buildingFootprint.projectedWorld[index];
    maximumError = Math.max(
      maximumError,
      Math.hypot(
        reconstructed[0] - expected[0],
        reconstructed[1] - expected[1],
      ),
    );
  }
  assert(maximumError < 1e-12);
  assert(
    maximumError
      < binding.calibrationContract.maximumVertexWorldErrorSceneUnits,
  );

  const localFrontInWorld = [
    Math.sin(placement.yaw),
    Math.cos(placement.yaw),
  ];
  assert(
    Math.hypot(
      localFrontInWorld[0] - placement.frontWorldDirection[0],
      localFrontInWorld[1] - placement.frontWorldDirection[1],
    ) < 1e-12,
  );
});

test("地图候选不重叠邻楼，窄侧缝不承诺通行，正式道路门留给主窗口", async () => {
  const [binding, gate, candidate] = await Promise.all([
    readJson(BINDING_PATH),
    readJson(MAP_GATE_PATH),
    readJson(INTEGRATION_CANDIDATE_PATH),
  ]);
  assert.equal(binding.neighborClearance.overlapCount, 0);
  assert.equal(gate.mapCalibrationCandidate.osmFootprintOverlapCount, 0);
  assert(
    gate.mapCalibrationCandidate.closestNeighborGapSceneUnits
      < gate.collisionCandidate.playerDiameterSceneUnits,
  );
  assert.equal(gate.collisionCandidate.sideGapWalkable, false);
  assert.equal(
    gate.collisionCandidate.frontEntranceCenterlineExceedsPlayerRadius,
    true,
  );
  assert.equal(gate.mapCalibrationCandidate.roadSurfaceWidthKnown, false);
  assert.equal(gate.gates.formalMapAcceptance, "pending-main-window");
  assert.equal(candidate.mainWindowGates.length, 4);
  assert.equal(candidate.registryCandidate.scale, 1);
  assert(
    candidate.fastManifestCandidate.tests.includes(
      "tests/test_xinhua_community_center_massing_v2.test.mjs",
    ),
  );
});

test("Massing v2 的GLB、Blend、生成器、预览和预算可追溯", async () => {
  const record = await readJson(RECORD_PATH);
  const glbPath = record.outputs.glb;
  assert.equal(await sha256(glbPath), record.glb.sha256);
  assert.equal((await stat(path.join(ROOT, glbPath))).size, record.glb.bytes);
  assert.equal(await sha256(record.outputs.blend), record.blend.sha256);
  assert.equal(
    await sha256(record.outputs.generator),
    record.generator.sha256,
  );

  const gltf = await parseGlb(glbPath);
  assert.equal(gltf.nodes.length, 1);
  assert.equal(gltf.meshes.length, 1);
  assert.equal(gltf.materials.length, 3);
  assert.equal(gltf.images?.length ?? 0, 0);
  assert.equal(gltf.textures?.length ?? 0, 0);
  assert.equal(gltf.nodes[0].name, "xinhua-community-center-massing-v2");
  assert.equal(
    gltf.nodes[0].extras.asset_id,
    "building:xinhua-road:xinhua-community-center",
  );
  assert.equal(gltf.nodes[0].extras.source_osm_way, "864493234");
  assert.equal(
    gltf.nodes[0].extras.authored_front,
    "blender-local-negative-y",
  );
  for (const transform of ["translation", "rotation", "scale", "matrix"]) {
    assert.equal(gltf.nodes[0][transform], undefined);
  }

  assert(record.glb.nodes <= record.budgets.maxNodes);
  assert(record.glb.triangles <= record.budgets.maxTriangles);
  assert(record.glb.materials <= record.budgets.maxMaterials);
  assert.equal(record.glb.images, record.budgets.maxImages);
  assert(record.glb.bytes <= record.budgets.maxBytes);
  assert.equal(record.gates.glbAudit, "pass");
  assert.equal(record.gates.mcp1, "pending-main-window-batch");
  assert.equal(record.gates.runtimeGate, "pending-main-window-scoped-qa");

  for (const preview of Object.values(record.outputs.previews)) {
    const contents = await readFile(path.join(ROOT, preview.path));
    assert.equal(contents.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(await sha256(preview.path), preview.sha256);
    assert.deepEqual(
      [contents.readUInt32BE(16), contents.readUInt32BE(20)],
      [960, 720],
    );
  }
});

test("Recovery provisional保留在Hold且共享registry未被建筑分支覆盖", async () => {
  const [record, gate, registry] = await Promise.all([
    readJson(RECORD_PATH),
    readJson(MAP_GATE_PATH),
    readJson(REGISTRY_PATH),
  ]);
  assert.equal(record.recoveryAsset.status, "retained-in-hold-rejected-as-current-candidate");
  assert.equal(
    record.recoveryAsset.holdCommit,
    "3044cd89f801250afcd477dfbcbc7da358bf4b11",
  );
  assert.equal(gate.recovery.retained, true);
  assert.equal(gate.recovery.copiedIntoCurrentCandidate, false);
  assert.equal(gate.recovery.runtimePassInherited, false);

  const landmark = registry.landmarks.find(
    ({ id }) => id === "xinhua-community-center",
  );
  assert(landmark);
  assert.equal(
    landmark.model,
    "/models/requested-pois/xinhua-community-center.glb",
  );
  assert.deepEqual(landmark.position, [-74.78, 112.55]);
  assert.equal(landmark.yaw, -0.38);
  assert.equal(landmark.scale, 0.6);
});
