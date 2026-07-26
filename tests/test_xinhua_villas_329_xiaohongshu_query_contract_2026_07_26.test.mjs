import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const contractPath =
  "docs/research/xinhua-villas-329-xiaohongshu-query-contract-2026-07-26.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(new URL(relativePath, root)))
    .digest("hex");
}

test("329 查询合同冻结四成员 Massing、MCP1、正式地图、性能与碰撞，不重做合格阶段", async () => {
  const contract = await readJson(contractPath);
  const massing = contract.frozenAcceptedStages.massing;
  assert.equal(contract.assetId, "xinhua-villas-329");
  assert.equal(contract.status, "query-contract-ready-not-executed");
  assert.equal(contract.executionAuthority.searchExecutedByThisRecord, false);
  assert.equal(contract.executionAuthority.browserOrXiaohongshuAccessed, false);
  assert.equal(await sha256(massing.path), massing.sha256);
  assert.deepEqual(massing.members, ["15", "36", "40", "42"]);
  assert.deepEqual(massing.acceptedOsmWays, [
    864493244, 864485664, 864493174, 864493173,
  ]);
  assert.equal(massing.mcp1, "pass");
  assert.equal(massing.formalMap, "pass");
  assert.match(massing.threePerformance, /^pass/u);
  assert.match(massing.collision, /^pass/u);
  assert.equal(massing.rerunOrRebuildRequired, false);
});

test("329 查询合同只研究历史花园住宅子集和17/36/38/40/42，不让67号总平或普通地址冒充", async () => {
  const contract = await readJson(contractPath);
  assert.deepEqual(contract.historicSubjectBoundary.namedMembersForSearch, [
    "17", "36", "38", "40", "42",
  ]);
  assert.equal(contract.queryGroups.length, 4);
  assert.ok(
    contract.historicSubjectBoundary.excludedNamespaceEvidence.some(
      ({ subject }) => subject === "number-67-elevator-site-plan",
    ),
  );
  assert.ok(
    contract.queryGroups[0].reject.includes("generic 329-lane address map"),
  );
  assert.match(
    contract.historicSubjectBoundary.bindingIntent,
    /does not authorize rebinding/u,
  );
});

test("329 查询合同要求同成员多视角、尺度、入口以及合法 Hero 到 Identity lineage", async () => {
  const contract = await readJson(contractPath);
  const ids = new Set(contract.acceptanceMatrix.map(({ id }) => id));
  for (const required of [
    "member-to-way-binding",
    "same-member-view-closure",
    "compound-coverage",
    "hero-lineage",
    "identity-lineage",
  ]) {
    assert.ok(ids.has(required), required);
  }
  assert.equal(
    await sha256(contract.frozenAcceptedStages.legacyHero.path),
    contract.frozenAcceptedStages.legacyHero.sha256,
  );
  assert.equal(
    contract.frozenAcceptedStages.legacyHero.reusePatchOrMcp2Forbidden,
    true,
  );
  assert.equal(
    contract.frozenAcceptedStages.identity.derivationAuthorized,
    false,
  );
});

test("329 公网证据不冒充用户实拍，未来动态证据只进不可变外置快照且不进 Wiki", async () => {
  const contract = await readJson(contractPath);
  assert.match(
    contract.publicAndUserPhotoBoundary.publicMedia,
    /never be labeled as user-taken/u,
  );
  assert.match(
    contract.publicAndUserPhotoBoundary.noSubstitution,
    /cannot fill a user-photo slot/u,
  );
  assert.equal(
    contract.dynamicEvidenceStorage.archiveTruth,
    "/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/",
  );
  assert.match(
    contract.dynamicEvidenceStorage.futureMediaAndEvidence,
    /new immutable snapshot/u,
  );
  assert.match(
    contract.dynamicEvidenceStorage.wikiBoundary,
    /must not enter any LLM Wiki/u,
  );
  assert.equal(contract.dynamicEvidenceStorage.thisRecordCreatedSnapshot, false);
});

test("329 查询必须慢速串行且警告即停，runtime disable 只能由主窗口在合理耗尽后提出", async () => {
  const contract = await readJson(contractPath);
  const safety = contract.rateAndSafety;
  assert.equal(safety.manualSerialOnly, true);
  assert.equal(safety.maximumQueriesPerSession, 4);
  assert.equal(safety.maximumResultOpensPerSession, 6);
  assert.equal(safety.minimumSecondsBetweenResultOpens, 45);
  assert.equal(safety.minimumSecondsBetweenNewQueries, 90);
  assert.ok(safety.stopImmediatelyOn.includes("captcha or challenge"));
  assert.ok(safety.stopImmediatelyOn.includes("login or verification prompt"));
  assert.ok(
    safety.prohibited.includes(
      "behavior simulation, detection evasion, challenge bypass, or retry loops",
    ),
  );
  assert.equal(contract.postSearchDisposition.onlyMainWindowMayAdjudicate, true);
  assert.match(contract.postSearchDisposition.afterExhaustion, /not automatic/u);
  assert.match(
    contract.postSearchDisposition.permanentRetention,
    /permanently preserved/u,
  );
});
