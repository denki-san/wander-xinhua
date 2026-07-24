import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("静态生产入口加载新华漫游志 3D 闲逛应用", async () => {
  const html = await readFile(new URL("../dist-static/index.html", import.meta.url), "utf8");
  assert.match(html, /<html[^>]*lang="zh-CN"/i);
  assert.match(html, /<title>新华漫游志｜新华路 3D 闲逛<\/title>/i);
  assert.match(html, /按真实行政边界和道路比例重建/i);
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
  const huashan = await readFile(new URL("../app/scene/huashan-green-block.tsx", import.meta.url), "utf8");
  const shangsheng = await readFile(new URL("../app/scene/shangsheng-xinsuo-block.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(experience, /@react-three\/fiber/);
  assert.match(experience, /<Canvas/);
  assert.match(world, /PlayableWanderer/);
  assert.match(world, /FlatNeighborhood/);
  assert.match(world, /XinhuaStreetMap/);
  assert.match(world, /XINHUA_BOUNDARY/);
  assert.match(world, /resolvePolygonMovement/);
  assert.doesNotMatch(world, /MAP_BOUNDS|NeighborhoodBoundary|NeighborhoodRoads/);
  assert.doesNotMatch(world, /PLANET_RADIUS|SurfaceAnchor|TinyPlanet/);
  assert.equal(((world + xingfuli + huashan + shangsheng).match(/data-action-point=/g) ?? []).length, 1);
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
  const shangsheng = await readFile(new URL("../app/scene/shangsheng-xinsuo-block.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(world, /messenger\.abeto\.co|promptwhisper\/messenger/);
  assert.match(experience, /href="https:\/\/messenger\.abeto\.co\/"/);
  assert.doesNotMatch(experience + world + xingfuli + shangsheng, /\/assets\/|\.drc|\.ktx2|\.ogg|bdimg|bcebos/);
  assert.match(shangsheng, /"\/models\/shangsheng\/navy-club-pool\.glb"/);
  assert.match(experience, /openstreetmap\.org\/copyright/);

  const assets = await readdir(new URL("../dist-static/assets/", import.meta.url));
  const javascript = await Promise.all(
    assets.filter((name) => name.endsWith(".js"))
      .map((name) => readFile(new URL(`../dist-static/assets/${name}`, import.meta.url), "utf8")),
  );
  // GLTFLoader 自身包含 ktx2Loader 属性名；这里只拦截参考站和图片 CDN，而不误判库内部 API。
  assert.doesNotMatch(javascript.join("\n"), /bdimg|bcebos|poi-pic|messenger\.abeto\.co\/assets/i);
});

test("幸福里使用七栋固定建筑和可识别的核心街具", async () => {
  const world = await readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8");
  const xingfuli = await readFile(new URL("../app/scene/xingfuli-block.tsx", import.meta.url), "utf8");
  const layout = JSON.parse(await readFile(new URL("../app/scene/xingfuli-layout.json", import.meta.url), "utf8"));

  assert.match(world, /<XingfuliBlock loadDetailedArchitecture=\{showDetailModels\} \/>/);
  assert.match(world, /const XINGFULI_WORLD_OBSTACLES = XINGFULI_OBSTACLES\.map/);
  assert.match(world, /\.\.\.XINGFULI_WORLD_OBSTACLES/);
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
  assert.match(xingfuli, /function ReflectingPoolDynamicDetails/);
  assert.match(xingfuli, /function XingfuliArchitecture/);
  assert.match(xingfuli, /function VerticalGarden/);
  assert.match(xingfuli, /GARDEN_CELLS/);
  assert.match(xingfuli, /function EntranceMural/);
  assert.match(xingfuli, /StreetLampInstances/);
  assert.match(xingfuli, /SlattedBench/);
  assert.match(xingfuli, /CantileverCafeUmbrella/);
  assert.match(xingfuli, /OutdoorDiningSet/);
  assert.match(xingfuli, /番禺路入口右侧的白色玻璃转角体量/);
  assert.match(xingfuli, /sign \* 0\.082/);
  assert.match(xingfuli, /data-neighborhood="xingfuli"/);
  assert.doesNotMatch(xingfuli, /瑞幸|星巴克|FASCINO|Minecraft/i);
});

test("地图使用真实行政边界、完整道路骨架和柏油主干道", async () => {
  const [mapSource, surfaceContract] = await Promise.all([
    readFile(new URL("../app/scene/xinhua-map.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/road-surface-contract.ts", import.meta.url), "utf8"),
  ]);
  const map = JSON.parse(await readFile(new URL("../app/scene/xinhua-map-data.json", import.meta.url), "utf8"));

  assert.equal(map.meta.osmRelationId, 13469094);
  assert.equal(map.meta.areaSqKm, 2.2);
  assert.equal(map.meta.environmentScale, 5);
  assert.equal(map.meta.baseMetersPerSceneUnit, 13.5);
  assert.equal(map.meta.metersPerSceneUnit, 2.7);
  assert.ok(map.boundary.length >= 50);
  assert.ok(map.roads.length >= 300);
  assert.ok(map.bounds.maxX - map.bounds.minX > 700);
  assert.ok(map.bounds.maxZ - map.bounds.minZ > 750);
  for (const roadName of ["延安西路", "凯旋路", "淮海西路", "华山路", "新华路", "番禺路", "法华镇路", "幸福路", "定西路", "安顺路"]) {
    assert.ok(map.roads.some((road) => road.name === roadName), `缺少道路：${roadName}`);
  }
  assert.match(mapSource, /data-administrative-boundary="osm-13469094"/);
  assert.match(mapSource, /data-road-network="osm-13469094"/);
  assert.match(surfaceContract, /2\.18 \* XINHUA_ENVIRONMENT_SCALE/);
  assert.match(surfaceContract, /2\.62 \* XINHUA_ENVIRONMENT_SCALE/);
  assert.match(surfaceContract, /1\.82 \* XINHUA_ENVIRONMENT_SCALE/);
  assert.match(mapSource, /const curbCenterY = 0\.07 \+ curbHeight \/ 2/);
  assert.doesNotMatch(mapSource, /#e8dcc0|#efe5cb/);
});

test("地图抓取脚本保留每次原始数据快照", async () => {
  const generator = await readFile(new URL("../scripts/test_generate_xinhua_map.mjs", import.meta.url), "utf8");
  assert.match(generator, /RUN_STAMP/);
  assert.match(generator, /\{ flag: "wx" \}/);
  assert.doesNotMatch(generator, /DATE_STAMP = "20260716"/);
});

test("幸福里按 OSM 中心线置于真实相对位置并保持统一横向比例", async () => {
  const world = await readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8");
  const map = JSON.parse(await readFile(new URL("../app/scene/xinhua-map-data.json", import.meta.url), "utf8"));
  const placement = map.landmarks.xingfuli;

  assert.equal(placement.osmWayId, 400066625);
  assert.ok(Math.abs(placement.position[0] / map.meta.environmentScale - 21.3332) < 0.0001);
  assert.ok(Math.abs(placement.position[1] / map.meta.environmentScale - 2.5809) < 0.0001);
  assert.ok(Math.abs(placement.lengthMeters - 147.7) < 0.1);
  assert.ok(Math.abs(placement.horizontalScale - (placement.lengthMeters / map.meta.metersPerSceneUnit / 94)) < 0.0001);
  assert.match(world, /data-landmark-position="osm-way-400066625"/);
  assert.match(world, /XINGFULI_PLACEMENT\.horizontalScale/);
  assert.match(world, /transformMapObstacle/);
});

test("主角保留城市漫游者配色并移除秋日邮差包", async () => {
  const world = await readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8");
  const head = world.slice(
    world.indexOf("function FallbackWandererHead"),
    world.indexOf("function FallbackWandererTorso"),
  );

  assert.match(world, /function FallbackWandererHead/);
  assert.match(world, /function FallbackWandererTorso/);
  assert.match(world, /function FallbackWandererArm/);
  assert.match(world, /function FallbackWandererLeg/);
  assert.match(world, /function WandererCharacter/);
  assert.match(head, /sphereGeometry/);
  assert.match(world, /#657772/);
  assert.match(world, /#202b2f/);
  assert.doesNotMatch(world, /function AutumnWandererBag/);
  assert.doesNotMatch(world, /xinhua-autumn-messenger-bag/);
  assert.doesNotMatch(world, /xinhua-postcard-bag/);
  assert.doesNotMatch(world, /capsuleGeometry args=\{\[0\.39, 0\.72/);
});
