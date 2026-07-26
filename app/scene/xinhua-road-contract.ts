import type { MapObstacle, MapPolygonPoint } from "./world-math";
import { XINHUA_ROAD_TRANSPARENT_CAMERA_OBSTACLES } from "./xinhua-road-placement.mjs";
import { resolveBuildingMassingQa } from "./building-massing-qa-contract.mjs";
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

const ACTIVE_BUILDING_MASSING_QA = resolveBuildingMassingQa(
  typeof window === "undefined" ? "" : window.location.search,
) as BuildingMassingQaCandidate | null;

export function transformedLandmarkFootprint(
  { position, yaw, scale }: LandmarkPlacement,
  localBounds: MapObstacle,
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

  const margin = landmarkData.collisionMargin;
  return {
    minX: Math.min(...worldX) - margin,
    maxX: Math.max(...worldX) + margin,
    minZ: Math.min(...worldZ) - margin,
    maxZ: Math.max(...worldZ) + margin,
  };
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
    return (
      collisionPlacement.localObstacles ?? [collisionPlacement.localBounds]
    ).map(
      (localObstacle) => transformedLandmarkFootprint(
        collisionPlacement,
        localObstacle,
      ),
    );
  },
);

export const XINHUA_ROAD_MODEL_FOOTPRINTS: MapObstacle[] = XINHUA_ROAD_LANDMARKS.map(
  (landmark) => transformedLandmarkFootprint(landmark, landmark.localBounds),
);

export const XINHUA_ROAD_CAMERA_OBSTACLES =
  XINHUA_ROAD_TRANSPARENT_CAMERA_OBSTACLES as MapObstacle[];

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
