import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildTerrainCells, terrainHeightAt } from "../app/scene/terrain.ts";
import {
  isPlanarPositionBlockedInPolygon,
  transformMapPoint,
} from "../app/scene/world-math.ts";

const root = new URL("../", import.meta.url);

test("新华街道地形使用真实数据支持的低频缓坡", async () => {
  const map = JSON.parse(await readFile(new URL("app/scene/xinhua-map-data.json", root), "utf8"));
  const elevation = JSON.parse(await readFile(new URL("app/scene/xinhua-elevation-model.json", root), "utf8"));
  const heights = [];
  let maximumFiveUnitGrade = 0;
  for (let x = map.bounds.minX + 20; x <= map.bounds.maxX - 20; x += 45) {
    for (let z = map.bounds.minZ + 20; z <= map.bounds.maxZ - 20; z += 45) {
      if (isPlanarPositionBlockedInPolygon(x, z, map.boundary, [], 0)) continue;
      const height = terrainHeightAt(x, z);
      heights.push(height);
      maximumFiveUnitGrade = Math.max(
        maximumFiveUnitGrade,
        Math.abs(terrainHeightAt(x + 5, z) - height) / 5,
        Math.abs(terrainHeightAt(x, z + 5) - height) / 5,
      );
    }
  }

  const rangeMeters = (Math.max(...heights) - Math.min(...heights)) * map.meta.metersPerSceneUnit;
  assert.equal(elevation.source.dataset, "Copernicus DEM GLO-30 Public 2021 release");
  assert.ok(rangeMeters > 1 && rangeMeters < 2, `街区高差偏离数据拟合结果：${rangeMeters}`);
  assert.ok(maximumFiveUnitGrade < 0.005, `局部坡度过陡：${maximumFiveUnitGrade}`);
});

test("地形、道路、角色和地标共用同一高程基准", async () => {
  const [mapSource, worldSource, huashanSource, shangshengSource] = await Promise.all([
    readFile(new URL("app/scene/xinhua-map.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-world.tsx", root), "utf8"),
    readFile(new URL("app/scene/huashan-green-block.tsx", root), "utf8"),
    readFile(new URL("app/scene/shangsheng-xinsuo-block.tsx", root), "utf8"),
  ]);

  assert.match(mapSource, /function slopedSegmentMatrix/);
  assert.match(mapSource, /terrainHeightAt\(start\[0\], start\[1\]\)/);
  assert.match(mapSource, /road-surface-labels/);
  assert.match(mapSource, /CanvasTexture/);
  assert.match(worldSource, /const surfaceHeight = terrainHeightAt/);
  assert.match(worldSource, /inputState\.sprint \? 9\.2 : 3\.6/);
  assert.doesNotMatch(huashanSource, /PARK_MOUNDS|function ParkRelief/);
  assert.match(huashanSource, /terrainHeightAt\(PARK_POSITION\[0\], PARK_POSITION\[1\]\)/);
  assert.match(shangshengSource, /terrainHeightAt\(SITE_POSITION\[0\], SITE_POSITION\[1\]\)/);
});

test("行政边缘只使用小于角色边界留白的细分地形格", async () => {
  const map = JSON.parse(await readFile(new URL("app/scene/xinhua-map-data.json", root), "utf8"));
  const cells = buildTerrainCells(map.bounds, map.boundary);
  const edgeCells = cells.filter(([minX, minZ, maxX, maxZ]) => ![
    [minX, minZ], [maxX, minZ], [maxX, maxZ], [minX, maxZ],
  ].every(([x, z]) => !isPlanarPositionBlockedInPolygon(x, z, map.boundary, [], 0)));

  assert.ok(cells.length > 0);
  assert.ok(edgeCells.length > 0);
  assert.ok(edgeCells.every(([minX, minZ, maxX, maxZ]) => (
    Math.hypot(maxX - minX, maxZ - minZ) < 0.48
  )), "边界相交格对角色半径而言仍然过大");

  for (let x = map.bounds.minX; x <= map.bounds.maxX; x += 24) {
    for (let z = map.bounds.minZ; z <= map.bounds.maxZ; z += 24) {
      if (isPlanarPositionBlockedInPolygon(x, z, map.boundary, [], 0.48)) continue;
      assert.ok(cells.some(([minX, minZ, maxX, maxZ]) => (
        x >= minX && x <= maxX && z >= minZ && z <= maxZ
      )), `可行走点缺少地面：${x}, ${z}`);
    }
  }
});

test("三个平面地标范围内使用严格一致的地面高度", async () => {
  const [map, landmarks] = await Promise.all([
    readFile(new URL("app/scene/xinhua-map-data.json", root), "utf8").then(JSON.parse),
    readFile(new URL("app/scene/xinhua-landmarks-data.json", root), "utf8").then(JSON.parse),
  ]);
  for (const landmark of [landmarks.huashanGreenland, landmarks.shangshengXinsuo]) {
    const anchorHeight = terrainHeightAt(landmark.position[0], landmark.position[1]);
    for (const [localX, localZ] of landmark.boundary) {
      const height = terrainHeightAt(landmark.position[0] + localX, landmark.position[1] + localZ);
      assert.ok(Math.abs(height - anchorHeight) < 1e-9);
    }
  }

  const placement = map.landmarks.xingfuli;
  const clearance = 4.1;
  const axis = [Math.cos(placement.rotationY), -Math.sin(placement.rotationY)];
  const position = [
    placement.position[0] - axis[0] * clearance / 2,
    placement.position[1] - axis[1] * clearance / 2,
  ];
  const longitudinalScale = placement.horizontalScale - clearance / 94;
  const anchorHeight = terrainHeightAt(position[0], position[1]);
  for (const [x, z] of [[-47, -22], [47, -22], [-47, 7.65], [47, 7.65]]) {
    const [worldX, worldZ] = transformMapPoint(
      x,
      z,
      position,
      placement.rotationY,
      placement.horizontalScale,
      placement.localLaneCenterZ,
      longitudinalScale,
    );
    assert.ok(Math.abs(terrainHeightAt(worldX, worldZ) - anchorHeight) < 1e-9);
  }
});

test("幸福里番禺路端单独退界且不压缩横向通行宽度", async () => {
  const [map, worldSource, xingfuliSource] = await Promise.all([
    readFile(new URL("app/scene/xinhua-map-data.json", root), "utf8").then(JSON.parse),
    readFile(new URL("app/scene/xinhua-world.tsx", root), "utf8"),
    readFile(new URL("app/scene/xingfuli-block.tsx", root), "utf8"),
  ]);
  const clearance = 4.1;
  const longitudinalScale = map.landmarks.xingfuli.horizontalScale - clearance / 94;

  assert.ok(longitudinalScale < map.landmarks.xingfuli.horizontalScale);
  assert.ok(longitudinalScale > 0.5);
  assert.match(worldSource, /XINGFULI_FANYU_CLEARANCE = 4\.1/);
  assert.match(worldSource, /XINGFULI_LONGITUDINAL_SCALE/);
  assert.match(worldSource, /XINGFULI_PLACEMENT\.horizontalScale,\s*XINGFULI_PLACEMENT\.localLaneCenterZ,\s*XINGFULI_LONGITUDINAL_SCALE/s);
  assert.match(xingfuliSource, /REFLECTING_POOL = \{ x: 16\.5, z: -3\.95, width: 18, depth: 2\.15 \}/);
  assert.match(xingfuliSource, /pool-bypass-/);
  assert.doesNotMatch(xingfuliSource, /minZ: -6\.65, maxZ: -3\.75/);
});
