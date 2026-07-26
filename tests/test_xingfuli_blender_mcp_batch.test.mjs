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

const records = ["west", "center", "east"].map((segment) => readJson(
  `docs/research/xingfuli-${segment}-blender-mcp-gates.json`,
));

for (const record of records) {
  test(`${record.assetId} MCP1/MCP2 只复核保留资产且未保存临时场景`, () => {
    assert.equal(record.gates.mcp1Massing, "pass-retained-visual");
    assert.equal(record.gates.mcp2Hero, "pass-retained-visual");
    assert.equal(record.humanScale.temporaryProxyOnly, true);
    assert.equal(record.humanScale.savedToMaster, false);
    assert.equal(record.humanScale.exportedToGlb, false);
    assert.deepEqual(record.acceptedInteractiveChanges, []);

    for (const tier of ["hero", "identity", "massing"]) {
      for (const asset of [
        record.editableSources[tier],
        record.runtimeAssets[tier],
      ]) {
        assert.equal(fs.statSync(path.join(ROOT, asset.path)).size, asset.bytes);
        assert.equal(sha256(asset.path), asset.sha256);
      }
    }
  });

  test(`${record.assetId} 固定机位和 contact sheet 指纹可复核`, () => {
    assert.equal(record.sceneInspection.canonicalDirection, "local-positive-x");
    assert.ok(record.acceptedScreenshots.length >= 8);
    for (const screenshot of record.acceptedScreenshots) {
      assert.equal(
        fs.statSync(path.join(ROOT, screenshot.path)).size,
        screenshot.bytes,
      );
      assert.equal(sha256(screenshot.path), screenshot.sha256);
    }
    assert.equal(
      record.rejectedCameraEvidence.status,
      "preserved-on-disk-not-accepted",
    );
  });
}

test("幸福里三栋同机位视觉通过，但严格 lineage 未被 Recovery pass 叙述替代", () => {
  for (const record of records) {
    assert.equal(
      record.gates.mcp3ThreeTierVisual,
      "pass-same-camera-envelope-and-identity-readability",
    );
    assert.match(record.gates.strictTierLineage, /^blocked-/);
    assert.equal(record.gates.formalMcp3, "blocked-lineage");
    assert.equal(record.gates.runtimePromotionAllowed, false);
  }
});

test("幸福里道路 blocker 只保留在西东两端，中段地图单独通过", () => {
  const byAssetId = Object.fromEntries(
    records.map((record) => [record.assetId, record]),
  );
  assert.equal(byAssetId["xingfuli-west"].gates.map, "blocked-xingfu-road-overlap");
  assert.equal(byAssetId["xingfuli-center"].gates.map, "pass-center-segment");
  assert.equal(byAssetId["xingfuli-east"].gates.map, "blocked-panyu-road-overlap");
});
