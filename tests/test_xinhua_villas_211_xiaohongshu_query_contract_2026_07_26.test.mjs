import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const contractPath = "docs/research/xinhua-villas-211-xiaohongshu-query-contract-2026-07-26.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

test("211 小红书查询合同只准备证据，不重开已通过的 Massing、MCP1、地图或碰撞", async () => {
  const contract = await readJson(contractPath);
  assert.equal(contract.assetId, "xinhua-villas-211");
  assert.equal(contract.status, "query-contract-ready-not-executed");
  assert.equal(contract.executionAuthority.thisRecordExecutedSearch, false);
  assert.equal(contract.executionAuthority.browserOrXiaohongshuAccessed, false);
  assert.equal(contract.executionAuthority.parallelSearchForbidden, true);
  assert.equal(contract.frozenAcceptedStages.massing.mcp1, "pass-main-window-batch");
  assert.equal(contract.frozenAcceptedStages.massing.mapRuntime, "pass-main-window-real-browser");
  assert.equal(contract.frozenAcceptedStages.massing.collision, "pass-wall-stop-no-penetration");
  assert.equal(contract.frozenAcceptedStages.massing.movementOrScaleAuthorized, false);
  assert.equal(contract.frozenAcceptedStages.legacyHero.reuseForbidden, true);
});

test("211 查询合同锁定成员绑定、纵深和合法 Hero lineage，不得用跨资产或公网图冒充用户照片", async () => {
  const contract = await readJson(contractPath);
  assert.equal(contract.queryGroups.length, 4);
  assert.deepEqual(contract.acceptedSourceWays, [864485593, 864485594, 864485595, 864485596, 864485597, 864485598, 864485674, 864485675, 864485676]);
  assert.match(contract.hardGates.memberToOsmWay, /nine accepted source ways/);
  assert.match(contract.hardGates.legalHeroLineage, /ab05b4ec/);
  assert.ok(contract.queryGroups.find((group) => group.id === "named-member-211-2").reject.includes("xinhua-villas-329 material"));
  assert.match(contract.publicAndUserPhotoBoundary.publicImages, /cannot be labeled as user-taken/);
  assert.match(contract.publicAndUserPhotoBoundary.noSubstitution, /Do not use public images/);
});

test("211 查询合同采用保守人工限速，挑战即停；runtime disable 只能由主窗口在合理耗尽后提出", async () => {
  const contract = await readJson(contractPath);
  assert.equal(contract.rateAndSafety.maximumQueriesPerSession, 4);
  assert.equal(contract.rateAndSafety.maximumResultOpensPerSession, 8);
  assert.equal(contract.rateAndSafety.minimumSecondsBetweenResultOpens, 30);
  assert.equal(contract.rateAndSafety.minimumSecondsBetweenNewQueries, 60);
  assert.ok(contract.rateAndSafety.stopImmediatelyOn.includes("captcha or challenge"));
  assert.ok(contract.rateAndSafety.prohibited.includes("evasion, simulation or bypass of platform detection"));
  assert.equal(contract.postSearchDisposition.onlyMainWindowMayAdjudicate, true);
  assert.match(contract.postSearchDisposition.afterExhaustion, /not automatic/);
  assert.match(contract.postSearchDisposition.retention, /permanently preserved/);
});
