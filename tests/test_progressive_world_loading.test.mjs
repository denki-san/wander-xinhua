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
  resolveProgressiveBuildingTier,
  visibleProgressiveBuildingTier,
} from "../app/scene/progressive-building-stage.ts";
import { XINHUA_ROAD_IDENTITY_KIND_BY_ID } from "../app/scene/xinhua-road-identity-contract.ts";

const root = new URL("../", import.meta.url);

test("网络策略在 5Mbps 保留 Full 能力，并让省流与弱网封顶 Identity", () => {
  assert.equal(WEAK_NETWORK_DOWNLINK_Mbps, 2.5);
  assert.equal(classifyProgressiveNetwork(), "weak");
  assert.equal(classifyProgressiveNetwork({}, 1), "weak");
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
  ]), undefined, "缓存命中的启动脚本不能把未知网络升级为标准档");

  const base = {
    fullEnterDistance: 48,
    fullExitDistance: 58,
  };
  assert.equal(resolveProgressiveBuildingTier({
    ...base,
    mode: "intro",
    networkProfile: "standard",
    distance: 0,
    previousTier: "identity",
  }), "massing");
  assert.equal(resolveProgressiveBuildingTier({
    ...base,
    mode: "explore",
    networkProfile: "weak",
    distance: 0,
    previousTier: "full",
  }), "identity");
  assert.equal(
    visibleProgressiveBuildingTier("overview", "massing"),
    "identity",
    "封面切到全览的首帧不得暴露 Massing 方盒",
  );
  assert.equal(
    visibleProgressiveBuildingTier("explore", "massing"),
    "identity",
    "封面切到游玩态的首帧不得暴露 Massing 方盒",
  );
  assert.equal(visibleProgressiveBuildingTier("intro", "massing"), "massing");
  assert.equal(resolveProgressiveBuildingTier({
    ...base,
    mode: "overview",
    networkProfile: "weak",
    distance: 0,
    previousTier: "massing",
  }), "identity", "弱网全览必须直接显示 Identity 建筑缩影");
  assert.equal(resolveProgressiveBuildingTier({
    ...base,
    mode: "explore",
    networkProfile: "standard",
    distance: 45,
    previousTier: "identity",
  }), "full");
  assert.equal(resolveProgressiveBuildingTier({
    ...base,
    mode: "explore",
    networkProfile: "standard",
    distance: 54,
    previousTier: "full",
  }), "full");
  assert.equal(resolveProgressiveBuildingTier({
    ...base,
    mode: "explore",
    networkProfile: "standard",
    distance: 59,
    previousTier: "full",
  }), "identity");
});

test("生产主世界让全部建筑遵守 Massing、Identity、Full 三层合同", async () => {
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
  assert.match(experience, /<FirstPlayableFrame onReady=\{\(\) => setReady\(true\)\} \/>/);
  assert.doesNotMatch(experience, /onCreated=/);
  assert.match(experience, /ready && networkProfile === "standard"/);
  assert.match(experience, /ProgressiveFeatureBoundary/);
  assert.match(
    experience,
    /setOverviewStartPosition\(playerPosition\.current\);\s+setDestinationPreset\(undefined\);/,
  );
  assert.match(world, /fallback=\{<XinhuaRoadMassing identity \/>\}/);
  assert.match(world, /<XinhuaRoadMassing identity=\{showDetailModels\} \/>/);
  assert.match(world, /networkProfile === "standard"/);
  assert.match(world, /useProgressiveBuildingTier/);
  assert.match(world, /<HuashanGreenBlock stage=\{huashanTier\} \/>/);
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
  assert.match(roadFull, /distance <= threshold/);
  assert.match(roadFull, /current\.has\(landmark\.id\) \? exitDistance : enterDistance/);
  assert.match(roadFull, /<XinhuaRoadMassing identity hiddenLandmarkIds=\{hiddenIdentityIds\} \/>/);
  assert.match(xingfuli, /resolvedStage === "massing"/);
  assert.match(xingfuli, /resolvedStage === "identity" \|\| resolvedStage === "full"/);
  assert.match(xingfuli, /fullReady &&/);
  assert.match(
    xingfuli,
    /<ProgressiveFeatureBoundary fallback=\{null\}>[\s\S]*?<ProgressivePlaneTreeInstances/,
  );
  assert.match(shangsheng, /if \(stage === "massing"\)/);
  assert.match(shangsheng, /const loadFullModels = stage === "full"/);
  assert.match(shangsheng, /if \(!loadFullModels\)/);
  assert.match(shangsheng, /ProgressiveFeatureBoundary/);
  assert.match(huashan, /stage === "massing"/);
  assert.match(huashan, /<ParkServiceBuildingProxy identity \/>/);
  assert.match(huashan, /stage === "full"/);
});

test("首个可操作路径排除 GLTF、人物精模和后处理，并满足 5Mbps 传输预算", async () => {
  const assetDirectory = new URL("dist-static/assets/", root);
  const assetNames = (await readdir(assetDirectory)).filter((name) => name.endsWith(".js"));
  const playablePrefixes = [
    "index-",
    "xinhua-experience-",
    "react-three-fiber.esm-",
    "xinhua-road-massing-",
    "input-",
    "BufferGeometryUtils-",
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
    playableGzipBytes < baselineSingleBundleGzipBytes * 0.82,
    `首个可操作路径压缩后仍有 ${playableGzipBytes}B`,
  );
  assert.ok(transferAt5MbpsMs < 650, `5Mbps 纯 JS 传输预算超限：${transferAt5MbpsMs}ms`);
  for (const deferredPrefix of [
    "Gltf-",
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
