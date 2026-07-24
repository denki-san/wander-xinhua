export const XINHUA_ROAD_AXIS = Object.freeze([
  Object.freeze([-144.9257, 22.4335]),
  Object.freeze([-88.5458, 44.2631]),
  Object.freeze([55.7046, 102.2229]),
  Object.freeze([171.4336, 151.3149]),
]);

export const TREE_BUILDING_CLEARANCE = 1.4;
export const XINHUA_ROAD_TRANSPARENT_CAMERA_OBSTACLES = Object.freeze([]);

/**
 * 先把世界坐标逆变换回建筑局部坐标，再计算到建筑旋转矩形轮廓的距离。
 * @param {readonly [number, number]} focusPosition
 */
export function planarDistanceToLandmarkFootprint([focusX, focusZ], landmark) {
  const [positionX, positionZ] = landmark.position;
  const localWorldX = (focusX - positionX) / landmark.scale;
  const localWorldZ = (focusZ - positionZ) / landmark.scale;
  const cosine = Math.cos(landmark.yaw);
  const sine = Math.sin(landmark.yaw);
  const localX = cosine * localWorldX - sine * localWorldZ;
  const sourceZ = -sine * localWorldX - cosine * localWorldZ;
  const bounds = landmark.localBounds;
  const outsideX = Math.max(bounds.minX - localX, 0, localX - bounds.maxX);
  const outsideZ = Math.max(bounds.minZ - sourceZ, 0, sourceZ - bounds.maxZ);
  return Math.hypot(outsideX, outsideZ) * landmark.scale;
}

function polylineLength(points) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]);
  }
  return length;
}

function samplePolyline(points, distance) {
  let remaining = distance;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const length = Math.hypot(dx, dz);
    if (remaining <= length) {
      const ratio = remaining / length;
      return {
        point: [start[0] + dx * ratio, start[1] + dz * ratio],
        tangent: [dx / length, dz / length],
      };
    }
    remaining -= length;
  }
  const last = points.at(-1) ?? [0, 0];
  return { point: [...last], tangent: [1, 0] };
}

function deterministicUnit(id, salt) {
  let hash = (2166136261 ^ salt) >>> 0;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash / 0xffffffff;
}

/** 使用生产道路轴线、入口和建筑碰撞包络生成梧桐树阵。 */
export function buildPlaneTreePlacements(landmarks, obstacles) {
  const entrances = landmarks.map(({ start }) => start);
  const placements = [];
  const spacing = 14.5;
  const total = polylineLength(XINHUA_ROAD_AXIS);

  for (let side = 0; side < 2; side += 1) {
    let previousVariant = -1;
    for (let distance = 7 + side * spacing * 0.5, index = 0; distance < total - 6; distance += spacing, index += 1) {
      const { point, tangent } = samplePolyline(XINHUA_ROAD_AXIS, distance);
      const sideSign = side === 0 ? 1 : -1;
      const id = `plane-tree-${side}-${index}`;
      const offset = 6.55 + deterministicUnit(id, 13) * 0.55;
      const position = [
        point[0] - tangent[1] * offset * sideSign,
        point[1] + tangent[0] * offset * sideSign,
      ];
      const tooCloseToEntrance = entrances.some(
        ([x, z]) => Math.hypot(position[0] - x, position[1] - z) < 9.2,
      );
      const intersectsBuilding = obstacles.some((obstacle) => (
        position[0] >= obstacle.minX - TREE_BUILDING_CLEARANCE
        && position[0] <= obstacle.maxX + TREE_BUILDING_CLEARANCE
        && position[1] >= obstacle.minZ - TREE_BUILDING_CLEARANCE
        && position[1] <= obstacle.maxZ + TREE_BUILDING_CLEARANCE
      ));
      if (tooCloseToEntrance || intersectsBuilding) continue;
      let variant = Math.floor(deterministicUnit(id, 29) * 3);
      if (variant === previousVariant) {
        variant = (variant + 1 + (deterministicUnit(id, 37) > 0.5 ? 1 : 0)) % 3;
      }
      previousVariant = variant;
      placements.push({
        id,
        variant,
        position,
        yaw: deterministicUnit(id, 43) * Math.PI * 2,
        scale: [
          0.92 + deterministicUnit(id, 53) * 0.16,
          0.9 + deterministicUnit(id, 61) * 0.19,
          0.94 + deterministicUnit(id, 71) * 0.12,
        ],
      });
    }
  }
  return placements;
}
