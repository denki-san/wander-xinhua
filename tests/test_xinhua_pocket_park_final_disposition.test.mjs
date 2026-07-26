import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const dispositionPath =
  "docs/research/xinhua-pocket-park-final-disposition.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

async function inspectGlb(path) {
  const buffer = await readFile(new URL(path, root));
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(
    buffer.subarray(20, 20 + jsonLength).toString("utf8").trim(),
  );
  let triangles = 0;
  let primitives = 0;
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      primitives += 1;
      const position = json.accessors[primitive.attributes.POSITION];
      const indices = primitive.indices === undefined
        ? position
        : json.accessors[primitive.indices];
      triangles += indices.count / 3;
      for (let axis = 0; axis < 3; axis += 1) {
        bounds.min[axis] = Math.min(bounds.min[axis], position.min[axis]);
        bounds.max[axis] = Math.max(bounds.max[axis], position.max[axis]);
      }
    }
  }
  return {
    json,
    metrics: {
      bytes: buffer.length,
      nodes: json.nodes?.length ?? 0,
      meshes: json.meshes?.length ?? 0,
      primitives,
      triangles,
      materials: json.materials?.length ?? 0,
      images: json.images?.length ?? 0,
      textures: json.textures?.length ?? 0,
      bounds,
    },
  };
}

function closeArray(actual, expected, tolerance = 1e-5) {
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < actual.length; index += 1) {
    assert.ok(Math.abs(actual[index] - expected[index]) <= tolerance);
  }
}

test("口袋公园 final disposition 只固定本栋且未重做合格阶段", async () => {
  const disposition = await readJson(dispositionPath);
  assert.equal(
    disposition.baseCommit,
    "2b9eb49a2c77bcdb126da15566bd204c44786e66",
  );
  assert.equal(disposition.scope.binaryRebuilt, false);
  assert.equal(disposition.scope.qualifiedGateRerun, false);
  assert.equal(disposition.scope.browserOrXhsAccessed, false);
  assert.equal(disposition.scope.sharedFilesModified, false);
  assert.equal(disposition.scope.legacyHeroOverwrittenOrDeleted, false);
  for (const [name, input] of Object.entries(disposition.inputs)) {
    if (name === "publicRegistry") {
      // 这是建筑窗口审查时的公共 registry 指纹；当前文件可由后续主窗口
      // 批次合法推进，因此这里只保留历史 SHA 格式，不要求当前文件回退。
      assert.match(input.sha256, /^[0-9a-f]{64}$/);
      continue;
    }
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  for (const record of disposition.recordPrecedence.filter(
    ({ sha256: hash }) => hash,
  )) {
    if (record.rank === 3) {
      const supersededMapRecord = await readJson(record.path);
      assert.equal(
        supersededMapRecord.gates.currentRuntimeRecord,
        "docs/research/xinhua-pocket-park-threejs-runtime-qa-v2.json",
      );
      continue;
    }
    assert.equal(await sha256(record.path), record.sha256, record.path);
  }
});

test("Recovery Massing、MCP1 与历史 Three 可见性保持精确 SHA", async () => {
  const disposition = await readJson(dispositionPath);
  const massing = disposition.currentMassing;
  assert.equal(await sha256(massing.blend.path), massing.blend.sha256);
  assert.equal(await sha256(massing.glb.path), massing.glb.sha256);
  assert.equal(
    (await stat(new URL(massing.blend.path, root))).size,
    massing.blend.bytes,
  );
  const { json, metrics } = await inspectGlb(massing.glb.path);
  for (const key of [
    "bytes",
    "nodes",
    "meshes",
    "primitives",
    "triangles",
    "materials",
    "images",
    "textures",
  ]) {
    assert.equal(metrics[key], massing.glb[key], `massing.${key}`);
  }
  closeArray(metrics.bounds.min, massing.glb.bounds.min);
  closeArray(metrics.bounds.max, massing.glb.bounds.max);
  assert.ok(json.nodes.every(({ extras }) => extras.tier === "massing"));
  const mcp = await readJson(
    disposition.recordPrecedence.find(({ rank }) => rank === 4).path,
  );
  assert.equal(mcp.mcp1.status, "pass");
  assert.equal(mcp.source.glbSha256, massing.glb.sha256);
  assert.equal(mcp.source.blendSha256, massing.blend.sha256);
  assert.equal(mcp.heroAuthorized, false);
  assert.equal(mcp.identityAuthorized, false);
});

test("候选地图不压道路邻楼，中心碰撞路线通过", async () => {
  const disposition = await readJson(dispositionPath);
  const map = await readJson(
    disposition.recordPrecedence.find(({ rank }) => rank === 3).path,
  );
  const runtime = await readJson(
    disposition.recordPrecedence.find(({ rank }) => rank === 2).path,
  );
  assert.deepEqual(
    map.candidatePlacement.position,
    disposition.mapGate.candidatePlacement.position,
  );
  assert.equal(
    map.clearance.minimumAfterCollisionMarginSceneUnits,
    disposition.mapGate.clearance.minimumAfterCollisionMarginSceneUnits,
  );
  assert.ok(disposition.mapGate.clearance.minimumAfterCollisionMarginSceneUnits > 0);
  assert.ok(disposition.mapGate.clearance.xinhuaRoadAsphaltEdgeSceneUnits > 3);
  assert.equal(runtime.collision.status, "pass-center-route");
  assert.equal(
    runtime.collision.finalTargetErrorSceneUnits,
    disposition.mapGate.walkability.finalTargetErrorSceneUnits,
  );
  assert.equal(runtime.console.errorsObservedForCurrentRoute, 0);
});

test("正式地图门由窄廊第三人称相机精确阻塞", async () => {
  const disposition = await readJson(dispositionPath);
  const runtime = await readJson(
    disposition.recordPrecedence.find(({ rank }) => rank === 2).path,
  );
  assert.equal(runtime.camera.status, "blocked");
  assert.equal(runtime.camera.blocker, disposition.mapGate.camera.blocker);
  assert.equal(
    runtime.camera.requestedArmLength,
    disposition.mapGate.camera.requestedArmLength,
  );
  assert.deepEqual(
    runtime.camera.finalObservedArmLengthRange,
    disposition.mapGate.camera.observedArmLengthRange,
  );
  assert.ok(
    Math.max(...disposition.mapGate.camera.observedArmLengthRange)
      < disposition.mapGate.camera.requestedArmLength,
  );
  assert.equal(runtime.acceptance.collision, "pass-center-route");
  assert.equal(runtime.acceptance.camera, "blocked");
  assert.equal(runtime.acceptance.formalMapAcceptance, "blocked-camera");
  assert.equal(runtime.acceptance.runtimePromotionAllowed, false);
});

test("legacy Hero 主体连续但 strict lineage 与当前 scope 未闭合", async () => {
  const disposition = await readJson(dispositionPath);
  const hero = disposition.legacyHero;
  assert.equal(await sha256(hero.generator.path), hero.generator.sha256);
  assert.equal(await sha256(hero.blend.path), hero.blend.sha256);
  assert.equal(await sha256(hero.glb.path), hero.glb.sha256);
  const { json, metrics } = await inspectGlb(hero.glb.path);
  for (const key of [
    "bytes",
    "nodes",
    "meshes",
    "primitives",
    "triangles",
    "materials",
    "images",
    "textures",
  ]) {
    assert.equal(metrics[key], hero.glb[key], `hero.${key}`);
  }
  closeArray(metrics.bounds.min, hero.glb.bounds.min);
  closeArray(metrics.bounds.max, hero.glb.bounds.max);
  const materialNames = json.materials.map(({ name }) => name);
  assert.ok(materialNames.includes("口袋公园深绿"));
  assert.ok(materialNames.includes("口袋公园粉黛草"));
  assert.ok(materialNames.includes("口袋公园展板黄"));
  assert.equal(hero.mcp2Authorized, false);
  assert.equal(hero.mcp2Candidate, false);
  assert.notDeepEqual(
    [
      hero.currentDefaultRegistryTransform.position,
      hero.currentDefaultRegistryTransform.yaw,
    ],
    [
      disposition.mapGate.candidatePlacement.position,
      disposition.mapGate.candidatePlacement.yaw,
    ],
  );
});

test("Identity 和三档在相机、地图与 Hero lineage 前保持关闭", async () => {
  const disposition = await readJson(dispositionPath);
  for (const path of [
    "public/models/requested-pois/xinhua-pocket-park-identity.glb",
    "assets/models/source/requested-pois/xinhua-pocket-park-identity.blend",
    "docs/research/build-records/tiers/xinhua-road/hero/xinhua-pocket-park-hero.json",
    "docs/research/build-records/tiers/xinhua-road/identity/xinhua-pocket-park-identity.json",
  ]) {
    await assert.rejects(access(new URL(path, root)));
  }
  assert.equal(disposition.identityDisposition.derivationAuthorized, false);
  assert.equal(disposition.gates.camera, "blocked");
  assert.equal(disposition.gates.formalMapAcceptance, "blocked-camera");
  assert.equal(disposition.gates.heroLineage, "blocked");
  assert.equal(disposition.gates.heroMcp2, "not-authorized");
  assert.equal(disposition.gates.identity, "blocked");
  assert.equal(disposition.gates.identityMcp3, "not-reachable");
  assert.equal(disposition.gates.threeTierRuntime, "not-reachable");
});
