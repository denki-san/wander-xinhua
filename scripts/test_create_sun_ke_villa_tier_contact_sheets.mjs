import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputDir = path.join(
  root,
  "test_artifacts/all-models/tier-review/sun-ke-villa",
);
const tiers = ["hero", "identity", "massing"];
const labels = ["Hero", "Identity", "Massing"];
const views = ["canonical", "side-depth", "north-entrance"];
const rebuild = process.argv.includes("--rebuild");
const panelWidth = 540;
const panelHeight = 380;
const labelHeight = 44;

await mkdir(outputDir, { recursive: true });

for (const view of views) {
  const composites = [];
  for (const [index, tier] of tiers.entries()) {
    const input = rebuild && tier === "hero"
      ? path.join(
        root,
        "test_artifacts/all-models/hero/sun-ke-villa",
        `test_sun-ke-villa-hero-mcp-${view}-rebuild-6d1642315530.png`,
      )
      : rebuild && tier === "identity"
        ? path.join(
          root,
          "test_artifacts/all-models/identity/sun-ke-villa",
          `test_sun-ke-villa-identity-mcp-${view}-rebuild-6b541e8ffab4.png`,
        )
        : path.join(
          outputDir,
          `test_sun-ke-villa-${tier}-mcp-${view}.png`,
        );
    const image = await sharp(input)
      .resize(panelWidth, panelHeight, { fit: "fill" })
      .png()
      .toBuffer();
    const label = Buffer.from(`
      <svg width="${panelWidth}" height="${labelHeight}">
        <rect width="100%" height="100%" fill="#171b1f"/>
        <text x="50%" y="29" text-anchor="middle"
          font-family="Arial, sans-serif" font-size="22"
          font-weight="700" fill="#f4eee4">${labels[index]}</text>
      </svg>
    `);
    composites.push(
      { input: label, left: index * panelWidth, top: 0 },
      { input: image, left: index * panelWidth, top: labelHeight },
    );
  }

  await sharp({
    create: {
      width: panelWidth * tiers.length,
      height: panelHeight + labelHeight,
      channels: 4,
      background: "#171b1f",
    },
  })
    .composite(composites)
    .png()
    .toFile(path.join(
      outputDir,
      rebuild
        ? `test_sun-ke-villa-tier-mcp-${view}-rebuild-contact-sheet.png`
        : `test_sun-ke-villa-tier-mcp-${view}-contact-sheet.png`,
    ));
}
