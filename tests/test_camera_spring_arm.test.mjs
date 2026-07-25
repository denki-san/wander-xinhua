import assert from "node:assert/strict";
import test from "node:test";
import {
  explorationVerticalFov,
  isPlanarPositionBlockedInPolygon,
  nextCameraZoomDistance,
  normalizeWheelDeltaY,
  remainingDeadlineMs,
  resolvePlanarSpringArm,
  stepSpringArmLength,
} from "../app/scene/world-math.ts";

const SQUARE = [
  [-10, -10],
  [10, -10],
  [10, 10],
  [-10, 10],
];

test("spring arm 在无遮挡路径保持完整臂长", () => {
  const result = resolvePlanarSpringArm(
    0,
    0,
    6,
    0,
    SQUARE,
    [],
    0.25,
    0.1,
  );

  assert.equal(result.fraction, 1);
  assert.equal(result.blockerId, null);
  assert.equal(result.planarDistance, 6);
});

test("spring arm 对扩张建筑盒返回连续首个接触距离并保留安全边距", () => {
  const result = resolvePlanarSpringArm(
    0,
    0,
    10,
    0,
    SQUARE,
    [{ minX: 4, maxX: 5, minZ: -1, maxZ: 1 }],
    0.5,
    0.25,
  );

  // 建筑最小 X=4，扩张半径后首碰为 3.5，再退安全边距 0.25。
  assert.ok(Math.abs(result.fraction - 0.325) < 1e-9);
  assert.equal(result.blockerId, "obstacle-0");
});

test("spring arm 选择最近阻挡而不是数组中的第一个阻挡", () => {
  const result = resolvePlanarSpringArm(
    0,
    0,
    10,
    0,
    SQUARE,
    [
      { minX: 7, maxX: 8, minZ: -1, maxZ: 1 },
      { minX: 3, maxX: 4, minZ: -1, maxZ: 1 },
    ],
    0.25,
    0.1,
  );

  assert.equal(result.blockerId, "obstacle-1");
  assert.ok(Math.abs(result.fraction - 0.265) < 1e-9);
});

test("spring arm 在凹边界前停下且不把边界外重新进入当作安全", () => {
  const concave = [
    [0, 0],
    [8, 0],
    [8, 3],
    [3, 3],
    [3, 8],
    [0, 8],
  ];
  const result = resolvePlanarSpringArm(
    1,
    1,
    7,
    7,
    concave,
    [],
    0.25,
    0.1,
  );

  assert.equal(result.blockerId, "boundary");
  assert.ok(result.fraction > 0.25 && result.fraction < 0.35);
});

test("spring arm 解析 capsule sweep 不漏过凹角的短暂近切区间", () => {
  const concave = [
    [0, 0],
    [8, 0],
    [8, 3],
    [3, 3],
    [3, 8],
    [0, 8],
  ];
  const start = [1.05, 4.5824];
  const end = [3.5, 2.1324];
  const result = resolvePlanarSpringArm(
    start[0],
    start[1],
    end[0],
    end[1],
    concave,
    [],
    0.26,
    0,
  );

  assert.equal(result.blockerId, "boundary");
  assert.ok(result.fraction > 0.68 && result.fraction < 0.76);
  const shortlyAfterHit = Math.min(1, result.fraction + 0.002);
  assert.equal(isPlanarPositionBlockedInPolygon(
    start[0] + (end[0] - start[0]) * shortlyAfterHit,
    start[1] + (end[1] - start[1]) * shortlyAfterHit,
    concave,
    [],
    0.26,
  ), true);
});

test("spring arm 碰撞收短不穿墙，离墙恢复保持帧率无关", () => {
  assert.equal(stepSpringArmLength(5, 2, 6, 1 / 60), 2);

  const at30fps = stepSpringArmLength(2, 5, 6, 1 / 30);
  const first60fps = stepSpringArmLength(2, 5, 6, 1 / 60);
  const at60fps = stepSpringArmLength(first60fps, 5, 6, 1 / 60);
  assert.ok(Math.abs(at30fps - at60fps) < 1e-9);
  assert.ok(at30fps > 2 && at30fps < 5);
});

test("spring arm 从合法零臂长恢复时不会单帧跳到完整长度", () => {
  const firstFrame = stepSpringArmLength(0, 5, 6, 1 / 60);
  assert.ok(firstFrame > 0);
  assert.ok(firstFrame < 0.5);
});

test("贴墙时构图偏移不移动 spring arm 的安全 pivot", () => {
  const wall = [{ minX: 0.48, maxX: 2, minZ: -0.5, maxZ: 0.5 }];
  const safePivot = resolvePlanarSpringArm(
    0,
    0,
    0.327,
    -5,
    SQUARE,
    wall,
    0.26,
    0.08,
  );
  const shiftedPivot = resolvePlanarSpringArm(
    0.327,
    0,
    0.327,
    -5,
    SQUARE,
    wall,
    0.26,
    0.08,
  );

  assert.equal(safePivot.fraction, 1);
  assert.equal(shiftedPivot.fraction, 0);
  assert.equal(shiftedPivot.blockerId, "obstacle-0");
});

test("探索态 FOV 保持在经验证前的保守产品区间", () => {
  assert.equal(explorationVerticalFov(1440, 1024), 58);
  assert.equal(explorationVerticalFov(844, 390), 58);
  assert.equal(explorationVerticalFov(390, 844), 62);
  assert.ok(explorationVerticalFov(768, 1024) > 58);
  assert.ok(explorationVerticalFov(768, 1024) < 62);
});

test("第一次滚轮输入围绕初始距离连续变化，不被高于初始值的下限顶远", () => {
  const initialDistance = Math.hypot(5.35, 1.95);
  const zoomedIn = nextCameraZoomDistance(initialDistance, -100, 4.6, 12.5);
  const zoomedOut = nextCameraZoomDistance(initialDistance, 100, 4.6, 12.5);

  assert.ok(zoomedIn < initialDistance);
  assert.ok(zoomedOut > initialDistance);
  assert.ok(Math.abs(zoomedIn - initialDistance * 0.88) < 1e-9);
  assert.ok(Math.abs(zoomedOut - initialDistance * 1.12) < 1e-9);
  assert.equal(nextCameraZoomDistance(initialDistance, -10_000, 4.6, 12.5), 4.6);
  assert.equal(nextCameraZoomDistance(initialDistance, 10_000, 4.6, 12.5), 12.5);
});

test("滚轮 line/page 模式先归一化，缩放速度不依赖浏览器 deltaMode", () => {
  assert.equal(normalizeWheelDeltaY(100, 0, 900), 100);
  assert.equal(normalizeWheelDeltaY(3, 1, 900), 48);
  assert.equal(normalizeWheelDeltaY(1, 2, 900), 900);
});

test("手动跟随宽限使用墙钟截止时间，不随 10/30/60fps 改变", () => {
  const deadline = 1_000;
  assert.equal(remainingDeadlineMs(deadline, 650), 350);
  assert.equal(remainingDeadlineMs(deadline, 900), 100);
  assert.equal(remainingDeadlineMs(deadline, 1_050), 0);
});
