import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
const root = new URL("../", import.meta.url);
const path = "docs/research/xingfuli-west-xhs-query-contract-2026-07-26.json";
async function json(p) { return JSON.parse(await readFile(new URL(p, root), "utf8")); }
async function sha(p) { return createHash("sha256").update(await readFile(new URL(p, root))).digest("hex"); }
test("xingfuli west XHS contract 不访问平台且锁定已有三档与道路 blocker", async () => {
  const contract = await json(path);
  assert.equal(contract.status, "prepared-no-xiaohongshu-access-or-media-download");
  for (const input of Object.values(contract.inputs)) assert.equal(await sha(input.path), input.sha256, input.path);
  assert.equal(contract.scope.xiaohongshuAccessed, false);
  assert.equal(contract.scope.mediaDownloaded, false);
  assert.equal(contract.retainedStages.heroIdentityMassing, "pass-retained-no-rebuild");
  assert.equal(contract.retainedStages.map, "blocked-way-400066625-passage-unknown");
});
test("xingfuli west XHS contract 要求通道和道路界面，不把公网九图当用户实拍", async () => {
  const contract = await json(path);
  assert.equal(contract.queryPlan.maximumResultsToOpenPerSession, 10);
  assert.ok(contract.queryPlan.minimumSecondsBetweenOpenActions >= 45);
  assert.ok(contract.queryPlan.minimumSecondsBeforeNextSearchAfterPostInspection >= 90);
  assert.equal(contract.evidenceRules.publicNineImagesAreNotUserOriginals, true);
  assert.equal(contract.evidenceRules.userOriginalCountInRepository, 0);
  assert.equal(contract.acceptanceMatrix.length, 3);
  assert.ok(contract.acceptanceMatrix[0].mustShow.includes("ground-level passage or opening"));
  assert.ok(contract.acceptanceMatrix[1].mustShow.includes("curb/road/paving edge"));
  assert.equal(contract.runtimeDisablePolicy.authorizedNow, false);
});
