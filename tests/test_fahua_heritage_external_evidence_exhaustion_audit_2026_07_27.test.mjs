import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath =
  "docs/research/fahua-heritage-external-evidence-exhaustion-audit-2026-07-27.json";
const externalRoot = "/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence";

async function bytes(relativePath) {
  return readFile(new URL(relativePath, root));
}

async function json(relativePath) {
  return JSON.parse((await bytes(relativePath)).toString("utf8"));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

test("外置证据穷尽审计锁定本栋输入且未授权任何资产或公共改动", async () => {
  const audit = await json(auditPath);
  for (const input of Object.values(audit.repositoryInputs)) {
    assert.equal(sha256(await bytes(input.path)), input.sha256, input.path);
  }
  assert.equal(audit.scope.externalRootsModified, false);
  assert.equal(audit.scope.binaryModified, false);
  assert.equal(audit.scope.sharedFilesModified, false);
  assert.equal(audit.scope.recoveryHoldModified, false);
  assert.equal(audit.status, "exhausted-no-new-qualifying-media-map-rear-scale-remain-blocked");
});

test("18 个目标图像路径只折叠为四个已知哈希，没有第五份真实媒体", async () => {
  const audit = await json(auditPath);
  const unique = audit.targetVisualDeduplication.uniqueContent;
  assert.equal(audit.targetVisualDeduplication.pathsAudited, 18);
  assert.equal(unique.length, 4);
  assert.equal(
    unique.reduce((sum, item) => sum + item.pathOccurrences, 0),
    18,
  );
  assert.deepEqual(
    unique.map(({ sha256: digest }) => digest).sort(),
    [
      "bce705550e57ee299c9160ca04a19c5157b50d8f70873c988d4ef46ca49a662e",
      "ad69d9e052daa46e79f6f11bdcde1b328cd5611c5fc211d16b171ca6aaf2cf40",
      "76eeb64bf9aac3781f17aeaedc6aec3f7c4c273ba4e36185224a7da1e4937980",
      "987b704d324e445f8ee6bda1e2999ba0bbbab4c7af4597371d5ec07e9b3923ab",
    ].sort(),
  );
  assert.equal(audit.targetVisualDeduplication.newUniqueRealMediaAfter195And197, 0);
});

test("原视频记录和全部视频候选均不能提供法华遗韵新增证据", async () => {
  const audit = await json(auditPath);
  assert.equal(
    audit.rawVideoExhaustion.directManifestStatus,
    "not-downloaded-cdn-page-fetch-failed",
  );
  assert.equal(audit.rawVideoExhaustion.sourceNoteStatus, "original-video-not-saved");
  assert.equal(audit.rawVideoExhaustion.dynamicEvidenceVideoCandidates.count, 7);
  assert.equal(audit.rawVideoExhaustion.oldKnowledgeBaseVideoCandidates.count, 7);
  assert.equal(
    audit.rawVideoExhaustion.matchingNoteIdAuthorAssetOrFrameTimestamp,
    0,
  );
  assert.equal(audit.rawVideoExhaustion.qualifiedOriginalVideoFound, false);
});

test("若外置盘挂载，快照与 legacy manifest 必须精确指向同两帧", {
  skip: !existsSync(externalRoot),
}, async () => {
  const audit = await json(auditPath);
  const legacyRoot = audit.immutableArchiveControls.legacyArchive.root;
  const snapshotRoot = audit.immutableArchiveControls.currentSnapshot.root;
  const legacyManifest = await readFile(
    `${legacyRoot}/external-existing-manifest.tsv`,
    "utf8",
  );
  const checksums = await readFile(`${snapshotRoot}/SHA256SUMS`, "utf8");
  const frame195 = await readFile(
    `${snapshotRoot}/repository/docs/research/assets/xiaohongshu/fahua-heritage/original/test_fahua-heritage-xhs-195s.png`,
  );
  const frame197 = await readFile(
    `${snapshotRoot}/repository/docs/research/assets/xiaohongshu/fahua-heritage/original/test_fahua-heritage-xhs-197s.png`,
  );

  assert.equal(
    sha256(frame195),
    audit.immutableArchiveControls.currentSnapshot.frame195Sha256,
  );
  assert.equal(
    sha256(frame197),
    audit.immutableArchiveControls.currentSnapshot.frame197Sha256,
  );
  assert.match(legacyManifest, /ad69d9e052daa46e79f6f11bdcde1b328cd5611c5fc211d16b171ca6aaf2cf40/u);
  assert.match(legacyManifest, /76eeb64bf9aac3781f17aeaedc6aec3f7c4c273ba4e36185224a7da1e4937980/u);
  assert.match(checksums, /test_fahua-heritage-xhs-195s\.png/u);
  assert.match(checksums, /test_fahua-heritage-xhs-197s\.png/u);
  assert.match(checksums, /fahua-heritage-xhs-map-calibratability-audit-2026-07-26\.json/u);
});

test("穷尽结果不改变 map、rear、scale 或完整绕行门", async () => {
  const audit = await json(auditPath);
  assert.equal(audit.gateDecision.sideOrDepth, "pass-retained-from-195s-197s-no-rerun");
  assert.equal(audit.gateDecision.streetContext, "pass-retained-from-195s-197s-no-rerun");
  assert.match(audit.gateDecision.map, /^blocked-/u);
  assert.match(audit.gateDecision.rear, /^blocked-/u);
  assert.match(audit.gateDecision.scale, /^blocked-/u);
  assert.match(audit.gateDecision.completeWalkaround, /^blocked-/u);
  assert.equal(audit.gateDecision.placementMutationAuthorized, false);
  assert.equal(audit.gateDecision.modelOrMcpRerunAuthorized, false);
  assert.equal(audit.gateDecision.runtimeOrRegistryMutationAuthorized, false);
});
