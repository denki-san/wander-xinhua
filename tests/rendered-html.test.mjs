import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
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
  const xingfuli = await readFile(new URL("../app/scene/xingfuli-block.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(experience, /@react-three\/fiber/);
  assert.match(experience, /<Canvas/);
  assert.match(world, /PlayableMessenger/);
  assert.match(world, /FlatNeighborhood/);
  assert.match(world, /MAP_BOUNDS/);
  assert.match(world, /NeighborhoodBoundary/);
  assert.match(world, /resolvePlanarMovement/);
  assert.doesNotMatch(world, /PLANET_RADIUS|SurfaceAnchor|TinyPlanet/);
  assert.equal(((world + xingfuli).match(/data-action-point=/g) ?? []).length, 1);
  assert.match(experience, /唯一行动点/);
  assert.doesNotMatch(experience + world, /送出第一张行动邀请|点亮一家街角小店|找到今年的行动地图|故事线/);
  assert.doesNotMatch(experience + world, /login|password|账号|密码/i);
  assert.doesNotMatch(page, /xinhua-game/);
  await assert.rejects(access(new URL("../app/xinhua-game.tsx", import.meta.url)));
});

test("最终运行时代码不引用参考站资产", async () => {
  const experience = await readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8");
  const world = await readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8");
  const xingfuli = await readFile(new URL("../app/scene/xingfuli-block.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(world, /messenger\.abeto\.co|promptwhisper\/messenger/);
  assert.match(experience, /href="https:\/\/messenger\.abeto\.co\/"/);
  assert.doesNotMatch(experience + world + xingfuli, /\/assets\/|\.drc|\.ktx2|\.ogg|bdimg|bcebos|openstreetmap/);

  const assets = await readdir(new URL("../dist-static/assets/", import.meta.url));
  const javascript = await Promise.all(
    assets.filter((name) => name.endsWith(".js"))
      .map((name) => readFile(new URL(`../dist-static/assets/${name}`, import.meta.url), "utf8")),
  );
  assert.doesNotMatch(javascript.join("\n"), /bdimg|bcebos|openstreetmap|poi-pic|\.drc|\.ktx2|\.ogg/i);
});

test("幸福里使用七栋固定建筑和可识别的核心街具", async () => {
  const world = await readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8");
  const xingfuli = await readFile(new URL("../app/scene/xingfuli-block.tsx", import.meta.url), "utf8");
  const layout = JSON.parse(await readFile(new URL("../app/scene/xingfuli-layout.json", import.meta.url), "utf8"));

  assert.match(world, /<XingfuliBlock \/>/);
  assert.match(world, /\.\.\.XINGFULI_OBSTACLES/);
  assert.equal(layout.buildings.length, 7);
  assert.deepEqual(layout.buildings.map((building) => building.side), [
    "north", "north", "north", "north", "south", "south", "south",
  ]);
  assert.deepEqual(layout.buildings.map((building) => building.floors), [3, 4, 4, 3, 3, 2, 3]);
  assert.deepEqual(layout.buildings.map((building) => building.feature), [
    "bands", "bay", "balcony", "glass", "mural", "pavilion", "timber",
  ]);
  assert.equal(new Set(layout.buildings.map((building) => `${building.x}:${building.z}`)).size, 7);
  assert.ok(layout.buildings.every((building) => /^#[0-9a-f]{6}$/i.test(building.wall)));
  assert.ok(layout.buildings.every((building) => !/^[A-F7]$/.test(building.id)));
  assert.match(xingfuli, /function ReflectingPool/);
  assert.match(xingfuli, /function VerticalGarden/);
  assert.match(xingfuli, /function GardenInstances/);
  assert.match(xingfuli, /function EntranceMural/);
  assert.match(xingfuli, /function LaneLamp/);
  assert.match(xingfuli, /function Bench/);
  assert.match(xingfuli, /function CafeCluster/);
  assert.match(xingfuli, /番禺路入口右侧的白色玻璃转角体量/);
  assert.match(xingfuli, /sign \* 0\.082/);
  assert.match(xingfuli, /data-neighborhood="xingfuli"/);
  assert.doesNotMatch(xingfuli, /瑞幸|星巴克|FASCINO|Minecraft/i);
});

test("角色边界与可见围墙内表面对齐", async () => {
  const world = await readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8");
  const maxX = Number(world.match(/MAP_BOUNDS = \{ minX: -[\d.]+, maxX: ([\d.]+)/)?.[1]);
  const maxZ = Number(world.match(/maxZ: ([\d.]+) \} as const/)?.[1]);
  const radius = Number(world.match(/PLAYER_RADIUS = ([\d.]+)/)?.[1]);
  const wallX = Number(world.match(/\{ x: ([\d.]+), z: 15\.41, width: 0\.6/)?.[1]);
  const wallZ = Number(world.match(/x: 25\.91, z: ([\d.]+), width: 41\.82/)?.[1]);

  assert.ok(Math.abs((maxX - radius) - (wallX - 0.3)) < 1e-9);
  assert.ok(Math.abs((maxZ - radius) - (wallZ - 0.3)) < 1e-9);
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
