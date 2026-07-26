import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const blockerPath = "docs/research/xingfuli-west-east-map-photo-blocker-2026-07-26.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256File(relativePath) {
  const source = await readFile(new URL(relativePath, root));
  return createHash("sha256").update(source).digest("hex");
}

test("幸福里西东地图 blocker 保留三档，且严禁把公网九图冒充用户原图", async () => {
  const blocker = await readJson(blockerPath);
  for (const source of Object.values(blocker.verifiedInputs)) {
    assert.equal(await sha256File(source.path), source.sha256, source.path);
  }
  const sequence = await readJson(
    blocker.verifiedInputs.userSequenceRecord.path,
  );
  assert.equal(sequence.assistantObserved.personalPhotoFilesMaterializedInWorktree, false);
  assert.equal(sequence.assistantObserved.personalPhotoHashesAvailable, false);
  assert.equal(sequence.orderedSlots.length, 9);
  assert.ok(sequence.orderedSlots.every(
    ({ assetState }) => assetState === "pending-original-file",
  ));
  assert.equal(blocker.userPhotoMaterialization.originalFilesMaterialized, false);
  assert.equal(blocker.userPhotoMaterialization.sha256Available, false);
  assert.equal(blocker.userPhotoMaterialization.exifAvailable, false);
  assert.equal(blocker.threejsResearchReadOnlyVerification.rawSource.result,
    "pass-byte-identical-to-repository-knowledge-source");
  assert.equal(blocker.mapBlockers.west.status,
    "blocked-pedestrian-way-400066625-ground-level-passage-unknown");
  assert.equal(blocker.mapBlockers.east.status,
    "blocked-panyu-road-overlap-and-photo9-road-unknown");
  assert.equal(blocker.verdict.westMapClosed, false);
  assert.equal(blocker.verdict.eastMapClosed, false);
  assert.equal(blocker.verdict.userPhotoEvidenceReady, false);
  assert.equal(blocker.verdict.publicMapMutationAuthorized, false);
});
