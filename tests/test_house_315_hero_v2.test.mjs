import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recordPath = "docs/research/build-records/tiers/xinhua-road/hero-v2/house-315-hero.json";

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
  let primitivesWithoutNormals = 0;
  let zeroLengthNormals = 0;
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

      if (!normals) primitivesWithoutNormals += 1;
      for (const position of positions) {
        if (position.some((value) => !Number.isFinite(value))) {
          nonFinitePositions += 1;
        }
      }
      for (const normal of normals ?? []) {
        const magnitude = length(normal);
        if (magnitude <= 1e-8) zeroLengthNormals += 1;
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
    primitivesWithoutNormals,
    zeroLengthNormals,
    nonUnitNormals,
    orientationMismatches,
  };
}

test("House315 Hero v2 使用独立路径并保留旧 Hero Hold 与公共 registry", async () => {
  const record = await readJson(recordPath);
  const registry = await readJson("app/scene/xinhua-road-landmarks-data.json");
  const landmark = registry.landmarks.find(({ id }) => id === "house-315");

  assert.equal(
    record.status,
    "hero-mcp2-identity-v1-mcp3-pass-runtime-pending",
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
  assert.equal(record.legacyHeroHold.geometryReused, false);
  assert.equal(record.legacyHeroHold.overwritten, false);
  assert.equal(record.legacyHeroHold.deleted, false);
  assert.equal(record.publicRegistry.modified, false);
  assert.equal(landmark.model, "/models/xinhua-road/house-315.glb");
  assert.equal(landmark.cacheVersion, "20260718-detail-1");
  assert.equal(record.identityAllowed, true);
  assert.equal(record.mcp2.status, "pass");
  assert.equal(record.mcp2.passed, true);
  assert.equal(record.mcp2.acceptedInteractiveChanges.length, 0);
  assert.equal(record.mcp2.qaRigSaved, false);
  assert.equal(record.mcp2.qaRigExported, false);
  assert.equal(record.identityLineage.identityDerivationAuthorized, true);
  assert.equal(record.identityLineage.identityDerivationStarted, true);
  assert.equal(record.identityLineage.identityCandidateCompleted, true);
  assert.equal(record.identityLineage.identityFormalPass, true);
  assert.equal(record.identityLineage.runtimeAuthorized, true);
  assert.equal(record.identityLineage.runtimeExecutionStarted, false);
  assert.equal(record.publicRegistry.modified, false);
});

test("House315 Hero v2 MCP2 主窗口证据和门禁状态闭合", async () => {
  const record = await readJson(recordPath);
  const gates = await readJson("docs/research/house-315-blender-mcp-gates.json");
  const disposition = await readJson("docs/research/house-315-hero-disposition.json");

  assert.equal(record.mcp2.sourceCommit, "e258a02a9ace4dbc34ce2978dcadcb4112370939");
  assert.equal(record.mcp2.sceneInspection.meshObjects, 1);
  assert.equal(record.mcp2.sceneInspection.vertices, 1960);
  assert.equal(record.mcp2.sceneInspection.polygons, 1472);
  assert.equal(record.mcp2.sceneInspection.principledNodeMaterials, 6);
  assert.equal(record.mcp2.sceneInspection.zeroAreaPolygonsBelow1e10, 0);
  assert.equal(record.mcp2.sceneInspection.nonFiniteNormals, 0);
  assert.equal(record.mcp2.sceneInspection.minimumFaceArea, 0.001224979);
  assert.equal(record.mcp2.lineageInspection.legacyHeroGeometryUsed, false);
  assert.equal(record.mcp2.lineageInspection.recoveryGeometryUsed, false);
  assert.equal(record.mcp2.lineageInspection.ordinaryOsmGeometryUsed, false);

  for (const preview of Object.values(record.mcp2.fixedViews)) {
    assert.equal(await sha256(preview.path), preview.sha256);
    assert.equal((await stat(path.join(root, preview.path))).size, preview.bytes);
    assert.deepEqual(preview.dimensions, [1024, 768]);
  }

  assert.equal(gates.heroGate.status, "pass");
  assert.equal(gates.heroGate.identityDerivationAuthorized, true);
  assert.equal(gates.identityGate.identityDerivationAuthorized, true);
  assert.equal(gates.identityGate.identityDerivationStarted, true);
  assert.equal(gates.identityGate.identityCandidateCompleted, true);
  assert.equal(gates.identityGate.identityFormalPass, true);
  assert.equal(gates.identityGate.runtimeExecutionStarted, false);
  assert.equal(
    disposition.activeReplacementStatus,
    "hero-v2-mcp2-pass-identity-v1-mcp3-pass-runtime-pending",
  );
  assert.equal(disposition.replacementCandidate.mcp2.status, "pass");
  assert.equal(disposition.replacementCandidate.legacyHeroOverwritten, false);
  assert.equal(disposition.replacementCandidate.identityLineage.identityDerivationStarted, true);
  assert.equal(disposition.replacementCandidate.identityLineage.identityCandidateCompleted, true);
  assert.equal(disposition.replacementCandidate.identityLineage.identityFormalPass, true);
  assert.equal(disposition.replacementCandidate.identityLineage.runtimeExecutionStarted, false);
  assert.equal(disposition.replacementCandidate.publicRegistryModified, false);
  assert.equal(disposition.replacementCandidate.runtimeIntegrated, false);
});

test("House315 Hero v2 精确继承 Massing origin、bounds、碰撞与固定机位", async () => {
  const record = await readJson(recordPath);
  const massing = await readJson(
    "docs/research/build-records/tiers/xinhua-road/massing-v2/house-315-massing.json",
  );
  const mapQa = await readJson("docs/research/house-315-massing-map-qa.json");

  assert.equal(record.derivedFrom.runtimeAssetSha256, massing.glb.sha256);
  assert.equal(
    record.derivedFrom.editableSourceSha256,
    massing.blendSceneAudit.sha256,
  );
  assert.equal(record.originContract.authoredFront, "local-negative-y");
  assert.equal(record.originContract.sceneUnitMeters, 2.7);
  assert.equal(record.originContract.groundDatum, 0);
  assert.deepEqual(record.originContract.runtimePosition, [-23.03, 85.67]);
  assert.equal(record.originContract.runtimeYaw, -0.38);
  assert.equal(record.originContract.runtimeScale, 0.9);
  assert.deepEqual(record.originContract.fixedCameras, massing.fixedCameras);
  assert.deepEqual(
    record.collisionContract.localBounds,
    mapQa.integrationRecommendation.localBounds,
  );
  assert.deepEqual(
    record.collisionContract.localObstacles,
    mapQa.integrationRecommendation.localObstacles,
  );
  assert.equal(record.collisionContract.sameAsMassing, true);
  assert.equal(record.collisionContract.entranceAndFrontRecessRemainOpen, true);
});

test("House315 Hero v2 GLB 结构、拓扑、法线、bounds 与预算通过独立复算", async () => {
  const record = await readJson(recordPath);
  const glbPath = record.outputs.glb.path;
  const buffer = await readFile(path.join(root, glbPath));
  const { json, binary } = parseGlb(buffer);
  const geometry = auditGeometry(json, binary);
  const rootNode = json.nodes[json.scenes[json.scene ?? 0].nodes[0]];
  const materialNames = new Set(
    json.materials.map((material) => material.name),
  );

  assert.equal(await sha256(glbPath), record.outputs.glb.sha256);
  assert.equal(buffer.length, record.outputs.glb.bytes);
  assert.equal(json.nodes.length, 1);
  assert.equal(json.meshes.length, 1);
  assert.equal(json.materials.length, 6);
  assert.equal(json.images?.length ?? 0, 0);
  assert.equal(json.textures?.length ?? 0, 0);
  assert.equal(json.animations?.length ?? 0, 0);
  assert.equal(json.skins?.length ?? 0, 0);
  assert.equal(rootNode.translation, undefined);
  assert.equal(rootNode.rotation, undefined);
  assert.equal(rootNode.scale, undefined);
  assert.deepEqual(materialNames, new Set([
    "house-315-hero-warm-roughcast",
    "house-315-hero-muted-red-brick",
    "house-315-hero-dark-red-tile",
    "house-315-hero-deep-half-timber",
    "house-315-hero-muted-glass",
    "house-315-hero-entrance-shadow",
  ]));
  assert.deepEqual(geometry, {
    triangles: 2936,
    zeroAreaTriangles: 0,
    nonFinitePositions: 0,
    invalidIndices: 0,
    primitivesWithoutNormals: 0,
    zeroLengthNormals: 0,
    nonUnitNormals: 0,
    orientationMismatches: 0,
  });
  assert.deepEqual(record.glb.bounds, {
    min: [-7.675, 0, -4.575],
    max: [7.225, 6.982892, 4.84],
  });
  assert(record.glb.triangles <= record.budget.maxTriangles);
  assert(record.glb.bytes <= record.budget.maxBytes);
  assert.equal(record.determinism.independentCleanSceneBuilds, 2);
  assert.equal(record.determinism.sameGlbSha256, true);
  assert.equal(
    record.determinism.firstGlbSha256,
    record.determinism.secondGlbSha256,
  );
});

test("House315 Hero v2 `.blend`、固定预览和建筑-only 范围合同闭合", async () => {
  const record = await readJson(recordPath);
  assert.equal(
    await sha256(record.outputs.blend.path),
    record.outputs.blend.sha256,
  );
  assert.deepEqual(record.blendSceneAudit.rootLocation, [0, 0, 0]);
  assert.deepEqual(record.blendSceneAudit.rootRotationEuler, [0, 0, 0]);
  assert.deepEqual(record.blendSceneAudit.rootScale, [1, 1, 1]);
  assert.equal(record.blendSceneAudit.zeroAreaPolygonsBelow1e10, 0);
  assert.equal(record.blendSceneAudit.zeroAreaTrianglesBelow1e10, 0);
  assert.equal(record.blendSceneAudit.nonFinitePositions, 0);
  assert.equal(record.blendSceneAudit.nonFinitePolygonNormals, 0);
  assert.equal(record.blendSceneAudit.trianglePolygonOrientationMismatches, 0);
  assert.equal(record.scope.buildingOnly, true);
  assert(record.scope.forbiddenContentAbsent.includes("trees"));
  assert(record.scope.forbiddenContentAbsent.includes("garden slab"));
  assert(record.scope.forbiddenContentAbsent.includes("decorative paving"));

  for (const preview of Object.values(record.outputs.previews)) {
    assert.equal(await sha256(preview.path), preview.sha256);
    assert.equal((await stat(path.join(root, preview.path))).size, preview.bytes);
  }
});
