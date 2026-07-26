import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath =
  "docs/research/build-records/tiers/xinhua-road/hero-v2/"
  + "xinhua-pocket-park-hero.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(
    buffer.subarray(20, 20 + jsonLength).toString("utf8").trim(),
  );
}

function meshBounds(gltf, meshIndex) {
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  for (const primitive of gltf.meshes[meshIndex].primitives) {
    const position = gltf.accessors[primitive.attributes.POSITION];
    for (let axis = 0; axis < 3; axis += 1) {
      bounds.min[axis] = Math.min(bounds.min[axis], position.min[axis]);
      bounds.max[axis] = Math.max(bounds.max[axis], position.max[axis]);
    }
  }
  return bounds;
}

function inspectGlb(buffer) {
  const gltf = parseGlb(buffer);
  let triangles = 0;
  let primitives = 0;
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      primitives += 1;
      const position = gltf.accessors[primitive.attributes.POSITION];
      const indices = primitive.indices === undefined
        ? position
        : gltf.accessors[primitive.indices];
      triangles += indices.count / 3;
      for (let axis = 0; axis < 3; axis += 1) {
        bounds.min[axis] = Math.min(bounds.min[axis], position.min[axis]);
        bounds.max[axis] = Math.max(bounds.max[axis], position.max[axis]);
      }
    }
  }
  return {
    gltf,
    metrics: {
      bytes: buffer.length,
      nodes: gltf.nodes?.length ?? 0,
      meshes: gltf.meshes?.length ?? 0,
      primitives,
      triangles,
      materials: gltf.materials?.length ?? 0,
      images: gltf.images?.length ?? 0,
      textures: gltf.textures?.length ?? 0,
      animations: gltf.animations?.length ?? 0,
      bounds,
    },
  };
}

function closeNumber(actual, expected, tolerance = 1e-5) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} 应接近 ${expected}`,
  );
}

function closeArray(actual, expected, tolerance = 1e-5) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => closeNumber(
    value,
    expected[index],
    tolerance,
  ));
}

function pngDimensions(buffer) {
  assert.equal(
    buffer.subarray(1, 4).toString("ascii"),
    "PNG",
    "预览必须是 PNG",
  );
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

test("Hero v2 精确继承已验收 Massing lineage，不重做或偷换父级", async () => {
  const record = await readJson(recordPath);
  assert.equal(record.assetId, "xinhua-pocket-park");
  assert.equal(
    record.stableAssetId,
    "building:xinhua-road:xinhua-pocket-park",
  );
  assert.equal(record.lineage.derivedFromTier, "massing-v2");
  for (const input of [
    record.lineage.massingBlend,
    record.lineage.massingGlb,
    record.lineage.massingBuildRecord,
    record.lineage.massingMcp1,
    record.lineage.massingMap,
  ]) {
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  assert.equal(record.lineage.massingMcp1.status, "pass-retained");
  assert.equal(record.lineage.massingMap.geometry, "pass-retained");
  assert.equal(
    record.lineage.massingMap.camera,
    "pass-main-window-runtime-v2",
  );
  assert.equal(record.lineage.legacyHeroUsedAsGeometrySource, false);
  assert.equal(record.scope.identityCreated, false);
  assert.equal(record.scope.sharedRegistryModified, false);
  assert.equal(record.scope.sharedRuntimeModified, false);
  assert.equal(record.scope.fastManifestModified, false);
});

test("Hero v2 generator、Blend、GLB 与 build record 指纹闭合", async () => {
  const record = await readJson(recordPath);
  assert.equal(
    await sha256(record.generator.path),
    record.generator.sha256,
  );
  assert.equal(
    (await stat(new URL(record.generator.path, root))).size,
    record.generator.bytes,
  );
  for (const output of [record.outputs.blend, record.outputs.glb]) {
    assert.equal(await sha256(output.path), output.sha256, output.path);
    assert.equal(
      (await stat(new URL(output.path, root))).size,
      output.bytes,
      output.path,
    );
  }
  assert.equal(record.generator.blenderVersion, "5.2.0 LTS");
  assert.equal(record.generator.singleAssetOnly, true);
  assert.match(
    record.generator.command,
    /create_xinhua_pocket_park_hero_v2\.py/,
  );
  assert.equal(record.sourceBlend.editable, true);
  assert.equal(record.sourceBlend.meshObjectCount, 3);
  assert.equal(record.sourceBlend.qaObjectsSaved, 0);
});

test("Hero v2 GLB 保持三组件、四种材料、零贴图和标准根变换", async () => {
  const record = await readJson(recordPath);
  const buffer = await readFile(new URL(record.outputs.glb.path, root));
  const { gltf, metrics } = inspectGlb(buffer);
  for (const key of [
    "bytes",
    "nodes",
    "meshes",
    "primitives",
    "triangles",
    "materials",
    "images",
    "textures",
    "animations",
  ]) {
    assert.equal(metrics[key], record.outputs.glb[key], key);
  }
  closeArray(metrics.bounds.min, record.outputs.glb.bounds.min);
  closeArray(metrics.bounds.max, record.outputs.glb.bounds.max);
  assert.deepEqual(record.outputs.glb.transformedNodes, []);
  assert.deepEqual(
    new Set(gltf.materials.map(({ name }) => name)),
    new Set([
      "xinhua-pocket-park-hero-mirror-light",
      "xinhua-pocket-park-hero-mirror-deep",
      "xinhua-pocket-park-hero-weathering-steel",
      "xinhua-pocket-park-hero-dark-seam",
    ]),
  );
  for (const node of gltf.nodes) {
    for (const transform of ["translation", "rotation", "scale", "matrix"]) {
      assert.equal(node[transform], undefined, `${node.name}.${transform}`);
    }
    assert.equal(
      node.extras.stable_asset_id,
      "building:xinhua-road:xinhua-pocket-park",
    );
    assert.equal(node.extras.tier, "hero");
    assert.equal(
      node.extras.derived_from_massing_glb_sha256,
      record.lineage.massingGlb.sha256,
    );
    assert.equal(node.extras.mcp2_status, "pending-main-window-xhigh");
    assert.equal(node.extras.identity_allowed, false);
  }
});

test("Hero v2 保持 21.8592×3.99168m 包络、双墙和中心通路", async () => {
  const record = await readJson(recordPath);
  const { gltf, metrics } = inspectGlb(
    await readFile(new URL(record.outputs.glb.path, root)),
  );
  closeArray(metrics.bounds.min, [-0.84, 0, -4.6]);
  closeArray(metrics.bounds.max, [0.84, 1.66, 4.6]);
  closeNumber(
    (metrics.bounds.max[0] - metrics.bounds.min[0])
      * record.contract.runtimeScale
      * record.contract.sceneUnitMeters,
    3.99168,
  );
  closeNumber(
    (metrics.bounds.max[2] - metrics.bounds.min[2])
      * record.contract.runtimeScale
      * record.contract.sceneUnitMeters,
    21.8592,
  );
  assert.deepEqual(record.contract.origin, [0, 0, 0]);
  assert.equal(record.contract.authoredFront, "local-negative-y");
  assert.equal(record.contract.glbFront, "local-positive-z");
  assert.equal(record.contract.localObstacles.length, 2);
  assert.equal(
    record.contract.centerPassage.groundLevelCrossingObjects,
    0,
  );
  closeNumber(
    record.contract.centerPassage.runtimeWidthMeters,
    3.23136,
  );

  const boundsByName = Object.fromEntries(
    gltf.nodes.map((node) => [
      node.name,
      meshBounds(gltf, node.mesh),
    ]),
  );
  assert.ok(
    boundsByName["xinhua-pocket-park-hero-left-wall"].max[0]
      <= -0.68 + 1e-5,
  );
  assert.ok(
    boundsByName["xinhua-pocket-park-hero-right-wall"].min[0]
      >= 0.68 - 1e-5,
  );
  assert.ok(
    boundsByName["xinhua-pocket-park-hero-entrance-header"].min[1]
      >= 1.33 - 1e-5,
    "跨越中心的入口顶框必须位于人物头顶以上",
  );
});

test("Hero v2 只含证据可见建筑本体，明确排除旧 Hero 场地代理", async () => {
  const record = await readJson(recordPath);
  const manifest = await readJson(
    "docs/research/xinhua-pocket-park-reference-manifest.json",
  );
  assert.equal(manifest.coverage.canonical, "complete");
  assert.equal(manifest.coverage.entranceOrIdentity, "complete");
  assert.ok(
    manifest.references.some(({ supports }) => (
      supports.includes("continuous mirrored side walls")
      && supports.includes("weathering-steel top profile")
    )),
  );
  assert.ok(record.evidence.observedIdentityCues.length >= 5);
  for (const exclusion of [
    "planting proxies",
    "bench",
    "rotating exhibition panels",
    "ground lights",
    "paving and path slab",
  ]) {
    assert.ok(record.scope.excluded.includes(exclusion), exclusion);
  }
  const gltf = parseGlb(
    await readFile(new URL(record.outputs.glb.path, root)),
  );
  const exportedNames = [
    ...gltf.nodes.map(({ name }) => name),
    ...gltf.materials.map(({ name }) => name),
  ].join(" ").toLowerCase();
  for (const forbidden of [
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
  ]) {
    assert.doesNotMatch(exportedNames, new RegExp(forbidden));
  }
});

test("三机位与三联对照保持候选快照，MCP2 由主窗口记录晋级", async () => {
  const record = await readJson(recordPath);
  for (const preview of Object.values(record.outputs.previews)) {
    const buffer = await readFile(new URL(preview.path, root));
    assert.equal(await sha256(preview.path), preview.sha256);
    assert.equal(buffer.length, preview.bytes);
    assert.deepEqual(pngDimensions(buffer), {
      width: 960,
      height: 720,
    });
  }
  const triptych = await readFile(
    new URL(record.outputs.triptych.path, root),
  );
  assert.equal(
    await sha256(record.outputs.triptych.path),
    record.outputs.triptych.sha256,
  );
  assert.equal(triptych.length, record.outputs.triptych.bytes);
  assert.deepEqual(pngDimensions(triptych), {
    width: 2160,
    height: 520,
  });
  assert.deepEqual(record.outputs.triptych.panels, [
    "reference-research-only",
    "blender-hero-v2-candidate",
    "threejs-accepted-massing-hero-runtime-pending",
  ]);
  assert.equal(
    record.validation.fixedCameraFallback,
    "pass-main-window-fixed-views-and-live-scene",
  );
  assert.equal(record.validation.mcp2, "pass-main-window-xhigh");
  assert.equal(record.validation.identityAuthorized, true);
  assert.equal(
    record.validation.heroRuntime,
    "pending-after-mcp2-and-main-window-integration",
  );
  assert.equal(record.validation.performanceClaimed, false);
});
