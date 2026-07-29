import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  buildPlaneTreePlacements,
  TREE_BUILDING_CLEARANCE,
  XINHUA_PLANE_TREE_MINIMUM_SPACING,
  XINHUA_PLANE_TREE_PILOT,
  XINHUA_PLANE_TREE_SIDE_OFFSETS,
  XINHUA_ROAD_AXIS,
  XINHUA_ROAD_TRANSPARENT_CAMERA_OBSTACLES,
} from "../app/scene/xinhua-road-placement.mjs";

const root = new URL("../", import.meta.url);
const sceneSource = await readFile(new URL("app/scene/xinhua-road-landmarks.tsx", root), "utf8");
const planeTreeInstancesSource = await readFile(new URL("app/scene/plane-tree-instances.tsx", root), "utf8");
const xingfuliSource = await readFile(new URL("app/scene/xingfuli-block.tsx", root), "utf8");
const worldSource = await readFile(new URL("app/scene/xinhua-world.tsx", root), "utf8");
const worldContractSource = await readFile(new URL("app/scene/xinhua-road-contract.ts", root), "utf8");
const generatorSource = await readFile(new URL("scripts/create_xinhua_road_models.py", root), "utf8");
const researchSource = await readFile(new URL("docs/research/xinhua-road-landmarks-reference.md", root), "utf8");
const landmarkData = JSON.parse(await readFile(new URL("app/scene/xinhua-road-landmarks-data.json", root), "utf8"));
const mapData = JSON.parse(await readFile(new URL("app/scene/xinhua-map-data.json", root), "utf8"));

const assetSlugs = [
  "shanghai-cinema",
  "film-art-center",
  "one-step-garden",
  "xinhua-villas-211",
  "xinhua-villas-329",
  "house-315",
  "villa-le-bec",
  "shanghai-orchestra",
  "xinhua-mansion",
  "plane-tree-a",
  "plane-tree-b",
  "plane-tree-c",
  "plane-tree-d",
];

const landmarkDetailThresholds = {
  "shanghai-cinema": {
    bytes: 2_500_000,
    triangles: 38_000,
    materials: 12,
    maxBytes: 6_300_000,
    maxTriangles: 90_000,
    maxNodes: 8,
    maxMaterials: 14,
    maxImages: 0,
  },
  "film-art-center": {
    bytes: 3_000_000,
    triangles: 55_000,
    materials: 14,
    maxBytes: 6_300_000,
    maxTriangles: 90_000,
    maxNodes: 8,
    maxMaterials: 14,
    maxImages: 0,
  },
  "one-step-garden": { bytes: 1_150_000, triangles: 18_000, materials: 13 },
  "xinhua-villas-211": { bytes: 4_000_000, triangles: 60_000, materials: 13 },
  "xinhua-villas-329": { bytes: 1_400_000, triangles: 20_000, materials: 13 },
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

function loadGlb(buffer) {
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return new Promise((resolve, reject) => new GLTFLoader().parse(arrayBuffer, "", resolve, reject));
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
  return transformedLocalFootprint(landmark, landmark.localBounds);
}

function transformedLocalFootprint(landmark, localBounds) {
  const [positionX, positionZ] = landmark.position;
  const cosine = Math.cos(landmark.yaw);
  const sine = Math.sin(landmark.yaw);
  const worldX = [];
  const worldZ = [];
  for (const localX of [localBounds.minX, localBounds.maxX]) {
    for (const sourceZ of [localBounds.minZ, localBounds.maxZ]) {
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

function transformedFootprintCorners(landmark) {
  const [positionX, positionZ] = landmark.position;
  const cosine = Math.cos(landmark.yaw);
  const sine = Math.sin(landmark.yaw);
  const { minX, maxX, minZ, maxZ } = landmark.localBounds;
  return [
    [minX, -minZ],
    [maxX, -minZ],
    [maxX, -maxZ],
    [minX, -maxZ],
  ].map(([localX, localZ]) => [
    positionX + landmark.scale * (cosine * localX + sine * localZ),
    positionZ + landmark.scale * (-sine * localX + cosine * localZ),
  ]);
}

function pointToSegmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(
    1,
    ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz) / lengthSquared,
  ));
  return Math.hypot(
    point[0] - start[0] - ratio * dx,
    point[1] - start[1] - ratio * dz,
  );
}

function orientation(start, end, point) {
  return (end[0] - start[0]) * (point[1] - start[1])
    - (end[1] - start[1]) * (point[0] - start[0]);
}

function pointOnSegment(point, start, end) {
  const epsilon = 1e-9;
  return Math.abs(orientation(start, end, point)) <= epsilon
    && point[0] >= Math.min(start[0], end[0]) - epsilon
    && point[0] <= Math.max(start[0], end[0]) + epsilon
    && point[1] >= Math.min(start[1], end[1]) - epsilon
    && point[1] <= Math.max(start[1], end[1]) + epsilon;
}

function segmentsIntersect(startA, endA, startB, endB) {
  const aStartSide = orientation(startA, endA, startB);
  const aEndSide = orientation(startA, endA, endB);
  const bStartSide = orientation(startB, endB, startA);
  const bEndSide = orientation(startB, endB, endA);
  if (aStartSide * aEndSide < 0 && bStartSide * bEndSide < 0) return true;
  return pointOnSegment(startB, startA, endA)
    || pointOnSegment(endB, startA, endA)
    || pointOnSegment(startA, startB, endB)
    || pointOnSegment(endA, startB, endB);
}

function segmentDistance(startA, endA, startB, endB) {
  if (segmentsIntersect(startA, endA, startB, endB)) return 0;
  return Math.min(
    pointToSegmentDistance(startA, startB, endB),
    pointToSegmentDistance(endA, startB, endB),
    pointToSegmentDistance(startB, startA, endA),
    pointToSegmentDistance(endB, startA, endA),
  );
}

function renderedRoadWidth(highway) {
  const environmentScale = mapData.meta.environmentScale;
  if (highway.startsWith("trunk")) return 2.62 * environmentScale;
  if (highway.startsWith("primary")) return 2.18 * environmentScale;
  if (highway.startsWith("secondary")) return 1.82 * environmentScale;
  if (highway.startsWith("tertiary")) return 1.45 * environmentScale;
  if (highway === "residential") return 0.9 * environmentScale;
  if (highway === "living_street" || highway === "unclassified") return 0.68 * environmentScale;
  return 0.5 * environmentScale;
}

function isSurfaceMotorRoad(road) {
  return !road.tunnel
    && road.layer >= 0
    && /^(trunk|primary|secondary|tertiary|residential|living_street|unclassified)/.test(road.highway);
}

function footprintToRoadDistance(landmark, road) {
  const corners = transformedFootprintCorners(landmark);
  let distance = Number.POSITIVE_INFINITY;
  for (let edgeIndex = 0; edgeIndex < corners.length; edgeIndex += 1) {
    const footprintStart = corners[edgeIndex];
    const footprintEnd = corners[(edgeIndex + 1) % corners.length];
    for (let roadIndex = 1; roadIndex < road.points.length; roadIndex += 1) {
      distance = Math.min(distance, segmentDistance(
        footprintStart,
        footprintEnd,
        road.points[roadIndex - 1],
        road.points[roadIndex],
      ));
    }
  }
  return distance;
}

test("9 个地标和 4 类 Identity 梧桐都有 GLB、Blend 源文件和测试预览", async () => {
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

test("上海影城保留证据驱动的左右侧翼与双侧固定机位", async () => {
  for (const suffix of ["right-side", "left-side"]) {
    const preview = await stat(new URL(
      `test_artifacts/test_shanghai-cinema_${suffix}_preview.png`,
      root,
    ));
    assert.ok(preview.size > 10_000, `上海影城缺少 ${suffix} 固定机位预览`);
  }
  for (const suffix of ["right-side", "left-side"]) {
    const preview = await stat(new URL(
      `test_artifacts/test_shanghai-cinema_runtime_${suffix}_preview.png`,
      root,
    ));
    assert.ok(preview.size > 10_000, `上海影城缺少 ${suffix} Three.js 运行时验收图`);
  }
  assert.match(generatorSource, /side_length = 10\.8/);
  assert.match(generatorSource, /cinema-\{side_name\}-glass-wing/);
  assert.match(generatorSource, /cinema-\{side_name\}-cantilever/);
  assert.match(generatorSource, /cinema-\{side_name\}-terrace-glass/);
  assert.match(generatorSource, /cinema-left-side-planter/);
  assert.match(generatorSource, /cinema-tower-top-frame.*16\.85/);
  assert.match(generatorSource, /for index in range\(37\)/);
});

test("新华两佰保留照片对照机位、运行时截图和正确牌匾朝向", async () => {
  for (const suffix of ["canonical", "side", "street", "runtime"]) {
    const preview = await stat(new URL(
      `test_artifacts/test_film-art-center_${suffix}_preview.png`,
      root,
    ));
    assert.ok(preview.size > 10_000, `新华两佰缺少 ${suffix} 固定机位预览`);
  }
  const runtimePreview = await readFile(new URL(
    "test_artifacts/test_film-art-center_runtime_preview.png",
    root,
  ));
  assert.deepEqual(
    [...runtimePreview.subarray(0, 8)],
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    "新华两佰运行时验收图必须是实际 PNG 文件",
  );
  assert.match(generatorSource, /art_center_name = add_text_label/);
  assert.match(generatorSource, /art_center_name\.scale\.x = -1/);
  assert.match(
    generatorSource,
    /view_layer\.objects\.active = art_center_name[\s\S]*?transform_apply\(location=False, rotation=False, scale=True\)/,
  );
});

test("道路地标在地图常驻 Identity，并在本地游览按实际距离挂载 Hero", () => {
  assert.match(sceneSource, /function useDistanceHeroLandmarkIds/);
  assert.match(sceneSource, /xinhuaRoadDistanceHeroIds/);
  assert.match(sceneSource, /focusPosition: focusPosition\.current/);
  assert.match(sceneSource, /XINHUA_ROAD_HERO_SAMPLE_SECONDS/);
  assert.match(sceneSource, /return xinhuaRoadDistanceHeroIds\(\{/);
  assert.match(sceneSource, /const shouldMountModel = mountedModelIds\.has\(landmark\.id\)/);
  assert.doesNotMatch(sceneSource, /landmarkMatchesPreset|priorityPreset|xinhuaRoadDetailHeroId/);
});

test("上海影城和新华两佰的 build record 与当前 GLB、缓存版本一致", async () => {
  for (const slug of ["shanghai-cinema", "film-art-center"]) {
    const record = JSON.parse(await readFile(
      new URL(`docs/research/build-records/${slug}.json`, root),
      "utf8",
    ));
    const glb = await readFile(new URL(`public/models/xinhua-road/${slug}.glb`, root));
    const data = parseGlb(glb);
    const landmark = landmarkData.landmarks.find(({ id }) => id === slug);
    const comparison = await stat(new URL(record.evidence.comparison, root));

    assert.equal(record.asset, slug);
    assert.equal(record.outputs.sha256, createHash("sha256").update(glb).digest("hex"));
    assert.equal(record.outputs.cacheVersion, landmark.cacheVersion);
    assert.equal(record.metrics.bytes, glb.length);
    assert.equal(record.metrics.nodes, data.nodes?.length ?? 0);
    assert.equal(record.metrics.meshes, data.meshes?.length ?? 0);
    assert.equal(record.metrics.triangles, countTriangles(data));
    assert.equal(record.metrics.materials, data.materials?.length ?? 0);
    assert.equal(record.metrics.images, data.images?.length ?? 0);
    assert.equal(record.metrics.textures, data.textures?.length ?? 0);
    assert.ok(comparison.size > 10_000, `${slug} 缺少三联对照证据`);
    assert.equal(record.validation.glbAudit, "passed");
    if (slug === "film-art-center") {
      assert.equal(
        record.validation.runtimeQa,
        "superseded-pending-current-binary-and-three-tier",
      );
      assert.equal(
        record.validation.independentReview,
        "mcp2-pass",
      );
      assert.equal(record.validation.identityAllowed, true);
    } else {
      assert.equal(record.validation.runtimeQa, "passed");
    }
  }
});

test("9 个地标达到海军俱乐部级的结构细节下限，而不是简单盒子占位", async () => {
  for (const [slug, threshold] of Object.entries(landmarkDetailThresholds)) {
    const glb = await readFile(new URL(`public/models/xinhua-road/${slug}.glb`, root));
    const data = parseGlb(glb);
    assert.ok(glb.length >= threshold.bytes, `${slug} 的 GLB 体量低于照片细化基线`);
    assert.ok(countTriangles(data) >= threshold.triangles, `${slug} 的有效三角面不足以保留近景构件`);
    assert.ok((data.materials?.length ?? 0) >= threshold.materials, `${slug} 的材质分层不足`);
    if (threshold.maxBytes !== undefined) {
      assert.ok(glb.length <= threshold.maxBytes, `${slug} 的 GLB 超出运行时文件预算`);
      assert.ok(countTriangles(data) <= threshold.maxTriangles, `${slug} 的三角面超出运行时预算`);
      assert.ok((data.nodes?.length ?? 0) <= threshold.maxNodes, `${slug} 的节点数超出运行时预算`);
      assert.ok((data.materials?.length ?? 0) <= threshold.maxMaterials, `${slug} 的材质数超出运行时预算`);
      assert.ok((data.images?.length ?? 0) <= threshold.maxImages, `${slug} 不得嵌入参考照片`);
    }
  }
});

test("地标清单覆盖既有地点和本轮新增 POI，211 弄和 329 弄使用不同实景模型", () => {
  const requiredNames = [
    "上海影城",
    "上海电影艺术中心",
    "一尺花园",
    "新华别墅 · 211弄",
    "新华别墅 · 329弄",
    "新华路315号住宅",
    "Villa Le Bec",
    "上海民族乐团",
    "邬达克纪念馆",
    "新华路口袋公园",
    "新华·社区营造中心",
    "德必法华525",
    "法华遗韵",
    "FICS新华365",
  ];
  const names = new Set(landmarkData.landmarks.map(({ name }) => name));
  const queries = new Set(landmarkData.landmarks.map(({ query }) => query));
  for (const name of requiredNames) assert.ok(names.has(name), `缺少地标：${name}`);
  assert.equal(landmarkData.landmarks.length, 14);
  const villas211 = landmarkData.landmarks.find(({ id }) => id === "xinhua-villas-211");
  const villas329 = landmarkData.landmarks.find(({ id }) => id === "xinhua-villas-329");
  assert.notEqual(villas211.model, villas329.model, "211 弄和 329 弄不得复用同一个 GLB");
  assert.notDeepEqual(villas211.localBounds, villas329.localBounds, "两处别墅不得复用同一包络");
  for (const query of [
    "cinema",
    "film-art",
    "garden179",
    "villas",
    "house315",
    "villa-le-bec",
    "orchestra",
    "hudec",
    "pocket-park",
    "community-center",
    "fahua525",
    "fahua-heritage",
    "fics365",
  ]) {
    assert.ok(queries.has(query), `缺少快速定位：${query}`);
  }
  assert.ok(
    landmarkData.landmarks.find(({ id }) => id === "fics-xinhua-365").aliases.includes("xinhua365"),
    "原新华公馆直达参数必须继续定位到完整 FICS 园区",
  );
});

test("地图与房屋使用各自证据锁定比例，不得为退界任意缩放", () => {
  const expectedScales = {
    "xinhua-villas-211": 0.62,
    "xinhua-villas-329": 0.62,
    "house-315": 0.754254,
  };
  for (const [id, expectedScale] of Object.entries(expectedScales)) {
    const landmark = landmarkData.landmarks.find((candidate) => candidate.id === id);
    assert.ok(landmark, `缺少比例锁定地标：${id}`);
    assert.equal(landmark.scale, expectedScale, `${id} 必须保持证据锁定比例`);
  }

  const cinema = landmarkData.landmarks.find(({ id }) => id === "shanghai-cinema");
  assert.equal(cinema.scale, 1, "上海影城应保持经 OSM 包络校准的 1:1 场景比例");
  assert.deepEqual(cinema.start, [101, 112], "上海影城入口应位于自身东北侧观看位，避开幸福里与周边道路 Hero 的迟滞范围");
  assert.deepEqual(cinema.forward, [-0.654, -0.756], "上海影城入口应朝向建筑中心");
  assert.equal(cinema.cameraTargetHeight, 2.8, "上海影城入口镜头应抬高目标点，完整展示主丝带与后塔楼");
  assert.equal(cinema.localObstacles.length, 3, "上海影城碰撞应贴合弧形主体，不能用单一大盒封住入口广场");
  assert.ok(Math.max(...cinema.localObstacles.map(({ maxZ }) => maxZ)) <= 6.2, "上海影城台阶和正门接近区必须保持开放");
  const filmArtCenter = landmarkData.landmarks.find(({ id }) => id === "film-art-center");
  assert.equal(filmArtCenter.scale, 0.5, "新华两佰应使用官方 footprint 与完整 Hero 道路净距共同校准的比例");
  assert.equal(filmArtCenter.collisionEvidence.type, "evidence-footprint");
  assert.equal(filmArtCenter.collisionEvidence.osmWayId, 864505138);
  assert.deepEqual(filmArtCenter.start, [35, 99], "新华两佰首屏应以南侧花园近正视方向保留完整主屋顶与两侧连接体");
  assert.deepEqual(filmArtCenter.forward, [0.4961616451583901, -0.8682301664154038], "新华两佰首屏方向应重新指向官方 footprint 中心");
  assert.equal(filmArtCenter.cameraTargetHeight, 3.6, "新华两佰镜头应抬高以完整展示三层立面和主屋顶");
  assert.equal(filmArtCenter.localObstacles.length, 1, "新华两佰实体碰撞只覆盖官方闭环绑定的历史主楼 footprint");
  assert.ok(
    Math.max(...filmArtCenter.localObstacles.map(({ maxZ }) => maxZ))
      * filmArtCenter.scale <= 3.54,
    "新华两佰正面草坪、路径和入口台阶必须保持开放",
  );
  assert.match(sceneSource, /start, forward, cameraTargetHeight/);
  assert.match(worldSource, /initialStart\.cameraTargetHeight \?\? CAMERA_TARGET_HEIGHT/);
  assert.equal(
    worldSource.match(/scaledSurfaceHeight \+ cameraTargetHeight/g)?.length,
    2,
    "上海影城专属相机目标高度必须覆盖初始化和逐帧 spring-arm 目标点",
  );
});

test("梧桐位置沿新华路双侧避让，315试验段拉开株距且分层加载", () => {
  assert.match(planeTreeInstancesSource, /plane-tree-a\.glb\?v=4c0f78206959/);
  assert.match(planeTreeInstancesSource, /plane-tree-b\.glb\?v=3545665d071e/);
  assert.match(planeTreeInstancesSource, /plane-tree-c\.glb\?v=3fcfc53a959b/);
  assert.match(planeTreeInstancesSource, /plane-tree-d\.glb\?v=e454862756d1/);
  assert.match(planeTreeInstancesSource, /PLANE_TREE_MASSING_MODELS/);
  assert.match(planeTreeInstancesSource, /InstancedPlaneTreeVariant/);
  assert.match(planeTreeInstancesSource, /InstancedPlaneTreePart/);
  assert.match(planeTreeInstancesSource, /sourceMeshes\.map/);
  assert.match(planeTreeInstancesSource, /multiplyMatrices\(placementMatrix, sourceMesh\.matrixWorld\)/);
  assert.match(planeTreeInstancesSource, /instances\.setMatrixAt/);
  assert.match(planeTreeInstancesSource, /scale\.set\(scaleX, scaleY, scaleZ\)/);
  assert.match(planeTreeInstancesSource, /scale=\{\[1, 1, -1\]\}/);
  assert.match(planeTreeInstancesSource, /placementsByVariant\[variant\]\.length > 0/);
  assert.equal((sceneSource.match(/arrangement: "road-oriented-spaced-v5"/g) ?? []).length, 2);
  assert.match(sceneSource, /tier="massing"/);
  assert.match(sceneSource, /if \(!detailed\)/);
  assert.match(sceneSource, /<PlaneTreeInstances/);

  const obstacles = landmarkData.landmarks.map(transformedFootprint);
  const pilotObstacles = landmarkData.landmarks.flatMap((landmark) => (
    (landmark.localObstacles ?? [landmark.localBounds]).map(
      (localObstacle) => transformedLocalFootprint(landmark, localObstacle),
    )
  ));
  const placements = buildPlaneTreePlacements(
    landmarkData.landmarks,
    obstacles,
    pilotObstacles,
  );
  assert.equal(placements.length, 62, "V5 新华路树阵数量必须与资产后台口径一致");
  const pilotPlacements = placements.filter(({ id }) => id.includes("-pilot-"));
  assert.equal(pilotPlacements.length, 11);
  assert.ok(pilotPlacements.length >= XINHUA_PLANE_TREE_PILOT.minimumCount);
  assert.ok(pilotPlacements.length <= XINHUA_PLANE_TREE_PILOT.targetCount);
  assert.deepEqual([...new Set(placements.map(({ variant }) => variant))].sort(), [0, 1, 2, 3]);
  for (const side of [0, 1]) {
    const row = placements.filter(({ id }) => id.startsWith(`plane-tree-${side}-`));
    const { base, jitter } = XINHUA_PLANE_TREE_SIDE_OFFSETS[side];
    for (const placement of row) {
      const offset = Math.min(
        ...XINHUA_ROAD_AXIS.slice(1).map((end, index) => (
          pointToSegmentDistance(placement.position, XINHUA_ROAD_AXIS[index], end)
        )),
      );
      assert.ok(offset >= base - 1e-6);
      assert.ok(offset <= base + jitter + 1e-6);
    }
    for (let left = 0; left < row.length; left += 1) {
      for (let right = left + 1; right < row.length; right += 1) {
        assert.ok(
          Math.hypot(
            row[left].position[0] - row[right].position[0],
            row[left].position[1] - row[right].position[1],
          ) >= XINHUA_PLANE_TREE_MINIMUM_SPACING,
          `${row[left].id} 与 ${row[right].id} 不得重新挤成密排`,
        );
      }
    }
  }
  const previousVariantBySide = new Map();
  for (const placement of placements) {
    const side = placement.id.split("-")[2];
    assert.notEqual(placement.variant, previousVariantBySide.get(side));
    previousVariantBySide.set(side, placement.variant);
    assert.equal(placement.scale.length, 3);
    assert.ok(placement.scale.every((value) => value > 0));
    const activeObstacles = placement.id.includes("-pilot-")
      ? pilotObstacles
      : obstacles;
    for (const obstacle of activeObstacles) {
      assert.equal(
        pointIntersectsObstacle(placement.position, obstacle, TREE_BUILDING_CLEARANCE),
        false,
        `${placement.id} 不得穿入建筑包络`,
      );
    }
    for (const landmark of landmarkData.landmarks) {
      assert.ok(
        Math.hypot(
          placement.position[0] - landmark.start[0],
          placement.position[1] - landmark.start[1],
        ) >= (placement.id.includes("-pilot-") ? 5.4 : 9.2),
        `${placement.id} 不得堵住 ${landmark.query} 入口`,
      );
    }
  }
});

test("梧桐 Identity GLB 可审计，并只在详情运行时恢复", async () => {
  const expectedMaterials = ["梧桐叶中", "梧桐叶浅", "梧桐叶深", "梧桐树皮", "梧桐树皮浅斑", "梧桐树皮深斑"].sort();
  for (const slug of ["plane-tree-a", "plane-tree-b", "plane-tree-c", "plane-tree-d"]) {
    const buffer = await readFile(new URL(`public/models/xinhua-road/${slug}.glb`, root));
    const data = parseGlb(buffer);
    assert.equal(data.meshes[0].primitives.length, 6, `${slug} 必须保留 6 个材质分片`);
    assert.equal(data.materials.length, 6, `${slug} 必须保留树皮、斑痕和树叶材质`);
    const gltf = await loadGlb(buffer);
    gltf.scene.updateMatrixWorld(true);
    const meshes = [];
    gltf.scene.traverse((child) => {
      if (child instanceof Mesh) meshes.push(child);
    });
    assert.equal(meshes.length, 6, `${slug} 经 GLTFLoader 加载后必须得到 6 个运行时 Mesh`);
    assert.deepEqual(meshes.map(({ material }) => material.name).sort(), expectedMaterials);
    for (const mesh of meshes) {
      assert.ok(mesh.geometry.attributes.position, `${slug} 的 ${mesh.material.name} 必须绑定几何`);
      assert.ok(mesh.matrixWorld.elements.every(Number.isFinite), `${slug} 的实例源矩阵必须有效`);
    }
  }
  assert.match(planeTreeInstancesSource, /scene\.traverse\(\(child\) => \{[\s\S]*result\.push\(child\)/);
  assert.match(planeTreeInstancesSource, /vegetation: "xinhua-plane-tree"/);
  assert.match(planeTreeInstancesSource, /season: "summer"/);
  assert.match(planeTreeInstancesSource, /variant,\s*part,\s*instanced: true,/s);
  assert.doesNotMatch(xingfuliSource, /function PlaneTree/);
  assert.equal((xingfuliSource.match(/id: "xingfuli-[^"]+-plane-tree"/g) ?? []).length, 3);
  assert.match(xingfuliSource, /<LightweightXingfuliTrees \/>/);
  assert.match(xingfuliSource, /<ProgressivePlaneTreeInstances/);
  assert.match(xingfuliSource, /identityReady && environmentDetailed && \(/);
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
  assert.match(sceneSource, /landmark\.localObstacles \?\? \[landmark\.localBounds\]/);
  assert.match(sceneSource, /transformedFootprint\(landmark, localObstacle\)/);
});

test("地标碰撞只覆盖实体建筑，不再用庭院或广场的完整包络堵路", () => {
  for (const landmark of landmarkData.landmarks) {
    assert.ok(landmark.localObstacles?.length > 0, `${landmark.id} 必须声明建筑级碰撞`);
    const boundsArea = (landmark.localBounds.maxX - landmark.localBounds.minX)
      * (landmark.localBounds.maxZ - landmark.localBounds.minZ);
    const evidenceTolerance = (
      landmark.collisionEvidence?.type === "evidence-footprint"
        ? landmark.collisionEvidence.maximumWorldOverhangBeyondGlbBounds
          / landmark.scale
        : 0
    );
    for (const obstacle of landmark.localObstacles) {
      assert.ok(obstacle.minX >= landmark.localBounds.minX - evidenceTolerance, `${landmark.id} 碰撞 minX 越界`);
      assert.ok(obstacle.maxX <= landmark.localBounds.maxX + evidenceTolerance, `${landmark.id} 碰撞 maxX 越界`);
      assert.ok(obstacle.minZ >= landmark.localBounds.minZ - evidenceTolerance, `${landmark.id} 碰撞 minZ 越界`);
      assert.ok(obstacle.maxZ <= landmark.localBounds.maxZ + evidenceTolerance, `${landmark.id} 碰撞 maxZ 越界`);
    }
    const xStops = [...new Set(landmark.localObstacles.flatMap(({ minX, maxX }) => [minX, maxX]))]
      .sort((left, right) => left - right);
    let obstacleArea = 0;
    for (let index = 0; index < xStops.length - 1; index += 1) {
      const minX = xStops[index];
      const maxX = xStops[index + 1];
      const intervals = landmark.localObstacles
        .filter((obstacle) => obstacle.minX < maxX && obstacle.maxX > minX)
        .map(({ minZ, maxZ }) => [minZ, maxZ])
        .sort(([left], [right]) => left - right);
      let coveredZ = 0;
      let current;
      for (const interval of intervals) {
        if (!current || interval[0] > current[1]) {
          coveredZ += current ? current[1] - current[0] : 0;
          current = [...interval];
        } else {
          current[1] = Math.max(current[1], interval[1]);
        }
      }
      coveredZ += current ? current[1] - current[0] : 0;
      obstacleArea += (maxX - minX) * coveredZ;
    }
    assert.ok(obstacleArea < boundsArea, `${landmark.id} 碰撞面积必须小于模型完整包络`);
  }
});

test("原有新华路地标退出机动车道路并保留至少 0.75 场景单位净距", () => {
  // 以生产道路宽度核对整个可见模型，而不仅检查碰撞体；门楼允许接近人行道，
  // 但任何模型都不能进入机动车路面，并需保留可辨识的边缘净距。
  const minimumSetback = 1.45 * mapData.meta.environmentScale / 2 + 0.75;
  for (const landmark of landmarkData.landmarks) {
    if (landmark.poi) continue;
    const corners = transformedFootprintCorners(landmark);
    let distance = Number.POSITIVE_INFINITY;
    for (let edgeIndex = 0; edgeIndex < corners.length; edgeIndex += 1) {
      const buildingStart = corners[edgeIndex];
      const buildingEnd = corners[(edgeIndex + 1) % corners.length];
      for (let roadIndex = 1; roadIndex < XINHUA_ROAD_AXIS.length; roadIndex += 1) {
        distance = Math.min(distance, segmentDistance(
          buildingStart,
          buildingEnd,
          XINHUA_ROAD_AXIS[roadIndex - 1],
          XINHUA_ROAD_AXIS[roadIndex],
        ));
      }
    }
    assert.ok(
      distance >= minimumSetback,
      `${landmark.id} 距道路中心仅 ${distance.toFixed(2)}，会压住 ${minimumSetback.toFixed(2)} 的道路及退界`,
    );
  }
});

test("本轮 6 个 POI 都退出整张地图的地面机动车道路", () => {
  const requested = landmarkData.landmarks.filter(({ poi }) => poi);
  const surfaceRoads = mapData.roads.filter(isSurfaceMotorRoad);
  const minimumVisibleClearance = 0.75;
  assert.equal(requested.length, 6);

  for (const landmark of requested) {
    assert.equal(
      landmark.roadSetbackExempt,
      undefined,
      `${landmark.id} 不得再用道路退界豁免绕过检测`,
    );
    let closest = null;
    for (const road of surfaceRoads) {
      const width = renderedRoadWidth(road.highway) * (road.highway.endsWith("_link") ? 0.78 : 1);
      const clearance = footprintToRoadDistance(landmark, road) - width / 2;
      if (!closest || clearance < closest.clearance) closest = { clearance, road };
    }
    assert.ok(
      closest.clearance >= minimumVisibleClearance,
      `${landmark.id} 与 ${closest.road.name || closest.road.osmWayId} 路面仅余 `
        + `${closest.clearance.toFixed(2)}，低于 ${minimumVisibleClearance.toFixed(2)} 的可见退界`,
    );
  }
});

test("所有快速定位角色避开硬碰撞，首帧相机使用独立障碍层", () => {
  const obstacles = landmarkData.landmarks.flatMap((landmark) => (
    (landmark.localObstacles ?? [landmark.localBounds]).map(
      (localObstacle) => transformedLocalFootprint(landmark, localObstacle),
    )
  ));
  for (const landmark of landmarkData.landmarks) {
    for (const obstacle of obstacles) {
      assert.equal(
        pointIntersectsObstacle(landmark.start, obstacle, 0.48),
        false,
        `${landmark.query} 的角色起点不得位于地标碰撞范围内`,
      );
    }
  }
  assert.match(worldSource, /XINHUA_ROAD_CAMERA_OBSTACLES/);
  assert.match(
    worldContractSource,
    /XINHUA_POCKET_PARK_CAMERA_OBSTACLES/,
  );
});

test("新地标参与渲染、角色硬碰撞和快速定位，但摄像机使用独立透明层", () => {
  assert.match(worldSource, /<XinhuaRoadMassing identity=\{showDetailModels\} \/>/);
  assert.match(
    worldSource,
    /<ProgressiveXinhuaRoadFullLayer[\s\S]*?showLabels=\{showDetailLabels\}[\s\S]*?loadMode=\{landmarkLoadMode\}[\s\S]*?focusPosition=\{progressiveFocus\}/,
  );
  assert.match(worldSource, /\.\.\.XINHUA_ROAD_OBSTACLES/);
  assert.match(worldSource, /\.\.\.XINHUA_ROAD_CAMERA_OBSTACLES/);
  assert.deepEqual(XINHUA_ROAD_TRANSPARENT_CAMERA_OBSTACLES, []);
  assert.ok(Object.isFrozen(XINHUA_ROAD_TRANSPARENT_CAMERA_OBSTACLES));
  assert.match(worldSource, /resolvePlanarSpringArm\(/);
  assert.match(worldSource, /WORLD_CAMERA_OBSTACLES,/);
  assert.match(worldSource, /springArm\.blockerId/);
  assert.doesNotMatch(worldSource, /for \(let step = 0; step <= 16; step \+= 1\)/);
  assert.match(worldSource, /XINHUA_ROAD_START_PRESETS\[name\]/);
});

test("生成器与调研文档明确使用照片人工归纳、原创几何和独立建筑造型", () => {
  assert.match(generatorSource, /公开照片只用于判断轮廓、比例、材质与构件/);
  for (const builder of [
    "build_shanghai_cinema",
    "build_film_art_center",
    "build_one_step_garden",
    "build_xinhua_villas_211",
    "build_xinhua_villas_329",
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
  for (const label of ["上海影城", "上海电影艺术中心", "一尺花园", "外国弄堂", "VILLA LE BEC", "上海民族乐团", "新华公馆"]) {
    assert.match(generatorSource, new RegExp(label));
    assert.match(researchSource, new RegExp(label));
  }
  assert.match(researchSource, /315 号住宅：公开参考中未确认固定建筑名/);
});
