import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import {
  isPlanarPositionBlocked,
  isPlanarPositionBlockedInPolygon,
  isPointInsidePolygon,
} from "../app/scene/world-math.ts";

const root = new URL("../", import.meta.url);

async function loadJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

function round(value, precision = 4) {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

function openGeometry(geometry) {
  const first = geometry[0];
  const last = geometry.at(-1);
  return first.lon === last.lon && first.lat === last.lat ? geometry.slice(0, -1) : geometry;
}

function centroid(points) {
  return points.reduce((sum, [x, z]) => [sum[0] + x, sum[1] + z], [0, 0])
    .map((value) => value / points.length);
}

function rebuildBoundary(raw, wayId, mapData) {
  const way = raw.elements.find((element) => element.type === "way" && element.id === wayId);
  assert.ok(way?.geometry?.length, `原始快照缺少 way ${wayId}`);
  const [centerLon, centerLat] = mapData.meta.centerWgs84;
  const metersPerLonDegree = 111_320 * Math.cos(centerLat * Math.PI / 180);
  const project = ({ lon, lat }) => [
    (lon - centerLon) * metersPerLonDegree / mapData.meta.metersPerSceneUnit,
    -(lat - centerLat) * 110_540 / mapData.meta.metersPerSceneUnit,
  ];
  const worldBoundary = openGeometry(way.geometry).map(project);
  const position = centroid(worldBoundary);
  return {
    position: position.map((value) => round(value)),
    boundary: worldBoundary.map(([x, z]) => [round(x - position[0]), round(z - position[1])]),
    localize: (geometry) => openGeometry(geometry)
      .map(project)
      .map(([x, z]) => [round(x - position[0]), round(z - position[1])]),
  };
}

test("两处地标数据由保留的 OSM 原始快照重建", async () => {
  const landmarks = await loadJson("app/scene/xinhua-landmarks-data.json");
  const shangshengRaw = await loadJson("docs/research/data/shangsheng-xinsuo-overpass-20260716.json");
  const huashanRaw = await loadJson("docs/research/data/huashan-green-overpass-20260716.json");
  const shangsheng = landmarks.shangshengXinsuo;
  const huashan = landmarks.huashanGreenland;
  const mapData = await loadJson("app/scene/xinhua-map-data.json");

  assert.equal(landmarks.meta.environmentScale, 5);
  assert.equal(landmarks.meta.metersPerSceneUnit, 2.7);
  assert.equal(shangsheng.osmWayId, 765939973);
  assert.equal(huashan.osmWayId, 444342095);
  assert.equal(shangsheng.boundary.length, 21);
  assert.equal(huashan.boundary.length, 12);
  assert.equal(shangsheng.buildings.length, 11);
  assert.equal(huashan.paths.length, 21);
  assert.ok(shangshengRaw.elements.some((element) => element.id === shangsheng.osmWayId));
  assert.ok(huashanRaw.elements.some((element) => element.id === huashan.osmWayId));
  for (const id of [864847877, 864847881, 864847883]) {
    assert.ok(shangshengRaw.elements.some((element) => element.id === id), `原始快照缺少建筑 ${id}`);
    assert.ok(shangsheng.buildings.some((building) => building.id === id), `场景数据缺少建筑 ${id}`);
  }
  assert.equal(huashan.basketballCourt.osmWayId, 743778425);
  assert.equal(huashan.serviceBuilding.osmWayId, 743778426);

  const rebuiltHuashan = rebuildBoundary(huashanRaw, huashan.osmWayId, mapData);
  const rebuiltShangsheng = rebuildBoundary(shangshengRaw, shangsheng.osmWayId, mapData);
  assert.deepEqual(huashan.position, rebuiltHuashan.position);
  assert.deepEqual(huashan.boundary, rebuiltHuashan.boundary);
  assert.deepEqual(shangsheng.position, rebuiltShangsheng.position);
  assert.deepEqual(shangsheng.boundary, rebuiltShangsheng.boundary);
  for (const id of [864847877, 864847881, 864847883]) {
    const rawBuilding = shangshengRaw.elements.find((element) => element.type === "way" && element.id === id);
    const sceneBuilding = shangsheng.buildings.find((building) => building.id === id);
    assert.deepEqual(sceneBuilding.boundary, rebuiltShangsheng.localize(rawBuilding.geometry));
  }
});

test("华山绿地具备真实园路与可识别的核心环境", async () => {
  const landmarks = await loadJson("app/scene/xinhua-landmarks-data.json");
  const source = await readFile(new URL("app/scene/huashan-green-block.tsx", root), "utf8");
  const huashan = landmarks.huashanGreenland;

  assert.match(source, /function ForestInstances/);
  assert.match(source, /function UnderstoryInstances/);
  assert.match(source, /function PondGarden/);
  assert.match(source, /function BasketballCourt/);
  assert.match(source, /function ParkFacilities/);
  assert.match(source, /isNearParkPath/);
  assert.match(source, /function clippedPathSegments/);
  assert.match(source, /\.\.\.FOREST_TREES\.map/);
  assert.match(source, /name="huashan-greenland"/);
  assert.match(source, /osmWayId: 444342095/);
  assert.match(source, /#6f8b62/);
  assert.match(source, /#aaa38f/);
  assert.match(source, /Array\.from\(\{ length: 24 \}/);

  const localStart = [3.2228, 30.9915];
  assert.equal(isPointInsidePolygon(localStart[0], localStart[1], huashan.boundary), true);
  const obstacles = [huashan.serviceBuilding.collision];
  assert.equal(isPlanarPositionBlockedInPolygon(
    localStart[0],
    localStart[1],
    huashan.boundary,
    obstacles,
    0.48,
  ), false);

  const pond = { x: -7.8, z: 39.2, radiusX: 9.4, radiusZ: 4.5 };
  const waterObstacles = [
    {
      minX: pond.x - pond.radiusX * 0.88,
      maxX: pond.x + pond.radiusX * 0.88,
      minZ: pond.z + 2.4,
      maxZ: pond.z + pond.radiusZ * 0.82,
    },
    {
      minX: pond.x - pond.radiusX * 0.88,
      maxX: pond.x + pond.radiusX * 0.88,
      minZ: pond.z - pond.radiusZ * 0.82,
      maxZ: pond.z - 2.4,
    },
  ];
  const broadBounds = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
  for (let index = 0; index < 24; index += 1) {
    const bridgeX = (index - 11.5) * 0.72;
    const x = pond.x + 0.4 + bridgeX * Math.cos(0.13);
    const z = pond.z - bridgeX * Math.sin(0.13);
    assert.equal(isPlanarPositionBlocked(x, z, broadBounds, waterObstacles, 0.48), false);
  }
  assert.equal(isPlanarPositionBlocked(pond.x, pond.z + 3, broadBounds, waterObstacles, 0.48), true);
});

test("上生新所保留三处历史建筑与泳池庭院结构", async () => {
  const landmarks = await loadJson("app/scene/xinhua-landmarks-data.json");
  const [source, fullModels] = await Promise.all([
    readFile(new URL("app/scene/shangsheng-xinsuo-block.tsx", root), "utf8"),
    readFile(new URL("app/scene/shangsheng-full-models.tsx", root), "utf8"),
  ]);
  const site = landmarks.shangshengXinsuo;
  const features = new Set(site.buildings.map((building) => building.feature));

  assert.ok(features.has("sun-ke-villa"));
  assert.ok(features.has("country-club"));
  assert.ok(features.has("navy-club"));
  assert.ok(features.has("industrial"));
  assert.ok(features.has("new-campus"));
  assert.match(fullModels, /function SunKeVillaModel/);
  assert.match(source, /function CountryClub/);
  assert.match(fullModels, /function NavyClubModel/);
  assert.match(fullModels, /useGLTF\("\/models\/shangsheng\/navy-club-pool\.glb"\)/);
  const navyGlbUrl = new URL("public/models/shangsheng/navy-club-pool.glb", root);
  await access(navyGlbUrl);
  const navyGlb = await readFile(navyGlbUrl);
  const navyJsonLength = navyGlb.readUInt32LE(12);
  const navyData = JSON.parse(navyGlb.toString("utf8", 20, 20 + navyJsonLength).trim());
  assert.equal(navyData.nodes?.length, 1, "海军俱乐部运行时资产应合并为单节点");
  assert.equal(navyData.meshes?.length, 1, "海军俱乐部运行时资产应合并为单网格");
  assert.match(fullModels, /sources\.map\(\(source\) =>/);
  assert.match(source, /stage === "massing"/);
  assert.match(source, /const loadFullModels = stage === "full"/);
  assert.match(source, /function CampusLandscape/);
  assert.match(source, /function CafePavilion/);
  assert.match(source, /function BicycleParking/);
  assert.match(source, /function ReadingTerrace/);
  assert.match(source, /function WayfindingTotem/);
  assert.match(source, /industrial-window-/);
  assert.match(source, /sawtooth-/);
  assert.match(source, /facade-fin-/);
  assert.match(source, /\.\.\.CAMPUS_TREES\.map/);
  assert.match(fullModels, /name="shangsheng-navy-club-and-pool"/);
  assert.match(source, /name="shangsheng-xinsuo"/);
  assert.match(source, /osmWayId: 765939973/);

  const obstacles = [
    ...site.buildings.flatMap((building) => building.collision),
    { minX: -23.05, maxX: -18.25, minZ: -5.7, maxZ: 5.2 },
    ...site.fountains.map((fountain) => fountain.boundary.reduce((bounds, [x, z]) => ({
      minX: Math.min(bounds.minX, x), maxX: Math.max(bounds.maxX, x),
      minZ: Math.min(bounds.minZ, z), maxZ: Math.max(bounds.maxZ, z),
    }), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity })),
  ];
  for (const localStart of [[25, 15], [-20.65, -6.65], [45, 10]]) {
    assert.equal(isPointInsidePolygon(localStart[0], localStart[1], site.boundary), true);
    assert.equal(isPlanarPositionBlockedInPolygon(
      localStart[0],
      localStart[1],
      site.boundary,
      obstacles,
      0.48,
    ), false);
  }
  for (const fountain of site.fountains) {
    const center = centroid(fountain.boundary);
    assert.equal(isPlanarPositionBlockedInPolygon(
      center[0],
      center[1],
      site.boundary,
      obstacles,
      0.2,
    ), true);
  }
});

test("三个地标碰撞和两处直达验收入口已接入且仍只有一个行动点", async () => {
  const world = await readFile(new URL("app/scene/xinhua-world.tsx", root), "utf8");
  const huashan = await readFile(new URL("app/scene/huashan-green-block.tsx", root), "utf8");
  const shangsheng = await readFile(new URL("app/scene/shangsheng-xinsuo-block.tsx", root), "utf8");
  const xingfuli = await readFile(new URL("app/scene/xingfuli-block.tsx", root), "utf8");

  assert.match(world, /\.\.\.HUASHAN_GREEN_OBSTACLES/);
  assert.match(world, /\.\.\.SHANGSHENG_XINSUO_OBSTACLES/);
  assert.match(world, /name === "huashan"/);
  assert.match(world, /name === "court"/);
  assert.match(world, /name === "bridge"/);
  assert.match(world, /name === "shangsheng"/);
  assert.match(world, /name === "pool"/);
  assert.match(world, /name === "sunke"/);
  assert.match(world, /isPlanarCameraCandidateClearInPolygon/);
  assert.match(world, /CAMERA_FALLBACK_YAWS/);
  assert.match(world, /initialStart\.position\.clone\(\)/);
  assert.doesNotMatch(huashan + shangsheng, /data-osm-way/);
  assert.equal(((world + huashan + shangsheng + xingfuli).match(/data-action-point=/g) ?? []).length, 1);
});
