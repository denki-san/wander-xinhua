import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath =
  "docs/research/build-records/tiers/xinhua-road/identity-v1/"
  + "hudec-memorial-identity.json";

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
    buffer,
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
      animations: json.animations?.length ?? 0,
      skins: json.skins?.length ?? 0,
      bounds,
    },
  };
}

function closeArray(actual, expected, tolerance = 1e-5) {
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < actual.length; index += 1) {
    assert.ok(
      Math.abs(actual[index] - expected[index]) <= tolerance,
      `${actual[index]} != ${expected[index]}`,
    );
  }
}

test("Identity v1 精确冻结已通过 MCP2 的 Hero 输入与地图契约", async () => {
  const record = await readJson(recordPath);
  const expectedInputs = {
    heroMcp2Record:
      "45d97bf5800e82cf55afa2947b97e20ececb9667fcda59c6ea4b56442c1598a3",
    heroBuildRecord:
      "da07f28999f87de3ee5e2be50769bdfa4503af6edf932eec02738b9d3b9e07ef",
    heroGenerator:
      "aa09dabb3017a521025e6c2a46b8fe4e1acc31713fab21973049fe69de56c82c",
    heroEditableSource:
      "4fe426b4a670ad3f2bd50f020195b366599a100b11cfc0f83bfdc6fb8b50b28d",
    heroRuntimeAsset:
      "598b2ba19e2412d7a592836d45066c787a7cf1eac347a6a6c5d790c12ffabff5",
  };
  assert.equal(record.derivedFrom.heroMcp2, "pass-main-window-xhigh");
  for (const [key, expectedSha] of Object.entries(expectedInputs)) {
    assert.equal(record.derivedFrom[key].sha256, expectedSha);
    assert.equal(await sha256(record.derivedFrom[key].path), expectedSha);
  }
  assert.equal(record.continuity.origin.join(","), "0,0,0");
  assert.equal(record.continuity.frontDirection, "-Y");
  assert.equal(record.continuity.groundDatum, 0);
  closeArray(record.continuity.runtimePosition, [92.535374, -132.52181]);
  assert.equal(record.continuity.runtimeYaw, 0.153486288);
  assert.equal(record.continuity.runtimeScale, 0.88);
  assert.equal(
    record.continuity.passageContract,
    "shared-split-obstacles-entrance-clear",
  );
  assert.equal(record.continuity.mapContractChanged, false);
});

test("Identity v1 GLB、build record 与预算精确闭合", async () => {
  const record = await readJson(recordPath);
  const output = record.outputs.glb;
  const { buffer, json, metrics } = await inspectGlb(output.path);
  assert.equal(await sha256(output.path), output.sha256);
  assert.equal(buffer.length, output.bytes);
  for (const key of [
    "nodes",
    "meshes",
    "primitives",
    "triangles",
    "materials",
    "images",
    "textures",
    "animations",
    "skins",
  ]) {
    assert.equal(metrics[key], output[key], key);
  }
  closeArray(metrics.bounds.min, output.bounds.min);
  closeArray(metrics.bounds.max, output.bounds.max);
  assert.deepEqual(output.transformedNodes, []);
  const rootExtras = json.nodes[0].extras;
  assert.equal(rootExtras.stable_asset_id, "hudec-memorial");
  assert.equal(rootExtras.quality_tier, "identity-v1");
  assert.equal(
    rootExtras.derived_from_hero_glb_sha256,
    record.derivedFrom.heroGlbSha256,
  );
  assert.equal(
    rootExtras.derived_from_mcp2_record_sha256,
    record.derivedFrom.heroMcp2Record.sha256,
  );
  assert.equal(rootExtras.front_direction, "-Y");
  closeArray(rootExtras.runtime_position, [92.535374, -132.52181]);
  assert.equal(rootExtras.runtime_yaw, 0.153486288);
  assert.equal(rootExtras.runtime_scale, 0.88);
  assert.equal(
    rootExtras.passage_contract,
    "shared-split-obstacles-entrance-clear",
  );
  const contract = record.budget.contract;
  assert.ok(metrics.nodes <= contract.maxNodes);
  assert.ok(metrics.meshes <= contract.maxMeshes);
  assert.ok(metrics.triangles <= contract.maxTriangles);
  assert.ok(metrics.materials <= contract.maxMaterials);
  assert.ok(metrics.images <= contract.maxImages);
  assert.ok(metrics.textures <= contract.maxTextures);
  assert.ok(metrics.bytes <= contract.maxBytes);
  assert.equal(record.budget.status, "pass");
});

test("核心身份构件保留，减面仅针对重复拓扑且场地装饰排除", async () => {
  const record = await readJson(recordPath);
  assert.deepEqual(record.identityCues.preserved, [
    "steep-layered-main-end-and-porch-roofs",
    "front-and-rear-dormers-with-readable-windows",
    "wide-front-and-end-gable-half-timber",
    "three-independent-tall-chimney-flues-and-crowns",
    "gabled-open-entrance-porch-door-and-steps",
    "low-glass-west-rear-wing-and-coarse-frame",
  ]);
  assert.ok(record.identityCues.deliberateLosses.includes("dense-roof-ribs"));
  assert.ok(
    record.identityCues.deliberateLosses.includes(
      "repeated-fine-window-jamb-sill-cap-and-hardware",
    ),
  );
  assert.equal(record.scope.included, "hudec-memorial-building-identity-only");
  for (const item of ["trees", "hedges", "planting", "courtyard slab"]) {
    assert.ok(record.scope.excluded.includes(item), item);
  }
  for (const item of ["shared registry", "shared runtime", "Fast manifest"]) {
    assert.ok(record.scope.excluded.includes(item), item);
  }
  const generator = await readFile(
    new URL(record.generator.path, root),
    "utf8",
  );
  assert.match(generator, /include_site_contract=False/u);
  assert.match(generator, /hudec-identity-chimney-crown/u);
  assert.match(generator, /add_identity_front_timber/u);
  assert.match(generator, /hudec-identity-low-wing-horizontal/u);
  assert.match(generator, /hudec-identity-entrance-door/u);
});

test("Identity 相对 Hero 的减量成立且两次 GLB 导出字节一致", async () => {
  const record = await readJson(recordPath);
  const hero = record.budget.heroBaseline;
  const identity = record.outputs.glb;
  const reduction = record.budget.reduction;
  assert.ok(identity.triangles < hero.triangles);
  assert.ok(identity.bytes < hero.bytes);
  assert.ok(identity.materials < hero.materials);
  assert.equal(
    reduction.identityToHeroTriangleRatio,
    Number((identity.triangles / hero.triangles).toFixed(6)),
  );
  assert.equal(
    reduction.identityToHeroByteRatio,
    Number((identity.bytes / hero.bytes).toFixed(6)),
  );
  assert.equal(record.determinism.previousGlbSha256, identity.sha256);
  assert.equal(record.determinism.currentGlbSha256, identity.sha256);
  assert.equal(record.determinism.sameGlbSha256, true);
  assert.equal(
    record.determinism.status,
    "pass-two-consecutive-runs-byte-identical",
  );
});

test("三机位与三联图均已固化，但不声称 MCP3 或 Three.js 通过", async () => {
  const record = await readJson(recordPath);
  for (const [view, preview] of Object.entries(record.previews)) {
    assert.equal(await sha256(preview.path), preview.sha256, view);
    assert.equal((await stat(new URL(preview.path, root))).size, preview.bytes);
    assert.match(preview.visualReview, /^pass-/u);
  }
  assert.equal(await sha256(record.triptych.path), record.triptych.sha256);
  assert.equal(
    (await stat(new URL(record.triptych.path, root))).size,
    record.triptych.bytes,
  );
  assert.equal(
    record.triptych.thirdPanel,
    "explicit-main-window-mcp3-and-threejs-pending-slate",
  );
  assert.equal(record.validation.headlessBuild, "pass");
  assert.equal(record.validation.glbAudit, "pass-internal");
  assert.equal(record.validation.fixedViews, "pass-medium-building-window");
  assert.equal(record.validation.mcp3, "pending-main-window-xhigh");
  assert.equal(record.validation.threeJs, "not-run");
  assert.equal(record.validation.performanceClaim, "none");
  assert.equal(record.validation.overall, "headless-candidate-mcp3-pending");
});
