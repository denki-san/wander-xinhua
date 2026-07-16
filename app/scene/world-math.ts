import { Vector3 } from "three";

const DAMP_FROM = new Vector3();
const DAMP_TO = new Vector3();
const DAMP_CROSS = new Vector3();

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

export type MapPolygonPoint = readonly [number, number];

/** 只绕地面法线旋转方向，180 度转向时也不会穿过镜头顶部。 */
export function rotateTangentTowards(
  current: Vector3,
  target: Vector3,
  normal: Vector3,
  maxRadians: number,
  result = new Vector3(),
) {
  const from = DAMP_FROM.copy(current).projectOnPlane(normal);
  const to = DAMP_TO.copy(target).projectOnPlane(normal);
  if (from.lengthSq() < 1e-8 || to.lengthSq() < 1e-8) return result.copy(current);

  from.normalize();
  to.normalize();
  const cross = DAMP_CROSS.copy(from).cross(to);
  let angle = Math.atan2(normal.dot(cross), Math.min(1, Math.max(-1, from.dot(to))));
  if (Math.abs(angle) > maxRadians) angle = Math.sign(angle) * maxRadians;
  return result.copy(from).applyAxisAngle(normal, angle).normalize();
}

/** 返回与帧率无关的指数阻尼插值比例。 */
export function dampingFactor(lambda: number, delta: number) {
  return 1 - Math.exp(-Math.max(0, lambda) * Math.max(0, delta));
}

/**
 * 在切平面内按指数阻尼转向，既走最短圆弧，也会在接近目标时自然减速。
 */
export function dampTangentTowards(
  current: Vector3,
  target: Vector3,
  normal: Vector3,
  lambda: number,
  delta: number,
  result = new Vector3(),
  maxRadiansPerSecond = Number.POSITIVE_INFINITY,
) {
  const from = DAMP_FROM.copy(current).projectOnPlane(normal);
  const to = DAMP_TO.copy(target).projectOnPlane(normal);
  if (from.lengthSq() < 1e-8 || to.lengthSq() < 1e-8) return result.copy(current);

  from.normalize();
  to.normalize();
  const signedAngle = Math.atan2(
    normal.dot(DAMP_CROSS.copy(from).cross(to)),
    Math.min(1, Math.max(-1, from.dot(to))),
  );
  const dampedAngle = signedAngle * dampingFactor(lambda, delta);
  const maximumStep = Math.max(0, maxRadiansPerSecond) * Math.max(0, delta);
  const angle = Number.isFinite(maximumStep)
    ? Math.sign(dampedAngle) * Math.min(Math.abs(dampedAngle), maximumStep)
    : dampedAngle;
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

/** 使用射线法判断地面点是否位于真实街道行政边界内。 */
export function isPointInsidePolygon(
  x: number,
  z: number,
  polygon: readonly MapPolygonPoint[],
) {
  for (let index = 0; index < polygon.length; index += 1) {
    if (distanceToSegment(x, z, polygon[index], polygon[(index + 1) % polygon.length]) < 1e-9) return true;
  }
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const intersects = ((currentPoint[1] > z) !== (previousPoint[1] > z))
      && x < (previousPoint[0] - currentPoint[0]) * (z - currentPoint[1])
        / (previousPoint[1] - currentPoint[1]) + currentPoint[0];
    if (intersects) inside = !inside;
  }
  return inside;
}

function distanceToSegment(
  x: number,
  z: number,
  start: MapPolygonPoint,
  end: MapPolygonPoint,
) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  if (Math.abs(dx) + Math.abs(dz) < 1e-9) return Math.hypot(x - start[0], z - start[1]);
  const t = Math.max(0, Math.min(1, ((x - start[0]) * dx + (z - start[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - (start[0] + dx * t), z - (start[1] + dz * t));
}

/**
 * 多边形版阻挡判断。半径会同时作用于边界和建筑，角色及相机不会露到行政区外。
 */
export function isPlanarPositionBlockedInPolygon(
  x: number,
  z: number,
  polygon: readonly MapPolygonPoint[],
  obstacles: MapObstacle[],
  radius = 0,
) {
  if (!isPointInsidePolygon(x, z, polygon)) return true;
  if (radius > 0) {
    for (let index = 0; index < polygon.length; index += 1) {
      if (distanceToSegment(x, z, polygon[index], polygon[(index + 1) % polygon.length]) < radius) return true;
    }
  }
  return obstacles.some((obstacle) => (
    x + radius > obstacle.minX
    && x - radius < obstacle.maxX
    && z + radius > obstacle.minZ
    && z - radius < obstacle.maxZ
  ));
}

function segmentIntersectsExpandedObstacle(
  startX: number,
  startZ: number,
  endX: number,
  endZ: number,
  obstacle: MapObstacle,
  padding: number,
) {
  const minX = obstacle.minX - padding;
  const maxX = obstacle.maxX + padding;
  const minZ = obstacle.minZ - padding;
  const maxZ = obstacle.maxZ + padding;
  const deltaX = endX - startX;
  const deltaZ = endZ - startZ;
  let near = 0;
  let far = 1;

  for (const [start, delta, minimum, maximum] of [
    [startX, deltaX, minX, maxX],
    [startZ, deltaZ, minZ, maxZ],
  ]) {
    if (Math.abs(delta) < 1e-9) {
      if (start < minimum || start > maximum) return false;
      continue;
    }
    let entry = (minimum - start) / delta;
    let exit = (maximum - start) / delta;
    if (entry > exit) [entry, exit] = [exit, entry];
    near = Math.max(near, entry);
    far = Math.min(far, exit);
    if (near > far) return false;
  }
  return far >= 0 && near <= 1;
}

/** 判断角色到候选镜头的整条地面投影视线是否穿过建筑或离开地图。 */
export function isPlanarSightLineBlockedInPolygon(
  startX: number,
  startZ: number,
  endX: number,
  endZ: number,
  polygon: readonly MapPolygonPoint[],
  obstacles: MapObstacle[],
  radius = 0,
) {
  // 对边界做短步长采样，兼容新华路街道的凹多边形边界。
  for (let step = 0; step <= 8; step += 1) {
    const t = step / 8;
    if (!isPointInsidePolygon(
      startX + (endX - startX) * t,
      startZ + (endZ - startZ) * t,
      polygon,
    )) return true;
  }
  return obstacles.some((obstacle) => segmentIntersectsExpandedObstacle(
    startX,
    startZ,
    endX,
    endZ,
    obstacle,
    radius,
  ));
}

/** 真实多边形边界内的分轴移动解析，保留沿建筑和边界滑动的手感。 */
export function resolvePolygonMovement(
  current: Vector3,
  displacement: Vector3,
  polygon: readonly MapPolygonPoint[],
  obstacles: MapObstacle[],
  radius: number,
  result = new Vector3(),
) {
  result.copy(current);
  const nextX = current.x + displacement.x;
  if (!isPlanarPositionBlockedInPolygon(nextX, result.z, polygon, obstacles, radius)) result.x = nextX;

  const nextZ = current.z + displacement.z;
  if (!isPlanarPositionBlockedInPolygon(result.x, nextZ, polygon, obstacles, radius)) result.z = nextZ;
  return result;
}

/** 将局部 X/Z 点按地图锚点、Y 轴旋转和统一水平比例变换到全局坐标。 */
export function transformMapPoint(
  x: number,
  z: number,
  position: MapPolygonPoint,
  rotationY: number,
  horizontalScale: number,
  localCenterZ = 0,
): MapPolygonPoint {
  const scaledX = x * horizontalScale;
  const scaledZ = (z - localCenterZ) * horizontalScale;
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  return [
    position[0] + scaledX * cos + scaledZ * sin,
    position[1] - scaledX * sin + scaledZ * cos,
  ];
}

/** 将局部街区模型中的轴对齐碰撞盒变换到全局地图坐标。 */
export function transformMapObstacle(
  obstacle: MapObstacle,
  position: MapPolygonPoint,
  rotationY: number,
  horizontalScale: number,
  localCenterZ = 0,
): MapObstacle {
  const corners = [
    [obstacle.minX, obstacle.minZ],
    [obstacle.minX, obstacle.maxZ],
    [obstacle.maxX, obstacle.minZ],
    [obstacle.maxX, obstacle.maxZ],
  ].map(([x, z]) => transformMapPoint(
    x,
    z,
    position,
    rotationY,
    horizontalScale,
    localCenterZ,
  ));
  return {
    minX: Math.min(...corners.map(([x]) => x)),
    maxX: Math.max(...corners.map(([x]) => x)),
    minZ: Math.min(...corners.map(([, z]) => z)),
    maxZ: Math.max(...corners.map(([, z]) => z)),
  };
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
