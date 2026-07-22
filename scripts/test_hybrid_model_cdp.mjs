import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const CDP_HTTP = process.env.TEST_CDP_HTTP ?? "http://127.0.0.1:9223";
const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3013";
const OUTPUT_DIR = path.resolve("test_artifacts");
const DOWNLOAD_BYTES_PER_SECOND = 5 * 1024 * 1024 / 8;
const DESKTOP_VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false };
const MOBILE_VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 1, mobile: true };
const TEST_CASES = [
  { id: "full-glb-near", mode: "baseline", distance: "near", screenshot: true, viewport: DESKTOP_VIEWPORT },
  { id: "hybrid-far", mode: "hybrid", distance: "far", screenshot: false, viewport: DESKTOP_VIEWPORT },
  { id: "hybrid-medium", mode: "hybrid", distance: "medium", screenshot: false, viewport: DESKTOP_VIEWPORT },
  { id: "hybrid-near", mode: "hybrid", distance: "near", screenshot: true, viewport: DESKTOP_VIEWPORT },
  { id: "full-glb-near-mobile", mode: "baseline", distance: "near", screenshot: true, viewport: MOBILE_VIEWPORT },
  { id: "hybrid-near-mobile", mode: "hybrid", distance: "near", screenshot: true, viewport: MOBILE_VIEWPORT },
];

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function createTarget() {
  const response = await fetch(`${CDP_HTTP}/json/new?${encodeURIComponent("about:blank")}`, {
    method: "PUT",
  });
  if (!response.ok) throw new Error(`创建 CDP Target 失败：${response.status}`);
  return response.json();
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
      for (const listener of this.listeners.get(message.method) ?? []) listener(message.params);
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
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  off(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    this.listeners.set(method, listeners.filter((candidate) => candidate !== listener));
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitForMetrics(client, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const metrics = await evaluate(
      client,
      "window.__HYBRID_MODEL_TEST__ && window.__HYBRID_MODEL_TEST__.ready "
        + "&& window.__HYBRID_MODEL_TEST__.sampleMs >= 4500 "
        + "? window.__HYBRID_MODEL_TEST__ : null",
    );
    if (metrics) return metrics;
    await delay(250);
  }
  return evaluate(client, "window.__HYBRID_MODEL_TEST__ ?? null");
}

async function runCase(client, testCase) {
  const consoleErrors = [];
  const pageErrors = [];
  const glbResponses = new Map();
  const requestIds = new Map();

  const consoleListener = ({ type, args }) => {
    if (type !== "error" && type !== "warning") return;
    consoleErrors.push({
      type,
      text: args.map((argument) => argument.value ?? argument.description ?? "").join(" "),
    });
  };
  const exceptionListener = ({ exceptionDetails }) => {
    pageErrors.push(exceptionDetails.exception?.description ?? exceptionDetails.text);
  };
  const responseListener = ({ requestId, response }) => {
    if (!response.url.includes(".glb")) return;
    requestIds.set(requestId, response.url);
    glbResponses.set(response.url, {
      file: new URL(response.url).pathname.split("/").at(-1),
      status: response.status,
      mimeType: response.mimeType,
      encodedBytes: 0,
    });
  };
  const finishedListener = ({ requestId, encodedDataLength }) => {
    const url = requestIds.get(requestId);
    if (!url) return;
    glbResponses.get(url).encodedBytes = encodedDataLength;
  };

  client.on("Runtime.consoleAPICalled", consoleListener);
  client.on("Runtime.exceptionThrown", exceptionListener);
  client.on("Network.responseReceived", responseListener);
  client.on("Network.loadingFinished", finishedListener);

  await client.send("Emulation.setDeviceMetricsOverride", testCase.viewport);
  await client.send("Network.clearBrowserCache");
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 80,
    downloadThroughput: DOWNLOAD_BYTES_PER_SECOND,
    uploadThroughput: 2 * 1024 * 1024 / 8,
    connectionType: "cellular4g",
  });
  const url = `${BASE_URL}/hybrid-model-test?mode=${testCase.mode}&distance=${testCase.distance}`;
  const navigationStarted = performance.now();
  await client.send("Page.navigate", { url });
  const metrics = await waitForMetrics(client);
  const wallMs = Math.round(performance.now() - navigationStarted);
  await delay(500);

  if (testCase.screenshot) {
    const screenshot = await client.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      fromSurface: true,
    });
    await writeFile(
      path.join(OUTPUT_DIR, `test_shanghai-cinema_${testCase.id}_cdp.png`),
      Buffer.from(screenshot.data, "base64"),
    );
  }

  const webVitals = await client.send("Performance.getMetrics");
  const selectedPerformance = Object.fromEntries(
    webVitals.metrics
      .filter(({ name }) => ["JSHeapUsedSize", "Nodes", "LayoutCount", "RecalcStyleCount"].includes(name))
      .map(({ name, value }) => [name, value]),
  );
  client.off("Runtime.consoleAPICalled", consoleListener);
  client.off("Runtime.exceptionThrown", exceptionListener);
  client.off("Network.responseReceived", responseListener);
  client.off("Network.loadingFinished", finishedListener);
  return {
    id: testCase.id,
    url,
    viewport: testCase.viewport,
    network: {
      latencyMs: 80,
      downloadMbps: 5,
      uploadMbps: 2,
      cacheDisabled: true,
    },
    wallMs,
    metrics,
    glbResponses: [...glbResponses.values()],
    consoleErrors,
    pageErrors,
    performance: selectedPerformance,
  };
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const target = await createTarget();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  await Promise.all([
    client.send("Page.enable"),
    client.send("Runtime.enable"),
    client.send("Network.enable"),
    client.send("Performance.enable"),
  ]);
  const results = [];
  for (const testCase of TEST_CASES) {
    results.push(await runCase(client, testCase));
  }
  client.close();
  const output = {
    generatedAt: new Date().toISOString(),
    browser: await fetch(`${CDP_HTTP}/json/version`).then((response) => response.json()),
    viewports: { desktop: DESKTOP_VIEWPORT, mobile: MOBILE_VIEWPORT },
    results,
  };
  const outputPath = path.join(OUTPUT_DIR, "test_shanghai-cinema_hybrid_metrics.json");
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
