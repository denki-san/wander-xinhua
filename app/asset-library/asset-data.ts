import landmarkData from "../scene/xinhua-road-landmarks-data.json" with { type: "json" };

export type AssetCategory = "buildings" | "lighting" | "trees" | "decor" | "characters";
export type AssetStatus = "online" | "ready" | "pilot" | "internal" | "pending" | "archived";

export type QualityLevel = {
  id: "hero" | "identity" | "massing";
  name: string;
  status: AssetStatus;
  model?: string;
  note: string;
};

export type AssetRecord = {
  id: string;
  category: AssetCategory;
  name: string;
  subtitle: string;
  status: AssetStatus;
  model?: string;
  preview?: string;
  variants?: readonly string[];
  instanceCount?: number;
  qualityLevels?: readonly QualityLevel[];
  note?: string;
};

const LEVEL_NAMES = {
  hero: "Hero / Full",
  identity: "Hybrid Identity",
  massing: "Massing",
} as const;

function defaultBuildingLevels(heroModel: string): QualityLevel[] {
  return [
    {
      id: "hero",
      name: LEVEL_NAMES.hero,
      status: "online",
      model: heroModel,
      note: "线上近景与详情资产",
    },
    {
      id: "identity",
      name: LEVEL_NAMES.identity,
      status: "pending",
      note: "待制作正式轻量识别版",
    },
    {
      id: "massing",
      name: LEVEL_NAMES.massing,
      status: "internal",
      note: "由边界与碰撞参数生成，仅供内部占位",
    },
  ];
}

const ROAD_BUILDINGS: AssetRecord[] = landmarkData.landmarks.map((landmark) => {
  const heroModel = landmark.cacheVersion
    ? `${landmark.model}?v=${landmark.cacheVersion}`
    : landmark.model;
  const levels = defaultBuildingLevels(heroModel);
  if (landmark.id === "shanghai-cinema") {
    levels[1] = {
      id: "identity",
      name: LEVEL_NAMES.identity,
      status: "pilot",
      model: "/models/xinhua-road/shanghai-cinema-hybrid-identity.glb",
      note: "实验验证版，尚未替换生产 Hero",
    };
  }
  return {
    id: landmark.id,
    category: "buildings",
    name: landmark.name,
    subtitle: landmark.address,
    status: "online",
    model: heroModel,
    qualityLevels: levels,
    note: landmark.poi ? "线上 POI / 场景地标" : "新华路线上建筑",
  };
});

const XINGFULI_BUILDINGS: AssetRecord[] = (["west", "center", "east"] as const).map((zone) => {
  const labels = { west: "西区", center: "中区", east: "东区" };
  const hero = `/models/xingfuli/xingfuli-${zone}.glb?v=20260723-final-1`;
  return {
    id: `xingfuli-${zone}`,
    category: "buildings",
    name: `幸福里 · ${labels[zone]}`,
    subtitle: "幸福路67号 / 番禺路381号",
    status: "online",
    model: hero,
    qualityLevels: [
      {
        id: "hero",
        name: LEVEL_NAMES.hero,
        status: "online",
        model: hero,
        note: "最终场景版",
      },
      {
        id: "identity",
        name: LEVEL_NAMES.identity,
        status: "ready",
        model: `/models/xingfuli/xingfuli-${zone}-identity.glb`,
        note: "已生成并完成多视角预览",
      },
      {
        id: "massing",
        name: LEVEL_NAMES.massing,
        status: "internal",
        model: `/models/xingfuli/xingfuli-${zone}-massing.glb`,
        note: "灰模体块，仅供内部校准",
      },
    ],
    note: "同一街区按西 / 中 / 东拆分管理",
  };
});

const SUN_KE_VILLA: AssetRecord = {
  id: "sun-ke-villa",
  category: "buildings",
  name: "孙科别墅",
  subtitle: "番禺路60号",
  status: "online",
  model: "/models/shangsheng/sun-ke-villa.glb",
  qualityLevels: defaultBuildingLevels("/models/shangsheng/sun-ke-villa.glb"),
  note: "上生·新所 Hero 建筑",
};

export const BUILDING_ASSETS = [
  ...ROAD_BUILDINGS,
  ...XINGFULI_BUILDINGS,
  SUN_KE_VILLA,
] satisfies AssetRecord[];

export const LIGHTING_ASSETS = [
  {
    id: "lighting-v3",
    category: "lighting",
    name: "夕阳 · Lighting V3",
    subtitle: "当前生产光线",
    status: "online",
    preview: "sunset-light",
    variants: ["Explore 近景", "Overview 全览"],
    note: "暖色低角度主光、冷色天空补光与纸张质感",
  },
] satisfies AssetRecord[];

export const TREE_ASSETS = [
  {
    id: "plane-tree",
    category: "trees",
    name: "新华路法国梧桐",
    subtitle: "32 个线上实例",
    status: "online",
    model: "/models/xinhua-road/plane-tree-a.glb?v=36ffe252c43b",
    variants: ["A · 直干疏冠", "B · 左倾开冠", "C · 右倾开冠", "Hero · 近景精模"],
    instanceCount: 32,
    note: "道路 29 株 + 幸福里 3 株；近景 Hero 会替换其中 1 株",
  },
  {
    id: "campus-tree",
    category: "trees",
    name: "上生庭院树",
    subtitle: "44 个程序化实例",
    status: "online",
    preview: "campus-tree",
    variants: ["庭院乔木 · 1 种结构"],
    instanceCount: 44,
    note: "按实例高度、树冠尺度与朝向形成变化",
  },
  {
    id: "huashan-tree",
    category: "trees",
    name: "华山绿地乔木",
    subtitle: "112 个程序化实例",
    status: "online",
    preview: "huashan-tree",
    variants: ["成熟乔木 · 双层树冠", "林下灌木层"],
    instanceCount: 112,
    note: "乔木主体 4 个结构部件，另配林下灌木层",
  },
] satisfies AssetRecord[];

export const DECOR_ASSETS = [
  {
    id: "lane-lamp",
    category: "decor",
    name: "里弄路灯",
    subtitle: "共享街景资产",
    status: "online",
    preview: "lane-lamp",
    variants: ["短臂单灯"],
  },
  {
    id: "cantilever-umbrella",
    category: "decor",
    name: "悬臂咖啡伞",
    subtitle: "共享街景资产",
    status: "online",
    preview: "umbrella",
    variants: ["暖灰", "珊瑚红"],
  },
  {
    id: "outdoor-dining",
    category: "decor",
    name: "户外桌椅",
    subtitle: "共享街景资产",
    status: "online",
    preview: "dining",
    variants: ["深色木金属", "白色模压", "彩色折叠"],
  },
  {
    id: "slatted-bench",
    category: "decor",
    name: "条板长椅",
    subtitle: "共享街景资产",
    status: "online",
    preview: "bench",
    variants: ["带靠背"],
  },
  {
    id: "street-planter",
    category: "decor",
    name: "街景花箱",
    subtitle: "共享街景资产",
    status: "online",
    preview: "planter",
    variants: ["方形", "高筒", "长条"],
  },
  {
    id: "stone-bollard",
    category: "decor",
    name: "不规则石桩",
    subtitle: "幸福里入口",
    status: "online",
    preview: "bollard",
    variants: ["矮方", "斜方", "低块"],
  },
  {
    id: "mixed-paving",
    category: "decor",
    name: "混合灰色铺装",
    subtitle: "幸福里地面系统",
    status: "online",
    preview: "paving",
    variants: ["分区石板", "纵向顺砌"],
  },
  {
    id: "ground-cover",
    category: "decor",
    name: "草地与灌木层",
    subtitle: "程序化绿化",
    status: "online",
    preview: "ground-cover",
    variants: ["草坪", "低矮灌木", "垂直花园单元"],
  },
  {
    id: "navy-club-pool",
    category: "decor",
    name: "海军俱乐部泳池",
    subtitle: "上生·新所场景装置",
    status: "online",
    model: "/models/shangsheng/navy-club-pool.glb",
    variants: ["泳池与跳台"],
  },
  {
    id: "trash-bin",
    category: "decor",
    name: "垃圾桶",
    subtitle: "待接入生产场景",
    status: "pending",
    preview: "missing",
    variants: [],
    note: "当前运行时代码与线上模型注册表中未发现可用垃圾桶资产",
  },
] satisfies AssetRecord[];

export const CHARACTER_ASSETS = [
  {
    id: "rain-summer-wanderer",
    category: "characters",
    name: "雨季夏日漫游者",
    subtitle: "当前线上主角",
    status: "online",
    model: "/models/character/rain-summer-wanderer.glb?v=f9721e54f034",
    variants: ["第三人称角色", "内置移动动画"],
    instanceCount: 1,
    note: "仓库中另有 2 个历史角色文件，不计入线上资产数",
  },
] satisfies AssetRecord[];

export const ALL_ASSETS = [
  ...BUILDING_ASSETS,
  ...LIGHTING_ASSETS,
  ...TREE_ASSETS,
  ...DECOR_ASSETS,
  ...CHARACTER_ASSETS,
] satisfies AssetRecord[];

export const CATEGORY_META: Record<AssetCategory, { label: string; short: string }> = {
  buildings: { label: "建筑", short: "栋 / 组" },
  lighting: { label: "光线", short: "套" },
  trees: { label: "树木", short: "类" },
  decor: { label: "装饰物", short: "类" },
  characters: { label: "人物", short: "个" },
};

