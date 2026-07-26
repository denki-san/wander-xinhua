import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recordPath =
  "docs/research/build-records/tiers/xinhua-road/identity-v1/"
  + "xinhua-pocket-park-identity.json";
const heroRecordPath =
  "docs/research/build-records/tiers/xinhua-road/hero-v2/"
  + "xinhua-pocket-park-hero.json";
const heroGatePath = "docs/research/xinhua-pocket-park-blender-mcp-gates-v2.json";
const heroGlbPath =
  "public/models/tiers/xinhua-road/hero-v2/xinhua-pocket-park-hero.glb";
const frozenHeroSha =
  "c6ef6f107e3c1b6555784858dea2e46da8813e68aec589d04d0d3c10aeb8a7c7";
const forbiddenTokens = [
  "plant",
  "grass",
  "tree",
  "bench",
  "rotating",
  "exhibition",
  "board",
  "signage",
  "ground-light",
  "paving",
  "path-slab",
  "decoration",
];

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(path.join(root, relativePath)))
    .digest("hex");
}

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim());
}

function auditGlb(json) {
  let triangles = 0;
  let primitives = 0;
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
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
  return { triangles, primitives, bounds };
}

function pngDimensions(buffer) {
  assert.equal(buffer.toString("ascii", 1, 4), "PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function near(actual, expected, tolerance = 1e-5) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} 与 ${expected} 的差超过 ${tolerance}`,
  );
}

test("Identity v1 只从冻结且已通过主窗口 MCP2 的 Hero v2 派生", async () => {
  const record = await readJson(recordPath);
  const hero = await readJson(heroRecordPath);
  const gate = await readJson(heroGatePath);

  assert.equal(await sha256(heroGlbPath), frozenHeroSha);
  assert.equal(hero.outputs.glb.sha256, frozenHeroSha);
  assert.equal(hero.outputs.glb.triangles, 1152);
  assert.equal(hero.validation.mcp2, "pass-main-window-xhigh");
  assert.equal(hero.validation.identityAuthorized, true);
  assert.equal(gate.mcp2.status, "pass");
  assert.equal(gate.identityAuthorization.authorized, true);
  assert.equal(gate.identityAuthorization.frozenHeroSha256, frozenHeroSha);

  assert.equal(record.tier, "identity");
  assert.equal(record.version, "identity-v1");
  assert.equal(
    record.status,
    "identity-v1-runtime-pass",
  );
  assert.equal(record.derivedFrom.heroRuntimeAsset.sha256, frozenHeroSha);
  assert.equal(
    record.derivedFrom.heroGenerator.sha256,
    await sha256(record.derivedFrom.heroGenerator.path),
  );
  assert.equal(
    record.derivedFrom.heroEditableSource.sha256,
    await sha256(record.derivedFrom.heroEditableSource.path),
  );
  assert.equal(
    record.derivedFrom.heroBuildRecord.sha256,
    await sha256(record.derivedFrom.heroBuildRecord.path),
  );
  assert.equal(
    record.derivedFrom.heroMcp2Record.sha256,
    await sha256(record.derivedFrom.heroMcp2Record.path),
  );
});

test("Identity generator、Blend、GLB 与 build record 指纹闭合", async () => {
  const record = await readJson(recordPath);
  assert.equal(record.generator.sha256, await sha256(record.generator.path));
  assert.equal(record.outputs.blend.sha256, await sha256(record.outputs.blend.path));
  assert.equal(record.outputs.glb.sha256, await sha256(record.outputs.glb.path));
  assert.equal(
    record.outputs.blend.bytes,
    (await readFile(path.join(root, record.outputs.blend.path))).length,
  );
  assert.equal(
    record.outputs.glb.bytes,
    (await readFile(path.join(root, record.outputs.glb.path))).length,
  );
  assert.equal(record.generator.singleAssetOnly, true);
});

test("Identity GLB 独立复算结构、减面、材质与零贴图策略", async () => {
  const record = await readJson(recordPath);
  const buffer = await readFile(path.join(root, record.outputs.glb.path));
  const json = parseGlb(buffer);
  const audit = auditGlb(json);

  assert.equal(buffer.length, 41164);
  assert.equal(json.nodes.length, 3);
  assert.equal(json.meshes.length, 3);
  assert.equal(audit.primitives, 7);
  assert.equal(audit.triangles, 672);
  assert.ok(audit.triangles < record.budget.heroTriangles);
  assert.ok(audit.triangles <= record.budget.maximumTriangles);
  assert.equal(json.materials.length, 3);
  assert.deepEqual(
    new Set(json.materials.map((material) => material.name)),
    new Set([
      "xinhua-pocket-park-identity-mirror",
      "xinhua-pocket-park-identity-weathering-steel",
      "xinhua-pocket-park-identity-dark-seam",
    ]),
  );
  assert.equal(json.images?.length ?? 0, 0);
  assert.equal(json.textures?.length ?? 0, 0);
  assert.equal(json.animations?.length ?? 0, 0);
  for (const node of json.nodes) {
    assert.equal(node.translation, undefined);
    assert.equal(node.rotation, undefined);
    assert.equal(node.scale, undefined);
    assert.equal(node.matrix, undefined);
    assert.equal(node.extras.stable_asset_id, "building:xinhua-road:xinhua-pocket-park");
    assert.equal(node.extras.tier, "identity");
    assert.equal(node.extras.version, "identity-v1");
    assert.equal(node.extras.derived_from_hero_glb_sha256, frozenHeroSha);
    assert.equal(node.extras.mcp3_status, "pending-main-window-xhigh");
    assert.equal(node.extras.runtime_integrated, false);
  }
});

test("Identity 保持 Hero/Massing 原点、21.8592×3.99168m 包络与开放通路", async () => {
  const record = await readJson(recordPath);
  const buffer = await readFile(path.join(root, record.outputs.glb.path));
  const audit = auditGlb(parseGlb(buffer));

  [-0.84, 0, -4.6].forEach((expected, axis) => {
    near(audit.bounds.min[axis], expected);
  });
  [0.84, 1.66, 4.6].forEach((expected, axis) => {
    near(audit.bounds.max[axis], expected);
  });
  assert.deepEqual(record.contract.origin, [0, 0, 0]);
  assert.equal(record.contract.groundY, 0);
  assert.equal(record.contract.authoredFront, "local-negative-y");
  assert.equal(record.contract.glbFront, "local-positive-z");
  assert.deepEqual(record.contract.runtimePosition, [-57.421934309, 67.06298037]);
  assert.equal(record.contract.runtimeYaw, -0.398058989);
  assert.equal(record.contract.runtimeScale, 0.88);
  assert.equal(record.contract.authoredEnvelope.widthMetersAtRuntime, 3.99168);
  assert.equal(record.contract.authoredEnvelope.lengthMetersAtRuntime, 21.8592);
  assert.equal(record.contract.localObstacles.length, 2);
  assert.equal(record.contract.centerPassage.minimumLocalWidthSceneUnits, 1.36);
  assert.equal(record.contract.centerPassage.runtimeWidthMeters, 3.23136);
  assert.equal(record.contract.centerPassage.groundLevelCrossingObjects, 0);
});

test("Identity 保留建筑身份构件并禁止场地、植物和装饰代理", async () => {
  const record = await readJson(recordPath);
  const glb = parseGlb(
    await readFile(path.join(root, record.outputs.glb.path)),
  );
  const searchable = JSON.stringify({
    nodes: glb.nodes,
    meshes: glb.meshes,
    materials: glb.materials,
  }).toLowerCase();
  for (const token of forbiddenTokens) {
    assert.equal(searchable.includes(token), false, `GLB 含范围外 token：${token}`);
  }
  assert.deepEqual(record.evidence.preservedIdentityCues, [
    "paired continuous faceted mirror walls",
    "weathering-steel wave bands",
    "mirror upper silhouette",
    "weathering-steel entrance header",
    "open center passage",
  ]);
  assert.equal(record.evidence.deliberateLosses.length, 4);
  assert.equal(record.scope.sharedRegistryModified, false);
  assert.equal(record.scope.sharedRuntimeModified, false);
  assert.equal(record.scope.fastManifestModified, false);
});

test("四类固定预览与三联图属于当前候选，MCP3 与 Three.js 均已验收", async () => {
  const record = await readJson(recordPath);
  const expectedPreviewDimensions = { width: 960, height: 720 };
  for (const preview of Object.values(record.outputs.previews)) {
    assert.equal(preview.sha256, await sha256(preview.path));
    assert.deepEqual(
      pngDimensions(await readFile(path.join(root, preview.path))),
      expectedPreviewDimensions,
    );
  }
  assert.equal(record.outputs.triptych.sha256, await sha256(record.outputs.triptych.path));
  assert.deepEqual(
    pngDimensions(await readFile(path.join(root, record.outputs.triptych.path))),
    { width: 2160, height: 520 },
  );
  assert.equal(record.validation.heroMcp2, "pass-retained-main-window-xhigh");
  assert.equal(record.validation.mcp3, "pass-main-window-xhigh");
  assert.equal(
    record.validation.mcp3Record,
    "docs/research/xinhua-pocket-park-blender-mcp3-gate-v1.json",
  );
  assert.equal(
    record.validation.threeJsIdentity,
    "pass-main-window-single-page",
  );
  assert.equal(
    record.validation.threeJsRecord,
    "docs/research/xinhua-pocket-park-three-tier-runtime-qa-v1.json",
  );
  assert.equal(record.validation.runtimeClaimed, true);
  assert.equal(record.validation.performanceClaimed, true);
});
