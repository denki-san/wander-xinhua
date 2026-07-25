import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

const treeIds = ["plane-tree", "campus-tree", "huashan-tree"];
const decorIds = [
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

test("active-18 只统计建筑并完整保留 13 个延期目录资产", async () => {
  const [scope, registry, landmarks, assetSource] = await Promise.all([
    readJson("docs/research/active-asset-scope-31.json"),
    readJson("docs/research/all-models-production-registry.json"),
    readJson("app/scene/xinhua-road-landmarks-data.json"),
    readFile(new URL("app/asset-library/asset-data.ts", root), "utf8"),
  ]);

  const buildingIds = [
    ...landmarks.landmarks.map(({ id }) => id),
    "xingfuli-west",
    "xingfuli-center",
    "xingfuli-east",
    "sun-ke-villa",
  ];
  const deferredIds = [...treeIds, ...decorIds];
  const expectedInventoryIds = [...buildingIds, ...deferredIds];
  const actualIds = scope.assets.map(({ id }) => id);

  assert.equal(landmarks.landmarks.length, 14);
  assert.deepEqual(scope.totals, {
    assets: 18,
    buildings: 18,
    trees: 0,
    decor: 0,
    holdDeferredAssets: 13,
    holdDeferredTrees: 3,
    holdDeferredDecor: 10,
    preservedInventoryRecords: 31,
  });
  assert.equal(actualIds.length, 31);
  assert.equal(new Set(actualIds).size, 31);
  assert.deepEqual(actualIds, expectedInventoryIds);
  assert.deepEqual(registry.scopeContract.activeIds, buildingIds);
  assert.deepEqual(registry.scopeContract.holdDeferredCatalogIds, deferredIds);
  assert.deepEqual(
    scope.assets
      .filter(({ scopeStatus }) => scopeStatus.startsWith("active-"))
      .map(({ id }) => id),
    buildingIds,
  );
  assert.deepEqual(
    scope.assets
      .filter(({ scopeStatus }) => scopeStatus === "hold-deferred")
      .map(({ id }) => id),
    deferredIds,
  );
  assert.deepEqual(scope.activeProgress, {
    denominator: 18,
    completed: 1,
    inProgress: 1,
    queued: 16,
    completedIds: ["sun-ke-villa"],
    inProgressIds: ["shanghai-cinema"],
    queuedRule: "其余 16 栋建筑按迁移矩阵依次执行",
  });
  assert.deepEqual(scope.excludedCatalogAssets, [
    "lighting-v3",
    "rain-summer-wanderer",
  ]);
  assert.ok(!actualIds.includes("lighting-v3"));
  assert.ok(!actualIds.includes("rain-summer-wanderer"));

  for (const id of [...treeIds, ...decorIds, "sun-ke-villa"]) {
    assert.match(assetSource, new RegExp(`id:\\s*[\"']${id}[\"']`));
  }
  assert.match(assetSource, /instanceCount:\s*31/);
  assert.match(assetSource, /instanceCount:\s*29/);
  assert.match(assetSource, /instanceCount:\s*112/);
  assert.equal(
    scope.scopeRule,
    "当前活动范围只统计 18 栋生产建筑；树木与装饰物保留为 hold/deferred，不计入活动完成数，也不把运行时实例数当作模型数",
  );
});

test("保留的 31 条目录记录都有三档迁移决策且现有文件完整保留", async () => {
  const scope = await readJson("docs/research/active-asset-scope-31.json");

  for (const asset of scope.assets) {
    assert.ok(asset.hero?.state, `${asset.id} 缺 Hero 状态`);
    assert.ok(asset.hero?.decision, `${asset.id} 缺 Hero 决策`);
    assert.ok(asset.identity?.state, `${asset.id} 缺 Identity 状态`);
    assert.ok(asset.identity?.decision, `${asset.id} 缺 Identity 决策`);
    assert.ok(asset.massing?.state, `${asset.id} 缺 Massing 状态`);
    assert.ok(asset.massing?.decision, `${asset.id} 缺 Massing 决策`);
    assert.ok(asset.nextGate, `${asset.id} 缺下一质量门`);

    for (const tier of ["hero", "identity", "massing"]) {
      for (const key of ["glb", "blend", "generator"]) {
        const path = asset[tier]?.[key];
        if (path) await access(new URL(path, root));
      }
    }

    if (asset.identity.glb) {
      if (asset.id === "sun-ke-villa") {
        assert.equal(
          asset.identity.state,
          "formal-pass-derived-from-reviewed-hero",
        );
      } else {
        assert.match(
          asset.identity.state,
          /provisional/,
          `${asset.id} 的既有 Identity 缺 provisional 标记`,
        );
      }
    }
  }

  assert.equal(scope.tierRules.identityFeaturePhaseIsNotIdentityGlb, true);
  assert.equal(
    scope.tierRules.identityWithoutCompleteHeroMaster,
    "provisional",
  );
  assert.equal(scope.minimalClosableBatch.assetId, "sun-ke-villa");
  assert.deepEqual(scope.pipelineOrder, [
    "evidence-and-brief",
    "massing-map-calibration",
    "complete-hero-master",
    "derive-identity-from-hero-master",
    "freeze-and-reverify-massing",
    "hero-identity-massing-runtime-acceptance",
  ]);
});

test("hold/backlog 产物仍在且延期 Worktree 只允许收尾时创建", async () => {
  const [scope, registry, plan, identityMapDraft] = await Promise.all([
    readJson("docs/research/active-asset-scope-31.json"),
    readJson("docs/research/all-models-production-registry.json"),
    readFile(new URL("docs/research/all-models-production-plan.md", root), "utf8"),
    readFile(new URL("app/scene/shared-prototype-identity-map.tsx", root), "utf8"),
  ]);

  assert.equal(
    scope.holdBacklog.ordinaryOsmBuildings.status,
    "hold-preserved-no-new-generation",
  );
  assert.equal(
    registry.holdBacklog.creationTiming,
    "after-active-18-buildings-complete-at-closeout",
  );
  assert.match(plan, /现在不创建新的延期 Worktree/);
  assert.match(plan, /不得混入当前 18 栋建筑的\s+活动模型计数/);
  assert.doesNotMatch(identityMapDraft, /import\s+\w+\s+from\s+\(/);

  const ordinaryGlbs = (
    await readdir(new URL("public/models/tiers/osm-ordinary/massing/", root))
  ).filter((name) => name.endsWith(".glb"));
  const ordinaryBlends = (
    await readdir(new URL("assets/models/source/tiers/osm-ordinary/massing/", root))
  ).filter((name) => name.endsWith(".blend"));
  assert.equal(ordinaryGlbs.length, 14);
  assert.equal(ordinaryBlends.length, 14);

  await access(
    new URL("docs/research/osm-ordinary-massing-manifest.json", root),
  );
  await access(
    new URL("docs/research/shangsheng-huashan-massing-manifest.json", root),
  );
  await access(
    new URL("docs/research/facility-prototypes-massing-manifest.json", root),
  );
});
