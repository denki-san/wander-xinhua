import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath =
  "docs/research/shanghai-cinema-hero-exact-reproduction-audit.json";
const buildRecordPath =
  "docs/research/build-records/shanghai-cinema-hero-exact-reproduction.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

test("上海影城 exact exporter 锁定 accepted Blend 且只写隔离新路径", async () => {
  const [audit, record, generator] = await Promise.all([
    readJson(auditPath),
    readJson(buildRecordPath),
    readFile(new URL(
      "scripts/create_shanghai_cinema_hero_exact_reproduction.py",
      root,
    ), "utf8"),
  ]);

  assert.equal(
    await sha256(audit.sourceOfTruth.path),
    audit.sourceOfTruth.sha256,
  );
  assert.equal(audit.sourceOfTruth.sha256, record.source.sha256);
  assert.equal(record.source.modified, false);
  assert.equal(
    await sha256(audit.exactExporter.path),
    audit.exactExporter.sha256,
  );
  assert.equal(audit.exactExporter.sha256, record.generator.sha256);
  assert.match(
    generator,
    /OUTPUT_ROOT = ROOT \/ "test_artifacts\/shanghai-cinema-hero-exact-reproduction"/u,
  );
  assert.match(generator, /if candidate\.exists\(\):/u);
  assert.match(generator, /拒绝覆盖既有候选/u);
  assert.match(generator, /必须让 Blender 直接加载冻结 Hero Blend/u);
  assert.match(generator, /runtime_x_mirrored/u);
  assert.match(generator, /EXPECTED_GLB_SHA256/u);
  assert.match(generator, /EXPECTED_GLB_BYTES/u);
  assert.doesNotMatch(generator, /public\/models\/xinhua-road/u);
});

test("上海影城两次独立导出精确复现当前 public Hero", async () => {
  const [audit, record] = await Promise.all([
    readJson(auditPath),
    readJson(buildRecordPath),
  ]);
  const reference = audit.referenceHero;
  const [verifiedA, verifiedB] = audit.controlledIndependentExports;

  assert.equal(await sha256(reference.path), reference.sha256);
  assert.equal(reference.sha256, record.protectedOutput.sha256);
  assert.equal(record.protectedOutput.modified, false);
  assert.equal(verifiedA.glbSha256, reference.sha256);
  assert.equal(verifiedB.glbSha256, reference.sha256);
  assert.equal(verifiedA.glbBytes, reference.bytes);
  assert.equal(verifiedB.glbBytes, reference.bytes);
  assert.equal(verifiedA.exactReferenceMatch, true);
  assert.equal(verifiedB.exactReferenceMatch, true);
  assert.equal(audit.verdict.status, "pass-exact-source-reproduction");
  assert.equal(audit.verdict.exactPublicShaReproduced, true);
  assert.equal(audit.verdict.exactIndependentProcessDeterminism, true);

  for (const comparison of Object.values(audit.exactComparison)) {
    assert.equal(comparison.exactFileMatch, true);
    assert.equal(comparison.exactJsonChunkMatch, true);
    assert.equal(comparison.exactBinaryChunkMatch, true);
    assert.equal(comparison.differingFileBytes, 0);
    assert.equal(comparison.differingBinaryBytes, 0);
    assert.deepEqual(comparison.differingAccessors, []);
  }
});

test("上海影城本地隔离候选存在时必须真实匹配记录 SHA", async () => {
  const audit = await readJson(auditPath);
  let verifiedLocalOutputs = 0;

  for (const output of audit.controlledIndependentExports) {
    try {
      const buffer = await readFile(new URL(output.path, root));
      verifiedLocalOutputs += 1;
      assert.equal(buffer.length, output.glbBytes);
      assert.equal(
        createHash("sha256").update(buffer).digest("hex"),
        output.glbSha256,
      );
      assert.equal(output.glbSha256, audit.referenceHero.sha256);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      assert.equal(output.committed, false);
    }
  }

  assert.ok(
    verifiedLocalOutputs === 0 || verifiedLocalOutputs === 2,
    "本地候选必须成对保留或同时缺席",
  );
});

test("上海影城 exact reproduction 保持 Hero 结构与无贴图政策", async () => {
  const [audit, record] = await Promise.all([
    readJson(auditPath),
    readJson(buildRecordPath),
  ]);

  assert.equal(audit.structure.status, "pass-exact-all-three");
  assert.deepEqual(audit.structure, {
    status: "pass-exact-all-three",
    nodes: 1,
    meshes: 1,
    primitives: 13,
    triangles: 83820,
    materials: 13,
    images: 0,
    textures: 0,
    accessors: 52,
    bufferViews: 52,
    bounds: {
      min: [-19, -0.06000000983476639, -11.800000190734863],
      max: [19, 17.225000381469727, 14.199999809265137],
    },
  });
  assert.deepEqual(record.metrics, {
    nodes: 1,
    meshes: 1,
    primitives: 13,
    triangles: 83820,
    materials: 13,
    images: 0,
    textures: 0,
    accessors: 52,
    bufferViews: 52,
    bounds: {
      min: [-19, -0.06000000983476639, -11.800000190734863],
      max: [19, 17.225000381469727, 14.199999809265137],
    },
  });
});

test("上海影城根因结论区分观测、受控排除与机制推断", async () => {
  const [previousAudit, audit, record] = await Promise.all([
    readJson("docs/research/shanghai-cinema-hero-reproduction-audit.json"),
    readJson(auditPath),
    readJson(buildRecordPath),
  ]);

  assert.equal(
    previousAudit.verdict.status,
    "blocked-exact-sha-texcoord-float-nondeterminism",
  );
  assert.notEqual(
    previousAudit.controlledRoundtrips[0].glbSha256,
    previousAudit.controlledRoundtrips[1].glbSha256,
  );
  assert.equal(
    previousAudit.exactComparison.binary.onlySemantic,
    "TEXCOORD_0",
  );
  assert.equal(
    previousAudit.exactComparison.binary.maximumAbsoluteFloatDelta,
    5.960464477539063e-8,
  );
  assert.equal(
    audit.rootCause.localization.status,
    "inferred-by-controlled-elimination",
  );
  assert.equal(
    audit.rootCause.localization.stableBoundary,
    "gltf-export-from-the-sha-locked-accepted-blend",
  );
  assert.match(audit.rootCause.localization.unresolvedSubstage, /不能/u);
  assert.match(audit.rootCause.inference, /推断/u);
  assert.match(audit.rootCause.notClaimed, /没有声称/u);
  assert.equal(
    record.rootCauseDisposition.acceptedBlendExport,
    "deterministic-under-recorded-environment",
  );
  assert.equal(
    record.rootCauseDisposition.localizationStatus,
    "inferred-by-controlled-elimination",
  );
  assert.equal(
    record.rootCauseDisposition.exactSubstage,
    "unresolved-without-procedural-blend-uv-comparison",
  );
});

test("上海影城专项不改 map runtime registry manifest 或既有 Hero", async () => {
  const [audit, record] = await Promise.all([
    readJson(auditPath),
    readJson(buildRecordPath),
  ]);

  assert.equal(audit.baseline.worktreeBaseCommit, "c066873253a534da17b438a8d1530a0b4e043f9f");
  assert.equal(audit.baseline.requestedIntegrationCommit, "dcd619e04fc735e8b0a4b9b01cac7ca78a749ecb");
  assert.equal(audit.baseline.commonAncestor, "ade098eaa4be7a37d766b2867c909885742d6030");
  assert.equal(audit.scope.publicHeroModified, false);
  assert.equal(audit.scope.sharedRegistryModified, false);
  assert.equal(audit.scope.sharedRuntimeModified, false);
  assert.equal(audit.scope.fastManifestModified, false);
  assert.equal(audit.scope.mapAnchorModified, false);
  assert.equal(audit.scope.recoveryMassingModified, false);
  assert.equal(audit.scope.heroMcp2Modified, false);
  assert.equal(audit.scope.identityMcp3Modified, false);
  assert.equal(record.gates.publicHeroWrite, "none");
  assert.equal(record.gates.publicWiring, "none");
  assert.equal(record.gates.mapAnchor, "untouched");
  assert.equal(record.gates.runtime, "untouched");
});
