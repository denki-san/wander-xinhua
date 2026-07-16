import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("静态生产入口加载新华信使 3D 闲逛应用", async () => {
  const html = await readFile(new URL("../dist-static/index.html", import.meta.url), "utf8");
  assert.match(html, /<html[^>]*lang="zh-CN"/i);
  assert.match(html, /<title>新华信使｜新华路 3D 闲逛<\/title>/i);
  assert.match(html, /有边界的手绘 3D 社区街区/i);
  assert.doesNotMatch(html, /手绘 3D 小世界/i);
  assert.match(html, /<script[^>]+src="\/assets\/index-[^"]+\.js"/i);
  assert.match(html, /<link[^>]+href="\/assets\/index-[^"]+\.css"/i);
  assert.doesNotMatch(html, /__VINEXT_RSC|\/dist\/server|127\.0\.0\.1:8790/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("产品源码锁定 WebGL 自由闲逛和唯一行动点", async () => {
  const experience = await readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8");
  const world = await readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(experience, /@react-three\/fiber/);
  assert.match(experience, /<Canvas/);
  assert.match(world, /PlayableMessenger/);
  assert.match(world, /FlatNeighborhood/);
  assert.match(world, /MAP_BOUNDS/);
  assert.match(world, /NeighborhoodBoundary/);
  assert.match(world, /resolvePlanarMovement/);
  assert.doesNotMatch(world, /PLANET_RADIUS|SurfaceAnchor|TinyPlanet/);
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

test("主角使用完整分层 3D 建模而不是几何占位人", async () => {
  const world = await readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8");
  const head = world.slice(world.indexOf("function CharacterHead"), world.indexOf("function MessengerBackpack"));
  const backpack = world.slice(world.indexOf("function MessengerBackpack"), world.indexOf("function CharacterTorso"));

  assert.match(world, /function CharacterHead/);
  assert.match(world, /function CharacterTorso/);
  assert.match(world, /function CharacterArm/);
  assert.match(world, /function CharacterLeg/);
  assert.match(world, /function MessengerBackpack/);
  assert.match(head, /sphereGeometry/);
  assert.match(head, /torusGeometry/);
  assert.match(backpack, /RoundedBox/);
  assert.match(backpack, /torusGeometry/);
  assert.doesNotMatch(world, /capsuleGeometry args=\{\[0\.39, 0\.72/);
});
