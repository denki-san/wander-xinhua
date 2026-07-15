export interface InputState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
}

// 键盘和触屏摇杆共用同一份即时状态，避免每帧移动触发 React 重渲染。
export const inputState: InputState = {
  forward: false,
  back: false,
  left: false,
  right: false,
  sprint: false,
  jump: false,
};

export function resetInput() {
  inputState.forward = false;
  inputState.back = false;
  inputState.left = false;
  inputState.right = false;
  inputState.sprint = false;
  inputState.jump = false;
}

export function setMoveVector(x: number, y: number) {
  const magnitude = Math.hypot(x, y);
  const deadZone = 0.26;
  inputState.forward = magnitude >= deadZone && y < -deadZone;
  inputState.back = magnitude >= deadZone && y > deadZone;
  inputState.left = magnitude >= deadZone && x < -deadZone;
  inputState.right = magnitude >= deadZone && x > deadZone;
  inputState.sprint = magnitude > 0.88;
}
