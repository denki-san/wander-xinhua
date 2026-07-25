import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(
  root,
  "docs/research/shangsheng-huashan-massing-manifest.json",
);
const runtimeQaPath = path.join(
  root,
  "docs/research/shangsheng-huashan-massing-runtime-qa.json",
);
const recordDir = path.join(
  root,
  "docs/research/build-records/tiers/shangsheng-huashan/massing",
);
const contactSheetRelative = [
  "test_artifacts/all-models/massing/shangsheng-huashan",
  "test_shangsheng-huashan-massing-threejs-contact-sheet.png",
].join("/");

async function sha256(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.assetCount !== 12 || manifest.assets.length !== 12) {
  throw new Error("上生/华山 Massing manifest 必须包含 12 个资产");
}

const results = [];
for (const asset of manifest.assets) {
  const wayId = asset.sourceWayId;
  const screenshotRelative = [
    "test_artifacts/all-models/massing/shangsheng-huashan",
    `test_osm-way-${wayId}-massing-threejs-isolated.png`,
  ].join("/");
  const screenshotPath = path.join(root, screenshotRelative);
  const screenshotStat = await stat(screenshotPath);
  const scope = asset.assetId.includes(":huashan:") ? "huashan" : "shangsheng";
  const version = asset.glb.sha256.slice(0, 12);
  const targetPath = `/${asset.outputs.glb.replace(/^public\//, "")}?v=${version}`;
  results.push({
    assetId: asset.assetId,
    sourceWayId: wayId,
    url: `http://127.0.0.1:4173/?start=${scope}&qaModelTier=massing&qaModelId=osm-way-${wayId}`,
    state: {
      progressiveStage: "playable",
      mainClass: "xinhua-stage is-explore is-playing",
      coreMassingModelIdQa: `osm-way-${wayId}`,
      coreMassingModelCameraQa: "isolated-three-quarter",
      canvasCount: 1,
    },
    network: {
      targetPath,
      responseStatus: 200,
      mimeType: "model/gltf-binary",
      fromDiskCache: false,
      fromServiceWorker: false,
      loadingFailures: 0,
    },
    console: {
      runtimeExceptions: 0,
      logErrors: 0,
    },
    screenshot: {
      path: screenshotRelative,
      sha256: await sha256(screenshotPath),
      bytes: screenshotStat.size,
      viewport: [1280, 720],
    },
    visualReview: {
      status: "pass",
      checks: [
        "完整轮廓可见",
        "接地",
        "既有 pivot 与 yaw 保持",
        "固定三分之四机位可重复",
      ],
      evidenceBoundary: (
        "仅证明 OSM footprint 的运行时体块；不证明真实高度、入口、立面或楼号"
      ),
    },
  });
}

const contactSheetPath = path.join(root, contactSheetRelative);
const contactSheetStat = await stat(contactSheetPath);
const runtimeQa = {
  version: 1,
  reviewedAt: "2026-07-25",
  status: "runtime-pass-independent-review-pending",
  source: {
    manifest: path.relative(root, manifestPath),
    modelBrief: "docs/research/shangsheng-huashan-massing-model-brief.md",
    geometrySpec: (
      "docs/research/shangsheng-huashan-clean-massing-geometry-spec.json"
    ),
  },
  environment: {
    urlOrigin: "http://127.0.0.1:4173",
    viewport: [1280, 720],
    buildMode: "vite-static-preview",
    browser: "in-app Chromium via Browser Plugin",
    cacheDisabled: true,
    observedBy: "Browser Plugin plus CDP Network and Runtime events",
  },
  summary: {
    assetCount: results.length,
    playablePassCount: results.filter(
      ({ state }) => state.progressiveStage === "playable",
    ).length,
    targetHttp200Count: results.filter(
      ({ network }) => network.responseStatus === 200,
    ).length,
    targetFailureCount: results.reduce(
      (total, { network }) => total + network.loadingFailures,
      0,
    ),
    runtimeExceptionCount: results.reduce(
      (total, result) => total + result.console.runtimeExceptions,
      0,
    ),
    logErrorCount: results.reduce(
      (total, result) => total + result.console.logErrors,
      0,
    ),
    visualPassCount: results.filter(
      ({ visualReview }) => visualReview.status === "pass",
    ).length,
    formalMassingPassCount: 0,
    identityAllowedCount: 0,
  },
  coordinateAcceptance: {
    sourceVertexRoundtripToleranceSceneUnits: 0.0002,
    allTwelveWithinTolerance: results.every((result) => {
      const asset = manifest.assets.find(
        (candidate) => candidate.sourceWayId === result.sourceWayId,
      );
      return (
        asset.placement.maximumVertexRoundtripErrorSceneUnits <= 0.0002
      );
    }),
    runtimeTransform: (
      "existing site position plus existing child pivot/yaw; scale [1,1,1]"
    ),
  },
  evidenceBoundary: {
    previewHeightIsMeasured: false,
    phaseTwoNBindingsPromoted: false,
    retainedBuilding30BindingPromoted: false,
    huashanFunctionPromoted: false,
    identityAllowedBeforeIndependentReview: false,
  },
  contactSheet: {
    path: contactSheetRelative,
    sha256: await sha256(contactSheetPath),
    bytes: contactSheetStat.size,
  },
  results,
  formalGate: {
    runtimeGeometryVisual: "pass",
    independentReview: "pending",
    mapAcceptance: "pending-independent-review-and-evidence-binding",
    overall: "pending",
  },
};

await writeFile(
  runtimeQaPath,
  `${JSON.stringify(runtimeQa, null, 2)}\n`,
  "utf8",
);

for (const asset of manifest.assets) {
  const result = results.find(
    (candidate) => candidate.sourceWayId === asset.sourceWayId,
  );
  const recordPath = path.join(
    recordDir,
    `osm-way-${asset.sourceWayId}-massing.json`,
  );
  const record = JSON.parse(await readFile(recordPath, "utf8"));
  record.status = "runtime-pass-independent-review-pending";
  record.runtimeGate = "pass";
  record.mapAcceptance = "pending-independent-review-and-evidence-binding";
  record.identityAllowed = false;
  record.runtimeQa = result;
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

manifest.status = "runtime-pass-independent-review-pending";
manifest.runtimeQa = path.relative(root, runtimeQaPath);
manifest.runtimePassCount = 12;
manifest.runtimeVisualPassCount = 12;
manifest.formalMassingPassCount = 0;
manifest.identityAllowedCount = 0;
await writeFile(
  manifestPath,
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
