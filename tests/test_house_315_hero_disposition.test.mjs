import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dispositionPath = "docs/research/house-315-hero-disposition.json";

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

test("House315 旧 Hero disposition 冻结旧资产并让公共 registry 指向验收后的替代资产", async () => {
  const record = await readJson(dispositionPath);
  const registry = await readJson("app/scene/xinhua-road-landmarks-data.json");
  const landmark = registry.landmarks.find(({ id }) => id === "house-315");

  assert.equal(
    record.status,
    "blocked-not-mcp2-candidate-rebuild-required",
  );
  assert.equal(record.decision.sameIntendedSubjectAsApprovedMassing, true);
  assert.equal(record.decision.sameGeometryContractAsApprovedMassing, false);
  assert.equal(record.decision.mcp2Candidate, false);
  assert.equal(record.decision.identityAuthorized, false);
  assert.equal(
    await sha256(record.legacyHero.editableSource.path),
    record.legacyHero.editableSource.sha256,
  );
  assert.equal(
    await sha256(record.legacyHero.runtimeAsset.path),
    record.legacyHero.runtimeAsset.sha256,
  );
  assert.match(
    record.legacyHero.generator.auditSnapshotSha256,
    /^[a-f0-9]{64}$/,
  );
  assert.equal(
    record.legacyHero.generator.fullGeneratorByteIdenticalToProducingCommit,
    false,
  );
  assert.equal(
    record.activeReplacementStatus,
    "hero-v2-identity-v1-massing-v2-complete-runtime-pass",
  );
  assert.equal(landmark.model, "/models/tiers/xinhua-road/hero-v2/house-315-hero.glb");
  assert.equal(landmark.cacheVersion, "20260725-hero-ad414549");
});

test("House315 旧 Hero generator 函数 lineage 未漂移但无资产级 build record", async () => {
  const record = await readJson(dispositionPath);
  const source = await readFile(
    path.join(root, record.legacyHero.generator.path),
    "utf8",
  );
  const start = source.indexOf("def build_house_315");
  const end = source.indexOf("def build_villa_le_bec", start);
  assert(start >= 0 && end > start);
  const functionSha = createHash("sha256")
    .update(source.slice(start, end))
    .digest("hex");

  assert.equal(
    functionSha,
    record.legacyHero.generator.house315FunctionSha256,
  );
  assert.equal(
    record.legacyHero.generator.house315FunctionByteIdenticalToProducingCommit,
    true,
  );
  assert.equal(record.legacyHero.atomicLineage.legacyBuildRecordExists, false);
});

test("House315 旧 Hero GLB 的结构、退化面和法线 disposition 可独立复算", async () => {
  const record = await readJson(dispositionPath);
  const buffer = await readFile(
    path.join(root, record.legacyHero.runtimeAsset.path),
  );
  const { json, binary } = parseGlb(buffer);
  const geometry = auditGeometry(json, binary);
  const scene = json.scenes[json.scene ?? 0];
  const rootNode = json.nodes[scene.nodes[0]];

  assert.equal(buffer.length, record.legacyHero.runtimeAsset.bytes);
  assert.equal(json.nodes.length, record.glbAudit.structure.nodes);
  assert.equal(json.meshes.length, record.glbAudit.structure.meshes);
  assert.equal(json.materials.length, record.glbAudit.structure.materials);
  assert.equal(json.images?.length ?? 0, 0);
  assert.equal(json.textures?.length ?? 0, 0);
  assert.equal(rootNode.translation, undefined);
  assert.equal(rootNode.rotation, undefined);
  assert.equal(rootNode.scale, undefined);
  assert.deepEqual(geometry, {
    triangles: 23512,
    zeroAreaTriangles: 120,
    nonFinitePositions: 0,
    invalidIndices: 0,
    primitivesWithoutNormals: 0,
    zeroLengthNormals: 0,
    nonUnitNormals: 0,
    orientationMismatches: 0,
  });
});

test("House315 disposition 明确范围污染、缺失视角和重建边界", async () => {
  const record = await readJson(dispositionPath);
  assert.equal(record.scopePollution.status, "fail-baked-into-single-runtime-mesh");
  assert.equal(record.scopePollution.explicitTrees, 0);
  assert.equal(record.scopePollution.bakedOutOfScopeContent.fullGardenSlab, 1);
  assert.equal(record.scopePollution.bakedOutOfScopeContent.fenceRuns, 2);
  assert.equal(record.scopePollution.bakedOutOfScopeContent.gateRuns, 2);
  assert.equal(record.scopePollution.bakedOutOfScopeContent.lampPosts, 2);
  assert.equal(record.scopePollution.bakedOutOfScopeContent.plantersWithFoliage, 2);
  assert.equal(record.fixedViewAudit.missingViews.length, 4);
  assert.equal(record.approvedMassingComparison.legacyHeroEnvelopeMismatch, true);
  assert.equal(record.rebuildPlan.orderedSteps.some(
    (step) => step.includes("不生成树木、灌木、草坪"),
  ), true);
});
