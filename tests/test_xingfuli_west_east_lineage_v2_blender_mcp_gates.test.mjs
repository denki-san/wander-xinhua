import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const record = JSON.parse(fs.readFileSync(
  path.join(
    ROOT,
    "docs/research/xingfuli-west-east-lineage-v2-blender-mcp-gates.json",
  ),
  "utf8",
));
const sha256 = (relativePath) => crypto
  .createHash("sha256")
  .update(fs.readFileSync(path.join(ROOT, relativePath)))
  .digest("hex");

test("幸福里 West/East Blender MCP 以两栋批次终审且范围严格", () => {
  assert.equal(record.status, "pass-main-window-batched-mcp1-mcp2-mcp3");
  assert.deepEqual(
    record.scope.exactBuildingIds,
    ["xingfuli-west", "xingfuli-east"],
  );
  assert.equal(record.scope.treesDecorationFullMap, "excluded");
  assert.equal(record.scope.recoveryHold, "untouched");
  assert.equal(record.execution.batchSize, 2);
  assert.equal(record.execution.mainWindowFinalReview, true);
  assert.equal(record.execution.finalDirtyState, false);
  assert.equal(record.gates.mcp1.status, "pass");
  assert.equal(record.gates.mcp2.status, "pass");
  assert.equal(record.gates.mcp3.status, "pass");
});

for (const building of record.buildings) {
  test(`${building.assetId} MCP 三档指纹、bounds 与递减对象数闭合`, () => {
    const counts = building.tiers.map(({ blend }) => blend.meshObjects);
    assert.ok(counts[0] > counts[1]);
    assert.ok(counts[1] > counts[2]);
    for (const tier of building.tiers) {
      for (const asset of [tier.blend, tier.glb]) {
        assert.equal(fs.statSync(path.join(ROOT, asset.path)).size, asset.bytes);
        assert.equal(sha256(asset.path), asset.sha256);
      }
      assert.equal(tier.blend.dirtyAfterInspection, false);
      assert.deepEqual(
        tier.blend.boundsMin,
        building.tiers[0].blend.boundsMin,
      );
      assert.deepEqual(
        tier.blend.boundsMax,
        building.tiers[0].blend.boundsMax,
      );
    }
  });

  test(`${building.assetId} 六张固定机位证据可按 SHA 复核`, () => {
    assert.equal(building.fixedViewEvidence.length, 6);
    assert.deepEqual(
      [...new Set(building.fixedViewEvidence.map(({ view }) => view))].sort(),
      ["canonical", "side", "street"],
    );
    for (const screenshot of building.fixedViewEvidence) {
      assert.equal(
        fs.statSync(path.join(ROOT, screenshot.path)).size,
        screenshot.bytes,
      );
      assert.equal(sha256(screenshot.path), screenshot.sha256);
    }
  });
}

test("MCP 通过不越过 West/East 道路未知项", () => {
  assert.equal(record.disposition.tierLineage, "pass-promote-for-explicit-qa");
  assert.equal(record.disposition.map, "blocked-for-both-buildings");
  assert.equal(record.disposition.productionDefault, "keep-hero");
  assert.ok(record.buildings.every(
    ({ mapDisposition }) => mapDisposition.startsWith("blocked-"),
  ));
  assert.ok(record.unknown.some((entry) => entry.includes("第 9 张")));
});
