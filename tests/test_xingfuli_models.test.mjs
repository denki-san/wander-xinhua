import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import {
  XINGFULI_OBSTACLES,
  XINGFULI_QA_PATHS,
  XINGFULI_QA_PLAYER_RADIUS_WORLD,
} from "../app/scene/xingfuli-collision.ts";
import {
  isPlanarPositionBlockedInPolygon,
  transformMapObstacle,
  transformMapPoint,
} from "../app/scene/world-math.ts";

const root = new URL("../", import.meta.url);
const segmentIds = ["west", "center", "east"];

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF", "必须是二进制 glTF");
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
}

function countTriangles(data) {
  return (data.meshes ?? []).reduce((meshTotal, mesh) => (
    meshTotal + mesh.primitives.reduce((primitiveTotal, primitive) => {
      const accessor = primitive.indices === undefined
        ? data.accessors[primitive.attributes.POSITION]
        : data.accessors[primitive.indices];
      return primitiveTotal + accessor.count / 3;
    }, 0)
  ), 0);
}

function mergedBounds(data) {
  const result = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  for (const mesh of data.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      const accessor = data.accessors[primitive.attributes.POSITION];
      assert.ok(accessor.min?.length === 3 && accessor.max?.length === 3);
      for (let axis = 0; axis < 3; axis += 1) {
        result.min[axis] = Math.min(result.min[axis], accessor.min[axis]);
        result.max[axis] = Math.max(result.max[axis], accessor.max[axis]);
      }
    }
  }
  return result;
}

test("幸福里灰模三段 GLB 可审计且没有嵌入参考照片", async () => {
  let totalTriangles = 0;
  let totalBytes = 0;
  for (const segment of segmentIds) {
    const buffer = await readFile(new URL(
      `public/models/xingfuli/xingfuli-${segment}-massing.glb`,
      root,
    ));
    const data = parseGlb(buffer);
    const bounds = mergedBounds(data);
    const triangles = countTriangles(data);
    totalTriangles += triangles;
    totalBytes += buffer.length;
    assert.equal(data.nodes?.length, 1, `${segment} 灰模应合并为一个运行时节点`);
    assert.equal(data.meshes?.length, 1, `${segment} 灰模应合并为一个网格`);
    assert.ok(triangles >= 2_500 && triangles <= 12_000, `${segment} 灰模面数异常`);
    assert.ok((data.materials?.length ?? 0) <= 8, `${segment} 灰模材质超出阶段预算`);
    assert.equal(data.images?.length ?? 0, 0, "不得嵌入参考照片");
    assert.equal(data.textures?.length ?? 0, 0, "灰模不应包含图片贴图");
    assert.ok(bounds.min[1] >= 0.08, `${segment} 灰模不得穿入本地地面`);
  }
  assert.equal(totalTriangles, 11_088);
  assert.equal(totalBytes, 794_476);
});

test("幸福里灰模 build record 与三个当前二进制、缓存版本一致", async () => {
  const record = JSON.parse(await readFile(
    new URL("docs/research/build-records/xingfuli-massing.json", root),
    "utf8",
  ));
  assert.equal(record.asset, "xingfuli-massing");
  assert.equal(record.outputs.cacheVersion, "1");
  for (const output of record.outputs.segments) {
    const buffer = await readFile(new URL(output.glb, root));
    assert.equal(output.sha256, createHash("sha256").update(buffer).digest("hex"));
    await stat(new URL(output.blend, root));
  }
  for (const evidencePath of [record.evidence.comparison, record.evidence.runtimeScreenshot]) {
    const image = await readFile(new URL(evidencePath, root));
    assert.deepEqual(
      [...image.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
      `${evidencePath} 必须是真实 PNG`,
    );
    assert.ok(image.readUInt32BE(16) >= 1_900, `${evidencePath} 宽度不足`);
    assert.ok(image.readUInt32BE(20) >= 480, `${evidencePath} 高度不足`);
  }
  assert.equal(record.validation.grayboxRuntimeGate, "passed");
  assert.equal(record.validation.glbAudit, "passed");
  assert.equal(record.runtimeGate.path, "/?start=xingfuli-canonical");
});

test("幸福里 identity 三段 GLB 与 build record 可复现且证据完整", async () => {
  let totalTriangles = 0;
  let totalBytes = 0;
  const record = JSON.parse(await readFile(
    new URL("docs/research/build-records/xingfuli-identity.json", root),
    "utf8",
  ));
  assert.equal(record.asset, "xingfuli-identity");
  assert.equal(record.outputs.cacheVersion, "1");
  for (const output of record.outputs.segments) {
    const buffer = await readFile(new URL(output.glb, root));
    const data = parseGlb(buffer);
    const triangles = countTriangles(data);
    totalTriangles += triangles;
    totalBytes += buffer.length;
    assert.equal(data.nodes?.length, 1, `${output.id} identity 应合并为一个节点`);
    assert.equal(data.meshes?.length, 1, `${output.id} identity 应合并为一个网格`);
    assert.ok(triangles >= 3_900 && triangles <= 7_000, `${output.id} identity 面数异常`);
    assert.ok((data.materials?.length ?? 0) <= 8, `${output.id} identity 材质超出预算`);
    assert.equal(data.images?.length ?? 0, 0, "identity 不得嵌入参考照片");
    assert.equal(data.textures?.length ?? 0, 0, "identity 不应包含图片贴图");
    assert.equal(output.sha256, createHash("sha256").update(buffer).digest("hex"));
    await stat(new URL(output.blend, root));
  }
  assert.equal(totalTriangles, record.metrics.triangles);
  assert.equal(totalBytes, record.metrics.bytes);
  for (const evidencePath of [record.evidence.comparison, record.evidence.runtimeScreenshot]) {
    const image = await readFile(new URL(evidencePath, root));
    assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.ok(image.readUInt32BE(16) >= 1_900, `${evidencePath} 宽度不足`);
    assert.ok(image.readUInt32BE(20) >= 480, `${evidencePath} 高度不足`);
  }
  assert.equal(record.validation.identityRuntimeGate, "passed");
  assert.equal(record.runtimeGate.newConsoleErrors, 0);
});

test("幸福里 identity 三段资产与 build record 保持一致", async () => {
  const record = JSON.parse(await readFile(
    new URL("docs/research/build-records/xingfuli-identity.json", root),
    "utf8",
  ));
  let totalTriangles = 0;
  let totalBytes = 0;
  for (const output of record.outputs.segments) {
    const buffer = await readFile(new URL(output.glb, root));
    const data = parseGlb(buffer);
    totalTriangles += countTriangles(data);
    totalBytes += buffer.length;
    assert.equal(data.nodes?.length, 1, `${output.id} identity 应合并为一个运行时节点`);
    assert.equal(data.meshes?.length, 1, `${output.id} identity 应合并为一个网格`);
    assert.ok((data.materials?.length ?? 0) <= 8, `${output.id} identity 材质超出阶段预算`);
    assert.equal(data.images?.length ?? 0, 0, "identity 不得嵌入参考照片");
    assert.equal(data.textures?.length ?? 0, 0, "identity 不得包含图片贴图");
    assert.equal(output.sha256, createHash("sha256").update(buffer).digest("hex"));
    await stat(new URL(output.blend, root));
  }
  assert.equal(totalTriangles, 16_452);
  assert.equal(totalBytes, 1_171_132);
  assert.equal(record.metrics.triangles, totalTriangles);
  assert.equal(record.metrics.bytes, totalBytes);
  for (const evidencePath of [record.evidence.comparison, record.evidence.runtimeScreenshot]) {
    const image = await readFile(new URL(evidencePath, root));
    assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.ok(image.readUInt32BE(16) >= 1_900, `${evidencePath} 宽度不足`);
    assert.ok(image.readUInt32BE(20) >= 480, `${evidencePath} 高度不足`);
  }
  assert.equal(record.validation.identityRuntimeGate, "passed");
  assert.equal(record.runtimeGate.newConsoleErrors, 0);
});

test("幸福里 materials 三段资产经过无贴图审计且证据完整", async () => {
  const record = JSON.parse(await readFile(
    new URL("docs/research/build-records/xingfuli-materials.json", root),
    "utf8",
  ));
  let totalTriangles = 0;
  let totalBytes = 0;
  for (const output of record.outputs.segments) {
    const buffer = await readFile(new URL(output.glb, root));
    const data = parseGlb(buffer);
    totalTriangles += countTriangles(data);
    totalBytes += buffer.length;
    assert.equal(data.nodes?.length, 1);
    assert.equal(data.meshes?.length, 1);
    assert.ok((data.materials?.length ?? 0) <= 10);
    assert.equal(data.images?.length ?? 0, 0);
    assert.equal(data.textures?.length ?? 0, 0);
    assert.equal(output.sha256, createHash("sha256").update(buffer).digest("hex"));
    await stat(new URL(output.blend, root));
  }
  assert.equal(totalTriangles, 18_828);
  assert.equal(totalBytes, 1_341_276);
  assert.equal(record.metrics.triangles, totalTriangles);
  assert.equal(record.metrics.bytes, totalBytes);
  for (const evidencePath of [record.evidence.comparison, record.evidence.runtimeScreenshot]) {
    const image = await readFile(new URL(evidencePath, root));
    assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }
  assert.equal(record.runtimeGate.referencePhotosEmbedded, false);
  assert.equal(record.runtimeGate.newConsoleErrors, 0);
});

test("幸福里 site 三段硬质场地资产、动态分层与证据保持一致", async () => {
  const record = JSON.parse(await readFile(
    new URL("docs/research/build-records/xingfuli-site.json", root),
    "utf8",
  ));
  let totalTriangles = 0;
  let totalBytes = 0;
  for (const output of record.outputs.segments) {
    const buffer = await readFile(new URL(output.glb, root));
    const data = parseGlb(buffer);
    totalTriangles += countTriangles(data);
    totalBytes += buffer.length;
    assert.equal(data.nodes?.length, 1);
    assert.equal(data.meshes?.length, 1);
    assert.ok((data.materials?.length ?? 0) <= 10);
    assert.equal(data.images?.length ?? 0, 0);
    assert.equal(data.textures?.length ?? 0, 0);
    assert.equal(output.sha256, createHash("sha256").update(buffer).digest("hex"));
    await stat(new URL(output.blend, root));
  }
  assert.equal(totalTriangles, 19_224);
  assert.equal(totalBytes, 1_370_840);
  assert.equal(record.metrics.triangles, totalTriangles);
  assert.equal(record.metrics.bytes, totalBytes);
  assert.equal(record.outputs.cacheVersion, "2");
  assert.match(record.siteComposition.entranceWallCorrection, /does not close/);
  for (const evidencePath of [record.evidence.comparison, record.evidence.runtimeScreenshot]) {
    const image = await readFile(new URL(evidencePath, root));
    assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.ok(image.readUInt32BE(16) >= 1_900, `${evidencePath} 宽度不足`);
    assert.ok(image.readUInt32BE(20) >= 480, `${evidencePath} 高度不足`);
  }
  assert.equal(record.validation.siteRuntimeGate, "passed");
  assert.equal(record.runtimeGate.newConsoleErrors, 0);
});

test("幸福里 final 三段资产、运行时证据与性能记录保持一致", async () => {
  const record = JSON.parse(await readFile(
    new URL("docs/research/build-records/xingfuli.json", root),
    "utf8",
  ));
  let totalTriangles = 0;
  let totalBytes = 0;
  assert.equal(record.asset, "xingfuli");
  assert.equal(record.stage, "final");
  assert.equal(record.outputs.cacheVersion, "20260723-final-1");
  for (const output of record.outputs.segments) {
    const buffer = await readFile(new URL(output.glb, root));
    const data = parseGlb(buffer);
    totalTriangles += countTriangles(data);
    totalBytes += buffer.length;
    assert.equal(data.nodes?.length, 1);
    assert.equal(data.meshes?.length, 1);
    assert.ok((data.materials?.length ?? 0) <= 10);
    assert.equal(data.images?.length ?? 0, 0);
    assert.equal(data.textures?.length ?? 0, 0);
    assert.equal(output.sha256, createHash("sha256").update(buffer).digest("hex"));
    await stat(new URL(output.blend, root));
  }
  assert.equal(totalTriangles, 19_224);
  assert.equal(totalBytes, 1_370_828);
  assert.equal(record.metrics.triangles, totalTriangles);
  assert.equal(record.metrics.bytes, totalBytes);
  for (const evidencePath of [
    record.evidence.comparison,
    record.evidence.blenderCanonical,
    record.evidence.runtimeCanonical,
    record.evidence.runtimePool,
    record.evidence.runtimeEntrance,
    record.evidence.runtimeViews,
  ]) {
    const image = await readFile(new URL(evidencePath, root));
    assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.ok(image.readUInt32BE(16) >= 1_000, `${evidencePath} 宽度不足`);
    assert.ok(image.readUInt32BE(20) >= 480, `${evidencePath} 高度不足`);
  }
  const blenderComparison = await readFile(new URL(record.evidence.blenderComparison, root));
  assert.deepEqual([...blenderComparison.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(blenderComparison.readUInt32BE(16), 900);
  assert.equal(blenderComparison.readUInt32BE(20), 1_100);
  assert.equal(record.validation.finalRuntimeGate, "passed");
  assert.match(record.validation.knowledgeBaseSync, /^passed-threejs-3d-research/);
  assert.equal(record.knowledgeBaseEvidence.projectId, "0e0c3670-c275-42f9-8c06-6de01e3683b5");
  assert.equal(
    record.knowledgeBaseEvidence.generatedPage,
    "wiki/sources/31-threejs-modeling-knowledge-base--25-xinhua-scene-dressing-kit--geb0y2.md",
  );
  assert.equal(record.knowledgeBaseEvidence.graphNodeCount, 3);
  assert.equal(record.knowledgeBaseEvidence.graphEdgeCount, 1);
  assert.equal(record.runtimeGate.newApplicationConsoleErrors, 0);
  assert.equal(record.runtimeGate.pageVisibility, "visible");
  assert.ok(record.runtimeGate.performance.averageFps >= 55);
  assert.ok(record.runtimeGate.performance.p95FrameMilliseconds <= 25);
  const runtimeMetrics = JSON.parse(await readFile(
    new URL(record.evidence.runtimeMetrics, root),
    "utf8",
  ));
  const samples = runtimeMetrics.requestAnimationFrame.samples;
  assert.equal(samples.length, 120);
  const averageFrameMilliseconds = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const sortedSamples = [...samples].sort((a, b) => a - b);
  const p95FrameMilliseconds = sortedSamples[Math.ceil(samples.length * 0.95) - 1];
  const maximumFrameMilliseconds = Math.max(...samples);
  const averageFps = 1_000 / averageFrameMilliseconds;
  assert.ok(Math.abs(
    averageFrameMilliseconds - runtimeMetrics.requestAnimationFrame.reportedSummary.averageFrameMilliseconds
  ) < 1e-9);
  assert.ok(Math.abs(averageFps - record.runtimeGate.performance.averageFps) < 1e-9);
  assert.equal(p95FrameMilliseconds, record.runtimeGate.performance.p95FrameMilliseconds);
  assert.equal(maximumFrameMilliseconds, record.runtimeGate.performance.maximumFrameMilliseconds);
  assert.equal(
    runtimeMetrics.performanceMetrics.end.jsHeapUsedBytes,
    record.runtimeGate.performance.jsHeapUsedBytes,
  );
  const applicationErrors = runtimeMetrics.console.entries.filter((entry) => (
    entry.origin === "application" && entry.level === "error"
  ));
  assert.equal(applicationErrors.length, 0);
  assert.equal(runtimeMetrics.console.applicationErrorCount, 0);
  assert.equal(runtimeMetrics.console.extensionErrorCount, 0);
  assert.equal(runtimeMetrics.resourceTiming.entries.length, 3);
  assert.deepEqual(
    record.runtimeGate.performance.resourceTiming,
    runtimeMetrics.resourceTiming.entries,
  );
  const expectedDecodedBytes = new Map([
    ["xingfuli-west.glb?v=20260723-final-1", 317_012],
    ["xingfuli-center.glb?v=20260723-final-1", 554_080],
    ["xingfuli-east.glb?v=20260723-final-1", 499_736],
  ]);
  for (const resource of runtimeMetrics.resourceTiming.entries) {
    assert.equal(resource.initiatorType, "fetch");
    assert.ok(resource.durationMs > 0);
    assert.equal(resource.decodedBodySize, expectedDecodedBytes.get(resource.name));
    assert.equal(resource.encodedBodySize, resource.decodedBodySize);
    assert.ok(resource.transferSize >= resource.encodedBodySize);
  }
  assert.match(runtimeMetrics.build.asset, /\/assets\/index-[A-Za-z0-9_-]+\.js$/);
  const mobileImage = await readFile(new URL(record.evidence.runtimeMobile, root));
  assert.deepEqual([...mobileImage.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(mobileImage.readUInt32BE(16), 390);
  assert.equal(mobileImage.readUInt32BE(20), 844);
  assert.deepEqual(record.runtimeGate.mobile.viewport, [390, 844]);
  assert.equal(record.runtimeGate.mobile.devicePixelRatio, 2);
  assert.equal(record.runtimeGate.mobile.newApplicationConsoleErrors, 0);
  assert.equal(record.validation.mobileRuntimeGate, "passed");
});

test("运行时使用三段 final 模型并保留程序化 fallback 与三组 QA 入口", async () => {
  const scene = await readFile(new URL("app/scene/xingfuli-block.tsx", root), "utf8");
  const fullArchitecture = await readFile(
    new URL("app/scene/xingfuli-architecture-model.tsx", root),
    "utf8",
  );
  const world = await readFile(new URL("app/scene/xinhua-world.tsx", root), "utf8");
  const generator = await readFile(new URL("scripts/create_xingfuli_models.py", root), "utf8");
  const streetAssets = await readFile(new URL("app/scene/shared-street-assets.tsx", root), "utf8");
  const paving = await readFile(new URL("app/scene/mixed-stone-paving.tsx", root), "utf8");
  for (const segment of segmentIds) {
    assert.match(fullArchitecture, new RegExp(`xingfuli-${segment}\\.glb\\?v=20260723-final-1`));
  }
  assert.match(scene, /XingfuliArchitectureBoundary/);
  assert.match(scene, /XingfuliProceduralArchitectureFallback/);
  assert.match(fullArchitecture, /scale=\{\[1, 1, -1\]\}/);
  assert.match(scene, /resolvedStage === "massing"/);
  assert.match(fullArchitecture, /stage: "full"/);
  assert.match(fullArchitecture, /name="xingfuli-final-architecture"/);
  assert.match(scene, /id: `east-entry-bollard-\$\{index\}`/);
  assert.doesNotMatch(scene, /\[-44\.6, 44\.6\]/);
  assert.match(world, /<XingfuliBlock[\s\S]*?stage=\{xingfuliTier\}/);
  assert.doesNotMatch(fullArchitecture, /useGLTF\.preload\(/);
  assert.match(world, /name === "xingfuli-canonical"/);
  assert.match(world, /name === "xingfuli-pool-detail"/);
  assert.match(world, /name === "xingfuli-entrance-detail"/);
  assert.match(world, /xingfuliLocalToWorld\(\s*4,/);
  assert.match(generator, /choices=\["west", "center", "east", "all"\], required=True/);
  assert.match(generator, /choices=\["massing", "identity", "materials", "site", "final"\]/);
  for (const reusableExport of [
    "StreetLampInstances",
    "CantileverCafeUmbrella",
    "OutdoorDiningSet",
    "SlattedBench",
    "StreetPlanter",
    "IrregularStoneBollards",
  ]) {
    assert.match(streetAssets, new RegExp(`export function ${reusableExport}`));
  }
  assert.match(streetAssets, /evidenceRef/);
  assert.match(streetAssets, /mobileTier/);
  assert.match(scene, /variant="white-molded"/);
  assert.match(scene, /variant="dark-wood-metal"/);
  assert.match(scene, /variant="colorful-folding"/);
  assert.match(paving, /longitudinal-running-bond/);
  assert.match(paving, /STONE_COLORS\.length/);
  assert.match(scene, /<MixedStonePaving name="xingfuli-mixed-stone-paving" \/>/);
});

test("幸福里可视花箱与番禺路矮方石桩逐项覆盖生产碰撞", async () => {
  const scene = await readFile(new URL("app/scene/xingfuli-block.tsx", root), "utf8");
  const streetAssets = await readFile(new URL("app/scene/shared-street-assets.tsx", root), "utf8");
  const qaData = JSON.parse(await readFile(
    new URL("app/scene/xingfuli-qa-paths.json", root),
    "utf8",
  ));
  const visiblePlanterIds = [...scene.matchAll(/name="(planter-[^"]+-base)"/g)]
    .map((match) => match[1])
    .sort();
  const collisionPlanterIds = qaData.fixedObstacles
    .map(({ id }) => id)
    .filter((id) => id.startsWith("planter-"))
    .sort();
  assert.deepEqual(collisionPlanterIds, visiblePlanterIds);
  assert.equal(visiblePlanterIds.length, 4);
  assert.equal((scene.match(/<StreetPlanter /g) ?? []).length, 4);

  const bollardObstacles = qaData.fixedObstacles
    .filter(({ id }) => id.startsWith("east-entry-bollard-"));
  assert.deepEqual(
    bollardObstacles.map(({ id }) => id),
    Array.from({ length: 5 }, (_, index) => `east-entry-bollard-${index}`),
  );
  assert.match(scene, /\[\s*-11\.8,\s*-9,\s*-6\.2,\s*-3\.4,\s*-0\.6,?\s*\]/s);
  assert.match(streetAssets, /variant: "five-deterministic-squat-blocks"/);
  assert.match(streetAssets, /<boxGeometry args=\{\[1\.6, 1\.45, 1\.35\]\} \/>/);
  assert.match(streetAssets, /<meshToonMaterial color="#4f5450" \/>/);
  assert.doesNotMatch(streetAssets, /<dodecahedronGeometry/);
});

test("幸福里两入口、倒影池两侧和木桥均保留确定性连续通行", async () => {
  const map = JSON.parse(await readFile(
    new URL("app/scene/xinhua-map-data.json", root),
    "utf8",
  ));
  const placement = map.landmarks.xingfuli;
  const fanyuClearance = 4.1;
  const modelLength = 94;
  const axisX = [Math.cos(placement.rotationY), -Math.sin(placement.rotationY)];
  const xingfuliPosition = [
    placement.position[0] - axisX[0] * fanyuClearance / 2,
    placement.position[1] - axisX[1] * fanyuClearance / 2,
  ];
  const longitudinalScale = placement.horizontalScale - fanyuClearance / modelLength;
  const worldObstacles = XINGFULI_OBSTACLES.map((obstacle) => transformMapObstacle(
    obstacle,
    xingfuliPosition,
    placement.rotationY,
    placement.horizontalScale,
    placement.localLaneCenterZ,
    longitudinalScale,
  ));
  assert.equal(XINGFULI_QA_PLAYER_RADIUS_WORLD, 0.48);
  assert.equal(XINGFULI_QA_PATHS.length, 3);
  for (const route of XINGFULI_QA_PATHS) {
    for (let pointIndex = 1; pointIndex < route.points.length; pointIndex += 1) {
      const [startX, startZ] = route.points[pointIndex - 1];
      const [endX, endZ] = route.points[pointIndex];
      const distance = Math.hypot(endX - startX, endZ - startZ);
      const samples = Math.ceil(distance / 0.2);
      for (let sample = 0; sample <= samples; sample += 1) {
        const ratio = sample / samples;
        const x = startX + (endX - startX) * ratio;
        const z = startZ + (endZ - startZ) * ratio;
        const [worldX, worldZ] = transformMapPoint(
          x,
          z,
          xingfuliPosition,
          placement.rotationY,
          placement.horizontalScale,
          placement.localLaneCenterZ,
          longitudinalScale,
        );
        assert.equal(
          isPlanarPositionBlockedInPolygon(
            worldX,
            worldZ,
            map.boundary,
            worldObstacles,
            XINGFULI_QA_PLAYER_RADIUS_WORLD,
          ),
          false,
          `${route.id} 在本地 (${x.toFixed(2)}, ${z.toFixed(2)}) / world (${worldX.toFixed(2)}, ${worldZ.toFixed(2)}) 被生产碰撞阻断`,
        );
      }
    }
  }
});

test("权威清单只把无阶段后缀 final 文件列为当前运行时资产", async () => {
  const manifest = JSON.parse(await readFile(
    new URL("docs/research/poi-reference-manifest.json", root),
    "utf8",
  ));
  const xingfuli = manifest.pois.find(({ id }) => id === "xingfuli");
  assert.ok(xingfuli);
  assert.equal(xingfuli.model.runtimeFiles.every((path) => (
    path.endsWith(".tsx") || /xingfuli-(west|center|east)\.glb$/.test(path)
  )), true);
  assert.equal(xingfuli.model.preservedStageRecords.length, 4);
  for (const recordPath of xingfuli.model.preservedStageRecords) await stat(new URL(recordPath, root));
  for (const currentPath of [
    ...xingfuli.model.runtimeFiles.filter((path) => !path.endsWith(".tsx")),
    ...xingfuli.model.sourceFiles.filter((path) => path.endsWith(".blend")),
  ]) {
    await stat(new URL(currentPath, root));
  }
});

test("幸福里九张本地实景证据均存在且哈希匹配", async () => {
  const manifest = JSON.parse(await readFile(
    new URL("docs/research/xingfuli-reference-manifest.json", root),
    "utf8",
  ));
  assert.equal(manifest.references.length, 9);
  assert.equal(manifest.coverageMatrix.every(({ status }) => status === "covered"), true);
  for (const reference of manifest.references) {
    const buffer = await readFile(new URL(reference.path, root));
    assert.equal(
      createHash("sha256").update(buffer).digest("hex"),
      reference.sha256,
      `${reference.path} 的证据哈希漂移`,
    );
  }
});
