import roadNetworkData from "./plane-tree-road-network-data.json" with { type: "json" };

export const XINHUA_ROAD_AXIS = Object.freeze([
  Object.freeze([-144.9257, 22.4335]),
  Object.freeze([-88.5458, 44.2631]),
  Object.freeze([55.7046, 102.2229]),
  Object.freeze([171.4336, 151.3149]),
]);

export const TREE_BUILDING_CLEARANCE = 1.4;
export const TREE_KNOWN_APPROACH_CLEARANCE = 9.2;
export const PILOT_TREE_KNOWN_APPROACH_CLEARANCE = 5.4;
export const XINHUA_ROAD_TRANSPARENT_CAMERA_OBSTACLES = Object.freeze([]);
export const XINHUA_PLANE_TREE_PILOT = Object.freeze({
  centerDistance: 131.1,
  length: 55.6,
  targetCount: 20,
});
export const XINHUA_PLANE_TREE_TRUNK_HALF_EXTENT = 0.48;
export const XINHUA_PLANE_TREE_AXIS_SPACING = 6;
export const XINHUA_PLANE_TREE_PILOT_CANDIDATE_SPACING = 3.6;
export const XINHUA_PLANE_TREE_PILOT_SIDE_PHASE = 1.8;
export const XINHUA_PLANE_TREE_SIDE_OFFSETS = Object.freeze([
  Object.freeze({ base: 5.05, jitter: 0.45 }),
  Object.freeze({ base: 6.55, jitter: 0.45 }),
]);
export const XINHUA_PLANE_TREE_SIDE_PHASES = Object.freeze([0.5, 0]);
export const PLANE_TREE_INTERSECTION_CLEARANCE = 5.8;
export const PLANE_TREE_ROAD_CANDIDATE_SPACING = 1.8;
export const PLANE_TREE_ROAD_CONTRACTS = Object.freeze(
  roadNetworkData.roads.map((road) => Object.freeze({
    ...road,
    points: Object.freeze(
      road.points.map((point) => Object.freeze([...point])),
    ),
    intersections: Object.freeze(
      road.intersections.map((point) => Object.freeze([...point])),
    ),
  })),
);
export const PLANE_TREE_STREET_TARGET =
  roadNetworkData.approval.streetTreeTarget;

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

function selectedCountsBySide(candidatesBySide, targetCount) {
  const targetBySide = Math.floor(targetCount / 2);
  const selectedCounts = candidatesBySide.map((candidates) => (
    Math.min(targetBySide, candidates.length)
  ));
  let unassigned = targetCount - selectedCounts[0] - selectedCounts[1];
  while (unassigned > 0) {
    const remainingBySide = candidatesBySide.map(
      (candidates, side) => candidates.length - selectedCounts[side],
    );
    const side = remainingBySide[0] >= remainingBySide[1] ? 0 : 1;
    if (remainingBySide[side] <= 0) break;
    selectedCounts[side] += 1;
    unassigned -= 1;
  }
  return selectedCounts;
}

function pointIntersectsObstacle(position, obstacle, clearance) {
  return position[0] >= obstacle.minX - clearance
    && position[0] <= obstacle.maxX + clearance
    && position[1] >= obstacle.minZ - clearance
    && position[1] <= obstacle.maxZ + clearance;
}

function roadPilotCenterDistance(road) {
  let distance = 0;
  for (let index = 1; index < road.points.length; index += 1) {
    const start = road.points[index - 1];
    if (
      Math.hypot(
        start[0] - XINHUA_ROAD_AXIS[0][0],
        start[1] - XINHUA_ROAD_AXIS[0][1],
      ) < 0.01
    ) {
      return distance + XINHUA_PLANE_TREE_PILOT.centerDistance;
    }
    distance += Math.hypot(
      road.points[index][0] - start[0],
      road.points[index][1] - start[1],
    );
  }
  throw new Error("新华路全段轴线缺少 315 号试验段锚点");
}

/**
 * 使用显式 A+B 道路白名单、路口、已知定位接近点与建筑包络生成 332 个梧桐树位。
 * 产品数量用于低多边形表达，不代表现实树木普查。
 */
export function buildPlaneTreePlacements(
  landmarks,
  obstacles,
  pilotObstacles = obstacles,
) {
  // start 是现有产品的已知定位/接近点，并非现实入口普查数据。
  // 避让它可以保护可重复验收路线，但不得据此宣称已覆盖所有现实车行口。
  const knownApproachPoints = landmarks.map(({ start }) => start);
  const buildingObstacles = [
    ...roadNetworkData.buildingObstacles,
    ...obstacles,
  ];

  function candidateAt(
    road,
    side,
    distance,
    id,
    knownApproachClearance,
    activeObstacles,
    checkIntersections = true,
  ) {
    const { point, tangent } = samplePolyline(road.points, distance);
    const sideSign = side === 0 ? 1 : -1;
    const offsetJitter = road.id === "xinhua" ? 0.45 : 0.28;
    const offset = road.offsets[side]
      + deterministicUnit(id, 13) * offsetJitter;
    const position = [
      point[0] - tangent[1] * offset * sideSign,
      point[1] + tangent[0] * offset * sideSign,
    ];
    const tooCloseToKnownApproach = knownApproachPoints.some(
      ([x, z]) => (
        Math.hypot(position[0] - x, position[1] - z) < knownApproachClearance
      ),
    );
    const intersectsBuilding = activeObstacles.some((obstacle) => (
      pointIntersectsObstacle(position, obstacle, TREE_BUILDING_CLEARANCE)
    ));
    const tooCloseToIntersection = checkIntersections && road.intersections.some(
      ([x, z]) => (
        Math.hypot(position[0] - x, position[1] - z)
        < PLANE_TREE_INTERSECTION_CLEARANCE
      ),
    );
    if (
      tooCloseToKnownApproach
      || intersectsBuilding
      || tooCloseToIntersection
    ) {
      return null;
    }
    return {
      id,
      roadId: road.id,
      roadName: road.name,
      grade: road.grade,
      side,
      distance,
      offset,
      position,
      tangent,
      sideSign,
    };
  }

  const selectedByRoad = PLANE_TREE_ROAD_CONTRACTS.flatMap((road) => {
    const total = polylineLength(road.points);
    const candidatesBySide = [[], []];
    const pilotCandidatesBySide = [[], []];
    const pilotCenter = road.id === "xinhua"
      ? roadPilotCenterDistance(road)
      : null;
    const pilotStart = pilotCenter === null
      ? null
      : pilotCenter - XINHUA_PLANE_TREE_PILOT.length / 2;
    const pilotEnd = pilotCenter === null
      ? null
      : pilotCenter + XINHUA_PLANE_TREE_PILOT.length / 2;

    for (let side = 0; side < 2; side += 1) {
      const phase = side * PLANE_TREE_ROAD_CANDIDATE_SPACING / 2
        + (road.id === "xinhua" ? XINHUA_PLANE_TREE_SIDE_PHASES[side] : 0);
      for (
        let distance = 4 + phase, index = 0;
        distance < total - 4;
        distance += PLANE_TREE_ROAD_CANDIDATE_SPACING, index += 1
      ) {
        if (
          pilotStart !== null
          && distance >= pilotStart
          && distance <= pilotEnd
        ) {
          continue;
        }
        const candidate = candidateAt(
          road,
          side,
          distance,
          `plane-tree-${road.id}-${side}-${index}`,
          TREE_KNOWN_APPROACH_CLEARANCE,
          buildingObstacles,
        );
        if (candidate) candidatesBySide[side].push(candidate);
      }
      if (pilotStart !== null && pilotEnd !== null) {
        for (
          let distance = pilotStart + 1.8
            + side * XINHUA_PLANE_TREE_PILOT_SIDE_PHASE, index = 0;
          distance < pilotEnd - 1.8;
          distance += XINHUA_PLANE_TREE_PILOT_CANDIDATE_SPACING, index += 1
        ) {
          const candidate = candidateAt(
            road,
            side,
            distance,
            `plane-tree-${side}-pilot-${index}`,
            PILOT_TREE_KNOWN_APPROACH_CLEARANCE,
            pilotObstacles,
            false,
          );
          if (candidate) pilotCandidatesBySide[side].push(candidate);
        }
      }
    }

    const pilotTarget = road.id === "xinhua"
      ? XINHUA_PLANE_TREE_PILOT.targetCount
      : 0;
    const pilotCounts = selectedCountsBySide(
      pilotCandidatesBySide,
      pilotTarget,
    );
    const selectedPilot = pilotCandidatesBySide.flatMap(
      (candidates, side) => evenlySelect(candidates, pilotCounts[side]),
    );
    if (selectedPilot.length !== pilotTarget) {
      throw new Error(
        `${road.name}试验段安全树位不足：`
        + `${selectedPilot.length}/${pilotTarget}`,
      );
    }

    const regularTarget = road.targetCount - pilotTarget;
    const regularCounts = selectedCountsBySide(
      candidatesBySide,
      regularTarget,
    );
    const selectedRegular = candidatesBySide.flatMap(
      (candidates, side) => evenlySelect(candidates, regularCounts[side]),
    );
    const selected = [...selectedRegular, ...selectedPilot];
    if (selected.length !== road.targetCount) {
      throw new Error(
        `${road.name}安全树位不足：`
        + `${selected.length}/${road.targetCount}`,
      );
    }
    return selected;
  });

  const placements = [];
  for (const road of PLANE_TREE_ROAD_CONTRACTS) {
    for (let side = 0; side < 2; side += 1) {
      let previousVariant = -1;
      const sideCandidates = selectedByRoad
        .filter((candidate) => (
          candidate.roadId === road.id && candidate.side === side
        ))
        .sort((left, right) => left.distance - right.distance);
      for (const candidate of sideCandidates) {
      const {
        id,
        roadId,
        roadName,
        grade,
        side: candidateSide,
        distance,
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
        roadId,
        roadName,
        grade,
        side: candidateSide,
        distance,
        offset: candidate.offset,
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
  }
  if (placements.length !== PLANE_TREE_STREET_TARGET) {
    throw new Error(
      `梧桐道路总数不一致：${placements.length}/${PLANE_TREE_STREET_TARGET}`,
    );
  }
  return placements;
}
