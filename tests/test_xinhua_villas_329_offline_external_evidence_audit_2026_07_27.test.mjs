import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath =
  "docs/research/xinhua-villas-329-offline-external-evidence-audit-2026-07-27.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(new URL(relativePath, root)))
    .digest("hex");
}

test("329 离线外置证据审计锁定本地输入且全过程只读", async () => {
  const audit = await readJson(auditPath);
  assert.equal(audit.assetId, "xinhua-villas-329");
  assert.equal(
    audit.status,
    "offline-external-evidence-exhausted-no-unregistered-admissible-media",
  );
  for (const input of Object.values(audit.localInputs)) {
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  for (const [key, value] of Object.entries(audit.scope)) {
    if (key.endsWith("Modified") || key.endsWith("Accessed") || key === "mediaDownloaded") {
      assert.equal(value, false, key);
    }
  }
  assert.match(audit.policy.wikiBoundary, /not eligible/u);
});

test("三个外置范围记录精确计数、路径摘要与校验状态，可按合同复算", async () => {
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
    [3350, 1671, 316],
  );
  assert.deepEqual(
    [
      scopes["dynamic-snapshots"].pathHitCount,
      scopes["legacy-imports"].pathHitCount,
      scopes["old-threejs-knowledge-base"].pathHitCount,
    ],
    [114, 60, 1],
  );
  assert.equal(scopes["dynamic-snapshots"].snapshots.length, 3);
  assert.ok(
    scopes["dynamic-snapshots"].snapshots.every(
      ({ checksumVerification }) => checksumVerification === "pass",
    ),
  );
  assert.equal(scopes["legacy-imports"].checksumVerification, "pass");
  assert.equal(
    scopes["legacy-imports"].verificationCorrection.correctedResult,
    "pass",
  );
  for (const scope of Object.values(scopes)) {
    assert.match(scope.allFileListSha256, /^[0-9a-f]{64}$/u);
    assert.match(scope.pathHitListSha256, /^[0-9a-f]{64}$/u);
    assert.match(scope.textHitListSha256, /^[0-9a-f]{64}$/u);
  }
  assert.match(audit.reproducibleSearch.digestMethod, /shasum -a 256/u);
});

test("离线候选全部归入已登记证据、派生物或跨资产 Hold，没有遗漏真实媒体", async () => {
  const audit = await readJson(auditPath);
  const result = audit.crossScopeResults;
  assert.equal(result.physical329MediaPathHitCount, 141);
  assert.equal(result.uniqueMediaSha256Count, 44);
  assert.equal(result.videoPathHitCount, 0);
  assert.equal(result.unregisteredAdmissibleMediaCount, 0);
  assert.equal(result.unregisteredAdmissibleManifestOrSourceRecordCount, 0);
  assert.ok(audit.candidateDisposition.every(({ newEvidence }) => newEvidence === false));
  const uniqueMediaPartition = audit.candidateDisposition
    .filter(({ uniqueSha256Count }) => Number.isInteger(uniqueSha256Count))
    .reduce((total, { uniqueSha256Count }) => total + uniqueSha256Count, 0);
  assert.equal(uniqueMediaPartition, result.uniqueMediaSha256Count);
  const xhs = audit.candidateDisposition.find(
    ({ id }) => id === "xhs-696d1838000000002102bc99",
  );
  assert.equal(xhs.usableRealCaptureCount, 9);
  assert.equal(xhs.needsReviewBlackMediaCount, 9);
  assert.equal(xhs.videoOrOriginalFrameManifestFound, false);
  const temporary = audit.candidateDisposition.find(
    ({ id }) => id === "temporary-official-images",
  );
  assert.equal(temporary.offlineBinaryFound, false);
  assert.equal(temporary.recordedSha256.length, 4);
});

test("17/36/38/40/42 仍缺 way、多视角、入口连续性、背面或 roof-back", async () => {
  const audit = await readJson(auditPath);
  assert.deepEqual(
    audit.memberFindings.map(({ member }) => member),
    ["17", "36", "38", "40", "42"],
  );
  for (const finding of audit.memberFindings) {
    assert.ok(finding.observed.length > 0, finding.member);
    assert.ok(finding.inferred.length > 0, finding.member);
    assert.ok(finding.unknown.length >= 4, finding.member);
  }
  assert.ok(
    audit.memberFindings
      .find(({ member }) => member === "42")
      .unknown.includes("roof connection"),
  );
});

test("离线穷尽不冒充真实小红书穷尽，不授权 Hero、Identity 或 runtime disable", async () => {
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
  assert.equal(audit.verdict.permanentRetention, true);
});
