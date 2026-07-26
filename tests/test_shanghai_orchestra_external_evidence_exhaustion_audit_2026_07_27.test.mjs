import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath =
  "docs/research/shanghai-orchestra-external-evidence-exhaustion-audit-2026-07-27.json";
const externalRoot = "/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence";

async function bytes(relativePath) {
  return readFile(new URL(relativePath, root));
}

async function json(relativePath) {
  return JSON.parse((await bytes(relativePath)).toString("utf8"));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

test("外置证据审计锁定乐团本栋输入且未授权资产或公共改动", async () => {
  const audit = await json(auditPath);
  for (const input of Object.values(audit.repositoryInputs)) {
    assert.equal(sha256(await bytes(input.path)), input.sha256, input.path);
  }
  assert.equal(audit.assetId, "shanghai-orchestra");
  assert.equal(audit.scope.externalRootsModified, false);
  assert.equal(audit.scope.binaryModified, false);
  assert.equal(audit.scope.sharedFilesModified, false);
  assert.equal(audit.scope.recoveryHoldModified, false);
  assert.equal(
    audit.status,
    "four-research-only-views-recovered-formal-membership-map-lineage-unchanged-blocked",
  );
});

test("65 个目标图像路径折叠为八份真实候选和十四份生成输出", async () => {
  const audit = await json(auditPath);
  const dedup = audit.targetVisualDeduplication;
  assert.equal(dedup.pathsAudited, 65);
  assert.equal(dedup.uniqueVisualHashes, 22);
  assert.equal(dedup.uniqueRealReferenceHashes, 8);
  assert.equal(dedup.uniqueGeneratedHashes, 14);
  assert.equal(dedup.repositoryAdmittedRealReferences.length, 4);
  assert.equal(dedup.unadmittedSnapshotRealCandidates.length, 4);
  assert.deepEqual(
    dedup.unadmittedSnapshotRealCandidates
      .map(({ sha256: digest }) => digest)
      .sort(),
    [
      "cb781ed56012361f90939ca691d293e4aea8f4826e63496cea808751aded9dfd",
      "e7cd1305e22751f78af4972aa4ca38551774735565a62b13d8065333a06482be",
      "b0f9acb489e424ee4edab1229d0ccc35ba8ea2ff19cfc2ed98ffec1288851ee4",
      "2c4b933ee5e920aecb5442fe5068cb895e7e7b159654ade1a553e41c92b7196e",
    ].sort(),
  );
  assert.match(dedup.generatedExclusion, /circular evidence/u);
});

test("四张增量视图只补强研究覆盖，缺少正式 map 与 lineage 控制", async () => {
  const audit = await json(auditPath);
  const candidates = audit.targetVisualDeduplication.unadmittedSnapshotRealCandidates;
  assert.deepEqual(
    candidates.map(({ path }) => path),
    [
      "repository/test_artifacts/test_landmark_comparison_sources/test_shanghai_orchestra_real_019.jpg",
      "repository/test_artifacts/test_landmark_comparison_sources/test_shanghai_orchestra_real_021.jpg",
      "repository/test_artifacts/test_landmark_comparison_sources/test_shanghai_orchestra_real_022.jpg",
      "repository/test_artifacts/test_landmark_comparison_sources/test_shanghai_orchestra_real_024.jpg",
    ],
  );
  for (const candidate of candidates) {
    assert.match(candidate.gateContribution, /research-only/u);
    assert.ok(candidate.limitations.some((item) => /source URL or sidecar/u.test(item)));
  }
  assert.equal(
    audit.sourceIdDeduplication.unadmittedImageProvenance.formalUse,
    "research-reference-only-until-provenance-is-recovered",
  );
  assert.equal(
    audit.sourceIdDeduplication.newMemberTableOrRelationSourceFound,
    false,
  );
});

test("若外置盘挂载，dirty 快照清单和四张图必须保持精确哈希", {
  skip: !existsSync(externalRoot),
}, async () => {
  const audit = await json(auditPath);
  const control = audit.immutableArchiveControls.candidateSnapshot;
  const manifestBytes = await readFile(`${control.root}/manifest.json`);
  const checksumBytes = await readFile(`${control.root}/SHA256SUMS`);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const checksums = checksumBytes.toString("utf8");

  assert.equal(sha256(manifestBytes), control.manifestSha256);
  assert.equal(sha256(checksumBytes), control.checksumFileSha256);
  assert.equal(manifest.snapshotId, "2026-07-26-5383f2a");
  assert.equal(manifest.sourceWorktreeDirty, true);
  assert.equal(manifest.wikiEligible, false);

  for (const candidate of audit.targetVisualDeduplication
    .unadmittedSnapshotRealCandidates) {
    const candidateBytes = await readFile(`${control.root}/${candidate.path}`);
    assert.equal(sha256(candidateBytes), candidate.sha256, candidate.path);
    assert.match(checksums, new RegExp(`${candidate.sha256}  ${candidate.path}`, "u"));
  }
});

test("离线穷尽不改变正式 membership、map、MCP2、Identity 或 MCP3 门", async () => {
  const audit = await json(auditPath);
  const gate = audit.gateDecision;
  assert.equal(gate.compoundEvidence, "pass-retained");
  assert.match(gate.facadeMultiView, /research-only/u);
  assert.match(gate.scale, /^partial-research-only/u);
  assert.match(gate.entranceContinuity, /^partial-research-only/u);
  assert.match(gate.roofAndRear, /^partial-research-only/u);
  assert.match(gate.xinhuaRoadSide, /^blocked-/u);
  assert.equal(gate.formalMemberBinding, "unchanged-blocked");
  assert.equal(gate.formalMapAcceptance, "unchanged-blocked");
  assert.equal(gate.mcp1Massing, "pass-shape-only-preserved-no-rerun");
  assert.equal(gate.threeDiagnostic, "pass-preserved-no-promotion-no-rerun");
  assert.equal(gate.legacyHero, "hold-not-mcp2-candidate");
  assert.match(gate.heroIdentityLineage, /^unchanged-blocked-/u);
  assert.equal(gate.mcp2Hero, "not-entered");
  assert.equal(gate.identity, "blocked");
  assert.equal(gate.mcp3, "not-entered");
  assert.equal(gate.placementMutationAuthorized, false);
  assert.equal(gate.modelOrMcpRerunAuthorized, false);
  assert.equal(gate.runtimeOrRegistryMutationAuthorized, false);
  assert.equal(gate.buildingComplete, false);
});

test("全部视频候选都不是乐团证据", async () => {
  const audit = await json(auditPath);
  assert.equal(audit.rawVideoExhaustion.dynamicEvidenceVideoCandidates.count, 8);
  assert.equal(audit.rawVideoExhaustion.oldKnowledgeBaseVideoCandidates.count, 7);
  assert.equal(audit.rawVideoExhaustion.targetNamedVideoCandidates, 0);
  assert.equal(audit.rawVideoExhaustion.qualifiedOrchestraVideoFound, false);
});
