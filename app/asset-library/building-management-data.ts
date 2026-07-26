import { BUILDING_ASSETS, type AssetStatus, type QualityLevel } from "./asset-data";

export type WorkflowState = "done" | "partial" | "missing";

export type BuildingDocument = {
  title: string;
  type: "模型 Brief" | "参考清单" | "Build Record" | "研究记录";
  path: string;
};

export type BuildingPhoto = {
  label: string;
  src: string;
  kind: "参考照片" | "运行时对照";
};

export type BuildingManagementRecord = {
  id: string;
  name: string;
  address: string;
  gameStart: string;
  thumbnail: string;
  workflowState: WorkflowState;
  workflowNote: string;
  documents: BuildingDocument[];
  photos: BuildingPhoto[];
  qualityLevels: readonly QualityLevel[];
};

const ROAD_GAME_STARTS: Record<string, string> = {
  "shanghai-cinema": "cinema",
  "film-art-center": "film-art",
  "one-step-garden": "garden179",
  "xinhua-villas-211": "villas",
  "xinhua-villas-329": "villas329",
  "house-315": "house315",
  "villa-le-bec": "villa-le-bec",
  "shanghai-orchestra": "orchestra",
  "hudec-memorial": "hudec",
  "xinhua-pocket-park": "pocket-park",
  "xinhua-community-center": "community-center",
  "debi-fahua-525": "fahua525",
  "fahua-heritage": "fahua-heritage",
  "fics-xinhua-365": "fics365",
};

const RUNTIME_COMPARISONS = new Set([
  "shanghai-cinema",
  "film-art-center",
  "one-step-garden",
  "xinhua-villas-211",
  "xinhua-villas-329",
  "house-315",
  "villa-le-bec",
  "shanghai-orchestra",
]);

const SPECIFIC_DOCUMENTS: Partial<Record<string, BuildingDocument[]>> = {
  "shanghai-cinema": [
    { title: "上海影城模型 Brief", type: "模型 Brief", path: "docs/research/shanghai-cinema-model-brief.md" },
    { title: "上海影城参考清单", type: "参考清单", path: "docs/research/shanghai-cinema-reference-manifest.json" },
    { title: "上海影城构建记录", type: "Build Record", path: "docs/research/build-records/shanghai-cinema.json" },
  ],
  "film-art-center": [
    { title: "电影艺术中心模型 Brief", type: "模型 Brief", path: "docs/research/film-art-center-model-brief.md" },
    { title: "电影艺术中心参考清单", type: "参考清单", path: "docs/research/film-art-center-reference-manifest.json" },
    { title: "电影艺术中心构建记录", type: "Build Record", path: "docs/research/build-records/film-art-center.json" },
  ],
  "house-315": [
    { title: "新华路315号模型 Brief", type: "模型 Brief", path: "research/house-315-model-brief.md" },
  ],
  "hudec-memorial": [
    { title: "邬达克纪念馆模型 Brief", type: "模型 Brief", path: "research/hudec-memorial-model-brief.md" },
  ],
  "sun-ke-villa": [
    { title: "孙科别墅模型 Brief", type: "模型 Brief", path: "docs/research/sun-ke-villa-model-brief.md" },
    { title: "孙科别墅参考清单", type: "参考清单", path: "docs/research/sun-ke-villa-reference-manifest.json" },
    { title: "上生·新所参考记录", type: "研究记录", path: "docs/research/shangsheng-reference.md" },
  ],
};

const XINGFULI_DOCUMENTS: BuildingDocument[] = [
  { title: "幸福里模型 Brief", type: "模型 Brief", path: "docs/research/xingfuli-model-brief.md" },
  { title: "幸福里参考清单", type: "参考清单", path: "docs/research/xingfuli-reference-manifest.json" },
  { title: "幸福里研究记录", type: "研究记录", path: "docs/research/xingfuli-reference.md" },
];

function getDocuments(id: string): BuildingDocument[] {
  if (id.startsWith("xingfuli-")) return XINGFULI_DOCUMENTS;
  if (SPECIFIC_DOCUMENTS[id]) return SPECIFIC_DOCUMENTS[id] ?? [];
  if (["one-step-garden", "xinhua-villas-211", "xinhua-villas-329", "villa-le-bec", "shanghai-orchestra"].includes(id)) {
    return [
      { title: "新华路地标参考记录", type: "研究记录", path: "docs/research/xinhua-road-landmarks-reference.md" },
      { title: "地标模型对照记录", type: "研究记录", path: "docs/research/landmark-model-comparison.md" },
    ];
  }
  return [
    { title: "请求 POI 模型 Brief", type: "模型 Brief", path: "docs/research/requested-poi-model-brief.md" },
  ];
}

function getThumbnail(id: string) {
  if (id.startsWith("xingfuli-")) return "/images/poi-thumbnails/xingfuli.jpg";
  if (id === "sun-ke-villa") return "/images/poi-thumbnails/shangsheng.jpg";
  return `/images/poi-thumbnails/${id}.jpg`;
}

function getPhotos(id: string): BuildingPhoto[] {
  const photos: BuildingPhoto[] = [
    { label: "现场参考", src: getThumbnail(id), kind: "参考照片" },
  ];
  if (RUNTIME_COMPARISONS.has(id)) {
    photos.push({
      label: "Three.js 运行时",
      src: `/images/asset-management/${id}-runtime.png`,
      kind: "运行时对照",
    });
  }
  if (id.startsWith("xingfuli-")) {
    photos.push({
      label: "Three.js 运行时",
      src: "/images/asset-management/test_xingfuli_final_canonical_runtime_preview.png",
      kind: "运行时对照",
    });
  }
  if (id === "sun-ke-villa") {
    return [
      {
        label: "Canonical 正面参考",
        src: "/images/asset-management/sun-ke-villa-front-canonical.jpg",
        kind: "参考照片",
      },
      {
        label: "Three.js 运行时",
        src: "/images/asset-management/test_sun_ke_villa_runtime_preview.png",
        kind: "运行时对照",
      },
    ];
  }
  return photos;
}

function getGameStart(id: string) {
  if (id.startsWith("xingfuli-")) return "xingfuli-canonical";
  if (id === "sun-ke-villa") return "sunke";
  return ROAD_GAME_STARTS[id] ?? id;
}

function getWorkflowState(id: string, levels: readonly QualityLevel[]): Pick<BuildingManagementRecord, "workflowState" | "workflowNote"> {
  const hasIdentity = levels.some((level) => level.id === "identity" && Boolean(level.model));
  const hasMassing = levels.some((level) => level.id === "massing" && Boolean(level.model));
  const hasSpecificBrief = Boolean(SPECIFIC_DOCUMENTS[id]) || id.startsWith("xingfuli-");
  if (hasIdentity && hasMassing && hasSpecificBrief) {
    return { workflowState: "done", workflowNote: "三档资产、证据与运行时入口已接通" };
  }
  if (hasSpecificBrief || RUNTIME_COMPARISONS.has(id)) {
    return { workflowState: "partial", workflowNote: "Hero 已上线，轻量等级或证据仍有缺口" };
  }
  return { workflowState: "missing", workflowNote: "Hero 已上线，流程文档与轻量等级待补齐" };
}

export const BUILDING_MANAGEMENT_RECORDS: BuildingManagementRecord[] = BUILDING_ASSETS.map((asset) => {
  const qualityLevels = asset.qualityLevels ?? [];
  return {
    id: asset.id,
    name: asset.name,
    address: asset.subtitle,
    gameStart: getGameStart(asset.id),
    thumbnail: getThumbnail(asset.id),
    documents: getDocuments(asset.id),
    photos: getPhotos(asset.id),
    qualityLevels,
    ...getWorkflowState(asset.id, qualityLevels),
  };
});

export const WORKFLOW_STAGES = [
  {
    id: "evidence",
    index: "01",
    title: "参考证据",
    summary: "照片入库、来源登记、canonical / 侧向 / 入口视角覆盖。",
    gate: "可见事实、合理推断与未知项分开记录。",
  },
  {
    id: "brief",
    index: "02",
    title: "模型 Brief",
    summary: "明确比例、朝向、人物尺度、身份构件与运行时预算。",
    gate: "至少 3 个主体独有识别构件，缺失面必须标记未知。",
  },
  {
    id: "massing",
    index: "03",
    title: "体块灰模",
    summary: "建立 Massing，并放入真实 Three.js 地图校准位置与尺度。",
    gate: "地面接触、道路退界、相机与基础材质通过后才进入细化。",
  },
  {
    id: "hero",
    index: "04",
    title: "Hero 主资产",
    summary: "身份构件、材质、场地与碰撞按批次完成。",
    gate: "每批保存新产物并更新参考 / Blender / Three.js 三联对照。",
  },
  {
    id: "tiers",
    index: "05",
    title: "质量等级",
    summary: "由 Hero 派生 Identity，保留 Massing；三档共享坐标、pivot 与碰撞语义。",
    gate: "缺少的等级明确留空，不用 Hero 冒充。",
  },
  {
    id: "audit",
    index: "06",
    title: "构建审计",
    summary: "记录 GLB SHA、bounds、节点、三角面、材质、图片与文件体积。",
    gate: "实际二进制变化必须同步更新缓存版本与 Build Record。",
  },
  {
    id: "runtime",
    index: "07",
    title: "运行时验收",
    summary: "通过真实游戏入口检查位置、朝向、碰撞、遮挡、相机与性能。",
    gate: "Blender 预览通过不等于完成，必须通过实际 ?start= 路径。",
  },
  {
    id: "review",
    index: "08",
    title: "独立审查",
    summary: "灰模与最终资产各进行一次独立检查，问题退回对应批次。",
    gate: "结构问题未关闭不得发布。",
  },
] as const;

export const STATUS_LABELS: Record<AssetStatus | WorkflowState, string> = {
  online: "线上",
  ready: "已就绪",
  pilot: "实验",
  internal: "内部",
  pending: "待制作",
  archived: "历史",
  done: "已贯通",
  partial: "进行中",
  missing: "待补齐",
};
