import { XINHUA_ROAD_AXIS } from "./xinhua-road-placement.mjs";

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

/**
 * 新华路街具只占用路缘外侧的 furnishing zone。
 * 主路、入口和建筑碰撞继续由现有系统负责；这里不生成新的实体碰撞。
 */
export function buildXinhuaStreetDressingPlacements(lowTier = false) {
  const total = polylineLength(XINHUA_ROAD_AXIS);
  const lamps = [];
  const planters = [];
  const bins = [];
  const shrubs = [];

  const lampSpacing = lowTier ? 74 : 52;
  for (let side = 0; side < 2; side += 1) {
    for (
      let distance = 20 + side * lampSpacing * 0.5, index = 0;
      distance < total - 18;
      distance += lampSpacing, index += 1
    ) {
      const sample = samplePolyline(XINHUA_ROAD_AXIS, distance);
      const sideSign = side === 0 ? 1 : -1;
      lamps.push({
        id: `street-lamp-${side}-${index}`,
        position: offsetSample(sample, 3.22, sideSign),
        yaw: lampYawTowardRoad(sample.tangent, sideSign),
      });
    }
  }

  const clusterSpacing = lowTier ? 112 : 78;
  for (
    let distance = 38, index = 0;
    distance < total - 24;
    distance += clusterSpacing, index += 1
  ) {
    const sample = samplePolyline(XINHUA_ROAD_AXIS, distance);
    const sideSign = index % 2 === 0 ? 1 : -1;
    planters.push({
      id: `street-planter-${index}`,
      position: offsetSample(sample, 3.48, sideSign),
      yaw: -Math.atan2(sample.tangent[1], sample.tangent[0]),
      scale: 0.92 + (index % 3) * 0.08,
      variant: index % 3,
    });
    if (!lowTier || index % 2 === 0) {
      bins.push({
        id: `street-bin-${index}`,
        position: offsetSample(samplePolyline(
          XINHUA_ROAD_AXIS,
          Math.min(total - 20, distance + 4.4),
        ), 3.18, sideSign),
        yaw: -Math.atan2(sample.tangent[1], sample.tangent[0]),
        variant: index % 2,
      });
    }
  }

  const shrubSpacing = lowTier ? 34 : 22;
  for (
    let distance = 12, index = 0;
    distance < total - 12;
    distance += shrubSpacing, index += 1
  ) {
    const sample = samplePolyline(XINHUA_ROAD_AXIS, distance);
    const sideSign = index % 2 === 0 ? 1 : -1;
    shrubs.push({
      id: `street-shrub-${index}`,
      position: offsetSample(sample, 4.35 + (index % 3) * 0.18, sideSign),
      yaw: index * 1.17,
      scale: [
        0.72 + (index % 4) * 0.08,
        0.62 + (index % 3) * 0.09,
        0.68 + ((index + 2) % 4) * 0.07,
      ],
      variant: index % 3,
    });
  }

  return { lamps, planters, bins, shrubs };
}
