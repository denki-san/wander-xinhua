import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const blockerPath = "docs/research/shanghai-orchestra-gap-medium-blocker-2026-07-26.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256File(relativePath) {
  const source = await readFile(new URL(relativePath, root));
  return createHash("sha256").update(source).digest("hex");
}

test("民族乐团快速模式 blocker 保留诊断 Massing 并禁止无归属升级", async () => {
  const blocker = await readJson(blockerPath);
  for (const source of Object.values(blocker.verifiedInputs)) {
    assert.equal(await sha256File(source.path), source.sha256, source.path);
  }
  assert.equal(
    await sha256File(blocker.retainedAcceptedStage.glb.path),
    blocker.retainedAcceptedStage.glb.sha256,
  );
  assert.deepEqual(blocker.retainedAcceptedStage.candidateWayIds, [
    864505166, 864505168, 864505165, 864505169, 864505163,
  ]);
  assert.equal(blocker.geometryObserved.asphaltOverlap, false);
  assert.equal(blocker.geometryObserved.candidatePairIntersectionCount, 0);
  assert.equal(blocker.geometryObserved.adjacentUnknownIntersectionCount, 0);
  assert.equal(blocker.geometryObserved.startCollisionFree, true);
  assert.equal(blocker.verdict.formalMapAcceptanceAuthorized, false);
  assert.equal(blocker.verdict.heroAuthorized, false);
  assert.equal(blocker.verdict.identityAuthorized, false);
  assert.equal(blocker.verdict.mcp2Authorized, false);
  assert.equal(blocker.verdict.mcp3Authorized, false);
});
