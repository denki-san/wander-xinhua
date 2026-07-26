import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

for (const { assetId, recordPath } of [
  {
    assetId: "hudec-memorial",
    recordPath: "docs/research/hudec-memorial-three-tier-runtime-qa-v1.json",
  },
  {
    assetId: "xinhua-pocket-park",
    recordPath:
      "docs/research/xinhua-pocket-park-three-tier-runtime-qa-v1.json",
  },
]) {
  test(`${assetId} 三档与 fallback 真实单页记录闭合`, async () => {
    const record = await readJson(recordPath);
    assert.equal(record.assetId, assetId);
    assert.match(record.status, /^pass-/);
    assert.equal(record.build.mode, "vite-static-production-preview");
    assert.deepEqual(record.build.viewport, [1280, 720]);
    assert.equal(record.build.pageVisibility, "visible");
    for (const tier of ["hero", "identity", "massing"]) {
      const item = record.tiers[tier];
      assert.equal(item.requestedTier, tier);
      assert.equal(item.loadedTier, tier);
      assert.equal(item.status, "loaded");
      assert.equal(await sha256(item.path), item.sha256, item.path);
      assert.equal(item.performance.frames, 120);
      assert.ok(item.performance.fps >= 55, `${assetId}:${tier}`);
      assert.equal(
        await sha256(item.screenshot.path),
        item.screenshot.sha256,
        item.screenshot.path,
      );
    }
    assert.equal(record.fallbacks.heroToIdentity.requestedTier, "hero");
    assert.equal(record.fallbacks.heroToIdentity.loadedTier, "identity");
    assert.equal(record.fallbacks.identityToMassing.requestedTier, "identity");
    assert.equal(record.fallbacks.identityToMassing.loadedTier, "massing");
    assert.ok(record.fallbacks.heroToIdentity.fps >= 55);
    assert.ok(record.fallbacks.identityToMassing.fps >= 55);
    assert.equal(
      record.consoleAndProductionEntry.freshProductionEntryConsoleErrors,
      0,
    );
    assert.equal(
      record.consoleAndProductionEntry.finalCleanQaTabConsoleErrors,
      0,
    );
    assert.equal(record.decision.threeTierRuntime, "pass");
    assert.equal(record.decision.publicRuntime, "accepted");
    assert.equal(record.decision.overallBuilding, "complete");
  });
}

test("口袋公园三档包络一致且中心通路确定性碰撞通过", async () => {
  const record = await readJson(
    "docs/research/xinhua-pocket-park-three-tier-runtime-qa-v1.json",
  );
  assert.deepEqual(
    record.tiers.hero.worldBounds,
    record.tiers.identity.worldBounds,
  );
  assert.deepEqual(
    record.tiers.hero.worldBounds.min,
    record.tiers.massing.worldBounds.min,
  );
  assert.equal(record.collision.status, "pass");
  assert.ok(record.collision.finalError <= record.collision.threshold);
  assert.equal(record.collision.cameraModeAtEnd, "spring-narrow-space");
  assert.equal(
    await sha256(record.collision.screenshot.path),
    record.collision.screenshot.sha256,
  );
});

test("邬达克保留已合格 Massing 地图碰撞而不重跑", async () => {
  const record = await readJson(
    "docs/research/hudec-memorial-three-tier-runtime-qa-v1.json",
  );
  assert.equal(
    record.retainedQualifiedStages.massingMapAndCollision.status,
    "pass-retained-not-repeated",
  );
  assert.equal(
    record.retainedQualifiedStages.massingMapAndCollision.reasonNotRepeated,
    "fast-mode-recovery-qualified-stage-preservation",
  );
  assert.equal(record.tierContinuity.originYawScale, "pass-shared");
  assert.equal(record.decision.mapAndCollision, "pass-retained");
});
