import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const manifestPath = "docs/research/shared-prototypes-identity-manifest.json";
const runtimeQaPath = "docs/research/shared-prototypes-identity-runtime-qa.json";
const browserEvidencePath = (
  "test_artifacts/all-models/identity/shared-prototypes/"
  + "test_shared-prototypes-identity-browser-evidence.json"
);
const sceneSourcePath = "app/scene/shared-prototype-identity.tsx";
const screenshotByFamily = {
  vegetation: (
    "test_artifacts/all-models/identity/shared-prototypes/"
    + "test_shared-prototypes-identity-threejs-vegetation.jpg"
  ),
  "street-furniture": (
    "test_artifacts/all-models/identity/shared-prototypes/"
    + "test_shared-prototypes-identity-threejs-street-furniture.jpg"
  ),
};

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function fileSha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

function resourceSlug(url) {
  const match = url.match(/\/([^/]+)-identity\.glb\?v=/);
  return match?.[1];
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [manifest, browserEvidence, sceneSource] = await Promise.all([
  readJson(manifestPath),
  readJson(browserEvidencePath),
  readFile(new URL(sceneSourcePath, root), "utf8"),
]);

assert(manifest.assetCount === 8, "Identity manifest 必须严格包含 8 个资产");
assert(
  browserEvidence.cacheDisabled === true,
  "浏览器验收必须关闭缓存",
);
assert(
  browserEvidence.buildMode === "vite-static-production-preview",
  "浏览器验收必须使用静态生产构建",
);

const expectedBySlug = new Map(
  manifest.assets.map((asset) => [asset.slug, asset]),
);
for (const [groupName, groupEvidence] of Object.entries(
  browserEvidence.groups,
)) {
  assert(groupEvidence.state.stage === "playable", `${groupName} 未 playable`);
  assert(groupEvidence.state.qa === "true", `${groupName} 缺 QA 标记`);
  assert(groupEvidence.state.tier === "identity", `${groupName} tier 错误`);
  assert(groupEvidence.state.canvasCount === 1, `${groupName} canvas 数不为 1`);
  assert(
    groupEvidence.state.visibilityState === "visible",
    `${groupName} 页面不可见`,
  );
  assert(
    groupEvidence.runtimeErrors.length === 0,
    `${groupName} 存在运行时异常`,
  );
  assert(
    (groupEvidence.consoleErrors ?? []).length === 0,
    `${groupName} 存在 console error`,
  );
  assert(
    groupEvidence.resources.length === manifest.assetCount,
    `${groupName} GLB 请求数量不是 8`,
  );
  const seen = new Set();
  for (const resource of groupEvidence.resources) {
    const slug = resourceSlug(resource.name);
    const asset = expectedBySlug.get(slug);
    assert(asset, `${groupName} 出现未登记 GLB：${resource.name}`);
    assert(!seen.has(slug), `${groupName} 重复请求资产：${slug}`);
    seen.add(slug);
    assert(resource.responseStatus === 200, `${slug} HTTP 不是 200`);
    assert(resource.deliveryType === "", `${slug} 由缓存或其他通道交付`);
    assert(
      resource.encodedBodySize === asset.glb.bytes,
      `${slug} 运行时 bytes 与 build record 不一致`,
    );
    assert(
      resource.transferSize > resource.encodedBodySize,
      `${slug} 没有形成非缓存网络传输证据`,
    );
    assert(
      resource.name.endsWith(
        `${slug}-identity.glb?v=${asset.glb.sha256.slice(0, 12)}`,
      ),
      `${slug} 运行时 URL 未绑定当前 GLB SHA`,
    );
    assert(
      sceneSource.includes(
        `${slug}-identity.glb?v=${asset.glb.sha256.slice(0, 12)}`,
      ),
      `${slug} gallery 源码未绑定当前 GLB SHA`,
    );
  }
}

const screenshotShaByFamily = Object.fromEntries(
  await Promise.all(
    Object.entries(screenshotByFamily).map(async ([family, path]) => [
      family,
      await fileSha256(path),
    ]),
  ),
);

const results = manifest.assets.map((asset) => {
  const screenshot = screenshotByFamily[asset.family];
  const runtimeGate = {
    status: "isolated-gallery-passed-map-gates-pending",
    gallery: "passed",
    shapeVisual: "passed",
    materialVisual: "passed-after-principled-bsdf-export-fix",
    group: asset.family,
    screenshot,
    screenshotSha256: screenshotShaByFamily[asset.family],
    httpStatus: 200,
    cacheDisabled: true,
    runtimeErrors: 0,
    consoleErrors: 0,
    mapPlacement: "not-validated",
    collision: "not-validated",
    performance: "isolated-resource-timing-only-no-map-baseline",
  };
  return {
    slug: asset.slug,
    assetId: asset.assetId,
    family: asset.family,
    glbSha256: asset.glb.sha256,
    glbBytes: asset.glb.bytes,
    isolatedRuntimePass: true,
    shapeVisualPass: true,
    materialVisualPass: true,
    formalIdentityPass: false,
    runtimeGate,
  };
});

const runtimeQa = {
  version: 1,
  auditedAt: "2026-07-25",
  status: "isolated-gallery-pass-map-placement-collision-performance-pending",
  tier: "identity",
  assetCount: manifest.assetCount,
  isolatedRuntimePassCount: manifest.assetCount,
  shapeVisualPassCount: manifest.assetCount,
  materialVisualPassCount: manifest.assetCount,
  mapPlacementPassCount: 0,
  collisionAndPassagePassCount: 0,
  formalIdentityPassCount: 0,
  routes: {
    vegetation: "?qaSharedPrototypeTier=identity&qaSharedPrototypeGroup=vegetation",
    streetFurniture: (
      "?qaSharedPrototypeTier=identity"
      + "&qaSharedPrototypeGroup=street-furniture"
    ),
  },
  browserEvidence: browserEvidencePath,
  sampling: {
    buildMode: browserEvidence.buildMode,
    cacheDisabled: browserEvidence.cacheDisabled,
    warmupMs: browserEvidence.warmupMs,
    viewport: browserEvidence.groups.vegetation.state.viewport,
    devicePixelRatio: (
      browserEvidence.groups.vegetation.state.devicePixelRatio
    ),
    visibilityState: (
      browserEvidence.groups.vegetation.state.visibilityState
    ),
    performanceBoundary: browserEvidence.performance,
    networkLoadingBoundary: browserEvidence.networkLoadingBoundary,
  },
  screenshots: Object.fromEntries(
    Object.entries(screenshotByFamily).map(([family, file]) => [
      family,
      {
        file,
        sha256: screenshotShaByFamily[family],
      },
    ]),
  ),
  results,
  blockers: [
    "8 个共享原型尚未逐实例验证真实地图 position、scale 与 yaw。",
    "碰撞体、通行净空与遮挡尚未在真实地图中验证。",
    "只有隔离页资源时序，没有同条件真实地图性能基线。",
    "两个视觉分组都会预载全部 8 个 GLB，不能作为按组加载优化证据。",
    "因此 isolated gallery 通过不等于 formal Identity 通过。",
  ],
};

for (const asset of manifest.assets) {
  const result = results.find(({ slug }) => slug === asset.slug);
  asset.status = "isolated-gallery-passed-map-gates-pending";
  asset.formalIdentityPass = false;
  asset.runtimeGate = result.runtimeGate;
  const recordPath = (
    "docs/research/build-records/tiers/shared-prototypes/identity/"
    + `${asset.slug}-identity.json`
  );
  await writeFile(
    new URL(recordPath, root),
    `${JSON.stringify(asset, null, 2)}\n`,
  );
}

manifest.status = (
  "identity-isolated-runtime-pass-map-placement-collision-performance-pending"
);
manifest.runtimeQa = runtimeQaPath;
manifest.isolatedRuntimePassCount = manifest.assetCount;
manifest.shapeVisualPassCount = manifest.assetCount;
manifest.materialVisualPassCount = manifest.assetCount;
manifest.mapPlacementPassCount = 0;
manifest.collisionAndPassagePassCount = 0;
manifest.formalIdentityPassCount = 0;
manifest.runtimeIntegration = {
  isolatedGallery: "passed-8-of-8",
  materialVisual: "passed-8-of-8",
  realMapPlacement: "pending-0-of-8",
  collisionAndPassage: "pending-0-of-8",
  performance: "isolated-resource-timing-only-no-map-baseline",
};

await Promise.all([
  writeFile(
    new URL(runtimeQaPath, root),
    `${JSON.stringify(runtimeQa, null, 2)}\n`,
  ),
  writeFile(
    new URL(manifestPath, root),
    `${JSON.stringify(manifest, null, 2)}\n`,
  ),
]);

console.log(
  "Identity runtime QA finalized: isolated=8/8, material=8/8, formal=0/8",
);
