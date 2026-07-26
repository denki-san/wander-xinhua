import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(
  root,
  "test_artifacts/all-models/hero-v2/hudec-memorial",
);
const output = path.join(
  outputDir,
  "test_hudec-memorial-v2-hero_reference_blender_threejs_triptych.png",
);
const panelWidth = 560;
const panelHeight = 420;
const labelHeight = 58;

const panels = [
  {
    label: "Reference · official west/rear view",
    input: path.join(
      root,
      "docs/research/assets/requested-poi-references/"
        + "hudec-memorial-street-official-2026.jpg",
    ),
  },
  {
    label: "Blender · V2 Hero candidate",
    input: path.join(
      root,
      "test_artifacts/test_hudec-memorial-v2-hero_canonical_preview.png",
    ),
  },
  {
    label: "Three.js · accepted Massing map context",
    input: path.join(
      root,
      "test_artifacts/test_hudec-memorial_massing_runtime_map_candidate_1280x720.jpg",
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
        font-family="Arial, sans-serif" font-size="20"
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
