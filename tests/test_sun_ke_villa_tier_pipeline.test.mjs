import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Vector3 } from "three";
import { SUN_KE_PORTE_COCHERE_COLUMN_OBSTACLES } from "../app/scene/sun-ke-villa-tier-contract.mjs";
import { resolvePolygonMovement } from "../app/scene/world-math.ts";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

test("孙科别墅 Massing 先于 Hero/Identity 闭合 active-31 地图合同", async () => {
  const [scope, spec, manifest, qa, source, experience, world] = await Promise.all([
    readJson("docs/research/active-asset-scope-31.json"),
    readJson("docs/research/shangsheng-huashan-clean-massing-geometry-spec.json"),
    readJson("docs/research/shangsheng-huashan-massing-manifest.json"),
    readJson("docs/research/sun-ke-villa-massing-map-qa-v2.json"),
    readFile(new URL("app/scene/shangsheng-xinsuo-block.tsx", root), "utf8"),
    readFile(new URL("app/xinhua-experience.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-world.tsx", root), "utf8"),
  ]);

  const active = scope.assets.find(({ id }) => id === "sun-ke-villa");
  assert.equal(scope.minimalClosableBatch.assetId, "sun-ke-villa");
  assert.equal(active.hero.decision, "retain");
  assert.equal(active.identity.decision, "retain-current-derived-tier");
  assert.equal(active.massing.decision, "reverify");

  const geometry = spec.collections
    .flatMap(({ buildings }) => buildings)
    .find(({ osmWayId }) => osmWayId === 864847877);
  assert.equal(geometry.height.previewHeightSceneUnits, 5.05);
  assert.equal(geometry.height.previewHeightMeters, 13.635);
  assert.equal(geometry.height.measuredHeightMeters, null);
  assert.equal(geometry.height.status, "inferred-not-surveyed");
  assert.equal(
    geometry.evidenceGate.canonicalFront,
    "garden-facade-local-three-plus-z-world-south-facing",
  );
  assert.equal(
    geometry.evidenceGate.entranceDirection,
    "north-entrance-local-three-minus-z-world-north-facing",
  );

  const massing = manifest.assets.find(
    ({ sourceWayId }) => sourceWayId === 864847877,
  );
  assert.equal(massing.glb.bounds.max[1], 5.05);
  assert.equal(massing.glb.sha256, await sha256(massing.outputs.glb));
  assert.equal(manifest.activeAssetUpdate.holdAssetsRegenerated, false);
  assert.equal(massing.mapAcceptance, "pass-with-inferred-height");
  assert.equal(massing.runtimeGate, "pass");
  assert.equal(qa.acceptance.final, "pass");
  assert.equal(qa.runtimeEvidence.loadingFailures, 0);
  assert.equal(qa.runtimeEvidence.runtimeExceptions, 0);
  assert.equal(qa.runtimeEvidence.targetResponses.length, 2);
  assert.equal(
    qa.screenshots.south.sha256,
    await sha256(qa.screenshots.south.path),
  );
  assert.equal(
    qa.screenshots.north.sha256,
    await sha256(qa.screenshots.north.path),
  );
  assert.match(
    source,
    /864847877:[\s\S]*osm-way-864847877-massing\.glb\?v=f233f9defd21/,
  );
  assert.match(source, /test-sun-ke-garden-south-facade-marker/);
  assert.match(source, /花园南立面 · canonical/);
  assert.match(source, /test-sun-ke-north-entrance-marker/);
  assert.match(source, /北侧入口/);
  assert.match(source, /occlude/);
  assert.match(experience, /qaModelView/);
  assert.match(experience, /playable-map-entry/);
  assert.match(world, /SUNKE_NORTH_START_POSITION/);
  assert.match(world, /name === "sunke-north"/);
  assert.match(world, /name === "sunke-tier"/);
  assert.match(
    world,
    /coreMassingQaView === "isolated"[\s\S]*CoreMassingIsolationQaCamera/,
  );
  assert.match(
    source,
    /qaModelDirection[\s\S]*showSouthLabel[\s\S]*showNorthLabel/,
  );
});

test("孙科别墅碰撞阻止正面穿模但保留东侧绕行", async () => {
  const landmarks = await readJson("app/scene/xinhua-landmarks-data.json");
  const site = landmarks.shangshengXinsuo;
  const building = site.buildings.find(({ id }) => id === 864847877);
  const obstacle = building.collision[0];
  const radius = 0.48;

  let frontApproach = new Vector3(building.position[0], 0, -4);
  for (let step = 0; step < 80; step += 1) {
    frontApproach = resolvePolygonMovement(
      frontApproach,
      new Vector3(0, 0, -0.2),
      site.boundary,
      building.collision,
      radius,
      new Vector3(),
    ).clone();
  }
  assert.ok(
    frontApproach.z >= obstacle.maxZ + radius - 0.001,
    `角色穿过孙科别墅南立面：${frontApproach.z}`,
  );

  let eastPassage = new Vector3(obstacle.maxX + radius + 0.2, 0, -4);
  for (let step = 0; step < 55; step += 1) {
    eastPassage = resolvePolygonMovement(
      eastPassage,
      new Vector3(0, 0, -0.2),
      site.boundary,
      building.collision,
      radius,
      new Vector3(),
    ).clone();
  }
  assert.ok(
    eastPassage.z < obstacle.minZ - radius,
    `孙科别墅东侧绕行被错误封死：${eastPassage.z}`,
  );
});

test("外挑 porte-cochère 只阻挡前柱并保留中间覆盖车道", async () => {
  const landmarks = await readJson("app/scene/xinhua-landmarks-data.json");
  const site = landmarks.shangshengXinsuo;
  const building = site.buildings.find(({ id }) => id === 864847877);
  const obstacles = [
    ...building.collision,
    ...SUN_KE_PORTE_COCHERE_COLUMN_OBSTACLES,
  ];
  const radius = 0.48;

  let columnApproach = new Vector3(41.105, 0, -16);
  for (let step = 0; step < 50; step += 1) {
    columnApproach = resolvePolygonMovement(
      columnApproach,
      new Vector3(0, 0, 0.1),
      site.boundary,
      obstacles,
      radius,
      new Vector3(),
    ).clone();
  }
  assert.ok(
    columnApproach.z <= -15.18,
    `角色穿过 porte-cochère 前柱：${columnApproach.z}`,
  );

  let coveredLane = new Vector3(42.0, 0, -16);
  for (let step = 0; step < 50; step += 1) {
    coveredLane = resolvePolygonMovement(
      coveredLane,
      new Vector3(0, 0, 0.1),
      site.boundary,
      obstacles,
      radius,
      new Vector3(),
    ).clone();
  }
  assert.ok(
    coveredLane.z > -14.1,
    `porte-cochère 覆盖车道被错误封死：${coveredLane.z}`,
  );
});

test("孙科别墅既有 Hero master 通过审计并冻结 Identity 派生 lineage", async () => {
  const [scope, heroRecord, heroSource] = await Promise.all([
    readJson("docs/research/active-asset-scope-31.json"),
    readJson(
      "docs/research/build-records/tiers/sun-ke-villa/hero/"
      + "sun-ke-villa-hero.json",
    ),
    readFile(new URL("app/scene/shangsheng-full-models.tsx", root), "utf8"),
  ]);
  const active = scope.assets.find(({ id }) => id === "sun-ke-villa");

  assert.equal(heroRecord.status, "complete-master-frozen");
  assert.equal(heroRecord.budgets.status, "pass");
  assert.equal(heroRecord.glb.triangles, 15_548);
  assert.ok(heroRecord.glb.bounds.size[2] > 7.5);
  assert.ok(
    heroRecord.blender.signatureCues.northPorteCochereProjection.length >= 3,
  );
  assert.equal(heroRecord.glb.images, 0);
  assert.equal(heroRecord.glb.rootTransformNormalized, true);
  assert.equal(
    await sha256(heroRecord.frozenMaster.glb.path),
    heroRecord.frozenMaster.glb.sha256,
  );
  assert.equal(
    await sha256(heroRecord.frozenMaster.blend.path),
    heroRecord.frozenMaster.blend.sha256,
  );
  assert.equal(active.hero.lineageId, heroRecord.lineageId);
  assert.equal(
    active.identity.state,
    "formal-pass-derived-from-reviewed-hero",
  );
  assert.match(
    heroSource,
    /sun-ke-villa\.glb\?v=6d1642315530/,
  );
});

test("孙科别墅 Identity 只从已审查 Hero 派生且通过三档运行时门", async () => {
  const [identity, hero, runtimeQa, gates, source, block] = await Promise.all([
    readJson(
      "docs/research/build-records/tiers/sun-ke-villa/identity/"
      + "sun-ke-villa-identity.json",
    ),
    readJson(
      "docs/research/build-records/tiers/sun-ke-villa/hero/"
      + "sun-ke-villa-hero.json",
    ),
    readJson("docs/research/sun-ke-villa-three-tier-runtime-qa-v2.json"),
    readJson("docs/research/sun-ke-villa-blender-mcp-gates-v2.json"),
    readFile(new URL("app/scene/shangsheng-full-models.tsx", root), "utf8"),
    readFile(new URL("app/scene/shangsheng-xinsuo-block.tsx", root), "utf8"),
  ]);

  assert.equal(identity.status, "formal-pass-derived-from-reviewed-hero");
  assert.equal(identity.formalIdentityPass, true);
  assert.equal(
    identity.derivedFrom.heroGlbSha256,
    hero.frozenMaster.glb.sha256,
  );
  assert.equal(
    identity.derivedFrom.heroBlendSha256,
    hero.frozenMaster.blend.sha256,
  );
  assert.equal(
    await sha256(identity.outputs.glb.path),
    identity.outputs.glb.sha256,
  );
  assert.equal(
    await sha256(identity.outputs.blend.path),
    identity.outputs.blend.sha256,
  );
  assert.equal(identity.glb.triangles, 5_192);
  assert.ok(identity.glb.bounds.size[2] > 7.5);
  assert.ok(
    identity.derivationPolicy.selectedObjects.includes(
      "north-porte-cochere-side-beam-left",
    ),
  );
  assert.equal(identity.glb.images, 0);
  assert.equal(identity.budgets.status, "pass");
  assert.ok(identity.glb.bytes < hero.glb.bytes);
  assert.equal(runtimeQa.acceptance.final, "pass");
  assert.equal(runtimeQa.acceptance.formalIdentityPass, true);
  assert.equal(runtimeQa.environment.firstScreenTargetGlbRequests, 0);
  assert.equal(runtimeQa.loadingPolicyEvidence.all31HeroSimultaneous, false);
  assert.equal(
    runtimeQa.cacheEvidence.status,
    "pass-http-revalidation-not-disk-cache",
  );
  assert.equal(runtimeQa.fallbackEvidence.heroToIdentity.playable, true);
  assert.equal(
    runtimeQa.fallbackEvidence.identityToProgrammatic.playable,
    true,
  );
  assert.equal(gates.massingGate.status, "pass");
  assert.equal(gates.heroGate.status, "pass");
  assert.equal(gates.tierComparisonGate.status, "pass");
  assert.equal(gates.threeJsRuntimeGate.status, "pass");
  for (const tier of ["hero", "identity"]) {
    const screenshot = runtimeQa.currentRuntimeRuns[tier].screenshot;
    assert.equal(await sha256(screenshot.path), screenshot.sha256);
  }
  assert.equal(
    runtimeQa.currentRuntimeRuns.massing.status,
    "pass-retained-from-unchanged-current-binary",
  );
  assert.match(
    source,
    /sun-ke-villa-identity\.glb\?v=6b541e8ffab4/,
  );
  assert.match(block, /ProgressiveSunKeVillaIdentity/);
  assert.match(block, /Suspense fallback=\{identity\}/);
});
