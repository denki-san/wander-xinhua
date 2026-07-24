import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const CDP_HTTP = process.env.TEST_CDP_HTTP ?? "http://127.0.0.1:9224";
const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3014";
const OUTPUT_DIR = path.resolve("test_artifacts");
const VIEWPORT = { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false };
const CASES = [
  {
    mode: "baseline",
    file: "test_shanghai-cinema_full-glb_front_runtime_preview.png",
  },
  {
    mode: "hybrid",
    file: "test_shanghai-cinema_hybrid_front_runtime_preview.png",
  },
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
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
      else pending.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
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

async function waitUntilReady(client, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const ready = await evaluate(client, "window.__HYBRID_MODEL_TEST__?.ready === true");
    if (ready) return;
    await delay(250);
  }
  throw new Error("等待正面对比模型加载超时");
}

async function captureCase(client, testCase) {
  const url = `${BASE_URL}/hybrid-model-test?mode=${testCase.mode}&distance=near&view=front`;
  await client.send("Page.navigate", { url });
  await waitUntilReady(client);
  await delay(1200);
  await evaluate(
    client,
    "document.querySelector('aside')?.remove();"
      + "document.querySelector('section > div:last-child')?.remove();"
      + "document.body.dataset.captureReady = 'true';",
  );
  await delay(100);
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    fromSurface: true,
  });
  await writeFile(path.join(OUTPUT_DIR, testCase.file), Buffer.from(screenshot.data, "base64"));
  return {
    mode: testCase.mode,
    url,
    file: testCase.file,
    metrics: await evaluate(client, "window.__HYBRID_MODEL_TEST__"),
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
    client.send("Emulation.setDeviceMetricsOverride", VIEWPORT),
  ]);
  const results = [];
  for (const testCase of CASES) {
    results.push(await captureCase(client, testCase));
  }
  client.close();
  console.log(JSON.stringify({ viewport: VIEWPORT, results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
