import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const audit = JSON.parse(fs.readFileSync(
  path.join(ROOT, "docs/research/xingfuli-center-lineage-map-audit.json"),
  "utf8",
));
const sha256 = (relativePath) => crypto
  .createHash("sha256")
  .update(fs.readFileSync(path.join(ROOT, relativePath)))
  .digest("hex");

test("幸福里中区只保留当前三档，不重建或扩大范围", () => {
  assert.equal(audit.assetId, "xingfuli-center");
  assert.equal(audit.scope.assetCount, 1);
  assert.equal(audit.decision.rebuild, "forbidden-retain-qualified-assets");
  assert.equal(audit.decision.movementOrScale, "no-change");
  assert.ok(audit.scope.excluded.includes("trees"));
  assert.ok(audit.scope.excluded.includes("decorations"));
  assert.ok(audit.scope.excluded.includes("full-map-assets"));
});

test("幸福里中区三档与记录指纹一致且不嵌入图片", () => {
  for (const tier of ["hero", "identity", "massing"]) {
    const candidate = audit.tiers[tier];
    assert.equal(sha256(candidate.glb), candidate.sha256);
    assert.equal(sha256(candidate.blend), candidate.blendSha256);
    assert.equal(candidate.recordMatchesCurrentGlb, true);
    assert.equal(candidate.recoveryMatchesCurrent, true);
    assert.equal(candidate.images, 0);
    assert.equal(candidate.textures, 0);
    assert.deepEqual(candidate.transformedNodes, []);
  }
});

test("幸福里中区 Identity 未建立 final Hero lineage", () => {
  assert.equal(audit.lineage.identityHasExplicitDerivedFrom, false);
  assert.equal(audit.lineage.massingHasExplicitDerivedFrom, false);
  assert.equal(audit.lineage.identityGeneratedBeforeFinalHero, true);
  assert.equal(audit.lineage.massingGeneratedBeforeIdentityAndFinalHero, true);
  assert.equal(audit.lineage.status, "blocked-formal-lineage-proof");
  assert.equal(audit.gates.identity, "blocked-lineage");
});

test("幸福里中区地图与主巷通过，但入口 detail start 保持 blocker", () => {
  assert.ok(audit.mapCalibration.midpointErrorMeters < 0.01);
  assert.ok(audit.mapCalibration.roads.nearestVisibleRoad.asphaltClearanceMeters > 0);
  assert.ok(audit.mapCalibration.roads.panyuRoad.asphaltClearanceMeters > 0);
  assert.ok(audit.mapCalibration.centerMainLane.remainingAfterPlayerDiameterSceneUnits > 0);
  assert.equal(audit.gates.map, "pass-center-segment");
  assert.equal(audit.startCamera.presets["xingfuli-entrance-detail"].status,
    "blocked-inside-player-radius-of-bollard");
  assert.equal(audit.startCamera.recommendedEntranceCandidate.status,
    "geometry-pass-pending-main-runtime");
  assert.equal(audit.gates.startCamera, "blocked");
});
