import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath =
  "docs/research/xinhua-villas-211-public-primary-source-rescue-2026-07-26.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256File(relativePath) {
  const content = await readFile(new URL(relativePath, root));
  return createHash("sha256").update(content).digest("hex");
}

test("211弄公开补证锁定既有输入与合格 Massing，不重跑已通过阶段", async () => {
  const record = await readJson(recordPath);
  for (const input of Object.values(record.verifiedInputs)) {
    assert.equal(await sha256File(input.path), input.sha256, input.path);
  }
  assert.equal(
    await sha256File(record.retainedStage.path),
    record.retainedStage.sha256,
  );
  assert.equal(record.retainedStage.acceptedWayCount, 9);
  assert.match(record.retainedStage.action, /do not rerun/u);
  assert.equal(record.scope.binaryModified, false);
  assert.equal(record.scope.blenderOrMcpRerun, false);
});

test("官方资料改善211弄成员语义，但29幢只属于两弄合计", async () => {
  const record = await readJson(recordPath);
  assert.equal(record.disposition.officialMemberIdentityImproved, true);
  assert.ok(
    record.evidenceClassification.observed.some((item) =>
      item.includes("U形或马蹄形compound"),
    ),
  );
  assert.ok(
    record.evidenceClassification.inferred.some((item) =>
      item.includes("211弄与329弄合计口径"),
    ),
  );
  assert.ok(
    record.reviewedSources.some(({ observed }) =>
      observed.some((item) => item.includes("用地约1240平方米")),
    ),
  );
});

test("面积和停车语义不得冒充门牌到 OSM way 的正式映射", async () => {
  const record = await readJson(recordPath);
  assert.equal(
    record.disposition.memberToAcceptedWayAssignment,
    "blocked-zero-of-nine",
  );
  assert.equal(record.disposition.sameMemberDepthCoverage, "blocked");
  assert.equal(record.disposition.heroAuthorized, false);
  assert.equal(record.disposition.identityAuthorized, false);
  assert.equal(record.disposition.runtimeOrRegistryMutationAuthorized, false);
  assert.ok(
    record.evidenceClassification.inferred.some((item) =>
      item.includes("不能用面积近似猜测具体OSM way"),
    ),
  );
});

test("知识源区分 observed inferred unknown，并保持 exact-18 范围", async () => {
  const record = await readJson(recordPath);
  const source = await readFile(
    new URL(
      "docs/knowledge-sources/xinhua-villas-211-public-primary-source-rescue-2026-07-26.md",
      root,
    ),
    "utf8",
  );
  assert.match(source, /## Observed/u);
  assert.match(source, /## Inferred/u);
  assert.match(source, /## Unknown/u);
  assert.match(source, /xinhua-villas-211/u);
  assert.match(source, /does not authorize work on\s+`xinhua-villas-329`/u);
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    record.externalArchive.sourceSha256,
  );
  assert.equal(
    record.externalArchive.archiveStatus,
    "pass-byte-identical-hardlink",
  );
  assert.equal(
    record.externalArchive.wikiIndexStatus,
    "pending-no-search-hit",
  );
});
