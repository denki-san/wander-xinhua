import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath =
  "docs/research/build-records/tiers/xinhua-road/hero/"
  + "hudec-memorial-v2-hero.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

async function inspectGlb(path) {
  const buffer = await readFile(new URL(path, root));
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(
    buffer.subarray(20, 20 + jsonLength).toString("utf8").trim(),
  );
  let triangles = 0;
  let primitives = 0;
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      primitives += 1;
      const position = json.accessors[primitive.attributes.POSITION];
      const indices = primitive.indices === undefined
        ? position
        : json.accessors[primitive.indices];
      triangles += indices.count / 3;
      for (let axis = 0; axis < 3; axis += 1) {
        bounds.min[axis] = Math.min(bounds.min[axis], position.min[axis]);
        bounds.max[axis] = Math.max(bounds.max[axis], position.max[axis]);
      }
    }
  }
  return {
    json,
    metrics: {
      bytes: buffer.length,
      nodes: json.nodes?.length ?? 0,
      meshes: json.meshes?.length ?? 0,
      primitives,
      triangles,
      materials: json.materials?.length ?? 0,
      images: json.images?.length ?? 0,
      textures: json.textures?.length ?? 0,
      animations: json.animations?.length ?? 0,
      skins: json.skins?.length ?? 0,
      bounds,
    },
  };
}

function closeArray(actual, expected, tolerance = 1e-5) {
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < actual.length; index += 1) {
    assert.ok(Math.abs(actual[index] - expected[index]) <= tolerance);
  }
}

test("邬达克 V2 Hero 只写本栋独立候选且未越过 MCP2/Identity", async () => {
  const record = await readJson(recordPath);
  assert.equal(record.stableAssetId, "hudec-memorial");
  assert.equal(record.tier, "hero");
  assert.equal(record.status, "candidate-awaiting-main-window-mcp2");
  assert.equal(record.scope.legacyHeroOverwritten, false);
  assert.equal(record.scope.acceptedMassingOverwritten, false);
  assert.equal(record.scope.identityGenerated, false);
  assert.equal(record.validation.mcp2, "pending-main-window-xhigh");
  assert.equal(record.validation.identityAuthorization, false);
  for (const input of Object.values(record.inputs)) {
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
});

test("Hero generator、Blend、GLB 与 build record 精确一致", async () => {
  const record = await readJson(recordPath);
  assert.equal(await sha256(record.generator.path), record.generator.sha256);
  assert.equal(
    await sha256(record.outputs.blend.path),
    record.outputs.blend.sha256,
  );
  assert.equal(
    await sha256(record.outputs.glb.path),
    record.outputs.glb.sha256,
  );
  assert.equal(
    (await stat(new URL(record.outputs.blend.path, root))).size,
    record.outputs.blend.bytes,
  );
  assert.equal(
    (await stat(new URL(record.outputs.glb.path, root))).size,
    record.outputs.glb.bytes,
  );

  const { json, metrics } = await inspectGlb(record.outputs.glb.path);
  for (const key of [
    "nodes",
    "meshes",
    "primitives",
    "triangles",
    "materials",
    "images",
    "textures",
    "animations",
    "skins",
  ]) {
    assert.equal(metrics[key], record.structure[key], `hero.${key}`);
  }
  closeArray(metrics.bounds.min, record.structure.bounds.min);
  closeArray(metrics.bounds.max, record.structure.bounds.max);
  assert.equal(json.nodes[0].extras.stable_asset_id, "hudec-memorial");
  assert.equal(json.nodes[0].extras.quality_tier, "hero-candidate");
  assert.equal(json.nodes[0].extras.front_direction, "-Y");
  assert.equal(json.nodes[0].extras.authored_unit_meters, 2.7);
  assert.equal(json.nodes[0].extras.generator, record.generator.path);
  assert.equal(json.nodes[0].translation, undefined);
  assert.equal(json.nodes[0].rotation, undefined);
  assert.equal(json.nodes[0].scale, undefined);
});

test("Hero 严格继承 accepted Massing 合同并保持包络连续", async () => {
  const record = await readJson(recordPath);
  const massingRecord = await readJson(
    record.inputs.acceptedMassingBuildRecord.path,
  );
  assert.equal(
    await sha256(record.lineage.sourceMassing.glb.path),
    record.lineage.sourceMassing.glb.sha256,
  );
  assert.equal(
    await sha256(record.lineage.sourceMassing.blend.path),
    record.lineage.sourceMassing.blend.sha256,
  );
  assert.equal(massingRecord.mainWindowReview.mapAcceptance, "pass");
  assert.equal(massingRecord.mainWindowReview.heroReviewAuthorized, true);
  assert.equal(record.lineage.sharedContract.origin.join(","), "0,0,0");
  assert.equal(record.lineage.sharedContract.authoredUnitMeters, 2.7);
  assert.equal(record.lineage.sharedContract.authoredScale, 0.72);
  assert.equal(record.lineage.sharedContract.frontDirection, "-Y");
  const massing = record.lineage.envelope.acceptedMassingGlbBounds;
  const hero = record.lineage.envelope.heroGlbBounds;
  assert.ok(hero.min[0] >= massing.min[0] && hero.max[0] <= massing.max[0]);
  assert.ok(hero.min[2] >= massing.min[2] && hero.max[2] <= massing.max[2]);
  assert.ok(Math.abs(hero.max[1] - massing.max[1]) < 1e-5);
  assert.ok(Math.abs(hero.min[1]) <= 0.04);
});

test("Hero 保留五类主体身份构件并排除 legacy 场地污染", async () => {
  const record = await readJson(recordPath);
  const generator = await readFile(
    new URL(record.generator.path, root),
    "utf8",
  );
  for (const cue of [
    "hero-front-timber",
    "hero-front-window",
    "hero-end-wing-window",
    "hero-chimney-crown",
    "hero-entrance-door",
    "hero-low-wing-horizontal",
  ]) {
    assert.match(generator, new RegExp(cue));
  }
  const heroBuilder = generator.slice(
    generator.indexOf("def build_hero"),
    generator.indexOf("def scene_bounds"),
  );
  for (const forbidden of [
    "garden_tree",
    "hedge",
    "planter",
    "street-wall",
    "ground-datum",
    "signage",
    "ground-light",
  ]) {
    assert.doesNotMatch(heroBuilder, new RegExp(forbidden));
  }
  const { json } = await inspectGlb(record.outputs.glb.path);
  const materials = json.materials.map(({ name }) => name);
  assert.deepEqual(materials, record.structure.materialNames);
  assert.ok(materials.every((name) => !/树|绿篱|庭院|plant|hedge|ground/i.test(name)));
});

test("canonical、side、entrance 与三联对照均为当前可追溯 PNG", async () => {
  const record = await readJson(recordPath);
  for (const preview of [
    record.previews.canonical,
    record.previews.side,
    record.previews.entrance,
    record.previews.triptych,
  ]) {
    const buffer = await readFile(new URL(preview.path, root));
    assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(buffer.length, preview.bytes);
    assert.equal(
      createHash("sha256").update(buffer).digest("hex"),
      preview.sha256,
    );
    assert.deepEqual(
      [buffer.readUInt32BE(16), buffer.readUInt32BE(20)],
      preview.dimensions,
    );
  }
  assert.equal(
    await sha256(record.previews.triptychGenerator.path),
    record.previews.triptychGenerator.sha256,
  );
  assert.equal(
    record.previews.triptych.thirdPanel,
    "retained-accepted-massing-map-context-not-hero-runtime",
  );
});

test("Hero 预算与门状态只达到 main-window MCP2 候选", async () => {
  const record = await readJson(recordPath);
  assert.ok(record.structure.nodes <= record.budget.maxNodes);
  assert.ok(record.structure.triangles <= record.budget.maxTriangles);
  assert.ok(record.structure.materials <= record.budget.maxMaterials);
  assert.equal(record.structure.images, record.budget.maxImages);
  assert.ok(record.outputs.glb.bytes <= record.budget.maxBytes);
  assert.equal(record.budget.result, "pass");
  assert.equal(record.validation.headlessFixedViews, "pass-candidate");
  assert.equal(record.validation.glbAudit, "pass-forbid-images-max-nodes-2");
  assert.equal(record.validation.threeJsHeroRuntime, "not-run-not-integrated");
  assert.equal(record.validation.performanceClaim, "none");
  assert.equal(
    record.validation.overall,
    "candidate-awaiting-main-window-mcp2",
  );
});
