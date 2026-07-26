import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath =
  "docs/research/xhs-batch-browser-readiness-2026-07-26.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

test("六栋XHS合同已就绪，但Chrome未运行时不得冒充本窗口已检索", async () => {
  const record = await readJson(recordPath);
  assert.equal(
    record.status,
    "query-contracts-ready-browser-not-running-external-fahua-evidence-discovered",
  );
  assert.deepEqual(record.scope.assetIds, [
    "fahua-heritage",
    "shanghai-cinema",
    "xinhua-villas-211",
    "shanghai-orchestra",
    "xingfuli-west",
    "xingfuli-east",
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

test("六份查询合同必须存在，法华外部证据不冒充本窗口检索", async () => {
  const record = await readJson(recordPath);
  assert.equal(record.queryContracts.length, 6);
  for (const contract of record.queryContracts) {
    await access(new URL(contract.path, root));
    if (contract.assetId === "fahua-heritage") {
      assert.equal(
        contract.executionStatus,
        "external-evidence-discovered-validation-pending",
      );
    } else {
      assert.equal(contract.executionStatus, "not-run");
    }
  }
  assert.equal(
    record.externalEvidenceDiscovery.discoveryStatus,
    "u-disk-package-found-corrected-ingestion-pending",
  );
  assert.match(record.externalEvidenceDiscovery.manifestPathMismatch, /actual/);
  assert.equal(record.externalEvidenceDiscovery.uDiskFilesModified, false);
  assert.equal(record.nextGate.executionOwner, "main-window-xhigh");
  assert.equal(record.nextGate.parallelXhsBrowsingForbidden, true);
  assert.equal(record.nextGate.stopOnChallengeOrWarning, true);
  assert.equal(record.runtimeDisablePolicy.eligibleNow, false);
  assert.equal(record.runtimeDisablePolicy.allFilesMustRemain, true);
});
