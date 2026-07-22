import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { buildPlaneTreePlacements } from "../app/scene/xinhua-road-placement.mjs";

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
    readFile(new URL("scripts/create_xinhua_road_models.py", root), "utf8"),
    readFile(new URL("app/building-evidence-lab/PlaneTreeViewer.tsx", root), "utf8"),
  ]);
  assert.match(rollout, /替换白名单/);
  assert.match(rollout, /明确排除/);
  assert.match(rollout, /普通庭院树/);
  assert.match(rollout, /银杏/);
  assert.match(rollout, /灌木/);
  assert.doesNotMatch(xingfuli, /function PlaneTree/);
  assert.equal((xingfuli.match(/id: "xingfuli-[^"]+-plane-tree"/g) ?? []).length, 2);
  assert.match(xingfuli, /GARDEN_CELLS/);
  assert.match(xingfuli, /function Planter/);
  assert.match(generator, /def add_garden_tree/);
  assert.match(heroViewer, /xinhua-plane-tree-hero\.glb\?v=3/);
});

test("街景梧桐生成器继承连续根颈并保留三种结构变体", async () => {
  const generator = await readFile(
    new URL("scripts/create_xinhua_road_models.py", root),
    "utf8",
  );
  assert.match(generator, /def create_plane_tree_trunk/);
  assert.match(generator, /def create_plane_tree_buttress/);
  assert.match(generator, /def merge_plane_tree_roots/);
  assert.match(generator, /remesh_voxel_size = 0\.12/);
  assert.match(generator, /bpy\.ops\.object\.voxel_remesh/);
  assert.match(generator, /root_rng = random\.Random\(12011 \+ variant \* 137\)/);
  assert.match(generator, /trunk_lean = \(\(0\.0, 0\.0\), \(0\.24, -0\.09\), \(-0\.2, 0\.12\)\)\[variant\]/);
  assert.match(generator, /plane_tree_family.*root-collar-v2/);
});

test("梧桐实例分配确定、相邻不重复且只初始化矩阵", async () => {
  const [instancesSource, landmarkData] = await Promise.all([
    readFile(new URL("app/scene/plane-tree-instances.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-road-landmarks-data.json", root), "utf8").then(JSON.parse),
  ]);
  const first = buildPlaneTreePlacements(landmarkData.landmarks, []);
  const second = buildPlaneTreePlacements(landmarkData.landmarks, []);
  assert.deepEqual(first, second);
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

test("三个街景 GLB 共享轻量预算并保持无图片策略", async () => {
  let totalBytes = 0;
  for (const slug of ["plane-tree-a", "plane-tree-b", "plane-tree-c"]) {
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
    assert.equal(glb.nodes?.[0]?.extras?.plane_tree_family, "root-collar-v2");
    assert.equal(glb.nodes?.[0]?.extras?.instancing_ready, true);
    for (const suffix of ["preview", "canonical", "side", "root"]) {
      const preview = suffix === "preview"
        ? new URL(`test_artifacts/test_${slug}_preview.png`, root)
        : new URL(`test_artifacts/test_${slug}_${suffix}_preview.png`, root);
      assert.ok((await stat(preview)).size > 10_000);
    }
  }
  assert.ok(totalBytes <= 700_000);
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
