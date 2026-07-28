import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);

function argument(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

const CDP_HTTP = argument("--cdp-http", "http://127.0.0.1:9223");
const BASE_URL = argument("--base-url", "http://127.0.0.1:4173");
const OUTPUT_DIR = path.resolve(argument(
  "--output-dir",
  "test_artifacts/performance-baselines/test_issue_2_phase_1_desktop",
));
const RUNS = Number(argument("--runs", "1"));
const WARMUP_MS = Number(argument("--warmup-ms", "5000"));
const SAMPLE_MS = Number(argument("--sample-ms", "10000"));
const VIEWPORT = {
  width: 1440,
  height: 900,
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
const NETWORK_LABEL = "standard-4g-80ms-5mbps-down-2mbps-up";
const BASE_QUERY = "perf=1&quality=high&network=standard&light=noon";
const NORMAL_URL = `${BASE_URL}/?quality=high&network=standard&light=noon`;
const PROJECT_ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
const STATIC_BUILD_ROOT = path.join(PROJECT_ROOT, "dist-static");
const BUILD_IDENTITY_FILE = "test_issue_2_phase_1_build_identity.json";
const CASES = [
  {
    id: "intro",
    expectedMode: "intro",
    url: `${BASE_URL}/?${BASE_QUERY}`,
    movementRoute: "stationary-intro",
  },
  {
    id: "overview",
    expectedMode: "overview",
    url: `${BASE_URL}/?${BASE_QUERY}&qaAutoStart=1`,
    movementRoute: "stationary-overview-spawn",
  },
  {
    id: "xingfuli",
    expectedMode: "explore",
    url: `${BASE_URL}/?${BASE_QUERY}&qaAutoStart=1&start=xingfuli`,
    movementRoute: "stationary-xingfuli-spawn",
  },
];

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function assertOutputDirectoryAbsent() {
  try {
    await access(OUTPUT_DIR);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new Error(`拒绝覆盖已有基线目录：${OUTPUT_DIR}`);
}

async function buildProductionIdentity(gitSha, gitTreeSha) {
  execFileSync("npm", ["run", "build:static"], {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
  });
  const indexHtml = await readFile(
    path.join(STATIC_BUILD_ROOT, "index.html"),
  );
  const identity = {
    schemaVersion: "wander-xinhua.performance-build-identity.v1",
    createdAt: new Date().toISOString(),
    gitSha,
    gitTreeSha,
    buildCommand: "npm run build:static",
    indexHtmlSha256: sha256(indexHtml),
  };
  await writeFile(
    path.join(STATIC_BUILD_ROOT, BUILD_IDENTITY_FILE),
    `${JSON.stringify(identity, null, 2)}\n`,
  );
  return identity;
}

async function verifyServedBuildIdentity(expected) {
  const base = BASE_URL.replace(/\/$/, "");
  const identityResponse = await fetch(
    `${base}/${BUILD_IDENTITY_FILE}?v=${Date.now()}`,
    { cache: "no-store" },
  );
  if (!identityResponse.ok) {
    throw new Error(
      `读取 production build identity 失败：${identityResponse.status}`,
    );
  }
  const servedIdentity = await identityResponse.json();
  const indexResponse = await fetch(
    `${base}/?testBuildIdentity=${encodeURIComponent(expected.gitTreeSha)}`,
    { cache: "no-store" },
  );
  if (!indexResponse.ok) {
    throw new Error(`读取 production index 失败：${indexResponse.status}`);
  }
  const servedIndexSha256 = sha256(Buffer.from(await indexResponse.arrayBuffer()));
  const passed = (
    servedIdentity.gitSha === expected.gitSha
    && servedIdentity.gitTreeSha === expected.gitTreeSha
    && servedIdentity.indexHtmlSha256 === expected.indexHtmlSha256
    && servedIndexSha256 === expected.indexHtmlSha256
  );
  if (!passed) {
    throw new Error(
      `BASE_URL 未服务当前 Git tree 的 production build：${JSON.stringify({
        expected,
        servedIdentity,
        servedIndexSha256,
      })}`,
    );
  }
  return {
    passed,
    expected,
    served: servedIdentity,
    servedIndexSha256,
  };
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

async function waitForEntryPlayable(client, entry, timeoutMs = 60_000) {
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    const state = await evaluate(
      client,
      `(() => {
        const api = window.__XINHUA_PERF__;
        if (!api) return null;
        const state = api.getState();
        return {
          entry: state.context.entry,
          mode: state.context.mode,
          firstPlayableEntry: state.firstPlayable?.entry ?? null,
          visibility: document.visibilityState
        };
      })()`,
    );
    if (
      state?.entry === entry
      && state.firstPlayableEntry === entry
      && state.visibility === "visible"
    ) {
      return state;
    }
    await delay(100);
  }
  throw new Error(`等待 ${entry} first playable 超时`);
}

function attachRuntimeFailureCollectors(client) {
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
  client.on("Network.loadingFailed", ({
    requestId,
    type,
    errorText,
    canceled,
    blockedReason,
  }) => {
    networkFailures.push({
      requestId,
      type,
      errorText,
      canceled: Boolean(canceled),
      blockedReason: blockedReason ?? null,
    });
  });
  client.on("Network.responseReceived", ({ requestId, type, response }) => {
    if (response.status < 400) return;
    let ignoredByBaselineAcceptance = false;
    try {
      // Chrome 会自动探测未配置的 favicon；它不属于页面 first-playable、
      // JS、GLB 或图片渲染资源，但仍完整保留在原始证据中。
      ignoredByBaselineAcceptance = (
        type === "Other"
        && new URL(response.url).pathname === "/favicon.ico"
      );
    } catch {
      ignoredByBaselineAcceptance = false;
    }
    httpErrors.push({
      requestId,
      type,
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      ignoredByBaselineAcceptance,
    });
  });
  return { consoleEntries, networkFailures, httpErrors };
}

function failureCounts({ consoleEntries, networkFailures, httpErrors }) {
  return {
    consoleWarningCount: consoleEntries.filter(
      ({ type }) => type === "warning",
    ).length,
    consoleErrorCount: consoleEntries.filter(
      ({ type }) => type === "error" || type === "exception",
    ).length,
    networkFailureCount: networkFailures.length,
    httpErrorCount: httpErrors.filter(
      ({ ignoredByBaselineAcceptance }) => !ignoredByBaselineAcceptance,
    ).length,
    ignoredBrowserProbeHttpErrorCount: httpErrors.filter(
      ({ ignoredByBaselineAcceptance }) => ignoredByBaselineAcceptance,
    ).length,
  };
}

async function verifyPerfQueryIsolation(
  browserVersion,
  gitSha,
  gitTreeSha,
  buildIdentity,
) {
  const target = await createTarget();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  try {
    await client.connect();
    await Promise.all([
      client.send("Page.enable"),
      client.send("Runtime.enable"),
      client.send("Network.enable"),
    ]);
    const failures = attachRuntimeFailureCollectors(client);
    await client.send("Network.clearBrowserCache");
    await client.send("Network.setCacheDisabled", { cacheDisabled: true });
    await client.send("Network.emulateNetworkConditions", NETWORK);
    await client.send("Emulation.setDeviceMetricsOverride", {
      ...VIEWPORT,
      screenWidth: VIEWPORT.width,
      screenHeight: VIEWPORT.height,
    });
    await client.send("Page.navigate", { url: NORMAL_URL });

    const startedAt = performance.now();
    let normalExperienceReady = false;
    while (performance.now() - startedAt < 60_000) {
      const ready = await evaluate(
        client,
        `document.readyState === "complete" && Boolean(document.querySelector("canvas"))`,
      );
      if (ready) {
        normalExperienceReady = true;
        break;
      }
      await delay(100);
    }
    if (!normalExperienceReady) {
      throw new Error("等待普通 URL Canvas 超时");
    }
    await delay(WARMUP_MS);
    const observed = await evaluate(
      client,
      `(() => ({
        url: window.location.href,
        perfApiType: typeof window.__XINHUA_PERF__,
        panelCount: document.querySelectorAll('[data-performance-diagnostics="true"]').length,
        diagnosticsAssetRequests: performance.getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((name) => name.includes("performance-diagnostics")),
        diagnosticsStyleRuleCount: Array.from(document.styleSheets)
          .flatMap((sheet) => {
            try {
              return Array.from(sheet.cssRules, (rule) => rule.cssText);
            } catch {
              return [];
            }
          })
          .filter((cssText) => (
            cssText.includes("performance-diagnostics")
            || cssText.includes("data-performance-diagnostics")
          )).length
      }))()`,
    );
    const counts = failureCounts(failures);
    const passed = (
      observed.perfApiType === "undefined"
      && observed.panelCount === 0
      && observed.diagnosticsAssetRequests.length === 0
      && observed.diagnosticsStyleRuleCount === 0
      && counts.consoleErrorCount === 0
      && counts.networkFailureCount === 0
      && counts.httpErrorCount === 0
    );
    const result = {
      baselineSchemaVersion: "wander-xinhua.performance-query-isolation.v1",
      capturedAt: new Date().toISOString(),
      gitSha,
      gitTreeSha,
      buildIdentity,
      productionBuild: true,
      browser: browserVersion,
      protocol: {
        viewport: VIEWPORT,
        network: NETWORK_LABEL,
        cacheState: "disabled",
        observationDelayMs: WARMUP_MS,
      },
      observed,
      console: failures.consoleEntries,
      networkFailures: failures.networkFailures,
      httpErrors: failures.httpErrors,
      acceptance: {
        ...counts,
        passed,
      },
    };
    await writeFile(
      path.join(
        OUTPUT_DIR,
        "test_issue_2_phase_1_desktop_query_isolation.json",
      ),
      `${JSON.stringify(result, null, 2)}\n`,
    );
    if (!passed) {
      throw new Error(
        `普通 URL 性能诊断隔离失败：${JSON.stringify(result.acceptance)}`,
      );
    }
    return result;
  } finally {
    client.close();
    await closeTarget(target.id);
  }
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

async function runCase(
  testCase,
  runNumber,
  browserVersion,
  gitSha,
  gitTreeSha,
  buildIdentity,
) {
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
    const failures = attachRuntimeFailureCollectors(client);

    await client.send("Network.clearBrowserCache");
    await client.send("Network.setCacheDisabled", { cacheDisabled: true });
    await client.send("Network.emulateNetworkConditions", NETWORK);
    await client.send("Emulation.setDeviceMetricsOverride", {
      ...VIEWPORT,
      screenWidth: VIEWPORT.width,
      screenHeight: VIEWPORT.height,
    });
    await client.send("Page.navigate", { url: testCase.url });
    const playableState = await waitForEntryPlayable(client, testCase.id);
    const options = {
      warmupMs: WARMUP_MS,
      durationMs: SAMPLE_MS,
      cacheState: "disabled",
      movementRoute: testCase.movementRoute,
      networkCondition: NETWORK_LABEL,
      label: `issue-2-phase-1-${testCase.id}-run-${runNumber}`,
    };
    const sample = await evaluate(
      client,
      `window.__XINHUA_PERF__.sample(${JSON.stringify(options)})`,
    );
    if (sample.page.buildMode !== "production") {
      throw new Error(`拒绝保存非 production 样本：${sample.page.buildMode}`);
    }
    if (
      sample.page.entry !== testCase.id
      || sample.page.mode !== testCase.expectedMode
    ) {
      throw new Error(
        `入口不匹配：期望 ${testCase.id}/${testCase.expectedMode}，`
        + `实际 ${sample.page.entry}/${sample.page.mode}`,
      );
    }
    if (!sample.protocol.visibility.visibleThroughout) {
      throw new Error(`${testCase.id} 采样期间页面不可见`);
    }
    if (sample.frames.frameCount < 30) {
      throw new Error(`${testCase.id} 有效帧不足：${sample.frames.frameCount}`);
    }

    const screenshot = await client.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      fromSurface: true,
    });
    const performanceMetrics = await client.send("Performance.getMetrics");
    const fileStem = `test_issue_2_phase_1_desktop_${testCase.id}_run-${runNumber}`;
    await writeFile(
      path.join(OUTPUT_DIR, `${fileStem}.png`),
      Buffer.from(screenshot.data, "base64"),
    );
    const result = {
      baselineSchemaVersion: "wander-xinhua.performance-baseline.v1",
      capturedAt: new Date().toISOString(),
      gitSha,
      gitTreeSha,
      buildIdentity,
      productionBuild: true,
      browser: browserVersion,
      protocol: {
        viewport: VIEWPORT,
        network: {
          label: NETWORK_LABEL,
          latencyMs: NETWORK.latency,
          downloadMbps: 5,
          uploadMbps: 2,
        },
        cacheState: "disabled",
        warmupMs: WARMUP_MS,
        sampleDurationMs: SAMPLE_MS,
        pageVisibility: "visible",
        movementRoute: testCase.movementRoute,
      },
      playableState,
      sample,
      browserPerformance: selectedPerformanceMetrics(performanceMetrics.metrics),
      console: failures.consoleEntries,
      networkFailures: failures.networkFailures,
      httpErrors: failures.httpErrors,
      acceptance: {
        entryMatched: true,
        productionBuild: true,
        visibleThroughout: true,
        ...failureCounts(failures),
      },
    };
    result.acceptance.passed = (
      result.acceptance.consoleErrorCount === 0
      && result.acceptance.networkFailureCount === 0
      && result.acceptance.httpErrorCount === 0
    );
    await writeFile(
      path.join(OUTPUT_DIR, `${fileStem}.json`),
      `${JSON.stringify(result, null, 2)}\n`,
    );
    if (!result.acceptance.passed) {
      throw new Error(
        `${testCase.id} production 基线验收失败：`
        + `${JSON.stringify(result.acceptance)}`,
      );
    }
    return result;
  } finally {
    client.close();
    await closeTarget(target.id);
  }
}

async function main() {
  if (!Number.isInteger(RUNS) || RUNS < 1) {
    throw new Error("--runs 必须是正整数");
  }
  const gitStatus = execFileSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
  }).trim();
  if (gitStatus) {
    throw new Error(
      "拒绝从非 clean worktree 采集基线；请先提交实现，确保 Git SHA 对应实际 production build。",
    );
  }
  await assertOutputDirectoryAbsent();
  const gitSha = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const gitTreeSha = execFileSync("git", ["rev-parse", "HEAD^{tree}"], {
    encoding: "utf8",
  }).trim();
  const expectedBuildIdentity = await buildProductionIdentity(
    gitSha,
    gitTreeSha,
  );
  const buildIdentity = await verifyServedBuildIdentity(expectedBuildIdentity);
  const browserVersion = await fetch(`${CDP_HTTP}/json/version`).then((response) => {
    if (!response.ok) throw new Error(`读取 Chrome version 失败：${response.status}`);
    return response.json();
  });
  await mkdir(path.dirname(OUTPUT_DIR), { recursive: true });
  await mkdir(OUTPUT_DIR);
  const queryIsolation = await verifyPerfQueryIsolation(
    browserVersion,
    gitSha,
    gitTreeSha,
    buildIdentity,
  );
  const results = [];
  for (const testCase of CASES) {
    for (let runNumber = 1; runNumber <= RUNS; runNumber += 1) {
      results.push(await runCase(
        testCase,
        runNumber,
        browserVersion,
        gitSha,
        gitTreeSha,
        buildIdentity,
      ));
    }
  }
  const manifest = {
    baselineSchemaVersion: "wander-xinhua.performance-baseline-manifest.v1",
    generatedAt: new Date().toISOString(),
    gitSha,
    gitTreeSha,
    buildIdentity,
    noPerformanceImprovementClaim: true,
    queryIsolation,
    protocol: {
      viewport: VIEWPORT,
      network: NETWORK_LABEL,
      cacheState: "disabled",
      warmupMs: WARMUP_MS,
      sampleDurationMs: SAMPLE_MS,
      runsPerEntry: RUNS,
    },
    entries: results.map((result) => ({
      entry: result.sample.page.entry,
      mode: result.sample.page.mode,
      label: result.sample.label,
      frames: result.sample.frames,
      renderer: result.sample.renderer,
      resources: result.sample.resources,
      firstPlayable: result.sample.firstPlayable,
      consoleWarningCount: result.acceptance.consoleWarningCount,
      consoleErrorCount: result.acceptance.consoleErrorCount,
      networkFailureCount: result.acceptance.networkFailureCount,
      httpErrorCount: result.acceptance.httpErrorCount,
      acceptancePassed: result.acceptance.passed,
    })),
  };
  const manifestPath = path.join(
    OUTPUT_DIR,
    "test_issue_2_phase_1_desktop_manifest.json",
  );
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ outputDirectory: OUTPUT_DIR, manifestPath }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
