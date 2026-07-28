export const XINHUA_ROAD_AXIS = Object.freeze([
  Object.freeze([-144.9257, 22.4335]),
  Object.freeze([-88.5458, 44.2631]),
  Object.freeze([55.7046, 102.2229]),
  Object.freeze([171.4336, 151.3149]),
]);

export const TREE_BUILDING_CLEARANCE = 1.4;
export const TREE_ENTRANCE_CLEARANCE = 9.2;
export const PILOT_TREE_ENTRANCE_CLEARANCE = 5.4;
export const XINHUA_ROAD_TRANSPARENT_CAMERA_OBSTACLES = Object.freeze([]);
export const XINHUA_PLANE_TREE_PILOT = Object.freeze({
  centerDistance: 131.1,
  length: 55.6,
  targetCount: 18,
});
export const XINHUA_PLANE_TREE_TRUNK_HALF_EXTENT = 0.48;

/** 只按树干底部生成玩家碰撞盒，不把树冠或板根算作阻挡。 */
export function buildPlaneTreeTrunkObstacles(
  placements,
  halfExtent = XINHUA_PLANE_TREE_TRUNK_HALF_EXTENT,
) {
  return placements.map(({ position, scale }) => {
    const halfX = halfExtent * scale[0];
    const halfZ = halfExtent * scale[2];
    return {
      minX: position[0] - halfX,
      maxX: position[0] + halfX,
      minZ: position[1] - halfZ,
      maxZ: position[1] + halfZ,
    };
  });
}

/** 根据模型真实最低点把缩放后的实例精确贴到目标地表。 */
export function groundedPlaneTreeTranslationY(surfaceY, scaleY, modelMinimumY) {
  return surfaceY - modelMinimumY * scaleY;
}

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

function evenlySelect(candidates, count) {
  if (count <= 0) return [];
  if (candidates.length <= count) return [...candidates];
  if (count === 1) return [candidates[Math.floor(candidates.length / 2)]];
  return Array.from({ length: count }, (_, index) => (
    candidates[Math.round(index * (candidates.length - 1) / (count - 1))]
  ));
}

/** 使用生产道路轴线、入口和建筑碰撞包络生成梧桐树阵。 */
export function buildPlaneTreePlacements(
  landmarks,
  obstacles,
  pilotObstacles = obstacles,
) {
  const entrances = landmarks.map(({ start }) => start);
  const candidatesBySide = [[], []];
  const pilotCandidatesBySide = [[], []];
  const spacing = 14.5;
  const total = polylineLength(XINHUA_ROAD_AXIS);
  const pilotStart = XINHUA_PLANE_TREE_PILOT.centerDistance
    - XINHUA_PLANE_TREE_PILOT.length / 2;
  const pilotEnd = XINHUA_PLANE_TREE_PILOT.centerDistance
    + XINHUA_PLANE_TREE_PILOT.length / 2;

  function appendCandidate(
    side,
    distance,
    id,
    target,
    entranceClearance,
    activeObstacles,
  ) {
    const { point, tangent } = samplePolyline(XINHUA_ROAD_AXIS, distance);
    const sideSign = side === 0 ? 1 : -1;
    const offset = 6.55 + deterministicUnit(id, 13) * 0.55;
    const position = [
      point[0] - tangent[1] * offset * sideSign,
      point[1] + tangent[0] * offset * sideSign,
    ];
    const tooCloseToEntrance = entrances.some(
      ([x, z]) => (
        Math.hypot(position[0] - x, position[1] - z) < entranceClearance
      ),
    );
    const intersectsBuilding = activeObstacles.some((obstacle) => (
      position[0] >= obstacle.minX - TREE_BUILDING_CLEARANCE
      && position[0] <= obstacle.maxX + TREE_BUILDING_CLEARANCE
      && position[1] >= obstacle.minZ - TREE_BUILDING_CLEARANCE
      && position[1] <= obstacle.maxZ + TREE_BUILDING_CLEARANCE
    ));
    if (tooCloseToEntrance || intersectsBuilding) return;
    target.push({
      id,
      side,
      distance,
      position,
      tangent,
      sideSign,
    });
  }

  for (let side = 0; side < 2; side += 1) {
    for (let distance = 7 + side * spacing * 0.5, index = 0; distance < total - 6; distance += spacing, index += 1) {
      if (distance >= pilotStart && distance <= pilotEnd) continue;
      appendCandidate(
        side,
        distance,
        `plane-tree-${side}-${index}`,
        candidatesBySide[side],
        TREE_ENTRANCE_CLEARANCE,
        obstacles,
      );
    }
    // 先密采样，再从安全树位中均匀抽取。这样入口/建筑避让后仍能稳定得到
    // 9+9 棵，而不是为了凑数把树放进入口净空。
    for (
      let distance = pilotStart + 1.8 + side * 1.8, index = 0;
      distance < pilotEnd - 1.8;
      distance += 3.6, index += 1
    ) {
      appendCandidate(
        side,
        distance,
        `plane-tree-${side}-pilot-${index}`,
        pilotCandidatesBySide[side],
        PILOT_TREE_ENTRANCE_CLEARANCE,
        pilotObstacles,
      );
    }
  }

  const pilotTargetBySide = Math.floor(XINHUA_PLANE_TREE_PILOT.targetCount / 2);
  const selectedCounts = pilotCandidatesBySide.map((candidates) => (
    Math.min(pilotTargetBySide, candidates.length)
  ));
  let unassigned = XINHUA_PLANE_TREE_PILOT.targetCount
    - selectedCounts[0]
    - selectedCounts[1];
  while (unassigned > 0) {
    const side = pilotCandidatesBySide[0].length - selectedCounts[0]
      >= pilotCandidatesBySide[1].length - selectedCounts[1]
      ? 0
      : 1;
    if (selectedCounts[side] >= pilotCandidatesBySide[side].length) break;
    selectedCounts[side] += 1;
    unassigned -= 1;
  }
  const selectedPilot = [
    ...evenlySelect(pilotCandidatesBySide[0], selectedCounts[0]),
    ...evenlySelect(pilotCandidatesBySide[1], selectedCounts[1]),
  ];
  if (selectedPilot.length !== XINHUA_PLANE_TREE_PILOT.targetCount) {
    throw new Error(
      `新华路315号梧桐试验段安全树位不足：`
      + `${selectedPilot.length}/${XINHUA_PLANE_TREE_PILOT.targetCount}`,
    );
  }

  const placements = [];
  for (let side = 0; side < 2; side += 1) {
    let previousVariant = -1;
    const sideCandidates = [
      ...candidatesBySide[side],
      ...selectedPilot.filter((candidate) => candidate.side === side),
    ].sort((a, b) => a.distance - b.distance);
    for (const candidate of sideCandidates) {
      const {
        id,
        position,
        tangent,
        sideSign,
      } = candidate;
      let variant = Math.floor(deterministicUnit(id, 29) * 4);
      if (variant === previousVariant) {
        variant = (variant + 1 + (deterministicUnit(id, 37) > 0.5 ? 1 : 0)) % 4;
      }
      previousVariant = variant;
      // Identity 的本地 -Y 是道路内侧；运行时换轴后对应本地 -Z。
      // 用道路切线和所在侧别定向，只保留约 ±4° 的确定性自然扰动。
      const inwardYaw = Math.atan2(
        -tangent[1] * sideSign,
        tangent[0] * sideSign,
      );
      placements.push({
        id,
        variant,
        position,
        yaw: inwardYaw + (deterministicUnit(id, 43) - 0.5) * 0.14,
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
