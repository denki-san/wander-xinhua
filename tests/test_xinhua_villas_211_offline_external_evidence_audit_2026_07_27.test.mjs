import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath =
  "docs/research/xinhua-villas-211-offline-external-evidence-audit-2026-07-27.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(new URL(relativePath, root)))
    .digest("hex");
}

test("211 离线外置证据审计锁定输入且全过程只读", async () => {
  const audit = await readJson(auditPath);
  assert.equal(audit.assetId, "xinhua-villas-211");
  assert.equal(
    audit.status,
    "offline-external-evidence-exhausted-no-unregistered-admissible-media",
  );
  for (const input of Object.values(audit.localInputs)) {
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  for (const [key, value] of Object.entries(audit.scope)) {
    if (
      key.endsWith("Modified") ||
      key.endsWith("Accessed") ||
      key.endsWith("Rerun") ||
      key === "mediaDownloaded"
    ) {
      assert.equal(value, false, key);
    }
  }
  assert.match(audit.policy.wikiBoundary, /not eligible/u);
});

test("三个外置范围记录精确计数、摘要与四份快照校验结果", async () => {
  const audit = await readJson(auditPath);
  const scopes = Object.fromEntries(
    audit.searchScopes.map((scope) => [scope.id, scope]),
  );
  assert.deepEqual(
    [
      scopes["dynamic-snapshots"].fileCount,
      scopes["legacy-imports"].fileCount,
      scopes["old-threejs-knowledge-base"].fileCount,
    ],
    [4511, 1671, 316],
  );
  assert.deepEqual(
    [
      scopes["dynamic-snapshots"].pathHitCount,
      scopes["legacy-imports"].pathHitCount,
      scopes["old-threejs-knowledge-base"].pathHitCount,
    ],
    [75, 20, 1],
  );
  assert.deepEqual(
    [
      scopes["dynamic-snapshots"].mediaPathHitCount,
      scopes["legacy-imports"].mediaPathHitCount,
      scopes["old-threejs-knowledge-base"].mediaPathHitCount,
    ],
    [43, 12, 0],
  );
  assert.equal(scopes["dynamic-snapshots"].snapshots.length, 4);
  assert.ok(
    scopes["dynamic-snapshots"].snapshots.every(
      ({ checksumVerification }) => checksumVerification === "pass",
    ),
  );
  assert.equal(scopes["legacy-imports"].checksumVerification, "pass");
  for (const scope of Object.values(scopes)) {
    assert.match(scope.allFileListSha256, /^[0-9a-f]{64}$/u);
    assert.match(scope.pathHitListSha256, /^[0-9a-f]{64}$/u);
    assert.match(scope.textHitListSha256, /^[0-9a-f]{64}$/u);
  }
  assert.match(audit.reproducibleSearch.digestMethod, /shasum -a 256/u);
});

test("媒体候选全部归入已登记实拍、派生物或跨资产 Hold", async () => {
  const audit = await readJson(auditPath);
  const result = audit.crossScopeResults;
  assert.equal(result.physical211MediaPathHitCount, 55);
  assert.equal(result.unique211MediaSha256Count, 15);
  assert.equal(result.crossAssetHoldPhysicalPathCount, 8);
  assert.equal(result.candidateUniqueMediaSha256Count, 16);
  assert.equal(result.videoPathHitCount, 0);
  assert.equal(result.unregisteredAdmissibleMediaCount, 0);
  assert.equal(result.unregisteredAdmissibleManifestOrSourceRecordCount, 0);
  assert.ok(audit.candidateDisposition.every(({ newEvidence }) => newEvidence === false));

  const partition = audit.candidateDisposition
    .filter(({ uniqueSha256Count }) => Number.isInteger(uniqueSha256Count))
    .reduce((total, { uniqueSha256Count }) => total + uniqueSha256Count, 0);
  assert.equal(partition, result.candidateUniqueMediaSha256Count);

  const registered = audit.candidateDisposition.find(
    ({ id }) => id === "registered-real-211-captures",
  );
  assert.equal(registered.captures.length, 4);
  const generated = audit.candidateDisposition.find(
    ({ id }) => id === "generated-and-runtime-media",
  );
  assert.equal(generated.uniqueSha256Count, 11);
  const crossAsset = audit.candidateDisposition.find(
    ({ id }) => id === "cross-asset-329-legacy-representative",
  );
  assert.match(crossAsset.classification, /permanent-cross-asset-hold/u);
});

test("compound、211-1、211-2 与九 way 仍缺绑定、纵深、背面或合法 lineage", async () => {
  const audit = await readJson(auditPath);
  assert.deepEqual(
    audit.memberFindings.map(({ member }) => member),
    ["compound", "211-1", "211-2", "accepted-nine-way-set"],
  );
  for (const finding of audit.memberFindings) {
    assert.ok(finding.observed.length > 0, finding.member);
    assert.ok(finding.inferred.length > 0, finding.member);
    assert.ok(finding.unknown.length >= 5, finding.member);
  }
  assert.ok(
    audit.memberFindings
      .find(({ member }) => member === "211-2")
      .unknown.includes("roof-back"),
  );
  assert.equal(audit.verdict.memberToAcceptedWayAssignment, "blocked-zero-of-nine");
  assert.equal(audit.verdict.sameMemberCompleteDepthSetCount, 0);
  assert.equal(audit.verdict.legalHeroLineageFound, false);
});

test("离线穷尽不冒充小红书穷尽，保留 Massing 并锁住 Hero 与 runtime disable", async () => {
  const audit = await readJson(auditPath);
  assert.equal(audit.verdict.offlineArchiveExhausted, true);
  assert.equal(audit.verdict.queryContractExecuted, false);
  assert.equal(audit.verdict.heroAuthorized, false);
  assert.equal(audit.verdict.identityAuthorized, false);
  assert.equal(audit.verdict.runtimeDisableEligible, false);
  assert.match(
    audit.verdict.reasonRuntimeDisableNotEligible,
    /query contract has not been executed/u,
  );
  assert.equal(audit.frozenAcceptedStage.gates.mcp1, "pass-main-window-batch");
  assert.equal(
    await sha256(audit.frozenAcceptedStage.path),
    audit.frozenAcceptedStage.sha256,
  );
  assert.equal(
    audit.legacyHeroLineage.disposition,
    "retain-hold-not-mcp2-candidate",
  );
  assert.equal(audit.verdict.permanentRetention, true);
});
