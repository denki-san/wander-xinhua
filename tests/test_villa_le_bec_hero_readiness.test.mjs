import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readinessPath = "docs/research/villa-le-bec-hero-readiness.json";

async function json(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(new URL(relativePath, root)))
    .digest("hex");
}

test("Villa Le Bec Hero 动工输入、证据视角与已接受 Massing SHA 均冻结", async () => {
  const [readiness, manifest, record] = await Promise.all([
    json(readinessPath),
    json("docs/research/villa-le-bec-reference-manifest.json"),
    json("docs/research/build-records/tiers/xinhua-road/massing-v2/villa-le-bec-massing.json"),
  ]);
  const { frozenInputs, viewCoverage } = readiness;

  assert.equal(await sha256(frozenInputs.referenceManifest.path), frozenInputs.referenceManifest.sha256);
  assert.equal(await sha256(frozenInputs.modelBrief.path), frozenInputs.modelBrief.sha256);
  assert.equal(await sha256(frozenInputs.acceptedMassing.path), frozenInputs.acceptedMassing.sha256);
  assert.equal(await sha256(frozenInputs.acceptedMassing.buildRecord), frozenInputs.acceptedMassing.buildRecordSha256);
  assert.equal(record.glb.sha256, frozenInputs.acceptedMassing.sha256);
  assert.equal(frozenInputs.acceptedMassing.mcp1, "pass-current-sha-visual-and-structure");
  assert.equal(manifest.canonicalComparison.localPath, viewCoverage.canonical.path);
  assert.equal(await sha256(viewCoverage.canonical.path), viewCoverage.canonical.sha256);
  assert.equal(viewCoverage.canonical.status, "pass");
  assert.equal(viewCoverage.sideDepth.status, "pass-for-visible-side-depth-only");
  assert.equal(viewCoverage.entranceIdentity.status, "pass-no-commercial-brand-geometry");
  assert.equal(viewCoverage.sharedPassage.status, "pass-open-courtyard");
});

test("Villa Le Bec Hero 范围严格为两栋纯建筑，Identity 仍不获授权", async () => {
  const readiness = await json(readinessPath);
  const { scope, heroContract, decision } = readiness;

  assert.equal(readiness.status, "pass-start-pure-two-building-hero-only");
  assert.deepEqual(readiness.frozenInputs.mapContract.sourceWays, [864493176, 864493175]);
  assert.equal(scope.scopeExpansionAuthorized, false);
  assert.ok(scope.heldOrExcluded.includes("low-annex-with-unknown-osm-membership"));
  assert.ok(scope.heldOrExcluded.includes("signage-and-brand-text"));
  assert.ok(scope.heldOrExcluded.includes("vegetation-and-garden-dressing"));
  assert.ok(heroContract.threeIdentifyingCues.length >= 3);
  assert.equal(heroContract.collisionAndSharedSpace.solidBuildings.length, 2);
  assert.match(heroContract.collisionAndSharedSpace.forbidden, /courtyard/u);
  assert.equal(decision.heroStartAuthorized, true);
  assert.equal(decision.identityStartAuthorized, false);
  assert.ok(decision.minimumNextAction.includes("mcp2"));
});
