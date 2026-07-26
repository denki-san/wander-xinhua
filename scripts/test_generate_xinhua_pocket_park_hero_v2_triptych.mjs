/**
 * 生成新华路口袋公园 Hero v2 候选三联对照。
 *
 * 右栏明确使用已验收 Massing 的 Three.js 截图；Hero 尚未接入运行时，
 * 因而不能把该栏误写为 Hero runtime。
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(
  root,
  "test_artifacts/all-models/hero-v2/xinhua-pocket-park",
);
const outputPath = path.join(
  outputDirectory,
  "test_xinhua_pocket_park_hero_v2_triptych.png",
);

const panelWidth = 720;
const panelHeight = 520;
const labelHeight = 48;
const imageHeight = panelHeight - labelHeight;
const panels = [
  {
    source: path.join(
      root,
      "docs/research/assets/requested-poi-references/"
        + "xinhua-pocket-park-canonical.jpg",
    ),
    label: "REFERENCE / RESEARCH ONLY",
  },
  {
    source: path.join(
      outputDirectory,
      "test_xinhua_pocket_park_hero_v2_canonical.png",
    ),
    label: "BLENDER HERO V2 CANDIDATE",
  },
  {
    source: path.join(
      root,
      "test_artifacts/all-models/massing-v2/"
        + "test_xinhua-pocket-park-massing-v2-threejs.png",
    ),
    label: "THREE.JS MASSING / HERO PENDING",
  },
];

function labelSvg(label) {
  const escaped = label.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  return Buffer.from(
    `<svg width="${panelWidth}" height="${labelHeight}" `
      + `xmlns="http://www.w3.org/2000/svg">`
      + `<rect width="100%" height="100%" fill="#172024"/>`
      + `<text x="28" y="32" fill="#f3eee3" font-family="Arial, sans-serif" `
      + `font-size="20" font-weight="700">${escaped}</text>`
      + `</svg>`,
  );
}

await mkdir(outputDirectory, { recursive: true });
const renderedPanels = await Promise.all(
  panels.map(async ({ source, label }) => {
    const image = await sharp(source)
      .rotate()
      .resize(panelWidth, imageHeight, {
        fit: "cover",
        position: "centre",
      })
      .png()
      .toBuffer();
    return sharp({
      create: {
        width: panelWidth,
        height: panelHeight,
        channels: 4,
        background: "#172024",
      },
    })
      .composite([
        { input: labelSvg(label), top: 0, left: 0 },
        { input: image, top: labelHeight, left: 0 },
      ])
      .png()
      .toBuffer();
  }),
);

await sharp({
  create: {
    width: panelWidth * renderedPanels.length,
    height: panelHeight,
    channels: 4,
    background: "#172024",
  },
})
  .composite(
    renderedPanels.map((input, index) => ({
      input,
      top: 0,
      left: panelWidth * index,
    })),
  )
  .png()
  .toFile(outputPath);

console.log(outputPath);
