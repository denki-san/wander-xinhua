import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const candidatePath = "docs/research/xingfuli-center-lineage-v2-candidate.json";
const identityRecordPath =
  "docs/research/build-records/tiers/xingfuli/identity-v2/xingfuli-center-identity-v2.json";
const massingRecordPath =
  "docs/research/build-records/tiers/xingfuli/massing-v2/xingfuli-center-massing-v2.json";

async function bytes(relativePath) {
  return readFile(new URL(relativePath, root));
}

async function json(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function parseGlb(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  let offset = 12;
  let gltf;
  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (type === "JSON") {
      gltf = JSON.parse(
        buffer.toString("utf8", offset + 8, offset + 8 + length).trimEnd(),
      );
    }
    offset += 8 + length;
  }
  assert.ok(gltf);
  return gltf;
}

function geometryStats(gltf) {
  const primitives = gltf.meshes.flatMap((mesh) => mesh.primitives);
  return {
    triangles: primitives.reduce((sum, primitive) => {
      const count =
        primitive.indices === undefined
          ? gltf.accessors[primitive.attributes.POSITION].count
          : gltf.accessors[primitive.indices].count;
      return sum + count / 3;
    }, 0),
    vertices: primitives.reduce(
      (sum, primitive) =>
        sum + gltf.accessors[primitive.attributes.POSITION].count,
      0,
    ),
    bounds: {
      min: gltf.accessors[primitives[0].attributes.POSITION].min,
      max: gltf.accessors[primitives[0].attributes.POSITION].max,
    },
  };
}

test("幸福里中栋 lineage v2 候选严格锁定父子 SHA 和隔离范围", async () => {
  const candidate = await json(candidatePath);
  const [heroBytes, currentIdentity, currentMassing] = await Promise.all([
    bytes("public/models/xingfuli/xingfuli-center.glb"),
    bytes("public/models/xingfuli/xingfuli-center-identity.glb"),
    bytes("public/models/xingfuli/xingfuli-center-massing.glb"),
  ]);

  assert.equal(candidate.assetId, "xingfuli-center");
  assert.equal(candidate.status, "candidate-passed-main-window-mcp3");
  assert.deepEqual(candidate.scope.exactBuildingIds, ["xingfuli-center"]);
  assert.equal(candidate.scope.candidatePathsOnly, true);
  assert.equal(candidate.scope.publicRuntimeModified, false);
  assert.equal(candidate.scope.treesDecorationFullMap, "excluded");
  assert.equal(candidate.scope.recoveryHold, "untouched");

  assert.equal(
    sha256(heroBytes),
    "860249a2656cf7af9aa2ef746f05cc7f39506ec1e8751df236e3c1e3f0f594b9",
  );
  assert.equal(
    sha256(currentIdentity),
    "19800200464e0e9423e5a355abde7216478ba73c10b7539b0bafe5674fc4dc21",
  );
  assert.equal(
    sha256(currentMassing),
    "d6eeae59d35c3577817cdf35febb06493b53cbb661774e81a6e55d7a6dce26d3",
  );

  assert.equal(candidate.lineage[1].parentGlbSha256, candidate.lineage[0].glbSha256);
  assert.equal(
    candidate.lineage[1].parentBlendSha256,
    candidate.lineage[0].blendSha256,
  );
  assert.equal(candidate.lineage[2].parentGlbSha256, candidate.lineage[1].glbSha256);
  assert.equal(
    candidate.lineage[2].parentBlendSha256,
    candidate.lineage[1].blendSha256,
  );
});

test("幸福里中栋两档 GLB、Blend 和六张固定机位图匹配 build record", async () => {
  for (const recordPath of [identityRecordPath, massingRecordPath]) {
    const record = await json(recordPath);
    assert.deepEqual(record.scope.buildingIds, ["xingfuli-center"]);
    assert.equal(record.scope.writesExistingTierPaths, false);
    assert.equal(record.scope.writesRuntimeOrRegistry, false);
    assert.equal(record.scope.includesTreesDecorationOrFullMap, false);
    assert.equal(record.scope.recoveryHoldModified, false);
    assert.equal(record.build.doubleBuild.glbByteExact, true);
    assert.equal(
      record.build.doubleBuild.buildA.glbSha256,
      record.build.doubleBuild.buildB.glbSha256,
    );
    assert.equal(record.build.doubleBuild.blendByteExact, false);
    assert.notEqual(
      record.build.doubleBuild.buildA.blendSha256,
      record.build.doubleBuild.buildB.blendSha256,
    );

    for (const output of [
      record.outputs.blend,
      record.outputs.glb,
      ...record.outputs.previews,
    ]) {
      const outputBytes = await bytes(output.path);
      assert.equal(outputBytes.length, output.bytes, output.path);
      assert.equal(sha256(outputBytes), output.sha256, output.path);
    }
  }
});

test("幸福里中栋 Hero 到 Massing v2 的体积、三角面与对象数严格递减", async () => {
  const candidate = await json(candidatePath);
  const [hero, identity, massing] = await Promise.all(
    candidate.lineage.map(async (tier) => ({
      ...tier,
      gltf: parseGlb(await bytes(tier.glb)),
    })),
  );

  assert.ok(hero.bytes > identity.bytes && identity.bytes > massing.bytes);
  assert.ok(
    hero.triangles > identity.triangles &&
      identity.triangles > massing.triangles,
  );
  assert.ok(
    hero.sourceObjects > identity.sourceObjects &&
      identity.sourceObjects > massing.sourceObjects,
  );
  assert.equal(geometryStats(hero.gltf).triangles, 7788);
  assert.equal(geometryStats(identity.gltf).triangles, 6372);
  assert.equal(geometryStats(massing.gltf).triangles, 4332);
});

test("幸福里中栋 lineage v2 的嵌入元数据、结构、bounds 和 root transform 可审计", async () => {
  const identityRecord = await json(identityRecordPath);
  const massingRecord = await json(massingRecordPath);
  const cases = [
    {
      record: identityRecord,
      expectedParentTier: "hero",
      expectedParentGlb:
        "860249a2656cf7af9aa2ef746f05cc7f39506ec1e8751df236e3c1e3f0f594b9",
      expectedParentBlend:
        "b8e8aa2b4776244b23335b9148a94e1be5c8b7683f835960f4483547c7587eea",
    },
    {
      record: massingRecord,
      expectedParentTier: "identity-v2",
      expectedParentGlb:
        "a6c1339d6a77f8f5b0b493b0f477c0aa0ccf9a9db42b6e571b01f343efef4f06",
      expectedParentBlend:
        "6024700bd3a64f53f34227cdafea05d6a0c717d1a9b014a40ee95ed311bc2b87",
    },
  ];

  for (const item of cases) {
    const gltf = parseGlb(await bytes(item.record.outputs.glb.path));
    const rootNode = gltf.nodes[0];
    const stats = geometryStats(gltf);
    assert.equal(gltf.nodes.length, 1);
    assert.equal(gltf.meshes.length, 1);
    assert.equal(gltf.materials.length, 5);
    assert.equal(gltf.images?.length ?? 0, 0);
    assert.equal(gltf.textures?.length ?? 0, 0);
    assert.equal(gltf.animations?.length ?? 0, 0);
    assert.equal(gltf.skins?.length ?? 0, 0);
    assert.deepEqual(rootNode.translation ?? [0, 0, 0], [0, 0, 0]);
    assert.deepEqual(rootNode.rotation ?? [0, 0, 0, 1], [0, 0, 0, 1]);
    assert.deepEqual(rootNode.scale ?? [1, 1, 1], [1, 1, 1]);
    assert.equal(rootNode.extras.asset, "xingfuli-center");
    assert.equal(rootNode.extras.tier, item.record.tier);
    assert.equal(
      rootNode.extras.derivation,
      "strict-parent-blend-object-reduction",
    );
    assert.equal(rootNode.extras.parent_tier, item.expectedParentTier);
    assert.equal(rootNode.extras.parent_glb_sha256, item.expectedParentGlb);
    assert.equal(rootNode.extras.parent_blend_sha256, item.expectedParentBlend);
    assert.equal(
      rootNode.extras.generator_sha256,
      item.record.inputs.generator.sha256,
    );
    assert.equal(rootNode.extras.layout_sha256, item.record.inputs.layout.sha256);
    assert.equal(
      rootNode.extras.source_commit,
      item.record.inputs.generator.sourceCommit,
    );
    assert.equal(rootNode.extras.reference_photos_embedded, false);
    assert.deepEqual(stats.bounds, item.record.outputs.glb.bounds);
  }

  assert.deepEqual(
    identityRecord.outputs.glb.bounds,
    massingRecord.outputs.glb.bounds,
  );
});
