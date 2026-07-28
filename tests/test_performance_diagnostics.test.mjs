import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  calculateFrameMetrics,
  isPerformanceDiagnosticsEnabled,
  normalizeRuntimePerformanceTier,
  summarizeFirstPlayableRequests,
} from "../app/performance/performance-metrics.ts";

test("性能诊断只由 perf=1 显式开启", () => {
  assert.equal(isPerformanceDiagnosticsEnabled("?perf=1"), true);
  assert.equal(isPerformanceDiagnosticsEnabled("?perf=0"), false);
  assert.equal(isPerformanceDiagnosticsEnabled("?quality=high"), false);
});

test("帧样本输出 average、P95、FPS 和 long frame", () => {
  assert.deepEqual(calculateFrameMetrics([10, 16, 16, 18, 20, 34, 40]), {
    frameCount: 7,
    durationMs: 154,
    fps: 45.45,
    averageMs: 22,
    p95Ms: 40,
    minimumMs: 10,
    maximumMs: 40,
    longFrameThresholdMs: 33.33,
    longFrameCount: 2,
    longFrameRatio: 0.2857,
  });
});

test("first playable 请求按 JS、GLB、图片和其他资源汇总", () => {
  const base = {
    initiatorType: "fetch",
    transferSize: 100,
    encodedBodySize: 90,
    decodedBodySize: 100,
    nextHopProtocol: "http/1.1",
  };
  const summary = summarizeFirstPlayableRequests([
    { ...base, name: "/app.js", initiatorType: "script", startTime: 10, responseEnd: 30, duration: 20 },
    { ...base, name: "/x.glb?v=1", startTime: 20, responseEnd: 60, duration: 40 },
    { ...base, name: "/late.webp", initiatorType: "img", startTime: 80, responseEnd: 110, duration: 30 },
  ], 100);
  assert.equal(summary.totals.requestCount, 2);
  assert.equal(summary.byKind.js.requestCount, 1);
  assert.equal(summary.byKind.glb.requestCount, 1);
  assert.equal(summary.byKind.image.requestCount, 0);
  assert.equal(normalizeRuntimePerformanceTier("full"), "hero");
});

test("生产体验懒加载 query-only 面板并提供统一 JSON API", async () => {
  const [experience, diagnostics, styles, captureScript] = await Promise.all([
    readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/performance/performance-diagnostics.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(
      new URL("../scripts/test_capture_performance_baselines.mjs", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(experience, /get\("perf"\) === "1"/);
  assert.match(experience, /import\("\.\/performance\/performance-diagnostics"\)/);
  assert.match(experience, /PerformanceDiagnosticsCanvasProbe/);
  assert.match(experience, /PerformanceDiagnosticsPanel/);
  assert.match(diagnostics, /window\.__XINHUA_PERF__ = \{/);
  assert.match(diagnostics, /xinhua-perf-\$\{entry\}-first-playable/);
  assert.match(diagnostics, /gl\.info\.render\.calls/);
  assert.match(diagnostics, /gl\.info\.memory\.textures/);
  assert.match(diagnostics, /gpuMemoryBytes: null/);
  assert.match(diagnostics, /loadedChunkIds/);
  assert.match(diagnostics, /visibleChunkIds/);
  assert.match(diagnostics, /object-visible-chain-not-camera-frustum/);
  assert.match(
    diagnostics,
    /consecutive-r3f-after-effect-observation-timestamps/,
  );
  assert.match(diagnostics, /frameEndedAtMs: performance\.now\(\)/);
  assert.match(diagnostics, /completedExport\?\.renderer\.last/);
  assert.match(diagnostics, /completedExport\?\.scene/);
  assert.match(diagnostics, /不使用 object\.name 猜资产/);
  assert.doesNotMatch(diagnostics, /object\.name \|\|/);
  assert.match(diagnostics, /liveFrameDurations\.length = 0/);
  assert.match(diagnostics, /latestExport: null/);
  assert.match(styles, /\.performance-diagnostics\s*\{/);
  assert.match(captureScript, /standard-4g-80ms-5mbps-down-2mbps-up/);
  assert.match(captureScript, /qaAutoStart=1&start=xingfuli/);
  assert.match(captureScript, /verifyPerfQueryIsolation/);
  assert.match(captureScript, /buildProductionIdentity/);
  assert.match(captureScript, /verifyServedBuildIdentity/);
  assert.match(captureScript, /Network\.loadingFailed/);
  assert.match(captureScript, /Network\.responseReceived/);
  assert.match(captureScript, /acceptance\.passed/);
  assert.match(captureScript, /ignoredBrowserProbeHttpErrorCount/);
  assert.match(captureScript, /拒绝覆盖已有基线目录/);
  assert.match(captureScript, /拒绝从非 clean worktree 采集基线/);
  assert.match(captureScript, /HEAD\^\{tree\}/);
});
