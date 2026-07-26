import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath =
  "docs/research/xhs-batch-browser-readiness-2026-07-26.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

test("三栋XHS合同已就绪，但Chrome未运行时不得冒充已检索", async () => {
  const record = await readJson(recordPath);
  assert.equal(record.status, "query-contracts-ready-browser-not-running");
  assert.deepEqual(record.scope.assetIds, [
    "fahua-heritage",
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
});

test("三份查询合同必须存在且全部保持not-run", async () => {
  const record = await readJson(recordPath);
  assert.equal(record.queryContracts.length, 3);
  for (const contract of record.queryContracts) {
    await access(new URL(contract.path, root));
    assert.equal(contract.executionStatus, "not-run");
  }
  assert.equal(record.nextGate.executionOwner, "main-window-xhigh");
  assert.equal(record.nextGate.parallelXhsBrowsingForbidden, true);
  assert.equal(record.nextGate.stopOnChallengeOrWarning, true);
  assert.equal(record.runtimeDisablePolicy.eligibleNow, false);
  assert.equal(record.runtimeDisablePolicy.allFilesMustRemain, true);
});
