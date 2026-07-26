import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const blockerPath = "docs/research/xinhua-villas-211-gap-medium-blocker-2026-07-26.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256File(relativePath) {
  const source = await readFile(new URL(relativePath, root));
  return createHash("sha256").update(source).digest("hex");
}

test("211 快速模式 blocker 保留已通过 Massing，且不越权启动 Hero 或 Identity", async () => {
  const blocker = await readJson(blockerPath);
  for (const source of Object.values(blocker.verifiedInputs)) {
    assert.equal(await sha256File(source.path), source.sha256, source.path);
  }
  assert.equal(
    await sha256File(blocker.retainedAcceptedStage.glb.path),
    blocker.retainedAcceptedStage.glb.sha256,
  );
  assert.deepEqual(blocker.retainedAcceptedStage.placement, {
    position: [38.32, 110.67],
    yaw: -0.38,
    scale: 0.62,
    movementAuthorized: false,
  });
  assert.equal(blocker.blockingFacts.acceptedMassingWays, 9);
  assert.equal(blocker.blockingFacts.acceptedWaysWithHouseNumber, 0);
  assert.equal(blocker.blockingFacts.photosBoundToSpecificAcceptedWay, 0);
  assert.equal(blocker.blockingFacts.sameMemberCompleteDepthSets, 0);
  assert.equal(blocker.blockingFacts.legacyHeroAuthoredMembers, 4);
  assert.equal(blocker.verdict.heroAuthorized, false);
  assert.equal(blocker.verdict.identityAuthorized, false);
  assert.equal(blocker.verdict.mcp2Authorized, false);
  assert.equal(blocker.verdict.mcp3Authorized, false);
  assert.equal(blocker.verdict.runtimeOrRegistryMutationAuthorized, false);
});
