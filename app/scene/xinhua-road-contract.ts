import type { MapObstacle, MapPolygonPoint } from "./world-math";
import {
  buildPlaneTreePlacements,
  buildPlaneTreeTrunkObstacles,
  XINHUA_ROAD_TRANSPARENT_CAMERA_OBSTACLES,
} from "./xinhua-road-placement.mjs";
import { resolveBuildingTierQa } from "./building-massing-qa-contract.mjs";
import landmarkData from "./xinhua-road-landmarks-data.json" with { type: "json" };

export type LandmarkPlacement = {
  id: string;
  query: string;
  aliases?: string[];
  name: string;
  address: string;
  model: string;
  cacheVersion?: string;
  position: MapPolygonPoint;
  yaw: number;
  scale: number;
  localBounds: MapObstacle;
  localObstacles?: MapObstacle[];
  collisionMargin?: number;
  start: MapPolygonPoint;
  forward: MapPolygonPoint;
  cameraTargetHeight?: number;
  poi?: boolean;
  labelHeight?: number;
  labelOffset?: MapPolygonPoint;
  positioning?: string;
};

export const XINHUA_ROAD_LANDMARKS =
  landmarkData.landmarks as unknown as readonly LandmarkPlacement[];

type BuildingMassingQaCandidate = {
  assetId: string;
  collisionMargin?: number;
  placement?: {
    position: readonly [number, number];
    yaw: number;
    scale: number;
  };
  start?: {
    position: readonly [number, number];
    forward: readonly [number, number];
  };
  localObstacles?: readonly MapObstacle[];
};

const ACTIVE_BUILDING_MASSING_QA = resolveBuildingTierQa(
  typeof window === "undefined" ? "" : window.location.search,
) as BuildingMassingQaCandidate | null;

export function transformedLandmarkFootprint(
  { position, yaw, scale }: LandmarkPlacement,
  localBounds: MapObstacle,
  collisionMargin = landmarkData.collisionMargin,
): MapObstacle {
  const [positionX, positionZ] = position;
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  const worldX: number[] = [];
  const worldZ: number[] = [];

  for (const localX of [localBounds.minX, localBounds.maxX]) {
    for (const sourceZ of [localBounds.minZ, localBounds.maxZ]) {
      const localZ = -sourceZ;
      worldX.push(positionX + scale * (cosine * localX + sine * localZ));
      worldZ.push(positionZ + scale * (-sine * localX + cosine * localZ));
    }
  }

  return {
    minX: Math.min(...worldX) - collisionMargin,
    maxX: Math.max(...worldX) + collisionMargin,
    minZ: Math.min(...worldZ) - collisionMargin,
    maxZ: Math.max(...worldZ) + collisionMargin,
  };
}

function splitPocketParkWallObstacle(
  obstacle: MapObstacle,
  maximumSourceLength = 0.06,
) {
  const length = obstacle.maxZ - obstacle.minZ;
  const segmentCount = Math.max(1, Math.ceil(length / maximumSourceLength));
  const segmentLength = length / segmentCount;
  return Array.from({ length: segmentCount }, (_, index) => ({
    minX: obstacle.minX,
    maxX: obstacle.maxX,
    minZ: obstacle.minZ + segmentLength * index,
    maxZ: obstacle.minZ + segmentLength * (index + 1),
  }));
}

function collisionObstaclesForLandmark(
  landmark: LandmarkPlacement,
  inputObstacles?: readonly MapObstacle[],
) {
  const obstacles = inputObstacles ?? landmark.localObstacles ?? [landmark.localBounds];
  if (landmark.id !== "xinhua-pocket-park") return obstacles;
  // 口袋公园是宽约 3.23 米的斜向窄廊。把两面长镜墙切片，避免旋转后的
  // 轴对齐碰撞盒把真实可走的中央路径封死。
  return obstacles.flatMap((obstacle) => splitPocketParkWallObstacle(obstacle));
}

export const XINHUA_ROAD_OBSTACLES: MapObstacle[] = XINHUA_ROAD_LANDMARKS.flatMap(
  (landmark) => {
    const qaActive = ACTIVE_BUILDING_MASSING_QA?.assetId === landmark.id
      ? ACTIVE_BUILDING_MASSING_QA
      : null;
    const collisionPlacement = qaActive?.placement && qaActive.localObstacles
      ? {
          ...landmark,
          position: [...qaActive.placement.position] as MapPolygonPoint,
          yaw: qaActive.placement.yaw,
          scale: qaActive.placement.scale,
          localObstacles: [...qaActive.localObstacles],
        }
      : landmark;
    const localObstacles =
      collisionPlacement.localObstacles ?? [collisionPlacement.localBounds];
    return collisionObstaclesForLandmark(
      collisionPlacement,
      localObstacles,
    ).map(
      (localObstacle) => transformedLandmarkFootprint(
        collisionPlacement,
        localObstacle,
        qaActive?.collisionMargin ?? collisionPlacement.collisionMargin,
      ),
    );
  },
);

export const XINHUA_ROAD_MODEL_FOOTPRINTS: MapObstacle[] = XINHUA_ROAD_LANDMARKS.map(
  (landmark) => transformedLandmarkFootprint(landmark, landmark.localBounds),
);

export const XINHUA_PLANE_TREE_PLACEMENTS = buildPlaneTreePlacements(
  XINHUA_ROAD_LANDMARKS,
  XINHUA_ROAD_MODEL_FOOTPRINTS,
  XINHUA_ROAD_OBSTACLES,
);

// 只让树干阻挡玩家；树冠和板根不进入镜头碰撞层，避免林荫道镜头抖动。
export const XINHUA_PLANE_TREE_TRUNK_OBSTACLES: MapObstacle[] =
  buildPlaneTreeTrunkObstacles(XINHUA_PLANE_TREE_PLACEMENTS);

const XINHUA_POCKET_PARK_CAMERA_OBSTACLES =
  ACTIVE_BUILDING_MASSING_QA?.assetId === "xinhua-pocket-park"
    ? XINHUA_ROAD_LANDMARKS
      .filter(({ id }) => id === "xinhua-pocket-park")
      .flatMap((landmark) => {
        const qaLandmark: LandmarkPlacement = {
          ...landmark,
          position: [...ACTIVE_BUILDING_MASSING_QA.placement!.position],
          yaw: ACTIVE_BUILDING_MASSING_QA.placement!.yaw,
          scale: ACTIVE_BUILDING_MASSING_QA.placement!.scale,
          localObstacles: [...(ACTIVE_BUILDING_MASSING_QA.localObstacles ?? [])],
          collisionMargin: ACTIVE_BUILDING_MASSING_QA.collisionMargin,
        };
        return collisionObstaclesForLandmark(qaLandmark).map(
          (localObstacle) => transformedLandmarkFootprint(
            qaLandmark,
            localObstacle,
            qaLandmark.collisionMargin,
          ),
        );
      })
    : [];

// Hudec 的花园住宅两侧是贴近长坡翼楼的窄通路。人物沿外墙绕行时，
// spring arm 必须把当前实体碰撞体视为不透明，避免镜头穿进屋檐或玻璃翼。
// 显式 legacy QA 必须连同旧碰撞与旧 margin 一起切换，不能出现旧模型配新碰撞。
// 这里只增加 Hudec，不改变其他街景地标既有的透明相机策略。
export function hudecCameraObstaclesForQa(
  qaCandidate: BuildingMassingQaCandidate | null = ACTIVE_BUILDING_MASSING_QA,
) {
  return XINHUA_ROAD_LANDMARKS
    .filter(({ id }) => id === "hudec-memorial")
    .flatMap((landmark) => {
      const qaActive =
        qaCandidate?.assetId === landmark.id
        && qaCandidate.placement
        && qaCandidate.localObstacles
          ? {
              ...landmark,
              position: [...qaCandidate.placement.position] as MapPolygonPoint,
              yaw: qaCandidate.placement.yaw,
              scale: qaCandidate.placement.scale,
              localObstacles: [...qaCandidate.localObstacles],
              collisionMargin: qaCandidate.collisionMargin,
            }
          : landmark;
      return collisionObstaclesForLandmark(qaActive).map(
        (localObstacle) => transformedLandmarkFootprint(
          qaActive,
          localObstacle,
          qaActive.collisionMargin,
        ),
      );
    });
}

export const XINHUA_HUDEC_CAMERA_OBSTACLES =
  hudecCameraObstaclesForQa();

export const XINHUA_ROAD_CAMERA_OBSTACLES: MapObstacle[] = [
  ...XINHUA_ROAD_TRANSPARENT_CAMERA_OBSTACLES,
  ...XINHUA_POCKET_PARK_CAMERA_OBSTACLES,
  ...XINHUA_HUDEC_CAMERA_OBSTACLES,
];

export const XINHUA_ROAD_START_PRESETS = Object.fromEntries(
  XINHUA_ROAD_LANDMARKS.flatMap(
    ({ id, query, aliases = [], start, forward, cameraTargetHeight }) => (
      [query, ...aliases].map((preset) => {
        const qaStart = ACTIVE_BUILDING_MASSING_QA?.assetId === id
          ? ACTIVE_BUILDING_MASSING_QA.start
          : null;
        return [
          preset,
          {
            position: qaStart
              ? [...qaStart.position] as MapPolygonPoint
              : start,
            forward: qaStart
              ? [...qaStart.forward] as MapPolygonPoint
              : forward,
            cameraTargetHeight,
          },
        ];
      })
    ),
  ),
) as Record<string, {
  position: MapPolygonPoint;
  forward: MapPolygonPoint;
  cameraTargetHeight?: number;
}>;
