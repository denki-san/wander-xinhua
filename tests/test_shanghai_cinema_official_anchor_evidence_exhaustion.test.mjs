import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath =
  "docs/research/shanghai-cinema-official-anchor-evidence-exhaustion-2026-07-26.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256File(relativePath) {
  const source = await readFile(new URL(relativePath, root));
  return createHash("sha256").update(source).digest("hex");
}

test("上海影城官方限定检索保持精确地图门槛和阻塞状态", async () => {
  const record = await readJson(recordPath);
  for (const input of Object.values(record.verifiedInputs)) {
    assert.equal(await sha256File(input.path), input.sha256, input.path);
  }

  assert.equal(record.status, "blocked-official-search-exhausted-no-calibratable-site-plan");
  assert.deepEqual(record.calibrationRequirement, {
    northArrow: "required",
    scaleOrDimensions: "required",
    twoNonCoincidentSubjectControlPoints: "required",
    acceptableControls: [
      "main entrance center",
      "ribbon endpoint",
      "tower corner",
      "site-wall corner",
    ],
    addressOrCentroidAlone: "not-sufficient",
    perspectivePhotoAlone: "not-sufficient",
  });
  assert.equal(record.disposition.exactMapAnchor, "blocked");
  assert.equal(record.disposition.publicPlacementMutationAuthorized, false);
  assert.equal(record.disposition.runtimeRemovalAuthorizedNow, false);
});

test("官方资料只用于证实项目与道路广场关系，不能伪装成可配准总平", async () => {
  const record = await readJson(recordPath);
  assert.equal(record.reviewedSources.length, 3);
  assert.ok(record.reviewedSources.every((source) => source.notPresent.length > 0));
  assert.ok(record.reviewedSources.some((source) => source.url.includes("zwgk.shcn.gov.cn")));
  assert.ok(record.reviewedSources.some((source) => source.url.includes("cninfo.com.cn")));
  assert.ok(record.evidenceClassification.observed.some((entry) => entry.includes("没有检索到公开")));
  assert.match(record.disposition.claimBoundary, /不声称全球不存在/u);
});

test("用户睡眠期间不访问登录会话、不重跑合格阶段，也不动资产范围", async () => {
  const record = await readJson(recordPath);
  assert.equal(record.scope.userBrowserAccessed, false);
  assert.equal(record.scope.xiaohongshuAccessed, false);
  assert.equal(record.scope.blenderOrMcpRerun, false);
  assert.equal(record.scope.qualifiedStageRerun, false);
  assert.equal(record.scope.binaryRebuilt, false);
  assert.equal(record.scope.publicRegistryModified, false);
  assert.equal(record.scope.runtimeDisabled, false);
  assert.equal(record.disposition.currentAssets, "retain-unchanged");
  assert.equal(
    record.knowledgeWorkflow.externalIngestion,
    "raw-source-synced-index-pending",
  );
});
