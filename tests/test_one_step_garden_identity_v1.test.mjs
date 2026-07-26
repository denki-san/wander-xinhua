import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recordPath = "docs/research/build-records/tiers/xinhua-road/identity-v1/one-step-garden-identity.json";
const lineagePath = "docs/research/one-step-garden-tier-lineage.json";

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
      const normals = primitive.attributes.NORMAL === undefined
        ? null
        : readAccessor(json, binary, primitive.attributes.NORMAL);
      const indices = primitive.indices === undefined
        ? positions.map((_, index) => index)
        : readAccessor(json, binary, primitive.indices).flat();

      if (!normals) missingNormals += 1;
      nonFinitePositions += positions.filter(
        (position) => position.some((value) => !Number.isFinite(value)),
      ).length;
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

test("一号花园 Identity v1 只从冻结且已通过 MCP2 的 Hero v2 派生", async () => {
  const record = await readJson(recordPath);
  const hero = await readJson(
    "docs/research/build-records/tiers/xinhua-road/hero-v2/one-step-garden-hero.json",
  );

  assert.equal(
    record.status,
    "identity-v1-mcp3-and-main-browser-runtime-pass",
  );
  assert.equal(record.tier, "identity");
  assert.equal(record.versionName, "identity-v1");
  assert.equal(record.generator.sha256, await sha256(record.generator.path));
  assert.equal(record.derivedFrom.heroMcp2, "pass");
  assert.equal(hero.mcp2.status, "pass");
  assert.equal(
    record.derivedFrom.heroGenerator.sha256,
    await sha256(record.derivedFrom.heroGenerator.path),
  );
  assert.equal(
    record.derivedFrom.heroEditableSource.sha256,
    await sha256(record.derivedFrom.heroEditableSource.path),
  );
  assert.equal(
    record.derivedFrom.heroRuntimeAsset.sha256,
    await sha256(record.derivedFrom.heroRuntimeAsset.path),
  );
  assert.equal(record.derivedFrom.heroGlbSha256, hero.outputs.glb.sha256);
  assert.equal(record.derivedFrom.heroBlendSha256, hero.outputs.blend.sha256);
  assert.equal(record.derivedFrom.heroGeneratorSha256, hero.generatorSha256);
  assert.equal(
    record.derivedFrom.massingGlbSha256,
    hero.derivedFrom.runtimeAssetSha256,
  );
});

test("一号花园 Identity v1 GLB 结构、PBR、拓扑、法线与包络独立复算通过", async () => {
  const record = await readJson(recordPath);
  const buffer = await readFile(path.join(root, record.outputs.glb.path));
  const { json, binary } = parseGlb(buffer);
  const geometry = auditGeometry(json, binary);
  const rootNode = json.nodes[json.scenes[json.scene ?? 0].nodes[0]];

  assert.equal(await sha256(record.outputs.glb.path), record.outputs.glb.sha256);
  assert.equal(buffer.length, record.outputs.glb.bytes);
  assert.equal(buffer.length, 112456);
  assert.equal(json.nodes.length, 1);
  assert.equal(json.meshes.length, 1);
  assert.equal(json.meshes[0].primitives.length, 6);
  assert.equal(json.materials.length, 6);
  assert.equal(json.images?.length ?? 0, 0);
  assert.equal(json.textures?.length ?? 0, 0);
  assert.equal(json.animations?.length ?? 0, 0);
  assert.equal(rootNode.translation, undefined);
  assert.equal(rootNode.rotation, undefined);
  assert.equal(rootNode.scale, undefined);
  assert.equal(rootNode.matrix, undefined);
  assert.equal(rootNode.extras.asset_id, "one-step-garden");
  assert.equal(rootNode.extras.tier, "identity");
  assert.equal(rootNode.extras.version, "identity-v1");
  assert.equal(
    rootNode.extras.derived_from_hero_glb_sha256,
    record.derivedFrom.heroGlbSha256,
  );
  assert.equal(rootNode.extras.mcp3_status, "pending-main-window");
  assert.equal(rootNode.extras.runtime_integrated, false);
  assert.deepEqual(record.glb.bounds, {
    min: [-7.25, 0, -9.325],
    max: [7.25, 6.25, 6.9],
  });
  assert.deepEqual(geometry, {
    triangles: 1484,
    zeroAreaTriangles: 0,
    nonFinitePositions: 0,
    invalidIndices: 0,
    missingNormals: 0,
    zeroNormals: 0,
    nonUnitNormals: 0,
    orientationMismatches: 0,
  });

  const expectedMaterials = {
    "one-step-garden-identity-warm-plaster": {
      baseColorFactor: [0.82, 0.78, 0.69, 1],
      roughnessFactor: 0.88,
      metallicFactor: 0,
    },
    "one-step-garden-identity-muted-brick": {
      baseColorFactor: [0.4, 0.16, 0.11, 1],
      roughnessFactor: 0.88,
      metallicFactor: 0,
    },
    "one-step-garden-identity-dark-tile-roof": {
      baseColorFactor: [0.12, 0.15, 0.15, 1],
      roughnessFactor: 0.88,
      metallicFactor: 0,
    },
    "one-step-garden-identity-deep-half-timber": {
      baseColorFactor: [0.045, 0.065, 0.06, 1],
      roughnessFactor: 0.88,
      metallicFactor: 0,
    },
    "one-step-garden-identity-window-frame": {
      baseColorFactor: [0.035, 0.085, 0.075, 1],
      roughnessFactor: 0.88,
      metallicFactor: 0,
    },
    "one-step-garden-identity-muted-glass": {
      baseColorFactor: [0.09, 0.19, 0.18, 1],
      roughnessFactor: 0.38,
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
});

test("一号花园 Identity v1 显著低于 Hero 预算且 double clean build 稳定", async () => {
  const record = await readJson(recordPath);
  const hero = await readJson(
    "docs/research/build-records/tiers/xinhua-road/hero-v2/one-step-garden-hero.json",
  );
  const { contract } = record.budgets;

  assert.equal(record.glb.triangles, 1484);
  assert.equal(record.glb.bytes, 112456);
  assert.ok(record.glb.triangles <= contract.maxTriangles);
  assert.ok(record.glb.bytes <= contract.maxBytes);
  assert.ok(record.glb.nodes <= contract.maxNodes);
  assert.ok(record.glb.meshes <= contract.maxMeshes);
  assert.ok(record.glb.materials <= contract.maxMaterials);
  assert.equal(record.glb.images, contract.maxImages);
  assert.equal(record.glb.textures, contract.maxTextures);
  assert.equal(record.glb.animations, contract.maxAnimations);
  assert.ok(record.glb.triangles < hero.glb.triangles * 0.60);
  assert.ok(record.glb.bytes < hero.glb.bytes * 0.80);
  assert.equal(
    round6(1 - record.glb.triangles / hero.glb.triangles),
    record.budgets.triangleReductionRatio,
  );
  assert.equal(
    round6(1 - record.glb.bytes / hero.glb.bytes),
    record.budgets.byteReductionRatio,
  );
  assert.equal(record.budgets.status, "pass");
  assert.equal(record.determinism.sameCommandRuns, 2);
  assert.equal(record.determinism.sameGlbSha256, true);
});

test("一号花园 Identity v1 三固定机位与可编辑 Blend 证据逐项冻结", async () => {
  const record = await readJson(recordPath);
  const hero = await readJson(
    "docs/research/build-records/tiers/xinhua-road/hero-v2/one-step-garden-hero.json",
  );

  assert.equal(
    await sha256(record.outputs.blend.path),
    record.outputs.blend.sha256,
  );
  assert.equal(
    (await stat(path.join(root, record.outputs.blend.path))).size,
    record.outputs.blend.bytes,
  );
  for (const cameraName of ["canonical", "sideDepth", "entrance"]) {
    assert.deepEqual(
      record.fixedCameras[cameraName],
      {
        location: hero.fixedCameras[cameraName].location,
        target: hero.fixedCameras[cameraName].target,
        orthoScale: hero.fixedCameras[cameraName].orthoScale,
      },
    );
  }
  assert.equal(record.blendSceneAudit.objectCount, 1);
  assert.deepEqual(record.blendSceneAudit.objects, ["one-step-garden-identity"]);
  assert.equal(record.blendSceneAudit.vertices, 996);
  assert.equal(record.blendSceneAudit.polygons, 752);
  assert.equal(record.blendSceneAudit.materialCount, 6);
  assert.equal(record.blendSceneAudit.allMaterialsUseNodes, true);
  assert.deepEqual(record.blendSceneAudit.rootLocation, [0, 0, 0]);
  assert.deepEqual(record.blendSceneAudit.rootRotation, [0, 0, 0]);
  assert.deepEqual(record.blendSceneAudit.rootScale, [1, 1, 1]);
  assert.equal(record.blendSceneAudit.previewHelpersSaved, false);
  assert.equal(record.blendSceneAudit.previewHelpersExported, false);

  for (const preview of Object.values(record.outputs.previews)) {
    const buffer = await readFile(path.join(root, preview.path));
    assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(await sha256(preview.path), preview.sha256);
    assert.equal((await stat(path.join(root, preview.path))).size, preview.bytes);
    assert.deepEqual([buffer.readUInt32BE(16), buffer.readUInt32BE(20)], [1024, 768]);
    assert.match(preview.path, /test_one-step-garden-identity-v1-/);
  }
});

test("一号花园 Identity v1 保留身份构件并严格排除范围外生成内容", async () => {
  const record = await readJson(recordPath);
  const source = await readFile(path.join(root, record.generator.path), "utf8");
  const buildGeometry = source.match(
    /def build_identity\(hero: ModuleType\) -> bpy\.types\.Object:\n.*?(?=\n    obj = hero\.join_objects)/s,
  )?.[0];
  assert.ok(buildGeometry);

  for (const required of [
    /identity-front-left-street-gable-infill/,
    /identity-front-right-street-timber/,
    /identity-front-shed-dormer-window-/,
    /identity-front-open-entry-canopy/,
    /identity-rear-brick-long-volume/,
    /identity-rear-left-gable-brick-infill/,
    /identity-rear-right-gable-brick-infill/,
    /identity-rear-brick-central-tall-chimney/,
    /identity-rear-brick-left-chimney/,
  ]) {
    assert.match(buildGeometry, required);
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
    /garden-tree/,
    /garden-grass/,
  ]) {
    assert.doesNotMatch(buildGeometry, forbidden);
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
});

test("一号花园 Identity v1 MCP3 通过并只授权正式三档运行时", async () => {
  const record = await readJson(recordPath);
  const lineage = await readJson(lineagePath);
  const gates = await readJson("docs/research/one-step-garden-blender-mcp-gates.json");
  const disposition = await readJson("docs/research/one-step-garden-hero-disposition.json");
  const registry = await readJson("app/scene/xinhua-road-landmarks-data.json");
  const landmark = registry.landmarks.find(({ id }) => id === "one-step-garden");

  for (const preview of Object.values(record.outputs.mcp3Previews)) {
    const buffer = await readFile(path.join(root, preview.path));
    assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(await sha256(preview.path), preview.sha256);
    assert.equal((await stat(path.join(root, preview.path))).size, preview.bytes);
    assert.deepEqual(
      [buffer.readUInt32BE(16), buffer.readUInt32BE(20)],
      preview.dimensions,
    );
    assert.match(preview.path, /_mcp3_recheck_/);
  }
  assert.equal(record.mcp3.status, "pass");
  assert.equal(record.mcp3.identityFormalPass, true);
  assert.equal(record.mcp3.sourceCommit, "f1029cc4b93565d461a69eceebc7b45207c2b6ad");
  assert.equal(record.mcp3.reviewedSource.runtimeAssetSha256, record.glb.sha256);
  assert.equal(record.mcp3.reviewedSource.derivedHeroGlbSha256, record.derivedFrom.heroGlbSha256);
  assert.equal(record.mcp3.reviewedSource.rootExtrasMcp3StatusAtBuild, "pending-main-window");
  assert.equal(record.mcp3.reviewedSource.postBuildGateDoesNotRewriteReviewedBinary, true);
  assert.equal(record.mcp3.sceneInspection.vertices, 996);
  assert.equal(record.mcp3.sceneInspection.polygons, 752);
  assert.equal(record.mcp3.sceneInspection.materials, 6);
  assert.equal(record.mcp3.geometryInspection.areaBelow1eMinus10, 0);
  assert.equal(record.mcp3.geometryInspection.nonFiniteNormals, 0);
  assert.deepEqual(record.mcp3.acceptedInteractiveChanges, []);
  assert.equal(record.mcp3.qaRigSaved, false);
  assert.equal(record.mcp3.qaRigExported, false);
  assert.equal(record.mcp3.runtimeAuthorized, true);
  assert.equal(record.mcp3.runtimeExecutionPausedForMainWindowGateIntegration, true);
  assert.equal(
    record.runtime.status,
    "runtime-candidate-implemented-main-window-browser-final-pending",
  );
  assert.equal(record.runtime.runtimeCandidateImplemented, true);
  assert.equal(record.runtime.publicRegistryModified, true);
  assert.equal(record.runtime.runtimeIntegrated, true);
  assert.equal(record.runtime.mainWindowIntegrated, false);
  assert.equal(record.runtime.mainWindowBrowserFinal, "pending");
  assert.equal(
    lineage.status,
    "complete-three-tier-runtime-main-browser-pass",
  );
  assert.equal(lineage.threeTierGate.formalPass, true);
  assert.equal(lineage.tiers.identity.gates.mcp3, "pass");
  assert.equal(lineage.terminalBlenderGate.status, "pass");
  assert.equal(gates.identityGate.status, "pass");
  assert.equal(gates.identityGate.identityDerivationStarted, true);
  assert.equal(gates.identityGate.identityCandidateCompleted, true);
  assert.equal(gates.identityGate.identityFormalPass, true);
  assert.equal(gates.identityGate.runtimeAuthorized, true);
  assert.equal(gates.threeTierGate.status, "pass");
  assert.equal(gates.threeTierGate.formalPass, true);
  assert.equal(
    disposition.replacementCandidate.identityLineage.runtimeAsset.sha256,
    record.outputs.glb.sha256,
  );
  assert.equal(disposition.replacementCandidate.identityLineage.mcp3, "pass");
  assert.equal(disposition.replacementCandidate.identityLineage.identityFormalPass, true);
  assert.equal(disposition.replacementCandidate.identityLineage.runtimeAuthorized, true);
  assert.equal(disposition.legacyHero.atomicLineage.binaryAssetsUnchangedSinceProducingCommit, true);
  assert.equal(
    landmark.model,
    "/models/tiers/xinhua-road/hero-v2/one-step-garden-hero.glb",
  );
  assert.equal(landmark.cacheVersion, "20260725-hero-026565ba");
});
