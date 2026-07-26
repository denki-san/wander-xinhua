/**
 * 生成新华路口袋公园 Identity v1 派生三联图。
 *
 * 三栏只证明研究参考、冻结 Hero 和 Headless Identity 候选之间的身份保持。
 * 本图不是 MCP3，也不是 Three.js Identity runtime 验收。
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const identityDirectory = path.join(
  root,
  "test_artifacts/all-models/identity-v1/xinhua-pocket-park",
);
const outputPath = path.join(
  identityDirectory,
  "test_xinhua_pocket_park_identity_v1_triptych.png",
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
      root,
      "test_artifacts/all-models/hero-v2/xinhua-pocket-park/"
        + "test_xinhua_pocket_park_hero_v2_canonical.png",
    ),
    label: "FROZEN HERO V2 / MCP2 PASS",
  },
  {
    source: path.join(
      identityDirectory,
      "test_xinhua_pocket_park_identity_v1_canonical.png",
    ),
    label: "IDENTITY V1 / MCP3 + RUNTIME PENDING",
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

await mkdir(identityDirectory, { recursive: true });
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
