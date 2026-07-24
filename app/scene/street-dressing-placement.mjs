import {
  buildPlaneTreePlacements,
  XINHUA_ROAD_AXIS,
} from "./xinhua-road-placement.mjs";
import landmarkData from "./xinhua-road-landmarks-data.json" with { type: "json" };

const ENTRANCE_CLEARANCE = 9.2;
const DRESSING_CLEARANCE = Object.freeze({
  lamp: Object.freeze({ buildingRadius: 0.28, treeRadius: 1.8 }),
  planter: Object.freeze({ buildingRadius: 0.75, treeRadius: 1.6 }),
  bin: Object.freeze({ buildingRadius: 0.45, treeRadius: 1.3 }),
  shrub: Object.freeze({ buildingRadius: 0.9, treeRadius: 1.8 }),
});

function polylineLength(points) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(
      points[index][0] - points[index - 1][0],
      points[index][1] - points[index - 1][1],
    );
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

function offsetSample(sample, offset, sideSign) {
  return [
    sample.point[0] - sample.tangent[1] * offset * sideSign,
    sample.point[1] + sample.tangent[0] * offset * sideSign,
  ];
}

function lampYawTowardRoad(tangent, sideSign) {
  return Math.atan2(tangent[0] * sideSign, tangent[1] * sideSign);
}

function binYawTowardSidewalk(tangent, sideSign) {
  // 垃圾桶分类面板位于 local +Z，让它统一朝路缘外侧的人行区域。
  return Math.atan2(-tangent[1] * sideSign, tangent[0] * sideSign);
}

function transformedFootprint(landmark) {
  const [positionX, positionZ] = landmark.position;
  const cosine = Math.cos(landmark.yaw);
  const sine = Math.sin(landmark.yaw);
  const worldX = [];
  const worldZ = [];

  for (const localX of [landmark.localBounds.minX, landmark.localBounds.maxX]) {
    for (const sourceZ of [landmark.localBounds.minZ, landmark.localBounds.maxZ]) {
      // 与 GlbModel 和地标碰撞系统使用同一套 Blender Z 轴翻转。
      const localZ = -sourceZ;
      worldX.push(positionX + landmark.scale * (cosine * localX + sine * localZ));
      worldZ.push(positionZ + landmark.scale * (-sine * localX + cosine * localZ));
    }
  }

  return {
    minX: Math.min(...worldX) - landmarkData.collisionMargin,
    maxX: Math.max(...worldX) + landmarkData.collisionMargin,
    minZ: Math.min(...worldZ) - landmarkData.collisionMargin,
    maxZ: Math.max(...worldZ) + landmarkData.collisionMargin,
  };
}

export function buildXinhuaStreetDressingConstraints() {
  const obstacles = landmarkData.landmarks.map(transformedFootprint);
  const treePositions = buildPlaneTreePlacements(
    landmarkData.landmarks,
    obstacles,
  ).map(({ position }) => position);
  return {
    entrances: landmarkData.landmarks.map(({ start }) => start),
    obstacles,
    treePositions,
  };
}

export const XINHUA_STREET_DRESSING_CONSTRAINTS =
  buildXinhuaStreetDressingConstraints();

function placementIsClear(position, kind, constraints) {
  const clearance = DRESSING_CLEARANCE[kind];
  const tooCloseToEntrance = constraints.entrances.some(
    ([x, z]) => Math.hypot(position[0] - x, position[1] - z) < ENTRANCE_CLEARANCE,
  );
  if (tooCloseToEntrance) return false;

  const intersectsBuilding = constraints.obstacles.some((obstacle) => (
    position[0] >= obstacle.minX - clearance.buildingRadius
    && position[0] <= obstacle.maxX + clearance.buildingRadius
    && position[1] >= obstacle.minZ - clearance.buildingRadius
    && position[1] <= obstacle.maxZ + clearance.buildingRadius
  ));
  if (intersectsBuilding) return false;

  return constraints.treePositions.every(
    ([x, z]) => Math.hypot(position[0] - x, position[1] - z) >= clearance.treeRadius,
  );
}

/**
 * 新华路街具只占用路缘外侧的 furnishing zone，并避开入口、建筑包络和既有梧桐。
 * 这里不生成新的实体碰撞，避免小物件把人物卡住。
 */
export function buildXinhuaStreetDressingPlacements(
  lowTier = false,
  constraints = XINHUA_STREET_DRESSING_CONSTRAINTS,
) {
  const total = polylineLength(XINHUA_ROAD_AXIS);
  const lamps = [];
  const planters = [];
  const bins = [];
  const shrubs = [];

  const lampSpacing = 36;
  for (let side = 0; side < 2; side += 1) {
    for (
      let distance = 20 + side * lampSpacing * 0.5, index = 0;
      distance < total - 18;
      distance += lampSpacing, index += 1
    ) {
      const sample = samplePolyline(XINHUA_ROAD_AXIS, distance);
      const sideSign = side === 0 ? 1 : -1;
      const placement = {
        id: `street-lamp-${side}-${index}`,
        position: offsetSample(sample, 3.22, sideSign),
        yaw: lampYawTowardRoad(sample.tangent, sideSign),
      };
      if (placementIsClear(placement.position, "lamp", constraints)) {
        lamps.push(placement);
      }
    }
  }

  const clusterSpacing = 44;
  for (
    let distance = 38, index = 0;
    distance < total - 24;
    distance += clusterSpacing, index += 1
  ) {
    const sample = samplePolyline(XINHUA_ROAD_AXIS, distance);
    const sideSign = index % 2 === 0 ? 1 : -1;
    const planter = {
      id: `street-planter-${index}`,
      position: offsetSample(sample, 3.48, sideSign),
      yaw: -Math.atan2(sample.tangent[1], sample.tangent[0]),
      scale: 0.92 + (index % 3) * 0.08,
      variant: index % 3,
    };
    if (placementIsClear(planter.position, "planter", constraints)) {
      planters.push(planter);
    }
    const binSample = samplePolyline(
      XINHUA_ROAD_AXIS,
      Math.min(total - 20, distance + 4.4),
    );
    const bin = {
      id: `street-bin-${index}`,
      position: offsetSample(binSample, 3.18, sideSign),
      yaw: binYawTowardSidewalk(binSample.tangent, sideSign),
      variant: index % 2,
    };
    if (placementIsClear(bin.position, "bin", constraints)) {
      bins.push(bin);
    }
  }

  const shrubSpacing = 16;
  for (
    let distance = 12, index = 0;
    distance < total - 12;
    distance += shrubSpacing, index += 1
  ) {
    const sample = samplePolyline(XINHUA_ROAD_AXIS, distance);
    const sideSign = index % 2 === 0 ? 1 : -1;
    const shrub = {
      id: `street-shrub-${index}`,
      position: offsetSample(sample, 4.35 + (index % 3) * 0.18, sideSign),
      yaw: index * 1.17,
      scale: [
        0.72 + (index % 4) * 0.08,
        0.62 + (index % 3) * 0.09,
        0.68 + ((index + 2) % 4) * 0.07,
      ],
      variant: index % 3,
    };
    if (placementIsClear(shrub.position, "shrub", constraints)) {
      shrubs.push(shrub);
    }
  }

  if (!lowTier) return { lamps, planters, bins, shrubs };

  // 低配档位从同一组已通过净空检查的结果中确定性抽稀，避免改变位置后重新撞入入口。
  return {
    lamps: lamps.filter((_, index) => index % 2 === 0),
    planters: planters.filter((_, index) => index % 2 === 0),
    bins: bins.filter((_, index) => index % 2 === 0),
    shrubs: shrubs.filter((_, index) => index % 2 === 0),
  };
}
