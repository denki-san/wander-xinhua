import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import {
  buildPlaneTreePlacements,
  buildPlaneTreeTrunkObstacles,
  groundedPlaneTreeTranslationY,
  XINHUA_PLANE_TREE_TRUNK_HALF_EXTENT,
} from "../app/scene/xinhua-road-placement.mjs";

const root = new URL("../", import.meta.url);

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim());
}

test("梧桐树替换白名单明确排除其他树种和通用绿化", async () => {
  const [rollout, xingfuli, generator, heroViewer] = await Promise.all([
    readFile(new URL("docs/research/plane-tree-variant-rollout.md", root), "utf8"),
    readFile(new URL("app/scene/xingfuli-block.tsx", root), "utf8"),
    readFile(new URL("scripts/create_xinhua_plane_tree_canopy_v2.py", root), "utf8"),
    readFile(new URL("app/building-evidence-lab/PlaneTreeViewer.tsx", root), "utf8"),
  ]);
  assert.match(rollout, /替换白名单/);
  assert.match(rollout, /明确排除/);
  assert.match(rollout, /普通庭院树/);
  assert.match(rollout, /银杏/);
  assert.match(rollout, /灌木/);
  assert.doesNotMatch(xingfuli, /function PlaneTree/);
  assert.equal((xingfuli.match(/id: "xingfuli-[^"]+-plane-tree"/g) ?? []).length, 3);
  assert.match(xingfuli, /variant: 0[\s\S]*variant: 1[\s\S]*variant: 2/);
  assert.match(xingfuli, /GARDEN_CELLS/);
  assert.match(xingfuli, /StreetPlanter/);
  assert.match(generator, /def add_garden_tree/);
  assert.match(heroViewer, /xinhua-plane-tree-hero\.glb\?v=3/);
});

test("街景梧桐生成器继承连续根颈并保留四 Identity 与三 Massing", async () => {
  const generator = await readFile(
    new URL("scripts/create_xinhua_plane_tree_canopy_v2.py", root),
    "utf8",
  );
  assert.match(generator, /def create_plane_tree_trunk/);
  assert.match(generator, /def create_plane_tree_buttress/);
  assert.match(generator, /def merge_plane_tree_roots/);
  assert.match(generator, /remesh_voxel_size = 0\.16/);
  assert.match(generator, /bpy\.ops\.object\.voxel_remesh/);
  assert.match(generator, /root_rng = random\.Random\(12011 \+ variant \* 137\)/);
  assert.match(generator, /def add_plane_tree_branch_path/);
  assert.match(generator, /def build_plane_tree_massing/);
  assert.match(generator, /plane-tree-d/);
  assert.match(generator, /plane-tree-massing-a/);
  assert.match(generator, /canopy-v2-identity/);
  assert.match(generator, /canopy-v2-massing/);
  assert.match(generator, /tree-leaf-cluster-/);
  assert.match(generator, /subdivisions=1/);
  assert.match(generator, /留下照片中可见的天空孔洞/);
});

test("梧桐实例分配确定、相邻不重复且只初始化矩阵", async () => {
  const [instancesSource, landmarkData] = await Promise.all([
    readFile(new URL("app/scene/plane-tree-instances.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-road-landmarks-data.json", root), "utf8").then(JSON.parse),
  ]);
  const first = buildPlaneTreePlacements(landmarkData.landmarks, []);
  const second = buildPlaneTreePlacements(landmarkData.landmarks, []);
  assert.deepEqual(first, second);
  assert.equal(first.filter(({ id }) => id.includes("-pilot-")).length, 18);
  assert.deepEqual([...new Set(first.map(({ variant }) => variant))].sort(), [0, 1, 2, 3]);
  const previousBySide = new Map();
  for (const placement of first) {
    const side = placement.id.split("-")[2];
    assert.notEqual(placement.variant, previousBySide.get(side));
    previousBySide.set(side, placement.variant);
    assert.equal(placement.scale.length, 3);
    assert.ok(placement.scale.every((value) => value > 0));
  }
  assert.match(instancesSource, /useLayoutEffect/);
  assert.match(instancesSource, /instances\.setMatrixAt/);
  assert.match(instancesSource, /y - PLANE_TREE_GROUND_INSET/);
  assert.doesNotMatch(instancesSource, /useFrame/);
  assert.doesNotMatch(instancesSource, /geometry\.clone/);
  assert.doesNotMatch(instancesSource, /material\.clone/);
});

test("Identity 与 Massing 都按真实最低点贴合地表", async () => {
  const buildRecord = JSON.parse(await readFile(
    new URL("docs/research/build-records/plane-tree-family-canopy-v2.json", root),
    "utf8",
  ));
  for (const asset of [...buildRecord.identity, ...buildRecord.massing]) {
    const minimumY = asset.bounds.min[1];
    for (const scaleY of [0.9, 1, 1.09]) {
      const translationY = groundedPlaneTreeTranslationY(3.25, scaleY, minimumY);
      const groundedMinimum = translationY + minimumY * scaleY;
      assert.ok(Math.abs(groundedMinimum - 3.25) < 1e-9);
    }
  }
});

test("每个新华路梧桐树位只生成树干级玩家碰撞", async () => {
  const landmarkData = await readFile(
    new URL("app/scene/xinhua-road-landmarks-data.json", root),
    "utf8",
  ).then(JSON.parse);
  const placements = buildPlaneTreePlacements(landmarkData.landmarks, []);
  const obstacles = buildPlaneTreeTrunkObstacles(placements);
  assert.equal(obstacles.length, placements.length);
  assert.ok(XINHUA_PLANE_TREE_TRUNK_HALF_EXTENT > 0.3);
  assert.ok(XINHUA_PLANE_TREE_TRUNK_HALF_EXTENT < 0.7);
  placements.forEach(({ position }, index) => {
    const obstacle = obstacles[index];
    assert.ok(position[0] > obstacle.minX && position[0] < obstacle.maxX);
    assert.ok(position[1] > obstacle.minZ && position[1] < obstacle.maxZ);
    assert.ok(obstacle.maxX - obstacle.minX < 1.2);
    assert.ok(obstacle.maxZ - obstacle.minZ < 1.2);
  });
});

test("四个 Identity 与三个 Massing 共享轻量预算并保持无图片策略", async () => {
  let totalBytes = 0;
  for (const slug of ["plane-tree-a", "plane-tree-b", "plane-tree-c", "plane-tree-d"]) {
    const url = new URL(`public/models/xinhua-road/${slug}.glb`, root);
    const [stats, buffer] = await Promise.all([stat(url), readFile(url)]);
    totalBytes += stats.size;
    const glb = parseGlb(buffer);
    assert.ok((glb.nodes?.length ?? 0) <= 1);
    assert.equal(glb.meshes?.length, 1);
    assert.equal(glb.meshes[0].primitives.length, 6);
    assert.equal(glb.materials?.length, 6);
    assert.equal(glb.images, undefined);
    assert.equal(glb.textures, undefined);
    assert.equal(glb.nodes?.[0]?.extras?.plane_tree_family, "canopy-v2-identity");
    assert.equal(glb.nodes?.[0]?.extras?.instancing_ready, true);
    const triangles = glb.meshes[0].primitives.reduce(
      (sum, primitive) => sum + glb.accessors[primitive.indices].count / 3,
      0,
    );
    assert.ok(triangles >= 2_500 && triangles <= 4_500);
    for (const suffix of ["preview", "canonical", "side", "root"]) {
      const preview = suffix === "preview"
        ? new URL(`test_artifacts/test_${slug}_preview.png`, root)
        : new URL(`test_artifacts/test_${slug}_${suffix}_preview.png`, root);
      assert.ok((await stat(preview)).size > 10_000);
    }
  }
  assert.ok(totalBytes > 750_000);
  assert.ok(totalBytes <= 1_200_000);

  for (const slug of [
    "plane-tree-massing-a",
    "plane-tree-massing-b",
    "plane-tree-massing-c",
  ]) {
    const url = new URL(`public/models/xinhua-road/${slug}.glb`, root);
    const [stats, buffer] = await Promise.all([stat(url), readFile(url)]);
    const glb = parseGlb(buffer);
    const triangles = glb.meshes[0].primitives.reduce(
      (sum, primitive) => sum + glb.accessors[primitive.indices].count / 3,
      0,
    );
    assert.ok(stats.size <= 40_000);
    assert.ok(triangles >= 150 && triangles <= 500);
    assert.equal(glb.nodes?.length, 1);
    assert.equal(glb.materials?.length, 3);
    assert.equal(glb.images, undefined);
    assert.equal(glb.textures, undefined);
    assert.equal(glb.nodes?.[0]?.extras?.plane_tree_family, "canopy-v2-massing");
  }
});

test("全览和弱网使用 Massing、标准近景使用四 Identity，Runtime Hero 已退出产品", async () => {
  const [
    landmarks,
    instances,
    world,
    contract,
    assetLibrary,
    assetData,
    brief,
    heroViewer,
    heroStats,
  ] = await Promise.all([
    readFile(new URL("app/scene/xinhua-road-landmarks.tsx", root), "utf8"),
    readFile(new URL("app/scene/plane-tree-instances.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-world.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-road-contract.ts", root), "utf8"),
    readFile(new URL("app/asset-library/AssetLibrary.tsx", root), "utf8"),
    readFile(new URL("app/asset-library/asset-data.ts", root), "utf8"),
    readFile(new URL("docs/research/plane-tree-canopy-v2-model-brief.md", root), "utf8"),
    readFile(new URL("app/building-evidence-lab/PlaneTreeViewer.tsx", root), "utf8"),
    stat(new URL("public/models/building-evidence-lab/xinhua-plane-tree-hero.glb", root)),
  ]);
  assert.ok(heroStats.size > 1_500_000 && heroStats.size < 2_200_000);
  assert.match(heroViewer, /xinhua-plane-tree-hero\.glb\?v=3/);
  assert.doesNotMatch(landmarks, /xinhua-plane-tree-hero\.glb/);
  assert.doesNotMatch(landmarks, /HeroPlaneTree|showHero/);
  assert.doesNotMatch(world, /showHeroTree|showHero=/);
  assert.match(landmarks, /tier="massing"/);
  assert.equal((landmarks.match(/grounding="bounds"/g) ?? []).length, 2);
  assert.match(
    landmarks,
    /detailed=\{loadMode === "explore" && networkProfile !== "weak"\}/,
  );
  assert.match(world, /networkProfile=\{networkProfile\}/);
  assert.match(contract, /XINHUA_PLANE_TREE_TRUNK_OBSTACLES/);
  assert.match(world, /\.\.\.XINHUA_PLANE_TREE_TRUNK_OBSTACLES/);
  assert.match(instances, /PLANE_TREE_MASSING_MODELS/);
  assert.match(instances, /plane-tree-d\.glb\?v=c3cf688014a2/);
  assert.match(assetLibrary, /plane-tree-d\.glb\?v=c3cf688014a2/);
  assert.doesNotMatch(assetLibrary, /xinhua-plane-tree-hero\.glb/);
  assert.match(assetData, /instanceCount: 46/);
  assert.match(assetData, /全览与弱网使用三款 Massing/);
  assert.match(brief, /产品运行时不再请求、渲染或预加载 Hero/);
});

test("构建扫描不会沿外部知识库链接消耗系统资源", async () => {
  const [styles, tsconfig] = await Promise.all([
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("tsconfig.json", root), "utf8").then(JSON.parse),
  ]);
  assert.match(styles, /@import "tailwindcss" source\(none\)/);
  assert.match(styles, /@source "\.\/"/);
  assert.ok(tsconfig.exclude.includes("docs/knowledge-sources"));
  assert.ok(tsconfig.exclude.includes("research/external-xhs"));
});
