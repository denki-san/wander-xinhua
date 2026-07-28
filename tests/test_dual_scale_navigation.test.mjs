import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import {
  MAP_POIS,
  mapPoiById,
  nearestMapPoi,
} from "../app/scene/poi-data.ts";
import { constrainOverviewCameraTarget } from "../app/scene/xinhua-overview-camera.ts";

test("全览地图包含三处核心片区、全部新华路地标和轻量实景缩略图", async () => {
  assert.equal(MAP_POIS.length, 17);
  assert.deepEqual(MAP_POIS.slice(0, 3).map((poi) => poi.id), [
    "xingfuli",
    "shangsheng",
    "huashan",
  ]);
  assert.ok(MAP_POIS.every((poi) => (
    poi.name
    && poi.description
    && poi.startPreset
    && poi.photo.src
    && poi.photo.sourceUrl
  )));
  assert.equal(new Set(MAP_POIS.map((poi) => poi.id)).size, MAP_POIS.length);
  assert.ok(MAP_POIS.every((poi) => poi.photo.src.startsWith("/images/poi-thumbnails/")));
  for (const poi of MAP_POIS) {
    const thumbnail = await stat(new URL(`../public${poi.photo.src}`, import.meta.url));
    assert.ok(thumbnail.size > 20_000, `${poi.name} 缩略图不应为空`);
    assert.ok(thumbnail.size < 200_000, `${poi.name} 缩略图不应继续使用超大原图`);
  }
});

test("人物只有走进 POI 邻近范围才会激活进入卡片", () => {
  const shangsheng = mapPoiById("shangsheng");
  assert.ok(shangsheng);
  assert.equal(nearestMapPoi(shangsheng.position, 42)?.id, "shangsheng");
  assert.equal(nearestMapPoi([1_000, 1_000], 42), null);
});

test("全览镜头在减少边界空白时仍把外围人物保留在视锥安全范围", () => {
  const bounds = {
    minX: -369.8211,
    maxX: 369.8211,
    minZ: -385.2094,
    maxZ: 385.2094,
  };
  assert.deepEqual(
    constrainOverviewCameraTarget({
      focusX: 40,
      focusZ: -30,
      bounds,
      contentFocusLimit: 0.42,
      maxFocusLag: 60,
    }),
    [40, -30],
  );

  const focus = [-250, 130];
  const target = constrainOverviewCameraTarget({
    focusX: focus[0],
    focusZ: focus[1],
    bounds,
    contentFocusLimit: 0.42,
    maxFocusLag: 60,
  });
  assert.ok(Math.hypot(target[0] - focus[0], target[1] - focus[1]) <= 60 + 1e-9);
  assert.ok(target[0] < -155, "镜头需要向外围人物回跟，不能停在固定中央矩形边缘");
});

test("双尺度视图让全览镜头跟随人物并在闲逛态放大环境而非人物", async () => {
  const world = await readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8");
  const experience = await readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8");
  const introSurface = await readFile(
    new URL("../app/xinhua-intro-surface.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const shangsheng = await readFile(
    new URL("../app/scene/shangsheng-xinsuo-block.tsx", import.meta.url),
    "utf8",
  );
  const roadLandmarks = await readFile(
    new URL("../app/scene/xinhua-road-landmarks.tsx", import.meta.url),
    "utf8",
  );
  const planeTreeInstances = await readFile(
    new URL("../app/scene/plane-tree-instances.tsx", import.meta.url),
    "utf8",
  );

  assert.match(world, /export const DETAIL_WORLD_SCALE = 1\.65/);
  assert.match(world, /const OVERVIEW_CHARACTER_SCALE = 22/);
  assert.match(
    world,
    /const OVERVIEW_CAMERA_TARGET_HEIGHT_OFFSET = OVERVIEW_CHARACTER_SCALE \* 0\.6/,
  );
  assert.match(world, /const OVERVIEW_MOVE_SPEED = 94/);
  assert.match(world, /const OVERVIEW_CAMERA_FILL = 0\.215/);
  assert.match(world, /const OVERVIEW_CAMERA_PORTRAIT_FILL = 0\.16/);
  assert.match(world, /const OVERVIEW_CAMERA_FOCUS_LIMIT = 0\.42/);
  assert.match(world, /const OVERVIEW_CAMERA_PLAYER_SAFE_RATIO = 0\.72/);
  assert.match(world, /function OverviewCamera/);
  assert.match(
    world,
    /\.copy\(focus\.current\)\s*\.addScaledVector\(WORLD_UP, OVERVIEW_CAMERA_TARGET_HEIGHT_OFFSET\)/,
  );
  assert.match(world, /constrainOverviewCameraTarget\(\{/);
  assert.match(world, /maxFocusLag/);
  assert.match(
    world,
    /perspective\.aspect < 0\.7[\s\S]*?\? OVERVIEW_CAMERA_PORTRAIT_FILL[\s\S]*?: OVERVIEW_CAMERA_FILL/,
  );
  assert.match(world, /cameraFocus\.current\.copy\(position\.current\)/);
  assert.match(world, /<OverviewCamera active=\{overview\} focus=\{overviewCameraFocus\} \/>/);
  assert.ok(
    world.indexOf("<OverviewWanderer") < world.indexOf("<OverviewCamera active={overview}"),
    "全览人物必须先更新位置，镜头再在同一帧跟随，避免人物偏离中心一帧",
  );
  assert.match(world, /camera\.position\.copy\(desired\)/);
  assert.match(world, /scale=\{\[detailScale, detailScale, detailScale\]\}/);
  assert.match(world, /const scaledSurfaceHeight = surfaceHeight \* DETAIL_WORLD_SCALE/g);
  assert.match(world, /detailScale=\{exploring \? DETAIL_WORLD_SCALE : 1\}/);
  assert.match(world, /showDetailModels=\{mode !== "intro"\}/);
  assert.match(world, /showDetailLabels=\{false\}/);
  assert.match(world, /showDetailModels \? \(/);
  assert.match(world, /<ShangshengXinsuoBlock[\s\S]*?stage=\{shangshengTier\}/);
  assert.match(world, /<ProgressiveXinhuaRoadFullLayer/);
  assert.match(world, /progressiveFocus=\{progressiveFocus\}/);
  assert.match(world, /landmarkLoadMode=\{exploring \? "explore" : "overview"\}/);
  assert.doesNotMatch(world, /priorityPreset|detailPresetTargetsBuilding|detailActive/);
  assert.match(
    world,
    /loadMode=\{landmarkLoadMode\}/,
  );
  assert.match(roadLandmarks, /tier="massing"/);
  assert.match(roadLandmarks, /quality: "massing"/);
  assert.match(roadLandmarks, /if \(!detailed\)/);
  assert.match(roadLandmarks, /<PlaneTreeInstances/);
  assert.match(planeTreeInstances, /placementsByVariant\[variant\]\.length > 0/);
  assert.doesNotMatch(roadLandmarks, /LandmarkLoadingVolume/);
  assert.match(roadLandmarks, /mountedModelIds\.has\(landmark\.id\)/);
  assert.match(roadLandmarks, /xinhuaRoadDistanceHeroIds/);
  assert.match(roadLandmarks, /const shouldMountModel = mountedModelIds\.has\(landmark\.id\)/);
  assert.match(roadLandmarks, /function useDistanceHeroLandmarkIds/);
  assert.match(roadLandmarks, /XINHUA_ROAD_HERO_SAMPLE_SECONDS/);
  assert.match(roadLandmarks, /return xinhuaRoadDistanceHeroIds\(\{/);
  assert.doesNotMatch(roadLandmarks, /landmarkMatchesPreset|priorityPreset|xinhuaRoadDetailHeroId/);
  assert.match(
    roadLandmarks,
    /<Suspense[\s\S]*?<LandmarkProgressiveProxy landmark=\{landmark\} identity \/>[\s\S]*?<GlbModel[\s\S]*?path=\{modelPath\}[\s\S]*?performanceAssetId=\{landmark\.id\}[\s\S]*?performanceTier="hero"[\s\S]*?\/>/,
  );
  assert.match(shangsheng, /fallback=\{<GenericCampusBuilding building=\{building\} \/>\}/);
  assert.doesNotMatch(world, /overview-poi-label|OVERVIEW_POI_LABEL_OFFSETS/);
  assert.match(
    world,
    /\{near && \(\s*<group name=\{`overview-poi-highlight-\$\{poi\.id\}`\}>[\s\S]*?<mesh rotation-x=\{Math\.PI \/ 2\}>[\s\S]*?<torusGeometry args=\{\[8\.8, 1\.25, 10, 42\]\}[\s\S]*?<coneGeometry args=\{\[2\.8, 7\.2, 8\]\}/,
  );
  assert.match(world, /dataset\.overviewQaActiveMarkers = String\(activeMarkers\)/);
  assert.match(world, /dataset\.overviewQaPlayer = \[/);
  assert.match(world, /dataset\.overviewQaPlayerScreen = \[/);
  assert.doesNotMatch(shangsheng, /useGLTF\.preload/);
  assert.match(world, /scale=\{OVERVIEW_CHARACTER_SCALE\}/);
  assert.match(
    world,
    /resolvePolygonMovement\(\s*position\.current,\s*scratchDisplacement,\s*XINHUA_BOUNDARY,\s*\[\],\s*PLAYER_RADIUS/s,
  );
  assert.match(experience, /"intro" \| "overview" \| "explore"/);
  assert.match(experience, /<XinhuaIntroSurface/);
  assert.match(experience, /ready=\{ready\}/);
  assert.match(experience, /onBegin=\{begin\}/);
  assert.match(introSurface, /xinhua-plane-tree-cover-desktop-lite\.jpg/);
  assert.match(introSurface, /xinhua-plane-tree-cover-mobile-lite\.jpg/);
  assert.match(introSurface, /max-width: 760px/);
  assert.match(introSurface, /aria-label="新华漫游"/);
  assert.match(introSurface, /intro-title-char[\s\S]*?>新<[\s\S]*?>华<[\s\S]*?>漫<[\s\S]*?>游</);
  assert.match(introSurface, />\s*开始\s*<\/button>/);
  assert.match(introSurface, />上海新华路社区<\/span>/);
  assert.match(styles, /font-family: "FZKai-Z03", "Kaiti SC", STKaiti, KaiTi/);
  assert.match(styles, /\.intro-title-char:nth-child\(4\)/);
  assert.match(styles, /\.intro-entry\s*\{[^}]*left: 50%;[^}]*transform: translateX\(-50%\);/);
  assert.doesNotMatch(introSurface, /沿着梧桐树影/);
  assert.doesNotMatch(styles, /\.intro-start-button::after/);
  assert.match(introSurface, /正在铺开新华路/);
  assert.doesNotMatch(experience, /从全览出发/);
  assert.match(experience, /<ProgressiveVisualEffectComposer/);
  assert.doesNotMatch(experience, /key=\{mode\}/);
  assert.match(experience, /查看全览/);
  assert.match(experience, /进入 \{nearPoi\.name\}/);
  assert.match(experience, /alt=\{`\$\{nearPoi\.name\}实景`\}/);
  assert.match(experience, /实景图 · \{nearPoi\.photo\.sourceLabel\}/);
  assert.match(experience, /const photosByDistance = \[\.\.\.MAP_POIS\]\.sort/);
  assert.match(experience, /new Map<string, HTMLImageElement>\(\)/);
  assert.match(experience, /POI_PHOTO_NEARBY_PREFETCH_COUNT = 2/);
  assert.match(experience, /if \(networkProfile === "weak"\) return/);
  assert.match(experience, /index < 2 \? "high" : "low"/);
  assert.match(experience, /POI_PHOTO_BACKGROUND_PREFETCH_DELAY_MS/);
  assert.match(experience, /overviewPhotoCache\.current\.set\(src, preview\)/);
  assert.match(experience, /overviewPhotoCache\.current\.delete\(src\)/);
  assert.match(experience, /preview\.decoding = "async"/);
  assert.match(experience, /void preview\.decode\(\)\.catch/);
  assert.match(experience, /decoding="async"/);
  assert.match(experience, /loading="eager"/);
  assert.match(experience, /fetchPriority="high"/);
  assert.match(experience, /aria-busy=\{loadedOverviewPhoto !== nearPoi\.photo\.src\}/);
  assert.match(styles, /\.overview-poi-photo\.is-loaded img/);
  assert.match(styles, /@keyframes poi-photo-loading/);
  assert.match(styles, /\.world-tools\s*\{[^}]*flex-direction: row;/);
  assert.match(experience, /className="lighting-hud-switcher"/);
  assert.ok(
    experience.indexOf('className="lighting-hud-switcher"')
      < experience.indexOf('<nav className="world-tools"'),
    "全览光照切换应排在右上工具按钮之前",
  );
  assert.match(
    styles,
    /@media \(pointer: coarse\), \(max-width: 760px\)[\s\S]*?\.world-tool-stack\s*\{[^}]*display: flex;[^}]*flex-direction: row;[^}]*flex-wrap: nowrap;[^}]*align-items: center;/,
  );
  assert.match(
    styles,
    /@media \(pointer: coarse\), \(max-width: 760px\)[\s\S]*?\.lighting-hud-switcher\s*\{[^}]*width: 144px;[^}]*flex: 0 0 144px;/,
  );
  assert.match(styles, /\.overview-poi-card\s*\{[^}]*top: 82px;/);
  assert.match(styles, /top: calc\(env\(safe-area-inset-top, 0px\) \+ 124px\)/);
  assert.match(styles, /height: 148px/);
  assert.match(styles, /object-position: 50% 50%/);
  assert.doesNotMatch(styles, /\.overview-poi-card\s*\{[^}]*bottom:/);
  assert.match(experience, /function FirstPlayableFrame/);
  assert.match(experience, /nextFrame\.current = window\.requestAnimationFrame\(onReady\)/);
  assert.doesNotMatch(experience, /2_500/);
  assert.doesNotMatch(experience, /canvas\.width > 0 && canvas\.height > 0/);
});
