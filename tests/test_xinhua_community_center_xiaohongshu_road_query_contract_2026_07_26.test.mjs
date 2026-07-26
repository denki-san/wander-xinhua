import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const contractPath = "docs/research/xinhua-community-center-xiaohongshu-road-query-contract-2026-07-26.json";

async function json(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

test("社区营造中心小红书道路查询合同保持只读和未执行", async () => {
  const contract = await json(contractPath);
  assert.equal(contract.assetId, "xinhua-community-center");
  assert.equal(contract.status, "query-contract-ready-not-executed");
  assert.equal(contract.scope.browserOrXiaohongshuAccessed, false);
  assert.equal(contract.scope.networkAccessed, false);
  assert.equal(contract.scope.mediaDownloaded, false);
  assert.equal(contract.scope.modelOrGeneratorModified, false);
  assert.equal(contract.scope.sharedRuntimeOrRoadContractModified, false);
  assert.equal(contract.scope.sharedRegistryOrFastManifestModified, false);
  assert.equal(contract.scope.recoveryOrHoldModified, false);
});

test("社区营造中心道路查询锁定既有合格阶段和正式地图阻塞", async () => {
  const contract = await json(contractPath);
  assert.deepEqual(contract.scope.acceptedStagesRetainedWithoutRerun, [
    "Building-4 Massing v2",
    "MCP1 Massing axis recheck",
    "Three.js resource and console diagnostics",
    "Three.js wall-stop collision replay"
  ]);
  assert.equal(contract.frozenInputs.buildingWayId, 864493234);
  assert.equal(contract.frozenInputs.roadWayId, 577252269);
  assert.equal(contract.frozenInputs.currentMapGate, "blocked-road-surface-overlap");
  assert.equal(contract.decisionBoundary.runtimeDisable.eligibleNow, false);
});

test("道路证据矩阵禁止将碰撞或几何阈值冒充实测宽度", async () => {
  const contract = await json(contractPath);
  assert.deepEqual(
    contract.searchContract.acceptanceMatrix.map(({ id }) => id),
    [
      "both-road-edges",
      "centerline-or-offset-chain",
      "measurable-scale",
      "date-and-provenance",
      "surface-and-access",
      "location-binding"
    ]
  );
  assert.equal(contract.searchContract.acceptanceMatrix.every(({ required }) => required), true);
  assert.ok(contract.searchContract.rejectionRules.some((rule) => rule.includes("运行时碰撞通过")));
  assert.ok(contract.searchContract.rejectionRules.some((rule) => rule.includes("移楼、缩放")));
  assert.equal(contract.searchContract.humanPacedBudget.parallelSessions, 0);
  assert.deepEqual(contract.searchContract.humanPacedBudget.stopImmediatelyOn, [
    "rate warning", "verification challenge", "login prompt", "security warning"
  ]);
});
