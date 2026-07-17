import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const sceneSource = await readFile(new URL("app/scene/xinhua-road-landmarks.tsx", root), "utf8");
const generatorSource = await readFile(new URL("scripts/create_requested_poi_models.py", root), "utf8");
const briefSource = await readFile(new URL("docs/research/requested-poi-model-brief.md", root), "utf8");
const data = JSON.parse(await readFile(new URL("app/scene/xinhua-road-landmarks-data.json", root), "utf8"));

const requestedAssets = {
  "hudec-memorial": { bytes: 500_000, materials: 12 },
  "xinhua-pocket-park": { bytes: 300_000, materials: 10 },
  "xinhua-community-center": { bytes: 280_000, materials: 11 },
  "debi-fahua-525": { bytes: 850_000, materials: 12 },
  "fahua-heritage": { bytes: 500_000, materials: 7 },
  "fics-xinhua-365": { bytes: 2_400_000, materials: 30 },
};

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF", "文件必须是有效的 GLB");
  assert.equal(buffer.readUInt32LE(4), 2, "GLB 必须使用 glTF 2.0");
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim());
}

function containsPoint(obstacle, x, z) {
  return x >= obstacle.minX
    && x <= obstacle.maxX
    && z >= obstacle.minZ
    && z <= obstacle.maxZ;
}

test("本轮 6 个模型均保留 GLB、可编辑 Blend 和固定机位预览", async () => {
  for (const [slug, threshold] of Object.entries(requestedAssets)) {
    const glbUrl = new URL(`public/models/requested-pois/${slug}.glb`, root);
    const blendUrl = new URL(`assets/models/source/requested-pois/${slug}.blend`, root);
    const previewUrl = new URL(`test_artifacts/test_${slug}_preview.png`, root);
    const [glbStats, blendStats, previewStats, buffer] = await Promise.all([
      stat(glbUrl),
      stat(blendUrl),
      stat(previewUrl),
      readFile(glbUrl),
    ]);
    assert.ok(glbStats.size >= threshold.bytes, `${slug} 不得退化为简陋占位模型`);
    assert.ok(blendStats.size > 500_000, `${slug} 必须保留可编辑 Blender 源文件`);
    assert.ok(previewStats.size > 20_000, `${slug} 必须保留固定机位预览`);
    const glb = parseGlb(buffer);
    assert.equal(glb.nodes?.length, 1, `${slug} 应只有一个运行时节点`);
    assert.equal(glb.meshes?.length, 1, `${slug} 应合并为一个运行时网格`);
    assert.ok((glb.materials?.length ?? 0) >= threshold.materials, `${slug} 材质分层不足`);
    assert.equal(glb.images, undefined, `${slug} 不得嵌入参考照片`);
    assert.equal(glb.textures, undefined, `${slug} 不得依赖照片贴图`);
  }
});

test("五组用户指定地点均成为 POI，并保留六个独立可识别模型", () => {
  const requested = data.landmarks.filter(({ poi }) => poi);
  assert.deepEqual(
    requested.map(({ name }) => name).sort(),
    ["FICS新华365", "德必法华525", "新华·社区营造中心", "新华路口袋公园", "法华遗韵", "邬达克纪念馆"].sort(),
  );
  for (const landmark of requested) {
    assert.match(landmark.model, /^\/models\/requested-pois\/.+\.glb$/);
    assert.ok(landmark.labelHeight > 4, `${landmark.name} 必须有独立 POI 标签高度`);
    assert.ok(landmark.positioning, `${landmark.name} 必须记录落位证据`);
    assert.ok(landmark.localObstacles.length >= 2, `${landmark.name} 必须使用拆分碰撞`);
  }
  const fics = requested.find(({ id }) => id === "fics-xinhua-365");
  assert.deepEqual(fics.aliases, ["xinhua365"]);
  assert.equal(fics.localObstacles.length, 6, "FICS 应按多栋建筑拆分碰撞");
  assert.deepEqual(fics.labelOffset, [10, -2], "FICS 标签必须避开相邻社区中心标签");
  const debi = requested.find(({ id }) => id === "debi-fahua-525");
  assert.equal(debi.cacheVersion, "20260717-3", "重导出的德必模型必须主动刷新浏览器缓存");
  for (const id of ["xinhua-pocket-park", "fahua-heritage", "fics-xinhua-365"]) {
    const landmark = requested.find((candidate) => candidate.id === id);
    assert.equal(landmark.cacheVersion, "20260717-roadfix-1", `${id} 必须刷新道路修复后的模型缓存`);
  }
});

test("口袋公园与园区广场保持可步行，法华遗韵中央说明板参与碰撞", () => {
  const pocket = data.landmarks.find(({ id }) => id === "xinhua-pocket-park");
  assert.ok(pocket.localObstacles.every((obstacle) => !containsPoint(obstacle, 0, 0)));

  const heritage = data.landmarks.find(({ id }) => id === "fahua-heritage");
  assert.ok(
    heritage.localObstacles.some((obstacle) => containsPoint(obstacle, 0, -0.5)),
    "中央历史说明板不是门洞，必须阻挡人物穿模",
  );

  const fics = data.landmarks.find(({ id }) => id === "fics-xinhua-365");
  assert.ok(fics.localObstacles.every((obstacle) => !containsPoint(obstacle, 0, 0)));

  assert.match(sceneSource, /landmark\.localObstacles \?\? \[landmark\.localBounds\]/);
  assert.match(sceneSource, /XINHUA_ROAD_MODEL_FOOTPRINTS/);
  assert.match(generatorSource, /heritage-center-panel/);
});

test("运行时渲染 POI 标签，并兼容原新华公馆直达参数", () => {
  assert.match(sceneSource, /data-poi=\{landmark\.id\}/);
  assert.match(sceneSource, /data-poi-address=\{landmark\.address\}/);
  assert.match(sceneSource, /className="map-road-label map-landmark-label"/);
  assert.doesNotMatch(sceneSource, /distanceFactor=\{landmark\.labelDistanceFactor/);
  assert.match(sceneSource, /landmark\.cacheVersion/);
  assert.match(sceneSource, /\[query, \.\.\.aliases\]/);
  assert.match(sceneSource, /XINHUA_ROAD_START_PRESETS/);
});

test("建模脚本和基准文档覆盖照片归纳、六个生成器与园区完整性", () => {
  assert.match(generatorSource, /照片只用于人工提炼轮廓、材质和识别构件/);
  for (const builder of [
    "build_hudec_memorial",
    "build_xinhua_pocket_park",
    "build_xinhua_community_center",
    "build_debi_fahua_525",
    "build_fahua_heritage",
    "build_fics_xinhua_365",
  ]) {
    assert.match(generatorSource, new RegExp(`def ${builder}`));
  }
  assert.match(generatorSource, /base\.build_xinhua_mansion\(\)/);
  for (const cue of ["都铎半木构", "连续折面镜墙", "大橘子", "外置折返楼梯", "法华遗韵", "FICS 365"]) {
    assert.match(`${briefSource}\n${generatorSource}`, new RegExp(cue));
  }
  assert.match(briefSource, /requested-pois-osm-20260717-103840\.json/);
  assert.match(briefSource, /不打包进运行时 GLB/);
});
