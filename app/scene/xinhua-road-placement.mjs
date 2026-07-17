export const XINHUA_ROAD_AXIS = Object.freeze([
  Object.freeze([-144.9257, 22.4335]),
  Object.freeze([-88.5458, 44.2631]),
  Object.freeze([55.7046, 102.2229]),
  Object.freeze([171.4336, 151.3149]),
]);

export const TREE_BUILDING_CLEARANCE = 1.4;
export const XINHUA_ROAD_TRANSPARENT_CAMERA_OBSTACLES = Object.freeze([]);

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

/** 使用生产道路轴线、入口和建筑碰撞包络生成梧桐树阵。 */
export function buildPlaneTreePlacements(landmarks, obstacles) {
  const entrances = landmarks.map(({ start }) => start);
  const placements = [];
  const spacing = 14.5;
  const total = polylineLength(XINHUA_ROAD_AXIS);
  const cycle = [0, 1, 2, 1];

  for (let side = 0; side < 2; side += 1) {
    for (let distance = 7 + side * spacing * 0.5, index = 0; distance < total - 6; distance += spacing, index += 1) {
      const { point, tangent } = samplePolyline(XINHUA_ROAD_AXIS, distance);
      const sideSign = side === 0 ? 1 : -1;
      const offset = 6.6 + ((index * 17 + side * 11) % 5) * 0.12;
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
      placements.push({
        id: `plane-tree-${side}-${index}`,
        variant: cycle[(index + side * 2) % cycle.length],
        position,
        yaw: (index * 1.618 + side * 0.47) % (Math.PI * 2),
        scale: 0.88 + ((index * 7 + side * 3) % 6) * 0.038,
      });
    }
  }
  return placements;
}
