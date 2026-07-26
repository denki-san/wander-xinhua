import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath =
  "docs/research/xinhua-community-center-official-service-road-evidence-exhaustion-2026-07-26.json";

async function json(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(new URL(relativePath, root)))
    .digest("hex");
}

test("社区中心官方限定检索保持服务道路正式地图阻塞", async () => {
  const record = await json(recordPath);
  for (const input of Object.values(record.verifiedInputs)) {
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  assert.equal(
    record.status,
    "blocked-official-public-search-exhausted-no-measured-service-road-contract",
  );
  assert.equal(record.frozenGeometry.roadWayId, 577252269);
  assert.equal(record.frozenGeometry.asphaltOverlapSceneUnits, 0.4026350726882021);
  assert.equal(record.disposition.serviceRoadMapGate, "blocked");
  assert.equal(record.disposition.roadContractChangeAuthorized, false);
  assert.equal(record.disposition.buildingMovementAuthorized, false);
  assert.equal(record.disposition.buildingScaleChangeAuthorized, false);
});

test("官方项目叙述不能降级双路缘与测绘不确定度门槛", async () => {
  const record = await json(recordPath);
  assert.deepEqual(record.unlockRequirement, {
    roadEdges: "both required",
    centerlineOrOffsetDimensionChain: "required",
    scale: "required",
    date: "required",
    provenance: "required",
    measurementUncertainty: "required",
    acceptableSource: "surveyed, cadastral, owner, architect, or formally geolocatable orthophoto/field measurement",
    addressOrProjectNarrative: "not-sufficient",
    singlePerspectivePhoto: "not-sufficient",
  });
  assert.equal(record.reviewedSources.length, 3);
  assert.ok(record.reviewedSources.every((source) => source.notPresent.length > 0));
  assert.ok(record.reviewedSources.some((source) => source.url.includes("shcn.gov.cn")));
  assert.match(record.disposition.claimBoundary, /不声称全球不存在/u);
});

test("本栋证据包不重跑合格阶段，也不动模型、道路或外部知识库", async () => {
  const record = await json(recordPath);
  assert.equal(record.scope.userBrowserAccessed, false);
  assert.equal(record.scope.xiaohongshuAccessed, false);
  assert.equal(record.scope.blenderOrMcpRerun, false);
  assert.equal(record.scope.qualifiedStageRerun, false);
  assert.equal(record.scope.modelBinaryModified, false);
  assert.equal(record.scope.buildingTransformModified, false);
  assert.equal(record.scope.sharedRoadModified, false);
  assert.equal(record.scope.publicRegistryModified, false);
  assert.equal(record.knowledgeWorkflow.externalIngestion, "not-run");
  assert.equal(record.disposition.massingRebuildAuthorized, false);
});
