import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function readGlbJson(path) {
  const buffer = await readFile(new URL(path, root));
  assert.equal(buffer.toString("ascii", 0, 4), "glTF", `${path} 不是 GLB`);
  assert.equal(buffer.readUInt32LE(4), 2, `${path} 不是 glTF 2.0`);
  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.readUInt32LE(16);
  assert.equal(jsonType, 0x4e4f534a, `${path} 缺少 JSON 数据块`);
  return {
    buffer,
    json: JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength)),
  };
}

function glbTriangles(json) {
  return (json.meshes ?? []).reduce(
    (meshTotal, mesh) =>
      meshTotal +
      mesh.primitives.reduce((primitiveTotal, primitive) => {
        const count =
          primitive.indices !== undefined
            ? json.accessors[primitive.indices].count
            : json.accessors[primitive.attributes.POSITION].count;
        return primitiveTotal + count / 3;
      }, 0),
    0,
  );
}

function flattenPlacementCollections(snapshot) {
  return [
    ...Object.values(snapshot.vegetation).flat(),
    ...Object.values(snapshot.streetFurniture).flat(),
    ...snapshot.facilities,
  ];
}

test("Active 18 建筑注册表保留全部延期植被和设施原型", async () => {
  const registry = await readJson("docs/research/all-models-production-registry.json");
  assert.equal(registry.branch, "codex/all-models-v3");
  assert.equal(
    registry.scopeContract.status,
    "active-18-buildings-frozen-active-31-superseded",
  );
  assert.deepEqual(registry.scopeContract.counts, {
    assets: 18,
    buildings: 18,
    trees: 0,
    decor: 0,
  });
  assert.deepEqual(registry.scopeContract.holdDeferredCounts, {
    assets: 13,
    trees: 3,
    decor: 10,
  });
  assert.equal(registry.scopeContract.activeIds.length, 18);
  assert.equal(new Set(registry.scopeContract.activeIds).size, 18);
  assert.equal(registry.scopeContract.holdDeferredCatalogIds.length, 13);
  assert.equal(new Set(registry.scopeContract.holdDeferredCatalogIds).size, 13);
  assert.deepEqual(registry.scopeContract.excludedCatalogIds, [
    "lighting-v3",
    "rain-summer-wanderer",
  ]);
  assert.equal(registry.scopeContract.minimalVerticalPilot, "sun-ke-villa");
  assert.equal(
    registry.scopeContract.deferredWorktreeCreation,
    "only-at-main-task-closeout",
  );
  assert.equal(registry.coordinateContract.authoredMetersPerSceneUnit, 2.7);
  assert.equal(registry.buildingCollections.roadLandmarks.length, 14);
  assert.equal(registry.buildingCollections.xingfuli.instances.length, 7);
  assert.equal(registry.buildingCollections.shangsheng.length, 16);
  assert.deepEqual(
    registry.buildingCollections.shangsheng.slice(-5).map(
      ({ officialLabel }) => officialLabel,
    ),
    ["N1", "N2", "N3", "N4", "N5"],
  );
  assert.equal(
    registry.buildingCollections.shangsheng.slice(-5).filter(
      ({ footprintStatus }) => footprintStatus.includes("missing"),
    ).length,
    3,
  );
  assert.equal(registry.buildingCollections.huashan.length, 1);
  assert.equal(registry.vegetationPrototypes.length, 5);
  assert.equal(registry.streetFurniturePrototypes.length, 7);
  assert.equal(registry.facilityPrototypes.length, 14);
  assert.equal(registry.buildingCollections.ordinaryOsm.candidateCount, 864);
  assert.equal(
    registry.buildingCollections.ordinaryOsm.scopeStatus,
    "hold-backlog-preserved-no-new-generation",
  );
  assert.equal(registry.buildingCollections.ordinaryOsm.massingChunks, 14);
  assert.equal(
    registry.buildingCollections.ordinaryOsm.massingStatus,
    "864-generated-overview-runtime-pass-formal-sampling-blocked",
  );
  assert.equal(
    registry.buildingCollections.ordinaryOsm.heightEvidence.levelsDerived,
    11,
  );
  assert.equal(
    registry.buildingCollections.ordinaryOsm.heightEvidence.fallbackUnknown,
    853,
  );
  assert.equal(registry.mapAudit.roadPoiCount, 14);
  assert.equal(registry.mapAudit.boundCount, 3);
  assert.equal(registry.mapAudit.runtimePlacementsChanged, 0);
  assert.equal(registry.prototypeTierBatches.sharedMassing.prototypeCount, 12);
  assert.equal(registry.prototypeTierBatches.sharedMassing.vegetationCount, 5);
  assert.equal(
    registry.prototypeTierBatches.sharedMassing.streetFurnitureCount,
    7,
  );
  assert.equal(
    registry.prototypeTierBatches.sharedMassing.status,
    "formal-massing-pass",
  );
  assert.equal(
    registry.prototypeTierBatches.sharedMassing.formalMassingPassCount,
    12,
  );
  assert.equal(
    registry.prototypeTierBatches.sharedMassing.identityAllowedAssetCount,
    8,
  );
  assert.equal(
    registry.prototypeTierBatches.sharedMassing
      .identityBlockedSpeciesUnknownAssetCount,
    4,
  );
  assert.equal(
    registry.prototypeTierBatches.sharedMassing.identityAllowed,
    false,
  );
  assert.equal(
    registry.prototypeTierBatches.facilityMassing.semanticPrototypeCount,
    14,
  );
  assert.equal(registry.prototypeTierBatches.facilityMassing.assetCount, 15);
  assert.equal(
    registry.prototypeTierBatches.facilityMassing.isolatedRuntimePassCount,
    15,
  );
  assert.equal(
    registry.prototypeTierBatches.facilityMassing.mapRuntimeLoadPassCount,
    15,
  );
  assert.equal(
    registry.prototypeTierBatches.facilityMassing.mapPlacementPassCount,
    0,
  );
  assert.equal(
    registry.prototypeTierBatches.facilityMassing.formalMassingPassCount,
    0,
  );
  assert.equal(registry.prototypeTierBatches.sharedIdentity.assetCount, 8);
  assert.equal(
    registry.prototypeTierBatches.sharedIdentity.blenderVisualPassCount,
    8,
  );
  assert.equal(
    registry.prototypeTierBatches.sharedIdentity.glbStructuralPassCount,
    8,
  );
  assert.equal(
    registry.prototypeTierBatches.sharedIdentity.formalIdentityPassCount,
    0,
  );
  assert.equal(
    registry.prototypeTierBatches.sharedIdentity.speciesUnknownExcludedCount,
    4,
  );
  assert.equal(
    registry.prototypeTierBatches.sharedIdentity.runtimeGallery,
    "passed-8-of-8",
  );
  assert.equal(
    registry.prototypeTierBatches.sharedIdentity.isolatedRuntimePassCount,
    8,
  );
  assert.equal(
    registry.prototypeTierBatches.sharedIdentity.materialVisualPassCount,
    8,
  );
  assert.equal(
    registry.prototypeTierBatches.sharedIdentity.coveredMapInstanceCount,
    72,
  );
  assert.equal(
    registry.prototypeTierBatches.sharedIdentity.mapPlacement,
    "blocked-authored-envelope-mismatch",
  );
  assert.equal(
    registry.prototypeTierBatches.sharedIdentity.collision,
    "blocked-common-proxy-not-reconciled",
  );
  assert.equal(
    registry.placementSnapshots.vegetation,
    "docs/research/model-placement-registry-20260725.json",
  );
  assert.equal(
    registry.holdBacklog.status,
    "preserved-read-only-until-deferred-handoff",
  );
  assert.deepEqual(
    registry.holdBacklog.nonCatalogFacilities.preservedMigrationInputs,
    ["xingfuli-mixed-paving", "xingfuli-vertical-garden"],
  );

  for (const asset of registry.buildingCollections.roadLandmarks) {
    assert.match(asset.id, /^building:xinhua-road:/);
    assert.ok(asset.hero);
    assert.ok(asset.identity);
    assert.ok(asset.massing);
    assert.ok(asset.evidence);
  }
  for (const prototype of registry.vegetationPrototypes) {
    assert.ok(prototype.hero);
    assert.ok(prototype.identity);
    assert.ok(prototype.massing);
    assert.ok(prototype.speciesEvidence);
  }
});

test("OSM 建筑快照逐栋记录位置、方向、尺度证据与三档策略", async () => {
  const inventory = await readJson(
    "docs/research/data/xinhua-building-inventory-20260724-185400.json",
  );
  assert.equal(inventory.summary.included, 878);
  assert.equal(inventory.summary.countByRole["ordinary-building"], 864);
  assert.equal(inventory.summary.countByRole["core-building"], 12);
  assert.equal(inventory.buildings.length, 878);
  assert.equal(new Set(inventory.buildings.map(({ id }) => id)).size, 878);

  for (const building of inventory.buildings) {
    assert.match(building.id, /^building:xinhua:osm-/);
    assert.equal(building.positioning.positionEvidence, "observed-osm-footprint");
    assert.ok(building.positioning.yawEvidence);
    assert.ok(building.positioning.scaleEvidence.horizontal);
    assert.ok(building.positioning.scaleEvidence.vertical);
    assert.ok(building.tierStrategy.hero);
    assert.ok(building.tierStrategy.identity);
    assert.ok(building.tierStrategy.massing);
    assert.equal(building.evidence.geometry, "observed");
    assert.ok(["unknown", "observed"].includes(building.evidence.facade));
  }

  await access(new URL(inventory.scope.sourceSnapshot, root));
});

test("植被、街具和设施逐实例快照数量来自运行时算法而非上限声明", async () => {
  const snapshot = await readJson(
    "docs/research/model-placement-registry-20260725.json",
  );
  assert.equal(snapshot.status, "placement-inventory-not-map-acceptance");
  assert.equal(snapshot.vegetation.xinhuaRoadPlaneTrees.length, 28);
  assert.equal(snapshot.vegetation.xingfuliPlaneTrees.length, 3);
  assert.equal(snapshot.vegetation.shangshengCampusTrees.length, 29);
  assert.equal(snapshot.vegetation.huashanCanopyTrees.length, 112);
  assert.equal(snapshot.vegetation.huashanUnderstory.length, 73);
  assert.equal(snapshot.vegetation.xinhuaRoadShrubs.length, 12);
  assert.equal(snapshot.streetFurniture.xinhuaRoad.length, 19);
  assert.equal(snapshot.streetFurniture.xingfuli.length, 22);
  assert.equal(snapshot.facilities.length, 16);

  const allInstances = flattenPlacementCollections(snapshot);
  assert.equal(
    new Set(allInstances.map(({ id }) => id)).size,
    allInstances.length,
  );
  for (const instance of allInstances) {
    assert.match(instance.id, /^(vegetation|facility)-instance:/);
    assert.match(instance.prototype, /^prototype:/);
    assert.ok(["authored-world", "collection-local"].includes(instance.coordinateSpace));
    assert.equal(instance.position.length, 3);
    assert.ok(instance.evidence);
  }

  const check = spawnSync(
    process.execPath,
    ["scripts/test_generate_model_placement_registry.mjs", "--check"],
    { cwd: new URL(".", root), encoding: "utf8" },
  );
  assert.equal(check.status, 0, check.stderr || check.stdout);
});

test("14 个道路 POI 逐项记录位置、尺度、轴线与绑定决策", async () => {
  const audit = await readJson(
    "docs/research/xinhua-road-map-binding-audit.json",
  );
  assert.equal(audit.entries.length, 14);
  assert.equal(audit.summary.bound, 3);
  assert.equal(audit.summary.pending, 9);
  assert.equal(audit.summary.notBuildings, 2);
  assert.equal(audit.summary.runtimePlacementsChanged, 0);
  assert.equal(new Set(audit.entries.map(({ runtimeId }) => runtimeId)).size, 14);

  for (const entry of audit.entries) {
    assert.equal(entry.decision.movementAuthorized, false);
    assert.equal(entry.runtimeBaseline.position.length, 2);
    assert.ok(entry.runtimeBaseline.boundsMetrics.widthMeters > 0);
    assert.ok(entry.runtimeBaseline.boundsMetrics.depthMeters > 0);
    for (const candidate of entry.osmWayCandidates) {
      assert.match(candidate.id, /^building:xinhua:osm-way-/);
      assert.equal(candidate.axisIsNotEntranceDirection, true);
      assert.ok(candidate.footprintAreaSqMeters > 0);
      assert.ok(candidate.distanceFromRuntimeMeters >= 0);
    }
  }

  const cinema = audit.entries.find(
    ({ runtimeId }) => runtimeId === "shanghai-cinema",
  );
  assert.equal(cinema.decision.status, "bound");
  assert.deepEqual(
    cinema.osmWayCandidates.map(({ osmId }) => osmId),
    [292250766],
  );

  const communityCenter = audit.entries.find(
    ({ runtimeId }) => runtimeId === "xinhua-community-center",
  );
  assert.equal(
    communityCenter.decision.status,
    "bound-with-node-corroboration",
  );
  assert.deepEqual(communityCenter.corroboratingOsmNodes, [13765678129]);

  const pocketPark = audit.entries.find(
    ({ runtimeId }) => runtimeId === "xinhua-pocket-park",
  );
  const heritage = audit.entries.find(
    ({ runtimeId }) => runtimeId === "fahua-heritage",
  );
  assert.equal(pocketPark.decision.status, "not-a-building");
  assert.equal(heritage.decision.status, "not-a-building");
  assert.equal(pocketPark.osmWayCandidates.length, 0);
  assert.equal(heritage.osmWayCandidates.length, 0);

  const check = spawnSync(
    process.execPath,
    ["scripts/test_generate_xinhua_road_map_binding_audit.mjs", "--check"],
    { cwd: new URL(".", root), encoding: "utf8" },
  );
  assert.equal(check.status, 0, check.stderr || check.stdout);
});

test("14 个道路 POI 均有独立 Massing Blend、GLB、三视角和可追溯构建记录", async () => {
  const registry = await readJson(
    "docs/research/all-models-production-registry.json",
  );
  const runtimeQa = await readJson(
    "docs/research/xinhua-road-massing-runtime-qa.json",
  );
  const slugs = registry.buildingCollections.roadLandmarks.map(
    ({ runtimeId }) => runtimeId,
  );
  assert.equal(slugs.length, 14);
  assert.equal(runtimeQa.assets.length, 14);
  assert.equal(runtimeQa.networkEvidence.requests, 14);
  assert.equal(runtimeQa.networkEvidence.responses, 14);
  assert.equal(runtimeQa.networkEvidence.failures, 0);
  assert.equal(runtimeQa.independentReview.status, "blocked");
  assert.equal(runtimeQa.independentReview.formalMassingPassCount, 0);
  assert.equal(runtimeQa.independentReview.conditionalGeometryCount, 6);
  assert.equal(runtimeQa.independentReview.rebuildRequiredCount, 8);

  for (const slug of slugs) {
    const blendPath =
      `assets/models/source/tiers/xinhua-road/massing/${slug}-massing.blend`;
    const glbPath =
      `public/models/tiers/xinhua-road/massing/${slug}-massing.glb`;
    const canonicalPath =
      `test_artifacts/all-models/massing/test_${slug}-massing-canonical.png`;
    const sidePath =
      `test_artifacts/all-models/massing/test_${slug}-massing-side.png`;
    const threejsPath =
      `test_artifacts/all-models/massing/test_${slug}-massing-threejs.png`;
    const recordPath =
      `docs/research/build-records/tiers/xinhua-road/massing/${slug}-massing.json`;

    await Promise.all([
      access(new URL(blendPath, root)),
      access(new URL(canonicalPath, root)),
      access(new URL(sidePath, root)),
      access(new URL(threejsPath, root)),
    ]);

    const [record, glb] = await Promise.all([
      readJson(recordPath),
      readGlbJson(glbPath),
    ]);
    assert.equal(record.assetId, `building:xinhua-road:${slug}`);
    assert.equal(record.tier, "massing");
    assert.ok([
      "massing-rebuild-required-independent-review",
      "massing-generated-runtime-gate-blocked-evidence-and-walkaround",
    ].includes(record.status));
    assert.equal(record.outputs.blend, blendPath);
    assert.equal(record.outputs.glb, glbPath);
    assert.equal(record.glb.sha256, createHash("sha256").update(glb.buffer).digest("hex"));
    assert.equal(record.glb.bytes, glb.buffer.length);
    assert.ok(record.glb.bytes <= 160_000, `${slug} Massing 超出体积预算`);
    assert.equal(record.glb.nodes, glb.json.nodes.length);
    assert.equal(record.glb.meshes, glb.json.meshes.length);
    assert.equal(record.glb.materials, glb.json.materials.length);
    assert.equal(record.glb.images, (glb.json.images ?? []).length);
    assert.equal(record.glb.textures, (glb.json.textures ?? []).length);
    assert.equal(record.glb.images, 0);
    assert.equal(record.glb.textures, 0);
    assert.equal(record.glb.triangles, glbTriangles(glb.json));
    assert.ok(record.glb.triangles <= 1_200, `${slug} Massing 超出面数预算`);
    assert.equal(record.glb.auditStatus, "ok");
    assert.ok(record.glb.bounds.min.every(Number.isFinite));
    assert.ok(record.glb.bounds.max.every(Number.isFinite));
    assert.equal(record.outputs.previews.threejs, threejsPath);
    assert.ok(record.runtimeGate.status.startsWith("blocked-"));
    assert.equal(record.runtimeGate.cameraMode, "spring-clear");
    assert.equal(record.runtimeGate.blockerId, "none");
    assert.equal(record.runtimeGate.playable, true);
    assert.equal(record.runtimeGate.canvasCount, 1);
    assert.equal(record.runtimeGate.mapAcceptance, "required-before-formal-pass");
    assert.ok(record.runtimeGate.requiredActions.length > 0);

    const rootNode = glb.json.nodes[0];
    assert.equal(rootNode.translation, undefined, `${slug} 根节点不应带平移`);
    assert.equal(rootNode.rotation, undefined, `${slug} 根节点不应带旋转`);
    assert.equal(rootNode.scale, undefined, `${slug} 根节点不应带缩放`);
  }

  await access(
    new URL(
      "test_artifacts/all-models/massing/test_xinhua-road-massing-canonical-contact-sheet.png",
      root,
    ),
  );
  await access(
    new URL(
      "test_artifacts/all-models/massing/test_xinhua-road-massing-side-contact-sheet.png",
      root,
    ),
  );
  await access(
    new URL(
      "test_artifacts/all-models/massing/test_xinhua-road-massing-threejs-contact-sheet.png",
      root,
    ),
  );
  const checkRuntimeRecords = spawnSync(
    process.execPath,
    ["scripts/test_finalize_xinhua_road_massing_runtime_qa.mjs", "--check"],
    { cwd: new URL(".", root), encoding: "utf8" },
  );
  assert.equal(
    checkRuntimeRecords.status,
    0,
    checkRuntimeRecords.stderr || checkRuntimeRecords.stdout,
  );
});

test("专项证据清单的本地图片存在且 SHA-256 未漂移", async () => {
  const manifestPaths = [
    "docs/research/house-315-reference-manifest.json",
    "docs/research/one-step-garden-reference-manifest.json",
    "docs/research/villa-le-bec-reference-manifest.json",
    "docs/research/shanghai-orchestra-reference-manifest.json",
    "docs/research/xinhua-villas-211-reference-manifest.json",
    "docs/research/xinhua-villas-329-reference-manifest.json",
  ];
  for (const manifestPath of manifestPaths) {
    const manifest = await readJson(manifestPath);
    assert.ok(manifest.canonicalComparison.localPath);
    assert.ok(manifest.coverageMatrix);
    for (const photo of manifest.referencePhotos) {
      await access(new URL(photo.localPath, root));
      if (!photo.sha256) continue;
      const contents = await readFile(new URL(photo.localPath, root));
      assert.equal(
        createHash("sha256").update(contents).digest("hex"),
        photo.sha256,
        `${photo.localPath} 的 SHA-256 与清单不一致`,
      );
    }
  }
});

test("主 POI 清单限制卡片证据数量并显式阻断一步花园错绑来源", async () => {
  const manifest = await readJson("docs/research/poi-reference-manifest.json");
  assert.equal(manifest.rules.maximumReferencePhotosPerPoi, 3);
  for (const poi of manifest.pois) {
    assert.ok(
      poi.referencePhotos.length <= manifest.rules.maximumReferencePhotosPerPoi,
      `${poi.id} 的主清单照片超过卡片上限`,
    );
    for (const photo of poi.referencePhotos) {
      await access(new URL(photo.path, root));
    }
  }

  const oneStep = manifest.pois.find(({ id }) => id === "one-step-garden");
  assert.equal(oneStep.photoStatus, "verified-same-venue-multiple-volumes");
  assert.match(oneStep.evidenceNote, /不同体量，不得合并成一栋/);

  for (const id of [
    "house-315",
    "one-step-garden",
    "villa-le-bec",
    "shanghai-orchestra",
    "xinhua-villas-211",
    "xinhua-villas-329",
  ]) {
    const poi = manifest.pois.find((candidate) => candidate.id === id);
    await access(new URL(poi.referenceManifest, root));
    await access(new URL(poi.modelBrief, root));
  }
});
