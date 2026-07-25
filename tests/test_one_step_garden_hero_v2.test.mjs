import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recordPath = "docs/research/build-records/tiers/xinhua-road/hero-v2/one-step-garden-hero.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(path.join(root, relativePath)))
    .digest("hex");
}

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim());
  const binaryHeader = 20 + jsonLength;
  const binaryLength = buffer.readUInt32LE(binaryHeader);
  return {
    json,
    binary: buffer.subarray(binaryHeader + 8, binaryHeader + 8 + binaryLength),
  };
}

const componentCounts = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
};
const componentBytes = {
  5120: 1,
  5121: 1,
  5122: 2,
  5123: 2,
  5125: 4,
  5126: 4,
};

function readComponent(buffer, offset, type) {
  if (type === 5120) return buffer.readInt8(offset);
  if (type === 5121) return buffer.readUInt8(offset);
  if (type === 5122) return buffer.readInt16LE(offset);
  if (type === 5123) return buffer.readUInt16LE(offset);
  if (type === 5125) return buffer.readUInt32LE(offset);
  if (type === 5126) return buffer.readFloatLE(offset);
  throw new Error(`不支持的 componentType：${type}`);
}

function readAccessor(json, binary, accessorIndex) {
  const accessor = json.accessors[accessorIndex];
  assert.equal(accessor.sparse, undefined);
  const view = json.bufferViews[accessor.bufferView];
  const componentCount = componentCounts[accessor.type];
  const bytes = componentBytes[accessor.componentType];
  const stride = view.byteStride ?? componentCount * bytes;
  const base = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  return Array.from({ length: accessor.count }, (_, itemIndex) => (
    Array.from({ length: componentCount }, (_, componentIndex) => (
      readComponent(binary, base + itemIndex * stride + componentIndex * bytes, accessor.componentType)
    ))
  ));
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function length(vector) {
  return Math.hypot(...vector);
}

function round6(value) {
  return Number(value.toFixed(6));
}

function auditGeometry(json, binary) {
  let triangles = 0;
  let zeroAreaTriangles = 0;
  let nonFinitePositions = 0;
  let invalidIndices = 0;
  let missingNormals = 0;
  let zeroNormals = 0;
  let nonUnitNormals = 0;
  let orientationMismatches = 0;

  for (const mesh of json.meshes) {
    for (const primitive of mesh.primitives) {
      assert.equal(primitive.mode ?? 4, 4);
      const positions = readAccessor(json, binary, primitive.attributes.POSITION);
      const normalAccessor = primitive.attributes.NORMAL;
      const normals = normalAccessor === undefined
        ? null
        : readAccessor(json, binary, normalAccessor);
      const indices = primitive.indices === undefined
        ? positions.map((_, index) => index)
        : readAccessor(json, binary, primitive.indices).flat();

      if (!normals) missingNormals += 1;
      for (const position of positions) {
        if (position.some((value) => !Number.isFinite(value))) nonFinitePositions += 1;
      }
      for (const normal of normals ?? []) {
        const magnitude = length(normal);
        if (magnitude <= 1e-8) zeroNormals += 1;
        else if (Math.abs(magnitude - 1) > 1e-4) nonUnitNormals += 1;
      }

      for (let index = 0; index < indices.length; index += 3) {
        const triangle = indices.slice(index, index + 3);
        if (triangle.length !== 3 || triangle.some((vertex) => vertex >= positions.length)) {
          invalidIndices += 1;
          continue;
        }
        triangles += 1;
        const [a, b, c] = triangle.map((vertex) => positions[vertex]);
        const face = cross(subtract(b, a), subtract(c, a));
        const doubleArea = length(face);
        if (doubleArea <= 1e-10) {
          zeroAreaTriangles += 1;
          continue;
        }
        if (normals) {
          const averageNormal = triangle.reduce(
            (sum, vertex) => sum.map((value, axis) => value + normals[vertex][axis]),
            [0, 0, 0],
          );
          const averageLength = length(averageNormal);
          const alignment = averageLength > 1e-8
            ? face.reduce((sum, value, axis) => sum + value * averageNormal[axis], 0)
              / (doubleArea * averageLength)
            : 0;
          if (alignment < -1e-4) orientationMismatches += 1;
        }
      }
    }
  }
  return {
    triangles,
    zeroAreaTriangles,
    nonFinitePositions,
    invalidIndices,
    missingNormals,
    zeroNormals,
    nonUnitNormals,
    orientationMismatches,
  };
}

test("一号花园 Hero v2 使用独立路径并保留旧 Hero Hold 与公共 registry", async () => {
  const record = await readJson(recordPath);
  const registry = await readJson("app/scene/xinhua-road-landmarks-data.json");
  const landmark = registry.landmarks.find(({ id }) => id === "one-step-garden");

  assert.equal(
    record.status,
    "hero-v2-mcp2-pass-identity-authorized-execution-paused",
  );
  assert.equal(record.tier, "hero");
  assert.equal(record.versionName, "hero-v2");
  assert.equal(record.generatorSha256, await sha256(record.generator));
  assert.equal(
    await sha256(record.legacyHeroHold.editableSource),
    record.legacyHeroHold.editableSourceSha256,
  );
  assert.equal(
    await sha256(record.legacyHeroHold.runtimeAsset),
    record.legacyHeroHold.runtimeAssetSha256,
  );
  assert.equal(record.legacyHeroHold.overwritten, false);
  assert.equal(record.legacyHeroHold.deleted, false);
  assert.equal(record.publicRegistry.modified, false);
  assert.equal(landmark.model, "/models/xinhua-road/one-step-garden.glb");
  assert.equal(landmark.cacheVersion, "20260718-detail-1");
});

test("一号花园 Hero v2 精确继承 Massing origin、bounds、前向与碰撞语义", async () => {
  const record = await readJson(recordPath);
  const massing = await readJson(
    "docs/research/build-records/tiers/xinhua-road/massing-v2/one-step-garden-massing.json",
  );
  assert.equal(record.derivedFrom.runtimeAssetSha256, massing.glb.sha256);
  assert.equal(record.derivedFrom.editableSourceSha256, massing.mcp1.reviewedBlendSha256);
  assert.equal(record.canonicalFront, "local-negative-y");
  assert.equal(record.scale.sceneUnitMeters, 2.7);
  assert.equal(record.scale.previewHumanSceneUnits, 0.666667);
  assert.deepEqual(record.glb.bounds, massing.glb.bounds);
  assert.equal(record.collisionContract.localObstacles.length, 8);
  assert.equal(record.collisionContract.entranceAndFrontRearGapRemainOpen, true);
  assert.equal(record.identityAllowed, true);
  assert.equal(record.identityLineage.sourceMcp2, "pass");
  assert.equal(record.identityLineage.postBuildGateAuthorization, true);
  assert.equal(record.identityLineage.sourceRootIdentityAllowedAtBuild, false);
  assert.equal(record.identityLineage.identityDerivationAuthorized, true);
  assert.equal(record.identityLineage.identityDerivationStarted, false);
  assert.equal(record.identityLineage.executionPausedForMainWindowIntegration, true);
});

test("一号花园 Hero v2 GLB 结构、退化面、法线和预算通过独立复算", async () => {
  const record = await readJson(recordPath);
  const glbPath = record.outputs.glb.path;
  const buffer = await readFile(path.join(root, glbPath));
  const { json, binary } = parseGlb(buffer);
  const geometry = auditGeometry(json, binary);
  const rootNode = json.nodes[json.scenes[json.scene ?? 0].nodes[0]];

  assert.equal(await sha256(glbPath), record.outputs.glb.sha256);
  assert.equal(buffer.length, record.outputs.glb.bytes);
  assert.equal(json.nodes.length, 1);
  assert.equal(json.meshes.length, 1);
  assert.equal(json.meshes[0].primitives.length, 7);
  assert.equal(json.materials.length, 7);
  assert.equal(json.images?.length ?? 0, 0);
  assert.equal(json.textures?.length ?? 0, 0);
  const expectedMaterials = {
    "one-step-garden-hero-warm-plaster": {
      baseColorFactor: [0.82, 0.78, 0.69, 1],
      roughnessFactor: 0.88,
      metallicFactor: 0,
    },
    "one-step-garden-hero-muted-brick": {
      baseColorFactor: [0.4, 0.16, 0.11, 1],
      roughnessFactor: 0.88,
      metallicFactor: 0,
    },
    "one-step-garden-hero-dark-tile-roof": {
      baseColorFactor: [0.12, 0.15, 0.15, 1],
      roughnessFactor: 0.88,
      metallicFactor: 0,
    },
    "one-step-garden-hero-deep-half-timber": {
      baseColorFactor: [0.045, 0.065, 0.06, 1],
      roughnessFactor: 0.88,
      metallicFactor: 0,
    },
    "one-step-garden-hero-window-frame": {
      baseColorFactor: [0.035, 0.085, 0.075, 1],
      roughnessFactor: 0.88,
      metallicFactor: 0,
    },
    "one-step-garden-hero-muted-glass": {
      baseColorFactor: [0.09, 0.19, 0.18, 1],
      roughnessFactor: 0.38,
      metallicFactor: 0,
    },
    "one-step-garden-hero-dark-door": {
      baseColorFactor: [0.18, 0.105, 0.065, 1],
      roughnessFactor: 0.88,
      metallicFactor: 0,
    },
  };
  const actualMaterials = Object.fromEntries(
    json.materials.map(({ name, pbrMetallicRoughness }) => [
      name,
      {
        baseColorFactor: pbrMetallicRoughness.baseColorFactor.map(round6),
        roughnessFactor: round6(pbrMetallicRoughness.roughnessFactor),
        metallicFactor: round6(pbrMetallicRoughness.metallicFactor),
      },
    ]),
  );
  assert.deepEqual(actualMaterials, expectedMaterials);
  assert.equal(
    new Set(
      Object.values(actualMaterials).map(
        ({ baseColorFactor }) => JSON.stringify(baseColorFactor),
      ),
    ).size,
    7,
  );
  assert.ok(
    Object.values(actualMaterials).every(
      ({ baseColorFactor }) => JSON.stringify(baseColorFactor) !== "[0.8,0.8,0.8,1]",
    ),
  );
  assert.deepEqual(
    Object.fromEntries(
      record.glb.materialFactors.map((value) => [
        value.name,
        {
          baseColorFactor: value.baseColorFactor,
          roughnessFactor: value.roughnessFactor,
          metallicFactor: value.metallicFactor,
        },
      ]),
    ),
    expectedMaterials,
  );
  assert.equal(record.blendMaterialAudit.materialCount, 7);
  assert.equal(record.blendMaterialAudit.allUseNodes, true);
  assert.deepEqual(
    Object.fromEntries(
      record.blendMaterialAudit.materials.map((value) => [
        value.name,
        {
          baseColorFactor: value.baseColor,
          roughnessFactor: value.roughness,
          metallicFactor: value.metallic,
        },
      ]),
    ),
    expectedMaterials,
  );
  assert.equal(rootNode.translation, undefined);
  assert.equal(rootNode.rotation, undefined);
  assert.equal(rootNode.scale, undefined);
  assert.equal(rootNode.matrix, undefined);
  assert.equal(rootNode.extras.asset_id, "one-step-garden");
  assert.equal(rootNode.extras.tier, "hero");
  assert.equal(rootNode.extras.version, "hero-v2");
  assert.equal(
    rootNode.extras.derived_from_massing_glb_sha256,
    record.derivedFrom.runtimeAssetSha256,
  );
  assert.deepEqual(geometry, {
    triangles: 3584,
    zeroAreaTriangles: 0,
    nonFinitePositions: 0,
    invalidIndices: 0,
    missingNormals: 0,
    zeroNormals: 0,
    nonUnitNormals: 0,
    orientationMismatches: 0,
  });
  assert.ok(geometry.triangles <= record.budget.maxTriangles);
  assert.ok(json.materials.length <= record.budget.maxMaterials);
  assert.ok(buffer.length <= record.budget.maxBytes);
});

test("一号花园 Hero v2 generator 只包含建筑证据构件", async () => {
  const record = await readJson(recordPath);
  const source = await readFile(path.join(root, record.generator), "utf8");
  const buildModel = source.match(
    /def build_model\(\) -> bpy\.types\.Object:\n.*?(?=\ndef scene_bounds\()/s,
  )?.[0];
  assert.ok(buildModel);
  for (const required of [
    /front-left-street-gable-infill/,
    /front-courtyard-back-timber/,
    /front-shed-dormer-window-/,
    /rear-left-gable-brick-infill/,
    /rear-right-gable-brick-infill/,
    /rear-central-chimney-cap/,
    /rear-left-chimney-cap/,
  ]) {
    assert.match(buildModel, required);
  }
  for (const forbidden of [
    /garden-shrub-/,
    /garden-cafe-/,
    /garden-planter-/,
    /garden-lamp-/,
    /garden-fence-/,
    /garden-sign/,
    /garden-name/,
    /garden-paving/,
  ]) {
    assert.doesNotMatch(buildModel, forbidden);
  }
  assert.deepEqual(record.scope.excluded, [
    "trees",
    "shrubs",
    "grass",
    "commercial-furniture",
    "umbrellas",
    "planters",
    "lamps",
    "fences",
    "signage",
    "decorative-paving",
    "other-buildings",
    "full-map-assets",
  ]);
  assert.match(source, /value\.use_nodes = True/);
  assert.match(source, /principled\.inputs\["Base Color"\]\.default_value = color/);
  assert.match(source, /principled\.inputs\["Roughness"\]\.default_value = roughness/);
  assert.match(source, /principled\.inputs\["Metallic"\]\.default_value = metallic/);
  assert.match(source, /scene\.render\.engine = engine/);
  assert.doesNotMatch(source, /scene\.render\.engine = "BLENDER_WORKBENCH"/);
});

test("一号花园 Hero v2 三固定机位与 MCP2/Identity 门状态可追溯", async () => {
  const record = await readJson(recordPath);
  const gates = await readJson("docs/research/one-step-garden-blender-mcp-gates.json");

  for (const preview of Object.values(record.outputs.previews)) {
    const buffer = await readFile(path.join(root, preview.path));
    assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(await sha256(preview.path), preview.sha256);
    assert.equal((await stat(path.join(root, preview.path))).size, preview.bytes);
    assert.deepEqual([buffer.readUInt32BE(16), buffer.readUInt32BE(20)], [1024, 768]);
    assert.match(preview.path, /_mcp2_recheck_fixed_/);
  }
  for (const failed of Object.values(record.mcp2.firstAttempt.failedEvidence)) {
    const buffer = await readFile(path.join(root, failed.path));
    assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(await sha256(failed.path), failed.sha256);
    assert.equal((await stat(path.join(root, failed.path))).size, failed.bytes);
    assert.deepEqual([buffer.readUInt32BE(16), buffer.readUInt32BE(20)], [1024, 768]);
    assert.doesNotMatch(failed.path, /_mcp2_recheck_fixed_/);
  }
  for (const passed of Object.values(record.mcp2.rereview.fixedEvidence)) {
    const buffer = await readFile(path.join(root, passed.path));
    assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(await sha256(passed.path), passed.sha256);
    assert.equal((await stat(path.join(root, passed.path))).size, passed.bytes);
    assert.deepEqual([buffer.readUInt32BE(16), buffer.readUInt32BE(20)], [1024, 768]);
    assert.match(passed.path, /_mcp2_rereview_/);
  }
  assert.deepEqual(record.fixedCameras.canonical.location, [13.5, -23.5, 14]);
  assert.deepEqual(record.fixedCameras.sideDepth.location, [-22, -4, 15.5]);
  assert.deepEqual(record.fixedCameras.entrance.location, [7, -18.5, 8.5]);
  assert.equal(record.determinism.sameCommandRuns, 2);
  assert.equal(record.determinism.sameGlbSha256, true);
  assert.equal(record.mcp2.status, "pass");
  assert.equal(record.mcp2.rereview.status, "pass");
  assert.equal(
    record.mcp2.rereview.reviewedSource.editableSourceSha256,
    record.outputs.blend.sha256,
  );
  assert.equal(
    record.mcp2.rereview.reviewedSource.runtimeAssetSha256,
    record.outputs.glb.sha256,
  );
  assert.equal(record.mcp2.rereview.sceneInspection.vertices, 2396);
  assert.equal(record.mcp2.rereview.sceneInspection.polygons, 1802);
  assert.equal(record.mcp2.rereview.materials.useNodesCount, 7);
  assert.equal(record.mcp2.rereview.geometryChecks.areaBelow1eMinus10, 0);
  assert.equal(record.mcp2.rereview.geometryChecks.nonFiniteNormals, 0);
  assert.deepEqual(record.mcp2.rereview.acceptedInteractiveChanges, []);
  assert.equal(record.mcp2.rereview.qaRigSaved, false);
  assert.equal(record.mcp2.rereview.qaRigExported, false);
  assert.equal(record.mcp2.firstAttempt.status, "blocked");
  assert.deepEqual(record.mcp2.firstAttempt.acceptedInteractiveChanges, []);
  assert.equal(record.mcp2.firstAttempt.qaRigSaved, false);
  assert.equal(gates.heroGate.status, "pass");
  assert.equal(gates.heroGate.mcp2Rereview.status, "pass");
  assert.equal(
    gates.heroGate.mcp2Rereview.editableSource.sha256,
    record.outputs.blend.sha256,
  );
  assert.equal(
    gates.heroGate.mcp2Rereview.runtimeAsset.sha256,
    record.outputs.glb.sha256,
  );
  assert.equal(gates.heroGate.candidate.glbSha256, record.glb.sha256);
  assert.equal(
    gates.identityGate.status,
    "authorized-but-paused-for-main-window-gate-checkpoint-integration",
  );
  assert.equal(gates.identityGate.identityDerivationAuthorized, true);
  assert.equal(gates.identityGate.identityDerivationStarted, false);
});
