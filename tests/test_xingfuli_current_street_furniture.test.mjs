import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageSlug = "xingfuli-current-street-furniture";
const slugs = [
  "xingfuli-pointed-entry-bollard",
  "xingfuli-water-edge-stone-seat-round",
  "xingfuli-water-edge-stone-seat-long",
  "xingfuli-water-edge-slim-planter",
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function sha256(relativePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(root, relativePath)))
    .digest("hex");
}

test("幸福里当前街具范围严格为四件且生产接入保持关闭", () => {
  const references = readJson(
    "docs/research/xingfuli-current-street-furniture-reference-manifest.json",
  );
  const manifest = readJson(
    "docs/research/xingfuli-current-street-furniture-model-manifest.json",
  );
  assert.deepEqual(references.approvedAssets, slugs);
  assert.equal(manifest.assetCount, 4);
  assert.deepEqual(manifest.assets.map((asset) => asset.slug), slugs);
  assert.equal(manifest.status, "visible-low-isolated-runtime-qa-passed");
  assert.ok(
    manifest.assets.every(
      (asset) => asset.status === "blender-glb-and-isolated-runtime-qa-passed",
    ),
  );
  assert.deepEqual(manifest.runtimeStates, ["visible-low", "hidden"]);
  assert.equal(manifest.productionRegistry, "intentionally-not-modified");
  assert.equal(manifest.productionManifest, "intentionally-not-modified");
  assert.equal(manifest.runtimeIntegration, "isolated-qa-only");
});

test("四个 master 与 visible-low GLB 可追溯且全部通过预算", () => {
  for (const slug of slugs) {
    const blend = `assets/models/source/nonbuilding/${packageSlug}/${slug}.blend`;
    const glb = `public/models/nonbuilding/${packageSlug}/${slug}-visible-low.glb`;
    const recordPath =
      `docs/research/build-records/nonbuilding/${packageSlug}/${slug}-visible-low.json`;
    assert.ok(fs.statSync(path.join(root, blend)).size > 0, `${blend} 为空`);
    assert.ok(fs.statSync(path.join(root, glb)).size > 0, `${glb} 为空`);
    const record = readJson(recordPath);
    assert.equal(record.outputs.blend, blend);
    assert.equal(record.outputs.glb, glb);
    assert.equal(record.outputs.blendSha256, sha256(blend));
    assert.equal(record.glb.sha256, sha256(glb));
    assert.equal(record.glb.images, 0);
    assert.equal(record.glb.textures, 0);
    assert.equal(record.glb.animations, 0);
    assert.equal(record.glb.skins, 0);
    assert.deepEqual(record.glb.transformedNodes, []);
    assert.ok(record.glb.bounds.min[1] >= -0.0001);
    assert.ok(record.glb.triangles <= record.budget.maxTriangles);
    assert.ok(record.glb.nodes <= record.budget.maxNodes);
    assert.ok(record.glb.materials <= record.budget.maxMaterials);
    assert.ok(record.glb.bytes <= record.budget.maxBinaryBytes);
    assert.equal(
      record.buildingTierCompatibility.identity,
      "not-applicable-by-nonbuilding-two-state-contract",
    );
    assert.equal(
      record.runtimeGate.productionRegistry,
      "intentionally-not-integrated",
    );
    assert.equal(record.runtimeGate.status, "passed-isolated-qa");
    assert.equal(record.runtimeGate.consoleErrors, 0);
    assert.equal(record.mcpGate.status, "passed");
    assert.equal(record.mcpGate.savedQaObjectsInMaster, false);
    assert.ok(
      fs.statSync(
        path.join(
          root,
          `test_artifacts/nonbuilding/${packageSlug}/test_${slug}-triptych.png`,
        ),
      ).size > 0,
    );
  }
});

test("生成器支持单资产重建且只声明冻结 slug", () => {
  const generator = read(
    "scripts/create_xingfuli_current_street_furniture_models.py",
  );
  assert.match(generator, /parser\.add_argument\("--asset"/);
  assert.match(generator, /幸福里当前街具批次必须严格为 4 个资产/);
  for (const slug of slugs) assert.match(generator, new RegExp(slug));
  assert.doesNotMatch(generator, /shared-prototypes\/identity/);
  assert.doesNotMatch(generator, /xinhua-road-landmarks-data\.json/);
});

test("隔离 QA 页面实现 visible-low 与 hidden 两态且不进入正式 world", () => {
  const qa = read("app/nonbuilding-evidence-qa/NonbuildingEvidenceQa.tsx");
  assert.match(qa, /FAR_HIDE_DISTANCE_METERS = 18/);
  assert.match(qa, /distanceMeters < FAR_HIDE_DISTANCE_METERS/);
  assert.match(
    qa,
    /<RuntimeModel path=\{assetPath\} onReady=\{onModelReady\} \/>/,
  );
  assert.match(qa, /data-qa-model-state=\{runtimeState\}/);
  assert.match(qa, /data-qa-render-ready=\{renderReady \? "true" : "false"\}/);
  assert.match(qa, /同一份 visible-low GLB/);
  for (const slug of slugs) assert.match(qa, new RegExp(slug));

  const productionWorld = read("app/scene/xinhua-world.tsx");
  assert.doesNotMatch(productionWorld, new RegExp(packageSlug));
  for (const slug of slugs) {
    assert.doesNotMatch(productionWorld, new RegExp(slug));
  }
});
