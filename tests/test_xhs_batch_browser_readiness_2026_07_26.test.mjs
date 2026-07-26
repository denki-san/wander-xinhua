import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath =
  "docs/research/xhs-batch-browser-readiness-2026-07-26.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

test("十栋XHS合同保持串行，上海影城部分执行不得冒充已完成", async () => {
  const record = await readJson(recordPath);
  assert.equal(
    record.status,
    "one-live-contract-partial-browser-connection-interrupted-nine-other-contracts-pending",
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
  assert.deepEqual(record.browserChecks.browserClientDiscoveredTypes, ["extension"]);
  assert.equal(record.browserChecks.googleChrome.installed, true);
  assert.equal(record.browserChecks.googleChrome.runningProcessFound, true);
  assert.equal(record.browserChecks.chatgptChromeExtension.enabled, true);
  assert.equal(record.browserChecks.nativeMessagingHost.correct, true);
  assert.equal(record.scope.browserLaunched, false);
  assert.equal(record.scope.xiaohongshuAccessed, true);
  assert.match(record.scope.scopeStatement, /already-running Chrome session/);
});

test("十份查询合同必须存在，部分执行与未运行状态严格分开", async () => {
  const record = await readJson(recordPath);
  assert.equal(record.queryContracts.length, 10);
  for (const contract of record.queryContracts) {
    await access(new URL(contract.path, root));
    if (contract.assetId === "fahua-heritage") {
      assert.equal(
        contract.executionStatus,
        "external-evidence-ingested-building-local-map-pending",
      );
    } else if (contract.assetId === "shanghai-cinema") {
      assert.equal(
        contract.executionStatus,
        "partial-one-query-two-posts-map-anchor-still-blocked-browser-connection-interrupted",
      );
      await access(new URL(contract.liveAudit, root));
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
  assert.equal(record.offlineEvidenceCoverage.mainWindowLiveXhsExecutionCount, 1);
  assert.equal(record.offlineEvidenceCoverage.liveQueryNotRunCount, 8);
  assert.equal(record.offlineEvidenceCoverage.liveQueryPartialCount, 1);
  assert.equal(record.offlineEvidenceCoverage.runtimeDisableEligible, false);
  assert.equal(record.liveEvidenceArchives.length, 1);
  assert.deepEqual(record.liveEvidenceArchives[0], {
    assetId: "shanghai-cinema",
    snapshotId: "2026-07-27-4171c5d",
    snapshotRoot:
      "/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/2026-07-27-4171c5d",
    repositoryRecord:
      "repository/docs/research/shanghai-cinema-xiaohongshu-live-audit-2026-07-27.json",
    repositoryRecordSha256:
      "2253c9357fa2667701bc9ddaaaf413a0105b4cd8582afc4e537227214900b103",
    manifestSha256:
      "2fbef578fecb7007f7fec3c03321e1b430a4fdc8f2089f9cfc5d235fc4742cf5",
    checksumFileSha256:
      "66189e8408f08780a79c954f210391eea577aba3101a5b2515bfea2399131b3f",
    declaredFileCount: 1166,
    declaredByteCount: 477089792,
    fullChecksumVerification: "pass",
    sourceWorktreeDirty: false,
    wikiEligible: false,
    rawMediaStatus: "not-materialized-browser-connection-interrupted",
  });
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
