import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath =
  "docs/research/fahua-heritage-xiaohongshu-query-contract-2026-07-26.json";

async function json(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(new URL(relativePath, root)))
    .digest("hex");
}

test("法华遗韵小红书合同只准备检索，不访问会话或重跑合格阶段", async () => {
  const record = await json(recordPath);
  for (const input of Object.values(record.verifiedInputs)) {
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  assert.equal(record.status, "prepared-awaiting-main-window-human-paced-xiaohongshu-search");
  assert.equal(record.scope.browserAccessed, false);
  assert.equal(record.scope.xiaohongshuAccessed, false);
  assert.equal(record.scope.mediaDownloaded, false);
  assert.equal(record.scope.qualifiedStageRerun, false);
  assert.equal(record.scope.binaryModified, false);
  assert.equal(record.scope.publicRegistryModified, false);
  assert.equal(record.scope.runtimeDisabled, false);
});

test("查询合同要求同主体多视角与道路界面，不接受漂亮的正面重复图", async () => {
  const record = await json(recordPath);
  assert.equal(record.searchPlan.exactQueryGroups.length, 4);
  assert.equal(record.searchPlan.maximumResultsToOpen.perQuery, 6);
  assert.equal(record.searchPlan.maximumResultsToOpen.total, 36);
  assert.equal(record.searchPlan.humanPace.noBulkAutomation, true);
  assert.equal(record.requiredSameSubjectHits.sideOrRear.required, true);
  assert.equal(record.requiredSameSubjectHits.entranceOrIdentityDetail.required, true);
  assert.equal(record.requiredSameSubjectHits.streetInterface.required, true);
  assert.equal(record.requiredSameSubjectHits.mapBinding.required, true);
  assert.ok(record.mediaClassification.notSufficient.includes("front-only duplicate"));
  assert.ok(record.mediaClassification.notSufficient.includes("adjacent DeBi Fahu 525 stone, water feature, or unrelated arch"));
});

test("合理未命中必须由主窗口确认，且停用候选绝不删除资产或证据", async () => {
  const record = await json(recordPath);
  assert.equal(record.rejectionAndDisposition.whoMayConfirmMiss, "main window only");
  assert.match(record.rejectionAndDisposition.beforeMainWindowConfirmation, /No runtime disable candidate/u);
  assert.match(record.rejectionAndDisposition.afterMainWindowConfirmation, /registry\/runtime/u);
  assert.ok(record.rejectionAndDisposition.stillNotAuthorized.includes("delete files"));
  assert.ok(record.rejectionAndDisposition.stillNotAuthorized.includes("modify Recovery/Hold"));
  assert.equal(
    record.rawMediaRetention.repositoryRoot,
    "docs/research/assets/xiaohongshu/fahua-heritage/original/",
  );
  assert.equal(record.rawMediaRetention.currentAction, "No directory or media is created by this preparation commit.");
});
