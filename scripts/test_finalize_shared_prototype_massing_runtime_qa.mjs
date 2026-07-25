import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const manifestUrl = new URL(
  "docs/research/shared-prototypes-massing-manifest.json",
  root,
);
const qaPath = "docs/research/shared-prototypes-massing-runtime-qa.json";
const qa = JSON.parse(await readFile(new URL(qaPath, root), "utf8"));
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
const independentStatus = qa.independentReview.status;
const identityAllowedAssetIds = new Set(
  qa.independentReview.identityAllowedAssetIds ?? [],
);
const runtimeGate = independentStatus === "pass"
  ? "formal-massing-pass"
  : "gallery-runtime-pass-independent-review-pending";

if (independentStatus !== "pass" && identityAllowedAssetIds.size > 0) {
  throw new Error("独立审查未通过时不得放行共享原型 Identity");
}

manifest.status = runtimeGate;
manifest.runtimeGate = runtimeGate;
manifest.runtimeQa = qaPath;
manifest.identityPolicy = qa.formalGate.identityPolicy;
manifest.identityAllowed = false;
manifest.identityAllowedAssetCount = identityAllowedAssetIds.size;
manifest.identityBlockedAssetCount = (
  qa.independentReview.identityBlockedSpeciesUnknownAssetIds ?? []
).length;

for (const asset of manifest.assets) {
  const identityAllowed = identityAllowedAssetIds.has(asset.assetId);
  asset.status = runtimeGate;
  asset.runtimeGate = runtimeGate;
  asset.identityAllowed = identityAllowed;
  asset.runtimeQa = qaPath;
  const recordPath = (
    `docs/research/build-records/tiers/shared-prototypes/massing/`
    + `${asset.slug}-massing.json`
  );
  const recordUrl = new URL(recordPath, root);
  const record = JSON.parse(await readFile(recordUrl, "utf8"));
  record.status = runtimeGate;
  record.runtimeGate = runtimeGate;
  record.identityAllowed = identityAllowed;
  record.runtimeQa = {
    file: qaPath,
    screenshots: qa.visualReview.threejsScreenshots,
    galleryLoadAndRender: "pass",
    independentReview: independentStatus,
  };
  await writeFile(recordUrl, `${JSON.stringify(record, null, 2)}\n`);
}

await writeFile(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`);
