import assert from "node:assert/strict";
import test from "node:test";
import { Vector3 } from "three";
import {
  composeCameraOffset,
  isPlanarPositionBlockedInPolygon,
  isPlanarSightLineBlockedInPolygon,
  isPointInsidePolygon,
  isPlanarPositionBlocked,
  resolvePolygonMovement,
  resolvePlanarMovement,
  rotateTangentTowards,
  transformMapObstacle,
} from "../app/scene/world-math.ts";

const EPSILON = 1e-9;

test("相反方向的相机跟随只做水平转向并保持俯仰", () => {
  const up = new Vector3(0, 1, 0);
  const target = new Vector3(0, 0, 1);
  const horizontal = new Vector3(0, 0, -1);
  const offset = new Vector3();
  const pitch = 0.56;

  for (let index = 0; index < 24; index += 1) {
    rotateTangentTowards(horizontal, target, up, Math.PI / 24, horizontal);
    composeCameraOffset(horizontal, up, 9, pitch, offset);
    assert.ok(Math.abs(horizontal.dot(up)) < EPSILON);
    assert.ok(Math.abs(offset.length() - 9) < EPSILON);
    assert.ok(Math.abs(offset.clone().normalize().dot(up) - pitch) < EPSILON);
  }

  assert.ok(horizontal.distanceTo(target) < EPSILON);
});

test("角色不能越过地图边界", () => {
  const result = resolvePlanarMovement(
    new Vector3(9, 0, 9),
    new Vector3(5, 0, 5),
    { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
    [],
    0.5,
  );
  assert.equal(result.x, 9.5);
  assert.equal(result.z, 9.5);
});

test("角色碰到建筑后仍可沿墙滑动", () => {
  const result = resolvePlanarMovement(
    new Vector3(0, 0, 0),
    new Vector3(2, 0, 1),
    { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
    [{ minX: 1, maxX: 3, minZ: -1, maxZ: 1 }],
    0.35,
  );
  assert.equal(result.x, 0);
  assert.equal(result.z, 1);
});

test("相机可以识别建筑和地图外部为阻挡区域", () => {
  const bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
  const obstacles = [{ minX: 2, maxX: 4, minZ: 2, maxZ: 4 }];
  assert.equal(isPlanarPositionBlocked(3, 3, bounds, obstacles, 0.2), true);
  assert.equal(isPlanarPositionBlocked(10.1, 0, bounds, obstacles, 0.2), true);
  assert.equal(isPlanarPositionBlocked(0, 0, bounds, obstacles, 0.2), false);
});

test("相机候选点虽安全但整条视线穿墙时仍判定为阻挡", () => {
  const polygon = [[-10, -10], [10, -10], [10, 10], [-10, 10]];
  const wall = [{ minX: -0.4, maxX: 0.4, minZ: -4, maxZ: 4 }];
  assert.equal(isPlanarPositionBlockedInPolygon(-4, 0, polygon, wall, 0.2), false);
  assert.equal(isPlanarPositionBlockedInPolygon(4, 0, polygon, wall, 0.2), false);
  assert.equal(isPlanarSightLineBlockedInPolygon(-4, 0, 4, 0, polygon, wall, 0.2), true);
  assert.equal(isPlanarSightLineBlockedInPolygon(-4, 6, 4, 6, polygon, wall, 0.2), false);
});

test("真实多边形边界会阻止角色进入外接矩形中的无效区域", () => {
  const polygon = [[0, 0], [8, 0], [8, 3], [3, 3], [3, 8], [0, 8]];
  assert.equal(isPointInsidePolygon(1, 6, polygon), true);
  assert.equal(isPointInsidePolygon(6, 6, polygon), false);
  assert.equal(isPointInsidePolygon(0, 4, polygon), true);
  assert.equal(isPointInsidePolygon(3, 6, polygon), true);
  assert.equal(isPointInsidePolygon(8, 2, polygon), true);
  assert.equal(isPointInsidePolygon(2, 8, polygon), true);
  assert.equal(isPlanarPositionBlockedInPolygon(0.2, 4, polygon, [], 0.3), true);

  const result = resolvePolygonMovement(
    new Vector3(2, 0, 6),
    new Vector3(4, 0, 1),
    polygon,
    [],
    0.25,
  );
  assert.equal(result.x, 2);
  assert.equal(result.z, 7);
});

test("幸福里碰撞盒与模型使用同一平移旋转缩放", () => {
  const transformed = transformMapObstacle(
    { minX: -2, maxX: 2, minZ: -8, maxZ: -6 },
    [20, 3],
    Math.PI / 2,
    0.5,
    -7,
  );
  assert.ok(Math.abs(transformed.minX - 19.5) < EPSILON);
  assert.ok(Math.abs(transformed.maxX - 20.5) < EPSILON);
  assert.ok(Math.abs(transformed.minZ - 2) < EPSILON);
  assert.ok(Math.abs(transformed.maxZ - 4) < EPSILON);
});
