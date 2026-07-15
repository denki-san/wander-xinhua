import { Vector3 } from "three";

export type MapBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type MapObstacle = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

/** 只绕地面法线旋转方向，180 度转向时也不会穿过镜头顶部。 */
export function rotateTangentTowards(
  current: Vector3,
  target: Vector3,
  normal: Vector3,
  maxRadians: number,
  result = new Vector3(),
) {
  const from = current.clone().projectOnPlane(normal);
  const to = target.clone().projectOnPlane(normal);
  if (from.lengthSq() < 1e-8 || to.lengthSq() < 1e-8) return result.copy(current);

  from.normalize();
  to.normalize();
  const cross = from.clone().cross(to);
  let angle = Math.atan2(normal.dot(cross), Math.min(1, Math.max(-1, from.dot(to))));
  if (Math.abs(angle) > maxRadians) angle = Math.sign(angle) * maxRadians;
  return result.copy(from).applyAxisAngle(normal, angle).normalize();
}

/** 以固定俯仰和距离重组相机偏移，水平转向时镜头高度不漂移。 */
export function composeCameraOffset(
  horizontalDirection: Vector3,
  normal: Vector3,
  distance: number,
  pitch: number,
  result = new Vector3(),
) {
  const safePitch = Math.min(0.93, Math.max(0.12, pitch));
  const horizontalLength = distance * Math.sqrt(1 - safePitch * safePitch);
  return result
    .copy(horizontalDirection)
    .projectOnPlane(normal)
    .normalize()
    .multiplyScalar(horizontalLength)
    .addScaledVector(normal, distance * safePitch);
}

export function isPlanarPositionBlocked(
  x: number,
  z: number,
  bounds: MapBounds,
  obstacles: MapObstacle[],
  radius = 0,
) {
  if (
    x - radius < bounds.minX
    || x + radius > bounds.maxX
    || z - radius < bounds.minZ
    || z + radius > bounds.maxZ
  ) return true;
  return obstacles.some((obstacle) => (
    x + radius > obstacle.minX
    && x - radius < obstacle.maxX
    && z + radius > obstacle.minZ
    && z - radius < obstacle.maxZ
  ));
}

/**
 * 依次解析 X、Z 两个方向，让角色撞到建筑时沿墙滑动，并始终留在街区边界内。
 */
export function resolvePlanarMovement(
  current: Vector3,
  displacement: Vector3,
  bounds: MapBounds,
  obstacles: MapObstacle[],
  radius: number,
  result = new Vector3(),
) {
  result.copy(current);
  const nextX = Math.min(bounds.maxX - radius, Math.max(bounds.minX + radius, current.x + displacement.x));
  if (!isPlanarPositionBlocked(nextX, result.z, bounds, obstacles, radius)) result.x = nextX;

  const nextZ = Math.min(bounds.maxZ - radius, Math.max(bounds.minZ + radius, current.z + displacement.z));
  if (!isPlanarPositionBlocked(result.x, nextZ, bounds, obstacles, radius)) result.z = nextZ;
  return result;
}
