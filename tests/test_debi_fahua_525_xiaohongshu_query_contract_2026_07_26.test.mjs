import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const contractPath = "docs/research/debi-fahua-525-xiaohongshu-query-contract-2026-07-26.json";

async function bytes(path) {
  return readFile(new URL(path, root));
}

async function json(path) {
  return JSON.parse((await bytes(path)).toString("utf8"));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

test("德必小红书合同只准备查询，不访问平台也不改资产或公共状态", async () => {
  const contract = await json(contractPath);
  assert.equal(contract.assetId, "debi-fahua-525");
  assert.equal(contract.status, "query-contract-ready-not-executed");
  assert.equal(contract.scope.browserOpened, false);
  assert.equal(contract.scope.xiaohongshuAccessed, false);
  assert.equal(contract.scope.networkAccessed, false);
  assert.equal(contract.scope.mediaDownloaded, false);
  assert.equal(contract.scope.modelOrRuntimeChanged, false);
  assert.equal(contract.scope.recoveryOrHoldChanged, false);
  assert.equal(contract.disposition.actualSearchStatus, "not-executed");
});

test("合同锁定三张本栋证据与 Recovery 保留阶段，禁止借面积或道路改动蒙混地图门", async () => {
  const contract = await json(contractPath);
  for (const source of Object.values(contract.lockedInputs)) {
    assert.equal(sha256(await bytes(source.path)), source.sha256, source.path);
  }
  assert.equal(contract.retainedStages.recoveryCleanV2Massing.runtimeVisibility, "pass-preserved");
  assert.match(contract.retainedStages.recoveryCleanV2Massing.policy, /do not rebuild/u);
  assert.equal(contract.retainedStages.isolatedMassingV3.mcp1, "pending-not-redone");
  assert.match(contract.retainedStages.legacyHero.status, /scope-polluted/u);
  assert.equal(contract.knownControls.representativeWay.id, 864847922);
  assert.equal(contract.knownControls.compoundMemberCandidates.length, 5);
  assert.equal(contract.knownControls.fahuazhenRoad.osmWay, 66394007);
  assert.ok(contract.knownControls.fahuazhenRoad.exactFootprintAsphaltClearanceSceneUnits < 0);
  assert.match(contract.knownControls.prohibitedInference.join(" "), /not a footprint/u);
  assert.match(contract.knownControls.prohibitedInference.join(" "), /narrowing shared road width/u);
});

test("查询矩阵覆盖成员、庭院、双道路缘和入口，但不会提前授权 Hero 或 Identity", async () => {
  const contract = await json(contractPath);
  assert.deepEqual(contract.queryGroups.map(({ id }) => id), [
    "compound-members-and-courtyard",
    "road-surface-curb-access",
    "entrance-and-legal-lineage",
  ]);
  for (const group of contract.queryGroups) {
    assert.ok(group.queries.length >= 3, group.id);
    assert.ok(group.accept.length >= 3, group.id);
    assert.ok(group.reject.length >= 3, group.id);
  }
  assert.match(contract.acceptanceMatrix.fahuazhenRoadWidth, /cannot narrow the shared road/u);
  assert.match(contract.acceptanceMatrix.heroIdentityLineage, /MCP1/u);
  assert.match(contract.queryGroups[2].doesNotAuthorize.join(" "), /Identity/u);
});

test("慢速串行和平台警告停止规则不包含模拟或规避行为", async () => {
  const contract = await json(contractPath);
  const ops = contract.slowSerialOperation;
  assert.equal(ops.executor, "main-window-xhigh-only");
  assert.equal(ops.parallelXiaohongshuSessions, 0);
  assert.ok(ops.maxQueriesPerSession <= 4);
  assert.ok(ops.maxPostOpensPerSession <= 6);
  assert.ok(ops.minimumSecondsBetweenSearches >= 45);
  assert.ok(ops.minimumSecondsBetweenPostOpens >= 20);
  assert.ok(ops.minimumSecondsAfterPostBeforeNewSearch >= 90);
  assert.match(ops.forbiddenActions.join(" "), /rate-limit evasion/u);
  assert.match(ops.forbiddenActions.join(" "), /simulating human behavior/u);
  assert.ok(ops.stopImmediatelyOn.includes("challenge"));
  assert.match(contract.disposition.runtimeDisable, /candidate-only/u);
  assert.match(contract.disposition.retention, /permanently retained/u);
});
