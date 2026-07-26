import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  HOUSE_315_FALLBACK_CHAIN,
  HOUSE_315_PLACEMENT,
  HOUSE_315_TIERS,
  resolveHouse315Qa,
} from "../app/scene/house-315-tier-contract.mjs";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
}

function inspectGlb(buffer, data) {
  let triangles = 0;
  let primitives = 0;
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  for (const mesh of data.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      primitives += 1;
      const position = data.accessors[primitive.attributes.POSITION];
      const indices = primitive.indices === undefined
        ? position
        : data.accessors[primitive.indices];
      triangles += indices.count / 3;
      for (let axis = 0; axis < 3; axis += 1) {
        bounds.min[axis] = Math.min(bounds.min[axis], position.min[axis]);
        bounds.max[axis] = Math.max(bounds.max[axis], position.max[axis]);
      }
    }
  }
  return {
    bytes: buffer.length,
    nodes: data.nodes?.length ?? 0,
    meshes: data.meshes?.length ?? 0,
    primitives,
    triangles,
    materials: data.materials?.length ?? 0,
    images: data.images?.length ?? 0,
    textures: data.textures?.length ?? 0,
    bounds,
  };
}

function closeArray(actual, expected, tolerance = 1e-5) {
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < actual.length; index += 1) {
    assert.ok(
      Math.abs(actual[index] - expected[index]) <= tolerance,
      `${actual[index]} 与 ${expected[index]} 的差超过 ${tolerance}`,
    );
  }
}

test("House315 最终审计输入 SHA 与当前保留记录一致", async () => {
  const audit = await readJson("docs/research/house-315-final-audit.json");
  for (const [name, input] of Object.entries(audit.inputs)) {
    if (name === "publicRegistry") {
      // House315 checkpoint 冻结的是当时的共享 registry；后续建筑只能由
      // 主窗口推进该文件，因此保留 review-time SHA，不要求当前文件回退。
      assert.match(input.sha256, /^[0-9a-f]{64}$/);
      continue;
    }
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  assert.equal(audit.baseCommit, "aada3c412d10f822305c2e3410435f3b00278c2c");
  assert.equal(audit.scope.binaryRebuilt, false);
  assert.equal(audit.scope.sharedFilesModified, false);
  assert.equal(audit.status, "complete-preserved-no-rework");
});

test("House315 三档 GLB、Blend、生成器和 build record 均与最终审计一致", async () => {
  const audit = await readJson("docs/research/house-315-final-audit.json");
  for (const [tierName, tier] of Object.entries(audit.tiers)) {
    if (tierName === "continuity") continue;
    assert.equal(await sha256(tier.generator.path), tier.generator.sha256);
    assert.equal(await sha256(tier.blend.path), tier.blend.sha256);
    assert.equal(await sha256(tier.glb.path), tier.glb.sha256);
    assert.equal(await sha256(tier.buildRecord.path), tier.buildRecord.sha256);

    const buffer = await readFile(new URL(tier.glb.path, root));
    const data = parseGlb(buffer);
    const metrics = inspectGlb(buffer, data);
    for (const key of [
      "bytes",
      "nodes",
      "meshes",
      "primitives",
      "triangles",
      "materials",
      "images",
      "textures",
    ]) {
      assert.equal(metrics[key], tier.glb[key], `${tierName}.${key}`);
    }
    closeArray(metrics.bounds.min, audit.tiers.continuity.bounds.min);
    closeArray(metrics.bounds.max, audit.tiers.continuity.bounds.max);
    assert.equal(data.nodes[0].extras.stable_asset_id, "house-315");
    assert.equal(data.nodes[0].extras.tier, tierName);
    assert.equal(data.nodes[0].translation, undefined);
    assert.equal(data.nodes[0].rotation, undefined);
    assert.equal(data.nodes[0].scale, undefined);

    const record = await readJson(tier.buildRecord.path);
    assert.equal(record.glb.sha256, tier.glb.sha256);
    assert.equal(record.glb.triangles, tier.glb.triangles);
    assert.deepEqual(record.glb.bounds, audit.tiers.continuity.bounds);
  }
});

test("House315 strict Massing 到 Hero 再到 Identity 的 SHA lineage 完整", async () => {
  const audit = await readJson("docs/research/house-315-final-audit.json");
  const [hero, identity, lineage, gates] = await Promise.all([
    readJson(audit.tiers.hero.buildRecord.path),
    readJson(audit.tiers.identity.buildRecord.path),
    readJson(audit.inputs.tierLineage.path),
    readJson(audit.inputs.mcpGates.path),
  ]);
  assert.equal(
    hero.derivedFrom.runtimeAssetSha256,
    audit.tiers.massing.glb.sha256,
  );
  assert.equal(
    identity.derivedFrom.heroGlbSha256,
    audit.tiers.hero.glb.sha256,
  );
  assert.equal(
    identity.derivedFrom.heroBlendSha256,
    audit.tiers.hero.blend.sha256,
  );
  assert.equal(
    identity.derivedFrom.massingGlbSha256,
    audit.tiers.massing.glb.sha256,
  );
  assert.equal(lineage.threeTierGate.formalPass, true);
  assert.equal(gates.massingGate.status, "pass");
  assert.equal(gates.heroGate.status, "pass");
  assert.equal(gates.threeTierGate.status, "pass");
  assert.equal(audit.strictLineageGate.status, "pass");
});

test("House315 本地证据、canonical、未知边界均保持可追溯", async () => {
  const audit = await readJson("docs/research/house-315-final-audit.json");
  const manifest = await readJson(audit.inputs.referenceManifest.path);
  assert.equal(manifest.referencePhotos.length, audit.evidenceGate.localReferenceCount);
  assert.equal(manifest.canonicalComparison.status, "supported");
  for (const reference of manifest.referencePhotos) {
    assert.equal(await sha256(reference.localPath), reference.sha256);
  }
  assert.match(
    audit.evidenceGate.inferred[0],
    /medium-high/,
  );
  assert.equal(
    audit.evidenceGate.unknown.some((item) => item.includes("addr:housenumber")),
    true,
  );
  assert.equal(
    audit.evidenceGate.unknown.some((item) => item.includes("1930")),
    true,
  );
});

test("House315 OSM placement、道路退界、邻栋净距与当前 registry/contract 一致", async () => {
  const audit = await readJson("docs/research/house-315-final-audit.json");
  const [candidate, runtimeQa, registry] = await Promise.all([
    readJson(audit.inputs.mapCandidate.path),
    readJson(audit.inputs.runtimeQa.path),
    readJson(audit.inputs.publicRegistry.path),
  ]);
  const landmark = registry.landmarks.find(({ id }) => id === "house-315");
  assert.ok(landmark);
  assert.equal(candidate.subjectBinding.candidateWayId, audit.mapAndCollisionGate.osmWayId);
  assert.deepEqual(candidate.candidate.placement, {
    ...audit.mapAndCollisionGate.placement,
    start: audit.mapAndCollisionGate.startAndCamera.start,
    forward: audit.mapAndCollisionGate.startAndCamera.forward,
  });
  assert.deepEqual(landmark.position, audit.mapAndCollisionGate.placement.position);
  assert.equal(landmark.yaw, audit.mapAndCollisionGate.placement.yaw);
  assert.equal(landmark.scale, audit.mapAndCollisionGate.placement.scale);
  assert.deepEqual(HOUSE_315_PLACEMENT.position, landmark.position);
  assert.equal(HOUSE_315_PLACEMENT.yaw, landmark.yaw);
  assert.equal(HOUSE_315_PLACEMENT.scale, landmark.scale);
  assert.deepEqual(HOUSE_315_PLACEMENT.start, landmark.start);
  assert.deepEqual(HOUSE_315_PLACEMENT.forward, landmark.forward);
  assert.deepEqual(HOUSE_315_PLACEMENT.localObstacles, landmark.localObstacles);
  assert.equal(HOUSE_315_PLACEMENT.mapSourceWayId, audit.mapAndCollisionGate.osmWayId);
  assert.equal(
    candidate.clearance.motorRoad.conservativeAfterRuntimeCollisionMarginSceneUnits,
    audit.mapAndCollisionGate.road.afterRuntimeCollisionMarginSceneUnits,
  );
  assert.ok(audit.mapAndCollisionGate.road.afterRuntimeCollisionMarginSceneUnits > 0);
  assert.ok(
    audit.mapAndCollisionGate.neighbors.villaLeBecRuntimeGapsAfterBothMarginsSceneUnits
      .every((gap) => gap > 0),
  );
  assert.equal(
    runtimeQa.placementRecalibrationAcceptance.map.villaLeBecOverlap,
    "pass-none",
  );
  assert.equal(
    runtimeQa.placementRecalibrationAcceptance.collisionReplay.result,
    audit.mapAndCollisionGate.collision.runtimeReplay,
  );
  assert.equal(runtimeQa.placementRecalibrationAcceptance.map.camera, "pass");
  assert.equal(runtimeQa.placementRecalibrationAcceptance.map.groundContact, "pass");
  assert.equal(audit.mapAndCollisionGate.status, "pass-main-window-runtime");
});

test("House315 三档 fallback、性能记录和旧快照 supersession 无歧义", async () => {
  const audit = await readJson("docs/research/house-315-final-audit.json");
  const [candidate, runtimeQa, lineage] = await Promise.all([
    readJson(audit.inputs.mapCandidate.path),
    readJson(audit.inputs.runtimeQa.path),
    readJson(audit.inputs.tierLineage.path),
  ]);
  for (const tier of ["hero", "identity", "massing"]) {
    const normal = resolveHouse315Qa(
      `?qaModelId=house-315&qaModelTier=${tier}`,
    );
    assert.equal(normal.requestedTier, tier);
    assert.equal(normal.renderedTier, tier);
    assert.equal(normal.forcedFallback, false);
    assert.equal(normal.sha256, HOUSE_315_TIERS[tier].sha256);
  }
  const heroFallback = resolveHouse315Qa(
    "?qaModelId=house-315&qaModelTier=hero&qaActiveFallback=house-315:hero",
  );
  const identityFallback = resolveHouse315Qa(
    "?qaModelId=house-315&qaModelTier=identity&qaActiveFallback=house-315:identity",
  );
  const massingFloor = resolveHouse315Qa(
    "?qaModelId=house-315&qaModelTier=massing&qaActiveFallback=house-315:massing",
  );
  assert.equal(HOUSE_315_FALLBACK_CHAIN.hero, "identity");
  assert.equal(heroFallback.renderedTier, "identity");
  assert.equal(identityFallback.renderedTier, "massing");
  assert.equal(massingFloor.renderedTier, "massing");
  assert.equal(massingFloor.fallbackMode, "no-lower-tier");
  assert.equal(runtimeQa.runtimeAcceptance.routes.heroFallback.renderedTier, "identity");
  assert.equal(runtimeQa.runtimeAcceptance.routes.identityFallback.renderedTier, "massing");
  assert.equal(runtimeQa.runtimeAcceptance.routes.massingFloor.renderedTier, "massing");
  assert.equal(runtimeQa.runtimeAcceptance.console.errors, 0);
  assert.equal(runtimeQa.placementRecalibrationAcceptance.console.errors, 0);
  assert.equal(audit.runtimeGate.performance.improvementClaimed, false);
  assert.equal(
    audit.runtimeGate.performance.recalibratedMapSample.fps,
    runtimeQa.placementRecalibrationAcceptance.performance.fps,
  );

  assert.equal(candidate.verdict.finalRuntimeMapPass, false);
  assert.equal(runtimeQa.completionBoundary.mapPositionFinalRuntimePass, true);
  assert.deepEqual(
    lineage.continuityContract.runtimePlacement.position,
    audit.supersededSnapshots.tierLineagePlacement.position,
  );
  assert.notDeepEqual(
    lineage.continuityContract.runtimePlacement.position,
    HOUSE_315_PLACEMENT.position,
  );
  assert.equal(audit.gates.overall, "pass-complete-preserved");
});
