import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const formalPath = path.join(
  rootDir,
  "building-engine/cases/hudec-memorial/building-dsl.json",
);
const formal = JSON.parse(fs.readFileSync(formalPath, "utf8"));

const facadeClaims = [
  "hudec-memorial-half-timber",
  "hudec-memorial-front-side-orientation",
];
const glassWingClaims = [
  "hudec-memorial-glass-wing",
  "hudec-memorial-front-side-orientation",
  "hudec-memorial-half-timber",
];
const chimneyClaims = ["hudec-memorial-chimney-tower"];

const openings = [
  {
    id: "left-glass-wing-side-window-row",
    type: "window-row",
    anchor: [-6.67, -0.65, 0.3],
    width: 0.5,
    height: 1.12,
    count: 7,
    spacing: 0.72,
    rotationDegrees: 90,
    outsideSign: 1,
    material: "glass",
    trimMaterial: "timber",
    frameMaterial: "timber",
    evidenceClaimIds: glassWingClaims,
  },
  {
    id: "left-glass-wing-front-window-row",
    type: "window-row",
    anchor: [-5.45, -3.12, 0.3],
    width: 0.52,
    height: 1.12,
    count: 3,
    spacing: 0.68,
    rotationDegrees: 0,
    outsideSign: -1,
    material: "glass",
    trimMaterial: "timber",
    frameMaterial: "timber",
    evidenceClaimIds: glassWingClaims,
  },
  {
    id: "front-left-bay-lower-window-row",
    type: "window-row",
    anchor: [-2.7, -3.42, 0.72],
    width: 0.5,
    height: 1.05,
    count: 3,
    spacing: 0.72,
    rotationDegrees: 0,
    outsideSign: -1,
    material: "glass",
    trimMaterial: "timber",
    frameMaterial: "timber",
    evidenceClaimIds: facadeClaims,
  },
  {
    id: "front-left-bay-upper-window-row",
    type: "window-row",
    anchor: [-2.7, -3.43, 2.12],
    width: 0.46,
    height: 0.92,
    count: 3,
    spacing: 0.7,
    rotationDegrees: 0,
    outsideSign: -1,
    material: "glass",
    trimMaterial: "timber",
    frameMaterial: "timber",
    evidenceClaimIds: facadeClaims,
  },
  {
    id: "front-right-bay-lower-window-row",
    type: "window-row",
    anchor: [2.7, -3.42, 0.72],
    width: 0.5,
    height: 1.05,
    count: 3,
    spacing: 0.72,
    rotationDegrees: 0,
    outsideSign: -1,
    material: "glass",
    trimMaterial: "timber",
    frameMaterial: "timber",
    evidenceClaimIds: facadeClaims,
  },
  {
    id: "front-right-bay-upper-window-row",
    type: "window-row",
    anchor: [2.7, -3.43, 2.12],
    width: 0.46,
    height: 0.92,
    count: 3,
    spacing: 0.7,
    rotationDegrees: 0,
    outsideSign: -1,
    material: "glass",
    trimMaterial: "timber",
    frameMaterial: "timber",
    evidenceClaimIds: facadeClaims,
  },
  {
    id: "central-upper-window-row",
    type: "window-row",
    anchor: [0, -1.97, 2.12],
    width: 0.44,
    height: 0.82,
    count: 3,
    spacing: 0.62,
    rotationDegrees: 0,
    outsideSign: -1,
    material: "glass",
    trimMaterial: "timber",
    frameMaterial: "timber",
    evidenceClaimIds: facadeClaims,
  },
  {
    id: "central-left-ground-window",
    type: "rect-window",
    anchor: [-0.75, -1.97, 0.72],
    width: 0.38,
    height: 0.82,
    rotationDegrees: 0,
    outsideSign: -1,
    material: "glass",
    trimMaterial: "timber",
    frameMaterial: "timber",
    evidenceClaimIds: facadeClaims,
  },
  {
    id: "central-right-ground-window",
    type: "rect-window",
    anchor: [0.75, -1.97, 0.72],
    width: 0.38,
    height: 0.82,
    rotationDegrees: 0,
    outsideSign: -1,
    material: "glass",
    trimMaterial: "timber",
    frameMaterial: "timber",
    evidenceClaimIds: facadeClaims,
  },
  {
    id: "central-arched-entry",
    type: "arched-opening",
    anchor: [0, -1.98, 0.12],
    width: 0.78,
    height: 1.62,
    rotationDegrees: 0,
    outsideSign: -1,
    pointed: false,
    open: false,
    material: "shadow",
    trimMaterial: "brick",
    frameMaterial: "timber",
    evidenceClaimIds: [
      "hudec-memorial-entry-gate",
      "hudec-memorial-front-side-orientation",
    ],
  },
  {
    id: "right-low-return-side-window-row",
    type: "window-row",
    anchor: [6.24, 0.7, 0.62],
    width: 0.48,
    height: 0.92,
    count: 2,
    spacing: 1.05,
    rotationDegrees: 90,
    outsideSign: -1,
    material: "glass",
    trimMaterial: "timber",
    frameMaterial: "timber",
    evidenceClaimIds: ["hudec-memorial-main-massing"],
  },
];

const features = [];
const addFeature = (feature) => features.push(feature);

for (const [side, centerX] of [
  ["left", -2.7],
  ["right", 2.7],
]) {
  addFeature({
    id: `front-${side}-timber-gable`,
    type: "timber-gable",
    anchor: [centerX, -3.73, 0],
    span: 3.0,
    eaveHeight: 4.05,
    ridgeHeight: 6.4,
    rotationDegrees: 0,
    material: "timber",
    evidenceClaimIds: [
      ...facadeClaims,
      "hudec-memorial-layered-roofs",
    ],
  });
  for (const [band, z] of [
    ["lower", 1.86],
    ["upper", 3.42],
  ]) {
    addFeature({
      id: `front-${side}-${band}-timber-band`,
      type: "trim-band",
      anchor: [centerX, -3.45, z],
      width: 2.9,
      length: 0.13,
      height: 0.13,
      rotationDegrees: 0,
      material: "timber",
      evidenceClaimIds: facadeClaims,
    });
  }
  for (const [post, offsetX] of [
    ["left", -0.92],
    ["center", 0],
    ["right", 0.92],
  ]) {
    addFeature({
      id: `front-${side}-${post}-timber-post`,
      type: "trim-band",
      anchor: [centerX + offsetX, -3.46, 2.02],
      width: 0.14,
      length: 0.13,
      height: 3.8,
      rotationDegrees: 0,
      material: "timber",
      evidenceClaimIds: facadeClaims,
    });
  }
}

for (const [band, z] of [
  ["lower", 1.9],
  ["upper", 3.28],
]) {
  addFeature({
    id: `central-${band}-timber-band`,
    type: "trim-band",
    anchor: [0, -1.99, z],
    width: 2.15,
    length: 0.12,
    height: 0.12,
    rotationDegrees: 0,
    material: "timber",
    evidenceClaimIds: facadeClaims,
  });
}
for (const [side, x] of [
  ["left", -1.02],
  ["right", 1.02],
]) {
  addFeature({
    id: `central-${side}-timber-post`,
    type: "trim-band",
    anchor: [x, -2, 1.95],
    width: 0.13,
    length: 0.12,
    height: 3.65,
    rotationDegrees: 0,
    material: "timber",
    evidenceClaimIds: facadeClaims,
  });
}

addFeature({
  id: "left-glass-wing-side-eave-band",
  type: "trim-band",
  anchor: [-6.68, -0.65, 1.55],
  width: 4.72,
  length: 0.14,
  height: 0.14,
  rotationDegrees: 90,
  material: "timber",
  evidenceClaimIds: glassWingClaims,
});
addFeature({
  id: "left-glass-wing-side-mid-mullion",
  type: "trim-band",
  anchor: [-6.69, -0.65, 0.84],
  width: 4.7,
  length: 0.08,
  height: 0.08,
  rotationDegrees: 90,
  material: "timber",
  evidenceClaimIds: glassWingClaims,
});
for (const [index, y] of [-2.76, -2.04, -1.32, -0.6, 0.12, 0.84, 1.56].entries()) {
  addFeature({
    id: `left-glass-wing-side-post-${String(index + 1).padStart(2, "0")}`,
    type: "trim-band",
    anchor: [-6.69, y, 0.92],
    width: 0.12,
    length: 0.12,
    height: 1.48,
    rotationDegrees: 0,
    material: "timber",
    evidenceClaimIds: glassWingClaims,
  });
}
addFeature({
  id: "left-glass-wing-front-eave-band",
  type: "trim-band",
  anchor: [-5.45, -3.13, 1.55],
  width: 2.22,
  length: 0.14,
  height: 0.14,
  rotationDegrees: 0,
  material: "timber",
  evidenceClaimIds: glassWingClaims,
});
addFeature({
  id: "left-glass-wing-front-mid-mullion",
  type: "trim-band",
  anchor: [-5.45, -3.14, 0.84],
  width: 2.2,
  length: 0.08,
  height: 0.08,
  rotationDegrees: 0,
  material: "timber",
  evidenceClaimIds: glassWingClaims,
});
for (const [index, x] of [-6.35, -5.75, -5.15, -4.55].entries()) {
  addFeature({
    id: `left-glass-wing-front-post-${String(index + 1).padStart(2, "0")}`,
    type: "trim-band",
    anchor: [x, -3.15, 0.92],
    width: 0.12,
    length: 0.12,
    height: 1.48,
    rotationDegrees: 0,
    material: "timber",
    evidenceClaimIds: glassWingClaims,
  });
}

for (const [side, centerX] of [
  ["left", -4.05],
  ["right", 4.05],
]) {
  addFeature({
    id: `${side}-chimney-white-shoulder-band`,
    type: "trim-band",
    anchor: [centerX, -0.68, 6.18],
    width: 1.18,
    length: 1.14,
    height: 0.14,
    rotationDegrees: 0,
    material: "trim",
    evidenceClaimIds: chimneyClaims,
  });
  addFeature({
    id: `${side}-chimney-brick-crown`,
    type: "trim-band",
    anchor: [centerX, -0.68, 8.08],
    width: 1.08,
    length: 1.04,
    height: 0.14,
    rotationDegrees: 0,
    material: "brick",
    evidenceClaimIds: chimneyClaims,
  });
  for (const [rib, offsetX] of [
    ["a", -0.22],
    ["b", 0.22],
  ]) {
    addFeature({
      id: `${side}-chimney-front-rib-${rib}`,
      type: "trim-band",
      anchor: [centerX + offsetX, -1.1, 7.03],
      width: 0.1,
      length: 0.06,
      height: 1.5,
      rotationDegrees: 0,
      material: "brick",
      evidenceClaimIds: chimneyClaims,
    });
  }
}

formal.master = { openings, features };
fs.writeFileSync(formalPath, `${JSON.stringify(formal, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      formalPath: path.relative(rootDir, formalPath),
      assetId: formal.assetId,
      openingCount: openings.length,
      featureCount: features.length,
      chimneyFeatureCount: features.filter((feature) =>
        feature.id.includes("chimney"),
      ).length,
    },
    null,
    2,
  ),
);
