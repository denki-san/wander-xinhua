import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(resolve(root, path)))
    .digest("hex");
}

const [scope, registry, manifest, buildRecord, mapQa, runtimeQa, gates] =
  await Promise.all([
    readJson("docs/research/active-asset-scope-31.json"),
    readJson("docs/research/all-models-production-registry.json"),
    readJson("docs/research/shangsheng-huashan-massing-manifest.json"),
    readJson(
      "docs/research/build-records/tiers/shangsheng-huashan/massing/"
        + "osm-way-864847877-massing.json",
    ),
    readJson("docs/research/sun-ke-villa-massing-map-qa-v2.json"),
    readJson("docs/research/sun-ke-villa-three-tier-runtime-qa.json"),
    readJson("docs/research/sun-ke-villa-blender-mcp-gates.json"),
  ]);

const manifestAsset = manifest.assets.find(
  ({ sourceWayId }) => sourceWayId === 864847877,
);
const scopeAsset = scope.assets.find(({ id }) => id === "sun-ke-villa");
const registryAsset = registry.buildingCollections.shangsheng.find(
  ({ id }) => id === "building:shangsheng:osm-way-864847877",
);

assert.ok(manifestAsset, "Massing manifest 缺少孙科别墅");
assert.ok(scopeAsset, "active-31 scope 缺少孙科别墅");
assert.ok(registryAsset, "生产 registry 缺少孙科别墅");
assert.equal(manifestAsset.status, "formal-pass-mcp-and-map-calibrated");
assert.equal(manifestAsset.identityAllowed, true);
assert.equal(
  await sha256(manifestAsset.outputs.glb),
  manifestAsset.glb.sha256,
);
assert.equal(buildRecord.glb.sha256, manifestAsset.glb.sha256);
assert.equal(mapQa.acceptance.final, "pass");
assert.equal(runtimeQa.acceptance.final, "pass");
assert.equal(gates.massingGate.status, "pass");
assert.equal(gates.heroGate.status, "pass");
assert.equal(gates.tierComparisonGate.status, "pass");
assert.equal(gates.threeJsRuntimeGate.status, "pass");
assert.equal(
  scopeAsset.massing.state,
  "formal-pass-mcp-and-map-calibrated",
);
assert.equal(
  scopeAsset.identity.state,
  "formal-pass-derived-from-reviewed-hero",
);
assert.equal(
  registryAsset.massing,
  "formal-pass-mcp-and-map-calibrated",
);
assert.equal(
  registryAsset.identity,
  "formal-pass-derived-from-reviewed-hero",
);
assert.equal(manifest.activeAssetUpdate.holdAssetsRegenerated, false);

for (const screenshot of Object.values(mapQa.screenshots)) {
  assert.equal(await sha256(screenshot.path), screenshot.sha256);
}
for (const tier of ["hero", "identity", "massing"]) {
  const screenshot = runtimeQa.coldTierRuns[tier].screenshot;
  assert.equal(await sha256(screenshot.path), screenshot.sha256);
}

console.log(JSON.stringify({
  status: "pass",
  mode: "validation-only",
  assetId: "sun-ke-villa",
  glbSha256: manifestAsset.glb.sha256,
  mapGate: mapQa.acceptance.final,
  threeTierRuntimeGate: runtimeQa.acceptance.final,
  blenderMcpGates: "pass",
  holdAssetsRegenerated: manifest.activeAssetUpdate.holdAssetsRegenerated,
  nextGate: runtimeQa.nextGate,
}, null, 2));
