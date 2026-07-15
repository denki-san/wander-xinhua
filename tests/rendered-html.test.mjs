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

test("服务端渲染新华信使 3D 闲逛入口", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="zh-CN"/i);
  assert.match(html, /<title>新华信使｜新华路 3D 闲逛<\/title>/i);
  assert.match(html, /开始闲逛/);
  assert.match(html, /非官方独立重建/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("产品源码锁定 WebGL 自由闲逛和唯一行动点", async () => {
  const experience = await readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8");
  const world = await readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(experience, /@react-three\/fiber/);
  assert.match(experience, /<Canvas/);
  assert.match(world, /PlayableMessenger/);
  assert.match(world, /PLANET_RADIUS/);
  assert.equal((world.match(/data-action-point=/g) ?? []).length, 1);
  assert.match(experience, /唯一行动点/);
  assert.doesNotMatch(experience + world, /送出第一张行动邀请|点亮一家街角小店|找到今年的行动地图|故事线/);
  assert.doesNotMatch(experience + world, /login|password|账号|密码/i);
  assert.doesNotMatch(page, /xinhua-game/);
  await assert.rejects(access(new URL("../app/xinhua-game.tsx", import.meta.url)));
});

test("最终运行时代码不引用参考站资产", async () => {
  const experience = await readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8");
  const world = await readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(world, /messenger\.abeto\.co|promptwhisper\/messenger/);
  assert.match(experience, /href="https:\/\/messenger\.abeto\.co\/"/);
  assert.doesNotMatch(experience + world, /\/assets\/|\.drc|\.ktx2|\.ogg/);
});
