import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  MAP_POIS,
  mapPoiById,
  nearestMapPoi,
} from "../app/scene/poi-data.ts";

test("全览地图包含三处核心片区和全部新华路地标", () => {
  assert.equal(MAP_POIS.length, 12);
  assert.deepEqual(MAP_POIS.slice(0, 3).map((poi) => poi.id), [
    "xingfuli",
    "shangsheng",
    "huashan",
  ]);
  assert.ok(MAP_POIS.every((poi) => poi.name && poi.description && poi.startPreset));
  assert.equal(new Set(MAP_POIS.map((poi) => poi.id)).size, MAP_POIS.length);
});

test("人物只有走进 POI 邻近范围才会激活进入卡片", () => {
  const shangsheng = mapPoiById("shangsheng");
  assert.ok(shangsheng);
  assert.equal(nearestMapPoi(shangsheng.position, 42)?.id, "shangsheng");
  assert.equal(nearestMapPoi([1_000, 1_000], 42), null);
});

test("双尺度视图锁定全览镜头并在闲逛态放大环境而非人物", async () => {
  const world = await readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8");
  const experience = await readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8");

  assert.match(world, /export const DETAIL_WORLD_SCALE = 1\.65/);
  assert.match(world, /const OVERVIEW_CHARACTER_SCALE = 22/);
  assert.match(world, /const OVERVIEW_CAMERA_FILL = 0\.24/);
  assert.match(world, /function OverviewCamera/);
  assert.match(world, /camera\.position\.copy\(desired\)/);
  assert.match(world, /detailScale=\{exploring \? DETAIL_WORLD_SCALE : 1\}/);
  assert.match(world, /scale=\{OVERVIEW_CHARACTER_SCALE\}/);
  assert.match(
    world,
    /resolvePolygonMovement\(\s*position\.current,\s*scratchDisplacement,\s*XINHUA_BOUNDARY,\s*\[\],\s*PLAYER_RADIUS/s,
  );
  assert.match(experience, /"intro" \| "overview" \| "explore"/);
  assert.match(experience, /查看全览/);
  assert.match(experience, /进入 \{nearPoi\.name\}/);
});
