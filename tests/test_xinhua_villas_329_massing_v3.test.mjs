import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const RECORD_PATH = resolve(
  ROOT,
  "docs/research/build-records/tiers/xinhua-road/massing-v3/xinhua-villas-329-massing.json",
);
const BINDING_PATH = resolve(
  ROOT,
  "docs/research/xinhua-villas-329-member-binding.json",
);
const REFERENCE_MANIFEST_PATH = resolve(
  ROOT,
  "docs/research/xinhua-villas-329-reference-manifest.json",
);
const XHS_INVENTORY_PATH = resolve(
  ROOT,
  "docs/research/xinhua-villas-329-xhs-evidence-inventory.json",
);
const REGISTRY_PATH = resolve(
  ROOT,
  "app/scene/xinhua-road-landmarks-data.json",
);
const FAST_MANIFEST_PATH = resolve(
  ROOT,
  "docs/research/building-pipeline-fast-mode.json",
);
const OSM_PATH = resolve(
  ROOT,
  "docs/research/data/xinhua-buildings-osm-20260725-074802.json",
);
const MAP_PATH = resolve(ROOT, "app/scene/xinhua-map-data.json");
const INTEGRATION_CANDIDATE_PATH = resolve(
  ROOT,
  "docs/research/xinhua-villas-329-massing-v3-integration-candidate.json",
);

async function sha256(filePath) {
  const contents = await readFile(filePath);
  return createHash("sha256").update(contents).digest("hex");
}

async function readGlbJson(filePath) {
  const bytes = await readFile(filePath);
  assert.equal(bytes.subarray(0, 4).toString("utf8"), "glTF");
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

test("329弄 XHS 证据只授权四成员保守 Massing v3", async () => {
  const [
    record,
    binding,
    referenceManifest,
    inventory,
    registry,
    fastManifest,
    osm,
    map,
    integrationCandidate,
  ] =
    await Promise.all([
      readFile(RECORD_PATH, "utf8").then(JSON.parse),
      readFile(BINDING_PATH, "utf8").then(JSON.parse),
      readFile(REFERENCE_MANIFEST_PATH, "utf8").then(JSON.parse),
      readFile(XHS_INVENTORY_PATH, "utf8").then(JSON.parse),
      readFile(REGISTRY_PATH, "utf8").then(JSON.parse),
      readFile(FAST_MANIFEST_PATH, "utf8").then(JSON.parse),
      readFile(OSM_PATH, "utf8").then(JSON.parse),
      readFile(MAP_PATH, "utf8").then(JSON.parse),
      readFile(INTEGRATION_CANDIDATE_PATH, "utf8").then(JSON.parse),
    ]);

  assert.equal(referenceManifest.status, "evidence-pass-conservative-massing-v3");
  assert.equal(referenceManifest.evidenceGate.massingAuthorized, true);
  assert.equal(referenceManifest.evidenceGate.identityAuthorized, false);
  assert.equal(referenceManifest.evidenceGate.heroAuthorized, false);
  assert.equal(record.gates.evidence, "pass-conservative-massing-only");
  assert.equal(record.gates.mcp1, "pending-main-window-batch");
  assert.equal(record.gates.runtimeGate, "pending-main-window-scoped-qa");
  assert.equal(record.gates.mapAcceptance, "pending-main-window-scoped-qa");
  assert.equal(record.gates.identityAuthorized, false);
  assert.equal(record.gates.heroAuthorized, false);
  assert.equal(binding.worldProjectionValidation.status, "pass");
  assert.ok(
    binding.worldProjectionValidation.maximumErrorSceneUnits
      <= binding.worldProjectionValidation.toleranceSceneUnits,
  );
  assert.equal(record.coordinateValidation.status, "pass");
  assert.equal(integrationCandidate.coordinateValidation.status, "pass");

  assert.deepEqual(
    binding.members.map(({ sourceWayId, houseNumber }) => [sourceWayId, houseNumber]),
    [
      [864493244, "15"],
      [864485664, "36"],
      [864493174, "40"],
      [864493173, "42"],
    ],
  );
  assert.deepEqual(record.scope.includedHouseNumbers, ["15", "36", "40", "42"]);
  assert.deepEqual(record.scope.excludedWayIds, [864493245]);
  assert.equal(binding.excludedCandidates.length, 1);
  assert.equal(binding.excludedCandidates[0].sourceWayId, 864493245);
  assert.equal(
    binding.excludedCandidates[0].status,
    "excluded-evidence-unbound-unknown-adjacent",
  );
  assert(!JSON.stringify(binding.excludedCandidates[0]).includes("Villa Le Bec"));
  assert.equal(record.children.length, 4);
  assert(!record.children.some(({ sourceWayId }) => sourceWayId === 864493245));

  const osmWayIds = new Set(
    osm.elements
      .filter(({ type }) => type === "way")
      .map(({ id }) => id),
  );
  for (const sourceWayId of [
    ...binding.members.map(({ sourceWayId }) => sourceWayId),
    binding.excludedCandidates[0].sourceWayId,
  ]) {
    assert(osmWayIds.has(sourceWayId), `OSM 缺少 way/${sourceWayId}`);
  }

  const [centerLongitude, centerLatitude] = map.meta.centerWgs84;
  const metersPerLongitudeDegree =
    111_320 * Math.cos(centerLatitude * Math.PI / 180);
  const projectWorld = ({ lon, lat }) => [
    (lon - centerLongitude) * metersPerLongitudeDegree
      / map.meta.metersPerSceneUnit,
    -(lat - centerLatitude) * 110_540 / map.meta.metersPerSceneUnit,
  ];
  const authoredToWorld = ([localX, sourceZ]) => {
    const { position, yaw, scale } = binding.registryPlacement;
    const cosine = Math.cos(yaw);
    const sine = Math.sin(yaw);
    const localZ = -sourceZ;
    return [
      position[0] + scale * (cosine * localX + sine * localZ),
      position[1] + scale * (-sine * localX + cosine * localZ),
    ];
  };
  for (const member of binding.members) {
    const way = osm.elements.find(
      ({ type, id }) => type === "way" && id === member.sourceWayId,
    );
    assert(way);
    const osmVertices = way.geometry.slice(0, -1).map(projectWorld);
    assert.equal(member.localFootprint.length, osmVertices.length);
    const worldErrors = member.localFootprint.map((localVertex, index) => {
      const actual = authoredToWorld(localVertex);
      const expected = osmVertices[index];
      return Math.hypot(actual[0] - expected[0], actual[1] - expected[1]);
    });
    assert.ok(
      Math.max(...worldErrors) <= 0.05,
      `way/${member.sourceWayId} 最大 world 顶点偏差超过 0.05 scene unit`,
    );
  }
  const excludedWay = osm.elements.find(
    ({ type, id }) => type === "way" && id === 864493245,
  );
  const excludedWorldVertices = excludedWay.geometry.slice(0, -1).map(projectWorld);
  const excludedWorldCenter = excludedWorldVertices.reduce(
    (center, point) => [
      center[0] + point[0] / excludedWorldVertices.length,
      center[1] + point[1] / excludedWorldVertices.length,
    ],
    [0, 0],
  );
  assert.ok(Math.hypot(
    excludedWorldCenter[0]
      - binding.excludedCandidates[0].projectedWorldCenter[0],
    excludedWorldCenter[1]
      - binding.excludedCandidates[0].projectedWorldCenter[1],
  ) <= 0.00001);

  const glbPath = resolve(ROOT, record.outputs.glb);
  assert.equal(await sha256(glbPath), record.glb.sha256);
  assert.equal(record.glb.sha256, "f245efd099d00049c068230fe999f5e492c16aef441775dddf7c41dd9350b704");
  assert.equal(record.glb.bytes, 21632);
  assert.equal(record.glb.nodes, 4);
  assert.equal(record.glb.meshes, 4);
  assert.equal(record.glb.materials, 4);
  assert.equal(record.glb.images, 0);
  assert.equal(record.glb.textures, 0);
  assert.equal(record.glb.triangles, 204);
  assert.equal(record.glb.rootTransformsNormalized, true);
  assert.equal(record.explicitAudit.result.status, "ok");
  assert.equal(integrationCandidate.modelSha256, record.glb.sha256);
  assert.equal(integrationCandidate.localObstacles.length, 4);
  for (const obstacle of integrationCandidate.localObstacles) {
    assert(obstacle.minX >= integrationCandidate.localBounds.minX);
    assert(obstacle.maxX <= integrationCandidate.localBounds.maxX);
    assert(obstacle.minZ >= integrationCandidate.localBounds.minZ);
    assert(obstacle.maxZ <= integrationCandidate.localBounds.maxZ);
  }
  assert(
    integrationCandidate.fastManifestCandidate.tests.includes(
      "tests/test_xinhua_villas_329_massing_v3.test.mjs",
    ),
  );
  assert(
    integrationCandidate.fastManifestCandidate.runtimeRoutes.some(
      (route) => route.includes("qaModelTier=massing"),
    ),
  );

  const gltf = await readGlbJson(glbPath);
  assert.equal(gltf.nodes.length, 4);
  assert.equal(gltf.meshes.length, 4);
  assert.equal(gltf.materials.length, 4);
  assert.equal(gltf.images?.length ?? 0, 0);
  assert.equal(gltf.textures?.length ?? 0, 0);
  assert.deepEqual(
    gltf.nodes.map(({ name }) => name).sort(),
    [
      "xinhua-villas-329-member-15",
      "xinhua-villas-329-member-36",
      "xinhua-villas-329-member-40",
      "xinhua-villas-329-member-42",
    ],
  );
  for (const node of gltf.nodes) {
    assert.equal(node.translation, undefined);
    assert.equal(node.rotation, undefined);
    assert.equal(node.scale, undefined);
    assert.equal(node.matrix, undefined);
  }

  assert.equal(
    await sha256(resolve(ROOT, record.outputs.blend)),
    record.blend.sha256,
  );
  for (const preview of Object.values(record.outputs.previews)) {
    assert.equal(await sha256(resolve(ROOT, preview.path)), preview.sha256);
    assert(preview.bytes > 500000);
  }
  assert.equal(
    await sha256(resolve(ROOT, record.outputs.comparisonCheckpoint.path)),
    record.outputs.comparisonCheckpoint.sha256,
  );
  assert.equal(record.outputs.comparisonCheckpoint.bytes, 606051);
  assert.equal(
    await sha256(
      resolve(ROOT, record.outputs.comparisonCheckpoint.runtimePanel.path),
    ),
    record.outputs.comparisonCheckpoint.runtimePanel.sha256,
  );
  assert.equal(
    record.outputs.comparisonCheckpoint.runtimePanel.status,
    "pending-main-window-scoped-qa",
  );

  assert.equal(inventory.files.length, 19);
  assert.equal(inventory.files.filter(({ visualStatus }) => visualStatus === "usable").length, 9);
  assert.equal(
    inventory.files.filter(
      ({ visualStatus }) => visualStatus === "needs-review-black-media",
    ).length,
    9,
  );
  for (const file of inventory.files) {
    assert.equal(
      await sha256(resolve(ROOT, inventory.localDirectory, file.name)),
      file.sha256,
      `${file.name} 与主窗口交接指纹不一致`,
    );
  }

  const landmark = registry.landmarks.find(({ id }) => id === "xinhua-villas-329");
  assert(landmark);
  assert.equal(landmark.model, "/models/xinhua-road/xinhua-villas-329.glb");
  assert.deepEqual(landmark.position, [-42.13, 79.48]);
  assert.equal(landmark.yaw, -0.38);
  assert.equal(landmark.scale, 0.62);

  const fastBuilding = fastManifest.buildings.find(
    ({ id }) => id === "xinhua-villas-329",
  );
  assert(fastBuilding);
  assert(
    fastBuilding.glbs.includes(
      "public/models/xinhua-road/xinhua-villas-329.glb",
    ),
  );
  assert(
    fastBuilding.glbs.every((glb) => [
      "public/models/xinhua-road/xinhua-villas-329.glb",
      "public/models/tiers/xinhua-road/massing-v3/xinhua-villas-329-massing.glb",
    ].includes(glb)),
    "临时专项 manifest 不得包含其他建筑或其他329候选 GLB",
  );
  assert.deepEqual(
    fastBuilding.runtimeRoutes,
    ["/?start=villas329&cameraQa=1&qaAutoStart=1"],
  );
});
