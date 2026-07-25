import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = "docs/research/facility-prototypes-massing-manifest.json";
const qaPath = "docs/research/facility-prototypes-massing-runtime-qa.json";
const reviewPath =
  "docs/research/facility-prototypes-massing-independent-review.md";
const artifactRoot =
  "test_artifacts/all-models/massing/facility-prototypes";
const evidencePath =
  `${artifactRoot}/test_facility-prototypes-massing-browser-evidence.json`;
const mapEvidencePath =
  `${artifactRoot}/test_facility-prototypes-massing-map-browser-evidence.json`;

const readJson = async (relativePath) => JSON.parse(
  await readFile(path.join(root, relativePath), "utf8"),
);
const digest = async (relativePath) => createHash("sha256")
  .update(await readFile(path.join(root, relativePath)))
  .digest("hex");
const writeJson = async (relativePath, data) => writeFile(
  path.join(root, relativePath),
  `${JSON.stringify(data, null, 2)}\n`,
  "utf8",
);

const [manifest, evidence, mapEvidence, review] = await Promise.all([
  readJson(manifestPath),
  readJson(evidencePath),
  readJson(mapEvidencePath),
  readFile(path.join(root, reviewPath), "utf8"),
]);

assert.equal(manifest.assetCount, 15);
assert.equal(manifest.semanticPrototypeCount, 14);
assert.equal(evidence.results.length, 15);
assert.equal(mapEvidence.results.length, 15);
assert.match(review, /正式 Massing.*0\s*\/\s*15|formal Massing.*0\s*\/\s*15/i);

const browserById = new Map(
  evidence.results.map((result) => [result.assetId, result]),
);
const mapBrowserById = new Map(
  mapEvidence.results.map((result) => [result.assetId, result]),
);
const defaultExportGray = [0.800000011920929, 0.800000011920929, 0.800000011920929, 1];
const updatedAssets = [];
const results = [];

for (const asset of manifest.assets) {
  const browser = browserById.get(asset.outputSlug);
  const mapBrowser = mapBrowserById.get(asset.outputSlug);
  assert.ok(browser, `缺少 ${asset.outputSlug} 浏览器证据`);
  assert.ok(mapBrowser, `缺少 ${asset.outputSlug} 地图浏览器证据`);
  assert.equal(browser.targetStatus, 200, asset.outputSlug);
  assert.equal(browser.targetFromDiskCache, false, asset.outputSlug);
  assert.equal(browser.targetFailures, 0, asset.outputSlug);
  assert.equal(browser.exceptions, 0, asset.outputSlug);
  assert.equal(browser.logErrors, 0, asset.outputSlug);
  assert.equal(browser.state.stage, "playable", asset.outputSlug);
  assert.equal(browser.state.facilityId, asset.outputSlug, asset.outputSlug);
  assert.equal(browser.state.canvas.length, 1, asset.outputSlug);
  assert.equal(browser.state.canvas[0].width, 1280, asset.outputSlug);
  assert.equal(browser.state.canvas[0].height, 720, asset.outputSlug);
  assert.match(browser.targetUrl, new RegExp(
    `${asset.outputSlug}-massing\\.glb\\?v=${asset.glb.sha256.slice(0, 12)}$`,
  ));
  assert.equal(mapBrowser.targetStatus, 200, `${asset.outputSlug} map`);
  assert.equal(mapBrowser.targetFromDiskCache, false, `${asset.outputSlug} map`);
  assert.equal(mapBrowser.targetFailures, 0, `${asset.outputSlug} map`);
  assert.equal(mapBrowser.exceptions, 0, `${asset.outputSlug} map`);
  assert.equal(mapBrowser.logErrors, 0, `${asset.outputSlug} map`);
  assert.equal(mapBrowser.state.stage, "playable", `${asset.outputSlug} map`);
  assert.equal(mapBrowser.state.mapId, asset.outputSlug, `${asset.outputSlug} map`);
  assert.equal(mapBrowser.state.canvas.length, 1, `${asset.outputSlug} map`);
  assert.equal(mapBrowser.state.canvas[0].width, 1280, `${asset.outputSlug} map`);
  assert.equal(mapBrowser.state.canvas[0].height, 720, `${asset.outputSlug} map`);
  assert.match(mapBrowser.targetUrl, new RegExp(
    `${asset.outputSlug}-massing\\.glb\\?v=${asset.glb.sha256.slice(0, 12)}$`,
  ));
  for (const [materialName, baseColor] of Object.entries(
    asset.glb.materialBaseColors ?? {},
  )) {
    assert.ok(baseColor, `${materialName} 缺少 baseColor`);
    assert.equal(
      baseColor.every((value, index) => (
        Math.abs(value - defaultExportGray[index]) <= 1e-6
      )),
      false,
      `${materialName} 仍是默认导出灰`,
    );
  }
  const screenshotSha256 = await digest(browser.screenshot);
  const mapScreenshotSha256 = await digest(mapBrowser.screenshot);
  const triptych = (
    `${artifactRoot}/test_${asset.outputSlug}`
    + "-massing-reference-blender-threejs-triptych.png"
  );
  await access(path.join(root, triptych));
  const result = {
    assetId: asset.outputSlug,
    semanticPrototype: asset.semanticSlug,
    glb: {
      file: asset.outputs.glb,
      sha256: asset.glb.sha256,
      materialBaseColors: asset.glb.materialBaseColors,
    },
    runtime: {
      route: (
        "/?start=xingfuli&qaFacilityPrototypeTier=massing"
        + `&qaFacilityPrototypeId=${asset.outputSlug}`
      ),
      stage: browser.state.stage,
      canvas: browser.state.canvas[0],
      targetStatus: browser.targetStatus,
      targetFromDiskCache: browser.targetFromDiskCache,
      targetFailures: browser.targetFailures,
      exceptions: browser.exceptions,
      logErrors: browser.logErrors,
    },
    mapObservation: {
      route: (
        `/?start=${mapBrowser.startId}`
        + "&qaFacilityPrototypeMapTier=massing"
        + `&qaFacilityPrototypeMapId=${asset.outputSlug}`
      ),
      stage: mapBrowser.state.stage,
      canvas: mapBrowser.state.canvas[0],
      targetStatus: mapBrowser.targetStatus,
      targetFromDiskCache: mapBrowser.targetFromDiskCache,
      targetFailures: mapBrowser.targetFailures,
      exceptions: mapBrowser.exceptions,
      logErrors: mapBrowser.logErrors,
      qaOverlay: mapEvidence.qaOverlay,
      placementAccepted: false,
    },
    screenshots: {
      threejs: browser.screenshot,
      threejsSha256: screenshotSha256,
      map: mapBrowser.screenshot,
      mapSha256: mapScreenshotSha256,
      triptych,
      triptychSha256: await digest(triptych),
    },
    isolatedRuntimePass: true,
    mapRuntimeLoadPass: true,
    mapPlacementPass: false,
    formalMassingPass: false,
    pending: [
      "真实地图位置、比例与朝向逐项叠加",
      "碰撞、绕行与入口通行",
    ],
  };
  results.push(result);
  updatedAssets.push({
    ...asset,
    status: "isolated-and-map-load-pass-placement-and-collision-blocked",
    formalMassingPass: false,
    runtimeGate: {
      status: "isolated-and-map-load-passed-placement-and-collision-blocked",
      gallery: "passed",
      mapContextObservation: "captured-load-passed",
      mapPlacement: "blocked-pending-position-scale-yaw-review",
      collisionAndPassage: "pending",
      screenshot: browser.screenshot,
      screenshotSha256,
      mapScreenshot: mapBrowser.screenshot,
      mapScreenshotSha256,
      httpStatus: browser.targetStatus,
      fromDiskCache: browser.targetFromDiskCache,
      runtimeExceptions: browser.exceptions,
      consoleErrors: browser.logErrors,
    },
  });
}

const contactSheets = {
  canonical: `${artifactRoot}/test_facility-prototypes-massing-canonical-contact-sheet.png`,
  side: `${artifactRoot}/test_facility-prototypes-massing-side-contact-sheet.png`,
  threejs: `${artifactRoot}/test_facility-prototypes-massing-threejs-contact-sheet.png`,
  map: `${artifactRoot}/test_facility-prototypes-massing-map-contact-sheet.png`,
};
const contactSheetHashes = Object.fromEntries(
  await Promise.all(
    Object.entries(contactSheets).map(async ([key, file]) => [
      key,
      await digest(file),
    ]),
  ),
);

const qa = {
  version: 2,
  auditedAt: mapEvidence.capturedAt,
  status: "isolated-and-map-load-pass-map-placement-and-collision-blocked",
  scope: {
    semanticPrototypeCount: manifest.semanticPrototypeCount,
    assetCount: manifest.assetCount,
    viewport: evidence.viewport,
    buildMode: evidence.buildMode,
    cacheDisabled: evidence.cacheDisabled,
  },
  inputs: {
    manifest: manifestPath,
    browserEvidence: evidencePath,
    mapBrowserEvidence: mapEvidencePath,
    independentReview: reviewPath,
  },
  summary: {
    blenderGlbAuditPassCount: 15,
    isolatedRuntimePassCount: 15,
    mapRuntimeLoadPassCount: 15,
    http200Count: results.filter(
      (result) => result.runtime.targetStatus === 200,
    ).length,
    diskCacheCount: results.filter(
      (result) => result.runtime.targetFromDiskCache,
    ).length,
    loadingFailureCount: results.reduce(
      (total, result) => total + result.runtime.targetFailures,
      0,
    ),
    runtimeExceptionCount: results.reduce(
      (total, result) => total + result.runtime.exceptions,
      0,
    ),
    consoleErrorCount: results.reduce(
      (total, result) => total + result.runtime.logErrors,
      0,
    ),
    materialDefaultGrayCount: 0,
    mapContextObservationCount: 15,
    mapPlacementPassCount: 0,
    collisionAndPassagePassCount: 0,
    formalMassingPassCount: 0,
  },
  visualEvidence: {
    contactSheets,
    contactSheetHashes,
    triptychCount: 15,
  },
  results,
  formalGateBlockers: [
    "15 个资产虽已生成真实地图上下文截图，但位置、比例和朝向均未获得正式通过；接触表已暴露若干相交、遮挡和范围异常。",
    "设施碰撞、绕行和入口通行尚未完成确定性验收。",
    "喷泉照片仅为园区设施家族证据，不能逐一绑定两个 OSM way。",
    "6 个无主体专用照片的设施只允许保持回退 Massing。",
  ],
};

const updatedManifest = {
  ...manifest,
  status: "massing-isolated-and-map-load-pass-placement-and-collision-blocked",
  formalMassingPassCount: 0,
  isolatedRuntimePassCount: 15,
  runtimeQa: qaPath,
  runtimeIntegration: {
    isolatedGallery: "passed-15-of-15",
    realMapLoad: "passed-15-of-15",
    realMapPlacement: "blocked-0-of-15-formal-pass",
    collisionAndPassage: "pending",
  },
  assets: updatedAssets,
};

await writeJson(qaPath, qa);
await writeJson(manifestPath, updatedManifest);

for (const asset of updatedAssets) {
  const recordPath = (
    "docs/research/build-records/tiers/facility-prototypes/massing/"
    + `${asset.outputSlug}-massing.json`
  );
  const record = await readJson(recordPath);
  await writeJson(recordPath, {
    ...record,
    status: asset.status,
    formalMassingPass: false,
    runtimeGate: asset.runtimeGate,
  });
}

console.log(JSON.stringify(qa.summary, null, 2));
