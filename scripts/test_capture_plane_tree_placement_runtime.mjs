import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);

function argument(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

const CDP_HTTP = argument("--cdp-http", "http://127.0.0.1:9223").replace(/\/$/, "");
const BASE_URL = argument("--base-url", "http://127.0.0.1:4318").replace(/\/$/, "");
const OUTPUT_DIR = path.resolve(argument(
  "--output-dir",
  "test_artifacts/test_plane_tree_placement_runtime",
));
const LABEL = argument("--label", "candidate");
const WARMUP_MS = Number(argument("--warmup-ms", "3000"));
const SAMPLE_MS = Number(argument("--sample-ms", "5000"));
const VIEWPORT = {
  width: Number(argument("--width", "1200")),
  height: Number(argument("--height", "807")),
  deviceScaleFactor: 1,
  mobile: false,
};
const NETWORK = {
  offline: false,
  latency: 80,
  downloadThroughput: 5_000_000 / 8,
  uploadThroughput: 2_000_000 / 8,
  connectionType: "cellular4g",
};
const PROJECT_ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
const CASES = [
  {
    id: "standard",
    expectedIdentity: 4,
    expectedMassing: 0,
  },
  {
    id: "weak",
    // 新华路树阵切换为 Massing；幸福里的三棵共享梧桐仍使用 A/B/C Identity。
    expectedIdentity: 3,
    expectedMassing: 3,
  },
];
const PLANE_TREE_PATTERN = /\/models\/xinhua-road\/plane-tree(?:-massing)?-[abcd]\.glb/u;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseDatasetList(dataset, key) {
  try {
    return JSON.parse(dataset[key] || "[]");
  } catch {
    return ["invalid-dataset-json"];
  }
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) ?? []) {
        listener(message.params);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, listener) {
    const current = this.listeners.get(method) ?? [];
    current.push(listener);
    this.listeners.set(method, current);
  }

  close() {
    this.socket.close();
  }
}

async function createTarget() {
  const response = await fetch(
    `${CDP_HTTP}/json/new?${encodeURIComponent("about:blank")}`,
    { method: "PUT" },
  );
  if (!response.ok) {
    throw new Error(`创建 Chrome target 失败：${response.status}`);
  }
  return response.json();
}

async function closeTarget(targetId) {
  await fetch(`${CDP_HTTP}/json/close/${targetId}`).catch(() => undefined);
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description
      ?? result.exceptionDetails.text,
    );
  }
  return result.result.value;
}

function attachFailures(client) {
  const consoleEntries = [];
  const networkFailures = [];
  const httpErrors = [];
  client.on("Runtime.consoleAPICalled", ({ type, args: consoleArgs }) => {
    if (type !== "error" && type !== "warning") return;
    consoleEntries.push({
      type,
      text: consoleArgs
        .map((item) => item.value ?? item.description ?? "")
        .join(" "),
    });
  });
  client.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
    consoleEntries.push({
      type: "exception",
      text: exceptionDetails.exception?.description ?? exceptionDetails.text,
    });
  });
  client.on("Network.loadingFailed", (event) => {
    networkFailures.push({
      requestId: event.requestId,
      type: event.type,
      errorText: event.errorText,
      canceled: Boolean(event.canceled),
      blockedReason: event.blockedReason ?? null,
    });
  });
  client.on("Network.responseReceived", ({ requestId, type, response }) => {
    if (response.status < 400) return;
    let ignoredBrowserProbe = false;
    try {
      ignoredBrowserProbe = (
        type === "Other"
        && new URL(response.url).pathname === "/favicon.ico"
      );
    } catch {
      ignoredBrowserProbe = false;
    }
    httpErrors.push({
      requestId,
      type,
      url: response.url,
      status: response.status,
      ignoredBrowserProbe,
    });
  });
  return { consoleEntries, networkFailures, httpErrors };
}

async function waitForStableRuntime(client, timeoutMs = 60_000) {
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    const state = await evaluate(
      client,
      `(() => {
        const perf = window.__XINHUA_PERF__;
        let movement = null;
        try {
          movement = JSON.parse(
            document.documentElement.dataset.xinhuaQaMovement || "null"
          );
        } catch {}
        const perfState = perf?.getState?.();
        return {
          readyState: document.readyState,
          canvas: Boolean(document.querySelector("canvas")),
          mode: perfState?.context?.mode ?? null,
          entry: perfState?.context?.entry ?? null,
          firstPlayable: perfState?.firstPlayable?.entry ?? null,
          movementStatus: movement?.status ?? null,
          visibility: document.visibilityState
        };
      })()`,
    );
    if (
      state?.readyState === "complete"
      && state.canvas
      && state.mode === "explore"
      && state.firstPlayable
      && state.movementStatus === "complete"
      && state.visibility === "visible"
    ) {
      return state;
    }
    await delay(100);
  }
  throw new Error("等待 house315 可玩状态和确定性移动完成超时");
}

function selectedPerformanceMetrics(metrics) {
  const names = new Set([
    "JSHeapUsedSize",
    "Nodes",
    "LayoutCount",
    "RecalcStyleCount",
    "TaskDuration",
  ]);
  return Object.fromEntries(
    metrics
      .filter(({ name }) => names.has(name))
      .map(({ name, value }) => [name, value]),
  );
}

async function runCase(testCase, buildIdentity) {
  const target = await createTarget();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  try {
    await client.connect();
    await Promise.all([
      client.send("Page.enable"),
      client.send("Runtime.enable"),
      client.send("Network.enable"),
      client.send("Performance.enable"),
    ]);
    const failures = attachFailures(client);
    await client.send("Network.clearBrowserCache");
    await client.send("Network.setCacheDisabled", { cacheDisabled: true });
    await client.send("Network.emulateNetworkConditions", NETWORK);
    await client.send("Emulation.setDeviceMetricsOverride", {
      ...VIEWPORT,
      screenWidth: VIEWPORT.width,
      screenHeight: VIEWPORT.height,
    });
    const query = new URLSearchParams({
      start: "house315",
      cameraQa: "1",
      network: testCase.id,
      quality: "high",
      light: "noon",
      effects: "off",
      district: "off",
      perf: "1",
      qaRuntimeTelemetry: "1",
      qaAutoStart: "1",
      qaMove: "forward",
      qaMoveMs: "5600",
      qaMoveTarget: "0.20,79.89",
    });
    const url = `${BASE_URL}/?${query}`;
    await client.send("Page.navigate", { url });
    const playable = await waitForStableRuntime(client);
    const options = {
      warmupMs: WARMUP_MS,
      durationMs: SAMPLE_MS,
      cacheState: "disabled",
      movementRoute: "house315-forward-settled",
      networkCondition: "standard-4g-80ms-5mbps-down-2mbps-up",
      label: `plane-tree-placement-v5-${LABEL}-${testCase.id}`,
    };
    const sample = await evaluate(
      client,
      `window.__XINHUA_PERF__.sample(${JSON.stringify(options)})`,
    );
    const runtime = await evaluate(
      client,
      `(() => {
        const root = document.documentElement;
        const resources = performance.getEntriesByType("resource").map((entry) => ({
          name: entry.name,
          initiatorType: entry.initiatorType,
          startTime: entry.startTime,
          responseEnd: entry.responseEnd,
          duration: entry.duration,
          transferSize: entry.transferSize,
          encodedBodySize: entry.encodedBodySize,
          decodedBodySize: entry.decodedBodySize,
          nextHopProtocol: entry.nextHopProtocol
        }));
        let movement = null;
        try {
          movement = JSON.parse(root.dataset.xinhuaQaMovement || "null");
        } catch {}
        return {
          url: location.href,
          visibility: document.visibilityState,
          movement,
          dataset: { ...root.dataset },
          resources,
          fatalOverlay: Boolean(document.querySelector("[data-nextjs-dialog-overlay]")),
          canvas: Boolean(document.querySelector("canvas"))
        };
      })()`,
    );
    const screenshotResult = await client.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      fromSurface: true,
    });
    const screenshotBytes = Buffer.from(screenshotResult.data, "base64");
    const screenshotName =
      `test_plane_tree_placement_v5_${LABEL}_${testCase.id}_${VIEWPORT.width}x${VIEWPORT.height}.png`;
    const screenshotPath = path.join(OUTPUT_DIR, screenshotName);
    await writeFile(screenshotPath, screenshotBytes);
    const performanceMetrics = await client.send("Performance.getMetrics");
    const planeTreeResources = runtime.resources.filter(({ name }) => (
      PLANE_TREE_PATTERN.test(new URL(name).pathname)
    ));
    const identityResources = planeTreeResources.filter(({ name }) => (
      !name.includes("plane-tree-massing-")
    ));
    const massingResources = planeTreeResources.filter(({ name }) => (
      name.includes("plane-tree-massing-")
    ));
    const telemetry = {
      consoleErrors: parseDatasetList(runtime.dataset, "runtimeQaConsoleErrors"),
      consoleWarnings: parseDatasetList(runtime.dataset, "runtimeQaConsoleWarnings"),
      windowErrors: parseDatasetList(runtime.dataset, "runtimeQaWindowErrors"),
      unhandledRejections: parseDatasetList(
        runtime.dataset,
        "runtimeQaUnhandledRejections",
      ),
    };
    const acceptedHttpErrors = failures.httpErrors.filter(
      ({ ignoredBrowserProbe }) => !ignoredBrowserProbe,
    );
    const acceptance = {
      productionBuild: sample.page.buildMode === "production",
      visibleThroughout: sample.protocol.visibility.visibleThroughout,
      movementComplete: runtime.movement?.status === "complete",
      canvasPresent: runtime.canvas,
      fatalOverlayAbsent: !runtime.fatalOverlay,
      identityRequestCount: identityResources.length,
      massingRequestCount: massingResources.length,
      tierResourcesCorrect: (
        identityResources.length === testCase.expectedIdentity
        && massingResources.length === testCase.expectedMassing
      ),
      consoleErrorCount: failures.consoleEntries.filter(
        ({ type }) => type === "error" || type === "exception",
      ).length + telemetry.consoleErrors.length,
      windowErrorCount: telemetry.windowErrors.length,
      unhandledRejectionCount: telemetry.unhandledRejections.length,
      networkFailureCount: failures.networkFailures.length,
      httpErrorCount: acceptedHttpErrors.length,
      frameCount: sample.frames.frameCount,
    };
    acceptance.passed = (
      acceptance.productionBuild
      && acceptance.visibleThroughout
      && acceptance.movementComplete
      && acceptance.canvasPresent
      && acceptance.fatalOverlayAbsent
      && acceptance.tierResourcesCorrect
      && acceptance.consoleErrorCount === 0
      && acceptance.windowErrorCount === 0
      && acceptance.unhandledRejectionCount === 0
      && acceptance.networkFailureCount === 0
      && acceptance.httpErrorCount === 0
      && acceptance.frameCount >= 120
    );
    const result = {
      schemaVersion: "wander-xinhua.plane-tree-placement-runtime.v1",
      capturedAt: new Date().toISOString(),
      label: LABEL,
      tier: testCase.id,
      buildIdentity,
      protocol: {
        viewport: VIEWPORT,
        network: {
          label: "standard-4g-80ms-5mbps-down-2mbps-up",
          latencyMs: NETWORK.latency,
          downloadMbps: 5,
          uploadMbps: 2,
        },
        cacheState: "disabled",
        warmupMs: WARMUP_MS,
        sampleDurationMs: SAMPLE_MS,
        pageVisibility: "visible",
        route: "house315-forward-settled",
        url,
      },
      playable,
      movement: runtime.movement,
      sample,
      planeTreeResources,
      telemetry,
      cdpConsole: failures.consoleEntries,
      networkFailures: failures.networkFailures,
      httpErrors: failures.httpErrors,
      browserPerformance: selectedPerformanceMetrics(performanceMetrics.metrics),
      screenshot: {
        path: screenshotName,
        bytes: screenshotBytes.length,
        sha256: sha256(screenshotBytes),
      },
      acceptance,
    };
    const jsonPath = path.join(
      OUTPUT_DIR,
      `test_plane_tree_placement_v5_${LABEL}_${testCase.id}.json`,
    );
    await writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
    if (!acceptance.passed) {
      throw new Error(
        `${testCase.id} 运行时验收失败：${JSON.stringify(acceptance)}`,
      );
    }
    return result;
  } finally {
    client.close();
    await closeTarget(target.id);
  }
}

async function main() {
  if (!Number.isFinite(WARMUP_MS) || !Number.isFinite(SAMPLE_MS)) {
    throw new Error("warmup-ms 与 sample-ms 必须是有效数字");
  }
  await mkdir(OUTPUT_DIR, { recursive: false });
  const placementSource = await readFile(
    path.join(PROJECT_ROOT, "app/scene/xinhua-road-placement.mjs"),
  );
  const indexHtml = await readFile(path.join(PROJECT_ROOT, "dist-static/index.html"));
  const buildIdentity = {
    gitSha: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
    }).trim(),
    gitTreeSha: execFileSync("git", ["rev-parse", "HEAD^{tree}"], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
    }).trim(),
    gitStatus: execFileSync("git", ["status", "--short"], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
    }).trim().split("\n").filter(Boolean),
    placementSourceSha256: sha256(placementSource),
    staticIndexSha256: sha256(indexHtml),
    staticIndexBytes: (await stat(
      path.join(PROJECT_ROOT, "dist-static/index.html"),
    )).size,
  };
  const browserVersion = await fetch(`${CDP_HTTP}/json/version`).then((response) => {
    if (!response.ok) throw new Error(`读取 Chrome 版本失败：${response.status}`);
    return response.json();
  });
  const results = [];
  for (const testCase of CASES) {
    results.push(await runCase(testCase, buildIdentity));
  }
  const manifest = {
    schemaVersion: "wander-xinhua.plane-tree-placement-runtime-manifest.v1",
    generatedAt: new Date().toISOString(),
    label: LABEL,
    browser: browserVersion,
    buildIdentity,
    protocol: {
      viewport: VIEWPORT,
      network: "standard-4g-80ms-5mbps-down-2mbps-up",
      cacheState: "disabled",
      warmupMs: WARMUP_MS,
      sampleDurationMs: SAMPLE_MS,
    },
    tiers: Object.fromEntries(results.map((result) => [result.tier, {
      screenshot: result.screenshot,
      frames: result.sample.frames,
      renderer: result.sample.renderer,
      resources: result.planeTreeResources,
      acceptance: result.acceptance,
    }])),
    passed: results.every(({ acceptance }) => acceptance.passed),
  };
  const manifestPath = path.join(
    OUTPUT_DIR,
    `test_plane_tree_placement_v5_${LABEL}_manifest.json`,
  );
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({
    outputDirectory: OUTPUT_DIR,
    manifestPath,
    passed: manifest.passed,
    tiers: Object.fromEntries(results.map((result) => [result.tier, {
      fps: result.sample.frames.fps,
      p95Ms: result.sample.frames.p95Ms,
      frameCount: result.sample.frames.frameCount,
      calls: result.sample.renderer.maximum.drawCalls,
      triangles: result.sample.renderer.maximum.triangles,
      identityRequests: result.acceptance.identityRequestCount,
      massingRequests: result.acceptance.massingRequestCount,
    }])),
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
