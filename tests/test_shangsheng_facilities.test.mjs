import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SHANGSHENG_FACILITIES,
  SHANGSHENG_LOCAL_FACILITY_OBSTACLES,
} from "../app/scene/shangsheng-facilities.ts";
import { isPlanarPositionBlocked, isPointInsidePolygon } from "../app/scene/world-math.ts";

const root = new URL("../", import.meta.url);

test("上生新所新增设施位于真实园区边界内", async () => {
  const landmarks = JSON.parse(await readFile(new URL("app/scene/xinhua-landmarks-data.json", root), "utf8"));
  const boundary = landmarks.shangshengXinsuo.boundary;
  const [readingX, readingZ] = SHANGSHENG_FACILITIES.readingTerrace;

  for (let index = 0; index < 32; index += 1) {
    const angle = index / 32 * Math.PI * 2;
    assert.equal(
      isPointInsidePolygon(readingX + Math.cos(angle) * 4.8, readingZ + Math.sin(angle) * 4.8, boundary),
      true,
      `阅读庭院第 ${index} 个边缘采样点越界`,
    );
  }
  for (const obstacle of SHANGSHENG_LOCAL_FACILITY_OBSTACLES) {
    for (const [x, z] of [
      [obstacle.minX, obstacle.minZ],
      [obstacle.maxX, obstacle.minZ],
      [obstacle.maxX, obstacle.maxZ],
      [obstacle.minX, obstacle.maxZ],
    ]) {
      assert.equal(isPointInsidePolygon(x, z, boundary), true, `设施碰撞角点越界：${x}, ${z}`);
    }
  }
});

test("咖啡亭、车架、阅读台和导视实体均参与碰撞", async () => {
  const source = await readFile(new URL("app/scene/shangsheng-xinsuo-block.tsx", root), "utf8");
  const bounds = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
  assert.match(source, /SHANGSHENG_LOCAL_FACILITY_OBSTACLES\.map\(localToWorldObstacle\)/);
  assert.equal(SHANGSHENG_LOCAL_FACILITY_OBSTACLES.length, 5);
  for (const obstacle of SHANGSHENG_LOCAL_FACILITY_OBSTACLES) {
    const centerX = (obstacle.minX + obstacle.maxX) / 2;
    const centerZ = (obstacle.minZ + obstacle.maxZ) / 2;
    assert.equal(isPlanarPositionBlocked(
      centerX,
      centerZ,
      bounds,
      SHANGSHENG_LOCAL_FACILITY_OBSTACLES,
      0.2,
    ), true);
  }
});
