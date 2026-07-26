import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BUILDING_MASSING_QA_CANDIDATES,
} from "../app/scene/building-massing-qa-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(ROOT, relativePath), "utf8"),
);
const sha256 = (relativePath) => crypto
  .createHash("sha256")
  .update(fs.readFileSync(path.join(ROOT, relativePath)))
  .digest("hex");

const records = {
  "xinhua-pocket-park": readJson(
    "docs/research/xinhua-pocket-park-threejs-runtime-qa.json",
  ),
  "fics-xinhua-365": readJson(
    "docs/research/fics-xinhua-365-threejs-runtime-qa.json",
  ),
  "shanghai-orchestra": readJson(
    "docs/research/shanghai-orchestra-threejs-runtime-qa.json",
  ),
};

for (const [assetId, record] of Object.entries(records)) {
  test(`${assetId} 当前 Three.js 页面加载精确 Massing 并封存性能样本`, () => {
    const candidate = BUILDING_MASSING_QA_CANDIDATES[assetId];
    assert.equal(record.assetId, assetId);
    assert.equal(record.resource.status, "loaded");
    assert.equal(record.resource.tier, "massing");
    assert.equal(record.resource.source, candidate.modelPath);
    assert.ok((record.performance.fps ?? record.performance.map?.fps) > 50);
    assert.deepEqual(record.viewport, [1280, 720]);
    assert.equal(record.visibility, "visible");
    assert.equal(record.console.errorsObservedForCurrentRoute, 0);
    for (const screenshot of Object.values(record.screenshots)) {
      assert.equal(fs.statSync(path.join(ROOT, screenshot.path)).size, screenshot.bytes);
      assert.equal(sha256(screenshot.path), screenshot.sha256);
    }
  });
}

test("Pocket Park 碰撞路线通过，但窄廊相机未通过且不得提升生产地图", () => {
  const record = records["xinhua-pocket-park"];
  const candidate = BUILDING_MASSING_QA_CANDIDATES["xinhua-pocket-park"];
  assert.equal(record.collision.status, "pass-center-route");
  assert.ok(record.collision.finalTargetErrorSceneUnits < 0.05);
  assert.equal(record.collision.wallCollisionShell.runtimeSegments, 308);
  assert.equal(candidate.legacyObstacleSuppressions[0].assetId, "fics-xinhua-365");
  assert.deepEqual(candidate.legacyObstacleSuppressions[0].obstacleIndexes, [2]);
  assert.equal(record.camera.status, "blocked");
  assert.ok(record.camera.finalObservedArmLengthRange[1] < 0.6);
  assert.equal(record.acceptance.formalMapAcceptance, "blocked-camera");
  assert.equal(record.acceptance.runtimePromotionAllowed, false);
});

test("FICS 与 Orchestra 只保留诊断通过，证据和地图 blocker 不被运行时加载掩盖", () => {
  const fics = records["fics-xinhua-365"];
  const orchestra = records["shanghai-orchestra"];
  assert.equal(fics.collisionDiagnostic.status, "pass-stop-observed");
  assert.equal(fics.acceptance.serviceRoad, "blocked-overlap");
  assert.equal(fics.acceptance.formalMembership, "blocked-evidence");
  assert.equal(fics.acceptance.runtimePromotionAllowed, false);
  assert.equal(orchestra.collisionDiagnostic.status, "pass-stop-observed");
  assert.equal(orchestra.acceptance.formalMembership, "blocked-evidence");
  assert.equal(orchestra.acceptance.runtimePromotionAllowed, false);
});
