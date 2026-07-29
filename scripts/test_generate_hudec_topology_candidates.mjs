import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const basePath = path.join(
  rootDir,
  "building-engine/cases/hudec-memorial/building-dsl.json",
);
const outputDir = path.join(
  rootDir,
  "test_artifacts/building-engine-spike/hudec-memorial/topology-candidates",
);

const baseDsl = JSON.parse(fs.readFileSync(basePath, "utf8"));
fs.mkdirSync(outputDir, { recursive: true });

const claimIds = {
  massing: ["hudec-memorial-main-massing"],
  roof: ["hudec-memorial-layered-roofs"],
  glass: ["hudec-memorial-glass-wing"],
  chimney: ["hudec-memorial-chimney-tower"],
};

function volume(
  id,
  center,
  size,
  height,
  material = "wall",
  options = {},
) {
  return {
    id,
    type: "box",
    center,
    size,
    height,
    material,
    ...(options.lower
      ? {
          lowerMaterial: "brick",
          lowerHeight: options.lowerHeight ?? 0.58,
        }
      : {}),
    evidenceClaimIds: options.claims ?? claimIds.massing,
  };
}

function gable(
  id,
  center,
  length,
  span,
  axis,
  eaveHeight,
  ridgeHeight,
  gableMaterial = "wall",
) {
  return {
    id,
    type: "gable",
    shape: "rect",
    center,
    length,
    span,
    ridgeAxis: axis,
    eaveHeight,
    ridgeHeight,
    material: "roof",
    gableMaterial,
    evidenceClaimIds: claimIds.roof,
  };
}

function shed(
  id,
  center,
  length,
  span,
  axis,
  highSide,
  eaveHeight,
  ridgeHeight,
) {
  return {
    id,
    type: "shed",
    shape: "rect",
    center,
    length,
    span,
    ridgeAxis: axis,
    highSide,
    eaveHeight,
    ridgeHeight,
    material: "roof",
    gableMaterial: "wall",
    evidenceClaimIds: [...claimIds.roof, ...claimIds.glass],
  };
}

function chimneyVolumes(x, y, label, options = {}) {
  const roofMounted = options.roofMounted ?? false;
  const whiteBase = roofMounted ? 4.62 : 0;
  const whiteHeight = roofMounted ? 1.68 : 5.5;
  const brickBase = roofMounted ? 6.08 : 5.34;
  const brickHeight = roofMounted ? 1.92 : 1.68;
  const capBase = roofMounted ? 7.84 : 6.86;
  return [
    {
      id: `${label}-white-roof-base`,
      type: "box",
      center: [x, y],
      size: [1.12, 1.08],
      baseHeight: whiteBase,
      height: whiteHeight,
      material: "wall",
      evidenceClaimIds: claimIds.chimney,
    },
    {
      id: `${label}-brick-head`,
      type: "box",
      center: [x, y],
      size: [0.86, 0.82],
      baseHeight: brickBase,
      height: brickHeight,
      material: "brick",
      evidenceClaimIds: claimIds.chimney,
    },
    {
      id: `${label}-brick-cap`,
      type: "box",
      center: [x, y],
      size: [1.02, 0.98],
      baseHeight: capBase,
      height: 0.22,
      material: "brick",
      evidenceClaimIds: claimIds.chimney,
    },
  ];
}

function obstacle(id, center, size) {
  return {
    id,
    minX: center[0] - size[0] * 0.5,
    maxX: center[0] + size[0] * 0.5,
    minY: center[1] - size[1] * 0.5,
    maxY: center[1] + size[1] * 0.5,
  };
}

const sharedCameras = {
  canonical: {
    // 对照现代正面稍斜视角。
    position: [-11.5, -19, 8.2],
    target: [0, -0.7, 3.1],
    orthoScale: 14.8,
  },
  side: {
    // 对照靠近画面左侧烟囱的近距离侧向视角。
    position: [-19, -8.5, 7.8],
    target: [-2.1, -0.4, 3.05],
    orthoScale: 14.3,
  },
  entrance: {
    // 对照历史完全正面照片。
    position: [0, -22, 6.6],
    target: [0, -0.8, 3],
    orthoScale: 14.2,
  },
};

const candidates = [
  {
    id: "test-hudec-topology-a-tall-roof-chimneys",
    hypothesis: "横向主楼加两个浅前凸山墙",
    falsifiable:
      "若侧向图证明两个正面山墙后方都是纵深很大的完整翼楼，则本案错误。",
    volumes: [
      volume("rear-main-range", [0, 0.45], [9.2, 4.8], 3.7, "wall", {
        lower: true,
      }),
      volume(
        "front-left-shallow-bay",
        [-2.7, -2.05],
        [3.1, 2.7],
        4.05,
        "wallShade",
        { lower: true },
      ),
      volume(
        "front-right-shallow-bay",
        [2.7, -2.05],
        [3.1, 2.7],
        4.05,
        "wallShade",
        { lower: true },
      ),
      volume(
        "left-glass-lean-to",
        [-5.45, -0.65],
        [2.4, 4.9],
        1.58,
        "glass",
        {
          lower: true,
          lowerHeight: 0.3,
          claims: claimIds.glass,
        },
      ),
      volume(
        "right-low-return",
        [5.15, 0.7],
        [2.15, 3.1],
        2.35,
        "wallShade",
        { lower: true },
      ),
      ...chimneyVolumes(-4.05, -0.68, "left-chimney", {
        roofMounted: true,
      }),
      ...chimneyVolumes(4.05, -0.68, "right-chimney", {
        roofMounted: true,
      }),
    ],
    roofs: [
      gable("rear-main-roof", [0, 0.45], 9.8, 5.4, "X", 3.7, 6.05),
      gable(
        "front-left-shallow-gable",
        [-2.7, -2.05],
        3.25,
        3.55,
        "Y",
        4.05,
        6.4,
        "wallShade",
      ),
      gable(
        "front-right-shallow-gable",
        [2.7, -2.05],
        3.25,
        3.55,
        "Y",
        4.05,
        6.4,
        "wallShade",
      ),
      shed(
        "left-glass-catslide",
        [-5.45, -0.65],
        5.35,
        2.85,
        "Y",
        "positiveX",
        1.62,
        4.45,
      ),
      gable(
        "right-low-return-roof",
        [5.15, 0.7],
        3.45,
        2.5,
        "Y",
        2.35,
        3.75,
        "wallShade",
      ),
    ],
    obstacles: [
      obstacle("rear-main-range", [0, 0.45], [9.2, 4.8]),
      obstacle("front-left-shallow-bay", [-2.7, -2.05], [3.1, 2.7]),
      obstacle("front-right-shallow-bay", [2.7, -2.05], [3.1, 2.7]),
      obstacle("left-glass-lean-to", [-5.45, -0.65], [2.4, 4.9]),
      obstacle("right-low-return", [5.15, 0.7], [2.15, 3.1]),
    ],
    openPaths: [
      {
        id: "front-central-entry",
        from: [0, -5.4],
        to: [0, -2.5],
        width: 0.9,
      },
      {
        id: "left-side-circulation",
        from: [-7.25, -4],
        to: [-7.25, 3.2],
        width: 0.55,
      },
      {
        id: "right-side-circulation",
        from: [6.8, -3.8],
        to: [6.8, 3.2],
        width: 0.55,
      },
    ],
  },
  {
    id: "test-hudec-topology-b",
    hypothesis: "后部横向连接楼加两条深翼，形成 U 形平面",
    falsifiable:
      "若侧向图证明正面山墙只是浅凸窗、中央后方没有明显凹入空间，则本案错误。",
    volumes: [
      volume("rear-link-range", [0, 1.25], [9.4, 3.3], 3.72, "wall", {
        lower: true,
      }),
      volume(
        "left-deep-wing",
        [-2.75, -1.35],
        [3.25, 6.9],
        4.0,
        "wallShade",
        { lower: true },
      ),
      volume(
        "right-deep-wing",
        [2.75, -1.35],
        [3.25, 6.9],
        4.0,
        "wallShade",
        { lower: true },
      ),
      volume(
        "left-wing-glass-return",
        [-5.25, -1.3],
        [2.2, 5.6],
        1.58,
        "glass",
        {
          lower: true,
          lowerHeight: 0.3,
          claims: claimIds.glass,
        },
      ),
      ...chimneyVolumes(-4.15, 1.45, "left-chimney"),
      ...chimneyVolumes(4.15, 1.45, "right-chimney"),
    ],
    roofs: [
      gable("rear-link-roof", [0, 1.25], 9.9, 3.9, "X", 3.72, 5.8),
      gable(
        "left-deep-wing-roof",
        [-2.75, -1.35],
        7.4,
        3.7,
        "Y",
        4.0,
        6.35,
        "wallShade",
      ),
      gable(
        "right-deep-wing-roof",
        [2.75, -1.35],
        7.4,
        3.7,
        "Y",
        4.0,
        6.35,
        "wallShade",
      ),
      shed(
        "left-wing-continuous-catslide",
        [-5.25, -1.3],
        6.1,
        2.65,
        "Y",
        "positiveX",
        1.62,
        4.3,
      ),
    ],
    obstacles: [
      obstacle("rear-link-range", [0, 1.25], [9.4, 3.3]),
      obstacle("left-deep-wing", [-2.75, -1.35], [3.25, 6.9]),
      obstacle("right-deep-wing", [2.75, -1.35], [3.25, 6.9]),
      obstacle("left-wing-glass-return", [-5.25, -1.3], [2.2, 5.6]),
    ],
  },
  {
    id: "test-hudec-topology-c",
    hypothesis: "横向通长主体被两条前后贯通的十字翼穿过，形成 H 形复合屋面",
    falsifiable:
      "若背面没有与正面山墙对应的两段纵向屋脊，两个山墙并未贯穿主体，则本案错误。",
    volumes: [
      volume(
        "continuous-main-range",
        [0, 0.15],
        [9.2, 5.4],
        3.68,
        "wall",
        { lower: true },
      ),
      volume(
        "left-through-cross-wing",
        [-2.75, -0.35],
        [3.2, 8.2],
        4.02,
        "wallShade",
        { lower: true },
      ),
      volume(
        "right-through-cross-wing",
        [2.75, -0.35],
        [3.2, 8.2],
        4.02,
        "wallShade",
        { lower: true },
      ),
      volume(
        "left-full-length-glass-veranda",
        [-5.25, -0.55],
        [2.25, 6.8],
        1.55,
        "glass",
        {
          lower: true,
          lowerHeight: 0.3,
          claims: claimIds.glass,
        },
      ),
      ...chimneyVolumes(-4.12, 1.5, "left-chimney"),
      ...chimneyVolumes(4.12, 1.5, "right-chimney"),
    ],
    roofs: [
      gable(
        "continuous-main-roof",
        [0, 0.15],
        9.8,
        6.0,
        "X",
        3.68,
        6.0,
      ),
      gable(
        "left-through-cross-roof",
        [-2.75, -0.35],
        8.7,
        3.65,
        "Y",
        4.02,
        6.4,
        "wallShade",
      ),
      gable(
        "right-through-cross-roof",
        [2.75, -0.35],
        8.7,
        3.65,
        "Y",
        4.02,
        6.4,
        "wallShade",
      ),
      shed(
        "left-veranda-main-roof-extension",
        [-5.25, -0.55],
        7.25,
        2.7,
        "Y",
        "positiveX",
        1.58,
        4.35,
      ),
    ],
    obstacles: [
      obstacle("continuous-main-range", [0, 0.15], [9.2, 5.4]),
      obstacle("left-through-cross-wing", [-2.75, -0.35], [3.2, 8.2]),
      obstacle("right-through-cross-wing", [2.75, -0.35], [3.2, 8.2]),
      obstacle("left-full-length-glass-veranda", [-5.25, -0.55], [2.25, 6.8]),
    ],
  },
];

for (const candidate of candidates) {
  const dsl = structuredClone(baseDsl);
  dsl.assetId = candidate.id;
  dsl.massing = {
    volumes: candidate.volumes,
    roofs: candidate.roofs,
  };
  dsl.runtime.cameras = sharedCameras;
  dsl.collision = {
    obstacles: candidate.obstacles,
    requiredOpenPaths: candidate.openPaths ?? [],
  };
  dsl.unknowns = [
    ...(baseDsl.unknowns ?? []),
    `临时候选结构假设：${candidate.hypothesis}`,
    `证伪条件：${candidate.falsifiable}`,
  ];

  const outputPath = path.join(outputDir, `${candidate.id}-dsl.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(dsl, null, 2)}\n`);
}

const manifest = candidates.map(({ id, hypothesis, falsifiable }) => ({
  id,
  hypothesis,
  falsifiable,
  views: ["modern-front-oblique", "left-chimney-side", "historic-front"],
}));
fs.writeFileSync(
  path.join(outputDir, "test_hudec-topology-candidates.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(
  JSON.stringify(
    {
      outputDir: path.relative(rootDir, outputDir),
      candidates: manifest,
    },
    null,
    2,
  ),
);
