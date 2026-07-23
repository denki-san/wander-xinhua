import layout from "./xingfuli-layout.json" with { type: "json" };
import qaData from "./xingfuli-qa-paths.json" with { type: "json" };
import type { MapObstacle } from "./world-math";

export type XingfuliBuilding = {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  floors: number;
  side: "north" | "south";
  wall: string;
  frame: string;
  glass: string;
  feature: "bands" | "bay" | "balcony" | "glass" | "mural" | "pavilion" | "timber";
};

export const XINGFULI_BUILDINGS = layout.buildings as XingfuliBuilding[];
export const XINGFULI_QA_PATHS = qaData.routes;
export const XINGFULI_QA_PLAYER_RADIUS_WORLD = qaData.playerRadiusWorld;

function splitObstacleAlongX(obstacle: MapObstacle, maximumWidth: number) {
  const width = obstacle.maxX - obstacle.minX;
  const segmentCount = Math.max(1, Math.ceil(width / maximumWidth));
  const segmentWidth = width / segmentCount;
  return Array.from({ length: segmentCount }, (_, index): MapObstacle => ({
    minX: obstacle.minX + segmentWidth * index,
    maxX: obstacle.minX + segmentWidth * (index + 1),
    minZ: obstacle.minZ,
    maxZ: obstacle.maxZ,
  }));
}

const buildingObstacles = XINGFULI_BUILDINGS.flatMap((building) => splitObstacleAlongX({
  minX: building.x - building.width / 2 - 0.28,
  maxX: building.x + building.width / 2 + 0.28,
  // 临巷一侧贴合可见墙面，依靠 PLAYER_RADIUS 留距；外墙一侧仍保留 0.28 容差。
  minZ: building.side === "north"
    ? building.z - building.depth / 2
    : building.z - building.depth / 2 - 0.28,
  maxZ: building.side === "south"
    ? building.z + building.depth / 2
    : building.z + building.depth / 2 + 0.28,
}, 1));

const fixedObstacles = qaData.fixedObstacles.flatMap((obstacle) => splitObstacleAlongX({
  minX: obstacle.minX,
  maxX: obstacle.maxX,
  minZ: obstacle.minZ,
  maxZ: obstacle.maxZ,
}, 1));

/**
 * 幸福里整体带有接近 180° 的旋转。先把长矩形转成 world AABB 会侵入真实通道，
 * 因此在本地按 1 单位切片，再沿用全局 AABB 碰撞器，兼顾通行准确度与现有移动逻辑。
 */
export const XINGFULI_OBSTACLES: MapObstacle[] = [
  ...buildingObstacles,
  ...fixedObstacles,
];
