import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetIds = ["house-315", "hudec-memorial", "sun-ke-villa"];

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(absolute(relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function sha256(relativePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(absolute(relativePath)))
    .digest("hex");
}

function casePath(assetId, suffix) {
  return `building-engine/cases/${assetId}/${suffix}`;
}

function recordPath(assetId, name) {
  return `docs/research/build-records/building-engine-spike/${assetId}/${name}.json`;
}

function segmentIntersectsExpandedObstacle(openPath, obstacle) {
  const padding = openPath.width * 0.5;
  const slabs = [
    [
      openPath.from[0],
      openPath.to[0] - openPath.from[0],
      obstacle.minX - padding,
      obstacle.maxX + padding,
    ],
    [
      openPath.from[1],
      openPath.to[1] - openPath.from[1],
      obstacle.minY - padding,
      obstacle.maxY + padding,
    ],
  ];
  let lower = 0;
  let upper = 1;
  for (const [origin, delta, minimum, maximum] of slabs) {
    if (Math.abs(delta) < 1e-9) {
      if (origin < minimum || origin > maximum) return false;
      continue;
    }
    const first = (minimum - origin) / delta;
    const second = (maximum - origin) / delta;
    lower = Math.max(lower, Math.min(first, second));
    upper = Math.min(upper, Math.max(first, second));
    if (lower > upper) return false;
  }
  return lower <= upper;
}

test("Spike 与第三栋盲测只声明 garden-villa archetype", () => {
  const schema = readJson("building-engine/schema/building-dsl.schema.json");
  assert.equal(schema.properties.archetype.const, "garden-villa");

  const caseRoot = absolute("building-engine/cases");
  const actualAssets = fs
    .readdirSync(caseRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(actualAssets, assetIds);

  for (const assetId of assetIds) {
    const buildingCase = readJson(casePath(assetId, "building-case.json"));
    const dsl = readJson(casePath(assetId, "building-dsl.json"));
    assert.equal(buildingCase.archetype, "garden-villa");
    assert.equal(dsl.archetype, "garden-villa");
    assert.equal(dsl.assetId, assetId);
  }

  const plan = read("docs/research/xinhua-wander-building-engine-plan.md");
  assert.match(plan, /一个 Archetype、两栋建筑、一个 CLI、三个审核门/);
  assert.match(plan, /`lilong-street`.*不实现/);
  assert.match(plan, /`public-hybrid`.*不实现/);
  assert.match(plan, /后台、数据库、Worker、任务队列/);
  const productionizationPlan = read(
    "docs/research/building-engine-productionization-plan.md",
  );
  assert.match(productionizationPlan, /第三栋.*盲测/);
  assert.match(productionizationPlan, /hudec-memorial/);
});

test("Compiler 保持数据驱动，单一 CLI 覆盖最小 Pipeline", () => {
  const compiler = read("scripts/compile_garden_villa.py");
  const cli = read("scripts/building_engine_spike.mjs");
  assert.doesNotMatch(
    compiler,
    /house-315|hudec-memorial|sun-ke-villa|lilong-street|public-hybrid/,
  );
  assert.match(compiler, /dsl\["massing"\]\["volumes"\]/);
  assert.match(compiler, /dsl\["master"\]\["features"\]/);
  for (const command of ["inspect", "validate", "build", "review", "qa", "status"]) {
    assert.match(cli, new RegExp(`command === "${command}"`));
  }
  assert.match(cli, /assertMassingApproved/);
  assert.match(cli, /validateSandboxRecord/);

  const validation = spawnSync(
    process.execPath,
    ["scripts/building_engine_spike.mjs", "validate", "--asset", "all"],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(validation.status, 0, validation.stderr);
  const reports = JSON.parse(validation.stdout);
  assert.deepEqual(reports.map((report) => report.assetId), assetIds);
  assert.ok(reports.every((report) => report.status === "ok"));
  assert.ok(reports.every((report) => report.unsupported.length === 0));
});

test("三道审核门都绑定当前资产 SHA，未知项没有被抹除", () => {
  for (const assetId of assetIds) {
    const buildingCase = readJson(casePath(assetId, "building-case.json"));
    const evidenceReview = readJson(buildingCase.reviews.evidence);
    assert.equal(evidenceReview.decision, "approved");
    assert.ok(buildingCase.evidenceItems.length >= 3);
    assert.ok(buildingCase.unknowns.length >= 1);

    const massing = readJson(recordPath(assetId, "massing"));
    const master = readJson(recordPath(assetId, "master"));
    const massingReviewPath = buildingCase.reviews.massing.at(-1);
    const finalReviewPath = buildingCase.reviews.final.at(-1);
    const massingReview = readJson(massingReviewPath);
    const finalReview = readJson(finalReviewPath);

    assert.equal(massingReview.decision, "approved");
    assert.equal(massingReview.target.glbSha256, massing.outputs.glb.sha256);
    assert.equal(
      massingReview.target.collisionSha256,
      massing.outputs.collision.sha256,
    );
    assert.equal(finalReview.decision, "approved-spike-with-known-unknowns");
    assert.equal(finalReview.target.glbSha256, master.outputs.glb.sha256);
    assert.equal(
      finalReview.target.collisionSha256,
      master.outputs.collision.sha256,
    );
    assert.equal(
      master.lineage.derivedFromMassing.glbSha256,
      massing.outputs.glb.sha256,
    );
  }
});

test("两级 GLB、Blend、预览与碰撞记录可追溯并通过预算", () => {
  for (const assetId of assetIds) {
    for (const stage of ["massing", "master"]) {
      const record = readJson(recordPath(assetId, stage));
      const dsl = readJson(casePath(assetId, "building-dsl.json"));
      const glb = record.outputs.glb;
      const blend = record.outputs.blend;
      const collision = record.outputs.collision;

      assert.equal(glb.sha256, sha256(glb.path));
      assert.equal(blend.sha256, sha256(blend.path));
      assert.equal(collision.sha256, sha256(collision.path));
      assert.equal(fs.readFileSync(absolute(glb.path), null).subarray(0, 4).toString(), "glTF");
      assert.equal(glb.nodes, 1);
      assert.equal(glb.images, 0);
      assert.equal(glb.textures, 0);
      assert.equal(glb.animations, 0);
      assert.equal(glb.skins, 0);
      assert.deepEqual(glb.transformedNodes, []);
      assert.ok(Math.abs(glb.bounds.min[1]) <= 0.0001);
      assert.ok(glb.nodes <= dsl.budgets[stage].maxNodes);
      assert.ok(glb.triangles <= dsl.budgets[stage].maxTriangles);
      assert.ok(glb.materials <= dsl.budgets[stage].maxMaterials);
      assert.ok(glb.bytes <= dsl.budgets[stage].maxBytes);
      assert.equal(record.outputs.previews.length, 3);
      for (const preview of record.outputs.previews) {
        assert.match(path.basename(preview.path), /^test_/);
        assert.equal(preview.sha256, sha256(preview.path));
      }
    }

    const collision = readJson(
      `public/models/building-engine-spike/${assetId}/${assetId}-collision.json`,
    );
    for (const openPath of collision.requiredOpenPaths) {
      for (const obstacle of collision.obstacles) {
        assert.equal(
          segmentIntersectsExpandedObstacle(openPath, obstacle),
          false,
          `${assetId}:${openPath.id} 与 ${obstacle.id} 重叠`,
        );
      }
    }
  }
});

test("真实 Sandbox 记录、最终三联图与 manifest 全部绑定当前 Master", () => {
  const manifest = readJson("public/models/building-engine-spike/manifest.json");
  assert.deepEqual(Object.keys(manifest.assets).sort(), assetIds);

  for (const assetId of assetIds) {
    const massing = readJson(recordPath(assetId, "massing"));
    const master = readJson(recordPath(assetId, "master"));
    const sandboxMassing = readJson(recordPath(assetId, "sandbox-massing"));
    const sandboxMaster = readJson(recordPath(assetId, "sandbox-master"));
    const runtimeAsset = manifest.assets[assetId];

    assert.equal(runtimeAsset.tiers.massing.sha256, massing.outputs.glb.sha256);
    assert.equal(runtimeAsset.tiers.master.sha256, master.outputs.glb.sha256);
    assert.equal(sandboxMassing.status, "pass");
    assert.equal(sandboxMaster.status, "pass");
    assert.equal(sandboxMaster.glbSha256, master.outputs.glb.sha256);
    assert.equal(
      sandboxMaster.collisionSha256,
      master.outputs.collision.sha256,
    );
    assert.equal(sandboxMaster.buildMode, "production");
    assert.equal(sandboxMaster.pageVisibility, "visible");
    assert.equal(sandboxMaster.consoleErrors, 0);
    assert.equal(sandboxMaster.pageErrors, 0);
    assert.equal(sandboxMaster.modelVisible, true);
    assert.equal(sandboxMaster.groundContact, "pass");
    assert.equal(sandboxMaster.openPathCheck, "pass");
    assert.equal(sandboxMaster.viewport.width, 1280);
    assert.equal(sandboxMaster.viewport.height, 720);
    assert.ok(sandboxMaster.warmupSeconds >= 2);
    assert.ok(sandboxMaster.warmupSeconds <= 10);
    assert.ok(sandboxMaster.sampleDurationSeconds >= 5);
    assert.equal(
      sandboxMaster.performance.claim,
      "raw-sample-only-no-baseline-no-improvement-claim",
    );
    assert.equal(
      sandboxMaster.screenshot.sha256,
      sha256(sandboxMaster.screenshot.path),
    );
    assert.equal(
      sandboxMaster.finalComparison.sha256,
      sha256(sandboxMaster.finalComparison.path),
    );
    assert.deepEqual(
      sandboxMaster.finalComparison.columnsLeftToRight,
      [
        "approved-reference",
        "blender-master-canonical",
        "threejs-master-canonical",
      ],
    );
  }
});

test("Sandbox 保持隔离，正式 world 与生产 registry 未接入 Spike", () => {
  const sandbox = read(
    "app/building-engine-sandbox/BuildingEngineSandbox.tsx",
  );
  assert.match(sandbox, /data-qa-route="building-engine-sandbox"/);
  assert.match(sandbox, /data-qa-render-ready/);
  assert.match(sandbox, /data-qa-ground-contact/);
  assert.match(sandbox, /data-qa-open-path-check/);
  assert.match(sandbox, /MANIFEST_PATH/);

  const productionWorld = read("app/scene/xinhua-world.tsx");
  const productionLandmarks = read("app/scene/xinhua-road-landmarks-data.json");
  assert.doesNotMatch(productionWorld, /building-engine-spike/);
  assert.doesNotMatch(productionLandmarks, /building-engine-spike/);
});
