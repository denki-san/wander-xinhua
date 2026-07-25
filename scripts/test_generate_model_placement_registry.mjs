import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildPlaneTreePlacements,
} from "../app/scene/xinhua-road-placement.mjs";
import {
  buildXinhuaStreetDressingPlacements,
  buildXinhuaStreetDressingConstraints,
} from "../app/scene/street-dressing-placement.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputPath = resolve(
  root,
  "docs/research/model-placement-registry-20260725.json",
);
const landmarkData = JSON.parse(readFileSync(
  resolve(root, "app/scene/xinhua-landmarks-data.json"),
  "utf8",
));
const roadData = JSON.parse(readFileSync(
  resolve(root, "app/scene/xinhua-road-landmarks-data.json"),
  "utf8",
));
const xingfuliLayout = JSON.parse(readFileSync(
  resolve(root, "app/scene/xingfuli-layout.json"),
  "utf8",
));

function pointInsidePolygon(x, z, polygon) {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const [currentX, currentZ] = polygon[current];
    const [previousX, previousZ] = polygon[previous];
    const crosses = ((currentZ > z) !== (previousZ > z))
      && (x < ((previousX - currentX) * (z - currentZ)) / (previousZ - currentZ) + currentX);
    if (crosses) inside = !inside;
  }
  return inside;
}

function distanceToSegment(x, z, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((x - start[0]) * dx + (z - start[1]) * dz) / lengthSquared));
  return Math.hypot(x - (start[0] + dx * t), z - (start[1] + dz * t));
}

function localInstance(id, prototype, position, extra = {}) {
  return {
    id,
    prototype,
    coordinateSpace: "collection-local",
    position,
    ...extra,
  };
}

function worldInstance(id, prototype, position, extra = {}) {
  return {
    id,
    prototype,
    coordinateSpace: "authored-world",
    position,
    ...extra,
  };
}

function buildShangshengTrees() {
  const site = landmarkData.shangshengXinsuo;
  const facilityClearances = [
    { x: 7, z: 7, radius: 5.2 },
    { x: 43, z: -3, radius: 4.2 },
    { x: -15, z: 30, radius: 6.2 },
    { x: 54, z: -11, radius: 1.4 },
    { x: 18, z: 9, radius: 1.4 },
  ];
  return Array.from({ length: 90 }, (_, index) => ({
    x: -38 + ((index * 31) % 1030) / 10,
    z: -69 + ((index * 47) % 1360) / 10,
    index,
  })).filter(({ x, z }) => (
    pointInsidePolygon(x, z, site.boundary)
    && !site.buildings.some((building) => building.collision.some((box) => (
      x > box.minX - 1.4 && x < box.maxX + 1.4 && z > box.minZ - 1.4 && z < box.maxZ + 1.4
    )))
    && !(x > -5 && x < 14 && z > 1 && z < 10)
    && !facilityClearances.some((facility) => (
      Math.hypot(x - facility.x, z - facility.z) < facility.radius
    ))
  )).slice(0, 44).map(({ x, z, index }, instance) => localInstance(
    `vegetation-instance:shangsheng:campus-tree-${String(instance).padStart(3, "0")}`,
    "prototype:vegetation:shangsheng-campus-tree",
    [x, 0, z],
    {
      sourceIndex: index,
      variant: index % 3,
      heightSceneUnits: 7.2 + (index % 6) * 0.52,
      evidence: "deterministic-runtime-placement-species-unknown",
    },
  ));
}

function buildHuashanVegetation() {
  const park = landmarkData.huashanGreenland;
  const pond = { x: -7.8, z: 39.2, radiusX: 9.4, radiusZ: 4.5 };
  const nearPath = (x, z) => park.paths.some((path) => path.points.slice(1).some(
    (end, index) => distanceToSegment(x, z, path.points[index], end) < 1.65,
  ));
  const trees = Array.from({ length: 320 }, (_, index) => ({
    x: -39 + ((index * 37) % 790) / 10,
    z: -55 + ((index * 53) % 1180) / 10,
    index,
  })).filter(({ x, z }) => (
    pointInsidePolygon(x, z, park.boundary)
    && !nearPath(x, z)
    && Math.hypot((x - pond.x) / 1.4, z - pond.z) > 8
    && !(x > 8 && x < 22 && z > 31 && z < 48)
    && !(x > 20 && z > -3 && z < 22)
  )).slice(0, 112);
  const understory = trees.slice(0, 84).map(({ x, z, index }) => ({
    x: x + (index % 3 - 1) * 1.05,
    z: z + (index % 5 - 2) * 0.48,
    index,
  })).filter(({ x, z }) => pointInsidePolygon(x, z, park.boundary) && !nearPath(x, z));

  return {
    trees: trees.map(({ x, z, index }, instance) => localInstance(
      `vegetation-instance:huashan:canopy-tree-${String(instance).padStart(3, "0")}`,
      "prototype:vegetation:huashan-canopy-tree",
      [x, 0, z],
      {
        sourceIndex: index,
        variant: index % 3,
        heightSceneUnits: 7.8 + (index % 7) * 0.58,
        evidence: "deterministic-runtime-placement-species-unknown",
      },
    )),
    understory: understory.map(({ x, z, index }, instance) => localInstance(
      `vegetation-instance:huashan:understory-${String(instance).padStart(3, "0")}`,
      "prototype:vegetation:huashan-understory",
      [x, 0, z],
      {
        sourceIndex: index,
        variant: index % 3,
        evidence: "deterministic-runtime-placement-species-unknown",
      },
    )),
  };
}

function polygonCenter(boundary) {
  const bounds = boundary.reduce((result, [x, z]) => ({
    minX: Math.min(result.minX, x),
    maxX: Math.max(result.maxX, x),
    minZ: Math.min(result.minZ, z),
    maxZ: Math.max(result.maxZ, z),
  }), {
    minX: Infinity,
    maxX: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  });
  return [
    (bounds.minX + bounds.maxX) / 2,
    0.18,
    (bounds.minZ + bounds.maxZ) / 2,
  ];
}

const roadConstraints = buildXinhuaStreetDressingConstraints();
const roadFootprints = roadConstraints.obstacles;
const roadTrees = buildPlaneTreePlacements(roadData.landmarks, roadFootprints);
const roadFurniture = buildXinhuaStreetDressingPlacements(false, roadConstraints);
const shangshengTrees = buildShangshengTrees();
const huashanVegetation = buildHuashanVegetation();

const xingfuliTrees = [
  { id: "panyu-entrance-plane-tree", variant: 0, position: [40.1, 0.25, -3.15], yaw: 1.08, scale: [0.66, 0.7, 0.68] },
  { id: "pool-plane-tree", variant: 1, position: [22.1, 0.48, -3.95], yaw: 0.42, scale: [0.82, 0.86, 0.88] },
  { id: "lane-plane-tree", variant: 2, position: [-5, 0.25, -2.6], yaw: 2.18, scale: [0.72, 0.76, 0.8] },
].map((tree) => localInstance(
  `vegetation-instance:xingfuli:${tree.id}`,
  "prototype:vegetation:xinhua-plane-tree",
  tree.position,
  {
    variant: tree.variant,
    yaw: tree.yaw,
    scale: tree.scale,
    evidence: "docs/research/xingfuli-reference-manifest.json",
  },
));

const xingfuliFurniture = [
  ...[
    ["west-north", [-35, 0.26, -2.1], 0],
    ["west-south", [-20, 0.26, -11.7], Math.PI],
    ["center-north", [-6.5, 0.26, -2.1], 0],
    ["center-south", [2.5, 0.26, -11.7], Math.PI],
    ["east-south", [30, 0.26, -11.7], Math.PI],
    ["east-north", [39, 0.26, -2.1], 0],
  ].map(([id, position, yaw]) => localInstance(
    `facility-instance:xingfuli:street-lamp-${id}`,
    "prototype:street-furniture:lane-lamp-short-arm",
    position,
    { yaw, evidence: "docs/research/xingfuli-reference-manifest.json" },
  )),
  ...[
    ["west", [-27.5, 0.25, -2.7], 0],
    ["east", [29, 0.25, -10.9], Math.PI],
  ].map(([id, position, yaw]) => localInstance(
    `facility-instance:xingfuli:bench-${id}`,
    "prototype:street-furniture:slatted-bench",
    position,
    { yaw, evidence: "docs/research/xingfuli-reference-manifest.json" },
  )),
  ...[
    ["west", [-18.5, 0.29, -8.4], 0.1],
    ["east", [34, 0.29, -8.6], -0.08],
  ].map(([id, position, yaw]) => localInstance(
    `facility-instance:xingfuli:umbrella-${id}`,
    "prototype:street-furniture:cantilever-umbrella",
    position,
    { yaw, evidence: "docs/research/xingfuli-reference-manifest.json" },
  )),
  ...[
    ["west", [-18.5, 0.29, -8.4], 0.1, "dark-wood-metal"],
    ["east", [34, 0.29, -8.6], -0.08, "white-molded"],
    ["center", [-6.8, 0.29, -10.7], 0.12, "colorful-folding"],
  ].map(([id, position, yaw, variant]) => localInstance(
    `facility-instance:xingfuli:dining-${id}`,
    "prototype:street-furniture:outdoor-table-set",
    position,
    { yaw, variant, evidence: "docs/research/xingfuli-reference-manifest.json" },
  )),
  ...[
    ["west-square", [-40, 0.28, -3], 0.9, "square"],
    ["center-tall", [-11.2, 0.28, -11.4], 0.8, "tall"],
    ["east-long", [28.8, 0.28, -2.4], 0.78, "long"],
    ["east-square", [40.3, 0.28, -10.7], 0.9, "square"],
  ].map(([id, position, scale, variant]) => localInstance(
    `facility-instance:xingfuli:planter-${id}`,
    "prototype:street-furniture:rectangular-planter",
    position,
    { scale, variant, evidence: "docs/research/xingfuli-reference-manifest.json" },
  )),
  ...[-11.8, -9, -6.2, -3.4, -0.6].map((z, index) => localInstance(
    `facility-instance:xingfuli:east-entry-bollard-${index}`,
    "prototype:street-furniture:irregular-stone-bollard",
    [44.6, 0.3, z],
    {
      yaw: index * 0.37,
      scale: [
        0.34 + (index % 2) * 0.045,
        0.26 + (index % 3) * 0.035,
        0.32 + ((index + 1) % 2) * 0.04,
      ],
      evidence: "docs/research/xingfuli-reference-manifest.json",
    },
  )),
];

const shangsheng = landmarkData.shangshengXinsuo;
const huashan = landmarkData.huashanGreenland;
const facilities = [
  localInstance("facility-instance:shangsheng:cafe-pavilion", "prototype:facility:shangsheng-cafe-pavilion", [7, 0.2, 7]),
  localInstance("facility-instance:shangsheng:bicycle-parking", "prototype:facility:shangsheng-bicycle-parking", [43, 0.18, -3]),
  localInstance("facility-instance:shangsheng:reading-terrace", "prototype:facility:shangsheng-reading-terrace", [-15, 0.18, 30]),
  localInstance("facility-instance:shangsheng:wayfinding-0", "prototype:facility:shangsheng-wayfinding-totem", [54, 0.18, -11], { yaw: -0.18 }),
  localInstance("facility-instance:shangsheng:wayfinding-1", "prototype:facility:shangsheng-wayfinding-totem", [18, 0.18, 9], { yaw: 0.7 }),
  ...shangsheng.fountains.map((fountain) => localInstance(
    `facility-instance:shangsheng:fountain-osm-${fountain.id}`,
    "prototype:facility:shangsheng-fountain",
    polygonCenter(fountain.boundary),
    { osmWayId: fountain.id },
  )),
  localInstance("facility-instance:shangsheng:main-entry", "prototype:facility:shangsheng-main-entry", [58, 0.18, -14]),
  localInstance("facility-instance:huashan:pond-boardwalk", "prototype:facility:huashan-pond-boardwalk", [-7.8, 0.18, 39.2]),
  localInstance(
    "facility-instance:huashan:basketball-court",
    "prototype:facility:huashan-basketball-court",
    [huashan.basketballCourt.position[0], 0.18, huashan.basketballCourt.position[1]],
    { yaw: huashan.basketballCourt.rotationY, osmWayId: huashan.basketballCourt.osmWayId },
  ),
  localInstance("facility-instance:huashan:bird-pergola", "prototype:facility:huashan-bird-pergola", [-25, 0.22, 17.5]),
  localInstance("facility-instance:huashan:happiness-corner", "prototype:facility:huashan-happiness-corner", [25, 0.16, 10]),
  localInstance("facility-instance:xingfuli:reflecting-pool", "prototype:facility:xingfuli-reflecting-pool-hardscape", [16.5, 0, -3.95]),
  localInstance("facility-instance:xingfuli:mixed-paving", "prototype:facility:xingfuli-mixed-paving", [0, 0, 0]),
  localInstance("facility-instance:xingfuli:vertical-garden", "prototype:facility:xingfuli-vertical-garden", [42.45, 0.2, -17.2]),
  localInstance(
    "facility-instance:xingfuli:one-square-metre-action",
    "prototype:facility:one-square-metre-action",
    [-48, 0.34, xingfuliLayout.localLaneCenterZ ?? -7],
    { placementTransform: "xingfuli-local-to-world" },
  ),
].map((facility) => ({
  ...facility,
  evidence: facility.evidence ?? "runtime-authored-placement-needs-photo-validation",
}));

const snapshot = {
  version: 1,
  auditedAt: "2026-07-25",
  status: "placement-inventory-not-map-acceptance",
  coordinateContract: {
    authoredMetersPerSceneUnit: 2.7,
    worldAxis: "X east, Z south",
    collectionLocalCoordinatesRequireParentTransform: true,
  },
  sourceFiles: [
    "app/scene/xinhua-road-placement.mjs",
    "app/scene/street-dressing-placement.mjs",
    "app/scene/xinhua-road-landmarks-data.json",
    "app/scene/xinhua-landmarks-data.json",
    "app/scene/shangsheng-xinsuo-block.tsx",
    "app/scene/huashan-green-block.tsx",
    "app/scene/xingfuli-block.tsx",
    "app/scene/xingfuli-layout.json",
    "app/scene/xinhua-world.tsx",
  ],
  collectionTransforms: {
    shangsheng: {
      worldPosition: shangsheng.position,
      rotationY: 0,
      scale: [1, 1, 1],
    },
    huashan: {
      worldPosition: huashan.position,
      rotationY: 0,
      scale: [1, 1, 1],
    },
    xingfuli: {
      status: "read-from-app/scene/xinhua-map-data.json-at-runtime",
      note: "非均匀水平与纵向缩放必须在地图校验阶段单独核验。",
    },
  },
  vegetation: {
    xinhuaRoadPlaneTrees: roadTrees.map((tree) => worldInstance(
      `vegetation-instance:xinhua-road:${tree.id}`,
      "prototype:vegetation:xinhua-plane-tree",
      [tree.position[0], 0, tree.position[1]],
      {
        variant: tree.variant,
        yaw: tree.yaw,
        scale: tree.scale,
        evidence: "deterministic-xinhua-road-placement",
      },
    )),
    xingfuliPlaneTrees: xingfuliTrees,
    shangshengCampusTrees: shangshengTrees,
    huashanCanopyTrees: huashanVegetation.trees,
    huashanUnderstory: huashanVegetation.understory,
    xinhuaRoadShrubs: roadFurniture.shrubs.map((placement) => worldInstance(
      `vegetation-instance:xinhua-road:${placement.id}`,
      "prototype:vegetation:road-edge-shrub",
      [placement.position[0], 0, placement.position[1]],
      {
        yaw: placement.yaw,
        scale: placement.scale,
        variant: placement.variant,
        evidence: "deterministic-curb-furnishing-zone",
      },
    )),
  },
  streetFurniture: {
    xinhuaRoad: [
      ...roadFurniture.lamps.map((placement) => worldInstance(
        `facility-instance:xinhua-road:${placement.id}`,
        "prototype:street-furniture:lane-lamp-short-arm",
        [placement.position[0], 0, placement.position[1]],
        { yaw: placement.yaw, evidence: "deterministic-curb-furnishing-zone" },
      )),
      ...roadFurniture.planters.map((placement) => worldInstance(
        `facility-instance:xinhua-road:${placement.id}`,
        "prototype:street-furniture:rectangular-planter",
        [placement.position[0], 0, placement.position[1]],
        {
          yaw: placement.yaw,
          scale: placement.scale,
          variant: placement.variant,
          evidence: "deterministic-curb-furnishing-zone",
        },
      )),
      ...roadFurniture.bins.map((placement) => worldInstance(
        `facility-instance:xinhua-road:${placement.id}`,
        "prototype:street-furniture:shanghai-dual-classification-bin",
        [placement.position[0], 0, placement.position[1]],
        {
          yaw: placement.yaw,
          variant: placement.variant,
          evidence: "deterministic-curb-furnishing-zone",
        },
      )),
    ],
    xingfuli: xingfuliFurniture,
  },
  facilities,
  validationBoundary: {
    observed: "代码中的确定性实例、局部位置和变换来源",
    inferred: "树木/灌木种类与部分装饰物实际款式",
    unknown: "多数实例的现场测绘位置、朝向和具体物种",
    mapAcceptanceRequired: true,
  },
};

assert.equal(snapshot.vegetation.xinhuaRoadPlaneTrees.length, 28);
assert.equal(snapshot.vegetation.xingfuliPlaneTrees.length, 3);
// 源码虽然以 slice(0, 44) 设上限，但当前边界、建筑和设施净空过滤后实际只有 29 棵。
assert.equal(snapshot.vegetation.shangshengCampusTrees.length, 29);
assert.equal(snapshot.vegetation.huashanCanopyTrees.length, 112);
assert.ok(snapshot.vegetation.huashanUnderstory.length <= 84);
assert.equal(snapshot.vegetation.xinhuaRoadShrubs.length, 12);
assert.equal(roadFurniture.lamps.length, 11);
assert.equal(roadFurniture.planters.length, 4);
assert.equal(roadFurniture.bins.length, 4);
assert.equal(snapshot.streetFurniture.xingfuli.length, 22);
assert.equal(snapshot.facilities.length, 16);

const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
if (process.argv.includes("--check")) {
  assert.equal(readFileSync(outputPath, "utf8"), serialized);
} else {
  writeFileSync(outputPath, serialized);
  console.log(`已生成 ${outputPath}`);
}
