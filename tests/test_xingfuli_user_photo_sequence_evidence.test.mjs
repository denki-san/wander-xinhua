import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath = "docs/research/xingfuli-user-photo-sequence-2026-07-26.json";
const knowledgePath = "docs/knowledge-sources/xingfuli-user-photo-route-2026-07-26.md";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

test("幸福里个人实拍九图保持有序路线且不与公开网页九图混写", async () => {
  const record = await readJson(recordPath);
  const publicManifest = await readJson("docs/research/xingfuli-reference-manifest.json");

  assert.equal(record.sourceType, "user-captured-photo-sequence");
  assert.equal(record.sourceAuthority, "photographer-first-party-statement");
  assert.equal(record.userStatement.photoCount, 9);
  assert.equal(record.userStatement.orderedSequence, true);
  assert.equal(record.userStatement.routeStart, "xingfu-road-entrance");
  assert.equal(
    record.userStatement.routeEndRoadStatus,
    "user-unsure-requires-map-and-photo-verification",
  );
  assert.deepEqual(
    record.orderedSlots.map(({ sequence }) => sequence),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  assert.equal(
    record.orderedSlots.every(({ assetState }) => assetState === "pending-original-file"),
    true,
  );
  assert.equal(record.assistantObserved.personalPhotoFilesMaterializedInWorktree, false);
  assert.equal(record.assistantObserved.existingPublicReferencesAreSameAsUserSequence, false);
  assert.equal(publicManifest.references.length, 9);
});

test("个人实拍链只约束幸福里三栋并保留原图只读和未知边界", async () => {
  const record = await readJson(recordPath);
  assert.deepEqual(record.scope.includedBuildings, [
    "xingfuli-west",
    "xingfuli-center",
    "xingfuli-east",
  ]);
  assert.equal(record.acceptancePolicy.rawImagesReadOnlyWhenAvailable, true);
  assert.equal(record.acceptancePolicy.doNotOverwriteExistingPublicReferences, true);
  assert.equal(record.acceptancePolicy.doNotEmbedInGlbOrRuntime, true);
  assert.equal(record.acceptancePolicy.sequenceAloneMayNotPromoteMapOrLineageGate, true);
  assert.equal(
    record.unknown.some((item) => item.includes("番禺路")),
    true,
  );
});

test("个人实拍链已形成可同步到 Threejs-3d-research 的知识源", async () => {
  const record = await readJson(recordPath);
  await access(new URL(knowledgePath, root));
  const source = await readFile(new URL(knowledgePath, root), "utf8");
  assert.match(source, /Xingfu Road entrance/);
  assert.match(source, /may be Panyu Road/);
  assert.match(source, /has not yet been inspected/);
  assert.equal(record.externalArchive.knowledgeBase, "Threejs-3d-research");
  assert.match(record.externalArchive.sourcePath, /xingfuli-user-photo-route-2026-07-26\.md$/);
  assert.match(record.externalArchive.sourceSha256, /^[a-f0-9]{64}$/);
  assert.equal(record.externalArchive.sourceArchiveStatus, "pass-byte-identical");
  assert.equal(record.externalArchive.sourceIndexStatus, "pass-search-read-and-graph-node");
  assert.match(record.externalArchive.sourceWikiPath, /^wiki\/sources\/.+\.md$/);
  assert.equal(record.externalArchive.rawImageArchiveStatus, "pending-original-files");
});

test("统一18栋状态矩阵为幸福里西中东引用同一实拍链记录", async () => {
  const status = await readJson("docs/research/exact-18-building-status.json");
  for (const id of ["xingfuli-west", "xingfuli-center", "xingfuli-east"]) {
    const building = status.buildings.find((entry) => entry.id === id);
    assert.ok(building);
    assert.equal(building.records.includes(recordPath), true);
  }
});
