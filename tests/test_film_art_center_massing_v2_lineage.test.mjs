import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath =
  "docs/research/build-records/tiers/xinhua-road/massing-v2/film-art-center-massing.json";
const generatorPath = "scripts/create_film_art_center_massing_v2_model.py";

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
}

function triangleCount(glb) {
  return glb.meshes.reduce(
    (total, mesh) => total + mesh.primitives.reduce(
      (subtotal, primitive) => {
        const accessor = primitive.indices ?? primitive.attributes.POSITION;
        return subtotal + glb.accessors[accessor].count / 3;
      },
      0,
    ),
    0,
  );
}

test("Film Art Center Massing v2 严格绑定最终 Hero 三个 SHA", async () => {
  const [record, generator] = await Promise.all([
    readFile(new URL(recordPath, root), "utf8").then(JSON.parse),
    readFile(new URL(generatorPath, root), "utf8"),
  ]);
  const lineage = record.lineage;
  assert.equal(record.tier, "massing-v2");
  assert.equal(record.status, "headless-lineage-candidate-mcp1-pending");
  assert.equal(
    lineage.heroGlbSha256,
    "33daaaf003b47b705e03c95d2fe2ac0973b815079753f868c95c3b0f2f9b8e1b",
  );
  assert.equal(lineage.heroGlbSha256AtDerivation, lineage.heroGlbSha256);
  assert.equal(await sha256(lineage.heroGlb), lineage.heroGlbSha256);
  assert.equal(await sha256(lineage.heroBlend), lineage.heroBlendSha256);
  assert.equal(
    await sha256(lineage.heroGenerator),
    lineage.heroGeneratorSha256,
  );
  assert.match(generator, /validate_current_hero_lineage\(\)/u);
  assert.match(generator, /validate_frozen_parameters\(\)/u);
  assert.match(
    generator,
    /current-final-hero-frozen-parameter-simplification/u,
  );
});

test("Film Art Center Massing v2 是新产物且历史 Massing 保持精确 SHA", async () => {
  const record = await readFile(new URL(recordPath, root), "utf8").then(JSON.parse);
  const legacy = record.lineage.legacyMassing;
  assert.equal(
    legacy.path,
    "public/models/tiers/xinhua-road/massing/film-art-center-massing.glb",
  );
  assert.equal(
    await sha256(legacy.path),
    "c89791dc3978b317cc2f8807a77f7a84b5c596f8d4cd01c1cffd05090e9584a6",
  );
  assert.equal(legacy.decision, "preserved-history-do-not-overwrite");
  assert.notEqual(record.outputs.glb, legacy.path);
  assert.notEqual(record.glb.sha256, legacy.sha256);
  assert.equal(record.holdBoundary.legacyMassing, "preserved");
});

test("Film Art Center Massing v2 GLB、Blend、预算和 extras 可追溯", async () => {
  const record = await readFile(new URL(recordPath, root), "utf8").then(JSON.parse);
  const [buffer, blendStats] = await Promise.all([
    readFile(new URL(record.outputs.glb, root)),
    stat(new URL(record.outputs.blend, root)),
  ]);
  const glb = parseGlb(buffer);
  const rootNode = glb.nodes[0];
  assert.equal(sha256Buffer(buffer), record.glb.sha256);
  assert.equal(buffer.length, record.glb.bytes);
  assert.equal(blendStats.size, record.outputs.blendBytes);
  assert.equal(await sha256(record.outputs.blend), record.outputs.blendSha256);
  assert.equal(glb.nodes.length, record.glb.nodes);
  assert.equal(glb.meshes.length, record.glb.meshes);
  assert.equal(glb.materials.length, record.glb.materials);
  assert.equal(glb.images, undefined);
  assert.equal(glb.textures, undefined);
  assert.equal(triangleCount(glb), record.glb.triangles);
  assert.equal(rootNode.translation, undefined);
  assert.equal(rootNode.rotation, undefined);
  assert.equal(rootNode.scale, undefined);
  assert.equal(rootNode.extras.tier, "massing-v2");
  assert.equal(
    rootNode.extras.derived_from_hero_glb_sha256,
    record.lineage.heroGlbSha256,
  );
  assert.equal(record.glb.triangles <= record.budgets.maxTriangles, true);
  assert.equal(record.glb.bytes <= record.budgets.maxBytes, true);
  assert.equal(record.gates.glbAudit, "pass");
  assert.equal(record.gates.externalAudit.status, "pass");
  assert.equal(record.gates.deterministicGlb.status, "pass");
  assert.equal(record.gates.deterministicGlb.byteIdentical, true);
});

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

test("Film Art Center Massing v2 包络差异与纯建筑边界明确", async () => {
  const record = await readFile(new URL(recordPath, root), "utf8").then(JSON.parse);
  const comparison = record.envelopeComparison;
  assert.deepEqual(
    comparison.legacyMassing.dimensionDeltaCurrentMinusLegacy,
    [0, 0, 0],
  );
  assert.deepEqual(
    comparison.currentMassingV2.dimensions,
    comparison.legacyMassing.dimensions,
  );
  assert.ok(
    comparison.currentHeroFullExport.dimensions[1]
      > comparison.currentMassingV2.dimensions[1],
    "完整 Hero 的屋脊端饰应高于简化 Massing",
  );
  assert.ok(
    comparison.currentHeroFullExport.dimensions[2]
      > comparison.currentMassingV2.dimensions[2],
    "完整 Hero 含前庭草坪，纵深应大于纯建筑 Massing",
  );
  assert.match(
    comparison.currentHeroFullExport.comparisonBoundary,
    /草坪、路径、屋脊端饰/u,
  );
});

test("Film Art Center Massing v2 固定三视图存在且不提前声明 MCP1", async () => {
  const record = await readFile(new URL(recordPath, root), "utf8").then(JSON.parse);
  for (const view of ["canonical", "side", "entrance"]) {
    const preview = record.outputs.previews[view];
    const buffer = await readFile(new URL(preview.path, root));
    assert.equal(buffer.length, preview.bytes);
    assert.equal(sha256Buffer(buffer), preview.sha256);
    assert.ok(buffer.length > 500_000);
    assert.ok(preview.lensMm >= 50 && preview.lensMm <= 60);
  }
  assert.equal(record.gates.mcp1, "pending-main-window-batch-review");
  assert.equal(record.gates.mapAcceptance, "not-reviewed-in-this-branch");
  assert.equal(record.gates.identityAllowed, false);
});
