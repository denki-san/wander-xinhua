import type { LandmarkPlacement } from "./xinhua-road-contract";
import { planarDistanceToLandmarkFootprint } from "./xinhua-road-placement.mjs";
import landmarkData from "./xinhua-road-landmarks-data.json" with { type: "json" };
import { HOUSE_315_TIERS } from "./house-315-tier-contract.mjs";
import { ONE_STEP_GARDEN_TIERS } from "./one-step-garden-tier-contract.mjs";

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

export const XINHUA_ROAD_HERO_ENTER_DISTANCE = 40;
export const XINHUA_ROAD_HERO_EXIT_DISTANCE = 55;
export const XINHUA_ROAD_HERO_SAMPLE_SECONDS = 0.2;

export const CORE_BUILDING_HERO_DISTANCE = {
  xingfuli: {
    enterDistance: 72,
    exitDistance: 88,
    sampleSeconds: 0.2,
  },
  shangsheng: {
    enterDistance: 92,
    exitDistance: 112,
    sampleSeconds: 0.2,
  },
  huashan: {
    enterDistance: 76,
    exitDistance: 94,
    sampleSeconds: 0.2,
  },
} as const;

export function xinhuaRoadDistanceHeroIds({
  loadMode,
  focusPosition,
  mountedModelIds,
}: {
  loadMode: "overview" | "explore";
  focusPosition: readonly [number, number];
  mountedModelIds: ReadonlySet<string>;
}) {
  if (loadMode !== "explore") return new Set<string>();
  const next = new Set<string>();
  for (const landmark of XINHUA_ROAD_QUALITY_LANDMARKS) {
    const threshold = mountedModelIds.has(landmark.id)
      ? XINHUA_ROAD_HERO_EXIT_DISTANCE
      : XINHUA_ROAD_HERO_ENTER_DISTANCE;
    const distance = planarDistanceToLandmarkFootprint(
      focusPosition,
      landmark,
    );
    if (distance <= threshold) next.add(landmark.id);
  }
  return next;
}

export const SHANGHAI_CINEMA_IDENTITY_MODEL_PATH =
  "/models/xinhua-road/shanghai-cinema-hybrid-identity.glb";
export const SHANGHAI_CINEMA_IDENTITY_CACHE_VERSION = "20260722-hybrid-1";
export const SHANGHAI_CINEMA_MASSING_MODEL_PATH =
  "/models/xinhua-road/shanghai-cinema-massing.glb";
export const SHANGHAI_CINEMA_MASSING_CACHE_VERSION = "20260725-massing-1";
export const FILM_ART_CENTER_IDENTITY_MODEL_PATH =
  "/models/tiers/xinhua-road/identity/film-art-center-identity.glb";
export const FILM_ART_CENTER_IDENTITY_CACHE_VERSION =
  "20260725-film-art-identity-1";

export const ACCEPTED_DERIVED_BUILDING_TIERS = {
  "villa-le-bec": {
    hero: {
      path:
        "/models/tiers/xinhua-road/hero-v2/"
        + "villa-le-bec-hero-v2.glb",
      cacheVersion: "20260726-hero-4f909a3b149e",
    },
    identity: {
      path:
        "/models/tiers/xinhua-road/identity-v2/"
        + "villa-le-bec-identity-v2.glb",
      cacheVersion: "20260726-identity-4be0685ed6db",
    },
    massing: {
      path:
        "/models/tiers/xinhua-road/massing-v2/"
        + "villa-le-bec-massing.glb",
      cacheVersion: "20260726-massing-593cc3995046",
    },
  },
  "hudec-memorial": {
    hero: {
      path: "/models/requested-pois/hudec-memorial-v2-hero.glb",
      cacheVersion: "20260726-hero-598b2ba19e24",
    },
    identity: {
      path:
        "/models/tiers/xinhua-road/identity-v1/"
        + "hudec-memorial-identity.glb",
      cacheVersion: "20260726-identity-867f336824f6",
    },
    massing: {
      path: "/models/requested-pois/hudec-memorial-massing.glb",
      cacheVersion: "20260726-massing-772ce8a8445a",
    },
  },
  "xinhua-pocket-park": {
    hero: {
      path:
        "/models/tiers/xinhua-road/hero-v2/"
        + "xinhua-pocket-park-hero.glb",
      cacheVersion: "20260726-hero-c6ef6f107e3c",
    },
    identity: {
      path:
        "/models/tiers/xinhua-road/identity-v1/"
        + "xinhua-pocket-park-identity.glb",
      cacheVersion: "20260726-identity-892677bb8f33",
    },
    massing: {
      path:
        "/models/tiers/xinhua-road/massing-v2/"
        + "xinhua-pocket-park-massing.glb",
      cacheVersion: "20260726-massing-cc89e36e6839",
    },
  },
} as const;

export type XinhuaRoadIdentityStrategy =
  | "programmatic-miniature"
  | "custom-landmark-hybrid"
  | "derived-glb";

/**
 * 独立 GLB 已按 Hero 原点导出，不能再套用 bounds-center 平移。
 * 只有以 bounds 构建的程序化缩影需要把几何中心移到共享建筑原点附近。
 */
export function xinhuaRoadIdentityLocalPosition(
  localBounds: LandmarkPlacement["localBounds"],
  strategy: XinhuaRoadIdentityStrategy,
): [number, number, number] {
  if (strategy !== "programmatic-miniature") return [0, 0, 0];
  return [
    (localBounds.minX + localBounds.maxX) / 2,
    0,
    -(localBounds.minZ + localBounds.maxZ) / 2,
  ];
}

export type XinhuaRoadBuildingQualityEntry = {
  buildingId: string;
  hero: {
    strategy: "distance-state-glb";
    model: string;
    cacheVersion?: string;
    loading: {
      enterDistance: number;
      exitDistance: number;
      sampleSeconds: number;
    };
  };
  identity: {
    strategy: XinhuaRoadIdentityStrategy;
    recipe: XinhuaRoadIdentityKind;
    model?: string;
    cacheVersion?: string;
    requiredBeforeMapVisible: true;
  };
  massing: {
    strategy: "bounds-proxy" | "formal-glb" | "derived-glb";
    visibility: "cover-only";
    localBounds: LandmarkPlacement["localBounds"];
    model?: string;
    cacheVersion?: string;
  };
  shared: Pick<LandmarkPlacement, "position" | "yaw" | "scale" | "localObstacles">;
  collision: "stable-shared-structure";
};

function buildingQualityEntry(
  landmark: LandmarkPlacement,
): XinhuaRoadBuildingQualityEntry {
  const shanghaiCinema = landmark.id === "shanghai-cinema";
  const filmArtCenter = landmark.id === "film-art-center";
  const oneStepGarden = landmark.id === "one-step-garden";
  const house315 = landmark.id === "house-315";
  const acceptedDerived = ACCEPTED_DERIVED_BUILDING_TIERS[
    landmark.id as keyof typeof ACCEPTED_DERIVED_BUILDING_TIERS
  ];
  return {
    buildingId: landmark.id,
    hero: {
      strategy: "distance-state-glb",
      model: landmark.model,
      cacheVersion: landmark.cacheVersion,
      loading: {
        enterDistance: XINHUA_ROAD_HERO_ENTER_DISTANCE,
        exitDistance: XINHUA_ROAD_HERO_EXIT_DISTANCE,
        sampleSeconds: XINHUA_ROAD_HERO_SAMPLE_SECONDS,
      },
    },
    identity: {
      strategy: oneStepGarden || house315 || acceptedDerived
        ? "derived-glb"
        : shanghaiCinema
          ? "custom-landmark-hybrid"
          : filmArtCenter
            ? "derived-glb"
          : "programmatic-miniature",
      recipe: xinhuaRoadIdentityKind(landmark.id),
      model: acceptedDerived
        ? acceptedDerived.identity.path
        : oneStepGarden || house315
        ? (
          oneStepGarden
            ? ONE_STEP_GARDEN_TIERS.identity.path
            : HOUSE_315_TIERS.identity.path
        )
        : shanghaiCinema
          ? SHANGHAI_CINEMA_IDENTITY_MODEL_PATH
          : filmArtCenter
            ? FILM_ART_CENTER_IDENTITY_MODEL_PATH
          : undefined,
      cacheVersion: acceptedDerived
        ? acceptedDerived.identity.cacheVersion
        : oneStepGarden || house315
        ? (
          oneStepGarden
            ? ONE_STEP_GARDEN_TIERS.identity.cacheVersion
            : HOUSE_315_TIERS.identity.cacheVersion
        )
        : shanghaiCinema
          ? SHANGHAI_CINEMA_IDENTITY_CACHE_VERSION
          : filmArtCenter
            ? FILM_ART_CENTER_IDENTITY_CACHE_VERSION
          : undefined,
      requiredBeforeMapVisible: true,
    },
    massing: {
      strategy: oneStepGarden || house315 || acceptedDerived
        ? "derived-glb"
        : shanghaiCinema
          ? "formal-glb"
          : "bounds-proxy",
      visibility: "cover-only",
      localBounds: landmark.localBounds,
      model: acceptedDerived
        ? acceptedDerived.massing.path
        : oneStepGarden || house315
        ? (
          oneStepGarden
            ? ONE_STEP_GARDEN_TIERS.massing.path
            : HOUSE_315_TIERS.massing.path
        )
        : shanghaiCinema
          ? SHANGHAI_CINEMA_MASSING_MODEL_PATH
          : undefined,
      cacheVersion: acceptedDerived
        ? acceptedDerived.massing.cacheVersion
        : oneStepGarden || house315
        ? (
          oneStepGarden
            ? ONE_STEP_GARDEN_TIERS.massing.cacheVersion
            : HOUSE_315_TIERS.massing.cacheVersion
        )
        : shanghaiCinema
          ? SHANGHAI_CINEMA_MASSING_CACHE_VERSION
          : undefined,
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
 * 地图只读取 Identity；本地游览的 Hero 仅由玩家与建筑的实际距离按需请求。
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
    strategy: "distance-state-glb" | "distance-state-component";
    assets: readonly string[];
    loading: {
      enterDistance: number;
      exitDistance: number;
      sampleSeconds: number;
    };
  };
  identity: {
    strategy:
      | "programmatic-miniature"
      | "custom-landmark-hybrid"
      | "programmatic-site"
      | "derived-glb";
    assets: readonly string[];
    requiredBeforeMapVisible: true;
  };
  massing: {
    strategy:
      | "bounds-proxy"
      | "formal-glb"
      | "programmatic-site"
      | "derived-glb";
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
  if (landmarkId === "house-315") {
    return {
      status: "accepted-with-followup",
      heroBuildRecords: [
        "docs/research/build-records/tiers/xinhua-road/hero-v2/house-315-hero.json",
      ],
      identityBuildRecords: [
        "docs/research/build-records/tiers/xinhua-road/identity-v1/house-315-identity.json",
      ],
      massingBuildRecords: [
        "docs/research/build-records/tiers/xinhua-road/massing-v2/house-315-massing.json",
      ],
      canonicalScreenshots: [
        "test_artifacts/all-models/identity-v1/house-315/test_house-315-identity-v1_mcp3_recheck_canonical.png",
      ],
      sideScreenshots: [
        "test_artifacts/all-models/identity-v1/house-315/test_house-315-identity-v1_mcp3_recheck_side-depth.png",
      ],
      rearScreenshots: [],
      runtimeScreenshots: [],
      resourceMetrics: [
        "docs/research/house-315-three-tier-runtime-qa.json",
      ],
      drawCallMetrics: [],
      gaps: [
        "主窗口整合后补做三档、ResourceTiming、截图、console、FPS、四段碰撞与 deterministic fallback 真实浏览器终验",
      ],
    };
  }
  if (landmarkId === "one-step-garden") {
    return {
      status: "accepted-with-followup",
      heroBuildRecords: [
        "docs/research/build-records/tiers/xinhua-road/hero-v2/one-step-garden-hero.json",
      ],
      identityBuildRecords: [
        "docs/research/build-records/tiers/xinhua-road/identity-v1/one-step-garden-identity.json",
      ],
      massingBuildRecords: [
        "docs/research/build-records/tiers/xinhua-road/massing-v2/one-step-garden-massing.json",
      ],
      canonicalScreenshots: [
        "test_artifacts/all-models/identity-v1/one-step-garden/test_one-step-garden-identity-v1_mcp3_recheck_canonical.png",
      ],
      sideScreenshots: [
        "test_artifacts/all-models/identity-v1/one-step-garden/test_one-step-garden-identity-v1_mcp3_recheck_side.png",
      ],
      rearScreenshots: [],
      runtimeScreenshots: [],
      resourceMetrics: [
        "test_artifacts/test_one-step-garden-three-tier-runtime-qa.json",
      ],
      drawCallMetrics: [],
      gaps: [
        "主窗口整合后补做三档、ResourceTiming、截图、console、FPS、碰撞与 deterministic fallback 真实浏览器终验",
      ],
    };
  }
  if (landmarkId === "shanghai-cinema") {
    return {
      status: "accepted-with-followup",
      heroBuildRecords: ["docs/research/build-records/shanghai-cinema.json"],
      identityBuildRecords: [
        "docs/research/build-records/shanghai-cinema-hybrid-identity.json",
      ],
      massingBuildRecords: [
        "docs/research/build-records/shanghai-cinema-massing.json",
      ],
      canonicalScreenshots: [
        "test_artifacts/test_shanghai-cinema-hybrid-identity_canonical_preview.png",
        "test_artifacts/test_shanghai-cinema_mcp1_massing_canonical.png",
      ],
      sideScreenshots: [
        "test_artifacts/test_shanghai-cinema-hybrid-identity_side_preview.png",
        "test_artifacts/test_shanghai-cinema_mcp1_massing_side.png",
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
      status: "accepted-with-followup",
      heroBuildRecords: ["docs/research/build-records/film-art-center.json"],
      identityBuildRecords: [
        "docs/research/build-records/tiers/xinhua-road/identity/film-art-center-identity.json",
      ],
      massingBuildRecords: [
        "docs/research/build-records/tiers/xinhua-road/massing/film-art-center-massing.json",
      ],
      canonicalScreenshots: [
        "test_artifacts/test_film-art-center-hero_mcp2_recheck_canonical.png",
        "test_artifacts/test_film-art-center-identity_mcp3_recheck_canonical.png",
      ],
      sideScreenshots: [
        "test_artifacts/test_film-art-center-hero_mcp2_recheck_side.png",
        "test_artifacts/test_film-art-center-identity_mcp3_recheck_side.png",
      ],
      rearScreenshots: [],
      runtimeScreenshots: [
        "test_artifacts/test_film-art-center_runtime_hero_1280x800.png",
        "test_artifacts/test_film-art-center_runtime_identity_1280x800.png",
        "test_artifacts/test_film-art-center_runtime_massing_1280x800.png",
        "test_artifacts/test_film-art-center_runtime_production_identity_1280x800.png",
        "test_artifacts/test_film-art-center_runtime_identity_fallback_scoped_1280x800.png",
        "test_artifacts/test_film-art-center_runtime_production_identity_fallback_1280x800.png",
      ],
      resourceMetrics: [
        "test_artifacts/test_film-art-center_three-tier_runtime_metrics.json",
      ],
      drawCallMetrics: [
        "test_artifacts/test_film-art-center_three-tier_runtime_metrics.json",
      ],
      gaps: [
        "主窗口真实浏览器终验仍待统一调度执行",
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
        loading: entry.hero.loading,
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
        assets: entry.massing.model
          ? [
            entry.massing.cacheVersion
              ? `${entry.massing.model}?v=${entry.massing.cacheVersion}`
              : entry.massing.model,
          ]
          : [],
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

const XINGFULI_SEGMENT_IDS = ["west", "center", "east"] as const;

function xingfuliSegmentProductionEntry(
  segment: typeof XINGFULI_SEGMENT_IDS[number],
): ProductionBuildingQualityEntry {
  const buildingId = `xingfuli-${segment}`;
  return {
    buildingId,
    scope: "core-landmark",
    hero: {
      strategy: "distance-state-glb",
      assets: [
        `/models/xingfuli/${buildingId}.glb?v=20260723-final-1`,
      ],
      loading: CORE_BUILDING_HERO_DISTANCE.xingfuli,
    },
    identity: {
      strategy: "derived-glb",
      assets: [`/models/xingfuli/${buildingId}-identity.glb`],
      requiredBeforeMapVisible: true,
    },
    massing: {
      strategy: "derived-glb",
      assets: [`/models/xingfuli/${buildingId}-massing.glb`],
      parametersSource: "app/scene/xingfuli-collision.ts",
      visibility: "cover-only",
    },
    shared: {
      transformSource:
        "app/scene/xinhua-world.tsx#XINGFULI_POSITION,XINGFULI_LONGITUDINAL_SCALE,xingfuliLocalToWorld",
      collisionSource: "app/scene/xinhua-world.tsx#XINGFULI_WORLD_OBSTACLES",
    },
    evidence: {
      status: "accepted-with-followup",
      heroBuildRecords: ["docs/research/build-records/xingfuli.json"],
      identityBuildRecords: ["docs/research/build-records/xingfuli-identity.json"],
      massingBuildRecords: ["docs/research/build-records/xingfuli-massing.json"],
      canonicalScreenshots: [
        `test_artifacts/test_${buildingId}_canonical_preview.png`,
      ],
      sideScreenshots: [
        `test_artifacts/test_${buildingId}_side_preview.png`,
      ],
      rearScreenshots: [],
      runtimeScreenshots: [
        "test_artifacts/test_xingfuli_final_runtime_views_preview.png",
        "test_artifacts/test_xingfuli_identity_canonical_runtime_preview.png",
        "test_artifacts/test_xingfuli_massing_canonical_runtime_preview.png",
      ],
      resourceMetrics: ["test_artifacts/test_xingfuli_final_runtime_metrics.json"],
      drawCallMetrics: [],
      gaps: [
        "补录 Blender MCP Massing、Hero 与三级同机位三道门",
        "补录当前三档同机位背向运行时截图与 draw-call 指标",
      ],
    },
  };
}

const XINGFULI_BUILDING_PRODUCTION_QUALITY_MANIFEST = Object.fromEntries(
  XINGFULI_SEGMENT_IDS.map((segment) => {
    const entry = xingfuliSegmentProductionEntry(segment);
    return [entry.buildingId, entry];
  }),
) as Readonly<Record<string, ProductionBuildingQualityEntry>>;

const SUN_KE_VILLA_PRODUCTION_QUALITY_MANIFEST = {
  "sun-ke-villa": {
    buildingId: "sun-ke-villa",
    scope: "core-landmark",
    hero: {
      strategy: "distance-state-glb",
      assets: ["/models/shangsheng/sun-ke-villa.glb"],
      loading: CORE_BUILDING_HERO_DISTANCE.shangsheng,
    },
    identity: {
      strategy: "programmatic-site",
      assets: ["recipe:SunKeVillaFallback"],
      requiredBeforeMapVisible: true,
    },
    massing: {
      strategy: "programmatic-site",
      assets: ["recipe:CampusMassingBuildings#sun-ke-villa"],
      parametersSource:
        "app/scene/xinhua-landmarks-data.json#shangshengXinsuo.buildings[feature=sun-ke-villa]",
      visibility: "cover-only",
    },
    shared: {
      transformSource:
        "app/scene/xinhua-landmarks-data.json#shangshengXinsuo.buildings[feature=sun-ke-villa]",
      collisionSource: "app/scene/shangsheng-xinsuo-block.tsx#SunKeVillaFallback",
    },
    evidence: {
      ...emptyEvidence([
        "补齐正式 Hero、Identity、Massing build record",
        "补录 Blender MCP Massing、Hero 与三级同机位三道门",
        "补录当前三档同机位运行时与资源/draw-call 指标",
      ]),
      canonicalScreenshots: [
        "test_artifacts/test_sun_ke_villa_canonical_preview.png",
      ],
      sideScreenshots: [
        "test_artifacts/test_sun_ke_villa_right_front_preview.png",
      ],
      runtimeScreenshots: [
        "test_artifacts/test_sun_ke_villa_runtime_preview.png",
      ],
    },
  },
} as const satisfies Readonly<Record<string, ProductionBuildingQualityEntry>>;

/**
 * 18 栋生产 manifest 明确覆盖 14 个新华路地标、幸福里三分区和孙科别墅。
 * 华山绿地、上生·新所父级容器及范围外资产继续运行，但不进入本轮建筑完成计数。
 * 未完成证据迁移的旧资产必须显式标记 migration-required，不能被误报为已验收。
 */
export const PRODUCTION_BUILDING_QUALITY_MANIFEST = {
  ...XINHUA_ROAD_PRODUCTION_QUALITY_MANIFEST,
  ...XINGFULI_BUILDING_PRODUCTION_QUALITY_MANIFEST,
  ...SUN_KE_VILLA_PRODUCTION_QUALITY_MANIFEST,
} as const satisfies Readonly<Record<string, ProductionBuildingQualityEntry>>;
