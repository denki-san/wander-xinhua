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
const stopPolicyPath = path.join(
  root,
  "docs/research/building-pipeline-stop-policy.json",
);

async function readManifest() {
  return JSON.parse(await readFile(manifestPath, "utf8"));
}

async function readStopPolicy() {
  return JSON.parse(await readFile(stopPolicyPath, "utf8"));
}

test("Fast Mode 严格锁定18栋并排除 Hold", async () => {
  const manifest = await readManifest();
  assert.equal(manifest.scopeCount, 18);
  assert.equal(manifest.maxParallelBuildings, 3);
  assert.equal(
    manifest.stopPolicyPath,
    "docs/research/building-pipeline-stop-policy.json",
  );
  assert.equal(manifest.buildings.length, 18);

  const ids = manifest.buildings.map(({ id }) => id);
  assert.equal(new Set(ids).size, 18);
  for (const holdId of manifest.holdAssetIds) {
    assert.equal(ids.includes(holdId), false, `${holdId} 不得进入18栋`);
  }
});

test("证据止损策略严格覆盖18栋并限制两轮救援", async () => {
  const manifest = await readManifest();
  const stopPolicy = await readStopPolicy();
  assert.equal(stopPolicy.scopeCount, 18);
  assert.equal(stopPolicy.limits.localPrimaryPasses, 1);
  assert.equal(stopPolicy.limits.xiaohongshuPasses, 1);
  assert.equal(
    stopPolicy.storage.buildingEvidenceRoot,
    "/Volumes/plugin/3D_Modeling_ThreeJS_Knowledge_Base/wander-xinhua/building-evidence",
  );
  assert.equal(stopPolicy.storage.wikiIngestion, false);
  assert.equal(stopPolicy.buildings.length, 18);

  const manifestIds = manifest.buildings.map(({ id }) => id).sort();
  const policyIds = stopPolicy.buildings.map(({ id }) => id).sort();
  assert.deepEqual(policyIds, manifestIds);
  for (const building of stopPolicy.buildings) {
    assert.equal(building.preserveFiles, true, `${building.id} 必须保留文件`);
    assert.ok(building.attempts.localPrimary <= 1);
    assert.ok(building.attempts.xiaohongshu <= 1);
    if (building.state === "research-only") {
      assert.equal(building.attempts.localPrimary, 1);
      assert.equal(building.attempts.xiaohongshu, 0);
      assert.equal(building.nextAction, "xiaohongshu-once");
      assert.equal(building.allowAssetWork, false);
    }
    if (building.state === "active") {
      assert.equal(building.attempts.localPrimary, 1);
      assert.equal(building.attempts.xiaohongshu, 1);
      assert.equal(building.nextAction, "none");
      assert.equal(building.allowAssetWork, true);
    }
  }
});

test("每栋专项测试和 GLB 路径真实存在", async () => {
  const manifest = await readManifest();
  for (const building of manifest.buildings) {
    assert.ok(building.tests.length > 0, `${building.id} 缺少专项测试`);
    assert.ok(building.glbs.length > 0, `${building.id} 缺少 GLB 审计目标`);
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

test("单栋命令不触发全仓构建，完整回归只由 --full 添加", async () => {
  const fastPlan = spawnSync(
    process.execPath,
    ["scripts/run_building_fast_mode.mjs", "--building", "film-art-center", "--plan"],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(fastPlan.status, 0, fastPlan.stderr);
  assert.match(fastPlan.stdout, /test_film_art_center_quality_tiers/);
  assert.match(fastPlan.stdout, /audit_glb\.py/);
  assert.doesNotMatch(fastPlan.stdout, /批次项目级完整回归/);
  assert.doesNotMatch(fastPlan.stdout, /npm test/);

  const fullPlan = spawnSync(
    process.execPath,
    [
      "scripts/run_building_fast_mode.mjs",
      "--batch",
      "film-art-center,one-step-garden,house-315",
      "--full",
      "--plan",
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(fullPlan.status, 0, fullPlan.stderr);
  assert.match(fullPlan.stdout, /批次项目级完整回归/);
  assert.match(fullPlan.stdout, /npm test/);
  assert.match(fullPlan.stdout, /npm run lint/);
});

test("被阻塞建筑只进入连续证据阶段，不再执行资产检查", () => {
  const stoppedPlan = spawnSync(
    process.execPath,
    [
      "scripts/run_building_fast_mode.mjs",
      "--building",
      "shanghai-cinema",
      "--plan",
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(stoppedPlan.status, 0, stoppedPlan.stderr);
  assert.match(stoppedPlan.stdout, /shanghai-cinema: research-only/);
  assert.match(stoppedPlan.stdout, /xiaohongshu=0\/1/);
  assert.match(stoppedPlan.stdout, /STOP：进入唯一连续小红书证据阶段/);
  assert.match(stoppedPlan.stdout, /本批全部命中止损门/);
  assert.doesNotMatch(stoppedPlan.stdout, /audit_glb\\.py/);
  assert.doesNotMatch(stoppedPlan.stdout, /npm test/);
});

test("Fast Mode 拒绝第四栋和范围外资产", () => {
  const tooMany = spawnSync(
    process.execPath,
    [
      "scripts/run_building_fast_mode.mjs",
      "--batch",
      "film-art-center,one-step-garden,house-315,plane-tree",
      "--plan",
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.notEqual(tooMany.status, 0);
  assert.match(tooMany.stderr, /一次最多选择 3 栋/);

  const hold = spawnSync(
    process.execPath,
    ["scripts/run_building_fast_mode.mjs", "--building", "plane-tree", "--plan"],
    { cwd: root, encoding: "utf8" },
  );
  assert.notEqual(hold.status, 0);
  assert.match(hold.stderr, /不在 18 栋白名单/);
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
