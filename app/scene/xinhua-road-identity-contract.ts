import type { LandmarkPlacement } from "./xinhua-road-contract";
import landmarkData from "./xinhua-road-landmarks-data.json" with { type: "json" };

const XINHUA_ROAD_QUALITY_LANDMARKS =
  landmarkData.landmarks as unknown as readonly LandmarkPlacement[];

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

export function xinhuaRoadDetailHeroId({
  loadMode,
  priorityPreset,
}: {
  loadMode: "overview" | "explore";
  priorityPreset?: string;
}) {
  if (loadMode !== "explore" || !priorityPreset) return undefined;
  return XINHUA_ROAD_QUALITY_LANDMARKS.find((landmark) => (
    landmark.id === priorityPreset
    || landmark.query === priorityPreset
    || landmark.aliases?.includes(priorityPreset)
  ))?.id;
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
  XINHUA_ROAD_QUALITY_LANDMARKS.map((landmark) => [
    landmark.id,
    buildingQualityEntry(landmark),
  ]),
) as Readonly<Record<string, XinhuaRoadBuildingQualityEntry>>;

export type ProductionQualityEvidence = {
  status: "complete" | "accepted-with-followup" | "migration-required";
  heroBuildRecords: readonly string[];
  identityBuildRecords: readonly string[];
  massingBuildRecords: readonly string[];
  canonicalScreenshots: readonly string[];
  sideScreenshots: readonly string[];
  rearScreenshots: readonly string[];
  runtimeScreenshots: readonly string[];
  resourceMetrics: readonly string[];
  drawCallMetrics: readonly string[];
  gaps: readonly string[];
};

export type ProductionBuildingQualityEntry = {
  buildingId: string;
  scope: "xinhua-road" | "core-landmark";
  hero: {
    strategy: "detail-state-glb" | "detail-state-component";
    assets: readonly string[];
  };
  identity: {
    strategy: "programmatic-miniature" | "custom-landmark-hybrid" | "programmatic-site";
    assets: readonly string[];
    requiredBeforeMapVisible: true;
  };
  massing: {
    strategy: "bounds-proxy" | "programmatic-site";
    assets: readonly string[];
    parametersSource: string;
    visibility: "cover-only";
  };
  shared: {
    transformSource: string;
    collisionSource: string;
  };
  evidence: ProductionQualityEvidence;
};

function emptyEvidence(
  gaps: readonly string[],
): ProductionQualityEvidence {
  return {
    status: "migration-required",
    heroBuildRecords: [],
    identityBuildRecords: [],
    massingBuildRecords: [],
    canonicalScreenshots: [],
    sideScreenshots: [],
    rearScreenshots: [],
    runtimeScreenshots: [],
    resourceMetrics: [],
    drawCallMetrics: [],
    gaps,
  };
}

function roadEvidence(landmarkId: string): ProductionQualityEvidence {
  if (landmarkId === "shanghai-cinema") {
    return {
      status: "accepted-with-followup",
      heroBuildRecords: ["docs/research/build-records/shanghai-cinema.json"],
      identityBuildRecords: [
        "docs/research/build-records/shanghai-cinema-hybrid-identity.json",
      ],
      massingBuildRecords: [],
      canonicalScreenshots: [
        "test_artifacts/test_shanghai-cinema-hybrid-identity_canonical_preview.png",
      ],
      sideScreenshots: [
        "test_artifacts/test_shanghai-cinema-hybrid-identity_side_preview.png",
      ],
      rearScreenshots: [],
      runtimeScreenshots: [
        "test_artifacts/test_shanghai-cinema_hybrid-near_cdp.png",
        "test_artifacts/test_shanghai-cinema_runtime_preview.png",
      ],
      resourceMetrics: [
        "test_artifacts/test_shanghai-cinema_hybrid_metrics.json",
      ],
      drawCallMetrics: [
        "test_artifacts/test_shanghai-cinema_hybrid_metrics.json",
      ],
      gaps: ["补录生产 Identity 背向运行时截图"],
    };
  }
  if (landmarkId === "film-art-center") {
    return {
      ...emptyEvidence([
        "为程序化 Identity 补录独立 build record、背向截图与 draw-call 指标",
      ]),
      heroBuildRecords: ["docs/research/build-records/film-art-center.json"],
      runtimeScreenshots: [
        "test_artifacts/test_film-art-center_runtime_preview.png",
      ],
    };
  }
  return emptyEvidence([
    "将现有 Hero 与程序化 Identity 证据迁入三档资产级 build record",
  ]);
}

const XINHUA_ROAD_PRODUCTION_QUALITY_MANIFEST = Object.fromEntries(
  Object.values(XINHUA_ROAD_BUILDING_QUALITY_MANIFEST).map((entry) => [
    entry.buildingId,
    {
      buildingId: entry.buildingId,
      scope: "xinhua-road",
      hero: {
        strategy: entry.hero.strategy,
        assets: [
          entry.hero.cacheVersion
            ? `${entry.hero.model}?v=${entry.hero.cacheVersion}`
            : entry.hero.model,
        ],
      },
      identity: {
        strategy: entry.identity.strategy,
        assets: entry.identity.model
          ? [
            entry.identity.cacheVersion
              ? `${entry.identity.model}?v=${entry.identity.cacheVersion}`
              : entry.identity.model,
          ]
          : [`recipe:${entry.identity.recipe}`],
        requiredBeforeMapVisible: true,
      },
      massing: {
        strategy: entry.massing.strategy,
        assets: [],
        parametersSource:
          `app/scene/xinhua-road-landmarks-data.json#${entry.buildingId}.localBounds`,
        visibility: entry.massing.visibility,
      },
      shared: {
        transformSource:
          `app/scene/xinhua-road-landmarks-data.json#${entry.buildingId}`,
        collisionSource: "app/scene/xinhua-road-contract.ts",
      },
      evidence: roadEvidence(entry.buildingId),
    } satisfies ProductionBuildingQualityEntry,
  ]),
) as Readonly<Record<string, ProductionBuildingQualityEntry>>;

const CORE_PRODUCTION_QUALITY_MANIFEST = {
  xingfuli: {
    buildingId: "xingfuli",
    scope: "core-landmark",
    hero: {
      strategy: "detail-state-glb",
      assets: [
        "/models/xingfuli/xingfuli-west.glb?v=20260723-final-1",
        "/models/xingfuli/xingfuli-center.glb?v=20260723-final-1",
        "/models/xingfuli/xingfuli-east.glb?v=20260723-final-1",
      ],
    },
    identity: {
      strategy: "programmatic-site",
      assets: ["recipe:XingfuliProceduralArchitectureFallback"],
      requiredBeforeMapVisible: true,
    },
    massing: {
      strategy: "programmatic-site",
      assets: ["recipe:XingfuliMassingArchitecture"],
      parametersSource: "app/scene/xingfuli-collision.ts",
      visibility: "cover-only",
    },
    shared: {
      transformSource: "app/scene/xinhua-map.tsx#XINGFULI_PLACEMENT",
      collisionSource: "app/scene/xingfuli-collision.ts",
    },
    evidence: {
      status: "accepted-with-followup",
      heroBuildRecords: ["docs/research/build-records/xingfuli.json"],
      identityBuildRecords: ["docs/research/build-records/xingfuli-identity.json"],
      massingBuildRecords: ["docs/research/build-records/xingfuli-massing.json"],
      canonicalScreenshots: [
        "test_artifacts/test_xingfuli_final_canonical_runtime_preview.png",
      ],
      sideScreenshots: [
        "test_artifacts/test_xingfuli_final_runtime_views_preview.png",
      ],
      rearScreenshots: [],
      runtimeScreenshots: [
        "test_artifacts/test_xingfuli_final_runtime_views_preview.png",
        "test_artifacts/test_xingfuli_final_mobile_runtime_preview.png",
      ],
      resourceMetrics: ["test_artifacts/test_xingfuli_final_runtime_metrics.json"],
      drawCallMetrics: ["test_artifacts/test_xingfuli_final_runtime_metrics.json"],
      gaps: ["让生产 Identity 直接复用已审计 identity GLB，或为当前程序化 recipe 单独建档"],
    },
  },
  shangsheng: {
    buildingId: "shangsheng",
    scope: "core-landmark",
    hero: {
      strategy: "detail-state-glb",
      assets: [
        "/models/shangsheng/sun-ke-villa.glb",
        "/models/shangsheng/navy-club-pool.glb",
      ],
    },
    identity: {
      strategy: "programmatic-site",
      assets: ["recipe:CampusBuildings(identity)"],
      requiredBeforeMapVisible: true,
    },
    massing: {
      strategy: "programmatic-site",
      assets: ["recipe:CampusMassingBuildings"],
      parametersSource: "app/scene/xinhua-landmarks-data.json#shangshengXinsuo",
      visibility: "cover-only",
    },
    shared: {
      transformSource: "app/scene/xinhua-landmarks-data.json#shangshengXinsuo.position",
      collisionSource: "app/scene/shangsheng-xinsuo-block.tsx",
    },
    evidence: emptyEvidence([
      "补齐片区 Hero、Identity、Massing build record 与三向运行时证据",
    ]),
  },
  huashan: {
    buildingId: "huashan",
    scope: "core-landmark",
    hero: {
      strategy: "detail-state-component",
      assets: ["recipe:HuashanGreenBlock(full)"],
    },
    identity: {
      strategy: "programmatic-site",
      assets: ["recipe:HuashanGreenBlock(identity)"],
      requiredBeforeMapVisible: true,
    },
    massing: {
      strategy: "programmatic-site",
      assets: ["recipe:HuashanGreenMassing"],
      parametersSource: "app/scene/xinhua-landmarks-data.json#huashanGreenland",
      visibility: "cover-only",
    },
    shared: {
      transformSource: "app/scene/xinhua-landmarks-data.json#huashanGreenland.position",
      collisionSource: "app/scene/huashan-green-block.tsx",
    },
    evidence: emptyEvidence([
      "补齐片区三档 build record、背向截图与资源/draw-call 指标",
    ]),
  },
} as const satisfies Readonly<Record<string, ProductionBuildingQualityEntry>>;

/**
 * 全世界生产 manifest 明确覆盖 14 个新华路地标与 3 个核心片区。
 * 未完成证据迁移的旧资产必须显式标记 migration-required，不能被误报为已验收。
 */
export const PRODUCTION_BUILDING_QUALITY_MANIFEST = {
  ...XINHUA_ROAD_PRODUCTION_QUALITY_MANIFEST,
  ...CORE_PRODUCTION_QUALITY_MANIFEST,
} as const satisfies Readonly<Record<string, ProductionBuildingQualityEntry>>;

const DETAIL_PRESETS_BY_BUILDING = {
  xingfuli: [
    "xingfuli",
    "hero",
    "xingfuli-canonical",
    "xingfuli-pool-detail",
    "xingfuli-entrance-detail",
  ],
  shangsheng: ["shangsheng", "pool", "sunke"],
  huashan: ["huashan", "court", "bridge"],
} as const;

export function detailPresetTargetsBuilding(
  priorityPreset: string | undefined,
  buildingId: keyof typeof DETAIL_PRESETS_BY_BUILDING,
) {
  if (!priorityPreset) return false;
  return (DETAIL_PRESETS_BY_BUILDING[buildingId] as readonly string[])
    .includes(priorityPreset);
}
