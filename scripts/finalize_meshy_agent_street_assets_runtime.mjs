import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageSlug = "meshy-agent-street-assets";
const manifestPath = path.join(
  root,
  "docs/research/meshy-agent-street-assets-model-manifest.json",
);
const metricsRelativePath =
  "test_artifacts/nonbuilding/meshy-agent-street-assets/test_runtime_metrics.json";
const metrics = JSON.parse(fs.readFileSync(path.join(root, metricsRelativePath), "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function sha256(relativePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(root, relativePath)))
    .digest("hex");
}

const runtimeBySlug = new Map(
  metrics.assets.map((asset) => [asset.slug, asset]),
);

const finalizedAssets = manifest.assets.map((asset) => {
  const runtime = runtimeBySlug.get(asset.slug);
  if (!runtime) throw new Error(`缺少运行时指标：${asset.slug}`);

  const recordPath = path.join(
    root,
    `docs/research/build-records/nonbuilding/${packageSlug}/${asset.slug}-visible-low.json`,
  );
  const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
  const triptych =
    `test_artifacts/nonbuilding/${packageSlug}/test_${asset.slug}-triptych.png`;

  if (sha256(runtime.screenshot) !== runtime.screenshotSha256) {
    throw new Error(`运行时截图 SHA 不一致：${asset.slug}`);
  }

  record.status = "blender-glb-and-isolated-runtime-qa-passed";
  record.outputs.previews.runtime = runtime.screenshot;
  record.outputs.previews.runtimeSha256 = runtime.screenshotSha256;
  record.outputs.previews.triptych = triptych;
  record.outputs.previews.triptychSha256 = sha256(triptych);
  record.gates.visual = "passed-three-way-comparison";
  record.gates.runtime = "passed-isolated-qa";
  record.runtimeGate = {
    status: "passed-isolated-qa",
    qaRoute: "/meshy-street-assets-qa",
    productionPlacement: "not-integrated",
    runtimeMetrics: metricsRelativePath,
    modelScale: metrics.structuralBrowser.modelScale,
    metersPerSceneUnit: metrics.structuralBrowser.metersPerSceneUnit,
    distanceMeters: runtime.distanceMeters,
    state: runtime.state,
    renderReady: runtime.renderReady,
    canvasCount: runtime.canvasCount,
    decodedBodySize: runtime.decodedBodySize,
    visualBrowserViewport: metrics.visualBrowser.viewport,
    structuralBrowserViewport: metrics.structuralBrowser.viewport,
    consoleErrorCount: metrics.structuralBrowser.consoleErrorCount,
    performanceClaim: "none-local-warm-cache-only",
  };

  fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);
  return record;
});

manifest.status = "visible-low-isolated-runtime-qa-passed";
manifest.runtimeIntegration = "isolated-qa-passed-production-placement-pending";
manifest.runtimeMetrics = metricsRelativePath;
manifest.runtimePassedAssetCount = finalizedAssets.length;
manifest.runtimeConsoleErrorCount = metrics.structuralBrowser.consoleErrorCount;
manifest.threeWayComparisonContactSheet =
  `test_artifacts/nonbuilding/${packageSlug}/test_meshy-agent-street-assets-triptych-contact-sheet.png`;
manifest.finalReview = "docs/research/meshy-agent-street-assets-final-review.md";
manifest.assets = finalizedAssets;

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`已完成 ${finalizedAssets.length} 件 Meshy 街景资产的运行时记录回写。`);
