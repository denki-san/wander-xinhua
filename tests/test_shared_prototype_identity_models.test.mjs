import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

const expectedIdentitySlugs = [
  "cantilever-umbrella",
  "irregular-stone-bollard",
  "lane-lamp-short-arm",
  "outdoor-table-set",
  "rectangular-planter",
  "shanghai-dual-classification-bin",
  "slatted-bench",
  "xinhua-plane-tree",
];

const blockedGenericVegetation = [
  "huashan-canopy-tree",
  "huashan-understory",
  "road-edge-shrub",
  "shangsheng-campus-tree",
];

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function readGlb(path) {
  const buffer = await readFile(new URL(path, root));
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  const jsonLength = buffer.readUInt32LE(12);
  assert.equal(buffer.readUInt32LE(16), 0x4e4f534a);
  return {
    buffer,
    json: JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength)),
  };
}

function triangleCount(gltf) {
  return (gltf.meshes ?? []).reduce(
    (meshTotal, mesh) => meshTotal + mesh.primitives.reduce(
      (primitiveTotal, primitive) => {
        const accessor = primitive.indices
          ?? primitive.attributes.POSITION;
        return primitiveTotal + gltf.accessors[accessor].count / 3;
      },
      0,
    ),
    0,
  );
}

test("共享原型 Identity 严格只包含最终放行的 8 项", async () => {
  const [identity, massing] = await Promise.all([
    readJson("docs/research/shared-prototypes-identity-manifest.json"),
    readJson("docs/research/shared-prototypes-massing-manifest.json"),
  ]);
  const allowedByMassing = massing.assets
    .filter(({ identityAllowed }) => identityAllowed)
    .map(({ slug }) => slug)
    .sort();
  assert.equal(identity.assetCount, 8);
  assert.equal(identity.vegetationAssetCount, 1);
  assert.equal(identity.streetFurnitureAssetCount, 7);
  assert.deepEqual(
    identity.assets.map(({ slug }) => slug).sort(),
    expectedIdentitySlugs,
  );
  assert.deepEqual(allowedByMassing, expectedIdentitySlugs);
  assert.deepEqual(
    [...identity.excludedGenericVegetation].sort(),
    blockedGenericVegetation,
  );
  assert.equal(
    identity.assets.some(({ slug }) => blockedGenericVegetation.includes(slug)),
    false,
  );
});

test("8 个 Identity 资产的哈希、结构、预算与证据边界一致", async () => {
  const manifest = await readJson(
    "docs/research/shared-prototypes-identity-manifest.json",
  );
  let totalBytes = 0;
  let totalTriangles = 0;
  for (const asset of manifest.assets) {
    const recordPath = (
      "docs/research/build-records/tiers/shared-prototypes/identity/"
      + `${asset.slug}-identity.json`
    );
    const [record, glb] = await Promise.all([
      readJson(recordPath),
      readGlb(asset.outputs.glb),
      access(new URL(asset.outputs.blend, root)),
      access(new URL(asset.outputs.previews.canonical, root)),
      access(new URL(asset.outputs.previews.side, root)),
    ]);
    totalBytes += glb.buffer.length;
    totalTriangles += triangleCount(glb.json);
    assert.equal(record.assetId, asset.assetId);
    assert.equal(record.tier, "identity");
    assert.equal(
      record.status,
      "isolated-gallery-passed-map-gates-pending",
    );
    assert.equal(record.formalIdentityPass, false);
    assert.equal(
      record.glb.sha256,
      createHash("sha256").update(glb.buffer).digest("hex"),
    );
    assert.equal(record.glb.bytes, glb.buffer.length);
    assert.equal(record.glb.triangles, triangleCount(glb.json));
    assert.ok(record.glb.triangles <= record.budget.maxTriangles);
    assert.ok(record.glb.nodes <= record.budget.maxNodes);
    assert.ok(record.glb.materials <= record.budget.maxMaterials);
    assert.ok(record.glb.bytes <= record.budget.maxBinaryBytes);
    assert.equal(record.glb.images, 0);
    assert.equal(record.glb.textures, 0);
    assert.equal(record.glb.animations, 0);
    assert.deepEqual(record.glb.transformedNodes, []);
    assert.equal(
      Object.keys(record.glb.materialBaseColors).length,
      record.glb.materials,
    );
    for (const [materialName, baseColor] of Object.entries(
      record.glb.materialBaseColors,
    )) {
      assert.ok(baseColor, `${materialName} 缺少 GLB baseColorFactor`);
      assert.equal(
        baseColor.every(
          (value, index) => Math.abs(
            value - [0.800000011920929, 0.800000011920929, 0.800000011920929, 1][index]
          ) < 1e-6,
        ),
        false,
        `${materialName} 退化为默认导出灰色`,
      );
    }
    assert.equal(
      record.runtimeGate.status,
      "isolated-gallery-passed-map-gates-pending",
    );
    assert.equal(record.runtimeGate.gallery, "passed");
    assert.equal(record.runtimeGate.shapeVisual, "passed");
    assert.equal(
      record.runtimeGate.materialVisual,
      "passed-after-principled-bsdf-export-fix",
    );
    assert.equal(record.runtimeGate.mapPlacement, "not-validated");
    assert.equal(record.runtimeGate.collision, "not-validated");
    assert.ok(record.recognizers.length >= 3);
    assert.ok(record.qualityBoundary.observed.length >= 1);
    assert.ok(record.qualityBoundary.inferred.length >= 1);
    assert.ok(record.qualityBoundary.unknown.length >= 1);
  }
  assert.equal(totalBytes, manifest.totalGlbBytes);
  assert.equal(totalTriangles, manifest.totalTriangles);
  assert.equal(manifest.zeroImageTextureAssetCount, 8);
  assert.equal(manifest.rootTransformCleanAssetCount, 8);
});

test("Identity 联系表存在且正式门保持阻断", async () => {
  const [manifest, brief, review] = await Promise.all([
    readJson("docs/research/shared-prototypes-identity-manifest.json"),
    readFile(
      new URL(
        "docs/research/shared-prototypes-identity-model-brief.md",
        root,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "docs/research/shared-prototypes-identity-independent-review.md",
        root,
      ),
      "utf8",
    ),
    access(
      new URL(
        "test_artifacts/all-models/identity/shared-prototypes/"
          + "test_shared-prototypes-identity-canonical-contact-sheet.png",
        root,
      ),
    ),
    access(
      new URL(
        "test_artifacts/all-models/identity/shared-prototypes/"
          + "test_shared-prototypes-identity-side-contact-sheet.png",
        root,
      ),
    ),
  ]);
  assert.equal(manifest.formalIdentityPassCount, 0);
  assert.equal(manifest.runtimeIntegration.isolatedGallery, "passed-8-of-8");
  assert.equal(manifest.runtimeIntegration.materialVisual, "passed-8-of-8");
  assert.equal(manifest.runtimeIntegration.realMapPlacement, "pending-0-of-8");
  assert.match(brief, /不处理其余 4 个 generic vegetation/);
  assert.match(review, /Blender visual pass: 8 \/ 8/);
  assert.match(review, /Formal Identity pass: 0 \/ 8/);
  assert.match(
    review,
    /runtime, map placement,\s+collision and performance/,
  );
});

test("Identity Three.js gallery 只装载当前 8 个哈希并公开 QA 状态", async () => {
  const [manifest, sceneSource, experienceSource, worldSource] = await Promise.all([
    readJson("docs/research/shared-prototypes-identity-manifest.json"),
    readFile(
      new URL("app/scene/shared-prototype-identity.tsx", root),
      "utf8",
    ),
    readFile(new URL("app/xinhua-experience.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-world.tsx", root), "utf8"),
  ]);
  for (const asset of manifest.assets) {
    assert.ok(
      sceneSource.includes(
        `${asset.slug}-identity.glb?v=${asset.glb.sha256.slice(0, 12)}`,
      ),
      `${asset.slug} 的 gallery URL 未绑定当前 GLB SHA`,
    );
  }
  for (const blocked of blockedGenericVegetation) {
    assert.doesNotMatch(sceneSource, new RegExp(`${blocked}-identity`));
  }
  assert.match(experienceSource, /qaSharedPrototypeTier"\) === "identity"/);
  assert.match(experienceSource, /xinhuaSharedPrototypeTier/);
  assert.match(experienceSource, /data-shared-prototype-identity-qa/);
  assert.match(worldSource, /SharedPrototypeIdentityQaScene/);
  assert.match(worldSource, /SharedPrototypeIdentityQaCamera/);
});

test("Identity 浏览器证据锁定当前哈希、非缓存 HTTP 200 与正式门边界", async () => {
  const [manifest, runtimeQa, evidence] = await Promise.all([
    readJson("docs/research/shared-prototypes-identity-manifest.json"),
    readJson("docs/research/shared-prototypes-identity-runtime-qa.json"),
    readJson(
      "test_artifacts/all-models/identity/shared-prototypes/"
        + "test_shared-prototypes-identity-browser-evidence.json",
    ),
  ]);
  assert.equal(runtimeQa.assetCount, 8);
  assert.equal(runtimeQa.isolatedRuntimePassCount, 8);
  assert.equal(runtimeQa.shapeVisualPassCount, 8);
  assert.equal(runtimeQa.materialVisualPassCount, 8);
  assert.equal(runtimeQa.mapPlacementPassCount, 0);
  assert.equal(runtimeQa.collisionAndPassagePassCount, 0);
  assert.equal(runtimeQa.formalIdentityPassCount, 0);
  assert.equal(evidence.cacheDisabled, true);
  assert.equal(evidence.buildMode, "vite-static-production-preview");
  assert.deepEqual(evidence.groups.vegetation.state.viewport, [1280, 720]);
  assert.equal(evidence.groups.vegetation.state.visibilityState, "visible");

  const expected = new Map(
    manifest.assets.map((asset) => [asset.slug, asset]),
  );
  for (const group of Object.values(evidence.groups)) {
    assert.equal(group.state.stage, "playable");
    assert.equal(group.state.qa, "true");
    assert.equal(group.state.tier, "identity");
    assert.equal(group.state.canvasCount, 1);
    assert.deepEqual(group.runtimeErrors, []);
    assert.deepEqual(group.consoleErrors ?? [], []);
    assert.equal(group.resources.length, 8);
    for (const resource of group.resources) {
      const slug = resource.name.match(/\/([^/]+)-identity\.glb\?v=/)?.[1];
      const asset = expected.get(slug);
      assert.ok(asset);
      assert.equal(resource.responseStatus, 200);
      assert.equal(resource.deliveryType, "");
      assert.equal(resource.encodedBodySize, asset.glb.bytes);
      assert.ok(resource.transferSize > resource.encodedBodySize);
      assert.ok(
        resource.name.endsWith(
          `${slug}-identity.glb?v=${asset.glb.sha256.slice(0, 12)}`,
        ),
      );
    }
  }
});
