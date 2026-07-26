import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath = "docs/research/villa-le-bec-three-tier-runtime-qa-v3.json";
const json = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const sha = async (path) => createHash("sha256")
  .update(await readFile(new URL(path, root)))
  .digest("hex");

test("Villa Le Bec 真实 Three.js 三档、性能和两级 fallback 通过", async () => {
  const record = await json(recordPath);
  assert.equal(record.status, "pass-three-tier-fallback-performance-collision-and-production");
  assert.deepEqual(record.build.viewport, [1280, 720]);
  assert.equal(record.build.pageVisibility, "visible");
  assert.equal(record.build.canvasCount, 1);
  for (const [tierName, tier] of Object.entries(record.tierRuns)) {
    assert.equal(tier.requestedTier, tierName);
    assert.equal(tier.loadedTier, tierName);
    assert.equal(tier.status, "loaded");
    assert.equal(tier.performance.frames, 120);
    assert.ok(tier.performance.fps >= 50, `${tierName} fps`);
    assert.equal(tier.performance.buildMode, "browser-runtime");
    assert.equal(tier.camera.mode, "spring-clear");
    assert.equal(tier.camera.desiredArm, tier.camera.resolvedArm);
  }
  assert.deepEqual(
    [record.fallbackRuns.heroToIdentity.requestedTier, record.fallbackRuns.heroToIdentity.loadedTier],
    ["hero", "identity"],
  );
  assert.deepEqual(
    [record.fallbackRuns.identityToMassing.requestedTier, record.fallbackRuns.identityToMassing.loadedTier],
    ["identity", "massing"],
  );
});

test("Villa Le Bec 开放庭院可达而两栋实体外墙阻挡穿透", async () => {
  const record = await json(recordPath);
  assert.equal(record.collision.sharedContract.localObstacleCount, 12);
  assert.equal(record.collision.sharedContract.sameForAllTiers, true);
  assert.ok(record.collision.openCourtyardReplay.distanceToTarget < 0.05);
  assert.equal(record.collision.openCourtyardReplay.result, "pass-open-courtyard-reachable");
  assert.equal(record.collision.solidWallReplay.targetInsideFirstSolid, true);
  assert.equal(record.collision.solidWallReplay.penetrationObserved, false);
  assert.ok(record.collision.solidWallReplay.distanceToTarget > 3.7);
  assert.ok(record.collision.solidWallReplay.worldClearanceToFirstSolidMinX > 0.8);
  assert.equal(
    record.collision.productionSolidWallReplay.result,
    "pass-production-collision-matches-explicit-qa",
  );
});

test("Villa Le Bec 生产接线、首屏异常与运行时截图均可追溯", async () => {
  const record = await json(recordPath);
  assert.deepEqual(record.consoleAndErrors.consoleErrors, []);
  assert.deepEqual(record.consoleAndErrors.windowErrors, []);
  assert.deepEqual(record.consoleAndErrors.unhandledRejections, []);
  assert.equal(record.consoleAndErrors.fatalOverlay, false);
  assert.deepEqual(record.consoleAndErrors.alerts, []);
  assert.deepEqual(record.consoleAndErrors.consoleWarnings, [
    "THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.",
  ]);
  assert.equal(record.productionIntegration.defaultEntryRequiresQaTierOverride, false);
  assert.match(record.productionIntegration.legacyHeroV1, /^hold-/);
  assert.match(record.productionIntegration.legacyIdentityV1, /^hold-/);
  for (const screenshot of record.screenshots) {
    assert.equal(await sha(screenshot.path), screenshot.sha256, screenshot.path);
    assert.equal(
      (await readFile(new URL(screenshot.path, root))).byteLength,
      screenshot.bytes,
    );
  }
  assert.equal(record.verdict.threeJs, "pass");
  assert.equal(record.verdict.productionPromotion, "pass");
  assert.equal(record.verdict.overallBuilding, "complete");
});
