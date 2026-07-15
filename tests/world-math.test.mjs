import assert from "node:assert/strict";
import test from "node:test";
import { Vector3 } from "three";
import {
  composeCameraOffset,
  isPlanarPositionBlocked,
  resolvePlanarMovement,
  rotateTangentTowards,
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
