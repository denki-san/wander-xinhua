export interface InputState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  moveX: number;
  moveY: number;
  sprint: boolean;
  jump: boolean;
}

export interface AnalogMoveVector {
  x: number;
  y: number;
  magnitude: number;
}

const MOVE_DEAD_ZONE = 0.18;

// 键盘和触屏摇杆共用同一份即时状态，避免每帧移动触发 React 重渲染。
export const inputState: InputState = {
  forward: false,
  back: false,
  left: false,
  right: false,
  moveX: 0,
  moveY: 0,
  sprint: false,
  jump: false,
};

export function resetInput() {
  inputState.forward = false;
  inputState.back = false;
  inputState.left = false;
  inputState.right = false;
  inputState.moveX = 0;
  inputState.moveY = 0;
  inputState.sprint = false;
  inputState.jump = false;
}

/**
 * 对摇杆做径向死区重映射，同时完整保留输入角度。
 * 与按 X/Y 分别设布尔方向相比，这样任意圆周角度都能成为移动方向。
 */
export function normalizeMoveVector(
  x: number,
  y: number,
  deadZone = MOVE_DEAD_ZONE,
): AnalogMoveVector {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { x: 0, y: 0, magnitude: 0 };

  const rawMagnitude = Math.hypot(x, y);
  const safeDeadZone = Math.min(0.95, Math.max(0, deadZone));
  if (rawMagnitude <= safeDeadZone || rawMagnitude < Number.EPSILON) {
    return { x: 0, y: 0, magnitude: 0 };
  }

  const clampedMagnitude = Math.min(1, rawMagnitude);
  const magnitude = (clampedMagnitude - safeDeadZone) / (1 - safeDeadZone);
  const directionScale = magnitude / rawMagnitude;
  return {
    x: x * directionScale,
    y: y * directionScale,
    magnitude,
  };
}

export function shouldSprintFromAnalog(
  x: number,
  y: number,
  runEnabled = true,
) {
  return runEnabled && Math.hypot(x, y) > 0.88;
}

export function setMoveVector(x: number, y: number, runEnabled = true) {
  const move = normalizeMoveVector(x, y);
  inputState.moveX = move.x;
  inputState.moveY = move.y;

  // 继续维护布尔值供角色动画读取；实际位移使用上面的连续向量。
  inputState.forward = move.magnitude > 0 && move.y < 0;
  inputState.back = move.magnitude > 0 && move.y > 0;
  inputState.left = move.magnitude > 0 && move.x < 0;
  inputState.right = move.magnitude > 0 && move.x > 0;
  inputState.sprint = move.magnitude > 0 && shouldSprintFromAnalog(x, y, runEnabled);
}
