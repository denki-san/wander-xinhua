export type OverviewCameraGroundBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

type OverviewCameraTargetInput = {
  focusX: number;
  focusZ: number;
  bounds: OverviewCameraGroundBounds;
  contentFocusLimit: number;
  maxFocusLag: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function constrainOverviewCameraTarget({
  focusX,
  focusZ,
  bounds,
  contentFocusLimit,
  maxFocusLag,
}: OverviewCameraTargetInput): readonly [number, number] {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const halfWidth = (bounds.maxX - bounds.minX) * contentFocusLimit / 2;
  const halfDepth = (bounds.maxZ - bounds.minZ) * contentFocusLimit / 2;
  const contentX = clamp(focusX, centerX - halfWidth, centerX + halfWidth);
  const contentZ = clamp(focusZ, centerZ - halfDepth, centerZ + halfDepth);
  const deltaX = contentX - focusX;
  const deltaZ = contentZ - focusZ;
  const lag = Math.hypot(deltaX, deltaZ);

  if (lag <= maxFocusLag || lag === 0) {
    return [contentX, contentZ];
  }

  const scale = maxFocusLag / lag;
  return [
    focusX + deltaX * scale,
    focusZ + deltaZ * scale,
  ];
}
