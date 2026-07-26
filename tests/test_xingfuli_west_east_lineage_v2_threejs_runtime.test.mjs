import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { XINGFULI_TIERS } from "../app/scene/xingfuli-tier-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const record = JSON.parse(fs.readFileSync(
  path.join(
    ROOT,
    "docs/research/xingfuli-west-east-lineage-v2-threejs-runtime-qa.json",
  ),
  "utf8",
));
const sha256 = (relativePath) => crypto
  .createHash("sha256")
  .update(fs.readFileSync(path.join(ROOT, relativePath)))
  .digest("hex");

test("West/East 单一浏览器批次严格限制两栋且产品默认 Hero 不变", () => {
  assert.equal(
    record.status,
    "pass-single-browser-session-three-tier-fallback-performance-collision",
  );
  assert.deepEqual(
    record.scope.exactBuildingIds,
    ["xingfuli-west", "xingfuli-east"],
  );
  assert.equal(record.scope.productionDefaultChanged, false);
  assert.equal(record.scope.treesDecorationFullMap, "excluded");
  assert.equal(record.productionDefault.qaAssetMarker, null);
  assert.equal(record.productionDefault.qaRequestedTierMarker, null);
  assert.equal(record.productionDefault.playable, true);
  assert.equal(record.productionDefault.camera, "spring-clear");
  assert.equal(record.productionDefault.errors, 0);
});

for (const building of record.buildings) {
  test(`${building.assetId} 三档 source、SHA 与 120 帧性能样本闭合`, () => {
    const contract = XINGFULI_TIERS[building.assetId];
    for (const tierName of ["hero", "identity", "massing"]) {
      const tier = building.tiers[tierName];
      assert.equal(tier.status, "loaded");
      assert.equal(tier.source, contract[tierName].url);
      assert.equal(tier.sha256, contract[tierName].sha256);
      assert.equal(tier.bytes, contract[tierName].bytes);
      assert.equal(tier.performance.frames, 120);
      assert.ok(tier.performance.fps > 50);
      assert.ok(tier.performance.drawCalls > 0);
      assert.ok(tier.performance.triangles > 0);
      assert.equal(tier.errors, 0);
    }
  });

  test(`${building.assetId} 两级 fallback、移动和相机样本通过但不越过地图门`, () => {
    assert.equal(
      building.fallbacks.heroToIdentity.status,
      "pass-forced-deterministic-fallback",
    );
    assert.equal(
      building.fallbacks.identityToMassing.status,
      "pass-forced-deterministic-fallback",
    );
    assert.equal(building.fallbacks.heroToIdentity.errors, 0);
    assert.equal(building.fallbacks.identityToMassing.errors, 0);
    assert.equal(building.collision.movementStatus, "complete");
    assert.ok(building.collision.minimumTargetErrorSceneUnits < 0.05);
    assert.ok(building.collision.postWarmupTargetErrorSceneUnits < 0.1);
    assert.match(building.collision.cameraFinal, /^spring-/);
    assert.match(building.mapStatus, /^blocked-/);
  });
}

test("十三张主证据与四张支持截图按 SHA 与 bytes 可复核", () => {
  assert.equal(record.screenshots.length, 13);
  assert.equal(record.supportingScreenshots.length, 4);
  for (const screenshot of [
    ...record.screenshots,
    ...record.supportingScreenshots,
  ]) {
    assert.equal(
      fs.statSync(path.join(ROOT, screenshot.path)).size,
      screenshot.bytes,
    );
    assert.equal(sha256(screenshot.path), screenshot.sha256);
  }
});

test("West 三张被覆盖的首轮截图被诚实记录并以当前页面重采", () => {
  const correction = record.visualEvidenceCorrection;
  assert.equal(
    correction.status,
    "pass-three-west-tier-screenshots-recaptured-primary-telemetry-retained",
  );
  assert.equal(correction.originalPrecommitFingerprintsUnavailableOnDisk.length, 3);
  assert.deepEqual(correction.recapture.viewport, [1280, 720]);
  assert.equal(correction.recapture.visibility, "visible");
  assert.equal(correction.recapture.network, "standard");
  for (const tierName of ["hero", "identity", "massing"]) {
    const tier = correction.recapture.tiers[tierName];
    assert.equal(tier.status, "loaded");
    assert.equal(tier.frames, 120);
    assert.ok(tier.fps > 0);
    assert.equal(tier.camera, "spring-clear");
    assert.equal(tier.blocker, "none");
  }
  assert.equal(record.supportingScreenshots.length, 4);
});

test("运行时通过不伪装成地图完成，bounds 时序未知项保持显式", () => {
  assert.equal(record.acceptance.strictTierLineage, "pass");
  assert.equal(record.acceptance.blenderMcp123, "pass");
  assert.equal(record.acceptance.threeTierLoading, "pass");
  assert.equal(record.acceptance.fallback, "pass");
  assert.equal(record.acceptance.map, "blocked-for-both-buildings");
  assert.equal(
    record.acceptance.overall,
    "partial-complete-runtime-pass-map-blocked",
  );
  assert.ok(record.unknown.some((entry) => entry.includes("local/world")));
  assert.deepEqual(
    [
      record.console.consoleErrors,
      record.console.windowErrors,
      record.console.unhandledRejections,
    ],
    [0, 0, 0],
  );
});
