import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function bytes(relativePath) {
  return readFile(path.join(root, relativePath));
}

async function json(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256").update(await bytes(relativePath)).digest("hex");
}

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim());
}

function triangles(glb) {
  return (glb.meshes ?? []).reduce(
    (sum, mesh) => sum + mesh.primitives.reduce((meshSum, primitive) => {
      const accessor = glb.accessors[primitive.indices ?? primitive.attributes.POSITION];
      return meshSum + accessor.count / 3;
    }, 0),
    0,
  );
}

function worldBox(landmark) {
  const [positionX, positionZ] = landmark.position;
  const cosine = Math.cos(landmark.yaw);
  const sine = Math.sin(landmark.yaw);
  const worldX = [];
  const worldZ = [];
  for (const localX of [landmark.localBounds.minX, landmark.localBounds.maxX]) {
    for (const sourceZ of [landmark.localBounds.minZ, landmark.localBounds.maxZ]) {
      const localZ = -sourceZ;
      worldX.push(
        positionX + landmark.scale * (cosine * localX + sine * localZ),
      );
      worldZ.push(
        positionZ + landmark.scale * (-sine * localX + cosine * localZ),
      );
    }
  }
  return {
    minX: Math.min(...worldX),
    maxX: Math.max(...worldX),
    minZ: Math.min(...worldZ),
    maxZ: Math.max(...worldZ),
  };
}

function boxGap(left, right) {
  const dx = Math.max(0, left.minX - right.maxX, right.minX - left.maxX);
  const dz = Math.max(0, left.minZ - right.maxZ, right.minZ - left.maxZ);
  return Math.hypot(dx, dz);
}

function close(actual, expected, tolerance = 1e-6) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `期望 ${expected}，实际 ${actual}`,
  );
}

export async function auditOneStepGardenFinalGap() {
  const [audit, lineage, gates, mapQa, runtimeQa, manifest, registry] =
    await Promise.all([
      json("docs/research/one-step-garden-final-gap-audit.json"),
      json("docs/research/one-step-garden-tier-lineage.json"),
      json("docs/research/one-step-garden-blender-mcp-gates.json"),
      json("docs/research/one-step-garden-massing-map-qa.json"),
      json("test_artifacts/test_one-step-garden-three-tier-runtime-qa.json"),
      json("docs/research/one-step-garden-reference-manifest.json"),
      json("app/scene/xinhua-road-landmarks-data.json"),
    ]);

  assert.equal(audit.assetId, "one-step-garden");
  assert.equal(audit.status, "pass-existing-accepted-stages-preserved");
  assert.equal(audit.scope.sharedFilesModified, false);
  assert.equal(audit.scope.blenderRerun, false);
  assert.equal(audit.scope.browserRerun, false);

  assert.equal(manifest.subject.id, audit.assetId);
  assert.equal(
    manifest.canonicalComparison.direction,
    audit.evidence.canonicalDirection,
  );
  assert.equal(manifest.coverageMatrix.canonicalFrontVolume, "supported");
  assert.equal(manifest.coverageMatrix.frontVolumeDepth, "partial-courtyard");
  assert.equal(manifest.coverageMatrix.frontVolumeRear, "missing-unknown");
  for (const reference of audit.evidence.references) {
    assert.equal(await sha256(reference.path), reference.sha256);
  }

  const tierRecords = {
    massing: await json(
      "docs/research/build-records/tiers/xinhua-road/massing-v2/one-step-garden-massing.json",
    ),
    hero: await json(
      "docs/research/build-records/tiers/xinhua-road/hero-v2/one-step-garden-hero.json",
    ),
    identity: await json(
      "docs/research/build-records/tiers/xinhua-road/identity-v1/one-step-garden-identity.json",
    ),
  };

  for (const tierName of ["massing", "hero", "identity"]) {
    const tier = audit.strictLineage.tiers[tierName];
    const glbBuffer = await bytes(tier.glb.path);
    const glb = parseGlb(glbBuffer);
    assert.equal(await sha256(tier.generator.path), tier.generator.sha256);
    assert.equal(await sha256(tier.blend.path), tier.blend.sha256);
    assert.equal(await sha256(tier.glb.path), tier.glb.sha256);
    assert.equal(glbBuffer.length, tier.glb.bytes);
    assert.equal(triangles(glb), tier.glb.triangles);
    assert.equal(glb.materials.length, tier.glb.materials);
    assert.equal(glb.images?.length ?? 0, 0);
    assert.equal(glb.textures?.length ?? 0, 0);
    assert.deepEqual(tierRecords[tierName].glb.bounds, audit.strictLineage.commonBounds);
    assert.equal(tierRecords[tierName].glb.sha256, tier.glb.sha256);
  }

  assert.equal(
    lineage.tiers.massing.generator.sha256,
    audit.strictLineage.tiers.massing.generator.sha256,
  );
  assert.equal(
    lineage.tiers.hero.derivedFromMassingGlbSha256,
    audit.strictLineage.tiers.massing.glb.sha256,
  );
  assert.equal(
    lineage.tiers.identity.derivedFromHeroGlbSha256,
    audit.strictLineage.tiers.hero.glb.sha256,
  );
  const identityExtras = tierRecords.identity.rootExtras;
  assert.equal(
    identityExtras.derived_from_hero_glb_sha256,
    audit.strictLineage.tiers.hero.glb.sha256,
  );
  assert.equal(
    identityExtras.derived_from_hero_blend_sha256,
    audit.strictLineage.tiers.hero.blend.sha256,
  );
  assert.equal(
    identityExtras.derived_from_hero_generator_sha256,
    audit.strictLineage.tiers.hero.generator.sha256,
  );
  assert.equal(
    identityExtras.derived_from_massing_glb_sha256,
    audit.strictLineage.tiers.massing.glb.sha256,
  );

  assert.equal(gates.massingGate.status, "pass");
  assert.equal(gates.mapGate.status, "pass");
  assert.equal(gates.heroGate.status, "pass");
  assert.equal(gates.identityGate.status, "pass");
  assert.equal(gates.threeTierGate.status, "pass");
  assert.equal(lineage.terminalBlenderGate.status, "pass");

  const building = registry.landmarks.find(({ id }) => id === audit.assetId);
  assert.ok(building);
  assert.deepEqual(building.position, audit.map.position);
  assert.equal(building.yaw, audit.map.yaw);
  assert.equal(building.scale, audit.map.scale);
  assert.deepEqual(mapQa.qaAssembly.frozenPlacement.position, audit.map.position);
  assert.equal(mapQa.qaAssembly.frozenPlacement.yawRadians, audit.map.yaw);
  assert.equal(mapQa.qaAssembly.frozenPlacement.scale, audit.map.scale);
  close(
    mapQa.mapCalibration.roadSetback.minimumDifferenceSceneUnits,
    audit.map.roadSetbackSceneUnits,
  );
  assert.equal(mapQa.collisionAndWalkable.worldObstacles.length, 8);
  assert.equal(mapQa.collisionAndWalkable.start.clearForPlayerRadius, true);
  assert.ok(
    mapQa.collisionAndWalkable.cameraProbes.every(
      (probe) => probe.clearForCameraRadius0p26,
    ),
  );
  close(
    mapQa.collisionAndWalkable.entranceClearWidthAfterScaleAndMargins,
    audit.map.collision.entranceClearWidth,
  );
  close(
    mapQa.collisionAndWalkable.frontRearClearWidthAfterScaleAndMargins,
    audit.map.collision.frontRearGapClearWidth,
  );
  assert.ok(
    audit.map.collision.entranceClearWidth > audit.map.collision.playerDiameter,
  );
  assert.ok(
    audit.map.collision.frontRearGapClearWidth
      > audit.map.collision.playerDiameter,
  );

  const buildingBox = worldBox(building);
  const neighborGaps = registry.landmarks
    .filter(({ id, localBounds }) => id !== audit.assetId && localBounds)
    .map((neighbor) => ({
      assetId: neighbor.id,
      gap: boxGap(buildingBox, worldBox(neighbor)),
    }))
    .sort((left, right) => left.gap - right.gap);
  assert.equal(neighborGaps[0].assetId, audit.map.nearestBuilding.assetId);
  close(neighborGaps[0].gap, audit.map.nearestBuilding.axisAlignedGapSceneUnits);
  assert.ok(
    neighborGaps[0].gap - 2 * mapQa.collisionAndWalkable.collisionMargin > 0,
  );
  assert.equal(audit.map.osmBinding.status, "unknown-not-claimed");

  assert.equal(runtimeQa.status, "pass-main-window-real-browser");
  assert.equal(runtimeQa.mainWindowBrowserAcceptance.status, "pass");
  assert.equal(runtimeQa.completionBoundary.threeTierRuntimeFinalPass, true);
  assert.deepEqual(runtimeQa.mainWindowBrowserAcceptance.viewport, audit.runtime.viewport);
  assert.equal(
    runtimeQa.mainWindowBrowserAcceptance.warmupMs,
    audit.runtime.warmupMs,
  );
  for (const tierName of audit.runtime.tiers) {
    assert.equal(
      runtimeQa.mainWindowBrowserAcceptance.tiers[tierName].sha256,
      audit.strictLineage.tiers[tierName].glb.sha256,
    );
    assert.equal(
      runtimeQa.mainWindowBrowserAcceptance.tiers[tierName].requestedTierUrlCount,
      1,
    );
  }
  assert.equal(
    runtimeQa.mainWindowBrowserAcceptance.fallbacks.heroToIdentity.status,
    "pass",
  );
  assert.equal(
    runtimeQa.mainWindowBrowserAcceptance.fallbacks.identityToMassing.status,
    "pass",
  );
  assert.equal(
    runtimeQa.mainWindowBrowserAcceptance.fallbacks.massingFloor.status,
    "pass-no-false-fallback",
  );
  assert.equal(
    runtimeQa.mainWindowBrowserAcceptance.collisionReplay.status,
    "pass-wall-block",
  );
  assert.equal(runtimeQa.mainWindowBrowserAcceptance.console.unexpectedErrors, 0);

  return {
    assetId: audit.assetId,
    status: audit.status,
    strictLineage: audit.strictLineage.status,
    gates: audit.gates,
    nearestBuilding: audit.map.nearestBuilding,
    runtime: audit.runtime.status,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await auditOneStepGardenFinalGap();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
