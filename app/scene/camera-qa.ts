export type CameraQaFrame = {
  active: boolean;
  inputX: number;
  inputY: number;
  moving: boolean;
  fov: number;
  goalYawDegrees: number;
  desiredArmYawDegrees: number;
  actualArmYawDegrees: number;
  desiredArmLength: number;
  resolvedArmLength: number;
  blockerId: string | null;
  cameraMode: string;
  manualGraceMs: number;
};

export const cameraQaState: CameraQaFrame & {
  modeChangeCount: number;
  modeHistory: string[];
} = {
  active: false,
  inputX: 0,
  inputY: 0,
  moving: false,
  fov: 50,
  goalYawDegrees: 0,
  desiredArmYawDegrees: 0,
  actualArmYawDegrees: 0,
  desiredArmLength: 0,
  resolvedArmLength: 0,
  blockerId: null,
  cameraMode: "inactive",
  manualGraceMs: 0,
  modeChangeCount: 0,
  modeHistory: [],
};

export function updateCameraQa(frame: CameraQaFrame) {
  if (frame.cameraMode !== cameraQaState.cameraMode) {
    cameraQaState.modeChangeCount += 1;
    cameraQaState.modeHistory = [
      ...cameraQaState.modeHistory,
      frame.cameraMode,
    ].slice(-12);
  }
  Object.assign(cameraQaState, frame);
}

export function resetCameraQa() {
  cameraQaState.active = false;
  cameraQaState.cameraMode = "inactive";
  cameraQaState.blockerId = null;
  cameraQaState.manualGraceMs = 0;
  cameraQaState.modeChangeCount = 0;
  cameraQaState.modeHistory = [];
}
