import assert from "node:assert/strict";
import test from "node:test";
import { PerspectiveCamera, Vector3 } from "three";
import {
  cameraRelativeInputToPlanarMove,
  composeCameraOffset,
  forwardFramingWeight,
  isPlanarCameraCandidateClearInPolygon,
  isDirectReverseInput,
  isPlanarPositionBlockedInPolygon,
  isPlanarSightLineBlockedInPolygon,
  isPointInsidePolygon,
  isPlanarPositionBlocked,
  lateralMovementWeight,
  movementCameraFollowWeight,
  reverseTurnTranslationScale,
  resolvePolygonMovement,
  resolvePlanarMovement,
  rotateTangentTowards,
  screenInputToPlanarMove,
  shouldStartReverseTurn,
  stopFramingEnvelope,
  transformMapObstacle,
} from "../app/scene/world-math.ts";

const EPSILON = 1e-9;

test("全览地图方向始终对应屏幕上下左右而不是人物朝向", () => {
  const camera = new PerspectiveCamera(58, 16 / 9, 0.1, 2000);
  camera.position.set(10, 12, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const originOnScreen = new Vector3(0, 0, 0).project(camera);

  const upMove = screenInputToPlanarMove(
    camera.matrixWorld,
    0,
    1,
    new Vector3(0, 1, 0),
  );
  const rightMove = screenInputToPlanarMove(
    camera.matrixWorld,
    1,
    0,
    new Vector3(0, 1, 0),
  );

  assert.ok(upMove.clone().project(camera).y > originOnScreen.y);
  assert.ok(rightMove.clone().project(camera).x > originOnScreen.x);
});

test("持续移动时每帧使用当前相机平面而不是首次按下时的旧方向", () => {
  const currentCameraForward = new Vector3(1, 0, 0);
  const currentCameraRight = new Vector3(0, 0, -1);
  const staleCameraForward = new Vector3(0, 0, 1);

  const currentMove = cameraRelativeInputToPlanarMove(
    currentCameraForward,
    currentCameraRight,
    0,
    1,
  );

  assert.ok(currentMove.distanceTo(currentCameraForward) < EPSILON);
  assert.ok(Math.abs(staleCameraForward.dot(currentCameraForward)) < EPSILON);
  assert.ok(Math.abs(staleCameraForward.angleTo(currentMove) - Math.PI / 2) < EPSILON);
});

test("开启肩位后前推仍严格沿真实镜头的屏幕前方", () => {
  const up = new Vector3(0, 1, 0);
  const target = new Vector3(0, 1.45, 0);
  const camera = new PerspectiveCamera();
  camera.position.set(0.78, 1.95, -5);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);

  const viewForward = camera.getWorldDirection(new Vector3()).projectOnPlane(up).normalize();
  const viewRight = viewForward.clone().cross(up).normalize();
  const move = cameraRelativeInputToPlanarMove(
    viewForward,
    viewRight,
    0,
    1,
  ).normalize();
  const rigForwardWithoutShoulder = new Vector3(0, 0, 1);

  assert.ok(move.distanceTo(viewForward) < EPSILON);
  assert.ok(
    rigForwardWithoutShoulder.angleTo(viewForward) > 8 * Math.PI / 180,
    "测试必须覆盖肩位造成的可见方向差异",
  );
});

test("直后拉锁定反向目标并暂停镜头自动跟随", () => {
  const cameraForward = new Vector3(0, 0, 1);
  const cameraRight = new Vector3(-1, 0, 0);
  const characterForward = new Vector3(0, 0, 1);
  const reverseMove = cameraRelativeInputToPlanarMove(
    cameraForward,
    cameraRight,
    0,
    -1,
  ).normalize();

  assert.equal(isDirectReverseInput(0, -1), true);
  assert.equal(isDirectReverseInput(0.8, -0.6), false);
  assert.equal(shouldStartReverseTurn(0, -1, characterForward.dot(reverseMove)), true);
  assert.equal(movementCameraFollowWeight(0, -1, true), 0);
  assert.equal(movementCameraFollowWeight(0, 1, false), 1);
  assert.equal(movementCameraFollowWeight(1, 0, false), 0);
  assert.equal(reverseTurnTranslationScale(-1, true), 0.16);
  assert.equal(reverseTurnTranslationScale(0.85, true), 1);
  assert.equal(reverseTurnTranslationScale(-1, false), 1);
});

test("前进构图右偏，横移停步后短暂向最近移动方向前探", () => {
  assert.equal(forwardFramingWeight(0, 1), 1);
  assert.equal(forwardFramingWeight(1, 0), 0);
  assert.equal(forwardFramingWeight(0, -1), 0);
  assert.equal(lateralMovementWeight(1, 0), 1);
  assert.equal(lateralMovementWeight(0, 1), 0);
  assert.equal(stopFramingEnvelope(0), 1);
  assert.equal(stopFramingEnvelope(0.75), 1);
  assert.ok(stopFramingEnvelope(1.5) > 0);
  assert.ok(stopFramingEnvelope(1.5) < 1);
  assert.equal(stopFramingEnvelope(2.2), 0);
});

test("停步构图包络按墙钟在 10/30/60fps 得到相同结果", () => {
  const envelopeAfter = (fps, duration) => {
    let elapsed = 0;
    const frame = 1 / fps;
    const frameCount = Math.round(fps * duration);
    for (let index = 0; index < frameCount; index += 1) elapsed += frame;
    return stopFramingEnvelope(elapsed);
  };

  const at10fps = envelopeAfter(10, 1.5);
  const at30fps = envelopeAfter(30, 1.5);
  const at60fps = envelopeAfter(60, 1.5);
  assert.ok(Math.abs(at10fps - at30fps) < EPSILON);
  assert.ok(Math.abs(at30fps - at60fps) < EPSILON);
  for (const fps of [10, 30, 60]) assert.equal(envelopeAfter(fps, 2.3), 0);
});

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
  assert.equal(isPlanarCameraCandidateClearInPolygon(
    -4,
    0,
    4,
    0,
    polygon,
    wall,
    0.2,
    0.2,
  ), false);
  assert.equal(isPlanarCameraCandidateClearInPolygon(
    -4,
    6,
    4,
    6,
    polygon,
    wall,
    0.2,
    0.2,
  ), true);
  assert.equal(isPlanarCameraCandidateClearInPolygon(
    -4,
    6,
    0,
    0,
    polygon,
    wall,
    0.2,
    0.2,
  ), false);
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

test("幸福里纵向退界不会错误压缩横向街巷宽度", () => {
  const transformed = transformMapObstacle(
    { minX: -2, maxX: 2, minZ: -9, maxZ: -5 },
    [0, 0],
    0,
    0.6,
    -7,
    0.5,
  );
  assert.equal(transformed.minX, -1);
  assert.equal(transformed.maxX, 1);
  assert.equal(transformed.minZ, -1.2);
  assert.equal(transformed.maxZ, 1.2);
});
