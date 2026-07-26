import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const contractPath = "docs/research/shanghai-cinema-xiaohongshu-query-contract-2026-07-26.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256File(relativePath) {
  const source = await readFile(new URL(relativePath, root));
  return createHash("sha256").update(source).digest("hex");
}

test("上海影城小红书查询合同只准备精确地图补证，锁定既有合格阶段", async () => {
  const contract = await readJson(contractPath);
  for (const input of Object.values(contract.verifiedInputs)) {
    assert.equal(await sha256File(input.path), input.sha256, input.path);
  }
  assert.equal(contract.assetId, "shanghai-cinema");
  assert.equal(contract.status, "prepared-awaiting-main-window-human-paced-xiaohongshu-search");
  assert.match(contract.retainedAcceptedStages.tiers, /do not rebuild or replace/u);
  assert.match(contract.retainedAcceptedStages.blenderMcp, /do not rerun/u);
  assert.match(contract.retainedAcceptedStages.threeJs, /do not rerun/u);
  assert.match(contract.retainedAcceptedStages.map, /does not mutate/u);
});

test("查询范围、慢速人工预算与挑战停止线禁止自动化或规避", async () => {
  const contract = await readJson(contractPath);
  assert.equal(contract.scope.browserAccessed, false);
  assert.equal(contract.scope.xiaohongshuAccessed, false);
  assert.equal(contract.scope.networkSearchExecuted, false);
  assert.equal(contract.scope.mediaDownloaded, false);
  assert.equal(contract.searchPlan.exactQueryGroups.length, 4);
  assert.deepEqual(contract.searchPlan.maximumResultsToOpen, {
    perQuery: 4,
    total: 24,
    perSessionMinutes: 15,
  });
  assert.equal(contract.searchPlan.humanPace.noBulkAutomation, true);
  assert.equal(contract.searchPlan.humanPace.noSimulationOrDetectionEvasion, true);
  assert.match(contract.searchPlan.humanPace.challengeStopLine, /Stop immediately/u);
});

test("社会图片只能补充可定位街道界面，不能伪装成测绘总平或提前下架", async () => {
  const contract = await readJson(contractPath);
  assert.equal(contract.requiredSameSubjectHits.streetInterface.required, true);
  assert.equal(contract.requiredSameSubjectHits.twoBoundaryControls.required, true);
  assert.ok(contract.mediaClassification.notSufficient.some((entry) => entry.includes("surveyed plan")));
  assert.equal(contract.rejectionAndDisposition.whoMayConfirmMiss, "main window only");
  assert.match(contract.rejectionAndDisposition.beforeMainWindowConfirmation, /No runtime-disable candidate/u);
  assert.match(contract.rejectionAndDisposition.afterMainWindowConfirmation, /permanently preserved/u);
  assert.ok(contract.rejectionAndDisposition.stillNotAuthorized.includes("delete files"));
  assert.ok(contract.rejectionAndDisposition.stillNotAuthorized.includes("claim map acceptance"));
});
