import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const contractPath =
  "docs/research/xingfuli-east-xhs-evidence-query-contract-2026-07-26.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256File(relativePath) {
  const source = await readFile(new URL(relativePath, root));
  return createHash("sha256").update(source).digest("hex");
}

test("East 查询合同锁定合格三档、MCP和Three.js阶段且不重跑", async () => {
  const contract = await readJson(contractPath);
  for (const input of Object.values(contract.verifiedInputs)) {
    assert.equal(await sha256File(input.path), input.sha256, input.path);
  }
  for (const tier of ["hero", "identityV2", "massingV2"]) {
    const asset = contract.retainedAcceptedStages[tier];
    assert.equal(await sha256File(asset.path), asset.sha256, asset.path);
  }
  assert.equal(contract.retainedAcceptedStages.strictTierLineage, "pass");
  assert.deepEqual(contract.retainedAcceptedStages.blenderMcp, {
    mcp1: "pass",
    mcp2: "pass",
    mcp3: "pass",
  });
  assert.equal(contract.retainedAcceptedStages.threeJs.collision,
    "pass-target-reached-no-penetration");
  assert.match(contract.retainedAcceptedStages.action, /do not rerun/u);
});

test("合同保留番禺路三处 surface 交叉和北侧正净距控制项", async () => {
  const contract = await readJson(contractPath);
  assert.equal(contract.currentMapBlocker.status,
    "blocked-panyu-road-overlap-and-photo-9-road-unknown");
  assert.deepEqual(
    contract.currentMapBlocker.intersectionAudit.map(
      ({ component, status }) => [component, status],
    ),
    [
      ["south-east-entry-building", "intersects"],
      ["entry-matrix-wall", "intersects"],
      ["east-lane-base", "intersects"],
    ],
  );
  assert.ok(contract.currentMapBlocker.intersectionAudit.every(
    ({ asphaltClearanceScene }) => asphaltClearanceScene < 0,
  ));
  assert.ok(
    contract.currentMapBlocker.nonBlockerControl.asphaltClearanceScene > 0,
  );
  assert.equal(contract.currentMapBlocker.mutationAuthorized, false);
});

test("用户第9张保持0原件和可能番禺路，不得被公网图冒充", async () => {
  const contract = await readJson(contractPath);
  const boundary = contract.userPhotoNineBoundary;
  assert.equal(boundary.roadIdentityStatus, "user-unsure-not-confirmed");
  assert.equal(boundary.originalFileCount, 0);
  assert.equal(boundary.allNineSlots, "pending-original-file");
  assert.equal(boundary.photoNineVisualContentReviewed, false);
  assert.equal(boundary.photoNineSha256Available, false);
  assert.equal(boundary.photoNineExifAvailable, false);
  assert.equal(boundary.publicEvidenceMayReplacePhotoNine, false);
  assert.match(boundary.policy, /must never be renamed, archived, cited or counted/u);
});

test("查询词覆盖道路身份、东端构件和幸福路到番禺路连续路线", async () => {
  const contract = await readJson(contractPath);
  const groups = contract.queryContract.searchGroups;
  assert.deepEqual(groups.map(({ priority }) => priority), [1, 2, 3]);
  const queries = groups.flatMap(({ queries: items }) => items);
  for (const token of [
    "幸福里 番禺路 入口",
    "幸福里 东侧入口",
    "幸福里 南入口 白色玻璃转角",
    "幸福里 从幸福路走到番禺路",
  ]) {
    assert.ok(queries.includes(token), token);
  }
  assert.equal(contract.queryContract.executionOwner, "main-window-xhigh");
  assert.equal(contract.queryContract.executionStatus, "not-run");
});

test("慢速查看预算有限额、最小间隔和平台挑战停止线", async () => {
  const contract = await readJson(contractPath);
  const budget = contract.queryContract.slowReviewBudgetRecommendation;
  assert.ok(budget.maxSearchQueriesPerSession <= 4);
  assert.ok(budget.maxPostsOpenedPerSession <= 6);
  assert.ok(budget.maxMediaItemsInspectedPerSession <= 24);
  assert.ok(budget.minimumSecondsBetweenPostOpens >= 15);
  assert.ok(budget.minimumSecondsBetweenSearchSubmissions >= 30);
  assert.ok(budget.maximumSessionMinutes <= 15);
  assert.equal(budget.stopAfterFirstQualifiedEvidenceChain, true);
  assert.match(budget.note, /not timing randomization or anti-detection/u);
  assert.equal(
    contract.queryContract.accessBoundary.stopOnChallengeLoginRefreshOrPlatformWarning,
    true,
  );
  assert.equal(
    contract.queryContract.accessBoundary.doNotAttemptToImitateOrEvadePlatformDetection,
    true,
  );
});

test("东端验收矩阵要求连续出口、道路、路缘、墙体、入口和lane base全部通过", async () => {
  const contract = await readJson(contractPath);
  const required = contract.qualificationRule.requiredMatrixIds;
  assert.deepEqual(required, [
    "same-east-exit-continuity",
    "road-identity",
    "curb-and-surface-edge",
    "south-entry-building",
    "entry-matrix-wall",
    "east-lane-base",
    "same-subject-identity",
    "currentness-and-alteration",
  ]);
  const rows = new Map(contract.acceptanceMatrix.map((row) => [row.id, row]));
  for (const id of required) {
    assert.equal(rows.get(id)?.required, true, id);
    assert.ok(rows.get(id)?.pass.length > 20, id);
    assert.ok(rows.get(id)?.reject.length > 20, id);
  }
  assert.equal(contract.qualificationRule.allRequiredMustPass, true);
  assert.equal(contract.qualificationRule.independentMapComparisonRequired, true);
  assert.equal(contract.qualificationRule.singlePublicImageCanQualify, false);
  assert.equal(
    contract.qualificationRule.evidenceCanDirectlyAuthorizePlacementOrCollisionMutation,
    false,
  );
});

test("原媒体只读进3D知识库，Wiki只硬链接Markdown", async () => {
  const contract = await readJson(contractPath);
  const archive = contract.readOnlyArchiveContract;
  assert.equal(archive.writesPerformedNow, false);
  assert.match(
    archive.userOriginalRawRootWhenAvailable,
    /^\/Volumes\/plugin\/3D_Modeling_ThreeJS_Knowledge_Base\/wander-xinhua\//u,
  );
  assert.match(
    archive.publicXhsRawRootAfterQualifiedAuthorizedCapture,
    /^\/Volumes\/plugin\/3D_Modeling_ThreeJS_Knowledge_Base\/wander-xinhua\//u,
  );
  assert.equal(archive.wikiProject, "Threejs-3d-research");
  assert.match(
    archive.wikiRawMarkdownPath,
    /^\/Volumes\/plugin\/Threejs-3d-research\/raw\/sources\//u,
  );
  assert.match(archive.rawMediaPolicy, /Preserve original bytes/u);
  assert.match(archive.wikiPolicy, /Hard-link only the Markdown/u);
});

test("只有主窗口合理检索无合格证据后才可提出可逆runtime disable候选", async () => {
  const contract = await readJson(contractPath);
  const candidate = contract.runtimeDisableCandidate;
  assert.equal(candidate.currentEligibility, false);
  assert.equal(candidate.currentActionAuthorized, false);
  assert.equal(candidate.automaticDisableForbidden, true);
  assert.ok(candidate.candidateOnlyAfter.includes(
    "main window executes this reasonable slow Xiaohongshu query contract",
  ));
  assert.ok(candidate.candidateOnlyAfter.includes(
    "no candidate passes every required acceptance-matrix row",
  ));
  assert.match(candidate.candidateMeaning, /runtime entry only/u);
  assert.ok(candidate.preservationRequirements.every(
    (item) => !/delete|overwrite/iu.test(item)
      || /do not delete, overwrite/iu.test(item),
  ));
  assert.equal(contract.verdict.runtimeDisableCandidateEligible, false);
  assert.equal(contract.verdict.placementOrCollisionMutationAuthorized, false);
});

test("准备分支没有访问浏览器、下载媒体或改公共文件", async () => {
  const contract = await readJson(contractPath);
  for (const item of [
    "browser or Xiaohongshu access",
    "media download",
    "placement, collision, road or runtime mutation",
    "public registry, roster, status or fast-mode mutation",
    "external USB or Wiki write",
  ]) {
    assert.ok(contract.scope.notPerformed.includes(item), item);
  }
  assert.equal(contract.scope.binaryModified, false);
  assert.equal(contract.scope.sharedFilesModified, false);
  assert.equal(contract.scope.recoveryHoldModified, false);
  assert.equal(contract.verdict.queryReady, true);
  assert.equal(contract.verdict.queryExecuted, false);
  assert.equal(contract.verdict.mapBlockerReleased, false);
});
