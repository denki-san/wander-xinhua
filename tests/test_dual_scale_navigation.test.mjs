import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import {
  MAP_POIS,
  mapPoiById,
  nearestMapPoi,
  OVERVIEW_POI_LABEL_OFFSETS,
} from "../app/scene/poi-data.ts";

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
  assert.ok(MAP_POIS.every((poi) => OVERVIEW_POI_LABEL_OFFSETS[poi.id]));
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

test("双尺度视图让全览镜头跟随人物并在闲逛态放大环境而非人物", async () => {
  const world = await readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8");
  const experience = await readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8");
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
  assert.match(world, /const OVERVIEW_MOVE_SPEED = 108/);
  assert.match(world, /const OVERVIEW_CAMERA_FILL = 0\.24/);
  assert.match(world, /function OverviewCamera/);
  assert.match(world, /target\.copy\(focus\.current\)/);
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
  assert.match(world, /showDetailModels && networkProfile === "standard" \? \(/);
  assert.match(world, /<ShangshengXinsuoBlock[\s\S]*?stage=\{shangshengTier\}/);
  assert.match(world, /<ProgressiveXinhuaRoadFullLayer/);
  assert.match(world, /priorityPreset=\{destinationPreset\}/);
  assert.match(world, /landmarkLoadMode=\{exploring \? "explore" : "overview"\}/);
  assert.match(world, /networkProfile === "standard"[\s\S]*?<Suspense fallback=\{<XinhuaRoadMassing identity \/>\}>/);
  assert.match(roadLandmarks, /<PlaneTreeInstances/);
  assert.match(planeTreeInstances, /placementsByVariant\[variant\]\.length > 0/);
  assert.doesNotMatch(roadLandmarks, /LandmarkLoadingVolume/);
  assert.match(roadLandmarks, /mountedModelIds\.has\(landmark\.id\)/);
  assert.match(roadLandmarks, /landmarkMatchesPreset\(landmark, priorityPreset\)/);
  assert.match(roadLandmarks, /LANDMARK_DISTANCE_SAMPLE_SECONDS/);
  assert.match(roadLandmarks, /LANDMARK_FULL_ENTER_EXPLORE/);
  assert.match(roadLandmarks, /current\.has\(landmark\.id\) \? exitDistance : enterDistance/);
  assert.match(
    roadLandmarks,
    /<Suspense[\s\S]*?<LandmarkProgressiveProxy landmark=\{landmark\} identity \/>[\s\S]*?<GlbModel path=\{modelPath\} \/>/,
  );
  assert.match(shangsheng, /fallback=\{<GenericCampusBuilding building=\{building\} \/>\}/);
  assert.match(world, /className="overview-poi-label-anchor"/);
  assert.match(world, /zIndexRange=\{\[12, 0\]\}/);
  assert.doesNotMatch(shangsheng, /useGLTF\.preload/);
  assert.match(world, /scale=\{OVERVIEW_CHARACTER_SCALE\}/);
  assert.match(
    world,
    /resolvePolygonMovement\(\s*position\.current,\s*scratchDisplacement,\s*XINHUA_BOUNDARY,\s*\[\],\s*PLAYER_RADIUS/s,
  );
  assert.match(experience, /"intro" \| "overview" \| "explore"/);
  assert.match(experience, /src="\/images\/xinhua-pocket-toy-cover\.jpg"/);
  assert.match(experience, /aria-label="漫步新华路"/);
  assert.match(experience, />出发<\/button>/);
  assert.doesNotMatch(experience, /从全览出发/);
  assert.match(experience, /<ProgressiveVisualEffectComposer/);
  assert.doesNotMatch(experience, /key=\{mode\}/);
  assert.match(experience, /查看全览/);
  assert.match(experience, /进入 \{nearPoi\.name\}/);
  assert.match(experience, /alt=\{`\$\{nearPoi\.name\}实景`\}/);
  assert.match(experience, /实景图 · \{nearPoi\.photo\.sourceLabel\}/);
  assert.match(experience, /const photosByDistance = \[\.\.\.MAP_POIS\]\.sort/);
  assert.match(experience, /new Map<string, HTMLImageElement>\(\)/);
  assert.match(experience, /POI_PHOTO_NEARBY_PREFETCH_COUNT = 4/);
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
  assert.match(styles, /\.overview-poi-card\s*\{[^}]*top: 88px;/);
  assert.match(styles, /top: calc\(env\(safe-area-inset-top, 0px\) \+ 48px\)/);
  assert.doesNotMatch(styles, /\.overview-poi-card\s*\{[^}]*bottom:/);
  assert.match(experience, /function FirstPlayableFrame/);
  assert.match(experience, /nextFrame\.current = window\.requestAnimationFrame\(onReady\)/);
  assert.doesNotMatch(experience, /2_500/);
  assert.doesNotMatch(experience, /canvas\.width > 0 && canvas\.height > 0/);
});
