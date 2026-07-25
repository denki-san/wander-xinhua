import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dispositionPath = "docs/research/one-step-garden-hero-disposition.json";

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
  throw new Error(`不支持的 accessor componentType：${type}`);
}

function readAccessor(json, binary, accessorIndex) {
  const accessor = json.accessors[accessorIndex];
  assert.equal(accessor.sparse, undefined, "审计目标不应使用 sparse accessor");
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

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function auditTriangles(json, binary) {
  let triangles = 0;
  let zeroAreaTriangles = 0;
  let normalOrientationMismatches = 0;
  const zeroAreaByMaterial = {};
  const mismatchByMaterial = {};

  for (const mesh of json.meshes) {
    for (const primitive of mesh.primitives) {
      assert.equal(primitive.mode ?? 4, 4);
      const positions = readAccessor(json, binary, primitive.attributes.POSITION);
      const normals = readAccessor(json, binary, primitive.attributes.NORMAL);
      const indices = readAccessor(json, binary, primitive.indices).flat();
      const material = json.materials[primitive.material].name;
      zeroAreaByMaterial[material] ??= 0;
      mismatchByMaterial[material] ??= 0;

      for (let index = 0; index < indices.length; index += 3) {
        triangles += 1;
        const triangle = indices.slice(index, index + 3);
        const [a, b, c] = triangle.map((vertex) => positions[vertex]);
        const face = cross(subtract(b, a), subtract(c, a));
        const doubleArea = length(face);
        if (doubleArea <= 1e-10) {
          zeroAreaTriangles += 1;
          zeroAreaByMaterial[material] += 1;
          continue;
        }
        const averageNormal = triangle.reduce(
          (sum, vertex) => sum.map((value, axis) => value + normals[vertex][axis]),
          [0, 0, 0],
        );
        const averageLength = length(averageNormal);
        if (averageLength > 1e-8 && dot(face, averageNormal) / (doubleArea * averageLength) < -1e-4) {
          normalOrientationMismatches += 1;
          mismatchByMaterial[material] += 1;
        }
      }
    }
  }
  return {
    triangles,
    zeroAreaTriangles,
    normalOrientationMismatches,
    zeroAreaByMaterial,
    mismatchByMaterial,
  };
}

test("一号花园旧 Hero 冻结为 Hold，公共 registry 与 Identity 授权保持不变", async () => {
  const disposition = await readJson(dispositionPath);
  const gates = await readJson("docs/research/one-step-garden-blender-mcp-gates.json");
  const registry = await readJson("app/scene/xinhua-road-landmarks-data.json");
  const landmark = registry.landmarks.find(({ id }) => id === "one-step-garden");

  assert.equal(disposition.status, "blocked-not-mcp2-candidate-rebuild-required");
  assert.equal(disposition.auditMode, "read-only-no-rebuild-no-blender-mcp");
  assert.equal(disposition.decision.mcp2Candidate, false);
  assert.equal(disposition.decision.mcp2Requested, false);
  assert.equal(disposition.decision.identityAuthorized, false);
  assert.equal(disposition.decision.legacyHeroDisposition, "hold-read-only-rollback-only");
  assert.equal(gates.heroGate.status, "blocked-rebuild-required-before-mcp2");
  assert.equal(gates.heroGate.legacyHeroMcp2Candidate, false);
  assert.equal(gates.identityGate.legacyHeroMayBeIdentitySource, false);
  assert.equal(landmark.model, "/models/xinhua-road/one-step-garden.glb");
  assert.equal(landmark.cacheVersion, "20260718-detail-1");
});

test("一号花园旧 Hero 二进制与生产 lineage SHA 被精确冻结", async () => {
  const { legacyHero } = await readJson(dispositionPath);
  assert.equal(
    await sha256(legacyHero.editableSource.path),
    legacyHero.editableSource.sha256,
  );
  assert.equal(
    (await stat(path.join(root, legacyHero.editableSource.path))).size,
    legacyHero.editableSource.bytes,
  );
  assert.equal(
    await sha256(legacyHero.runtimeAsset.path),
    legacyHero.runtimeAsset.sha256,
  );
  assert.equal(
    (await stat(path.join(root, legacyHero.runtimeAsset.path))).size,
    legacyHero.runtimeAsset.bytes,
  );
  assert.equal(
    await sha256(legacyHero.generator.path),
    legacyHero.generator.currentSha256,
  );
  assert.equal(legacyHero.atomicLineage.producingCommit, "e292fde194c2704a9eeaf7e4a8faf192a5d0385e");
  assert.equal(legacyHero.atomicLineage.binaryAssetsUnchangedSinceProducingCommit, true);
});

test("一号花园旧 Hero generator 明确含误绑体量与范围外合并内容", async () => {
  const disposition = await readJson(dispositionPath);
  const source = await readFile(
    path.join(root, disposition.legacyHero.generator.path),
    "utf8",
  );
  const functionSource = source.match(
    /def build_one_step_garden\(\) -> None:\n.*?(?=\ndef add_small_villa\()/s,
  )?.[0];
  assert.ok(functionSource);
  assert.match(functionSource, /add_box\("garden-main"/);
  assert.match(functionSource, /add_box\("garden-wing"/);
  assert.doesNotMatch(functionSource, /garden-rear-red-brick|garden-shed-dormer/);
  for (const pattern of [
    /garden-shrub-/,
    /garden-cafe-a/,
    /garden-cafe-c/,
    /garden-planter-left/,
    /garden-lamp-/,
    /garden-fence-left/,
    /garden-sign/,
    /garden-name/,
    /garden-paving-detail/,
  ]) {
    assert.match(functionSource, pattern);
  }
  assert.equal(disposition.subjectAudit.status, "fail");
  assert.equal(disposition.scopePollution.status, "fail-baked-into-single-runtime-mesh");
  assert.equal(disposition.scopePollution.selectiveRuntimeRemovalPossible, false);
});

test("一号花园旧 Hero GLB 的退化面、法线与材质 blocker 可重复计算", async () => {
  const disposition = await readJson(dispositionPath);
  const glb = await readFile(path.join(root, disposition.legacyHero.runtimeAsset.path));
  const { json, binary } = parseGlb(glb);
  const audit = auditTriangles(json, binary);
  const rootNode = json.nodes[json.scenes[json.scene ?? 0].nodes[0]];

  assert.equal(json.nodes.length, 1);
  assert.equal(json.meshes.length, 1);
  assert.equal(json.meshes[0].primitives.length, 14);
  assert.equal(json.materials.length, 14);
  assert.equal(json.images?.length ?? 0, 0);
  assert.equal(json.textures?.length ?? 0, 0);
  assert.equal(rootNode.translation, undefined);
  assert.equal(rootNode.rotation, undefined);
  assert.equal(rootNode.scale, undefined);
  assert.equal(rootNode.matrix, undefined);
  assert.equal(audit.triangles, disposition.glbAudit.structure.triangles);
  assert.equal(
    audit.zeroAreaTriangles,
    disposition.glbAudit.topology.zeroAreaTriangles,
  );
  assert.equal(
    audit.normalOrientationMismatches,
    disposition.glbAudit.normals.faceVertexOrientationMismatches,
  );
  assert.equal(audit.zeroAreaByMaterial["一尺花园木构"], 96);
  assert.equal(audit.zeroAreaByMaterial["一尺花园金属"], 24);
  assert.equal(audit.zeroAreaByMaterial["一尺花园户外木"], 576);
  assert.equal(audit.mismatchByMaterial["一尺花园庭院灯"], 19);
  assert.equal(disposition.glbAudit.briefBudget.materials, "fail-14-exceeds-12");
});

test("一号花园旧 Hero 只有错误单体的通用预览，不构成 MCP2 固定机位证据", async () => {
  const { fixedViewAudit } = await readJson(dispositionPath);
  const preview = await readFile(path.join(root, fixedViewAudit.legacyGenericPreview.path));
  const runtime = await readFile(path.join(root, fixedViewAudit.legacyRuntimeComparison.path));

  assert.equal(preview.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(await sha256(fixedViewAudit.legacyGenericPreview.path), fixedViewAudit.legacyGenericPreview.sha256);
  assert.deepEqual([preview.readUInt32BE(16), preview.readUInt32BE(20)], [900, 700]);
  assert.equal(runtime.subarray(0, 3).toString("hex"), "ffd8ff");
  assert.equal(await sha256(fixedViewAudit.legacyRuntimeComparison.path), fixedViewAudit.legacyRuntimeComparison.sha256);
  assert.deepEqual(fixedViewAudit.missingViews, [
    "formal-canonical",
    "formal-side-depth",
    "formal-entrance-identity-detail",
    "same-camera-hero-vs-approved-massing",
  ]);
  assert.equal(fixedViewAudit.status, "fail-missing-required-view-set");
});
