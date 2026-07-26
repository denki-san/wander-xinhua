import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(
  root,
  "docs/research/building-pipeline-fast-mode.json",
);

const EXPECTED_REMAINING_BUILDING_IDS = [
  "shanghai-cinema",
  "xinhua-villas-211",
  "xinhua-villas-329",
  "shanghai-orchestra",
  "xinhua-community-center",
  "debi-fahua-525",
  "fahua-heritage",
  "fics-xinhua-365",
  "xingfuli-west",
  "xingfuli-east",
];

const EXPECTED_COMPLETED_BUILDING_IDS = [
  "film-art-center",
  "one-step-garden",
  "house-315",
  "villa-le-bec",
  "hudec-memorial",
  "xinhua-pocket-park",
  "xingfuli-center",
  "sun-ke-villa",
];

const EXPECTED_HOLD_ASSET_IDS = [
  "plane-tree",
  "campus-tree",
  "huashan-tree",
  "lane-lamp",
  "cantilever-umbrella",
  "outdoor-dining",
  "slatted-bench",
  "street-planter",
  "stone-bollard",
  "mixed-paving",
  "ground-cover",
  "navy-club-pool",
  "trash-bin",
];

async function readManifest() {
  return JSON.parse(await readFile(manifestPath, "utf8"));
}

test("Fast Mode 严格锁定剩余10栋并排除已完成与 Hold 资产", async () => {
  const manifest = await readManifest();
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.scopeCount, 10);
  assert.equal(manifest.maxParallelBuildings, 3);
  assert.equal(manifest.buildings.length, 10);
  assert.equal(manifest.completedBuildingIds.length, 8);

  assert.deepEqual(
    manifest.buildings.map(({ id }) => id).sort(),
    [...EXPECTED_REMAINING_BUILDING_IDS].sort(),
  );
  assert.deepEqual(
    [...manifest.completedBuildingIds].sort(),
    [...EXPECTED_COMPLETED_BUILDING_IDS].sort(),
  );
  assert.deepEqual(
    [...manifest.holdAssetIds].sort(),
    [...EXPECTED_HOLD_ASSET_IDS].sort(),
  );
});

test("Manifest 只引用当前 main 真实存在的基线测试和 GLB", async () => {
  const manifest = await readManifest();
  for (const building of manifest.buildings) {
    assert.ok(building.tests.length > 0, `${building.id} 缺少基线测试`);
    assert.ok(building.glbs.length > 0, `${building.id} 缺少基线 GLB`);
    assert.ok(building.runtimeRoutes.length > 0, `${building.id} 缺少真实入口`);
    for (const relativePath of [...building.tests, ...building.glbs]) {
      await access(path.join(root, relativePath));
    }
    for (const route of building.runtimeRoutes) {
      assert.match(route, /[?&]start=/);
      assert.match(route, /[?&]qaAutoStart=1/);
      assert.match(route, /[?&]cameraQa=1/);
    }
  }
});

test("单栋计划不触发全仓回归，--full 只追加一次 test 和 lint", () => {
  const fastPlan = spawnSync(
    process.execPath,
    ["scripts/run_building_fast_mode.mjs", "--building", "shanghai-cinema", "--plan"],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(fastPlan.status, 0, fastPlan.stderr);
  assert.match(fastPlan.stdout, /test_xinhua_road_models/);
  assert.match(fastPlan.stdout, /audit_glb\.py/);
  assert.doesNotMatch(fastPlan.stdout, /批次项目级完整回归/);

  const fullPlan = spawnSync(
    process.execPath,
    [
      "scripts/run_building_fast_mode.mjs",
      "--batch",
      "shanghai-cinema,xinhua-villas-211,xinhua-villas-329",
      "--full",
      "--plan",
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(fullPlan.status, 0, fullPlan.stderr);
  assert.match(fullPlan.stdout, /批次项目级完整回归/);
  assert.equal((fullPlan.stdout.match(/npm test/g) ?? []).length, 1);
  assert.equal((fullPlan.stdout.match(/npm run lint/g) ?? []).length, 1);
});

test("Fast Mode 拒绝第四栋、已完成建筑和范围外资产", () => {
  const tooMany = spawnSync(
    process.execPath,
    [
      "scripts/run_building_fast_mode.mjs",
      "--batch",
      "shanghai-cinema,xinhua-villas-211,xinhua-villas-329,shanghai-orchestra",
      "--plan",
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.notEqual(tooMany.status, 0);
  assert.match(tooMany.stderr, /一次最多选择 3 栋/);

  for (const excludedId of ["film-art-center", "plane-tree"]) {
    const result = spawnSync(
      process.execPath,
      ["scripts/run_building_fast_mode.mjs", "--building", excludedId, "--plan"],
      { cwd: root, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /不在剩余 10 栋白名单/);
  }
});

test("坐标轴合同覆盖 raw GLTF、renderer 和 registry 完整链", async () => {
  const workflow = await readFile(
    path.join(root, "docs/research/blender-ai-workflow.md"),
    "utf8",
  );
  assert.match(
    workflow,
    /Blender source → raw GLTF → renderer primitive transform → registry world/,
  );
  assert.match(workflow, /Blender Y = binding runtime Z/);
  assert.match(workflow, /POSITION accessor/);
  assert.match(workflow, /entranceCenterWorld/);
  assert.match(workflow, /实际使用的 renderer primitive transform/);
  assert.match(workflow, /自定义 loader 或没有 Z 翻转的资产/);
});

test("QA 自动进入只在显式参数下生效，默认 intro 不改变", async () => {
  const source = await readFile(
    path.join(root, "app/xinhua-experience.tsx"),
    "utf8",
  );
  assert.match(source, /useState<"intro" \| "overview" \| "explore">\("intro"\)/);
  assert.match(source, /get\("qaAutoStart"\) === "1"/);
  assert.match(
    source,
    /if \(!qaAutoStart \|\| !ready \|\| mode !== "intro" \|\| qaAutoStarted\.current\) return;/,
  );
  assert.match(source, /data-qa-auto-start=/);
});
