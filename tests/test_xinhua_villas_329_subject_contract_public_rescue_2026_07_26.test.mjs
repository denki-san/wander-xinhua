import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath =
  "docs/research/xinhua-villas-329-subject-contract-public-rescue-2026-07-26.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256File(relativePath) {
  const content = await readFile(new URL(relativePath, root));
  return createHash("sha256").update(content).digest("hex");
}

test("329 subject rescue 锁定既有输入和已验收四成员 Massing", async () => {
  const record = await readJson(recordPath);
  for (const input of Object.values(record.verifiedInputs)) {
    assert.equal(await sha256File(input.path), input.sha256, input.path);
  }
  assert.equal(
    await sha256File(record.retainedQualifiedStage.path),
    record.retainedQualifiedStage.sha256,
  );
  assert.deepEqual(record.retainedQualifiedStage.boundMembers, [
    "15",
    "36",
    "40",
    "42",
  ]);
  assert.deepEqual(record.retainedQualifiedStage.accepted, {
    mcp1: "pass",
    map: "pass",
    runtime: "pass",
    collision: "pass",
  });
  assert.match(record.retainedQualifiedStage.action, /do not rerun or rebuild/u);
  assert.equal(record.scope.binaryModified, false);
  assert.equal(record.scope.acceptedMassingMapRuntimeRerun, false);
});

test("公开官方资料区分历史 compound 与整个329弄地址命名空间", async () => {
  const record = await readJson(recordPath);
  assert.equal(
    record.disposition.compoundVersusAddressNamespaceClarified,
    true,
  );
  assert.ok(
    record.evidenceClassification.observed.some((item) =>
      item.includes("43号学校、56号房屋和67号住宅组团"),
    ),
  );
  assert.equal(
    record.subjectContractAdjudication.currentStableId.recommendedSemanticBoundary,
    "historic-garden-residence-compound-subset-with-conservative-four-member-massing",
  );
  assert.equal(
    record.subjectContractAdjudication.currentStableId.status,
    "retain-no-runtime-mutation",
  );
});

test("67号正式总平不得冒充历史成员门牌到 OSM way 的绑定", async () => {
  const record = await readJson(recordPath);
  const source = record.reviewedOfficialSources.find(({ kind }) =>
    kind.includes("number-67-elevator-site-plan"),
  );
  assert.ok(source);
  assert.match(source.gateBoundary, /does not label heritage members/u);
  assert.match(source.gateBoundary, /must not be promoted/u);
  assert.equal(record.disposition.formalHistoricCompoundPlanFound, false);
  assert.equal(record.disposition.memberToAcceptedWayBindingImproved, false);
});

test("compound、代表成员和成员级 ID 三条策略都保持证据门阻断", async () => {
  const record = await readJson(recordPath);
  const contract = record.subjectContractAdjudication;
  assert.equal(contract.currentStableId.heroAuthorized, false);
  assert.equal(contract.representativeMember.authorized, false);
  assert.equal(contract.representativeMember.runtimeStableIdReuseAuthorized, false);
  assert.equal(contract.memberSpecificStableIds.authorized, false);
  assert.deepEqual(contract.memberSpecificStableIds.productionIdsCreated, []);
  assert.deepEqual(
    contract.memberSpecificStableIds.officiallyNamedCandidateNumbers,
    ["17", "36", "38", "40", "42"],
  );
  assert.equal(record.disposition.heroAuthorized, false);
  assert.equal(record.disposition.identityAuthorized, false);
  assert.equal(record.disposition.mcp2Authorized, false);
  assert.equal(record.disposition.mcp3Authorized, false);
});

test("旧 Hero 仅保留为跨资产 Hold，不允许回用或修改", async () => {
  const record = await readJson(recordPath);
  assert.equal(
    await sha256File(record.legacyHeroHold.path),
    record.legacyHeroHold.sha256,
  );
  assert.equal(
    record.legacyHeroHold.status,
    "retain-file-as-cross-asset-contaminated-hold",
  );
  assert.equal(record.legacyHeroHold.runtimeUseAuthorized, false);
  assert.equal(record.legacyHeroHold.modified, false);
});

test("知识源分层记录且仅拥有329本栋范围", async () => {
  const record = await readJson(recordPath);
  const source = await readFile(
    new URL(record.knowledgeSource.path, root),
    "utf8",
  );
  assert.match(source, /## Observed/u);
  assert.match(source, /## Inferred/u);
  assert.match(source, /## Unknown/u);
  assert.match(source, /## Disposition/u);
  assert.match(source, /applies only to `xinhua-villas-329`/u);
  assert.match(source, /does not authorize changes to\s+`xinhua-villas-211`/u);
  assert.equal(record.scope.newXiaohongshuAccessed, false);
  assert.equal(
    record.knowledgeSource.externalWikiArchive,
    "raw-source-synced-index-pending",
  );
});

test("公开来源都来自长宁政府官方域名", async () => {
  const record = await readJson(recordPath);
  assert.ok(record.reviewedOfficialSources.length >= 8);
  for (const source of record.reviewedOfficialSources) {
    const hostname = new URL(source.url).hostname;
    assert.ok(
      hostname === "www.shcn.gov.cn" || hostname === "zwgk.shcn.gov.cn",
      `${source.url} 不是允许的长宁政府官方域名`,
    );
  }
});
