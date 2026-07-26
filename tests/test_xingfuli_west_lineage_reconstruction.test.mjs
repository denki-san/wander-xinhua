import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const rootPath = decodeURIComponent(root.pathname);
const recordPath = "docs/research/xingfuli-west-lineage-reconstruction-2026-07-26.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(new URL(relativePath, root)))
    .digest("hex");
}

async function parseGlb(relativePath) {
  const buffer = await readFile(new URL(relativePath, root));
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonChunkType = buffer.toString("ascii", 16, 20);
  assert.equal(jsonChunkType, "JSON");
  return JSON.parse(
    buffer
      .subarray(20, 20 + jsonChunkLength)
      .toString("utf8")
      .replace(/\u0000+$/u, ""),
  );
}

function git(...args) {
  return execFileSync("git", args, { cwd: rootPath, encoding: "utf8" }).trim();
}

test("西栋 reconstruction record 锁定当前三档与共同来源快照", async () => {
  const record = await readJson(recordPath);
  const introductionCommit = record.provableLineage.introductionCommit;

  assert.equal(record.assetId, "xingfuli-west");
  assert.equal(record.scope.mode, "read-only-lineage-reconstruction");
  assert.equal(record.scope.heroIdentityMassingRebuilt, false);
  assert.equal(record.scope.runtimeOrRegistryModified, false);
  assert.equal(record.verdict.existingAssets, "retain-qualified-current-binaries");
  assert.equal(record.provableLineage.status, "pass-common-source-snapshot-only");
  assert.equal(record.provableLineage.relationship,
    "generator+layout -> {massing, identity, final hero}");

  for (const source of [
    record.provableLineage.generator,
    record.provableLineage.layout,
  ]) {
    assert.equal(await sha256(source.path), source.sha256);
    assert.equal(git("hash-object", source.path), source.gitBlob);
    assert.equal(git("rev-parse", `${introductionCommit}:${source.path}`), source.gitBlob);
  }

  for (const tier of Object.values(record.artifacts)) {
    for (const artifact of [tier.blend, tier.glb]) {
      assert.equal(await sha256(artifact.path), artifact.sha256);
      assert.equal(git("hash-object", artifact.path), artifact.gitBlob);
      assert.equal(
        git("rev-parse", `${introductionCommit}:${artifact.path}`),
        artifact.gitBlob,
      );
    }
  }
});

test("西栋历史记录证明构建顺序相反，不能回填 Hero 派生关系", async () => {
  const record = await readJson(recordPath);
  const order = record.historicalBuildOrder;
  const introductionCommit = record.provableLineage.introductionCommit;

  assert.deepEqual(order.map(({ tier }) => tier), ["massing", "identity", "hero"]);
  assert.ok(Date.parse(order[0].generatedAt) < Date.parse(order[1].generatedAt));
  assert.ok(Date.parse(order[1].generatedAt) < Date.parse(order[2].generatedAt));

  for (const item of order) {
    const buildRecord = await readJson(item.record);
    assert.equal(await sha256(item.record), item.recordSha256);
    assert.equal(git("hash-object", item.record), item.recordGitBlob);
    assert.equal(
      git("rev-parse", `${introductionCommit}:${item.record}`),
      item.recordGitBlob,
    );
    assert.equal(buildRecord.generatedAt, item.generatedAt);
    assert.equal(buildRecord.generator.command, item.command);
    assert.equal(JSON.stringify(buildRecord).includes("derivedFrom"), false);
    assert.equal(JSON.stringify(buildRecord).includes("derived_from"), false);
  }

  assert.equal(
    record.verdict.status,
    "blocked-historical-hero-parentage-not-provable",
  );
  assert.equal(record.verdict.formalHeroToIdentityProof, false);
  assert.equal(record.verdict.formalIdentityToMassingProof, false);
  assert.equal(record.verdict.derivedFromBackfillAuthorized, false);
});

test("西栋生成器是并列 stage recipe，不消费 Hero 或 Identity 父级", async () => {
  const record = await readJson(recordPath);
  const source = await readFile(
    new URL(record.provableLineage.generator.path, root),
    "utf8",
  );
  const exportStart = source.indexOf("def export_segment(");
  const exportEnd = source.indexOf("\ndef render_master(", exportStart);
  const exportSegment = source.slice(exportStart, exportEnd);

  assert.ok(exportStart >= 0);
  assert.ok(exportSegment.indexOf("clear_scene()")
    < exportSegment.indexOf("build_segment(segment, stage)"));
  assert.ok(exportSegment.indexOf("bpy.ops.wm.save_as_mainfile")
    < exportSegment.indexOf("merge_for_export("));
  assert.match(source, /layout = json\.loads\(LAYOUT_PATH\.read_text/);
  assert.match(source, /detailed = stage != "massing"/);
  assert.match(source, /if stage in \{"materials", "site", "final"\}:/);
  assert.doesNotMatch(source, /derived_from|derivedFrom/);
  assert.doesNotMatch(source, /bpy\.ops\.wm\.open_mainfile|bpy\.data\.libraries\.load/);
  assert.equal(record.generatorSemantics.stageRelationship,
    "parallel-recipes-from-common-inputs");
  assert.equal(
    record.generatorSemantics.heroSupersetGeometrySimilarityIsLineageProof,
    false,
  );
});

test("西栋 GLB 只携带 stage 信息，不携带严格父级 lineage", async () => {
  const record = await readJson(recordPath);

  for (const [tierName, artifact] of Object.entries(record.artifacts)) {
    const glb = await parseGlb(artifact.glb.path);
    const extras = glb.nodes[0].extras;

    assert.equal(extras.asset, "xingfuli");
    assert.equal(extras.segment, "west");
    assert.equal(extras.stage, artifact.stage);
    assert.equal(extras.source_object_count, artifact.glb.sourceObjectCount);
    assert.equal(extras.reference_photos_embedded, false);
    for (const field of record.embeddedGlbMetadata.missingLineageFields) {
      assert.equal(Object.hasOwn(extras, field), false, `${tierName} 不应伪造 ${field}`);
    }
  }
});

test("西栋现有 MCP、Three.js 与幸福路道路 blocker 保持锁定", async () => {
  const record = await readJson(recordPath);
  const preserved = record.preservedExistingEvidence;
  const [mcp, runtime, audit] = await Promise.all([
    readJson(preserved.blenderMcp.path),
    readJson(preserved.threeJsRuntime.path),
    readJson(preserved.xingfuRoadBlocker.path),
  ]);

  assert.equal(await sha256(preserved.blenderMcp.path), preserved.blenderMcp.sha256);
  assert.equal(mcp.gates.mcp1Massing, preserved.blenderMcp.mcp1Massing);
  assert.equal(mcp.gates.mcp2Hero, preserved.blenderMcp.mcp2Hero);
  assert.equal(mcp.gates.mcp3ThreeTierVisual, preserved.blenderMcp.mcp3ThreeTierVisual);
  assert.equal(mcp.gates.formalMcp3, "blocked-lineage");

  assert.equal(await sha256(preserved.threeJsRuntime.path), preserved.threeJsRuntime.sha256);
  assert.ok(Object.values(runtime.tiers).every(({ status }) => status === "loaded"));
  assert.equal(runtime.acceptance.threeTierLoading, "pass");
  assert.equal(runtime.acceptance.strictTierLineage, "blocked");
  assert.equal(runtime.acceptance.map, "blocked-xingfu-road-overlap");
  assert.equal(runtime.acceptance.runtimePromotionAllowed, false);

  assert.equal(audit.roadGate.status, preserved.xingfuRoadBlocker.status);
  assert.equal(
    audit.roadGate.currentAuthoredCollisionFootprints
      .find(({ buildingId }) => buildingId === "north-west")
      .asphaltEdgeClearanceScene,
    preserved.xingfuRoadBlocker.northWestAsphaltEdgeClearanceScene,
  );
  assert.equal(
    audit.roadGate.currentAuthoredCollisionFootprints
      .find(({ buildingId }) => buildingId === "south-west")
      .asphaltEdgeClearanceScene,
    preserved.xingfuRoadBlocker.southWestAsphaltEdgeClearanceScene,
  );
  assert.equal(audit.roadGate.verdict.assetRebuildAuthorized, false);
  assert.equal(audit.roadGate.verdict.globalTranslationAuthorized, false);
  assert.equal(audit.roadGate.verdict.uniformOrNonUniformScaleHackAuthorized, false);
});

test("西栋 deterministic 输出与最小 future candidate 修复没有被夸大", async () => {
  const record = await readJson(recordPath);

  assert.equal(
    record.deterministicOutput.byteExactRoundTripStatus,
    "not-proven-no-rebuild-authorized",
  );
  assert.equal(record.deterministicOutput.doubleBuildEvidenceInRecords, false);
  assert.equal(record.deterministicOutput.currentArtifactsMatchRecordedSha256, true);
  assert.equal(record.quantifiedGaps.length, 8);
  assert.deepEqual(
    record.quantifiedGaps.map(({ id }) => id),
    ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"],
  );
  assert.equal(
    record.minimumRepairWithoutRedoingAcceptedAssets
      .strictLineageCanBeClosedWithoutAnyFutureDerivation,
    false,
  );
  assert.match(
    record.minimumRepairWithoutRedoingAcceptedAssets
      .formalClosureRequiresFutureCandidateDerivation.join("\n"),
    /candidate|候选/,
  );
  assert.match(
    record.minimumRepairWithoutRedoingAcceptedAssets
      .formalClosureRequiresFutureCandidateDerivation.join("\n"),
    /幸福路/,
  );
});
