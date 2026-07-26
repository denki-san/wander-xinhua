import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath =
  "docs/research/debi-fahua-525-offline-external-evidence-audit-2026-07-27.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(new URL(relativePath, root)))
    .digest("hex");
}

test("Debi 525 离线外置证据审计锁定本栋输入且全过程只读", async () => {
  const audit = await readJson(auditPath);
  assert.equal(audit.assetId, "debi-fahua-525");
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

test("三个外置范围记录精确计数、摘要与五份快照校验结果", async () => {
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
    [5675, 1671, 316],
  );
  assert.deepEqual(
    [
      scopes["dynamic-snapshots"].pathHitCount,
      scopes["legacy-imports"].pathHitCount,
      scopes["old-threejs-knowledge-base"].pathHitCount,
    ],
    [46, 16, 1],
  );
  assert.deepEqual(
    [
      scopes["dynamic-snapshots"].mediaPathHitCount,
      scopes["legacy-imports"].mediaPathHitCount,
      scopes["old-threejs-knowledge-base"].mediaPathHitCount,
    ],
    [26, 10, 0],
  );
  assert.equal(scopes["dynamic-snapshots"].snapshots.length, 5);
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

test("六个媒体 SHA 全部归入已登记实拍、场地 Hold 或派生图", async () => {
  const audit = await readJson(auditPath);
  const result = audit.crossScopeResults;
  assert.equal(result.physicalMediaPathHitCount, 36);
  assert.equal(result.uniqueMediaSha256Count, 6);
  assert.equal(result.videoPathHitCount, 0);
  assert.equal(result.unregisteredAdmissibleMediaCount, 0);
  assert.equal(result.unregisteredAdmissibleManifestOrSourceRecordCount, 0);
  assert.ok(audit.candidateDisposition.every(({ newEvidence }) => newEvidence === false));

  const partition = audit.candidateDisposition
    .filter(({ uniqueSha256Count }) => Number.isInteger(uniqueSha256Count))
    .reduce((total, { uniqueSha256Count }) => total + uniqueSha256Count, 0);
  assert.equal(partition, result.uniqueMediaSha256Count);

  const registered = audit.candidateDisposition.find(
    ({ id }) => id === "registered-building-and-compound-photos",
  );
  assert.equal(registered.captures.length, 3);
  const siteDetail = audit.candidateDisposition.find(
    ({ id }) => id === "heritage-stone-site-detail",
  );
  assert.match(siteDetail.classification, /outside-pure-building-scope/u);
  const wrongSubject = audit.candidateDisposition.find(
    ({ id }) => id === "fahua-heritage-cross-asset",
  );
  assert.equal(wrongSubject.classification, "wrong-subject-cross-asset-hold");
});

test("三张建筑视图不提供道路、入口连续性、成员绑定或配准控制", async () => {
  const audit = await readJson(auditPath);
  assert.deepEqual(
    audit.visualFindings.map(({ view }) => view),
    [
      "main-building-front",
      "internal-courtyard-drive",
      "garden-side-building",
    ],
  );
  for (const finding of audit.visualFindings) {
    assert.ok(finding.observed.length > 0, finding.view);
    assert.ok(finding.inferred.length > 0, finding.view);
    assert.ok(finding.unknown.length >= 6, finding.view);
  }
  assert.equal(
    audit.roadAndMembershipFindings.representativeWay.primaryMembershipProofFoundOffline,
    false,
  );
  assert.equal(
    audit.roadAndMembershipFindings.memberListOrFootprintPlanFoundOffline,
    false,
  );
  assert.equal(
    audit.roadAndMembershipFindings.entranceContinuityControlFoundOffline,
    false,
  );
  assert.equal(
    audit.roadAndMembershipFindings.fahuazhenRoad
      .measuredWidthOrAuthoritativeCrossSectionFoundOffline,
    false,
  );
});

test("离线穷尽不重开 Recovery visibility，也不授权地图、Hero 或 Identity", async () => {
  const audit = await readJson(auditPath);
  assert.equal(audit.verdict.offlineArchiveExhausted, true);
  assert.equal(audit.verdict.queryContractExecuted, false);
  assert.equal(audit.verdict.acceptedMassingExists, false);
  assert.equal(audit.verdict.mcp1Passed, false);
  assert.equal(audit.verdict.formalMapAccepted, false);
  assert.equal(audit.verdict.heroAuthorized, false);
  assert.equal(audit.verdict.identityAuthorized, false);
  assert.equal(audit.verdict.runtimeDisableEligible, false);
  assert.match(
    audit.verdict.reasonRuntimeDisableNotEligible,
    /query contract has not been executed/u,
  );
  assert.equal(
    audit.retainedStages.recoveryMassingV2.runtimeVisibility,
    "pass-preserved",
  );
  assert.equal(audit.verdict.recoveryVisibilityRetention, true);
  assert.equal(
    await sha256(audit.legacyHeroLineage.path),
    audit.legacyHeroLineage.sha256,
  );
  assert.equal(
    audit.legacyHeroLineage.disposition,
    "retain-hold-not-mcp2-or-identity-parent",
  );
  assert.equal(audit.verdict.permanentRetention, true);
});
