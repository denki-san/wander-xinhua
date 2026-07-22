import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function readGlbJson(relativePath) {
  const buffer = await readFile(new URL(relativePath, root));
  assert.equal(buffer.toString("ascii", 0, 4), "glTF", `${relativePath} 必须是 GLB`);
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
  return { buffer, json };
}

function glbTriangles(json) {
  return (json.meshes ?? []).flatMap((mesh) => mesh.primitives ?? []).reduce((total, primitive) => {
    const accessor = primitive.indices === undefined
      ? json.accessors[primitive.attributes.POSITION]
      : json.accessors[primitive.indices];
    return total + accessor.count / 3;
  }, 0);
}

test("上海影城混合身份 GLB 保持轻量、无贴图且可追溯", async () => {
  const baseline = await readGlbJson("public/models/xinhua-road/shanghai-cinema.glb");
  const hybrid = await readGlbJson("public/models/xinhua-road/shanghai-cinema-hybrid-identity.glb");
  assert.ok(hybrid.buffer.length < baseline.buffer.length * 0.1, "身份 GLB 必须小于完整 GLB 的 10%");
  assert.ok(glbTriangles(hybrid.json) < glbTriangles(baseline.json) * 0.15, "身份 GLB 三角面必须显著少于完整 GLB");
  assert.equal(hybrid.json.nodes.length, 1);
  assert.equal(hybrid.json.meshes.length, 1);
  assert.equal(hybrid.json.materials.length, 3);
  assert.equal(hybrid.json.images?.length ?? 0, 0);
  assert.equal(hybrid.json.textures?.length ?? 0, 0);
  assert.equal(hybrid.json.nodes[0].extras.hybrid_role, "unique-silhouette");
  assert.equal(hybrid.json.nodes[0].extras.source_parts, 6);
  await Promise.all([
    access(new URL("scripts/create_shanghai_cinema_hybrid_identity.py", root)),
    access(new URL("assets/models/source/xinhua-road/shanghai-cinema-hybrid-identity.blend", root)),
    access(new URL("docs/research/build-records/shanghai-cinema-hybrid-identity.json", root)),
  ]);
});

test("混合页面包含程序化主体、实例化重复构件和三级距离加载", async () => {
  const source = await readFile(new URL("app/hybrid-model-test/HybridModelComparison.tsx", root), "utf8");
  assert.match(source, /function ProgrammaticMassing/);
  assert.match(source, /InstancedMesh/);
  assert.match(source, /function RepeatedDetails/);
  assert.match(source, /shanghai-cinema-hybrid-identity\.glb/);
  assert.match(source, /distance <= 38/);
  assert.match(source, /distance <= 60/);
  assert.doesNotMatch(source, /useGLTF\.preload/);
  assert.match(source, /tier === "identity" \|\| tier === "detail"/);
});

test("同条件 Chrome A/B 结果覆盖完整、远景、中景和近景", async () => {
  const metricsPath = new URL("test_artifacts/test_shanghai-cinema_hybrid_metrics.json", root);
  const metrics = JSON.parse(await readFile(metricsPath, "utf8"));
  assert.deepEqual(metrics.viewports.desktop, {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  assert.deepEqual(metrics.results.map(({ id }) => id), [
    "full-glb-near",
    "hybrid-far",
    "hybrid-medium",
    "hybrid-near",
    "full-glb-near-mobile",
    "hybrid-near-mobile",
  ]);
  const [baseline, far, medium, near, baselineMobile, nearMobile] = metrics.results;
  assert.equal(baseline.network.cacheDisabled, true);
  assert.equal(baseline.network.downloadMbps, 5);
  assert.equal(far.metrics.glbRequests.length, 0, "远景不应请求 GLB");
  assert.equal(medium.metrics.glbRequests[0].file, "shanghai-cinema-hybrid-identity.glb");
  assert.equal(near.metrics.glbRequests[0].file, "shanghai-cinema-hybrid-identity.glb");
  assert.ok(near.metrics.readyMs < baseline.metrics.readyMs * 0.2, "混合近景可见时间应低于完整 GLB 的 20%");
  assert.ok(near.metrics.triangles < baseline.metrics.triangles * 0.2, "混合近景三角面应低于完整 GLB 的 20%");
  assert.ok(near.metrics.drawCalls <= baseline.metrics.drawCalls, "混合近景 draw call 不应高于完整 GLB");
  assert.ok(nearMobile.metrics.readyMs < baselineMobile.metrics.readyMs * 0.2, "移动端混合近景可见时间应低于完整 GLB 的 20%");
  assert.ok(nearMobile.metrics.drawCalls <= baselineMobile.metrics.drawCalls, "移动端混合近景 draw call 不应高于完整 GLB");
  assert.ok(metrics.results.every(({ pageErrors }) => pageErrors.length === 0));
  await Promise.all([
    stat(new URL("test_artifacts/test_shanghai-cinema_full-glb-near_cdp.png", root)),
    stat(new URL("test_artifacts/test_shanghai-cinema_hybrid-near_cdp.png", root)),
  ]);
});
