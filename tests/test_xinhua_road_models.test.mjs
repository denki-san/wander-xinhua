import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const sceneSource = await readFile(new URL("app/scene/xinhua-road-landmarks.tsx", root), "utf8");
const worldSource = await readFile(new URL("app/scene/xinhua-world.tsx", root), "utf8");
const generatorSource = await readFile(new URL("scripts/create_xinhua_road_models.py", root), "utf8");
const researchSource = await readFile(new URL("docs/research/xinhua-road-landmarks-reference.md", root), "utf8");
const landmarkData = JSON.parse(await readFile(new URL("app/scene/xinhua-road-landmarks-data.json", root), "utf8"));

const assetSlugs = [
  "shanghai-cinema",
  "film-art-center",
  "one-step-garden",
  "xinhua-villas",
  "house-315",
  "villa-le-bec",
  "shanghai-orchestra",
  "xinhua-mansion",
  "plane-tree-a",
  "plane-tree-b",
  "plane-tree-c",
];

const landmarkDetailThresholds = {
  "shanghai-cinema": { bytes: 2_500_000, triangles: 38_000, materials: 12 },
  "film-art-center": { bytes: 950_000, triangles: 14_500, materials: 11 },
  "one-step-garden": { bytes: 1_150_000, triangles: 18_000, materials: 13 },
  "xinhua-villas": { bytes: 1_800_000, triangles: 27_000, materials: 13 },
  "house-315": { bytes: 750_000, triangles: 11_000, materials: 13 },
  "villa-le-bec": { bytes: 1_100_000, triangles: 17_500, materials: 14 },
  "shanghai-orchestra": { bytes: 900_000, triangles: 13_500, materials: 14 },
  "xinhua-mansion": { bytes: 1_100_000, triangles: 16_500, materials: 14 },
};

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF", "文件必须是有效的 GLB 容器");
  assert.equal(buffer.readUInt32LE(4), 2, "GLB 必须使用 glTF 2.0");
  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.readUInt32LE(16);
  assert.equal(jsonType, 0x4e4f534a, "GLB 第一数据块必须是 JSON");
  return JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim());
}

function countTriangles(data) {
  let total = 0;
  for (const mesh of data.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      if (primitive.indices !== undefined) total += (data.accessors?.[primitive.indices]?.count ?? 0) / 3;
    }
  }
  return total;
}

function positionBounds(data) {
  const bounds = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
  };
  for (const mesh of data.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const accessor = data.accessors?.[primitive.attributes?.POSITION];
      assert.ok(accessor?.min && accessor?.max, "POSITION accessor 必须保存边界");
      bounds.minX = Math.min(bounds.minX, accessor.min[0]);
      bounds.maxX = Math.max(bounds.maxX, accessor.max[0]);
      bounds.minZ = Math.min(bounds.minZ, accessor.min[2]);
      bounds.maxZ = Math.max(bounds.maxZ, accessor.max[2]);
    }
  }
  return bounds;
}

function transformedFootprint(landmark) {
  const [positionX, positionZ] = landmark.position;
  const cosine = Math.cos(landmark.yaw);
  const sine = Math.sin(landmark.yaw);
  const worldX = [];
  const worldZ = [];
  for (const localX of [landmark.localBounds.minX, landmark.localBounds.maxX]) {
    for (const sourceZ of [landmark.localBounds.minZ, landmark.localBounds.maxZ]) {
      const localZ = -sourceZ;
      worldX.push(positionX + landmark.scale * (cosine * localX + sine * localZ));
      worldZ.push(positionZ + landmark.scale * (-sine * localX + cosine * localZ));
    }
  }
  return {
    minX: Math.min(...worldX) - landmarkData.collisionMargin,
    maxX: Math.max(...worldX) + landmarkData.collisionMargin,
    minZ: Math.min(...worldZ) - landmarkData.collisionMargin,
    maxZ: Math.max(...worldZ) + landmarkData.collisionMargin,
  };
}

function pointIntersectsObstacle([x, z], obstacle, radius) {
  return x >= obstacle.minX - radius
    && x <= obstacle.maxX + radius
    && z >= obstacle.minZ - radius
    && z <= obstacle.maxZ + radius;
}

test("8 个地标和 3 类梧桐树都有自有 GLB、Blend 源文件和测试预览", async () => {
  for (const slug of assetSlugs) {
    const glbUrl = new URL(`public/models/xinhua-road/${slug}.glb`, root);
    const blendUrl = new URL(`assets/models/source/xinhua-road/${slug}.blend`, root);
    const previewUrl = new URL(`test_artifacts/test_${slug}_preview.png`, root);
    const [glbStats, blendStats, previewStats, glb] = await Promise.all([
      stat(glbUrl),
      stat(blendUrl),
      stat(previewUrl),
      readFile(glbUrl),
    ]);
    assert.ok(glbStats.size > 100_000, `${slug} GLB 不应是简陋占位模型`);
    assert.ok(blendStats.size > 100_000, `${slug} 必须保留可编辑 Blender 源文件`);
    assert.ok(previewStats.size > 10_000, `${slug} 必须有可复核预览图`);
    const data = parseGlb(glb);
    assert.equal(data.meshes?.length, 1, `${slug} 应合并为单运行时网格节点`);
    assert.ok((data.materials?.length ?? 0) >= 5, `${slug} 应保留多材质建筑或树木细节`);
    assert.equal(data.images, undefined, `${slug} 不得把网络照片嵌入运行时模型`);
    assert.equal(data.textures, undefined, `${slug} 不得依赖外部照片贴图`);
  }
});

test("8 个地标达到海军俱乐部级的结构细节下限，而不是简单盒子占位", async () => {
  for (const [slug, threshold] of Object.entries(landmarkDetailThresholds)) {
    const glb = await readFile(new URL(`public/models/xinhua-road/${slug}.glb`, root));
    const data = parseGlb(glb);
    assert.ok(glb.length >= threshold.bytes, `${slug} 的 GLB 体量低于照片细化基线`);
    assert.ok(countTriangles(data) >= threshold.triangles, `${slug} 的有效三角面不足以保留近景构件`);
    assert.ok((data.materials?.length ?? 0) >= threshold.materials, `${slug} 的材质分层不足`);
  }
});

test("地标清单覆盖用户指定的 8 个地点，外国弄堂在 211 弄和 329 弄各实例化一次", () => {
  const requiredNames = [
    "上海影城",
    "上海电影艺术中心",
    "一尺花园",
    "新华别墅 · 211弄",
    "新华别墅 · 329弄",
    "新华路315号住宅",
    "Villa Le Bec",
    "上海民族乐团",
    "新华公馆",
  ];
  const names = new Set(landmarkData.landmarks.map(({ name }) => name));
  const queries = new Set(landmarkData.landmarks.map(({ query }) => query));
  for (const name of requiredNames) assert.ok(names.has(name), `缺少地标：${name}`);
  assert.equal(landmarkData.landmarks.length, 9);
  for (const query of ["cinema", "film-art", "garden179", "villas", "house315", "villa-le-bec", "orchestra", "xinhua365"]) {
    assert.ok(queries.has(query), `缺少快速定位：${query}`);
  }
});

test("梧桐树按 3 个模型变体沿新华路双侧交错排列，并为地标入口留空", () => {
  assert.match(sceneSource, /plane-tree-a\.glb/);
  assert.match(sceneSource, /plane-tree-b\.glb/);
  assert.match(sceneSource, /plane-tree-c\.glb/);
  assert.match(sceneSource, /const cycle:[\s\S]*\[0, 1, 2, 1\]/);
  assert.match(sceneSource, /for \(let side = 0; side < 2;/);
  assert.match(sceneSource, /side \* spacing \* 0\.5/);
  assert.match(sceneSource, /TREE_CLEARANCES/);
  assert.match(sceneSource, /tooCloseToEntrance/);
  assert.match(sceneSource, /InstancedPlaneTreeVariant/);
  assert.match(sceneSource, /instances\.setMatrixAt/);
  assert.match(sceneSource, /scale\.setScalar\(placement\.scale\)/);
  assert.match(sceneSource, /<group scale=\{\[1, 1, -1\]\}>/);
  assert.equal((sceneSource.match(/<InstancedPlaneTreeVariant variant=/g) ?? []).length, 3);
  assert.match(sceneSource, /userData=\{\{ variants: 3, arrangement: "A-B-C-B" \}\}/);
});

test("地标碰撞范围由 GLB 实际边界派生，不再维护会漏穿的手写盒", async () => {
  for (const landmark of landmarkData.landmarks) {
    const glb = parseGlb(await readFile(new URL(`public${landmark.model}`, root)));
    const actual = positionBounds(glb);
    for (const key of ["minX", "maxX", "minZ", "maxZ"]) {
      assert.ok(
        Math.abs(actual[key] - landmark.localBounds[key]) < 0.001,
        `${landmark.id} 的 ${key} 必须与 GLB POSITION 边界同步`,
      );
    }
  }
  assert.match(sceneSource, /function transformedFootprint/);
  assert.match(sceneSource, /XINHUA_ROAD_LANDMARKS\.map\(transformedFootprint\)/);
});

test("所有快速定位的角色和首帧相机都避开全部地标碰撞范围", () => {
  const obstacles = landmarkData.landmarks.map(transformedFootprint);
  for (const landmark of landmarkData.landmarks) {
    const length = Math.hypot(...landmark.forward);
    const camera = [
      landmark.start[0] - landmark.forward[0] / length * 7.4,
      landmark.start[1] - landmark.forward[1] / length * 7.4,
    ];
    for (const obstacle of obstacles) {
      assert.equal(
        pointIntersectsObstacle(landmark.start, obstacle, 0.48),
        false,
        `${landmark.query} 的角色起点不得位于地标碰撞范围内`,
      );
      assert.equal(
        pointIntersectsObstacle(camera, obstacle, 0.25),
        false,
        `${landmark.query} 的首帧相机不得位于地标碰撞范围内`,
      );
    }
  }
});

test("新地标参与渲染、角色碰撞、相机碰撞和快速定位", () => {
  assert.match(worldSource, /<XinhuaRoadPlaneTrees \/>/);
  assert.match(worldSource, /<XinhuaRoadLandmarks \/>/);
  assert.match(worldSource, /\.\.\.XINHUA_ROAD_OBSTACLES/);
  assert.match(worldSource, /\.\.\.XINHUA_ROAD_CAMERA_OBSTACLES/);
  assert.match(worldSource, /XINHUA_ROAD_START_PRESETS\[name\]/);
});

test("生成器与调研文档明确使用照片人工归纳、原创几何和独立建筑造型", () => {
  assert.match(generatorSource, /公开照片只用于判断轮廓、比例、材质与构件/);
  for (const builder of [
    "build_shanghai_cinema",
    "build_film_art_center",
    "build_one_step_garden",
    "build_xinhua_villas",
    "build_house_315",
    "build_villa_le_bec",
    "build_orchestra",
    "build_xinhua_mansion",
    "build_plane_tree",
  ]) assert.match(generatorSource, new RegExp(`def ${builder}`));
  for (const address of ["160 号", "200 号", "179 弄", "211 弄", "329 弄", "315 号", "321 号", "336 号", "365 弄 2 号楼"]) {
    assert.match(researchSource, new RegExp(address));
  }
  assert.match(researchSource, /海军俱乐部级细化清单/);
  assert.match(generatorSource, /XINHUA_FONT_PATH/);
  assert.match(generatorSource, /NotoSansCJK-Regular\.ttc/);
  assert.match(researchSource, /Blender 4\.5 LTS/);
  assert.match(researchSource, /blender --background --python scripts\/create_xinhua_road_models\.py/);
});

test("照片中可确认的建筑名称使用真实网格文字，不再用抽象方块代替", () => {
  assert.match(generatorSource, /def add_text_label/);
  assert.match(generatorSource, /converted\.scale\.x = -1/);
  assert.match(generatorSource, /bpy\.ops\.object\.transform_apply\(location=False, rotation=False, scale=True\)/);
  for (const label of ["上海影城", "上海电影艺术中心", "一尺花园", "新华别墅", "VILLA LE BEC", "上海民族乐团", "新华公馆"]) {
    assert.match(generatorSource, new RegExp(label));
    assert.match(researchSource, new RegExp(label));
  }
  assert.match(researchSource, /315 号住宅：公开参考中未确认固定建筑名/);
});
