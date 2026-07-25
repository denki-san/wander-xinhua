import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const qaPath = "docs/research/xinhua-road-clean-massing-runtime-qa.json";
const manifestPath = "docs/research/xinhua-road-clean-massing-manifest.json";
const [qa, manifest] = await Promise.all([
  readFile(new URL(qaPath, root), "utf8").then(JSON.parse),
  readFile(new URL(manifestPath, root), "utf8").then(JSON.parse),
]);
const qaById = new Map(qa.assets.map((asset) => [asset.id, asset]));

if (
  qa.independentReview.formalMassingPassCount !== 0
  || qa.independentReview.identityAllowedCount !== 0
  || qa.formalGate.mapAcceptance !== "blocked"
) {
  throw new Error("地图成员与证据门未闭合时不得放行道路 v2 正式 Massing 或 Identity");
}

manifest.status = qa.status;
manifest.runtimeGate = "pass";
manifest.runtimeQa = qaPath;
manifest.mapAcceptance = "blocked";
manifest.identityAllowed = false;

for (const asset of manifest.assets) {
  const slug = asset.assetId.split(":").at(-1);
  const assetQa = qaById.get(slug);
  if (!assetQa) throw new Error(`缺少 ${slug} 的运行时 QA`);
  asset.status = qa.status;
  asset.runtimeGate = "pass";
  asset.runtimeGeometryVisual = assetQa.runtimeGeometryVisual;
  asset.runtimeQa = qaPath;
  asset.mapAcceptance = "blocked";
  asset.identityAllowed = false;

  const recordPath = (
    `docs/research/build-records/tiers/xinhua-road/massing-v2/`
    + `${slug}-massing.json`
  );
  const recordUrl = new URL(recordPath, root);
  const record = JSON.parse(await readFile(recordUrl, "utf8"));
  record.status = qa.status;
  record.runtimeGate = "pass";
  record.runtimeGeometryVisual = assetQa.runtimeGeometryVisual;
  record.runtimeQa = {
    file: qaPath,
    contextScreenshot: assetQa.contextScreenshot,
    isolatedScreenshot: assetQa.isolatedScreenshot,
  };
  record.mapAcceptance = "blocked";
  record.identityAllowed = false;
  await writeFile(recordUrl, `${JSON.stringify(record, null, 2)}\n`);
}

await writeFile(
  new URL(manifestPath, root),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
