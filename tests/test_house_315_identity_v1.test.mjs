import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recordPath =
  "docs/research/build-records/tiers/xinhua-road/identity-v1/house-315-identity.json";
const lineagePath = "docs/research/house-315-tier-lineage.json";

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

function readAccessor(json, binary, index) {
  const accessor = json.accessors[index];
  assert.equal(accessor.sparse, undefined);
  const view = json.bufferViews[accessor.bufferView];
  const componentCount = componentCounts[accessor.type];
  const bytes = componentBytes[accessor.componentType];
  const stride = view.byteStride ?? componentCount * bytes;
  const base = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  return Array.from({ length: accessor.count }, (_, itemIndex) => (
    Array.from({ length: componentCount }, (_, componentIndex) => (
      readComponent(
        binary,
        base + itemIndex * stride + componentIndex * bytes,
        accessor.componentType,
      )
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

function length(value) {
  return Math.hypot(...value);
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
      const positions = readAccessor(
        json,
        binary,
        primitive.attributes.POSITION,
      );
      const normals = primitive.attributes.NORMAL === undefined
        ? null
        : readAccessor(json, binary, primitive.attributes.NORMAL);
      const indices = primitive.indices === undefined
        ? positions.map((_, index) => index)
        : readAccessor(json, binary, primitive.indices).flat();

      if (!normals) missingNormals += 1;
      for (const position of positions) {
        if (position.some((value) => !Number.isFinite(value))) {
          nonFinitePositions += 1;
        }
      }
      for (const normal of normals ?? []) {
        const magnitude = length(normal);
        if (magnitude <= 1e-8) zeroNormals += 1;
        else if (Math.abs(magnitude - 1) > 1e-4) nonUnitNormals += 1;
      }
      for (let offset = 0; offset < indices.length; offset += 3) {
        const triangle = indices.slice(offset, offset + 3);
        if (
          triangle.length !== 3
          || triangle.some((index) => index < 0 || index >= positions.length)
        ) {
          invalidIndices += 1;
          continue;
        }
        triangles += 1;
        const [a, b, c] = triangle.map((index) => positions[index]);
        const face = cross(subtract(b, a), subtract(c, a));
        const doubleArea = length(face);
        if (doubleArea <= 1e-10) {
          zeroAreaTriangles += 1;
          continue;
        }
        if (normals) {
          const averageNormal = triangle.reduce(
            (sum, index) => sum.map(
              (value, axis) => value + normals[index][axis],
            ),
            [0, 0, 0],
          );
          const averageLength = length(averageNormal);
          if (averageLength > 1e-8) {
            const alignment = face.reduce(
              (sum, value, axis) => sum + value * averageNormal[axis],
              0,
            ) / (doubleArea * averageLength);
            if (alignment < -1e-4) orientationMismatches += 1;
          }
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

test("House315 Identity v1 只从冻结且已通过 MCP2 的 Hero v2 派生", async () => {
  const record = await readJson(recordPath);
  const hero = await readJson(
    "docs/research/build-records/tiers/xinhua-road/hero-v2/house-315-hero.json",
  );

  assert.equal(record.status, "candidate-awaiting-main-window-mcp3");
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
  assert.match(record.derivedFrom.method, /sha-pinned-hero-generator-subset/);
});

test("House315 Identity v1 GLB 结构、PBR、拓扑、法线和 bounds 独立复算通过", async () => {
  const record = await readJson(recordPath);
  const buffer = await readFile(path.join(root, record.outputs.glb.path));
  const { json, binary } = parseGlb(buffer);
  const geometry = auditGeometry(json, binary);
  const rootNode = json.nodes[json.scenes[json.scene ?? 0].nodes[0]];

  assert.equal(await sha256(record.outputs.glb.path), record.outputs.glb.sha256);
  assert.equal(buffer.length, record.outputs.glb.bytes);
  assert.equal(buffer.length, 62288);
  assert.equal(json.nodes.length, 1);
  assert.equal(json.meshes.length, 1);
  assert.equal(json.meshes[0].primitives.length, 6);
  assert.equal(json.materials.length, 6);
  assert.equal(json.images?.length ?? 0, 0);
  assert.equal(json.textures?.length ?? 0, 0);
  assert.equal(json.animations?.length ?? 0, 0);
  assert.equal(json.skins?.length ?? 0, 0);
  assert.equal(rootNode.translation, undefined);
  assert.equal(rootNode.rotation, undefined);
  assert.equal(rootNode.scale, undefined);
  assert.equal(rootNode.matrix, undefined);
  assert.equal(rootNode.extras.stable_asset_id, "house-315");
  assert.equal(rootNode.extras.tier, "identity");
  assert.equal(rootNode.extras.version_name, "identity-v1");
  assert.equal(
    rootNode.extras.derived_from_hero_glb_sha256,
    record.derivedFrom.heroGlbSha256,
  );
  assert.equal(rootNode.extras.mcp3_status, "pending-main-window");
  assert.equal(rootNode.extras.runtime_integrated, false);
  assert.deepEqual(record.glb.bounds, {
    min: [-7.675, 0, -4.575],
    max: [7.225, 6.982892, 4.84],
  });
  assert.deepEqual(geometry, {
    triangles: 776,
    zeroAreaTriangles: 0,
    nonFinitePositions: 0,
    invalidIndices: 0,
    missingNormals: 0,
    zeroNormals: 0,
    nonUnitNormals: 0,
    orientationMismatches: 0,
  });
  assert.deepEqual(
    new Set(json.materials.map(({ name }) => name)),
    new Set([
      "house-315-identity-warm-roughcast",
      "house-315-identity-muted-red-brick",
      "house-315-identity-dark-red-tile",
      "house-315-identity-deep-half-timber",
      "house-315-identity-muted-glass",
      "house-315-identity-entrance-shadow",
    ]),
  );
});

test("House315 Identity v1 显著低于 Hero 且 double clean build 稳定", async () => {
  const record = await readJson(recordPath);
  const hero = await readJson(
    "docs/research/build-records/tiers/xinhua-road/hero-v2/house-315-hero.json",
  );
  const { contract } = record.budgets;

  assert.equal(record.glb.triangles, 776);
  assert.equal(record.glb.bytes, 62288);
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
  assert.equal(record.budgets.identityToHeroTriangleRatio, 0.264305);
  assert.equal(record.budgets.identityToHeroByteRatio, 0.292558);
  assert.equal(record.budgets.status, "pass");
  assert.equal(record.determinism.independentCleanSceneBuilds, 2);
  assert.equal(record.determinism.sameGlbSha256, true);
  assert.equal(
    record.determinism.firstGlbSha256,
    record.determinism.secondGlbSha256,
  );
});

test("House315 Identity v1 精确继承 cameras、placement、collision 和可编辑 Blend", async () => {
  const record = await readJson(recordPath);
  const hero = await readJson(
    "docs/research/build-records/tiers/xinhua-road/hero-v2/house-315-hero.json",
  );
  const lineage = await readJson(lineagePath);

  assert.equal(
    await sha256(record.outputs.blend.path),
    record.outputs.blend.sha256,
  );
  assert.equal(
    (await stat(path.join(root, record.outputs.blend.path))).size,
    record.outputs.blend.bytes,
  );
  assert.deepEqual(record.fixedCameras, hero.originContract.fixedCameras);
  assert.deepEqual(
    record.continuity.runtimePosition,
    hero.originContract.runtimePosition,
  );
  assert.equal(record.continuity.runtimeYaw, hero.originContract.runtimeYaw);
  assert.equal(record.continuity.runtimeScale, hero.originContract.runtimeScale);
  assert.deepEqual(
    record.continuity.localBounds,
    hero.collisionContract.localBounds,
  );
  assert.deepEqual(
    record.continuity.collision.localObstacles,
    hero.collisionContract.localObstacles,
  );
  assert.deepEqual(lineage.continuityContract.origin, [0, 0, 0]);
  assert.equal(lineage.threeTierGate.sameBounds, true);
  assert.equal(lineage.threeTierGate.sameCollisionSemantics, true);
  assert.equal(record.blendSceneAudit.objectCount, 1);
  assert.equal(record.blendSceneAudit.meshObjects, 1);
  assert.deepEqual(record.blendSceneAudit.rootLocation, [0, 0, 0]);
  assert.deepEqual(record.blendSceneAudit.rootRotationEuler, [0, 0, 0]);
  assert.deepEqual(record.blendSceneAudit.rootScale, [1, 1, 1]);
  assert.equal(record.blendSceneAudit.allMaterialsUseNodes, true);
  assert.equal(record.blendSceneAudit.zeroAreaPolygonsBelow1e10, 0);
});

test("House315 Identity v1 三固定机位和建筑-only 范围证据闭合", async () => {
  const record = await readJson(recordPath);
  const source = await readFile(path.join(root, record.generator.path), "utf8");
  const buildGeometry = source.match(
    /def build_identity\(\).*?(?=\n\ndef configure_scene)/s,
  )?.[0];
  assert.ok(buildGeometry);

  for (const required of [
    "house315-identity-central-tall-entry-glass",
    "house315-identity-central-timber-brace-left",
    "house315-identity-main-roof-ridge",
    "house315-identity-right-front-window-0-glass",
    "house315-identity-main-shed-dormer-body",
  ]) {
    assert.ok(record.scope.sourceComponents.includes(required));
  }
  for (const forbidden of [
    /garden-slab/,
    /garden-wall/,
    /garden-fence/,
    /street-gate-/,
    /garden-lamp/,
    /garden-planter/,
    /garden-paving/,
    /garden-tree/,
    /garden-shrub/,
    /garden-grass/,
    /outdoor-furniture-/,
    /commercial-sign-/,
  ]) {
    assert.doesNotMatch(buildGeometry, forbidden);
  }
  for (const component of record.scope.sourceComponents) {
    assert.doesNotMatch(
      component,
      /garden|wall|fence|gate|lamp|planter|paving|tree|shrub|grass|furniture|sign|osm/i,
    );
  }
  assert.ok(record.identityCues.preserved.length >= 3);
  assert.equal(record.identityCues.unknownRear, "held-at-low-detail");
  assert.ok(record.scope.excluded.includes("legacy Hero geometry"));
  assert.ok(record.scope.excluded.includes("Recovery geometry"));
  assert.ok(record.scope.excluded.includes("ordinary OSM"));
  assert.ok(record.scope.excluded.includes("trees"));
  assert.ok(record.scope.excluded.includes("other buildings"));

  for (const preview of Object.values(record.outputs.previews)) {
    const buffer = await readFile(path.join(root, preview.path));
    assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(await sha256(preview.path), preview.sha256);
    assert.equal((await stat(path.join(root, preview.path))).size, preview.bytes);
    assert.deepEqual([buffer.readUInt32BE(16), buffer.readUInt32BE(20)], [960, 720]);
    assert.match(preview.path, /test_house-315-identity-v1-/);
  }
});

test("House315 Identity v1 停在 MCP3 前且未修改公共 runtime", async () => {
  const record = await readJson(recordPath);
  const lineage = await readJson(lineagePath);
  const hero = await readJson(
    "docs/research/build-records/tiers/xinhua-road/hero-v2/house-315-hero.json",
  );
  const gates = await readJson("docs/research/house-315-blender-mcp-gates.json");
  const disposition = await readJson(
    "docs/research/house-315-hero-disposition.json",
  );
  const registry = await readJson("app/scene/xinhua-road-landmarks-data.json");
  const landmark = registry.landmarks.find(({ id }) => id === "house-315");

  assert.equal(
    record.mcp3.status,
    "pending-main-window-same-camera-three-tier-review",
  );
  assert.equal(record.mcp3.identityFormalPass, false);
  assert.equal(record.mcp3.acceptedInteractiveChanges.length, 0);
  assert.equal(record.mcp3.qaRigSaved, false);
  assert.equal(record.mcp3.qaRigExported, false);
  assert.equal(record.independentReview.status, "ready");
  assert.equal(record.independentReview.critical, 0);
  assert.equal(record.independentReview.important, 0);
  assert.equal(record.independentReview.minor, 0);
  assert.equal(record.independentReview.modelOrRuntimeModifiedByReview, false);
  assert.equal(record.runtime.status, "not-started-by-worktree");
  assert.equal(record.runtime.runtimeAuthorized, false);
  assert.equal(record.runtime.runtimeExecutionStarted, false);
  assert.equal(record.runtime.publicRegistryModified, false);
  assert.equal(record.runtime.runtimeIntegrated, false);
  assert.equal(lineage.status, "candidate-awaiting-main-window-mcp3");
  assert.equal(lineage.threeTierGate.formalPass, false);
  assert.equal(lineage.threeTierGate.independentReview.status, "ready");
  assert.equal(lineage.tiers.identity.gates.mcp3, "pending-main-window");
  assert.equal(lineage.runtime.runtimeExecutionStarted, false);
  assert.equal(
    hero.identityLineage.status,
    "identity-v1-candidate-awaiting-main-window-mcp3",
  );
  assert.equal(hero.identityLineage.identityDerivationStarted, true);
  assert.equal(hero.identityLineage.identityCandidateCompleted, true);
  assert.equal(hero.identityLineage.identityFormalPass, false);
  assert.equal(hero.identityLineage.runtimeAuthorized, false);
  assert.equal(hero.identityLineage.runtimeExecutionStarted, false);
  assert.equal(gates.identityGate.status, "candidate-awaiting-main-window-mcp3");
  assert.equal(gates.identityGate.identityCandidateCompleted, true);
  assert.equal(gates.identityGate.mcp3Status, "pending-main-window");
  assert.equal(gates.identityGate.identityFormalPass, false);
  assert.equal(gates.identityGate.runtimeAuthorized, false);
  assert.equal(gates.identityGate.runtimeExecutionStarted, false);
  assert.equal(gates.identityGate.candidate.independentReview.status, "ready");
  assert.equal(
    await sha256(gates.identityGate.candidate.editableSource.path),
    gates.identityGate.candidate.editableSource.sha256,
  );
  assert.equal(
    (await stat(path.join(
      root,
      gates.identityGate.candidate.editableSource.path,
    ))).size,
    gates.identityGate.candidate.editableSource.bytes,
  );
  assert.equal(gates.threeTierGate.status, "candidate-awaiting-main-window-mcp3");
  assert.equal(gates.threeTierGate.formalPass, false);
  assert.equal(
    disposition.activeReplacementStatus,
    "hero-v2-mcp2-pass-identity-v1-candidate-awaiting-mcp3",
  );
  assert.equal(
    disposition.replacementCandidate.identityLineage.mcp3,
    "pending-main-window",
  );
  assert.equal(
    disposition.replacementCandidate.identityLineage.identityFormalPass,
    false,
  );
  assert.equal(
    disposition.replacementCandidate.identityLineage.runtimeExecutionStarted,
    false,
  );
  assert.equal(
    await sha256(
      disposition.replacementCandidate.identityLineage.editableSource.path,
    ),
    disposition.replacementCandidate.identityLineage.editableSource.sha256,
  );
  assert.equal(disposition.replacementCandidate.publicRegistryModified, false);
  assert.equal(disposition.replacementCandidate.runtimeIntegrated, false);
  assert.equal(landmark.model, "/models/xinhua-road/house-315.glb");
  assert.equal(landmark.cacheVersion, "20260718-detail-1");
});
