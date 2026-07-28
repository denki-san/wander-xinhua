import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageSlug = "meshy-agent-street-assets";
const slugs = [
  "plane-tree-straight-sparse",
  "lane-lamp-short-arm",
  "slatted-bench-backrest",
  "street-planter-long",
  "stone-bollard-squat",
  "shanghai-dual-classification-bin",
  "cantilever-cafe-umbrella",
  "outdoor-dining-dark-wood",
  "vintage-step-through-bicycle",
  "wall-ac-outdoor-unit",
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

function sha256Absolute(absolutePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(absolutePath))
    .digest("hex");
}

test("Meshy Agent 批次严格包含十件有明确用途的资产", () => {
  const reference = readJson(
    "docs/research/meshy-agent-street-assets-reference-manifest.json",
  );
  const manifest = readJson(
    "docs/research/meshy-agent-street-assets-model-manifest.json",
  );
  assert.equal(reference.batchId, "meshy-agent-street-assets-20260728");
  assert.equal(reference.scopeBoundary.genericSharedAssetAuthority, true);
  assert.equal(reference.scopeBoundary.sitePlacementAuthority, false);
  assert.equal(reference.evidenceSnapshot.id, "2026-07-28-2ca6310");
  assert.equal(manifest.assetCount, 10);
  assert.equal(
    manifest.finalEvidenceSnapshot.id,
    "2026-07-28-meshy-agent-street-assets-final-2ca6310",
  );
  assert.equal(
    manifest.finalEvidenceSnapshot.manifestSha256,
    "f9fa2d38634827587d3401f64049a5d7b6cd713029bdfd7ace38a155a76d643e",
  );
  assert.equal(
    manifest.finalEvidenceSnapshot.checksumFileSha256,
    "d3f5bea9bea340e26c8c5e5936f2e3a244f96e78ab99051b296767fd02c937bf",
  );
  assert.deepEqual(
    manifest.assets.map((asset) => asset.slug),
    slugs,
  );
  assert.equal(manifest.sourceRoute, "meshy-agent-web-no-api");
  assert.equal(manifest.productionRegistry, "intentionally-not-modified");
});

test("十件 Blend、GLB、三视图和 build record 都可追溯且通过预算", () => {
  const manifest = readJson(
    "docs/research/meshy-agent-street-assets-model-manifest.json",
  );
  assert.equal(manifest.status, "visible-low-isolated-runtime-qa-passed");
  assert.equal(manifest.runtimePassedAssetCount, 10);
  assert.equal(manifest.runtimeConsoleErrorCount, 0);
  assert.equal(manifest.zeroImageTextureAssetCount, 10);
  assert.equal(manifest.rootTransformCleanAssetCount, 10);
  assert.ok(manifest.totalTriangles <= 10_000);
  assert.ok(manifest.totalGlbBytes <= 1_000_000);
  const snapshotRoot = manifest.finalEvidenceSnapshot.path;
  const externalSnapshotAvailable = fs.existsSync(snapshotRoot);
  if (externalSnapshotAvailable) {
    assert.equal(
      sha256Absolute(path.join(snapshotRoot, "manifest.json")),
      manifest.finalEvidenceSnapshot.manifestSha256,
    );
    assert.equal(
      sha256Absolute(
        path.join(snapshotRoot, manifest.finalEvidenceSnapshot.checksumFile),
      ),
      manifest.finalEvidenceSnapshot.checksumFileSha256,
    );
  }

  for (const slug of slugs) {
    const blend = `assets/models/source/nonbuilding/${packageSlug}/${slug}.blend`;
    const glb = `public/models/nonbuilding/${packageSlug}/${slug}-visible-low.glb`;
    const recordPath =
      `docs/research/build-records/nonbuilding/${packageSlug}/${slug}-visible-low.json`;
    const record = readJson(recordPath);
    assert.ok(fs.statSync(path.join(root, blend)).size > 0);
    assert.ok(fs.statSync(path.join(root, glb)).size > 0);
    assert.equal(record.outputs.blend, blend);
    assert.equal(record.outputs.glb, glb);
    assert.equal(record.outputs.blendSha256, sha256(blend));
    assert.equal(record.glb.sha256, sha256(glb));
    assert.equal(
      record.status,
      "blender-glb-and-isolated-runtime-qa-passed",
    );
    assert.equal(record.glb.nodes, 1);
    assert.equal(record.glb.meshes, 1);
    assert.equal(record.glb.images, 0);
    assert.equal(record.glb.textures, 0);
    assert.equal(record.glb.animations, 0);
    assert.equal(record.glb.skins, 0);
    assert.deepEqual(record.glb.transformedNodes, []);
    assert.ok(record.glb.triangles <= record.budget.maxTriangles);
    assert.ok(record.glb.materials <= record.budget.maxMaterials);
    assert.ok(record.glb.bytes <= record.budget.maxBinaryBytes);
    assert.equal(record.source.evidenceSnapshot, "2026-07-28-2ca6310");
    assert.equal(record.source.immutable, true);
    assert.equal(record.texturePolicy, "shared-flat-materials-zero-images-zero-textures");
    for (const view of ["canonical", "side", "detail"]) {
      const preview = record.outputs.previews[view];
      const recordedSha = record.outputs.previews[`${view}Sha256`];
      assert.match(recordedSha, /^[a-f0-9]{64}$/);
      if (externalSnapshotAvailable) {
        const archivedPreview = path.join(snapshotRoot, "repository", preview);
        assert.ok(fs.statSync(archivedPreview).size > 0);
        assert.equal(recordedSha, sha256Absolute(archivedPreview));
      }
    }
    for (const view of ["runtime", "triptych"]) {
      const preview = record.outputs.previews[view];
      const recordedSha = record.outputs.previews[`${view}Sha256`];
      assert.match(recordedSha, /^[a-f0-9]{64}$/);
      if (externalSnapshotAvailable) {
        const archivedPreview = path.join(snapshotRoot, "repository", preview);
        assert.ok(fs.statSync(archivedPreview).size > 0);
        assert.equal(recordedSha, sha256Absolute(archivedPreview));
      }
    }
    assert.equal(record.gates.visual, "passed-three-way-comparison");
    assert.equal(record.gates.runtime, "passed-isolated-qa");
    assert.equal(record.runtimeGate.renderReady, true);
    assert.equal(record.runtimeGate.state, "visible-low");
    assert.equal(record.runtimeGate.consoleErrorCount, 0);
    assert.equal(record.runtimeGate.performanceClaim, "none-local-warm-cache-only");
  }
});

test("隔离 WebGL QA 正确执行米制缩放、墙面锚点和逐资产隐藏距离", () => {
  const qa = read("app/meshy-street-assets-qa/MeshyStreetAssetsQa.tsx");
  assert.match(qa, /MODEL_SCALE = 1 \/ METERS_PER_SCENE_UNIT/);
  assert.match(qa, /scale=\{MODEL_SCALE\}/);
  assert.match(qa, /mountHeightMeters/);
  assert.match(qa, /distanceMeters < asset\.hideDistanceMeters/);
  assert.match(qa, /data-qa-render-ready=/);
  assert.match(qa, /data-qa-model-scale=\{MODEL_SCALE\}/);
  for (const slug of slugs) assert.match(qa, new RegExp(slug));

  const productionWorld = read("app/scene/xinhua-world.tsx");
  assert.doesNotMatch(productionWorld, new RegExp(packageSlug));
  for (const slug of slugs) {
    assert.doesNotMatch(productionWorld, new RegExp(slug));
  }
});

test("生成器冻结 Meshy 源 SHA，并对脆弱类别走可重复重建", () => {
  const generator = read("scripts/create_meshy_agent_street_asset_models.py");
  assert.match(generator, /sourceSha256/);
  assert.match(generator, /Meshy Remesh failed twice/);
  assert.match(generator, /meshy-silhouette-guided-deterministic-rebuild/);
  assert.match(generator, /parser\.add_argument\("--asset"/);
  assert.match(generator, /"--source-root"/);
  assert.match(
    generator,
    /2026-07-28-meshy-agent-street-assets-final-2ca6310/,
  );
  assert.match(generator, /def resolve_source_dir/);
  assert.match(generator, /import_source\(asset_data, source_dir\)/);
  for (const slug of slugs) assert.match(generator, new RegExp(slug));
});
