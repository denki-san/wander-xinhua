import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath =
  "docs/research/shanghai-orchestra-xiaohongshu-query-contract-2026-07-26.json";

async function json(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(new URL(relativePath, root)))
    .digest("hex");
}

test("民族乐团小红书合同只准备查询且保留已验收的诊断阶段", async () => {
  const record = await json(recordPath);
  for (const input of Object.values(record.verifiedInputs)) {
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  assert.equal(record.status, "prepared-not-executed-main-window-human-paced-xiaohongshu-search-required");
  assert.equal(record.scope.binaryModified, false);
  assert.equal(record.scope.sharedFilesModified, false);
  assert.equal(record.scope.recoveryHoldModified, false);
  assert.equal(record.scope.runtimeDisabled, false);
  assert.match(record.retainedAcceptedStages.mcp1, /do not rerun/u);
  assert.match(record.retainedAcceptedStages.threeDiagnostic, /do not rerun/u);
});

test("民族乐团查询要求成员和道路控制，且地址或节目不能冒充 way binding", async () => {
  const record = await json(recordPath);
  assert.equal(record.queryContract.searchGroups.length, 4);
  assert.equal(record.queryContract.executionStatus, "not-run");
  assert.equal(record.queryContract.accessBoundary.noParallelTabsOrAutomatedScrollLoop, true);
  assert.equal(record.queryContract.accessBoundary.noCaptchaRateLimitLoginOrPlatformWarningBypass, true);
  assert.equal(record.queryContract.accessBoundary.doNotAttemptToImitateOrEvadePlatformDetection, true);
  assert.match(record.currentEvidenceBoundary.nonEvidence[0], /programme|address/u);
  assert.deepEqual(record.qualificationAndDisposition.allRequiredMatrixIds, [
    "same-subject-and-address",
    "member-label-or-way-control",
    "compound-boundary-and-exclusion",
    "entrance-road-relation",
    "footprint-calibration-controls",
    "hero-identity-source-legality",
    "currentness-and-alteration",
  ]);
  assert.equal(record.acceptanceMatrix.find((row) => row.id === "member-label-or-way-control").required, true);
  assert.equal(record.acceptanceMatrix.find((row) => row.id === "entrance-road-relation").required, true);
  assert.equal(record.acceptanceMatrix.find((row) => row.id === "footprint-calibration-controls").required, true);
});

test("合理未命中由主窗口裁决，运行时停用只允许移出 runtime 且永久保留文件", async () => {
  const record = await json(recordPath);
  assert.equal(record.qualificationAndDisposition.whoMayConfirmMiss, "main window only");
  assert.match(record.qualificationAndDisposition.beforeMainWindowConfirmation, /No runtime-disable candidate/u);
  assert.match(record.qualificationAndDisposition.afterMainWindowConfirmation, /registry\/runtime/u);
  assert.ok(record.qualificationAndDisposition.stillNotAuthorized.includes("delete files"));
  assert.ok(record.qualificationAndDisposition.stillNotAuthorized.includes("modify Recovery/Hold"));
  assert.equal(record.rawMediaRetention.currentAction, "No directory or media is created by this preparation commit.");
});
