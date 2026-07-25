import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relativePath) => JSON.parse(
  await readFile(path.join(root, relativePath), "utf8"),
);
const exists = async (relativePath) => {
  await access(path.join(root, relativePath));
};

const expectedWayIds = [
  864847856,
  864847877,
  864847881,
  864847883,
  864847892,
  1364679201,
  1364679204,
  1364679205,
  1368808689,
  1368808690,
  1537478450,
  743778426,
];

test("上生 11 栋和华山 1 栋都有独立 Blender Massing 生产资产", async () => {
  const manifest = await readJson(
    "docs/research/shangsheng-huashan-massing-manifest.json",
  );
  assert.equal(manifest.assetCount, 12);
  assert.deepEqual(
    manifest.assets.map(({ sourceWayId }) => sourceWayId),
    expectedWayIds,
  );
  assert.equal(manifest.totalTriangles, 424);
  assert.ok(manifest.totalGlbBytes < 384 * 1024);

  for (const asset of manifest.assets) {
    await exists(asset.outputs.blend);
    await exists(asset.outputs.glb);
    await exists(asset.outputs.previews.canonical);
    await exists(asset.outputs.previews.side);
    await exists(
      `docs/research/build-records/tiers/shangsheng-huashan/massing/osm-way-${asset.sourceWayId}-massing.json`,
    );
    assert.equal(asset.glb.nodes, 1);
    assert.equal(asset.glb.meshes, 1);
    assert.equal(
      asset.glb.materials,
      asset.sourceWayId === 864847877 ? 2 : 1,
    );
    assert.equal(asset.glb.images, 0);
    assert.equal(asset.glb.textures, 0);
    assert.equal(asset.glb.animations, 0);
    assert.equal(asset.glb.transformedNodes.length, 0);
    assert.equal(asset.glb.bounds.min[1], 0);
    assert.ok(
      asset.glb.bytes <= (
        asset.sourceWayId === 864847877 ? 96_000 : 32_768
      ),
    );
    assert.ok(
      asset.glb.triangles <= (
        asset.sourceWayId === 864847877 ? 1_200 : 256
      ),
    );
    assert.ok(
      asset.placement.maximumVertexRoundtripErrorSceneUnits <= 0.0002,
    );
    assert.deepEqual(asset.placement.runtimeScale, [1, 1, 1]);
    assert.equal(asset.placement.movementAuthorized, false);
    assert.equal(
      asset.identityAllowed,
      asset.sourceWayId === 864847877,
    );
  }
});

test("官方编号总平只放行 30# 单层体量，不虚构 N1-N5 或华山功能", async () => {
  const spec = await readJson(
    "docs/research/shangsheng-huashan-clean-massing-geometry-spec.json",
  );
  const buildings = spec.collections.flatMap(
    (collection) => collection.buildings,
  );
  const byWay = new Map(
    buildings.map((building) => [building.osmWayId, building]),
  );
  const retained = byWay.get(864847892);
  assert.equal(retained.confirmedIdentity, "保留30#");
  assert.match(retained.bindingStatus, /official-numbered-plan-overlay/);
  assert.equal(retained.height.previewHeightMeters, 3.9);
  assert.equal(retained.height.measuredHeightMeters, null);
  assert.equal(retained.height.isEvidence, false);
  assert.equal(
    spec.phaseTwoProjectFacts.bindingStatus.retainedBuilding30OsmWay,
    "864847892-high-confidence-official-numbered-plan-overlay",
  );
  assert.equal(
    spec.phaseTwoProjectFacts.bindingStatus.n1ToN5OsmWays,
    "unknown",
  );
  assert.match(byWay.get(1364679204).bindingStatus, /n2-zone-candidate/);
  assert.match(byWay.get(1364679205).bindingStatus, /n4-zone-or-subvolume/);
  assert.match(byWay.get(1537478450).bindingStatus, /not-retained-30/);
  assert.deepEqual(
    byWay.get(743778426).evidenceGate.forbiddenFunctions,
    [
      "public toilet",
      "reading room",
      "management room",
      "equipment room",
      "duty room",
    ],
  );

  const manifest = await readJson(
    "docs/research/shangsheng-huashan-massing-manifest.json",
  );
  const retainedAsset = manifest.assets.find(
    ({ sourceWayId }) => sourceWayId === 864847892,
  );
  assert.equal(retainedAsset.heightEvidence.meters, 3.9);
  assert.equal(retainedAsset.glb.bounds.max[1], 1.4444);
  for (const asset of manifest.assets.filter(
    ({ sourceWayId }) => sourceWayId !== 864847892
      && sourceWayId !== 864847877
      && sourceWayId !== 743778426,
  )) {
    assert.equal(asset.heightEvidence.meters, 10.5);
    assert.equal(asset.heightEvidence.measuredHeightMeters, null);
    assert.equal(asset.heightEvidence.isEvidence, false);
  }
  const sunKeVilla = manifest.assets.find(
    ({ sourceWayId }) => sourceWayId === 864847877,
  );
  assert.equal(sunKeVilla.heightEvidence.meters, 13.635);
  assert.equal(sunKeVilla.heightEvidence.sceneUnits, 5.05);
  assert.equal(sunKeVilla.heightEvidence.measuredHeightMeters, null);
  assert.equal(sunKeVilla.heightEvidence.isEvidence, false);
  assert.equal(sunKeVilla.heightEvidence.status, "inferred-not-surveyed");
  assert.equal(
    sunKeVilla.massingGeometry.type,
    "structured-named-landmark",
  );
  assert.ok(
    sunKeVilla.massingGeometry.majorVolumes.includes(
      "north-protruding-porte-cochere",
    ),
  );
  assert.equal(
    sunKeVilla.massingGeometry.walkableVoid,
    "porte-cochere-center-lane-open-between-local-columns",
  );
  assert.equal(sunKeVilla.glb.triangles, 252);
  assert.equal(sunKeVilla.glb.materials, 2);
  assert.equal(sunKeVilla.glb.bounds.min[1], 0);
  assert.equal(sunKeVilla.glb.bounds.max[1], 5.05);
  assert.ok(sunKeVilla.glb.bounds.min[2] < -4.9);
  assert.equal(
    sunKeVilla.canonicalFront,
    "garden-facade-local-three-plus-z-world-south-facing",
  );
  assert.equal(
    manifest.activeAssetUpdate.holdAssetsRegenerated,
    false,
  );
});

test("12 个 GLB 在真实 Three.js 页面均 HTTP 200 且固定机位通过", async () => {
  const qa = await readJson(
    "docs/research/shangsheng-huashan-massing-runtime-qa.json",
  );
  assert.equal(qa.summary.assetCount, 12);
  assert.equal(qa.summary.playablePassCount, 12);
  assert.equal(qa.summary.targetHttp200Count, 12);
  assert.equal(qa.summary.targetFailureCount, 0);
  assert.equal(qa.summary.runtimeExceptionCount, 0);
  assert.equal(qa.summary.logErrorCount, 0);
  assert.equal(qa.summary.visualPassCount, 12);
  assert.equal(qa.summary.formalMassingPassCount, 0);
  assert.equal(qa.summary.identityAllowedCount, 0);
  assert.equal(qa.coordinateAcceptance.allTwelveWithinTolerance, true);
  assert.equal(qa.formalGate.runtimeGeometryVisual, "pass");
  assert.equal(qa.formalGate.independentReview, "pending");
  await exists(qa.contactSheet.path);
  for (const result of qa.results) {
    assert.equal(result.network.responseStatus, 200);
    assert.equal(result.network.loadingFailures, 0);
    assert.equal(result.console.runtimeExceptions, 0);
    assert.equal(result.console.logErrors, 0);
    assert.equal(result.state.progressiveStage, "playable");
    assert.equal(result.state.canvasCount, 1);
    assert.equal(result.visualReview.status, "pass");
    const screenshotStat = await stat(path.join(root, result.screenshot.path));
    assert.equal(screenshotStat.size, result.screenshot.bytes);
  }
});

test("运行时缓存键、隔离 QA 路由和缺失 N 楼台账保持一致", async () => {
  const manifest = await readJson(
    "docs/research/shangsheng-huashan-massing-manifest.json",
  );
  const shangshengSource = await readFile(
    path.join(root, "app/scene/shangsheng-xinsuo-block.tsx"),
    "utf8",
  );
  const huashanSource = await readFile(
    path.join(root, "app/scene/huashan-green-block.tsx"),
    "utf8",
  );
  const experienceSource = await readFile(
    path.join(root, "app/xinhua-experience.tsx"),
    "utf8",
  );
  const worldSource = await readFile(
    path.join(root, "app/scene/xinhua-world.tsx"),
    "utf8",
  );
  for (const asset of manifest.assets) {
    const version = asset.glb.sha256.slice(0, 12);
    const expected = `osm-way-${asset.sourceWayId}-massing.glb?v=${version}`;
    assert.ok(
      (asset.assetId.includes(":huashan:")
        ? huashanSource
        : shangshengSource
      ).includes(expected),
      `缺少运行时缓存键 ${expected}`,
    );
  }
  assert.match(experienceSource, /data-core-massing-model-id-qa/);
  assert.match(worldSource, /CoreMassingIsolationQaCamera/);
  assert.doesNotMatch(shangshengSource, /scale=\{\[1,\s*1,\s*-1\]\}/);
  assert.doesNotMatch(huashanSource, /scale=\{\[1,\s*1,\s*-1\]\}/);

  const registry = await readJson(
    "docs/research/all-models-production-registry.json",
  );
  const phaseTwo = registry.buildingCollections.shangsheng.filter(
    ({ id }) => id.startsWith("building:shangsheng:phase-two-n"),
  );
  assert.equal(phaseTwo.length, 5);
  assert.deepEqual(
    phaseTwo.map(({ officialLabel }) => officialLabel),
    ["N1", "N2", "N3", "N4", "N5"],
  );
  assert.equal(
    phaseTwo.filter(({ footprintStatus }) => (
      footprintStatus === "missing-from-current-osm-extract"
    )).length,
    3,
  );
});

test("官方编号总平证据已本地化且错误 N1 图片 scope 已纠正", async () => {
  const evidence = await readJson(
    "docs/research/shangsheng-phase-two-reference-manifest.json",
  );
  const assetByName = new Map(
    evidence.assets.map((asset) => [path.basename(asset.path), asset]),
  );
  for (const name of [
    "phase-two-eia-2021.pdf",
    "phase-two-eia-project-plan-page-78.png",
    "phase-two-eia-project-plan-detail.png",
  ]) {
    const asset = assetByName.get(name);
    assert.ok(asset, `缺少证据 ${name}`);
    await exists(asset.path);
  }
  assert.match(
    assetByName.get("phase-two-n1-official-1.jpg")?.evidenceScope,
    /not evidence of N1/,
  );
  assert.match(
    assetByName.get("phase-two-n1-official-2.png")?.evidenceScope,
    /explicitly not N1/,
  );
});
