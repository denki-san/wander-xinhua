import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const CDP_HTTP = process.env.TEST_CDP_HTTP ?? "http://127.0.0.1:9227";
const BASE_URL = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3017";
const OUTPUT_DIR = path.resolve("test_artifacts");
const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false };
const STANDARD_NETWORK = {
  id: "standard-4g",
  latencyMs: 80,
  downloadMbps: 5,
  uploadMbps: 2,
};
const WEAK_NETWORK = {
  id: "weak-network",
  latencyMs: 160,
  downloadMbps: 1,
  uploadMbps: 0.5,
};

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
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  }
  return result.result.value;
}

async function waitFor(client, expression, timeoutMs = 90000) {
  const started = performance.now();
  while (performance.now() - started < timeoutMs) {
    const value = await evaluate(client, expression);
    if (value) return value;
    await delay(100);
  }
  throw new Error(`等待浏览器条件超时：${expression}`);
}

async function progressiveSnapshot(client) {
  return evaluate(
    client,
    "(() => {"
      + "const current = window.__PROGRESSIVE_LOD_TEST__;"
      + "if (!current) return null;"
      + "const { setDistance, ...snapshot } = current;"
      + "return snapshot;"
      + "})()",
  );
}

async function setDistance(client, distance) {
  const wallStarted = performance.now();
  const sequence = await evaluate(
    client,
    `window.__PROGRESSIVE_LOD_TEST__.setDistance(${JSON.stringify(distance)})`,
  );
  await waitFor(
    client,
    `window.__PROGRESSIVE_LOD_TEST__?.controls.some(`
      + `(probe) => probe.sequence === ${sequence} && probe.appliedMs !== null)`,
  );
  return {
    sequence,
    wallResponseMs: Number((performance.now() - wallStarted).toFixed(1)),
  };
}

async function capture(client, file) {
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    fromSurface: true,
  });
  await writeFile(path.join(OUTPUT_DIR, file), Buffer.from(screenshot.data, "base64"));
}

function throughput(megabitsPerSecond) {
  return megabitsPerSecond * 1024 * 1024 / 8;
}

async function openCase(url, network) {
  const target = await createTarget();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();

  const consoleMessages = [];
  const pageErrors = [];
  const resourceResponses = new Map();
  const requestUrls = new Map();

  client.on("Runtime.consoleAPICalled", ({ type, args }) => {
    if (type !== "error" && type !== "warning") return;
    consoleMessages.push({
      type,
      text: args.map((argument) => argument.value ?? argument.description ?? "").join(" "),
    });
  });
  client.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
    pageErrors.push(exceptionDetails.exception?.description ?? exceptionDetails.text);
  });
  client.on("Network.responseReceived", ({ requestId, response }) => {
    if (!response.url.includes(".glb")) return;
    requestUrls.set(requestId, response.url);
    resourceResponses.set(response.url, {
      file: new URL(response.url).pathname.split("/").at(-1),
      status: response.status,
      mimeType: response.mimeType,
      encodedBytes: 0,
    });
  });
  client.on("Network.loadingFinished", ({ requestId, encodedDataLength }) => {
    const url = requestUrls.get(requestId);
    if (!url) return;
    const response = resourceResponses.get(url);
    if (response) response.encodedBytes = encodedDataLength;
  });

  await Promise.all([
    client.send("Page.enable"),
    client.send("Runtime.enable"),
    client.send("Network.enable"),
    client.send("Performance.enable"),
    client.send("Emulation.setDeviceMetricsOverride", VIEWPORT),
  ]);
  await client.send("Network.clearBrowserCache");
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: network.latencyMs,
    downloadThroughput: throughput(network.downloadMbps),
    uploadThroughput: throughput(network.uploadMbps),
    connectionType: "cellular4g",
  });
  const navigationStarted = performance.now();
  await client.send("Page.navigate", { url });

  return {
    client,
    navigationStarted,
    consoleMessages,
    pageErrors,
    resourceResponses,
    async close() {
      try {
        await client.send("Page.close");
      } catch {
        client.close();
      }
    },
  };
}

function controlSummary(controls) {
  const values = controls
    .map(({ responseMs }) => responseMs)
    .filter((value) => typeof value === "number")
    .sort((a, b) => a - b);
  if (!values.length) return { count: 0, medianMs: null, maxMs: null };
  return {
    count: values.length,
    medianMs: values[Math.floor(values.length / 2)],
    maxMs: values.at(-1),
  };
}

async function pageResourceSummary(client) {
  const resources = await evaluate(
    client,
    "performance.getEntriesByType('resource').map((entry) => ({"
      + "file: new URL(entry.name).pathname.split('/').at(-1) || '/',"
      + "type: entry.initiatorType,"
      + "durationMs: Number(entry.duration.toFixed(1)),"
      + "transferBytes: entry.transferSize,"
      + "decodedBytes: entry.decodedBodySize"
      + "}))",
  );
  const sorted = [...resources].sort((a, b) => b.transferBytes - a.transferBytes);
  return {
    count: resources.length,
    transferBytes: resources.reduce((sum, resource) => sum + resource.transferBytes, 0),
    decodedBytes: resources.reduce((sum, resource) => sum + resource.decodedBytes, 0),
    largest: sorted.slice(0, 8),
  };
}

async function runProgressiveStandard() {
  const url = `${BASE_URL}/hybrid-model-test?mode=progressive&policy=auto`;
  const testCase = await openCase(url, STANDARD_NETWORK);
  const { client } = testCase;
  const externalControls = [];
  const probeDistance = async (distance) => {
    externalControls.push(await setDistance(client, distance));
  };
  try {
    await waitFor(client, "window.__PROGRESSIVE_LOD_TEST__?.ready === true");
    const playableWallMs = Math.round(performance.now() - testCase.navigationStarted);
    const requestsAtPlayable = [...testCase.resourceResponses.values()];
    await capture(client, "test_shanghai-cinema_progressive_route_massing.png");

    await probeDistance(55);
    await waitFor(
      client,
      "window.__PROGRESSIVE_LOD_TEST__?.stageTimes.identityVisibleMs !== null",
    );
    await capture(client, "test_shanghai-cinema_progressive_route_identity.png");

    const transitionsBeforeBoundaryProbe = (
      await progressiveSnapshot(client)
    ).transitions.length;
    for (const distance of [61, 59, 62, 60, 55]) {
      await probeDistance(distance);
    }
    const transitionsAfterBoundaryProbe = (
      await progressiveSnapshot(client)
    ).transitions.length;

    await probeDistance(34);
    await waitFor(
      client,
      "window.__PROGRESSIVE_LOD_TEST__?.stageTimes.fullRequestedMs !== null",
    );
    let probeIndex = 0;
    const fullProbeDeadline = performance.now() + 60000;
    while (true) {
      const current = await progressiveSnapshot(client);
      if (current.stageTimes.fullVisibleMs !== null) break;
      if (performance.now() > fullProbeDeadline) throw new Error("等待 Full 渐进升级超时");
      await probeDistance(probeIndex % 2 === 0 ? 34 : 39);
      probeIndex += 1;
      await delay(120);
    }
    await delay(600);
    await capture(client, "test_shanghai-cinema_progressive_route_full.png");

    const snapshot = await progressiveSnapshot(client);
    const resources = await pageResourceSummary(client);
    return {
      id: "progressive-standard",
      url,
      network: STANDARD_NETWORK,
      viewport: VIEWPORT,
      playableWallMs,
      requestsAtPlayable,
      boundaryProbe: {
        distances: [61, 59, 62, 60, 55],
        transitionsBefore: transitionsBeforeBoundaryProbe,
        transitionsAfter: transitionsAfterBoundaryProbe,
        stable: transitionsBeforeBoundaryProbe === transitionsAfterBoundaryProbe,
      },
      snapshot,
      controls: {
        inPage: controlSummary(snapshot.controls),
        cdpWall: controlSummary(externalControls.map(({ wallResponseMs }) => ({
          responseMs: wallResponseMs,
        }))),
      },
      resources,
      glbResponses: [...testCase.resourceResponses.values()],
      consoleMessages: testCase.consoleMessages,
      pageErrors: testCase.pageErrors,
    };
  } finally {
    await testCase.close();
  }
}

async function runProgressiveWeak() {
  const url = `${BASE_URL}/hybrid-model-test?mode=progressive&policy=save-data`;
  const testCase = await openCase(url, WEAK_NETWORK);
  const { client } = testCase;
  const externalControls = [];
  const probeDistance = async (distance) => {
    externalControls.push(await setDistance(client, distance));
  };
  try {
    await waitFor(client, "window.__PROGRESSIVE_LOD_TEST__?.ready === true");
    const playableWallMs = Math.round(performance.now() - testCase.navigationStarted);
    const requestsAtPlayable = [...testCase.resourceResponses.values()];
    await probeDistance(55);
    let probeIndex = 0;
    const identityProbeDeadline = performance.now() + 60000;
    while (true) {
      const current = await progressiveSnapshot(client);
      if (current.stageTimes.identityVisibleMs !== null) break;
      if (performance.now() > identityProbeDeadline) throw new Error("等待弱网 Identity 升级超时");
      await probeDistance(probeIndex % 2 === 0 ? 55 : 57);
      probeIndex += 1;
      await delay(120);
    }
    await probeDistance(34);
    for (const distance of [33, 35, 39, 34]) {
      await probeDistance(distance);
    }
    await delay(1200);
    await capture(client, "test_shanghai-cinema_progressive_weak_detail.png");
    const snapshot = await progressiveSnapshot(client);
    const resources = await pageResourceSummary(client);
    return {
      id: "progressive-weak-save-data",
      url,
      network: WEAK_NETWORK,
      viewport: VIEWPORT,
      playableWallMs,
      requestsAtPlayable,
      snapshot,
      controls: {
        inPage: controlSummary(snapshot.controls),
        cdpWall: controlSummary(externalControls.map(({ wallResponseMs }) => ({
          responseMs: wallResponseMs,
        }))),
      },
      resources,
      glbResponses: [...testCase.resourceResponses.values()],
      consoleMessages: testCase.consoleMessages,
      pageErrors: testCase.pageErrors,
    };
  } finally {
    await testCase.close();
  }
}

async function runFullFirstBaseline() {
  const url = `${BASE_URL}/hybrid-model-test?mode=baseline&distance=near&view=front`;
  const testCase = await openCase(url, STANDARD_NETWORK);
  const { client } = testCase;
  try {
    await waitFor(client, "window.__HYBRID_MODEL_TEST__?.ready === true");
    const readyWallMs = Math.round(performance.now() - testCase.navigationStarted);
    await delay(600);
    const metrics = await evaluate(client, "window.__HYBRID_MODEL_TEST__");
    const resources = await pageResourceSummary(client);
    await capture(client, "test_shanghai-cinema_progressive_full-first_baseline.png");
    return {
      id: "full-first-baseline",
      url,
      network: STANDARD_NETWORK,
      viewport: VIEWPORT,
      readyWallMs,
      metrics,
      resources,
      glbResponses: [...testCase.resourceResponses.values()],
      consoleMessages: testCase.consoleMessages,
      pageErrors: testCase.pageErrors,
    };
  } finally {
    await testCase.close();
  }
}

function validate(results) {
  const [standard, weak, baseline] = results;
  assert.equal(standard.requestsAtPlayable.length, 0, "Massing 首次可玩时不应已有 GLB 响应");
  assert.equal(standard.boundaryProbe.stable, true, "60 单位边界抖动不应反复切换 LOD");
  assert.deepEqual(
    standard.glbResponses.map(({ file }) => file).sort(),
    ["shanghai-cinema-hybrid-identity.glb", "shanghai-cinema.glb"].sort(),
    "标准网络应依次请求 Identity 与 Full",
  );
  assert.equal(standard.snapshot.activeVisual, "full");
  assert.ok(
    standard.controls.cdpWall.maxMs < 500,
    "Full 下载与解析期间控制响应应保持在 500ms 内",
  );
  assert.equal(weak.requestsAtPlayable.length, 0, "弱网 Massing 首次可玩时不应已有 GLB 响应");
  assert.equal(weak.snapshot.allowFull, false);
  assert.equal(weak.snapshot.stageTimes.fullRequestedMs, null);
  assert.deepEqual(
    weak.glbResponses.map(({ file }) => file),
    ["shanghai-cinema-hybrid-identity.glb"],
    "省流模式只应请求 Identity",
  );
  assert.ok(weak.controls.cdpWall.maxMs < 500, "弱网加载期间控制响应应保持在 500ms 内");
  assert.equal(baseline.glbResponses[0]?.file, "shanghai-cinema.glb");
  assert.ok(
    standard.playableWallMs < baseline.readyWallMs * 0.5,
    "渐进方案首次可玩时间应显著快于 Full-first",
  );
  assert.ok(results.every(({ pageErrors }) => pageErrors.length === 0));
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await fetch(`${CDP_HTTP}/json/version`).then((response) => response.json());
  const results = [];
  results.push(await runProgressiveStandard());
  results.push(await runProgressiveWeak());
  results.push(await runFullFirstBaseline());
  validate(results);
  const output = {
    generatedAt: new Date().toISOString(),
    browser,
    buildMode: "vinext production",
    results,
  };
  const outputPath = path.join(
    OUTPUT_DIR,
    "test_shanghai-cinema_progressive_experiment_metrics.json",
  );
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
