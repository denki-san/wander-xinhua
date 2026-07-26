import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(ROOT, relativePath), "utf8"),
);
const sha256 = (relativePath) => crypto
  .createHash("sha256")
  .update(fs.readFileSync(path.join(ROOT, relativePath)))
  .digest("hex");
const worldSource = fs.readFileSync(
  path.join(ROOT, "app/scene/xinhua-world.tsx"),
  "utf8",
);
const records = ["west", "center", "east"].map((segment) => readJson(
  `docs/research/xingfuli-${segment}-threejs-runtime-qa.json`,
));

for (const record of records) {
  test(`${record.assetId} 单页三档、fallback 和性能样本闭合`, () => {
    for (const tierName of ["hero", "identity", "massing"]) {
      const tier = record.tiers[tierName];
      assert.equal(tier.status, "loaded");
      assert.ok(tier.fps > 50);
      assert.ok(tier.drawCalls > 0);
      assert.ok(tier.triangles > 0);
    }
    assert.equal(
      record.fallbacks.heroToIdentity.status,
      "pass-forced-deterministic-fallback",
    );
    assert.equal(
      record.fallbacks.identityToMassing.status,
      "pass-forced-deterministic-fallback",
    );
    assert.equal(record.viewport[0], 1280);
    assert.equal(record.visibility, "visible");
    assert.equal(record.console.errorsObservedAcrossBatch, 0);
  });

  test(`${record.assetId} Three.js 截图和确定性碰撞路线可复核`, () => {
    assert.ok(record.screenshots.length >= 5);
    for (const screenshot of record.screenshots) {
      assert.equal(
        fs.statSync(path.join(ROOT, screenshot.path)).size,
        screenshot.bytes,
      );
      assert.equal(sha256(screenshot.path), screenshot.sha256);
    }
    assert.equal(record.collision.status, "pass-target-reached");
    assert.ok(record.collision.finalTargetErrorSceneUnits < 0.05);
    assert.match(record.camera.initial, /^pass-/);
  });
}

test("入口直达点采用已有安全路线端点并通过东区真实页面", () => {
  const east = records.find(({ assetId }) => assetId === "xingfuli-east");
  assert.deepEqual(east.startFix.oldLocal, [45, -5.5]);
  assert.deepEqual(east.startFix.newLocal, [46, -5.05]);
  assert.equal(east.acceptance.startCamera, "pass");
  assert.match(
    worldSource,
    /xingfuliLocalToWorld\(\s*46,\s*-5\.05,\s*\)/,
  );
});

test("运行时诊断不越过 strict lineage 和西东道路 blocker", () => {
  const byAssetId = Object.fromEntries(
    records.map((record) => [record.assetId, record]),
  );
  for (const record of records) {
    assert.equal(record.acceptance.strictTierLineage, "blocked");
    assert.equal(record.acceptance.runtimePromotionAllowed, false);
  }
  assert.equal(
    byAssetId["xingfuli-west"].acceptance.map,
    "blocked-xingfu-road-overlap",
  );
  assert.equal(
    byAssetId["xingfuli-center"].acceptance.map,
    "pass-center-segment",
  );
  assert.equal(
    byAssetId["xingfuli-east"].acceptance.map,
    "blocked-panyu-road-overlap",
  );
});
