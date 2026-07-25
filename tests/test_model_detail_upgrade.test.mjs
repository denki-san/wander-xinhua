import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function parseGlb(relativePath) {
  const bytes = await readFile(new URL(relativePath, import.meta.url));
  assert.equal(bytes.toString("utf8", 0, 4), "glTF");
  const jsonLength = bytes.readUInt32LE(12);
  return {
    bytes,
    json: JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8")),
  };
}

function countTriangles(json) {
  return json.meshes
    .flatMap((mesh) => mesh.primitives)
    .reduce((sum, primitive) => (
      sum + json.accessors[primitive.indices].count / 3
    ), 0);
}

test("海军俱乐部几何与可见细节均超过改造前两倍", async () => {
  const { bytes, json } = await parseGlb(
    "../public/models/shangsheng/navy-club-pool.glb",
  );
  const triangles = countTriangles(json);
  const detailNode = json.nodes.find((node) => node.extras?.detail_current_parts);

  assert.ok(bytes.length > 9_000_000);
  assert.ok(triangles >= 43_224 * 2);
  assert.equal(detailNode.extras.detail_baseline_parts, 550);
  assert.ok(
    detailNode.extras.detail_current_parts
      >= detailNode.extras.detail_baseline_parts * 2,
  );
  assert.equal(
    detailNode.extras.detail_reference_set,
    "shangsheng-xinsuo-20260717",
  );
});

test("全部既有 POI GLB 均通过三角面翻倍或核心语义构件翻倍门槛", async () => {
  const [baseline, upgrade, generator] = await Promise.all([
    readFile(new URL("../docs/research/model-detail-baseline.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../docs/research/model-detail-upgrade.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../scripts/create_xinhua_road_models.py", import.meta.url), "utf8"),
  ]);
  const auditRecords = {
    ...upgrade.completed.requestedPoiGlbs,
    ...upgrade.completed.xinhuaRoadGlbs,
  };

  assert.match(generator, /旧版只有外框、玻璃和十字窗棂 4 层/);
  assert.match(generator, /f"\{name\}-sill"/);
  assert.match(generator, /f"\{name\}-drip-cap"/);
  assert.match(generator, /f"\{name\}-jamb-left"/);
  assert.match(generator, /f"\{name\}-latch"/);
  assert.match(generator, /f"\{prefix\}-pull"/);
  assert.match(generator, /f"\{prefix\}-hinge-\{index\}"/);
  assert.match(generator, /f"\{prefix\}-brace-up-\{index\}"/);

  for (const [relativePath, before] of Object.entries(baseline.glb)) {
    if (relativePath === "xinhua-road/xinhua-villas.glb") continue;
    const { json } = await parseGlb(`../public/models/${relativePath}`);
    const after = countTriangles(json);
    const slug = relativePath.split("/").at(-1).replace(/\.glb$/, "");
    const record = relativePath === "shangsheng/navy-club-pool.glb"
      ? upgrade.completed.shangsheng.navyClubGlb
      : auditRecords[slug];
    assert.ok(record, `${slug} 必须进入细节升级审计`);
    assert.equal(record.trianglesBefore, before.triangles, `${slug} 基线面数必须锁定`);
    assert.equal(record.trianglesAfter, after, `${slug} 改造后面数必须来自当前 GLB`);
    assert.ok(
      after >= before.triangles * 2
        || record.gate
        || record.visibleDetailPartsAfter >= record.visibleDetailPartsBefore * 2,
      `${slug} 必须满足面数或可见语义构件翻倍`,
    );
  }
});

test("独立别墅模型与所有运行时 GLB 均烘焙根节点变换", async () => {
  const landmarkData = JSON.parse(await readFile(
    new URL("../app/scene/xinhua-road-landmarks-data.json", import.meta.url),
    "utf8",
  ));
  const paths = new Set(landmarkData.landmarks.map(({ model }) => model));
  for (const model of paths) {
    const { json } = await parseGlb(`../public${model}`);
    for (const node of json.nodes ?? []) {
      assert.deepEqual(node.translation ?? [0, 0, 0], [0, 0, 0], `${model} 根节点不得残留平移`);
    }
  }
  const villas211 = landmarkData.landmarks.find(({ id }) => id === "xinhua-villas-211");
  const villas329 = landmarkData.landmarks.find(({ id }) => id === "xinhua-villas-329");
  assert.notEqual(villas211.model, villas329.model);
  assert.notDeepEqual(villas211.localBounds, villas329.localBounds);
});

test("幸福里和上生新所程序化构件的语义层数至少翻倍", async () => {
  const [xingfuli, shangsheng] = await Promise.all([
    readFile(new URL("../app/scene/xingfuli-block.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/shangsheng-xinsuo-block.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(xingfuli, /windowLayersBefore:\s*3/);
  assert.match(xingfuli, /windowLayersAfter:\s*6/);
  assert.match(xingfuli, /storefrontLayersBefore:\s*3/);
  assert.match(xingfuli, /storefrontLayersAfter:\s*7/);
  assert.match(xingfuli, /poolEdgeDetailsBefore:\s*1/);
  assert.match(xingfuli, /poolEdgeDetailsAfter:\s*9/);

  assert.match(shangsheng, /archWindowLayersBefore:\s*2/);
  assert.match(shangsheng, /archWindowLayersAfter:\s*7/);
  assert.match(shangsheng, /countryClubUpperWindowLayersBefore:\s*1/);
  assert.match(shangsheng, /countryClubUpperWindowLayersAfter:\s*5/);
  assert.match(shangsheng, /entranceStructurePartsBefore:\s*3/);
  assert.match(shangsheng, /entranceStructurePartsAfter:\s*12/);
});

test("华山绿地全览树木轻量，详情恢复四部件成熟树与配套建筑", async () => {
  const huashan = await readFile(
    new URL("../app/scene/huashan-green-block.tsx", import.meta.url),
    "utf8",
  );

  assert.match(huashan, /runningTrackLayersBefore:\s*1/);
  assert.match(huashan, /runningTrackLayersAfter:\s*5/);
  assert.match(huashan, /matureTreePartsBefore:\s*2/);
  assert.match(huashan, /matureTreePartsAfter:\s*4/);
  assert.match(huashan, /serviceBuildingPartsBefore:\s*2/);
  assert.match(huashan, /serviceBuildingPartsAfter:\s*8/);
  assert.match(huashan, /RUNNING_TRACK_PATH_IDS/);
  assert.match(huashan, /rootCollars/);
  assert.match(huashan, /secondaryCrowns/);
  assert.match(huashan, /detailed && \([\s\S]*?secondaryCrowns/);
});
