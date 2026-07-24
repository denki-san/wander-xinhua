import type { LandmarkPlacement } from "./xinhua-road-contract";
import landmarkData from "./xinhua-road-landmarks-data.json" with { type: "json" };

export type XinhuaRoadIdentityKind =
  | "cinema"
  | "arts-cluster"
  | "garden-house"
  | "villa-row"
  | "townhouse"
  | "modern-villa"
  | "orchestra-hall"
  | "memorial-villa"
  | "pocket-park"
  | "community-center"
  | "industrial-campus"
  | "heritage-gate"
  | "creative-campus";

/**
 * 全览 Identity 不读取 GLB，而是用每处地标自己的轻量建筑缩影维持识别性。
 * 映射必须覆盖 xinhua-road-landmarks-data.json 中的全部地标。
 */
export const XINHUA_ROAD_IDENTITY_KIND_BY_ID = {
  "shanghai-cinema": "cinema",
  "film-art-center": "arts-cluster",
  "one-step-garden": "garden-house",
  "xinhua-villas-211": "villa-row",
  "xinhua-villas-329": "villa-row",
  "house-315": "townhouse",
  "villa-le-bec": "modern-villa",
  "shanghai-orchestra": "orchestra-hall",
  "hudec-memorial": "memorial-villa",
  "xinhua-pocket-park": "pocket-park",
  "xinhua-community-center": "community-center",
  "debi-fahua-525": "industrial-campus",
  "fahua-heritage": "heritage-gate",
  "fics-xinhua-365": "creative-campus",
} as const satisfies Record<string, XinhuaRoadIdentityKind>;

export function xinhuaRoadIdentityKind(landmarkId: string): XinhuaRoadIdentityKind {
  return XINHUA_ROAD_IDENTITY_KIND_BY_ID[
    landmarkId as keyof typeof XINHUA_ROAD_IDENTITY_KIND_BY_ID
  ] ?? "townhouse";
}

export const SHANGHAI_CINEMA_IDENTITY_MODEL_PATH =
  "/models/xinhua-road/shanghai-cinema-hybrid-identity.glb";
export const SHANGHAI_CINEMA_IDENTITY_CACHE_VERSION = "20260722-hybrid-1";

export type XinhuaRoadBuildingQualityEntry = {
  buildingId: string;
  hero: {
    strategy: "detail-state-glb";
    model: string;
    cacheVersion?: string;
  };
  identity: {
    strategy: "programmatic-miniature" | "custom-landmark-hybrid";
    recipe: XinhuaRoadIdentityKind;
    model?: string;
    cacheVersion?: string;
    requiredBeforeMapVisible: true;
  };
  massing: {
    strategy: "bounds-proxy";
    visibility: "cover-only";
    localBounds: LandmarkPlacement["localBounds"];
  };
  shared: Pick<LandmarkPlacement, "position" | "yaw" | "scale" | "localObstacles">;
  collision: "stable-shared-structure";
};

function buildingQualityEntry(
  landmark: LandmarkPlacement,
): XinhuaRoadBuildingQualityEntry {
  const shanghaiCinema = landmark.id === "shanghai-cinema";
  return {
    buildingId: landmark.id,
    hero: {
      strategy: "detail-state-glb",
      model: landmark.model,
      cacheVersion: landmark.cacheVersion,
    },
    identity: {
      strategy: shanghaiCinema
        ? "custom-landmark-hybrid"
        : "programmatic-miniature",
      recipe: xinhuaRoadIdentityKind(landmark.id),
      model: shanghaiCinema
        ? SHANGHAI_CINEMA_IDENTITY_MODEL_PATH
        : undefined,
      cacheVersion: shanghaiCinema
        ? SHANGHAI_CINEMA_IDENTITY_CACHE_VERSION
        : undefined,
      requiredBeforeMapVisible: true,
    },
    massing: {
      strategy: "bounds-proxy",
      visibility: "cover-only",
      localBounds: landmark.localBounds,
    },
    shared: {
      position: landmark.position,
      yaw: landmark.yaw,
      scale: landmark.scale,
      localObstacles: landmark.localObstacles,
    },
    collision: "stable-shared-structure",
  };
}

/**
 * 生产资产合同以建筑 ID 统一 Hero、Hybrid Identity、Massing 与共享空间参数。
 * 地图只读取 Identity；Hero 仅由明确的详情/近景状态按需请求。
 */
export const XINHUA_ROAD_BUILDING_QUALITY_MANIFEST = Object.fromEntries(
  (landmarkData.landmarks as unknown as readonly LandmarkPlacement[]).map((landmark) => [
    landmark.id,
    buildingQualityEntry(landmark),
  ]),
) as Readonly<Record<string, XinhuaRoadBuildingQualityEntry>>;
