import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const contractPath = "docs/research/fics-xinhua-365-xiaohongshu-query-contract-2026-07-26.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256File(relativePath) {
  const source = await readFile(new URL(relativePath, root));
  return createHash("sha256").update(source).digest("hex");
}

test("FICS 小红书查询合同锁定 Recovery Massing、MCP1、投影和诊断运行时", async () => {
  const contract = await readJson(contractPath);
  for (const input of Object.values(contract.verifiedInputs)) {
    assert.equal(await sha256File(input.path), input.sha256, input.path);
  }
  assert.equal(contract.assetId, "fics-xinhua-365");
  assert.equal(contract.status, "prepared-awaiting-main-window-human-paced-xiaohongshu-search");
  assert.match(contract.retainedAcceptedStages.recoveryMassing, /do not rebuild/u);
  assert.match(contract.retainedAcceptedStages.mcp1, /must not be rerun/u);
  assert.match(contract.retainedAcceptedStages.projection, /do not recalculate/u);
  assert.match(contract.retainedAcceptedStages.threeAndCollisionDiagnostic, /do not rerun/u);
});

test("FICS 合同保持五个匿名候选与 service way 的真实阻塞边界", async () => {
  const contract = await readJson(contractPath);
  assert.deepEqual(contract.knownGeometryContract.candidateBuildingWayIds, [
    864493178,
    864493177,
    864493179,
    864493181,
    864493230,
  ]);
  assert.equal(contract.knownGeometryContract.candidateRole, "unbound-member-candidate");
  assert.equal(contract.knownGeometryContract.serviceWay.osmWayId, 577252268);
  assert.equal(contract.knownGeometryContract.serviceWay.closestCandidateWayId, 864493177);
  assert.deepEqual(contract.knownGeometryContract.serviceWay.missingTags, [
    "surface",
    "width",
    "lanes",
    "bridge",
    "tunnel",
    "covered",
    "layer",
  ]);
  assert.ok(contract.knownGeometryContract.serviceWay.currentRenderedCoreClearanceMeters < 0);
  assert.equal(contract.knownGeometryContract.promotionAuthorized, false);
});

test("FICS 查询按慢速串行执行并在平台挑战时停止", async () => {
  const contract = await readJson(contractPath);
  assert.equal(contract.scope.browserAccessed, false);
  assert.equal(contract.scope.xiaohongshuAccessed, false);
  assert.equal(contract.scope.networkSearchExecuted, false);
  assert.equal(contract.scope.mediaDownloaded, false);
  assert.equal(contract.searchPlan.queryGroups.length, 5);
  assert.deepEqual(contract.searchPlan.maximumResultsToOpen, {
    perQuery: 4,
    total: 28,
    perSessionMinutes: 20,
  });
  assert.equal(contract.searchPlan.humanPace.serialOnly, true);
  assert.equal(contract.searchPlan.humanPace.noBulkAutomation, true);
  assert.equal(contract.searchPlan.humanPace.noSimulationOrDetectionEvasion, true);
  assert.match(contract.searchPlan.humanPace.challengeStopLine, /Stop immediately/u);
});

test("开放社区宣传不能冒充道路、成员或 footprint 证据", async () => {
  const contract = await readJson(contractPath);
  assert.equal(contract.acceptanceMatrix.length, 5);
  assert.ok(contract.globalRejections.some((entry) => entry.includes("open community")));
  assert.match(contract.captureAndClassification.publicityBoundary, /never upgrades/u);
  assert.ok(
    contract.acceptanceMatrix
      .find(({ category }) => category === "service-way-surface-width-cover-access")
      .reject.some((entry) => entry.includes("open-community")),
  );
});

test("动态证据只进入外置不可变快照，合理耗尽前不得停用运行时", async () => {
  const contract = await readJson(contractPath);
  assert.equal(
    contract.dynamicEvidenceStorage.archiveTruthRoot,
    "/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/",
  );
  assert.equal(contract.dynamicEvidenceStorage.immutableSnapshots, true);
  assert.equal(contract.dynamicEvidenceStorage.newSnapshotForEveryUpdate, true);
  assert.match(contract.dynamicEvidenceStorage.wikiPolicy, /must not enter any LLM Wiki/u);
  assert.equal(contract.rejectionAndDisposition.whoMayConfirmMiss, "main window only");
  assert.match(
    contract.rejectionAndDisposition.beforeMainWindowConfirmation,
    /No runtime-disable candidate/u,
  );
  assert.match(contract.rejectionAndDisposition.afterMainWindowConfirmation, /permanently preserved/u);
  assert.ok(
    contract.rejectionAndDisposition.stillNotAuthorized.includes(
      "delete or overwrite files or snapshots",
    ),
  );
});
