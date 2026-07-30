import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { Vector3 } from "three";
import {
  buildPlaneTreePlacements,
  buildPlaneTreeTrunkObstacles,
  groundedPlaneTreeTranslationY,
  XINHUA_PLANE_TREE_AXIS_SPACING,
  XINHUA_PLANE_TREE_PILOT,
  XINHUA_PLANE_TREE_PILOT_CANDIDATE_SPACING,
  XINHUA_PLANE_TREE_PILOT_SIDE_PHASE,
  XINHUA_PLANE_TREE_SIDE_OFFSETS,
  XINHUA_PLANE_TREE_SIDE_PHASES,
  XINHUA_ROAD_AXIS,
  XINHUA_PLANE_TREE_TRUNK_HALF_EXTENT,
  PLANE_TREE_INTERSECTION_CLEARANCE,
  PLANE_TREE_ROAD_CONTRACTS,
  PLANE_TREE_STREET_TARGET,
} from "../app/scene/xinhua-road-placement.mjs";
import {
  buildPlaneTreeSpatialIndex,
  PLANE_TREE_IDENTITY_ACTIVE_LIMIT,
  PLANE_TREE_MASSING_ACTIVE_LIMIT,
  queryPlaneTreeSpatialIndex,
  resolvePlaneTreeActiveSets,
} from "../app/scene/plane-tree-spatial-index.mjs";
import {
  XINHUA_ROAD_ASPHALT_WIDTH,
  XINHUA_ROAD_CURB_WIDTH,
  XINHUA_ROAD_SIDEWALK_WIDTH,
  XINHUA_ROAD_VERGE_WIDTH,
} from "../app/scene/road-surface-contract.ts";
import {
  XINHUA_PLANE_TREE_PLACEMENTS,
  XINHUA_ROAD_LANDMARKS,
  XINHUA_ROAD_MODEL_FOOTPRINTS,
  XINHUA_ROAD_OBSTACLES,
  nearbyPlaneTreeTrunkObstacles,
} from "../app/scene/xinhua-road-contract.ts";
import { resolvePolygonMovement } from "../app/scene/world-math.ts";

const root = new URL("../", import.meta.url);

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim());
}

function parseGlbWithBinary(buffer) {
  const glb = parseGlb(buffer);
  const jsonLength = buffer.readUInt32LE(12);
  return { glb, binaryStart: 20 + jsonLength + 8 };
}

function readAccessor(buffer, glb, binaryStart, accessorIndex) {
  const accessor = glb.accessors[accessorIndex];
  const view = glb.bufferViews[accessor.bufferView];
  const componentBytes = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType];
  const start = binaryStart + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = view.byteStride ?? componentBytes * (accessor.type === "VEC3" ? 3 : 1);
  return Array.from({ length: accessor.count }, (_, index) => {
    const offset = start + index * stride;
    if (accessor.type === "VEC3") {
      return [
        buffer.readFloatLE(offset),
        buffer.readFloatLE(offset + 4),
        buffer.readFloatLE(offset + 8),
      ];
    }
    if (accessor.componentType === 5121) return buffer.readUInt8(offset);
    if (accessor.componentType === 5123) return buffer.readUInt16LE(offset);
    return buffer.readUInt32LE(offset);
  });
}

function measureFoliage(buffer) {
  const { glb, binaryStart } = parseGlbWithBinary(buffer);
  const allPoints = [];
  const components = [];
  for (const primitive of glb.meshes[0].primitives) {
    const materialName = glb.materials[primitive.material]?.name ?? "";
    if (!materialName.includes("叶")) continue;
    const points = readAccessor(buffer, glb, binaryStart, primitive.attributes.POSITION);
    const indices = readAccessor(buffer, glb, binaryStart, primitive.indices);
    allPoints.push(...points);

    // Blender 的 flat-shaded 低模球会为三角面复制顶点；先按实际坐标合并，
    // 再检查每个互不连接的叶团包络，避免只相信生成器注释或 extras。
    const keys = points.map((point) => point.map((value) => Math.round(value * 100_000)).join(","));
    const keyIndices = new Map();
    for (const key of keys) {
      if (!keyIndices.has(key)) keyIndices.set(key, keyIndices.size);
    }
    const parents = Array.from({ length: keyIndices.size }, (_, index) => index);
    const find = (index) => parents[index] === index
      ? index
      : (parents[index] = find(parents[index]));
    const union = (left, right) => {
      const leftRoot = find(left);
      const rightRoot = find(right);
      if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot;
    };
    for (let index = 0; index < indices.length; index += 3) {
      const triangle = indices.slice(index, index + 3).map((vertex) => keyIndices.get(keys[vertex]));
      union(triangle[0], triangle[1]);
      union(triangle[1], triangle[2]);
    }
    const grouped = new Map();
    points.forEach((point, index) => {
      const rootIndex = find(keyIndices.get(keys[index]));
      if (!grouped.has(rootIndex)) grouped.set(rootIndex, []);
      grouped.get(rootIndex).push(point);
    });
    for (const componentPoints of grouped.values()) {
      const minimum = [Infinity, Infinity, Infinity];
      const maximum = [-Infinity, -Infinity, -Infinity];
      for (const point of componentPoints) {
        point.forEach((value, axis) => {
          minimum[axis] = Math.min(minimum[axis], value);
          maximum[axis] = Math.max(maximum[axis], value);
        });
      }
      const extents = maximum.map((value, axis) => value - minimum[axis]);
      components.push({
        aspect: Math.max(...extents) / Math.min(...extents),
      });
    }
  }
  const centroid = [0, 1, 2].map(
    (axis) => allPoints.reduce((sum, point) => sum + point[axis], 0) / allPoints.length,
  );
  return { pointCount: allPoints.length, centroid, components };
}

function projectToRoadAxis([x, z], points = XINHUA_ROAD_AXIS) {
  let best = { distance: Infinity, along: 0 };
  let alongBefore = 0;
  for (let index = 1; index < points.length; index += 1) {
    const [startX, startZ] = points[index - 1];
    const [endX, endZ] = points[index];
    const dx = endX - startX;
    const dz = endZ - startZ;
    const length = Math.hypot(dx, dz);
    const ratio = Math.min(1, Math.max(0, (
      (x - startX) * dx + (z - startZ) * dz
    ) / (length * length)));
    const projectedX = startX + dx * ratio;
    const projectedZ = startZ + dz * ratio;
    const distance = Math.hypot(x - projectedX, z - projectedZ);
    if (distance < best.distance) {
      best = { distance, along: alongBefore + length * ratio };
    }
    alongBefore += length;
  }
  return best;
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
  assert.match(generator, /canopy-v4-identity/);
  assert.match(generator, /canopy-v4-massing/);
  assert.match(generator, /tree-leaf-cluster-/);
  assert.match(generator, /subdivisions=1/);
  assert.match(generator, /局部透光孔/);
});

test("梧桐实例分配确定、相邻不重复且只初始化矩阵", async () => {
  const [instancesSource, landmarkData] = await Promise.all([
    readFile(new URL("app/scene/plane-tree-instances.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-road-landmarks-data.json", root), "utf8").then(JSON.parse),
  ]);
  const first = buildPlaneTreePlacements(landmarkData.landmarks, []);
  const second = buildPlaneTreePlacements(landmarkData.landmarks, []);
  assert.deepEqual(first, second);
  assert.equal(first.filter(({ id }) => id.includes("-pilot-")).length, 20);
  assert.deepEqual([...new Set(first.map(({ variant }) => variant))].sort(), [0, 1, 2, 3]);
  const previousBySide = new Map();
  for (const placement of first) {
    const sequence = `${placement.roadId}:${placement.side}`;
    assert.notEqual(placement.variant, previousBySide.get(sequence));
    previousBySide.set(sequence, placement.variant);
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

test("A+B 梧桐扩展严格生成 7 条道路 332 棵，并保留新华路 20 棵试验段", () => {
  assert.equal(XINHUA_PLANE_TREE_AXIS_SPACING, 6);
  assert.equal(XINHUA_PLANE_TREE_PILOT.targetCount, 20);
  assert.equal(XINHUA_PLANE_TREE_PILOT_CANDIDATE_SPACING, 3.6);
  assert.equal(XINHUA_PLANE_TREE_PILOT_SIDE_PHASE, 1.8);
  assert.deepEqual(XINHUA_PLANE_TREE_SIDE_OFFSETS, [
    { base: 5.05, jitter: 0.45 },
    { base: 6.55, jitter: 0.45 },
  ]);
  assert.deepEqual(XINHUA_PLANE_TREE_SIDE_PHASES, [0.5, 0]);
  assert.equal(PLANE_TREE_STREET_TARGET, 332);
  assert.equal(XINHUA_PLANE_TREE_PLACEMENTS.length, 332);
  assert.equal(
    XINHUA_PLANE_TREE_PLACEMENTS.filter(({ id }) => id.includes("-pilot-")).length,
    20,
  );
  assert.deepEqual(
    Object.fromEntries(PLANE_TREE_ROAD_CONTRACTS.map(({ id }) => [
      id,
      XINHUA_PLANE_TREE_PLACEMENTS.filter(({ roadId }) => roadId === id).length,
    ])),
    {
      xinhua: 98,
      panyu: 60,
      anshun: 48,
      "huaihai-west": 32,
      hunan: 18,
      huashan: 56,
      taian: 20,
    },
  );
  assert.equal(
    XINHUA_PLANE_TREE_PLACEMENTS.filter(({ grade }) => grade === "A").length,
    256,
  );
  assert.equal(
    XINHUA_PLANE_TREE_PLACEMENTS.filter(({ grade }) => grade === "B").length,
    76,
  );

  const visibleRoadEdge = (
    XINHUA_ROAD_ASPHALT_WIDTH / 2
    + XINHUA_ROAD_CURB_WIDTH
    + XINHUA_ROAD_SIDEWALK_WIDTH
    + XINHUA_ROAD_VERGE_WIDTH
  );
  const projected = XINHUA_PLANE_TREE_PLACEMENTS.map((placement) => ({
    ...placement,
    road: projectToRoadAxis(
      placement.position,
      PLANE_TREE_ROAD_CONTRACTS.find(({ id }) => id === placement.roadId).points,
    ),
  }));
  for (const placement of projected) {
    const roadContract = PLANE_TREE_ROAD_CONTRACTS.find(
      ({ id }) => id === placement.roadId,
    );
    const baseOffset = roadContract.offsets[placement.side];
    const jitter = placement.roadId === "xinhua" ? 0.45 : 0.28;
    assert.ok(placement.offset >= baseOffset - 1e-9);
    assert.ok(placement.offset <= baseOffset + jitter + 1e-9);
    assert.ok(placement.road.distance <= placement.offset + 1e-9);
    const trunkRadius = XINHUA_PLANE_TREE_TRUNK_HALF_EXTENT
      * Math.max(placement.scale[0], placement.scale[2]);
    if (placement.roadId === "xinhua") {
      assert.ok(
        placement.road.distance - trunkRadius > visibleRoadEdge,
        `${placement.id} 的树干不得进入新华路道路、路缘、人行道或绿化带`,
      );
    }
    const knownApproachClearance = placement.id.includes("-pilot-") ? 5.4 : 9.2;
    assert.ok(XINHUA_ROAD_LANDMARKS.every(({ start }) => (
      Math.hypot(
        placement.position[0] - start[0],
        placement.position[1] - start[1],
      ) >= knownApproachClearance
    )));
    const activeBuildingObstacles = placement.id.includes("-pilot-")
      ? XINHUA_ROAD_OBSTACLES
      : XINHUA_ROAD_MODEL_FOOTPRINTS;
    assert.ok(activeBuildingObstacles.every((obstacle) => !(
      placement.position[0] >= obstacle.minX - 1.4
      && placement.position[0] <= obstacle.maxX + 1.4
      && placement.position[1] >= obstacle.minZ - 1.4
      && placement.position[1] <= obstacle.maxZ + 1.4
    )));
    if (!placement.id.includes("-pilot-")) {
      assert.ok(roadContract.intersections.every(([x, z]) => (
        Math.hypot(placement.position[0] - x, placement.position[1] - z)
          >= PLANE_TREE_INTERSECTION_CLEARANCE
      )));
    }
  }

  const pilotBySide = [0, 1].map((side) => (
    projected
      .filter((placement) => placement.side === side && placement.id.includes("-pilot-"))
      .sort((left, right) => left.road.along - right.road.along)
  ));
  assert.deepEqual(pilotBySide.map((side) => side.length), [12, 8]);
  for (const side of pilotBySide) {
    for (let index = 1; index < side.length; index += 1) {
      assert.ok(
        side[index].road.along - side[index - 1].road.along >= 3.59,
        "试验段同侧树位需保持经过运行时证明的安全节奏",
      );
    }
  }
});

test("332 棵道路梧桐使用空间索引限制近景 Identity、弱网和中景 Massing", () => {
  const placements3d = XINHUA_PLANE_TREE_PLACEMENTS.map((placement) => ({
    ...placement,
    position: [placement.position[0], 0, placement.position[1]],
  }));
  const index = buildPlaneTreeSpatialIndex(placements3d);
  const focus = [
    placements3d[0].position[0],
    placements3d[0].position[2],
  ];
  const overview = resolvePlaneTreeActiveSets({
    index,
    focusPosition: focus,
    loadMode: "overview",
    networkProfile: "standard",
  });
  assert.equal(overview.identity.length, 0);
  assert.equal(overview.massing.length, 332);

  const standard = resolvePlaneTreeActiveSets({
    index,
    focusPosition: focus,
    loadMode: "explore",
    networkProfile: "standard",
  });
  assert.ok(standard.identity.length > 0);
  assert.ok(standard.identity.length <= PLANE_TREE_IDENTITY_ACTIVE_LIMIT);
  assert.ok(standard.massing.length <= PLANE_TREE_MASSING_ACTIVE_LIMIT);
  assert.ok(standard.massing.every(({ id }) => !standard.identityIds.has(id)));

  const weak = resolvePlaneTreeActiveSets({
    index,
    focusPosition: focus,
    loadMode: "explore",
    networkProfile: "weak",
  });
  assert.equal(weak.identity.length, 0);
  assert.ok(weak.massing.length > 0);
  assert.ok(weak.massing.length <= PLANE_TREE_MASSING_ACTIVE_LIMIT);
  assert.ok(queryPlaneTreeSpatialIndex(index, focus, 4).length < 332);
});

test("梧桐 LOD 在 37/42 与 75/82 边界使用迟滞，避免来回抖动", () => {
  const placement = {
    id: "test-tree",
    position: [0, 0, 0],
  };
  const index = buildPlaneTreeSpatialIndex([placement]);

  const identityEntered = resolvePlaneTreeActiveSets({
    index,
    focusPosition: [36, 0],
    loadMode: "explore",
    networkProfile: "standard",
  });
  assert.deepEqual(identityEntered.identity.map(({ id }) => id), ["test-tree"]);
  const identityRetained = resolvePlaneTreeActiveSets({
    index,
    focusPosition: [40, 0],
    loadMode: "explore",
    networkProfile: "standard",
    previous: identityEntered,
  });
  assert.deepEqual(identityRetained.identity.map(({ id }) => id), ["test-tree"]);
  const identityFreshAt40 = resolvePlaneTreeActiveSets({
    index,
    focusPosition: [40, 0],
    loadMode: "explore",
    networkProfile: "standard",
  });
  assert.equal(identityFreshAt40.identity.length, 0);
  const identityExited = resolvePlaneTreeActiveSets({
    index,
    focusPosition: [43, 0],
    loadMode: "explore",
    networkProfile: "standard",
    previous: identityRetained,
  });
  assert.equal(identityExited.identity.length, 0);

  const massingEntered = resolvePlaneTreeActiveSets({
    index,
    focusPosition: [74, 0],
    loadMode: "explore",
    networkProfile: "weak",
  });
  assert.deepEqual(massingEntered.massing.map(({ id }) => id), ["test-tree"]);
  const massingRetained = resolvePlaneTreeActiveSets({
    index,
    focusPosition: [78, 0],
    loadMode: "explore",
    networkProfile: "weak",
    previous: massingEntered,
  });
  assert.deepEqual(massingRetained.massing.map(({ id }) => id), ["test-tree"]);
  const massingFreshAt78 = resolvePlaneTreeActiveSets({
    index,
    focusPosition: [78, 0],
    loadMode: "explore",
    networkProfile: "weak",
  });
  assert.equal(massingFreshAt78.massing.length, 0);
  const massingExited = resolvePlaneTreeActiveSets({
    index,
    focusPosition: [83, 0],
    loadMode: "explore",
    networkProfile: "weak",
    previous: massingRetained,
  });
  assert.equal(massingExited.massing.length, 0);
});

test("V5 build record 固化树位口径且不伪造新的 GLB 版本", async () => {
  const record = JSON.parse(await readFile(
    new URL("docs/research/build-records/plane-tree-placement-v5.json", root),
    "utf8",
  ));
  assert.equal(record.binaryChange, false);
  assert.equal(record.placement.accepted.xinhuaRoadCount, 83);
  assert.deepEqual(record.placement.accepted.sideCounts, [44, 39]);
  assert.deepEqual(record.placement.accepted.pilotSideCounts, [12, 8]);
  assert.equal(record.placement.accepted.visibleRoadEnvelopeHalfWidth, 3.925);
  assert.equal(record.identity.length, 4);
  assert.equal(record.massing.length, 3);
  assert.equal(record.totals.glbBytes, 1019888);
  assert.equal(record.totals.images, 0);
  assert.equal(record.validation.glbAudit, "7/7 passed");
});

test("Identity 与 Massing 都按真实最低点贴合地表", async () => {
  const buildRecord = JSON.parse(await readFile(
    new URL("docs/research/build-records/plane-tree-family-canopy-v4.json", root),
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

test("每个道路梧桐树位只生成树干级玩家碰撞", async () => {
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

test("附近树干空间查询不漏当前树位，并在确定性移动中阻止角色穿树", () => {
  for (const placement of XINHUA_PLANE_TREE_PLACEMENTS) {
    const nearby = nearbyPlaneTreeTrunkObstacles(placement.position, 0.01);
    assert.ok(
      nearby.some((obstacle) => (
        placement.position[0] > obstacle.minX
        && placement.position[0] < obstacle.maxX
        && placement.position[1] > obstacle.minZ
        && placement.position[1] < obstacle.maxZ
      )),
      `${placement.id} 的自身树干不得被空间查询漏掉`,
    );
  }

  const placement = XINHUA_PLANE_TREE_PLACEMENTS[0];
  const [treeX, treeZ] = placement.position;
  const obstacles = nearbyPlaneTreeTrunkObstacles(
    [treeX - 1, treeZ],
    4,
  );
  const treeObstacle = obstacles.find((obstacle) => (
    treeX > obstacle.minX
    && treeX < obstacle.maxX
    && treeZ > obstacle.minZ
    && treeZ < obstacle.maxZ
  ));
  assert.ok(treeObstacle, "玩家附近必须查询到目标树干");
  const playerRadius = 0.48;
  const current = new Vector3(
    treeObstacle.minX - playerRadius - 0.01,
    0,
    treeZ,
  );
  const result = resolvePolygonMovement(
    current,
    new Vector3(0.2, 0, 0),
    [
      [treeX - 10, treeZ - 10],
      [treeX + 10, treeZ - 10],
      [treeX + 10, treeZ + 10],
      [treeX - 10, treeZ + 10],
    ],
    obstacles,
    playerRadius,
  );
  assert.equal(result.x, current.x, "角色向树干移动时不得穿过树干碰撞盒");
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
    assert.equal(glb.nodes?.[0]?.extras?.plane_tree_family, "canopy-v4-identity");
    assert.equal(glb.nodes?.[0]?.extras?.instancing_ready, true);
    const triangles = glb.meshes[0].primitives.reduce(
      (sum, primitive) => sum + glb.accessors[primitive.indices].count / 3,
      0,
    );
    assert.ok(triangles >= 4_000 && triangles <= 4_500);
    const foliage = measureFoliage(buffer);
    assert.equal(foliage.pointCount, 4_200);
    assert.equal(foliage.components.length, 70);
    assert.ok(foliage.components.every(({ aspect }) => aspect <= 1.3));
    // glTF 的 X/Z 对应树冠水平面；质心需围绕树干，而不是统一偏向道路内侧。
    assert.ok(Math.abs(foliage.centroid[0]) <= 0.35);
    assert.ok(Math.abs(foliage.centroid[2]) <= 0.35);
    for (const suffix of ["preview", "canonical", "side", "root"]) {
      const preview = suffix === "preview"
        ? new URL(`test_artifacts/test_${slug}_preview.png`, root)
        : new URL(`test_artifacts/test_${slug}_${suffix}_preview.png`, root);
      assert.ok((await stat(preview)).size > 10_000);
    }
  }
  assert.ok(totalBytes > 650_000);
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
    assert.ok(stats.size <= 60_000);
    assert.ok(triangles >= 250 && triangles <= 900);
    assert.equal(glb.nodes?.length, 1);
    assert.equal(glb.materials?.length, 3);
    assert.equal(glb.images, undefined);
    assert.equal(glb.textures, undefined);
    assert.equal(glb.nodes?.[0]?.extras?.plane_tree_family, "canopy-v4-massing");
    const foliage = measureFoliage(buffer);
    assert.equal(foliage.pointCount, 780);
    assert.ok(Math.abs(foliage.centroid[0]) <= 0.1);
    assert.ok(Math.abs(foliage.centroid[2]) <= 0.1);
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
    readFile(new URL("docs/research/plane-tree-canopy-v4-model-brief.md", root), "utf8"),
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
    /resolvePlaneTreeActiveSets/,
  );
  assert.match(world, /networkProfile=\{networkProfile\}/);
  assert.match(landmarks, /xinhuaPlaneTreeLod/);
  assert.match(contract, /nearbyPlaneTreeTrunkObstacles/);
  assert.match(world, /nearbyPlaneTreeTrunkObstacles/);
  assert.match(instances, /PLANE_TREE_MASSING_MODELS/);
  assert.match(instances, /plane-tree-d\.glb\?v=e454862756d1/);
  assert.match(assetLibrary, /plane-tree-d\.glb\?v=e454862756d1/);
  assert.doesNotMatch(assetLibrary, /xinhua-plane-tree-hero\.glb/);
  assert.match(assetData, /instanceCount: 335/);
  assert.match(assetData, /7 条道路 332 株 \+ 幸福里 3 株/);
  assert.match(brief, /Runtime Hero: 0/);
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
