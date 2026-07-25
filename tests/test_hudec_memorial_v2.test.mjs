import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordUrl = new URL(
  "docs/research/build-records/hudec-memorial-massing.json",
  root,
);
const glbUrl = new URL(
  "public/models/requested-pois/hudec-memorial-massing.glb",
  root,
);
const blendUrl = new URL(
  "assets/models/source/requested-pois/hudec-memorial-massing.blend",
  root,
);
const generatorUrl = new URL("scripts/create_hudec_memorial_v2.py", root);
const mcpGateUrl = new URL(
  "docs/research/hudec-memorial-blender-mcp-gates.json",
  root,
);

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim());
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

test("Hudec Massing 保持单资产安全并记录证据边界", async () => {
  const [generator, record] = await Promise.all([
    readFile(generatorUrl, "utf8"),
    readFile(recordUrl, "utf8").then(JSON.parse),
  ]);

  assert.equal(record.stableAssetId, "hudec-memorial");
  assert.equal(record.qualityTier, "massing");
  assert.equal(record.status, "mcp1-pass-map-calibration-pending");
  assert.equal(record.generator.singleAssetSafe, true);
  assert.deepEqual(record.holdBoundary, {
    trees: "untouched",
    decor: "untouched",
    characters: "no runtime character asset; preview-only scale proxy",
    otherBuildings: "untouched",
    globalMassing: "untouched",
  });
  assert.match(generator, /当前只开放 massing/);
  assert.doesNotMatch(generator, /BUILDERS/);
  for (const cue of [
    "chimney-tower",
    "chimney-flue",
    "main-roof",
    "end-wing-roof",
    "end-gable-timber",
    "low-glass-wing",
  ]) {
    assert.match(generator, new RegExp(cue));
  }
});

test("Hudec Massing GLB 与 build record 的结构和哈希一致", async () => {
  const [buffer, record, blendStats] = await Promise.all([
    readFile(glbUrl),
    readFile(recordUrl, "utf8").then(JSON.parse),
    stat(blendUrl),
  ]);
  const glb = parseGlb(buffer);

  assert.equal(sha256(buffer), record.artifacts.glb.sha256);
  assert.equal(buffer.length, record.artifacts.glb.bytes);
  assert.equal(blendStats.size, record.artifacts.blend.bytes);
  assert.equal(glb.nodes.length, record.structure.nodes);
  assert.equal(glb.meshes.length, record.structure.meshes);
  assert.equal(glb.materials.length, record.structure.materials);
  assert.equal(glb.images, undefined);
  assert.equal(glb.textures, undefined);
  assert.equal(glb.nodes[0].translation, undefined, "根节点不得带非零平移");
  assert.equal(glb.nodes[0].rotation, undefined, "根节点不得带非零旋转");
  assert.equal(glb.nodes[0].scale, undefined, "根节点不得带非一缩放");
  assert.equal(glb.nodes[0].extras.stable_asset_id, "hudec-memorial");
  assert.equal(glb.nodes[0].extras.quality_tier, "massing");
  assert.equal(record.structure.triangles <= record.budget.maxTriangles, true);
  assert.equal(record.artifacts.glb.bytes <= record.budget.maxBytes, true);
});

test("三张 Headless 固定机位与 1.8 m 代理合同齐全", async () => {
  const [record, generator] = await Promise.all([
    readFile(recordUrl, "utf8").then(JSON.parse),
    readFile(generatorUrl, "utf8"),
  ]);
  for (const view of ["canonical", "side", "entrance"]) {
    const preview = record.previews[view];
    const stats = await stat(new URL(preview.path, root));
    assert.ok(stats.size > 100_000, `${view} 固定机位不得是空白占位图`);
  }
  assert.equal(record.previews.scaleProxy.heightMeters, 1.8);
  assert.ok(
    Math.abs(record.previews.scaleProxy.heightSceneUnits - 2 / 3) < 1e-9,
  );
  assert.equal(record.previews.scaleProxy.previewOnly, true);
  assert.equal(record.previews.scaleProxy.exportedToGlb, false);
  assert.match(generator, /test-human-1_8m-body/);
  assert.match(generator, /test-human-1_8m-head/);
  assert.match(generator, /asset=False/);
});

test("Hudec Massing MCP1 固定机位、结构检查与正式二进制一致", async () => {
  const [gate, record, glb] = await Promise.all([
    readFile(mcpGateUrl, "utf8").then(JSON.parse),
    readFile(recordUrl, "utf8").then(JSON.parse),
    readFile(glbUrl),
  ]);

  assert.equal(gate.assetId, "hudec-memorial");
  assert.equal(gate.massingGate.status, "pass");
  assert.equal(gate.massingGate.runtimeAsset.sha256, sha256(glb));
  assert.equal(gate.massingGate.sceneInspection.triangles, 2180);
  assert.equal(gate.massingGate.sceneInspection.materials, 5);
  assert.equal(gate.massingGate.sceneInspection.images, 0);
  assert.deepEqual(gate.massingGate.acceptedInteractiveChanges, []);
  assert.equal(gate.massingGate.generatorRoundTrip.status, "not-required");
  assert.equal(
    record.validation.mcpRecord,
    "docs/research/hudec-memorial-blender-mcp-gates.json",
  );

  for (const view of ["canonical", "side", "entrance"]) {
    const screenshot = gate.massingGate.fixedViews[view];
    const buffer = await readFile(new URL(screenshot.screenshot, root));
    assert.equal(buffer.length, screenshot.bytes);
    assert.equal(sha256(buffer), screenshot.sha256);
  }
});
