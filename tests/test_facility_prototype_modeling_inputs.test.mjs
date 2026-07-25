import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relativePath) => JSON.parse(
  await readFile(path.join(root, relativePath), "utf8"),
);

const expectedPrototypeIds = [
  "prototype:facility:shangsheng-wayfinding-totem",
  "prototype:facility:shangsheng-cafe-pavilion",
  "prototype:facility:shangsheng-bicycle-parking",
  "prototype:facility:shangsheng-reading-terrace",
  "prototype:facility:shangsheng-fountain",
  "prototype:facility:shangsheng-main-entry",
  "prototype:facility:huashan-pond-boardwalk",
  "prototype:facility:huashan-basketball-court",
  "prototype:facility:huashan-bird-pergola",
  "prototype:facility:huashan-happiness-corner",
  "prototype:facility:xingfuli-reflecting-pool-hardscape",
  "prototype:facility:xingfuli-mixed-paving",
  "prototype:facility:xingfuli-vertical-garden",
  "prototype:facility:one-square-metre-action",
];

test("设施建模输入覆盖 14 个原型和 16 个实例", async () => {
  const [registry, placement, spec] = await Promise.all([
    readJson("docs/research/all-models-production-registry.json"),
    readJson("docs/research/model-placement-registry-20260725.json"),
    readJson("docs/research/facility-prototypes-massing-geometry-spec.json"),
  ]);
  assert.deepEqual(registry.facilityPrototypes, expectedPrototypeIds);
  assert.equal(spec.scope.prototypeCount, 14);
  assert.equal(spec.scope.instanceCount, 16);
  assert.equal(spec.prototypes.length, 14);
  assert.deepEqual(
    spec.prototypes.map(({ id }) => id),
    expectedPrototypeIds,
  );
  assert.equal(
    spec.prototypes.reduce(
      (total, prototype) => total + prototype.instanceCount,
      0,
    ),
    16,
  );
  assert.equal(placement.facilities.length, 16);
  assert.deepEqual(
    [...new Set(placement.facilities.map(({ prototype }) => prototype))].sort(),
    [...expectedPrototypeIds].sort(),
  );
});

test("联网证据全部本地化并保持 Observed / Inferred / Unknown 边界", async () => {
  const manifest = await readJson(
    "docs/research/facility-prototypes-reference-manifest.json",
  );
  assert.equal(manifest.status, "evidence-localized-binding-still-required");
  assert.equal(manifest.policy.sourceImagesAreReadOnly, true);
  assert.equal(manifest.policy.runtimeTextureUse, false);
  assert.equal(manifest.policy.logoReplication, false);
  assert.equal(manifest.sources.length, 5);
  assert.equal(manifest.assets.length, 11);
  for (const asset of manifest.assets) {
    await access(path.join(root, asset.path));
    assert.ok(asset.sourceId.startsWith("source:"));
    assert.ok(asset.binding);
    assert.ok(asset.observed.length > 0);
  }
  assert.deepEqual(
    manifest.coverage.stillNoDedicatedPhoto,
    [
      "prototype:facility:shangsheng-wayfinding-totem",
      "prototype:facility:shangsheng-cafe-pavilion",
      "prototype:facility:shangsheng-bicycle-parking",
      "prototype:facility:shangsheng-reading-terrace",
      "prototype:facility:huashan-pond-boardwalk",
      "prototype:facility:huashan-bird-pergola",
    ],
  );
});

test("华山幸福转角必须按 2026 官方实景重做，旧三门架禁止带入", async () => {
  const spec = await readJson(
    "docs/research/facility-prototypes-massing-geometry-spec.json",
  );
  const corner = spec.prototypes.find(
    ({ id }) => id === "prototype:facility:huashan-happiness-corner",
  );
  assert.equal(
    corner.massing.legacyCurrentAuthoredBounds.status,
    "legacy-inaccurate-do-not-carry-forward",
  );
  assert.ok(corner.existingEvidence.observed.some(
    (fact) => fact.includes("粉色心形环架"),
  ));
  assert.ok(corner.massing.recommendedGeometry.some(
    (decision) => decision.includes("心形环"),
  ));
  assert.ok(corner.massing.recommendedGeometry.some(
    (decision) => decision.includes("多级粉色坐阶"),
  ));
  assert.ok(corner.massing.recommendedGeometry.some(
    (decision) => decision.includes("曲线花池"),
  ));
  assert.equal(corner.identityGate.mayEnterIdentity, true);
  assert.match(corner.identityGate.status, /after-placement-overlay/);
});

test("篮球场、绿墙、喷泉和一平米行动不越过各自证据边界", async () => {
  const spec = await readJson(
    "docs/research/facility-prototypes-massing-geometry-spec.json",
  );
  const byId = new Map(
    spec.prototypes.map((prototype) => [prototype.id, prototype]),
  );
  const court = byId.get("prototype:facility:huashan-basketball-court");
  assert.equal(court.identityGate.mayEnterIdentity, false);
  assert.match(court.identityGate.status, /overlay-pending/);
  assert.ok(court.existingEvidence.observed.some(
    (fact) => fact.includes("入口闸机"),
  ));

  const verticalGarden = byId.get(
    "prototype:facility:xingfuli-vertical-garden",
  );
  assert.equal(verticalGarden.identityGate.mayEnterIdentity, true);
  assert.match(verticalGarden.identityGate.status, /side-gap/);
  assert.ok(verticalGarden.existingEvidence.observed.some(
    (fact) => fact.includes("连续高绿墙"),
  ));

  const fountain = byId.get("prototype:facility:shangsheng-fountain");
  assert.equal(fountain.identityGate.mayEnterIdentity, false);
  assert.ok(fountain.existingEvidence.observed.some(
    (fact) => fact.includes("不能逐一绑定"),
  ));

  const action = byId.get("prototype:facility:one-square-metre-action");
  assert.equal(
    action.existingEvidence.classification,
    "product-authored-interactive-installation-plus-program-context-not-shape",
  );
  assert.ok(action.existingEvidence.programContextObserved.some(
    (fact) => fact.includes("不展示、也不证明"),
  ));
});

test("设施 Brief 已定义工具、视角、身份构件、预算和真实地图验收", async () => {
  const brief = await readFile(
    path.join(root, "docs/research/facility-prototypes-massing-model-brief.md"),
    "utf8",
  );
  for (const marker of [
    "工具预检",
    "视角覆盖矩阵",
    "观察、推断与未知",
    "主体独有识别构件",
    "预算与文件",
    "真实地图",
    "独立审查",
  ]) {
    assert.ok(brief.includes(marker), `Brief 缺少 ${marker}`);
  }
  assert.ok(brief.includes("14 个 facility prototypes / 16 个运行时实例"));
  assert.ok(brief.includes("15 个 GLB"));
  assert.ok(brief.includes("不能宣称正式 Massing 通过"));
});

test("设施 Massing 15 个资产的 Blender、GLB、预览、记录和预算可追溯", async () => {
  const manifest = await readJson(
    "docs/research/facility-prototypes-massing-manifest.json",
  );
  assert.equal(manifest.semanticPrototypeCount, 14);
  assert.equal(manifest.assetCount, 15);
  assert.equal(manifest.fountainInstanceAssetCount, 2);
  assert.equal(manifest.assets.length, 15);
  assert.equal(manifest.zeroImageTextureAssetCount, 15);
  assert.equal(manifest.rootTransformCleanAssetCount, 15);
  assert.equal(manifest.formalMassingPassCount, 0);
  assert.equal(manifest.isolatedRuntimePassCount, 15);
  assert.equal(
    manifest.runtimeIntegration.realMapLoad,
    "passed-15-of-15",
  );
  assert.equal(
    manifest.runtimeIntegration.realMapPlacement,
    "blocked-0-of-15-formal-pass",
  );

  for (const asset of manifest.assets) {
    const files = [
      asset.outputs.blend,
      asset.outputs.glb,
      asset.outputs.previews.canonical,
      asset.outputs.previews.side,
      `docs/research/build-records/tiers/facility-prototypes/massing/${asset.outputSlug}-massing.json`,
    ];
    await Promise.all(files.map((file) => access(path.join(root, file))));
    const glbBytes = await readFile(path.join(root, asset.outputs.glb));
    const digest = createHash("sha256").update(glbBytes).digest("hex");
    assert.equal(digest, asset.glb.sha256, asset.outputSlug);
    assert.equal(asset.glb.images, 0, asset.outputSlug);
    assert.equal(asset.glb.textures, 0, asset.outputSlug);
    assert.equal(asset.glb.animations, 0, asset.outputSlug);
    assert.deepEqual(asset.glb.transformedNodes, [], asset.outputSlug);
    assert.ok(
      Object.keys(asset.glb.materialBaseColors ?? {}).length > 0,
      `${asset.outputSlug} 缺少导出材质颜色审计`,
    );
    for (const baseColor of Object.values(asset.glb.materialBaseColors)) {
      const defaultGray = [
        0.800000011920929,
        0.800000011920929,
        0.800000011920929,
        1,
      ];
      assert.equal(
        baseColor.every((value, index) => (
          Math.abs(value - defaultGray[index]) <= 1e-6
        )),
        false,
        `${asset.outputSlug} 仍是默认导出灰`,
      );
    }
    assert.ok(asset.glb.triangles <= asset.budget.maxTriangles, asset.outputSlug);
    assert.ok(asset.glb.nodes <= asset.budget.maxNodes, asset.outputSlug);
    assert.ok(asset.glb.materials <= asset.budget.maxMaterials, asset.outputSlug);
    assert.ok(asset.glb.images <= asset.budget.maxImages, asset.outputSlug);
    assert.ok(asset.glb.bytes <= asset.budget.maxBinaryBytes, asset.outputSlug);
    assert.equal(asset.formalMassingPass, false, asset.outputSlug);
    assert.equal(
      asset.runtimeGate.status,
      "isolated-and-map-load-passed-placement-and-collision-blocked",
      asset.outputSlug,
    );
    assert.equal(asset.runtimeGate.gallery, "passed", asset.outputSlug);
    assert.equal(
      asset.runtimeGate.mapPlacement,
      "blocked-pending-position-scale-yaw-review",
      asset.outputSlug,
    );
    await access(path.join(root, asset.runtimeGate.screenshot));
    await access(path.join(root, asset.runtimeGate.mapScreenshot));
  }
});

test("设施 Massing 已接入逐资产原尺度隔离入口与真实地图观察入口", async () => {
  const [sceneSource, experienceSource, worldSource] = await Promise.all([
    readFile(
      path.join(root, "app/scene/facility-prototype-massing.tsx"),
      "utf8",
    ),
    readFile(path.join(root, "app/xinhua-experience.tsx"), "utf8"),
    readFile(path.join(root, "app/scene/xinhua-world.tsx"), "utf8"),
  ]);
  assert.match(sceneSource, /facility-prototypes-massing-manifest\.json/);
  assert.match(sceneSource, /displayScale: 1/);
  assert.match(sceneSource, /authoredScalePreserved: true/);
  assert.match(sceneSource, /FacilityPrototypeMassingQaCamera/);
  assert.match(sceneSource, /FacilityPrototypeMassingMapAssets/);
  assert.match(sceneSource, /changesPlacement: false/);
  assert.match(experienceSource, /qaFacilityPrototypeTier/);
  assert.match(experienceSource, /qaFacilityPrototypeId/);
  assert.match(experienceSource, /qaFacilityPrototypeMapTier/);
  assert.match(experienceSource, /qaFacilityPrototypeMapId/);
  assert.match(worldSource, /FacilityPrototypeMassingQaScene/);
  assert.match(worldSource, /facilityPrototypeMassingQaId/);
  assert.match(worldSource, /FacilityPrototypeMapQaCamera/);
  assert.match(worldSource, /facilityPrototypeMapQaId/);
});

test("设施浏览器证据区分加载通过和地图正式阻断", async () => {
  const [qa, isolatedEvidence, mapEvidence] = await Promise.all([
    readJson("docs/research/facility-prototypes-massing-runtime-qa.json"),
    readJson(
      "test_artifacts/all-models/massing/facility-prototypes/"
      + "test_facility-prototypes-massing-browser-evidence.json",
    ),
    readJson(
      "test_artifacts/all-models/massing/facility-prototypes/"
      + "test_facility-prototypes-massing-map-browser-evidence.json",
    ),
  ]);
  assert.equal(isolatedEvidence.results.length, 15);
  assert.equal(mapEvidence.results.length, 15);
  assert.equal(qa.summary.isolatedRuntimePassCount, 15);
  assert.equal(qa.summary.mapRuntimeLoadPassCount, 15);
  assert.equal(qa.summary.mapContextObservationCount, 15);
  assert.equal(qa.summary.mapPlacementPassCount, 0);
  assert.equal(qa.summary.collisionAndPassagePassCount, 0);
  assert.equal(qa.summary.formalMassingPassCount, 0);
  for (const result of qa.results) {
    assert.equal(result.isolatedRuntimePass, true, result.assetId);
    assert.equal(result.mapRuntimeLoadPass, true, result.assetId);
    assert.equal(result.mapPlacementPass, false, result.assetId);
    assert.equal(result.formalMassingPass, false, result.assetId);
    assert.match(result.mapObservation.route, /qaFacilityPrototypeMapTier=massing/);
    await access(path.join(root, result.screenshots.threejs));
    await access(path.join(root, result.screenshots.map));
    await access(path.join(root, result.screenshots.triptych));
  }
});
