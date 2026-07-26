import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath =
  "docs/research/xhs-batch-browser-readiness-2026-07-26.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

test("十栋XHS合同已就绪，但Chrome未运行时不得冒充本窗口已检索", async () => {
  const record = await readJson(recordPath);
  assert.equal(
    record.status,
    "ten-query-contracts-ready-browser-not-running-all-blocked-building-offline-archives-audited",
  );
  assert.deepEqual(record.scope.assetIds, [
    "fahua-heritage",
    "shanghai-cinema",
    "xinhua-villas-211",
    "shanghai-orchestra",
    "xinhua-community-center",
    "debi-fahua-525",
    "xingfuli-west",
    "xingfuli-east",
    "xinhua-villas-329",
    "fics-xinhua-365",
  ]);
  assert.deepEqual(record.browserChecks.browserClientDiscoveredTypes, []);
  assert.equal(record.browserChecks.googleChrome.installed, true);
  assert.equal(record.browserChecks.googleChrome.runningProcessFound, false);
  assert.equal(record.browserChecks.chatgptChromeExtension.enabled, true);
  assert.equal(record.browserChecks.nativeMessagingHost.correct, true);
  assert.equal(record.scope.browserLaunched, false);
  assert.equal(record.scope.xiaohongshuAccessed, false);
  assert.match(record.scope.scopeStatement, /main-window diagnostic session/);
});

test("十份查询合同必须存在，法华外部证据接入不冒充本窗口检索", async () => {
  const record = await readJson(recordPath);
  assert.equal(record.queryContracts.length, 10);
  for (const contract of record.queryContracts) {
    await access(new URL(contract.path, root));
    if (contract.assetId === "fahua-heritage") {
      assert.equal(
        contract.executionStatus,
        "external-evidence-ingested-building-local-map-pending",
      );
    } else {
      assert.equal(contract.executionStatus, "not-run");
    }
  }
  assert.deepEqual(
    record.offlineExternalAudits.map(({ assetId }) => assetId),
    [
      "xinhua-villas-329",
      "fics-xinhua-365",
      "shanghai-cinema",
      "xinhua-villas-211",
      "shanghai-orchestra",
      "xinhua-community-center",
      "debi-fahua-525",
      "xingfuli-west",
      "xingfuli-east",
    ],
  );
  for (const audit of record.offlineExternalAudits) {
    await access(new URL(audit.path, root));
    assert.equal(audit.liveXhsContractStillRequired, true);
  }
  assert.deepEqual(
    record.offlineExternalAudits.map(({ assetId }) => assetId).sort(),
    record.queryContracts
      .filter(({ assetId }) => assetId !== "fahua-heritage")
      .map(({ assetId }) => assetId)
      .sort(),
  );
  assert.equal(record.offlineEvidenceCoverage.blockedAssetCount, 10);
  assert.equal(record.offlineEvidenceCoverage.offlineAuditCompleteCount, 10);
  assert.equal(record.offlineEvidenceCoverage.otherOfflineExternalAuditCount, 9);
  assert.equal(record.offlineEvidenceCoverage.mainWindowLiveXhsExecutionCount, 0);
  assert.equal(record.offlineEvidenceCoverage.liveQueryNotRunCount, 9);
  assert.equal(record.offlineEvidenceCoverage.runtimeDisableEligible, false);
  assert.equal(
    record.externalEvidenceDiscovery.discoveryStatus,
    "u-disk-package-ingested-building-local-map-pending",
  );
  await access(new URL(record.externalEvidenceDiscovery.repositoryRecord, root));
  await access(
    new URL(record.externalEvidenceDiscovery.externalExhaustionAudit, root),
  );
  assert.match(
    record.externalEvidenceDiscovery.externalExhaustionResult,
    /no-new-qualifying-media/,
  );
  assert.match(record.externalEvidenceDiscovery.manifestPathMismatch, /actual/);
  assert.equal(record.externalEvidenceDiscovery.uDiskFilesModified, false);
  assert.equal(
    record.externalEvidenceDiscovery.dynamicEvidencePolicy.archiveTruthRoot,
    "/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/",
  );
  assert.equal(
    record.externalEvidenceDiscovery.dynamicEvidencePolicy.wikiEligibility,
    false,
  );
  assert.equal(record.userPhotoSequenceMaterialization.claimedPhotoCount, 9);
  assert.equal(record.userPhotoSequenceMaterialization.readableAttachmentCount, 0);
  assert.equal(record.userPhotoSequenceMaterialization.routeEndRoadAccepted, false);
  await access(
    new URL(
      record.userPhotoSequenceMaterialization.externalMaterializationAudit,
      root,
    ),
  );
  assert.match(
    record.userPhotoSequenceMaterialization.externalAuditResult,
    /zero-attributable-original-files/,
  );
  assert.equal(record.nextGate.executionOwner, "main-window-xhigh");
  assert.equal(record.nextGate.parallelXhsBrowsingForbidden, true);
  assert.equal(record.nextGate.stopOnChallengeOrWarning, true);
  assert.equal(record.runtimeDisablePolicy.eligibleNow, false);
  assert.equal(record.runtimeDisablePolicy.allFilesMustRemain, true);
});
