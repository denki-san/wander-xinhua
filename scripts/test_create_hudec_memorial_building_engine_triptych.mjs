import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(
  root,
  "test_artifacts/building-engine-spike/hudec-memorial",
);
const output = path.join(
  outputDir,
  "test_hudec-memorial-final-triptych.png",
);
const panelWidth = 560;
const panelHeight = 420;
const labelHeight = 58;
const panels = [
  {
    label: "Reference · user front oblique",
    input: path.join(
      root,
      "docs/research/assets/requested-poi-references/"
        + "hudec-memorial-user-modern-front-oblique-20260729.png",
    ),
  },
  {
    label: "Blender · selected A Master",
    input: path.join(
      outputDir,
      "test_hudec-memorial-master-canonical.png",
    ),
  },
  {
    label: "Three.js · production Sandbox",
    input: path.join(
      outputDir,
      "test_hudec-memorial-master-sandbox-canonical.png",
    ),
  },
];

await mkdir(outputDir, { recursive: true });
const composites = [];
for (const [index, panel] of panels.entries()) {
  const image = await sharp(panel.input)
    .resize(panelWidth, panelHeight, {
      fit: "contain",
      background: "#d8d2c7",
    })
    .png()
    .toBuffer();
  const label = Buffer.from(`
    <svg width="${panelWidth}" height="${labelHeight}">
      <rect width="100%" height="100%" fill="#171b1f"/>
      <text x="50%" y="36" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="19"
        font-weight="700" fill="#f4eee4">${panel.label}</text>
    </svg>
  `);
  composites.push(
    { input: label, left: index * panelWidth, top: 0 },
    { input: image, left: index * panelWidth, top: labelHeight },
  );
}

await sharp({
  create: {
    width: panelWidth * panels.length,
    height: panelHeight + labelHeight,
    channels: 4,
    background: "#171b1f",
  },
})
  .composite(composites)
  .png()
  .toFile(output);

console.log(output);
