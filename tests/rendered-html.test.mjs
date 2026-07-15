import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("服务端渲染新华信使体验入口", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="zh-CN"/i);
  assert.match(html, /<title>新华信使｜幸福里一平米行动地图<\/title>/i);
  assert.match(html, /开始今天的漫游/);
  assert.match(html, /无需登录/);
  assert.match(html, /地图参考 © OpenStreetMap contributors/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("核心任务和地点都保留在产品源码中", async () => {
  const source = await readFile(new URL("../app/xinhua-game.tsx", import.meta.url), "utf8");
  for (const text of [
    "送出第一张行动邀请",
    "点亮一家街角小店",
    "找到今年的行动地图",
    "WAWA 行动入口",
    "幸福里步行街",
    "一方小店",
    "口袋花园",
    "行动地图牌",
  ]) {
    assert.match(source, new RegExp(text));
  }
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  assert.doesNotMatch(source, /login|password|账号|密码/i);
});
