import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SHANGSHENG_FACILITIES,
  SHANGSHENG_LOCAL_FACILITY_OBSTACLES,
} from "../app/scene/shangsheng-facilities.ts";
import { isPointInsidePolygon } from "../app/scene/world-math.ts";

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

test("上生新所详情始终恢复原有设施和碰撞，全览通过环境模式隐藏", async () => {
  const source = await readFile(new URL("app/scene/shangsheng-xinsuo-block.tsx", root), "utf8");
  assert.match(source, /SHANGSHENG_LOCAL_FACILITY_OBSTACLES\.map\(localToWorldObstacle\)/);
  assert.match(source, /const environmentDetailed = showEnvironmentDetails \?\? stage === "full"/);
  assert.match(source, /<CampusLandscape detailed=\{environmentDetailed\} \/>/);
  assert.match(source, /detailed && \([\s\S]*?<CafePavilion \/>[\s\S]*?<BicycleParking \/>[\s\S]*?<ReadingTerrace \/>/);
  assert.equal(SHANGSHENG_LOCAL_FACILITY_OBSTACLES.length, 5);
});
