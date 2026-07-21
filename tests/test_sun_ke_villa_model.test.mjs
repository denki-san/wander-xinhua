import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function fileSize(relativePath) {
  const metadata = await stat(path.join(root, relativePath));
  assert.ok(metadata.isFile(), `${relativePath} 必须是文件`);
  return metadata.size;
}

async function assertPng(relativePath, minimumBytes, expectedSize) {
  const buffer = await readFile(path.join(root, relativePath));
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${relativePath} 必须是真实 PNG`);
  assert.ok(buffer.length > minimumBytes, `${relativePath} 图片异常小`);
  if (expectedSize) {
    assert.deepEqual(
      [buffer.readUInt32BE(16), buffer.readUInt32BE(20)],
      expectedSize,
      `${relativePath} 尺寸异常`,
    );
  }
}

async function parseGlb(relativePath) {
  const buffer = await readFile(path.join(root, relativePath));
  assert.equal(buffer.toString("utf8", 0, 4), "glTF", `${relativePath} 不是 GLB`);
  assert.equal(buffer.readUInt32LE(4), 2, `${relativePath} 必须是 glTF 2.0`);
  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.toString("utf8", 16, 20);
  assert.equal(jsonType, "JSON");
  const json = JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim());
  return { buffer, json };
}

function mergedPositionBounds(json) {
  const positionAccessors = json.meshes.flatMap((mesh) => mesh.primitives.map((primitive) => (
    json.accessors[primitive.attributes.POSITION]
  )));
  assert.ok(positionAccessors.length > 0);
  assert.ok(positionAccessors.every((accessor) => accessor.min?.length === 3 && accessor.max?.length === 3));
  return {
    min: [0, 1, 2].map((axis) => Math.min(...positionAccessors.map((accessor) => accessor.min[axis]))),
    max: [0, 1, 2].map((axis) => Math.max(...positionAccessors.map((accessor) => accessor.max[axis]))),
  };
}

test("孙科别墅研究 Gate 具备三张不同方向的本地真实照片", async () => {
  const manifest = JSON.parse(await readFile(
    path.join(root, "docs/research/sun-ke-villa-reference-manifest.json"),
    "utf8",
  ));
  assert.equal(manifest.subject.osmWayId, 864847877);
  assert.equal(manifest.canonicalComparison, "garden-front");
  assert.equal(manifest.referencePhotos.length, 3);
  assert.equal(new Set(manifest.referencePhotos.map(({ viewDirection }) => viewDirection)).size, 3);
  assert.ok(manifest.referencePhotos.some(({ id }) => id === manifest.canonicalComparison));
  for (const photo of manifest.referencePhotos) {
    assert.match(photo.path, /^docs\/research\/assets\/poi-references\/sun-ke-villa\/[a-z0-9-]+\.jpg$/);
    assert.match(photo.sourcePageUrl, /^https:\/\//);
    assert.match(photo.imageUrl, /^https:\/\//);
    assert.equal(photo.retrievedAt, "2026-07-21");
    assert.match(photo.sha256, /^[a-f0-9]{64}$/);
    assert.ok(await fileSize(photo.path) > 80_000, `${photo.path} 图片异常小`);
  }

  const brief = await readFile(path.join(root, "docs/research/sun-ke-villa-model-brief.md"), "utf8");
  assert.match(brief, /### Canonical comparison view/);
  assert.match(brief, /#### Observed/);
  assert.match(brief, /#### Inferred/);
  assert.match(brief, /#### Unknown/);
  assert.match(brief, /三联尖券门廊/);
  assert.match(brief, /圆角塔楼/);
  assert.match(brief, /北侧山墙门廊/);
  assert.match(brief, /Maximum triangles: `35,000`/);
  assert.match(brief, /Maximum nodes: `2`/);
  assert.match(brief, /Maximum images: `0`/);
});

test("孙科别墅保留确定性生成器、可编辑源和三机位预览", async () => {
  const generatorPath = "scripts/create_sun_ke_villa_model.py";
  const generator = await readFile(path.join(root, generatorPath), "utf8");
  assert.match(generator, /SEED = 864847877/);
  assert.match(generator, /MODEL_X_SCALE = 1\.0225/);
  assert.match(generator, /1 Blender 单位 = 1 场景单位 = 2\.7 米/);
  assert.match(generator, /local -Y/);
  assert.match(generator, /garden-pointed-portal/);
  assert.match(generator, /def add_pointed_portico_recess/);
  assert.match(generator, /_deep-recess/);
  assert.match(generator, /_rear-entry-door/);
  assert.match(generator, /garden-upper-round-window/);
  assert.match(generator, /rounded-east-tower/);
  assert.match(generator, /north-porch-round-entry-arch/);
  assert.match(generator, /reference_images_embedded/);
  assert.doesNotMatch(generator, /bpy\.data\.images\.load/);

  assert.ok(await fileSize("assets/models/source/sun-ke-villa.blend") > 150_000);
  for (const preview of [
    "test_artifacts/test_sun_ke_villa_batch_01_massing_preview.png",
    "test_artifacts/test_sun_ke_villa_batch_02_identity_materials_preview.png",
    "test_artifacts/test_sun_ke_villa_batch_03_site_preview.png",
    "test_artifacts/test_sun_ke_villa_canonical_preview.png",
    "test_artifacts/test_sun_ke_villa_right_front_preview.png",
    "test_artifacts/test_sun_ke_villa_north_entrance_preview.png",
  ]) {
    await assertPng(preview, 300_000, [1080, 760]);
  }
  await assertPng("test_artifacts/test_sun_ke_villa_runtime_preview.png", 80_000, [1767, 851]);
  await assertPng("test_artifacts/test_sun_ke_villa_runtime_overview_preview.png", 80_000, [1767, 851]);
});

test("孙科别墅 GLB 通过结构、尺寸、材质和性能预算", async () => {
  const relativePath = "public/models/shangsheng/sun-ke-villa.glb";
  const { buffer, json } = await parseGlb(relativePath);
  assert.ok(buffer.length > 300_000);
  assert.ok(buffer.length <= 1_500_000, `GLB 超出 1.5MB 预算：${buffer.length}`);
  assert.equal(json.nodes?.length, 1);
  assert.equal(json.meshes?.length, 1);
  assert.equal(json.materials?.length, 8);
  assert.equal(json.images?.length ?? 0, 0);
  assert.equal(json.textures?.length ?? 0, 0);
  assert.equal(json.animations?.length ?? 0, 0);
  assert.equal(json.skins?.length ?? 0, 0);

  const rootNode = json.nodes[0];
  assert.deepEqual(rootNode.translation ?? [0, 0, 0], [0, 0, 0]);
  assert.deepEqual(rootNode.rotation ?? [0, 0, 0, 1], [0, 0, 0, 1]);
  assert.deepEqual(rootNode.scale ?? [1, 1, 1], [1, 1, 1]);
  assert.equal(rootNode.extras?.asset_id, "sun-ke-villa");
  assert.equal(rootNode.extras?.osm_way_id, 864847877);
  assert.equal(rootNode.extras?.reference_images_embedded, false);

  const primitives = json.meshes[0].primitives;
  assert.equal(primitives.length, 8, "每个材质应对应一个合并后的 primitive");
  let triangles = 0;
  for (const primitive of primitives) {
    const accessor = primitive.indices === undefined
      ? json.accessors[primitive.attributes.POSITION]
      : json.accessors[primitive.indices];
    triangles += accessor.count / 3;
  }
  assert.ok(triangles > 3_000, `三角面数量过低，可能丢失身份构件：${triangles}`);
  assert.ok(triangles <= 35_000, `三角面超出预算：${triangles}`);

  const bounds = mergedPositionBounds(json);
  const width = bounds.max[0] - bounds.min[0];
  const height = bounds.max[1] - bounds.min[1];
  const depth = bounds.max[2] - bounds.min[2];
  assert.ok(width <= 7.8316 + 0.36, `模型宽度越出 OSM 檐口预算：${width}`);
  assert.ok(width >= 7.8316 * 0.97, `模型宽度低于 Brief 比例下限：${width}`);
  assert.ok(depth <= 5.5313 + 0.36, `模型进深越出 OSM 檐口预算：${depth}`);
  assert.ok(height > 4.5 && height <= 5.2, `模型高度不在 Brief 预算：${height}`);
  assert.ok(bounds.min[1] >= -0.08, `模型低于地面：${bounds.min[1]}`);

  const landmarks = JSON.parse(await readFile(
    path.join(root, "app/scene/xinhua-landmarks-data.json"),
    "utf8",
  ));
  const building = landmarks.shangshengXinsuo.buildings.find(
    ({ feature }) => feature === "sun-ke-villa",
  );
  assert.ok(building, "场景必须保留孙科别墅 OSM 建筑记录");
  const cosine = Math.cos(building.rotationY);
  const sine = Math.sin(building.rotationY);
  const rotatedCorners = [
    [bounds.min[0], bounds.min[2]],
    [bounds.min[0], bounds.max[2]],
    [bounds.max[0], bounds.min[2]],
    [bounds.max[0], bounds.max[2]],
  ].map(([x, z]) => [
    building.position[0] + cosine * x + sine * z,
    building.position[1] - sine * x + cosine * z,
  ]);
  const rotatedBounds = {
    minX: Math.min(...rotatedCorners.map(([x]) => x)),
    maxX: Math.max(...rotatedCorners.map(([x]) => x)),
    minZ: Math.min(...rotatedCorners.map(([, z]) => z)),
    maxZ: Math.max(...rotatedCorners.map(([, z]) => z)),
  };
  const collision = building.collision[0];
  assert.ok(rotatedBounds.minX >= collision.minX, "模型左侧越出 OSM 碰撞盒");
  assert.ok(rotatedBounds.maxX <= collision.maxX, "模型右侧越出 OSM 碰撞盒");
  assert.ok(rotatedBounds.minZ >= collision.minZ, "模型后侧越出 OSM 碰撞盒");
  assert.ok(rotatedBounds.maxZ <= collision.maxZ, "模型前侧越出 OSM 碰撞盒");
});

test("孙科别墅 GLB 已接入上生新所并保留延迟加载 fallback", async () => {
  const source = await readFile(path.join(root, "app/scene/shangsheng-xinsuo-block.tsx"), "utf8");
  assert.match(source, /function SunKeVillaFallback/);
  assert.match(source, /class SunKeVillaErrorBoundary/);
  assert.match(source, /static getDerivedStateFromError/);
  assert.match(source, /function SunKeVilla/);
  assert.match(source, /useGLTF\("\/models\/shangsheng\/sun-ke-villa\.glb"\)/);
  assert.match(source, /child\.material = sourceWasArray \? replacements : replacements\[0\]/);
  assert.match(source, /<SunKeVillaErrorBoundary key=\{building\.id\} building=\{building\}>/);
  assert.match(source, /fallback=\{<SunKeVillaFallback building=\{building\} \/>\}/);
  assert.match(source, /name="shangsheng-sun-ke-villa"/);
  assert.match(source, /referenceView: "garden-front"/);
  assert.doesNotMatch(source, /useGLTF\.preload\("\/models\/shangsheng\/sun-ke-villa\.glb"\)/);

  const worldSource = await readFile(path.join(root, "app/scene/xinhua-world.tsx"), "utf8");
  assert.match(worldSource, /SHANGSHENG_XINSUO_POSITION\[0\] \+ 50/);
  assert.match(worldSource, /forward: new Vector3\(-0\.56, 0, -0\.83\)\.normalize\(\)/);

  const poiManifest = JSON.parse(await readFile(
    path.join(root, "docs/research/poi-reference-manifest.json"),
    "utf8",
  ));
  const shangsheng = poiManifest.pois.find(({ id }) => id === "shangsheng");
  assert.ok(shangsheng.model.runtimeFiles.includes("public/models/shangsheng/sun-ke-villa.glb"));
  assert.ok(shangsheng.model.sourceFiles.includes("assets/models/source/sun-ke-villa.blend"));
  assert.ok(shangsheng.model.sourceFiles.includes("scripts/create_sun_ke_villa_model.py"));
  assert.equal(
    shangsheng.model.sunKeVillaReferenceManifest,
    "docs/research/sun-ke-villa-reference-manifest.json",
  );
  await access(path.join(root, shangsheng.model.sunKeVillaReferenceManifest));
});
