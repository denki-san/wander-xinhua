import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath =
  "docs/research/shanghai-cinema-public-exact-anchor-rescue-2026-07-26.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256File(relativePath) {
  const source = await readFile(new URL(relativePath, root));
  return createHash("sha256").update(source).digest("hex");
}

test("上海影城公开补证保留精确源复现结论，但不越权解除地图门", async () => {
  const record = await readJson(recordPath);
  for (const source of Object.values(record.verifiedInputs)) {
    assert.equal(await sha256File(source.path), source.sha256, source.path);
  }

  const reproduction = await readJson(
    record.verifiedInputs.heroExactReproductionAudit.path,
  );
  assert.equal(
    reproduction.verdict.status,
    "pass-exact-source-reproduction",
  );
  assert.equal(record.disposition.heroExactSourceReproduction, "pass-retained-not-a-blocker");
  assert.equal(record.disposition.exactMapAnchor, "blocked");
  assert.equal(record.disposition.publicPlacementMutationAuthorized, false);
  assert.equal(record.disposition.runtimeRemovalAuthorizedNow, false);
});

test("公开来源确认广场与人行道关系，但没有降级双点配准门槛", async () => {
  const record = await readJson(recordPath);
  const officialPlazaSource = record.reviewedSources.find(
    ({ url }) => url.includes("whlyj.sh.gov.cn"),
  );
  assert.ok(officialPlazaSource);
  assert.ok(
    officialPlazaSource.observed.some((item) => item.includes("无缝衔接")),
  );

  assert.deepEqual(record.searchContract.qualityGate, {
    northArrow: "required",
    scaleOrDimensions: "required",
    twoNonCoincidentSubjectControlPoints: "required",
    perspectivePhotoAlone: "not-sufficient",
    addressOrCentroidAlone: "not-sufficient",
  });
  assert.ok(
    record.reviewedSources.every(
      ({ missingForExactAnchor }) => missingForExactAnchor.length > 0,
    ),
  );
});

test("用户睡眠期间不访问登录浏览器，也不删除或覆盖资产", async () => {
  const record = await readJson(recordPath);
  assert.equal(record.scope.userBrowserAccessed, false);
  assert.equal(record.scope.xiaohongshuAccessed, false);
  assert.equal(record.scope.binaryRebuilt, false);
  assert.equal(record.scope.publicRegistryModified, false);
  assert.equal(record.scope.runtimeDisabled, false);
  assert.equal(record.disposition.currentAssets, "retain-unchanged");
  assert.match(
    record.disposition.ifXiaohongshuStillInsufficient,
    /所有 GLB、Blend、生成器、证据、Recovery\/Hold 文件永久保留/,
  );
});
