import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";
import { gzipSync } from "node:zlib";
import {
  classifyProgressiveNetwork,
  estimateProgressiveDownlinkMbps,
  WEAK_NETWORK_DOWNLINK_Mbps,
} from "../app/scene/progressive-loading.ts";
import {
  planarDistanceToBuildingFootprints,
  resolveProgressiveBuildingTier,
  visibleProgressiveBuildingTier,
} from "../app/scene/progressive-building-stage.ts";
import {
  PRODUCTION_BUILDING_QUALITY_MANIFEST,
  XINHUA_ROAD_BUILDING_QUALITY_MANIFEST,
  XINHUA_ROAD_HERO_ENTER_DISTANCE,
  XINHUA_ROAD_HERO_EXIT_DISTANCE,
  XINHUA_ROAD_IDENTITY_KIND_BY_ID,
  xinhuaRoadDistanceHeroIds,
} from "../app/scene/xinhua-road-identity-contract.ts";
import {
  planarDistanceToLandmarkFootprint,
} from "../app/scene/xinhua-road-placement.mjs";
import { BUILDING_ASSETS } from "../app/asset-library/asset-data.ts";
import roadData from "../app/scene/xinhua-road-landmarks-data.json" with { type: "json" };

const root = new URL("../", import.meta.url);

test("核心建筑按最近 footprint 边缘距离切换，而不是按园区中心点", () => {
  const footprints = [
    { minX: 10, maxX: 20, minZ: 30, maxZ: 40 },
    { minX: -8, maxX: -4, minZ: 2, maxZ: 6 },
  ];
  assert.equal(planarDistanceToBuildingFootprints([15, 35], footprints), 0);
  assert.equal(planarDistanceToBuildingFootprints([23, 44], footprints), 5);
  assert.equal(planarDistanceToBuildingFootprints([0, 4], footprints), 4);
});

test("网络档只影响加载速度，不得让白模消失或把近景 Hero 锁回 Identity", () => {
  assert.equal(XINHUA_ROAD_HERO_ENTER_DISTANCE, 40);
  assert.equal(XINHUA_ROAD_HERO_EXIT_DISTANCE, 55);
  assert.equal(WEAK_NETWORK_DOWNLINK_Mbps, 2.5);
  assert.equal(
    classifyProgressiveNetwork(),
    "standard",
    "缺少 Network Information API 不能把 Safari 永久锁为弱网",
  );
  assert.equal(
    classifyProgressiveNetwork({}, 1),
    "standard",
    "启动脚本测速偏低不能让 Safari 在进入后把 Hero 撤回 Identity",
  );
  assert.equal(classifyProgressiveNetwork({}, 5), "standard");
  assert.equal(classifyProgressiveNetwork({ downlink: 5, effectiveType: "4g" }), "standard");
  assert.equal(classifyProgressiveNetwork({ saveData: true, downlink: 8 }), "weak");
  assert.equal(classifyProgressiveNetwork({ effectiveType: "3g" }), "weak");
  assert.equal(classifyProgressiveNetwork({ downlink: 1.8 }), "weak");
  assert.ok(estimateProgressiveDownlinkMbps([
    {
      startTime: 0,
      responseEnd: 800,
      encodedBodySize: 500_000,
      transferSize: 500_300,
    },
  ]) >= 4.9);
  assert.ok(estimateProgressiveDownlinkMbps([
    {
      startTime: 0,
      responseEnd: 4_000,
      encodedBodySize: 500_000,
      transferSize: 500_300,
    },
  ]) < 2.5);
  assert.equal(estimateProgressiveDownlinkMbps([
    {
      startTime: 0,
      responseEnd: 40,
      encodedBodySize: 500_000,
      transferSize: 0,
    },
  ]), undefined, "缓存命中的启动脚本不应被误当作慢速网络证据");

  assert.equal(resolveProgressiveBuildingTier({
    mode: "intro",
    networkProfile: "standard",
    distance: 0,
    previousTier: "identity",
    fullEnterDistance: 72,
    fullExitDistance: 88,
  }), "massing");
  assert.equal(resolveProgressiveBuildingTier({
    mode: "explore",
    networkProfile: "weak",
    distance: 0,
    previousTier: "identity",
    fullEnterDistance: 72,
    fullExitDistance: 88,
  }), "full", "弱网近景仍请求 Hero，并在加载期间继续显示 Identity");
  assert.equal(
    visibleProgressiveBuildingTier("overview", "standard", "massing"),
    "identity",
    "封面切到全览的首帧不得暴露 Massing 方盒",
  );
  assert.equal(
    visibleProgressiveBuildingTier("explore", "standard", "massing"),
    "identity",
    "封面切到游玩态的首帧不得暴露 Massing 方盒",
  );
  assert.equal(
    visibleProgressiveBuildingTier("overview", "standard", "full"),
    "identity",
    "从近景返回全览时必须在首次提交同步钳制旧 Hero",
  );
  assert.equal(
    visibleProgressiveBuildingTier("explore", "weak", "full"),
    "full",
    "切换弱网时不得把已经显示的 Hero 降回 Identity",
  );
  assert.equal(
    visibleProgressiveBuildingTier("intro", "standard", "full"),
    "massing",
    "返回封面时不得泄漏旧 Hero",
  );
  assert.equal(resolveProgressiveBuildingTier({
    mode: "overview",
    networkProfile: "standard",
    distance: 0,
    previousTier: "identity",
    fullEnterDistance: 72,
    fullExitDistance: 88,
  }), "identity", "全览不得因为靠近建筑或存在详情目标而加载 Hero");
  assert.equal(resolveProgressiveBuildingTier({
    mode: "explore",
    networkProfile: "standard",
    distance: 71,
    previousTier: "identity",
    fullEnterDistance: 72,
    fullExitDistance: 88,
  }), "full", "本地游览进入近景距离后加载 Hero");
  assert.equal(resolveProgressiveBuildingTier({
    mode: "explore",
    networkProfile: "standard",
    distance: 80,
    previousTier: "identity",
    fullEnterDistance: 72,
    fullExitDistance: 88,
  }), "identity", "尚未进入阈值时保持 Identity");
  assert.equal(resolveProgressiveBuildingTier({
    mode: "explore",
    networkProfile: "standard",
    distance: 80,
    previousTier: "full",
    fullEnterDistance: 72,
    fullExitDistance: 88,
  }), "full", "已显示 Hero 时使用较远退出阈值防止边界闪烁");
  assert.equal(resolveProgressiveBuildingTier({
    mode: "explore",
    networkProfile: "standard",
    distance: 89,
    previousTier: "full",
    fullEnterDistance: 72,
    fullExitDistance: 88,
  }), "identity", "超过退出阈值后恢复 Identity");

  const cinema = roadData.landmarks.find(({ id }) => id === "shanghai-cinema");
  assert.ok(cinema);
  const worldPointAtFootprintDistance = (distance) => {
    const localX = cinema.localBounds.maxX + distance / cinema.scale;
    const sourceZ = (cinema.localBounds.minZ + cinema.localBounds.maxZ) / 2;
    const cosine = Math.cos(cinema.yaw);
    const sine = Math.sin(cinema.yaw);
    return [
      cinema.position[0] + cinema.scale * (cosine * localX - sine * sourceZ),
      cinema.position[1] + cinema.scale * (-sine * localX - cosine * sourceZ),
    ];
  };
  assert.equal(planarDistanceToLandmarkFootprint(cinema.position, cinema), 0);
  assert.ok(
    Math.abs(
      planarDistanceToLandmarkFootprint(
        worldPointAtFootprintDistance(7),
        cinema,
      ) - 7,
    ) < 1e-9,
    "旋转建筑必须按真实轮廓而不是中心点计算距离",
  );
  assert.equal(
    xinhuaRoadDistanceHeroIds({
      loadMode: "overview",
      focusPosition: cinema.position,
      mountedModelIds: new Set(["shanghai-cinema"]),
    }).size,
    0,
    "从近景返回全览时，即使旧 Hero 已挂载且人物仍在建筑原点，也必须同步清空",
  );
  assert.equal(
    xinhuaRoadDistanceHeroIds({
      loadMode: "explore",
      focusPosition: cinema.position,
      mountedModelIds: new Set(),
    }).has("shanghai-cinema"),
    true,
    "本地游览进入实际近景距离后请求上海影城 Hero",
  );
  const hysteresisPosition = worldPointAtFootprintDistance(
    XINHUA_ROAD_HERO_ENTER_DISTANCE + 5,
  );
  assert.equal(
    xinhuaRoadDistanceHeroIds({
      loadMode: "explore",
      focusPosition: hysteresisPosition,
      mountedModelIds: new Set(),
    }).has("shanghai-cinema"),
    false,
    "未加载 Hero 时，进入阈值之外仍保持 Identity",
  );
  assert.equal(
    xinhuaRoadDistanceHeroIds({
      loadMode: "explore",
      focusPosition: hysteresisPosition,
      mountedModelIds: new Set(["shanghai-cinema"]),
    }).has("shanghai-cinema"),
    true,
    "已加载 Hero 时，在退出阈值以内继续保留",
  );
  assert.equal(
    xinhuaRoadDistanceHeroIds({
      loadMode: "explore",
      focusPosition: worldPointAtFootprintDistance(
        XINHUA_ROAD_HERO_EXIT_DISTANCE + 1,
      ),
      mountedModelIds: new Set(["shanghai-cinema"]),
    }).has("shanghai-cinema"),
    false,
    "超过退出阈值后释放 Hero",
  );
  assert.deepEqual(
    [...xinhuaRoadDistanceHeroIds({
      loadMode: "explore",
      focusPosition: cinema.start,
      mountedModelIds: new Set(),
    })].sort(),
    ["one-step-garden", "shanghai-cinema"],
    "上海影城快速定位只复用距离判定，阈值内建筑均可进入 Hero，不能按点击目标过滤",
  );
});

test("生产主世界让全部建筑遵守 Massing、Identity、Hero 三层和两场景合同", async () => {
  const [
    world,
    experience,
    loader,
    roadMassing,
    roadDataText,
    roadFull,
    xingfuli,
    shangsheng,
    huashan,
    featureBoundary,
  ] = await Promise.all([
    readFile(new URL("app/scene/xinhua-world.tsx", root), "utf8"),
    readFile(new URL("app/xinhua-experience.tsx", root), "utf8"),
    readFile(new URL("app/xinhua-experience-loader.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-road-massing.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-road-landmarks-data.json", root), "utf8"),
    readFile(new URL("app/scene/xinhua-road-landmarks.tsx", root), "utf8"),
    readFile(new URL("app/scene/xingfuli-block.tsx", root), "utf8"),
    readFile(new URL("app/scene/shangsheng-xinsuo-block.tsx", root), "utf8"),
    readFile(new URL("app/scene/huashan-green-block.tsx", root), "utf8"),
    readFile(new URL("app/progressive-feature-boundary.tsx", root), "utf8"),
  ]);
  const roadData = JSON.parse(roadDataText);

  assert.match(loader, /lazy\(loadXinhuaExperience\)/);
  assert.match(loader, /data-progressive-stage="shell"/);
  assert.match(loader, /ProgressiveFeatureBoundary/);
  assert.match(loader, /重新连接/);
  assert.match(featureBoundary, /getDerivedStateFromError/);
  assert.match(featureBoundary, /previous\.resetKey !== this\.props\.resetKey/);
  assert.match(experience, /data-progressive-stage=\{ready \? "playable" : "booting"\}/);
  assert.match(experience, /performance\.mark\("xinhua-world-playable"\)/);
  assert.match(experience, /<FirstPlayableFrame onReady=\{\(\) => setRendererReady\(true\)\} \/>/);
  assert.match(experience, /const ready = rendererReady && characterIdentityStatus !== null/);
  assert.match(experience, /<RainIdentityPreloader onSettled=\{settleCharacterIdentity\} \/>/);
  assert.doesNotMatch(experience, /onCreated=/);
  assert.match(experience, /\{ready && \(\s*<ProgressiveFeatureBoundary/);
  assert.doesNotMatch(experience, /ready && networkProfile === "standard"/);
  assert.match(experience, /ProgressiveFeatureBoundary/);
  assert.match(
    experience,
    /setOverviewStartPosition\(playerPosition\.current\);\s+setDestinationPreset\(undefined\);/,
  );
  assert.match(world, /fallback=\{<XinhuaRoadMassing identity \/>\}/);
  assert.match(world, /<XinhuaRoadMassing identity=\{showDetailModels\} \/>/);
  assert.match(
    world,
    /loadMode=\{landmarkLoadMode\}/,
  );
  assert.doesNotMatch(
    world,
    /loadMode=\{networkProfile === "standard" \? landmarkLoadMode : "overview"\}/,
  );
  assert.doesNotMatch(world, /detailed=\{networkProfile === "standard"\}/);
  assert.match(world, /<WandererCharacter outerRef=\{outer\} \/>/);
  assert.match(world, /useProgressiveBuildingTier/);
  assert.match(world, /fullEnterDistance: CORE_BUILDING_HERO_DISTANCE\.xingfuli\.enterDistance/);
  assert.match(world, /fullExitDistance: CORE_BUILDING_HERO_DISTANCE\.xingfuli\.exitDistance/);
  assert.match(world, /fullEnterDistance: CORE_BUILDING_HERO_DISTANCE\.shangsheng\.enterDistance/);
  assert.match(world, /fullExitDistance: CORE_BUILDING_HERO_DISTANCE\.shangsheng\.exitDistance/);
  assert.match(world, /fullEnterDistance: CORE_BUILDING_HERO_DISTANCE\.huashan\.enterDistance/);
  assert.match(world, /fullExitDistance: CORE_BUILDING_HERO_DISTANCE\.huashan\.exitDistance/);
  assert.doesNotMatch(world, /detailPresetTargetsBuilding|detailActive|priorityPreset/);
  assert.match(world, /<HuashanGreenBlock[\s\S]*?showEnvironmentDetails=\{mode === "explore"\}[\s\S]*?stage=\{huashanTier\}/);
  assert.match(
    world,
    /cameraFocus\.current\.copy\(position\.current\);\s+onPositionRef\.current\(\[position\.current\.x, position\.current\.z\]\);/,
  );
  assert.match(world, /performance\.mark\("xinhua-first-control-response"\)/);
  assert.ok(
    world.match(/markFirstProgressiveControlResponse\(\);/g)?.length >= 2,
    "全览与近景输入都必须留下首次控制响应标记",
  );
  assert.match(roadMassing, /XINHUA_ROAD_LANDMARKS\.map/);
  assert.match(roadMassing, /hiddenLandmarkIds\?\.has\(landmark\.id\)/);
  assert.match(roadMassing, /stage: identity \? "identity" : "massing"/);
  assert.match(roadMassing, /<LandmarkIdentityMiniature/);
  assert.match(roadMassing, /architectural-miniature/);
  assert.match(roadMassing, /kind === "cinema"/);
  assert.match(roadMassing, /kind === "villa-row"/);
  assert.match(roadMassing, /kind === "orchestra-hall"/);
  assert.match(roadMassing, /kind === "pocket-park"/);
  assert.match(roadMassing, /name="identity-four-sided-facade"/);
  assert.match(roadMassing, /visibleDirections: 4/);
  assert.match(roadMassing, /mergedFacadeDrawCalls: 1/);
  assert.match(roadMassing, /mergeGeometries\(pieces, false\)/);
  assert.match(roadMassing, /IDENTITY_VISUAL_SCALE = \[0\.68, 0\.78, 0\.68\]/);
  assert.match(roadMassing, /compact-architectural-identity/);
  assert.match(roadMassing, /<torusGeometry/);
  assert.match(roadMassing, /landmark\.id === "film-art-center"\) return 14\.4/);
  assert.doesNotMatch(
    roadMassing,
    /landmark\.id === "film-art-center"\) return 22/,
    "电影艺术中心 Identity 不得继续以高于 Full 的巨型体块占据街道视野",
  );
  assert.ok(roadData.landmarks.length >= 14);
  assert.deepEqual(
    Object.keys(XINHUA_ROAD_IDENTITY_KIND_BY_ID).sort(),
    roadData.landmarks.map(({ id }) => id).sort(),
    "全览 Identity 建筑缩影必须覆盖每一个新华路地标",
  );
  assert.ok(
    new Set(Object.values(XINHUA_ROAD_IDENTITY_KIND_BY_ID)).size >= 12,
    "全览缩影不能退化成所有地标共用一种方盒轮廓",
  );
  assert.match(roadFull, /function useDistanceHeroLandmarkIds/);
  assert.match(roadFull, /xinhuaRoadDistanceHeroIds/);
  assert.match(roadFull, /XINHUA_ROAD_HERO_SAMPLE_SECONDS/);
  assert.match(roadFull, /return xinhuaRoadDistanceHeroIds\(\{/);
  assert.match(roadFull, /focusPosition: focusPosition\.current/);
  assert.match(roadFull, /const shouldMountModel = mountedModelIds\.has\(landmark\.id\)/);
  assert.match(roadFull, /hiddenLandmarkIds=\{mountedModelIds\}/);
  assert.doesNotMatch(roadFull, /landmarkMatchesPreset|priorityPreset|xinhuaRoadDetailHeroId/);
  assert.match(roadFull, /<XinhuaRoadMassing identity hiddenLandmarkIds=\{mountedModelIds\} \/>/);
  assert.match(xingfuli, /resolvedStage === "massing"/);
  assert.match(xingfuli, /resolvedStage === "identity" \|\| resolvedStage === "full"/);
  assert.match(xingfuli, /<LightweightXingfuliTrees \/>/);
  assert.match(xingfuli, /identityReady && environmentDetailed && \([\s\S]*?<ReflectingPoolDynamicDetails \/>[\s\S]*?<LaneFurniture \/>/);
  assert.match(xingfuli, /<ProgressivePlaneTreeInstances/);
  assert.match(shangsheng, /if \(stage === "massing"\)/);
  assert.match(shangsheng, /const loadFullModels = stage === "full"/);
  assert.match(shangsheng, /if \(!loadFullModels\)/);
  assert.match(shangsheng, /ProgressiveFeatureBoundary/);
  assert.match(huashan, /stage === "massing"/);
  assert.match(huashan, /<ParkServiceBuildingProxy identity \/>/);
  assert.match(huashan, /environmentDetailed && \([\s\S]*?<UnderstoryInstances \/>[\s\S]*?<ParkFacilities showServiceBuilding=\{stage === "full"\} \/>/);
  assert.match(huashan, /stage !== "full" && <ParkServiceBuildingProxy identity \/>/);
  assert.match(shangsheng, /<CampusLandscape detailed=\{environmentDetailed\} \/>/);
  assert.match(world, /showEnvironmentDetails=\{mode === "explore"\}/);
  assert.match(world, /footprints: XINGFULI_WORLD_BUILDING_FOOTPRINTS/);
});

test("全世界生产 manifest 覆盖三档资产、共享空间参数和证据状态", async () => {
  const ids = Object.keys(XINHUA_ROAD_BUILDING_QUALITY_MANIFEST).sort();
  assert.deepEqual(
    ids,
    Object.keys(XINHUA_ROAD_IDENTITY_KIND_BY_ID).sort(),
    "三档资产 manifest 必须覆盖每个正式地标",
  );
  for (const entry of Object.values(XINHUA_ROAD_BUILDING_QUALITY_MANIFEST)) {
    assert.equal(entry.hero.strategy, "distance-state-glb");
    assert.deepEqual(entry.hero.loading, {
      enterDistance: XINHUA_ROAD_HERO_ENTER_DISTANCE,
      exitDistance: XINHUA_ROAD_HERO_EXIT_DISTANCE,
      sampleSeconds: 0.2,
    });
    assert.ok(entry.hero.model.endsWith(".glb"));
    assert.equal(entry.identity.requiredBeforeMapVisible, true);
    assert.equal(entry.massing.visibility, "cover-only");
    assert.equal(entry.collision, "stable-shared-structure");
    assert.ok(entry.shared.position.length === 2);
    assert.equal(typeof entry.shared.yaw, "number");
    assert.equal(typeof entry.shared.scale, "number");
  }
  const cinema = XINHUA_ROAD_BUILDING_QUALITY_MANIFEST["shanghai-cinema"];
  assert.equal(cinema.identity.strategy, "custom-landmark-hybrid");
  assert.equal(
    cinema.identity.model,
    "/models/xinhua-road/shanghai-cinema-hybrid-identity.glb",
  );
  assert.equal(cinema.identity.cacheVersion, "20260722-hybrid-1");
  assert.equal(cinema.hero.model, "/models/xinhua-road/shanghai-cinema.glb");

  const productionIds = Object.keys(PRODUCTION_BUILDING_QUALITY_MANIFEST).sort();
  assert.deepEqual(
    productionIds,
    [
      ...ids,
      "xingfuli-west",
      "xingfuli-center",
      "xingfuli-east",
      "sun-ke-villa",
    ].sort(),
    "18 栋生产清单必须覆盖新华路 14 个地标、幸福里三分区与孙科别墅",
  );
  assert.equal(productionIds.length, 18);
  assert.deepEqual(
    productionIds,
    BUILDING_ASSETS.map(({ id }) => id).sort(),
    "生产质量 manifest 必须与资产后台的 18 栋 stable asset ID 完全一致",
  );
  assert.equal(productionIds.includes("huashan"), false);
  assert.equal(productionIds.includes("shangsheng"), false);
  assert.equal(productionIds.includes("xingfuli"), false);
  for (const entry of Object.values(PRODUCTION_BUILDING_QUALITY_MANIFEST)) {
    assert.ok(entry.hero.assets.length > 0);
    assert.match(entry.hero.strategy, /^distance-state-/);
    assert.ok(entry.hero.loading.exitDistance > entry.hero.loading.enterDistance);
    assert.equal(entry.hero.loading.sampleSeconds, 0.2);
    assert.ok(entry.identity.assets.length > 0);
    assert.equal(entry.identity.requiredBeforeMapVisible, true);
    assert.equal(entry.massing.visibility, "cover-only");
    assert.ok(entry.massing.parametersSource.length > 0);
    assert.ok(entry.shared.transformSource.length > 0);
    assert.ok(entry.shared.collisionSource.length > 0);
    assert.ok(["complete", "accepted-with-followup", "migration-required"]
      .includes(entry.evidence.status));
    for (const field of [
      "heroBuildRecords",
      "identityBuildRecords",
      "massingBuildRecords",
      "canonicalScreenshots",
      "sideScreenshots",
      "rearScreenshots",
      "runtimeScreenshots",
      "resourceMetrics",
      "drawCallMetrics",
      "gaps",
    ]) {
      assert.ok(Array.isArray(entry.evidence[field]), `${entry.buildingId}.${field} 必须是数组`);
    }
    if (entry.evidence.status !== "migration-required") {
      const evidencePaths = [
        ...entry.evidence.heroBuildRecords,
        ...entry.evidence.identityBuildRecords,
        ...entry.evidence.massingBuildRecords,
        ...entry.evidence.canonicalScreenshots,
        ...entry.evidence.sideScreenshots,
        ...entry.evidence.rearScreenshots,
        ...entry.evidence.runtimeScreenshots,
        ...entry.evidence.resourceMetrics,
        ...entry.evidence.drawCallMetrics,
      ];
      for (const evidencePath of evidencePaths) {
        await stat(new URL(evidencePath, root));
      }
      for (const drawCallPath of entry.evidence.drawCallMetrics) {
        const metrics = await readFile(new URL(drawCallPath, root), "utf8");
        assert.match(
          metrics,
          /"drawCalls"\s*:/,
          `${entry.buildingId} 的 drawCallMetrics 必须真的包含 drawCalls 字段`,
        );
      }
    }
  }
  const productionCinema = PRODUCTION_BUILDING_QUALITY_MANIFEST["shanghai-cinema"];
  assert.equal(productionCinema.identity.strategy, "custom-landmark-hybrid");
  assert.ok(productionCinema.evidence.identityBuildRecords
    .includes("docs/research/build-records/shanghai-cinema-hybrid-identity.json"));
  assert.ok(productionCinema.evidence.resourceMetrics
    .includes("test_artifacts/test_shanghai-cinema_hybrid_metrics.json"));
  for (const segment of ["west", "center", "east"]) {
    const productionXingfuli =
      PRODUCTION_BUILDING_QUALITY_MANIFEST[`xingfuli-${segment}`];
    assert.equal(productionXingfuli.evidence.status, "accepted-with-followup");
    assert.deepEqual(
      productionXingfuli.evidence.identityBuildRecords,
      ["docs/research/build-records/xingfuli-identity.json"],
    );
    assert.deepEqual(
      productionXingfuli.evidence.massingBuildRecords,
      ["docs/research/build-records/xingfuli-massing.json"],
    );
    assert.deepEqual(productionXingfuli.evidence.drawCallMetrics, []);
    assert.ok(productionXingfuli.shared.transformSource.includes("XINGFULI_POSITION"));
    assert.ok(productionXingfuli.shared.transformSource
      .includes("XINGFULI_LONGITUDINAL_SCALE"));
    assert.ok(productionXingfuli.shared.collisionSource
      .includes("XINGFULI_WORLD_OBSTACLES"));
    assert.ok(productionXingfuli.evidence.gaps.some((gap) => gap.includes("MCP")));
    assert.ok(productionXingfuli.evidence.gaps.some((gap) => gap.includes("draw-call")));
  }
  const sunKeVilla = PRODUCTION_BUILDING_QUALITY_MANIFEST["sun-ke-villa"];
  assert.equal(sunKeVilla.evidence.status, "migration-required");
  assert.deepEqual(sunKeVilla.hero.assets, ["/models/shangsheng/sun-ke-villa.glb"]);
  assert.deepEqual(sunKeVilla.identity.assets, ["recipe:SunKeVillaFallback"]);
  assert.ok(sunKeVilla.evidence.gaps.some((gap) => gap.includes("MCP")));
});

test("最高优先级合同明确全览固定 Identity、进入仅定位、本地游览只按距离切换", async () => {
  const contract = await readFile(
    new URL("docs/research/building-quality-tiers-and-loading-contract.md", root),
    "utf8",
  );
  assert.match(contract, /地图和全览模式始终展示 Identity/);
  assert.match(contract, /“进入”，只把人物和相机快速定位到对应地点/);
  assert.match(contract, /切换依据只有空间距离/);
  assert.match(contract, /快速定位后与自然步行到达完全复用同一条距离判定路径/);
  assert.match(contract, /当前只有上海影城的 Hybrid Identity 达到本合同参考标准/);
  assert.doesNotMatch(contract, /切换依据是明确的详情状态，不是地图中的空间距离/);
});

test("首个开始路径包含 Identity GLTF 解析但排除 Hero 与后处理，并满足 5Mbps 预算", async () => {
  const assetDirectory = new URL("dist-static/assets/", root);
  const assetNames = (await readdir(assetDirectory)).filter((name) => name.endsWith(".js"));
  const playablePrefixes = [
    "index-",
    "xinhua-experience-",
    "xinhua-road-massing-",
    "rain-character-assets-",
    "Gltf-",
  ];
  const playableNames = playablePrefixes.map((prefix) => {
    const matches = assetNames.filter((name) => name.startsWith(prefix));
    assert.equal(matches.length, 1, `缺少或重复启动分块：${prefix}`);
    return matches[0];
  });
  const playableBuffers = await Promise.all(
    playableNames.map((name) => readFile(new URL(name, assetDirectory))),
  );
  const playableGzipBytes = playableBuffers.reduce(
    (total, buffer) => total + gzipSync(buffer).byteLength,
    0,
  );
  const entryName = playableNames.find((name) => name.startsWith("index-"));
  const entryBytes = (await stat(new URL(entryName, assetDirectory))).size;
  const baselineSingleBundleGzipBytes = 473_360;
  const transferAt5MbpsMs = playableGzipBytes * 8 / 5_000_000 * 1_000;

  assert.ok(entryBytes < 250_000, `轻量入口过大：${entryBytes}B`);
  assert.ok(
    playableGzipBytes < baselineSingleBundleGzipBytes * 0.85,
    `包含 Identity 解析器的开始路径压缩后仍有 ${playableGzipBytes}B`,
  );
  assert.ok(transferAt5MbpsMs < 650, `5Mbps 纯 JS 传输预算超限：${transferAt5MbpsMs}ms`);
  for (const deferredPrefix of [
    "visual-effect-composer-",
    "detailed-wanderer-character-",
    "xingfuli-architecture-model-",
    "shangsheng-full-models-",
  ]) {
    assert.ok(
      assetNames.some((name) => name.startsWith(deferredPrefix)),
      `应存在独立延后分块：${deferredPrefix}`,
    );
  }
});
