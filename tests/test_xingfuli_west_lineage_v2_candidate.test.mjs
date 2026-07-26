import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { XINGFULI_TIERS } from "../app/scene/xingfuli-tier-contract.mjs";

const root = new URL("../", import.meta.url);
const rootPath = decodeURIComponent(root.pathname);
const candidatePath = "docs/research/xingfuli-west-lineage-v2-candidate.json";
const identityRecordPath =
  "docs/research/build-records/tiers/xingfuli/identity-v2/xingfuli-west-identity-v2.json";
const massingRecordPath =
  "docs/research/build-records/tiers/xingfuli/massing-v2/xingfuli-west-massing-v2.json";

async function bytes(relativePath) {
  return readFile(new URL(relativePath, root));
}

async function json(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function gitBytes(...args) {
  return execFileSync("git", args, { cwd: rootPath });
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
  const minimum = [Infinity, Infinity, Infinity];
  const maximum = [-Infinity, -Infinity, -Infinity];
  for (const primitive of primitives) {
    const accessor = gltf.accessors[primitive.attributes.POSITION];
    for (let axis = 0; axis < 3; axis += 1) {
      minimum[axis] = Math.min(minimum[axis], accessor.min[axis]);
      maximum[axis] = Math.max(maximum[axis], accessor.max[axis]);
    }
  }
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
    bounds: { min: minimum, max: maximum },
  };
}

function pngDimensions(buffer) {
  assert.equal(buffer.toString("ascii", 1, 4), "PNG");
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

test("West lineage v2 只锁一栋、父子 SHA 和隔离路径", async () => {
  const candidate = await json(candidatePath);
  const [hero, oldIdentity, oldMassing] = await Promise.all([
    bytes("public/models/xingfuli/xingfuli-west.glb"),
    bytes("public/models/xingfuli/xingfuli-west-identity.glb"),
    bytes("public/models/xingfuli/xingfuli-west-massing.glb"),
  ]);

  assert.equal(candidate.assetId, "xingfuli-west");
  assert.equal(
    candidate.status,
    "candidate-lineage-generated-map-blocked-main-window-review-pending",
  );
  assert.equal(
    candidate.baselineCommit,
    "d09cca7b73f8e9989b65eb83b16e0bf0e27270dc",
  );
  assert.deepEqual(candidate.scope.exactBuildingIds, ["xingfuli-west"]);
  assert.equal(candidate.scope.candidatePathsOnly, true);
  assert.equal(
    candidate.scope.publicRuntimeResolverManifestExactStatusModified,
    false,
  );
  assert.equal(candidate.scope.centerEastModified, false);
  assert.equal(candidate.scope.treesDecorationFullMap, "excluded");
  assert.equal(candidate.scope.recoveryHold, "untouched");
  assert.equal(candidate.scope.xiaohongshuAccessed, false);
  assert.equal(candidate.promotion.authorized, false);

  assert.equal(sha256(hero), candidate.preservedCurrentTiers.heroGlbSha256);
  assert.equal(
    sha256(oldIdentity),
    candidate.preservedCurrentTiers.identityGlbSha256,
  );
  assert.equal(
    sha256(oldMassing),
    candidate.preservedCurrentTiers.massingGlbSha256,
  );
  assert.equal(
    candidate.lineage[1].parentGlbSha256,
    candidate.lineage[0].glbSha256,
  );
  assert.equal(
    candidate.lineage[1].parentBlendSha256,
    candidate.lineage[0].blendSha256,
  );
  assert.equal(
    candidate.lineage[2].parentGlbSha256,
    candidate.lineage[1].glbSha256,
  );
  assert.equal(
    candidate.lineage[2].parentBlendSha256,
    candidate.lineage[1].blendSha256,
  );
});

test("生成器锁定 source commit，显式三机位不再依赖 legacy camera", async () => {
  const identity = await json(identityRecordPath);
  const generator = identity.inputs.generator;
  const current = await bytes(generator.path);
  const committed = gitBytes("show", `${generator.sourceCommit}:${generator.path}`);
  const source = current.toString("utf8");

  assert.equal(sha256(current), generator.sha256);
  assert.equal(sha256(committed), generator.sha256);
  assert.match(source, /def render_fixed_views/);
  assert.doesNotMatch(source, /legacy\.render_views\(slug\)/);
  for (const coordinates of [
    '("canonical", (-55.0, -7.0, 3.5), (-32.0, -7.0, 3.2), 48)',
    '("side", (-58.0, -31.0, 11.0), (-34.5, -7.0, 3.3), 52)',
    '("street", (-68.0, -26.0, 7.5), (-34.5, -6.0, 3.2), 55)',
  ]) {
    assert.ok(source.includes(coordinates), coordinates);
  }
});

test("两档 GLB、Blend 与显式三机位指纹匹配 build record", async () => {
  for (const recordPath of [identityRecordPath, massingRecordPath]) {
    const record = await json(recordPath);
    assert.deepEqual(record.scope.buildingIds, ["xingfuli-west"]);
    assert.equal(record.scope.writesExistingTierPaths, false);
    assert.equal(
      record.scope.writesRuntimeResolverManifestOrExactStatus,
      false,
    );
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

    for (const output of [record.outputs.blend, record.outputs.glb]) {
      const outputBytes = await bytes(output.path);
      assert.equal(outputBytes.length, output.bytes, output.path);
      assert.equal(sha256(outputBytes), output.sha256, output.path);
    }
    assert.deepEqual(
      record.outputs.previews.map(({ view }) => view),
      ["canonical", "side", "street"],
    );
    for (const preview of record.outputs.previews) {
      const previewBytes = await bytes(preview.path);
      assert.equal(previewBytes.length, preview.bytes, preview.path);
      assert.equal(sha256(previewBytes), preview.sha256, preview.path);
      assert.deepEqual(pngDimensions(previewBytes), [1100, 720], preview.path);
      assert.ok(previewBytes.length > 800_000, preview.path);
    }
  }
});

test("Hero 到 Massing v2 的 bytes、三角面和对象数严格递减且 bounds 不漂移", async () => {
  const candidate = await json(candidatePath);
  const tiers = await Promise.all(
    candidate.lineage.map(async (tier) => ({
      ...tier,
      gltf: parseGlb(await bytes(tier.glb)),
    })),
  );
  const [hero, identity, massing] = tiers;

  assert.ok(hero.bytes > identity.bytes && identity.bytes > massing.bytes);
  assert.ok(
    hero.triangles > identity.triangles
      && identity.triangles > massing.triangles,
  );
  assert.ok(
    hero.sourceObjects > identity.sourceObjects
      && identity.sourceObjects > massing.sourceObjects,
  );
  assert.deepEqual(
    tiers.map(({ gltf }) => geometryStats(gltf).triangles),
    [4428, 3900, 2712],
  );
  assert.deepEqual(
    geometryStats(hero.gltf).bounds,
    geometryStats(identity.gltf).bounds,
  );
  assert.deepEqual(
    geometryStats(identity.gltf).bounds,
    geometryStats(massing.gltf).bounds,
  );
});

test("候选 GLB 内嵌严格 lineage、标准 root 与零图片策略", async () => {
  const cases = [
    {
      record: await json(identityRecordPath),
      parentTier: "hero",
      parentGlb:
        "ababb1860c360f5807ce99b392a5388eba30f0991bdcb4f653c99752786bf853",
      parentBlend:
        "0b9d64178e740aceb77469a1546d775f334427da16ba0037ab916c699b723a51",
    },
    {
      record: await json(massingRecordPath),
      parentTier: "identity-v2",
      parentGlb:
        "163d214be91a4eacc45a383913e89e820757b97765f74c5b4be080f74f34426d",
      parentBlend:
        "9b90d62c9bf4e34bf13b0a86bae035421ba287a51382f9f925fc435fb34b6a59",
    },
  ];

  for (const item of cases) {
    const gltf = parseGlb(await bytes(item.record.outputs.glb.path));
    const rootNode = gltf.nodes[0];
    const stats = geometryStats(gltf);
    assert.equal(gltf.nodes.length, 1);
    assert.equal(gltf.meshes.length, 1);
    assert.equal(gltf.materials.length, item.record.outputs.glb.materials);
    assert.equal(gltf.images?.length ?? 0, 0);
    assert.equal(gltf.textures?.length ?? 0, 0);
    assert.equal(gltf.animations?.length ?? 0, 0);
    assert.equal(gltf.skins?.length ?? 0, 0);
    assert.deepEqual(rootNode.translation ?? [0, 0, 0], [0, 0, 0]);
    assert.deepEqual(rootNode.rotation ?? [0, 0, 0, 1], [0, 0, 0, 1]);
    assert.deepEqual(rootNode.scale ?? [1, 1, 1], [1, 1, 1]);
    assert.equal(rootNode.extras.asset, "xingfuli-west");
    assert.equal(rootNode.extras.tier, item.record.tier);
    assert.equal(
      rootNode.extras.derivation,
      "strict-parent-blend-object-reduction",
    );
    assert.equal(rootNode.extras.parent_tier, item.parentTier);
    assert.equal(rootNode.extras.parent_glb_sha256, item.parentGlb);
    assert.equal(rootNode.extras.parent_blend_sha256, item.parentBlend);
    assert.equal(
      rootNode.extras.generator_sha256,
      item.record.inputs.generator.sha256,
    );
    assert.equal(
      rootNode.extras.source_commit,
      item.record.inputs.generator.sourceCommit,
    );
    assert.equal(rootNode.extras.reference_photos_embedded, false);
    assert.equal(
      rootNode.extras.user_original_photos_status,
      "pending-original-files-not-reviewed",
    );
    assert.deepEqual(stats.bounds, item.record.outputs.glb.bounds);
  }
});

test("主窗口将 West lineage v2 接入显式 QA，产品默认仍保留 Hero", () => {
  const west = XINGFULI_TIERS["xingfuli-west"];
  assert.equal(west.hero.path, "/models/xingfuli/xingfuli-west.glb");
  assert.equal(
    west.identity.path,
    "/models/tiers/xingfuli/identity-v2/xingfuli-west-identity-v2.glb",
  );
  assert.equal(
    west.massing.path,
    "/models/tiers/xingfuli/massing-v2/xingfuli-west-massing-v2.glb",
  );
  assert.equal(
    west.identity.sha256,
    "163d214be91a4eacc45a383913e89e820757b97765f74c5b4be080f74f34426d",
  );
  assert.equal(
    west.massing.sha256,
    "f6d67f041162e4c090ff16f65897837db64c64fb3cf5a8baf0a4462c4e8ac377",
  );
});

test("幸福路精确 footprint 候选仍因 ground-level passage 缺证而 blocked", async () => {
  const candidate = await json(candidatePath);
  const mapGate = candidate.mapGate;
  const collision = await json(mapGate.candidate.path);
  const collisionBytes = await bytes(mapGate.candidate.path);

  assert.equal(sha256(collisionBytes), mapGate.candidate.sha256);
  assert.equal(
    collision.verdict.status,
    "blocked-full-coverage-conflicts-with-pedestrian-passage",
  );
  assert.equal(
    collision.exactFootprintAttempt.roadGate.status,
    "pass-exact-convex-footprints-only",
  );
  assert.equal(collision.exactFootprintAttempt.coverageRatio, 1);
  assert.equal(
    collision.pedestrianConflict.entranceAndMainRouteGate,
    "fail-full-footprint-is-solid-at-player-height",
  );
  assert.equal(
    collision.minimumWalkableCarve.fullFootprintCoveragePreserved,
    false,
  );
  assert.equal(
    mapGate.status,
    "blocked-ground-level-passage-evidence-unavailable",
  );
  assert.equal(mapGate.productionCorrectionWritten, false);
});

test("用户九张原图仍 pending，公开参考未被冒充为用户序列", async () => {
  const candidate = await json(candidatePath);
  const record = await json(candidate.userOriginalPhotos.record);
  const recordBytes = await bytes(candidate.userOriginalPhotos.record);

  assert.equal(sha256(recordBytes), candidate.userOriginalPhotos.sha256);
  assert.equal(record.userStatement.photoCount, 9);
  assert.equal(record.assistantObserved.personalPhotoFilesMaterializedInWorktree, false);
  assert.equal(record.assistantObserved.personalPhotoHashesAvailable, false);
  assert.equal(record.assistantObserved.existingPublicReferencesAreSameAsUserSequence, false);
  assert.equal(record.orderedSlots.length, 9);
  assert.ok(
    record.orderedSlots.every(
      ({ assetState }) => assetState === "pending-original-file",
    ),
  );
  assert.equal(
    candidate.userOriginalPhotos.status,
    "pending-original-files-not-reviewed",
  );
  assert.equal(
    candidate.userOriginalPhotos.publicReferenceManifestIsNotUserSequence,
    true,
  );
});
