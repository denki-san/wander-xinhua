import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  isPlanarPositionBlockedInPolygon,
  isPointInsidePolygon,
  transformMapObstacle,
  transformMapPoint,
} from "../app/scene/world-math.ts";
import { loadLatestCompleteRawSnapshot } from "../scripts/xinhua-map-snapshots.mjs";

const root = new URL("../", import.meta.url);

function pathLength(points) {
  return points.slice(1).reduce((sum, point, index) => (
    sum + Math.hypot(point[0] - points[index][0], point[1] - points[index][1])
  ), 0);
}

function midpointAndDirection(points) {
  const total = pathLength(points);
  let walked = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
    if (walked + length >= total / 2) {
      const t = (total / 2 - walked) / length;
      return {
        point: [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t],
        direction: [end[0] - start[0], end[1] - start[1]],
      };
    }
    walked += length;
  }
  throw new Error("路径没有足够的点");
}

async function latestOsmSnapshots() {
  const directory = new URL("../docs/research/data/", import.meta.url);
  const files = (await readdir(directory))
    .filter((name) => /^xinhua-roads-osm-\d{8}-\d{6}\.json$/.test(name))
    .sort();
  assert.ok(files.length > 0, "缺少带时间戳的 OSM 道路快照");
  const roadFilename = files.at(-1);
  const boundaryFilename = roadFilename.replace("roads", "boundary");
  return {
    roads: JSON.parse(await readFile(new URL(roadFilename, directory), "utf8")),
    boundary: JSON.parse(await readFile(new URL(boundaryFilename, directory), "utf8")),
  };
}

test("幸福里锚点、方向、长度和缩放可从最新 OSM 原始快照重算", async () => {
  const map = JSON.parse(await readFile(new URL("app/scene/xinhua-map-data.json", root), "utf8"));
  const raw = await latestOsmSnapshots();
  const way = raw.roads.elements.find((element) => element.id === 400066625);
  assert.ok(way?.geometry?.length > 1);

  const boundary = raw.boundary.find((element) => element.osm_id === map.meta.osmRelationId);
  assert.ok(boundary?.boundingbox?.length === 4);
  const [south, north, west, east] = boundary.boundingbox.map(Number);
  const centerLat = (south + north) / 2;
  const centerLon = (west + east) / 2;
  const metersPerLonDegree = 111_320 * Math.cos(centerLat * Math.PI / 180);
  const project = ({ lon, lat }) => [
    (lon - centerLon) * metersPerLonDegree / map.meta.metersPerSceneUnit,
    -(lat - centerLat) * 110_540 / map.meta.metersPerSceneUnit,
  ];
  const projected = way.geometry.map(project);
  const anchor = midpointAndDirection(projected);
  const placement = map.landmarks.xingfuli;

  assert.equal(map.meta.environmentScale, 5);
  assert.equal(map.meta.baseMetersPerSceneUnit, 13.5);
  assert.equal(map.meta.metersPerSceneUnit, 2.7);
  assert.ok(Math.hypot(
    placement.position[0] - anchor.point[0],
    placement.position[1] - anchor.point[1],
  ) < 0.0001);
  assert.ok(Math.abs(placement.rotationY - -Math.atan2(anchor.direction[1], anchor.direction[0])) < 0.000001);
  assert.ok(Math.abs(placement.lengthMeters - pathLength(projected) * map.meta.metersPerSceneUnit) < 0.06);
  assert.ok(Math.abs(placement.horizontalScale - pathLength(projected) / 94) < 0.000001);
});

test("自然比例人物与五倍环境为幸福里街巷留下充足通行宽度", async () => {
  const map = JSON.parse(await readFile(new URL("app/scene/xinhua-map-data.json", root), "utf8"));
  const layout = JSON.parse(await readFile(new URL("app/scene/xingfuli-layout.json", root), "utf8"));
  const world = await readFile(new URL("app/scene/xinhua-world.tsx", root), "utf8");
  const northBuildings = layout.buildings.filter((building) => building.side === "north");
  const southBuildings = layout.buildings.filter((building) => building.side === "south");
  const northEdge = Math.min(...northBuildings.map((building) => building.z - building.depth / 2 - 0.28));
  const southEdge = Math.max(...southBuildings.map((building) => building.z + building.depth / 2 + 0.28));
  const laneClearance = (northEdge - southEdge) * map.landmarks.xingfuli.horizontalScale;
  const playerDiameter = 0.48 * 2;
  const threeFloorHeight = (3 * 2.08 + 0.4) * map.landmarks.xingfuli.verticalScale;

  assert.equal(map.landmarks.xingfuli.verticalScale, 1.5);
  assert.ok(laneClearance > 6.7, `街巷有效宽度不足：${laneClearance}`);
  assert.ok(laneClearance - playerDiameter > 5.7, "人物两侧没有足够的闲逛空间");
  assert.ok(threeFloorHeight > 9.9, "三层建筑仍然与人物接近等高");
  assert.match(world, /const PLAYER_RADIUS = 0\.48/);
  assert.match(world, /const CAMERA_DISTANCE = 5/);
  assert.match(world, /const CAMERA_HEIGHT = 1\.95/);
  assert.match(world, /const CAMERA_TARGET_HEIGHT = 1\.45/);
  assert.match(world, /const CAMERA_SHOULDER_OFFSET = 0\.9/);
  assert.match(world, /const CAMERA_TARGET_SHOULDER_OFFSET = 0\.12/);
  assert.match(world, /name === "xingfuli" \|\| name === "hero"/);
  assert.match(world, /<group ref=\{body\}>/);
  assert.match(world, /const CHARACTER_VISUAL_SCALE = 1\.3/);
  assert.match(world, /<primitive object=\{model\} scale=\{CHARACTER_VISUAL_SCALE\} \/>/);
  assert.match(world, /function FallbackWandererHead/);
  assert.match(world, /const SHADOW_CENTER = new Vector3/);
  assert.match(world, /HUASHAN_GREEN_POSITION\[0\]/);
  assert.match(world, /SHANGSHENG_XINSUO_POSITION\[0\]/);
  assert.match(world, /target\.position\.copy\(SHADOW_CENTER\)/);
  assert.match(world, /target=\{shadowTarget\}/);
  const surfaceY = 0.18 + (0.3 - map.landmarks.xingfuli.verticalScale) * 0.26
    + map.landmarks.xingfuli.verticalScale * 0.26;
  assert.ok(Math.abs(surfaceY - 0.258) < 0.000001, "幸福里铺装顶面在五倍缩放后发生 Y 漂移");
});

test("离线回放会跳过损坏或语义不完整的较新快照", async () => {
  const raw = await latestOsmSnapshots();
  const directory = await mkdtemp(join(tmpdir(), "test_xinhua_snapshots_"));
  const researchDir = new URL(`file://${directory}/`);
  try {
    await writeFile(new URL("xinhua-boundary-osm-20260716-080509.json", researchDir), JSON.stringify(raw.boundary));
    await writeFile(new URL("xinhua-roads-osm-20260716-080509.json", researchDir), JSON.stringify(raw.roads));
    await writeFile(new URL("xinhua-boundary-osm-20260716-235958.json", researchDir), JSON.stringify(raw.boundary));
    await writeFile(new URL("xinhua-roads-osm-20260716-235958.json", researchDir), JSON.stringify({ elements: [] }));
    await writeFile(new URL("xinhua-boundary-osm-20260716-235959.json", researchDir), JSON.stringify(raw.boundary));
    await writeFile(new URL("xinhua-roads-osm-20260716-235959.json", researchDir), "{损坏的 JSON");

    const selected = await loadLatestCompleteRawSnapshot({
      researchDir,
      relationId: 13469094,
      xingfuliWayId: 400066625,
    });
    assert.equal(selected.roadName, "xinhua-roads-osm-20260716-080509.json");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("幸福里真实建筑碰撞四角与模型点使用同一全局变换", async () => {
  const map = JSON.parse(await readFile(new URL("app/scene/xinhua-map-data.json", root), "utf8"));
  const layout = JSON.parse(await readFile(new URL("app/scene/xingfuli-layout.json", root), "utf8"));
  const placement = map.landmarks.xingfuli;
  const building = layout.buildings[0];
  const localObstacle = {
    minX: building.x - building.width / 2 - 0.28,
    maxX: building.x + building.width / 2 + 0.28,
    minZ: building.z - building.depth / 2 - 0.28,
    maxZ: building.z + building.depth / 2 + 0.28,
  };
  const transformed = transformMapObstacle(
    localObstacle,
    placement.position,
    placement.rotationY,
    placement.horizontalScale,
    placement.localLaneCenterZ,
  );
  const corners = [
    [localObstacle.minX, localObstacle.minZ],
    [localObstacle.minX, localObstacle.maxZ],
    [localObstacle.maxX, localObstacle.minZ],
    [localObstacle.maxX, localObstacle.maxZ],
  ].map(([x, z]) => transformMapPoint(
    x,
    z,
    placement.position,
    placement.rotationY,
    placement.horizontalScale,
    placement.localLaneCenterZ,
  ));

  assert.equal(transformed.minX, Math.min(...corners.map(([x]) => x)));
  assert.equal(transformed.maxX, Math.max(...corners.map(([x]) => x)));
  assert.equal(transformed.minZ, Math.min(...corners.map(([, z]) => z)));
  assert.equal(transformed.maxZ, Math.max(...corners.map(([, z]) => z)));
});

test("起点和唯一行动点位于真实行政边界内且留有角色半径", async () => {
  const map = JSON.parse(await readFile(new URL("app/scene/xinhua-map-data.json", root), "utf8"));
  const placement = map.landmarks.xingfuli;
  const boundary = map.boundary;
  const action = transformMapPoint(-48, placement.localLaneCenterZ, placement.position, placement.rotationY, placement.horizontalScale, placement.localLaneCenterZ);
  const start = transformMapPoint(-65, placement.localLaneCenterZ, placement.position, placement.rotationY, placement.horizontalScale, placement.localLaneCenterZ);

  assert.equal(isPointInsidePolygon(action[0], action[1], boundary), true);
  assert.equal(isPointInsidePolygon(start[0], start[1], boundary), true);
  assert.equal(isPlanarPositionBlockedInPolygon(action[0], action[1], boundary, [], 0.48), false);
  assert.equal(isPlanarPositionBlockedInPolygon(start[0], start[1], boundary, [], 0.48), false);
});

test("地下和覆盖道路保留在数据中但不会进入地表道路过滤条件", async () => {
  const map = JSON.parse(await readFile(new URL("app/scene/xinhua-map-data.json", root), "utf8"));
  const raw = await latestOsmSnapshots();
  const undergroundIds = new Set(raw.roads.elements.filter((element) => (
    element.tags?.tunnel === "yes"
    || element.tags?.tunnel === "building_passage"
    || element.tags?.covered === "yes"
    || Number.parseInt(element.tags?.layer ?? "0", 10) < 0
  )).map((element) => element.id));
  const undergroundRoads = map.roads.filter((road) => undergroundIds.has(road.osmWayId));

  assert.ok(undergroundRoads.length > 0);
  assert.ok(undergroundRoads.every((road) => road.tunnel === true));
  assert.ok(map.roads.every((road) => typeof road.tunnel === "boolean"));
  assert.equal(map.roads.filter((road) => !road.tunnel && road.layer >= 0).length, 301);

  const source = await readFile(new URL("app/scene/xinhua-map.tsx", root), "utf8");
  assert.match(source, /return !road\.tunnel && road\.layer >= 0/);
  assert.match(source, /isSurfaceRoad\(candidate\)/);
});
