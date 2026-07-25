import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(path.join(root, relativePath)))
    .digest("hex");
}

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8").trim());
}

test("Villa Le Bec v3 只保留照片支持的两栋建筑并排除三个未知 footprint", async () => {
  const gate = await readJson("docs/research/villa-le-bec-massing-map-gate.json");
  const record = await readJson(
    "docs/research/build-records/tiers/xinhua-road/massing-v2/villa-le-bec-massing.json",
  );

  assert.equal(gate.assetId, "villa-le-bec");
  assert.equal(gate.scope.buildingOnly, true);
  assert.equal(gate.scope.sharedRuntimeModified, false);
  assert.equal(gate.scope.sharedRegistryModified, false);
  assert.equal(gate.scope.sharedFastManifestModified, false);
  assert.equal(gate.evidenceGate.status, "pass-for-two-building-massing");
  assert.equal(gate.evidenceGate.platformRevisitedInBuildingWorktree, false);
  assert.deepEqual(
    gate.mapCalibrationCandidate.includedOsmWays.map(({ wayId }) => wayId),
    [864493176, 864493175],
  );
  assert.deepEqual(
    gate.mapCalibrationCandidate.excludedOsmWays.map(({ wayId }) => wayId),
    [864493245, 864493246, 864493247],
  );
  assert.equal(gate.mapCalibrationCandidate.fiveGenericBoxesRetained, false);
  assert.equal(record.membership.included.length, 2);
  assert.equal(record.membership.excluded.length, 3);
  assert.equal(record.children.length, 2);
  assert.ok(record.massingGeometry.omitted.includes("trees"));
  assert.ok(record.massingGeometry.omitted.includes("tables-and-chairs"));
});

test("Villa Le Bec v3 GLB、Blend、生成器和固定机位哈希可复核", async () => {
  const gate = await readJson("docs/research/villa-le-bec-massing-map-gate.json");
  const record = await readJson(
    "docs/research/build-records/tiers/xinhua-road/massing-v2/villa-le-bec-massing.json",
  );
  const glb = gate.lineage.runtimeAsset;
  const blend = gate.lineage.editableSource;

  assert.equal(await sha256(glb.path), glb.sha256);
  assert.equal((await stat(path.join(root, glb.path))).size, glb.bytes);
  assert.equal(await sha256(blend.path), blend.sha256);
  assert.equal(await sha256(gate.lineage.generator.path), gate.lineage.generator.sha256);

  const document = parseGlb(await readFile(path.join(root, glb.path)));
  assert.equal(document.nodes.length, 1);
  assert.equal(document.meshes.length, 1);
  assert.equal(document.materials.length, 3);
  assert.equal(document.images?.length ?? 0, 0);
  assert.equal(document.textures?.length ?? 0, 0);
  assert.equal(document.nodes[0].extras.source_osm_ways, "864493176,864493175");
  assert.equal(
    document.nodes[0].extras.excluded_unbound_ways,
    "864493245,864493246,864493247",
  );

  for (const preview of Object.values(record.outputs.previews)) {
    const contents = await readFile(path.join(root, preview.path));
    assert.equal(contents.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(await sha256(preview.path), preview.sha256);
    assert.deepEqual(
      [contents.readUInt32BE(16), contents.readUInt32BE(20)],
      [960, 720],
    );
  }
});

test("Villa Le Bec 本地小红书证据逐图可回溯且不进入 GLB", async () => {
  const manifest = await readJson("docs/research/villa-le-bec-reference-manifest.json");
  const record = await readJson(
    "docs/research/build-records/tiers/xinhua-road/massing-v2/villa-le-bec-massing.json",
  );
  const evidence = manifest.xhsEvidence;

  assert.equal(evidence.postId, "66ba1786000000001e01cb8b");
  assert.equal(evidence.author, "Ear耳东尘");
  assert.equal(evidence.publishedAt, "2024-08-12");
  assert.equal(
    evidence.acquisitionBoundary,
    "copied-from-main-window-local-read-only-evidence-no-platform-revisit",
  );
  assert.equal(evidence.selectedMedia.length, 7);
  for (const media of evidence.selectedMedia) {
    assert.equal(await sha256(media.localPath), media.sha256);
  }
  assert.equal(manifest.coverageMatrix.streetFront, "supported-xhs-01");
  assert.equal(manifest.coverageMatrix.sideDepth, "supported-xhs-02");
  assert.equal(manifest.coverageMatrix.rearOrSide, "supported-xhs-11");
  assert.equal(record.sourceData.referenceOnly, true);
  assert.equal(record.sourceData.embeddedInGlb, false);
  assert.equal(record.glb.images, 0);
});

test("Villa Le Bec 当前 GLB 通过主窗口 MCP1/加载门，但地图冲突继续阻止推广", async () => {
  const gate = await readJson("docs/research/villa-le-bec-massing-map-gate.json");
  const record = await readJson(
    "docs/research/build-records/tiers/xinhua-road/massing-v2/villa-le-bec-massing.json",
  );

  assert.equal(gate.massingGate.headlessBuild, "pass");
  assert.equal(gate.massingGate.fixedViewReview, "pass-canonical-side-entrance");
  assert.equal(gate.massingGate.mcp1, "pass-current-sha-visual-and-structure");
  assert.equal(gate.massingGate.mcpPerformedInThisCheckpoint, true);
  assert.equal(gate.massingGate.mcpReview.captures.length, 3);
  assert.equal(gate.massingGate.identityDerived, false);
  assert.equal(gate.verdict.runtimePassInheritedFromRecovery, false);
  assert.equal(gate.verdict.runtimeAssetVisibility, "pass-current-v3");
  assert.equal(gate.verdict.mapAcceptance, "blocked");
  assert.equal(gate.verdict.heroOrIdentityAuthorized, false);
  assert.equal(record.mcp1.status, "pass-current-sha-visual-and-structure");
  assert.equal(record.runtimeGate, "pass-current-v3-load-and-visibility-map-rejected");
  assert.equal(record.mapAcceptance, "blocked-road-setback-and-house315-overlap");
  assert.equal(record.identityAllowed, false);
  assert.equal(record.collisionCandidate.proposedLocalObstacles.length, 2);
  assert.ok(
    record.collisionCandidate.minimumWallGapSceneUnits
      > record.collisionCandidate.playerDiameterSceneUnits,
  );
});
