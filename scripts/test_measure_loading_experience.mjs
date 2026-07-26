import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const argumentsList = process.argv.slice(2);

function argument(name, fallback) {
  const index = argumentsList.indexOf(name);
  return index >= 0 ? argumentsList[index + 1] : fallback;
}

const cdpUrl = argument("--cdp");
const pageUrl = argument("--url", "http://127.0.0.1:4174/");
const label = argument("--label", "optimized");
const outputDirectory = resolve(argument("--output-dir", "test_artifacts"));
const durationMs = Number(argument("--duration-ms", "35000"));
const blockIdentity = argumentsList.includes("--block-identity");

if (!cdpUrl) throw new Error("缺少 --cdp ws://... 参数");

const viewport = { width: 390, height: 844, deviceScaleFactor: 1, mobile: true };
const network = {
  offline: false,
  latency: 150,
  downloadThroughput: 200_000,
  uploadThroughput: 93_750,
  connectionType: "cellular3g",
};

const socket = new WebSocket(cdpUrl);
const pending = new Map();
const eventListeners = new Set();
let nextId = 1;

await new Promise((resolveOpen, rejectOpen) => {
  socket.addEventListener("open", resolveOpen, { once: true });
  socket.addEventListener("error", rejectOpen, { once: true });
});

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve: resolveCall, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolveCall(message.result);
    return;
  }
  for (const listener of eventListeners) listener(message);
});

function command(method, params = {}, sessionId) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  return new Promise((resolveCall, reject) => {
    pending.set(id, { resolve: resolveCall, reject });
  });
}

const target = await command("Target.createTarget", { url: "about:blank" });
const attached = await command("Target.attachToTarget", {
  targetId: target.targetId,
  flatten: true,
});
const sessionId = attached.sessionId;
const call = (method, params = {}) => command(method, params, sessionId);

await Promise.all([
  call("Page.enable"),
  call("Runtime.enable"),
  call("Network.enable"),
  call("Performance.enable"),
]);
await call("Network.setCacheDisabled", { cacheDisabled: true });
await call("Network.emulateNetworkConditions", network);
if (blockIdentity) {
  await call("Network.setBlockedURLs", {
    urls: ["*rain-summer-wanderer-identity.glb*"],
  });
}
await call("Emulation.setDeviceMetricsOverride", {
  width: viewport.width,
  height: viewport.height,
  deviceScaleFactor: viewport.deviceScaleFactor,
  mobile: viewport.mobile,
  screenWidth: viewport.width,
  screenHeight: viewport.height,
});

const requests = new Map();
const consoleEntries = [];
let navigationStartedAt = Date.now();
eventListeners.add((message) => {
  if (message.sessionId !== sessionId) return;
  const elapsedMs = Date.now() - navigationStartedAt;
  if (message.method === "Network.requestWillBeSent") {
    requests.set(message.params.requestId, {
      url: message.params.request.url,
      type: message.params.type,
      startedAtMs: elapsedMs,
      finishedAtMs: null,
      encodedDataLength: null,
      failed: false,
    });
  }
  if (message.method === "Network.loadingFinished") {
    const request = requests.get(message.params.requestId);
    if (request) {
      request.finishedAtMs = elapsedMs;
      request.encodedDataLength = message.params.encodedDataLength;
    }
  }
  if (message.method === "Network.loadingFailed") {
    const request = requests.get(message.params.requestId);
    if (request) {
      request.finishedAtMs = elapsedMs;
      request.failed = true;
      request.errorText = message.params.errorText;
    }
  }
  if (message.method === "Runtime.consoleAPICalled") {
    consoleEntries.push({
      elapsedMs,
      type: message.params.type,
      text: message.params.args.map((item) => item.value ?? item.description ?? "").join(" "),
    });
  }
  if (message.method === "Runtime.exceptionThrown") {
    consoleEntries.push({
      elapsedMs,
      type: "exception",
      text: message.params.exceptionDetails.text,
    });
  }
});

async function evaluate(expression) {
  const result = await call("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text);
  }
  return result.result.value;
}

async function pageState() {
  return evaluate(`(() => ({
    ready: Boolean(document.querySelector(".intro-start-button")),
    mode: document.querySelector("main")?.className ?? null,
    playable: document.documentElement.dataset.xinhuaPlayable ?? null,
    identityPreloaded:
      document.documentElement.dataset.xinhuaCharacterIdentityPreloaded ?? null,
    characterTier: document.documentElement.dataset.xinhuaCharacterTier ?? null,
    districtChunkCount:
      Number(document.documentElement.dataset.xinhuaDistrictChunkCount ?? "0"),
    districtChunks:
      document.documentElement.dataset.xinhuaDistrictChunksReady ?? "",
  }))()`);
}

async function screenshot(name) {
  const result = await call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(
    resolve(outputDirectory, `test_loading_${label}_${name}.png`),
    Buffer.from(result.data, "base64"),
  );
}

async function waitUntil(predicate, timeoutMs, intervalMs = 100) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await pageState();
    if (predicate(state)) return state;
    await new Promise((resolveWait) => setTimeout(resolveWait, intervalMs));
  }
  throw new Error(`等待页面状态超时：${timeoutMs} ms`);
}

await mkdir(outputDirectory, { recursive: true });
navigationStartedAt = Date.now();
await call("Page.navigate", { url: pageUrl });

const metrics = {
  label,
  pageUrl,
  protocol: {
    viewport,
    network: {
      downloadMbps: 1.6,
      uploadMbps: 0.75,
      latencyMs: network.latency,
      cacheDisabled: true,
    },
    durationMs,
    blockIdentity,
    pageVisibility: "visible",
  },
  navigationStartedAt: new Date(navigationStartedAt).toISOString(),
  timings: {},
  states: [],
  characterTiersObservedAfterClick: [],
};

const readyState = await waitUntil((state) => state.ready, 60_000);
metrics.timings.startButtonMs = Date.now() - navigationStartedAt;
metrics.states.push({ elapsedMs: metrics.timings.startButtonMs, phase: "ready", ...readyState });
await screenshot("intro_ready");

await evaluate(`document.querySelector(".intro-start-button")?.click()`);
const clickedAt = Date.now();
metrics.timings.clickedAtMs = clickedAt - navigationStartedAt;

const observedTiers = new Set();
let firstIdentityMs = null;
let firstHeroMs = null;
let firstProceduralMs = null;
let firstDistrictChunkMs = null;
let allDistrictChunksMs = null;
let captured700 = false;
let captured8s = false;
let capturedFirstChunk = false;
let capturedHero = false;

while (Date.now() - clickedAt <= durationMs) {
  const afterClickMs = Date.now() - clickedAt;
  const state = await pageState();
  if (state.characterTier) observedTiers.add(state.characterTier);
  if (state.characterTier === "identity" && firstIdentityMs === null) {
    firstIdentityMs = afterClickMs;
  }
  if (state.characterTier === "hero" && firstHeroMs === null) {
    firstHeroMs = afterClickMs;
  }
  if (state.characterTier === "procedural" && firstProceduralMs === null) {
    firstProceduralMs = afterClickMs;
  }
  if (state.districtChunkCount >= 1 && firstDistrictChunkMs === null) {
    firstDistrictChunkMs = afterClickMs;
  }
  if (state.districtChunkCount >= 4 && allDistrictChunksMs === null) {
    allDistrictChunksMs = afterClickMs;
  }
  if (!captured700 && afterClickMs >= 700) {
    captured700 = true;
    await screenshot("after_700ms");
  }
  if (!captured8s && afterClickMs >= 8_000) {
    captured8s = true;
    await screenshot("after_8s");
  }
  if (!capturedFirstChunk && state.districtChunkCount >= 1) {
    capturedFirstChunk = true;
    await screenshot("first_district_chunk");
  }
  if (!capturedHero && state.characterTier === "hero") {
    capturedHero = true;
    await screenshot("hero_visible");
  }
  if (metrics.states.length < 240) {
    metrics.states.push({
      elapsedMs: Date.now() - navigationStartedAt,
      afterClickMs,
      phase: "playing",
      ...state,
    });
  }
  await new Promise((resolveWait) => setTimeout(resolveWait, 100));
}

metrics.timings.identityVisibleAfterClickMs = firstIdentityMs;
metrics.timings.heroVisibleAfterClickMs = firstHeroMs;
metrics.timings.proceduralVisibleAfterClickMs = firstProceduralMs;
metrics.timings.firstDistrictChunkAfterClickMs = firstDistrictChunkMs;
metrics.timings.allDistrictChunksAfterClickMs = allDistrictChunksMs;
metrics.characterTiersObservedAfterClick = [...observedTiers];

const resourceEntries = [...requests.values()]
  .filter((request) => request.url.startsWith(pageUrl))
  .sort((left, right) => left.startedAtMs - right.startedAtMs);
metrics.resources = resourceEntries;
metrics.summary = {
  totalEncodedBytes: resourceEntries.reduce(
    (sum, request) => sum + (request.encodedDataLength ?? 0),
    0,
  ),
  localImageRequests: resourceEntries.filter((request) => (
    request.type === "Image" && request.url.includes("/images/")
  )).length,
  poiImageRequests: resourceEntries.filter((request) => (
    request.type === "Image"
    && (
      request.url.includes("/images/poi/")
      || request.url.includes("/images/poi-thumbnails/")
    )
  )).length,
  characterRequests: resourceEntries.filter((request) => (
    request.url.includes("/models/character/")
  )),
  districtRequests: resourceEntries.filter((request) => (
    request.url.includes("/models/overview/xinhua-district-massing")
  )),
  consoleErrorCount: consoleEntries.filter((entry) => (
    entry.type === "error" || entry.type === "exception"
  )).length,
};
metrics.console = consoleEntries;

await screenshot("final");
const metricsPath = resolve(outputDirectory, `test_loading_${label}_metrics.json`);
await writeFile(metricsPath, `${JSON.stringify(metrics, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ metricsPath, timings: metrics.timings, summary: metrics.summary }, null, 2)}\n`);

await command("Target.closeTarget", { targetId: target.targetId });
socket.close();
