import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolvePlanarSpringArm, transformMapObstacle, transformMapPoint } from "../app/scene/world-math.ts";

const root = new URL("../", import.meta.url);
const json = async (p) => JSON.parse(await readFile(new URL(p, root), "utf8"));

test("中心段入口候选是既有主路线终点，玩家半径、边界和东侧路线合同均安全", async () => {
  const [candidate, audit, qa, map, layout] = await Promise.all([
    json("docs/research/xingfuli-center-entrance-direct-start-candidate.json"),
    json("docs/research/xingfuli-center-lineage-map-audit.json"),
    json("app/scene/xingfuli-qa-paths.json"),
    json("app/scene/xinhua-map-data.json"),
    json("app/scene/xingfuli-layout.json"),
  ]);
  const endpoint = qa.routes.find(({ id }) => id === "west-to-east-main").points.at(-1);
  assert.deepEqual(endpoint, candidate.candidate.local);
  assert.deepEqual(candidate.candidate.world, audit.startCamera.recommendedEntranceCandidate.world);
  assert.equal(candidate.candidate.nearestObstacleSceneUnits, audit.startCamera.recommendedEntranceCandidate.nearestObstacleSceneUnits);
  assert.ok(candidate.candidate.clearanceAfterPlayerRadiusSceneUnits > 0);
  assert.equal(candidate.frozenSpatialContract.centerMainLaneRemainingAfterPlayerDiameter, audit.mapCalibration.centerMainLane.remainingAfterPlayerDiameterSceneUnits);
  assert.ok(candidate.frozenSpatialContract.eastNeighborAabbClearance > 0);
  assert.equal(layout.buildings.length, 7);
  assert.equal(map.boundary.length > 2, true);
});

test("中心段入口候选按运行时初始相机肩位可保持未压缩 spring-arm", async () => {
  const [candidate, qa, map] = await Promise.all([
    json("docs/research/xingfuli-center-entrance-direct-start-candidate.json"),
    json("app/scene/xingfuli-qa-paths.json"),
    json("app/scene/xinhua-map-data.json"),
  ]);
  const placement = map.landmarks.xingfuli;
  const axis = [Math.cos(placement.rotationY), -Math.sin(placement.rotationY)];
  const position = [placement.position[0] - axis[0] * 4.1 / 2, placement.position[1] - axis[1] * 4.1 / 2];
  const longitudinal = placement.horizontalScale - 4.1 / 94;
  const obstacles = qa.fixedObstacles.concat([
    { minX: -43.28, maxX: -24.72, minZ: -0.75, maxZ: 7.65 },
    { minX: -41.28, maxX: -26.72, minZ: -22.28, maxZ: -13 },
    { minX: -23.28, maxX: -9.28, minZ: -0.75, maxZ: 7.65 },
    { minX: -23.28, maxX: -9.28, minZ: -22.28, maxZ: -12.72 },
    { minX: 3.72, maxX: 21.28, minZ: -0.75, maxZ: 7.65 },
    { minX: 3.72, maxX: 21.28, minZ: -22.28, maxZ: -12.72 },
    { minX: 23.22, maxX: 41.78, minZ: -0.75, maxZ: 7.65 },
    { minX: 5.72, maxX: 42.28, minZ: -22.28, maxZ: -12.72 }
  ]).flatMap((o) => Array.from({ length: Math.ceil(o.maxX - o.minX) }, (_, i) => ({ ...o, minX: o.minX + i, maxX: Math.min(o.minX + i + 1, o.maxX) }))).map((o) => transformMapObstacle(o, position, placement.rotationY, placement.horizontalScale, placement.localLaneCenterZ, longitudinal));
  const world = transformMapPoint(candidate.candidate.local[0], candidate.candidate.local[1], position, placement.rotationY, placement.horizontalScale, placement.localLaneCenterZ, longitudinal);
  const forward = [-axis[0], -axis[1]];
  const right = [forward[1], -forward[0]];
  const target = [world[0] + right[0] * 0.12, world[1] + right[1] * 0.12];
  const desired = [world[0] + right[0] * 0.9 - forward[0] * 5.35, world[1] + right[1] * 0.9 - forward[1] * 5.35];
  const arm = resolvePlanarSpringArm(target[0], target[1], desired[0], desired[1], map.boundary, obstacles, 0.26, 0.08);
  assert.equal(arm.blockerId, null);
  assert.equal(arm.fraction, 1);
  assert.equal(candidate.camera.analyticSpringArm, "pass-uncompressed");
});
