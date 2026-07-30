import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  AUTUMN_SHADOW_SURFACE_OFFSET,
  autumnShadowSurfaceHeightAt,
  terrainHeightAt,
} from "../app/scene/terrain.ts";
import {
  DEFAULT_XINHUA_ATMOSPHERE_STYLE,
  resolveXinhuaAtmosphereStyle,
  XINHUA_ATMOSPHERES,
} from "../app/scene/atmosphere-contract.ts";
import {
  ROADS,
  visibleRoadSurfaceOffsetAt,
} from "../app/scene/road-surface-contract.ts";

test("正午与夕阳使用完整命名合同并保持移动端预算一致", () => {
  assert.deepEqual(Object.keys(XINHUA_ATMOSPHERES), ["noon", "golden-hour"]);
  assert.equal(XINHUA_ATMOSPHERES.noon.label, "正午");
  assert.equal(XINHUA_ATMOSPHERES["golden-hour"].label, "夕阳");
  assert.equal(DEFAULT_XINHUA_ATMOSPHERE_STYLE, "golden-hour");
  assert.equal(resolveXinhuaAtmosphereStyle("noon"), "noon");
  assert.equal(resolveXinhuaAtmosphereStyle("golden-hour"), "golden-hour");
  assert.equal(resolveXinhuaAtmosphereStyle("invalid"), "golden-hour");
  assert.equal(resolveXinhuaAtmosphereStyle(null), "golden-hour");

  const [noonX, noonY, noonZ] = XINHUA_ATMOSPHERES.noon.sun.offset;
  const [goldenX, goldenY, goldenZ] = XINHUA_ATMOSPHERES["golden-hour"].sun.offset;
  const noonElevation = Math.atan2(noonY, Math.hypot(noonX, noonZ)) * 180 / Math.PI;
  const goldenElevation = Math.atan2(goldenY, Math.hypot(goldenX, goldenZ)) * 180 / Math.PI;
  assert.ok(noonElevation >= 40 && noonElevation <= 50);
  assert.ok(goldenElevation < 25);
  assert.equal(
    XINHUA_ATMOSPHERES.noon.skyTexture,
    XINHUA_ATMOSPHERES["golden-hour"].skyTexture,
  );

  for (const atmosphere of Object.values(XINHUA_ATMOSPHERES)) {
    assert.equal(atmosphere.sun.shadow.mapSize.standard, 2048);
    assert.equal(atmosphere.sun.shadow.mapSize.low, 1024);
    assert.equal(atmosphere.sun.shadow.camera.exploreHalfExtent, 48);
    assert.equal(atmosphere.effects.quality.outlineLowTier, false);
    assert.equal(atmosphere.effects.quality.paperLowTier, false);
  }
});

test("探索态从光照合同建立单一投影太阳与跟随视角的局部阴影", async () => {
  const [world, experience] = await Promise.all([
    readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(world, /const shadow = atmosphere\.sun\.shadow/);
  assert.match(world, /shadow-camera-left=\{-shadowHalfExtent\}/);
  assert.match(world, /shadow-camera-right=\{shadowHalfExtent\}/);
  assert.match(world, /shadow-mapSize-width=\{shadowMapSize\}/);
  assert.match(world, /castShadow=\{exploring\}/);
  assert.equal((world.match(/castShadow=\{exploring\}/g) ?? []).length, 1);
  assert.match(world, /<Shadow[\s\S]*?scale=\{\[1\.05, 4\.4, 1\]\}/);
  assert.match(experience, /shadows="percentage"/);
  assert.doesNotMatch(world, /lightingV3|autumn-afternoon/);
  assert.doesNotMatch(world, /xinhua-lighting-qa|__xinhuaLightingQA/);
});

test("全览关闭天空与树木装饰，详情恢复原有天空、树影和落叶", async () => {
  const landmarks = await readFile(
    new URL("../app/scene/xinhua-road-landmarks.tsx", import.meta.url),
    "utf8",
  );
  const [experience, world] = await Promise.all([
    readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(experience, /exploring && \([\s\S]*?<AutumnStorybookSky/);
  assert.doesNotMatch(experience, /StorybookCloudLayer/);
  assert.doesNotMatch(
    await readFile(new URL("../app/scene/visual-effects.tsx", import.meta.url), "utf8"),
    /xinhua-storybook-cloud-layer|camera-relative-low-poly-clouds/,
  );
  assert.match(world, /<fog attach="fog"/);
  assert.match(landmarks, /tier="massing"/);
  assert.match(landmarks, /active\.identity\.length > 0/);
  assert.match(
    landmarks,
    /<AutumnPlaneTreeShadows[\s\S]*?placements=\{active\.identity\}/,
  );
  assert.match(landmarks, /<AutumnLeafCarpet placements=\{active\.identity\} \/>/);
});

test("地图预览直接切换正午与夕阳，并把选择同步到可分享 URL", async () => {
  const [atmosphere, experience, world, effects, postEffects, composer] = await Promise.all([
    readFile(new URL("../app/scene/atmosphere-contract.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/visual-effects.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/postprocessing-effects.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/visual-effect-composer.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(atmosphere, /XinhuaAtmosphereStyle = "noon" \| "golden-hour"/);
  assert.match(atmosphere, /DEFAULT_XINHUA_ATMOSPHERE_STYLE[\s\S]*"golden-hour"/);
  assert.match(experience, /aria-label="切换光线"/);
  assert.match(experience, /const ATMOSPHERE_STYLES = \["noon", "golden-hour"\]/);
  assert.match(experience, /searchParams\.set\("light", style\)/);
  assert.match(experience, /window\.history\.replaceState/);
  assert.match(experience, /data-lighting-state=\{atmosphereStyle\}/);
  assert.match(experience, /\{overview && \(\s*<LightingSwitcher/);
  assert.match(experience, /aria-pressed=\{atmosphereStyle === style\}/);
  assert.match(experience, /<XinhuaWorld[\s\S]*?atmosphereStyle=\{atmosphereStyle\}/);
  assert.match(world, /const atmosphere = XINHUA_ATMOSPHERES\[atmosphereStyle\]/);
  assert.match(world, /<AutumnLightRig[\s\S]*?atmosphere=\{atmosphere\}/);
  assert.match(effects, /uniform float uSunHaloStrength/);
  assert.match(effects, /uSunDirection: new Uniform\(new Vector3\(sunX, sunY, sunZ\)\.normalize\(\)\)/);
  assert.match(effects, /AutumnStorybookSky\(\{ atmosphereStyle \}/);
  assert.match(postEffects, /XINHUA_ATMOSPHERES\[atmosphereStyle\]\.effects\.paper/);
  assert.match(composer, /XINHUA_ATMOSPHERES\[atmosphereStyle\]\.effects\.quality/);
  assert.doesNotMatch(`${effects}\n${postEffects}\n${composer}`, /uLightingV3|lightingV3/);
});

test("梧桐绘本影按每个延伸坐标重新贴合真实缓坡", () => {
  const samplePoints = [
    [20.75, 95.57],
    [28.4, 87.2],
    [-13.6, 42.8],
    [71.2, -17.4],
  ];

  for (const [x, z] of samplePoints) {
    assert.ok(Math.abs(
      autumnShadowSurfaceHeightAt(x, z)
      - terrainHeightAt(x, z)
      - visibleRoadSurfaceOffsetAt(x, z)
      - AUTUMN_SHADOW_SURFACE_OFFSET
    ) < 1e-9);
  }

  const treeRoot = samplePoints[0];
  const extendedShadow = samplePoints[1];
  assert.notEqual(
    autumnShadowSurfaceHeightAt(...treeRoot),
    autumnShadowSurfaceHeightAt(...extendedShadow),
    "延伸影不能继续复用树根处的固定高度",
  );
});

test("梧桐绘本影在新华路上贴到柏油顶面而不是埋在道路下", () => {
  const xinhuaRoad = ROADS.find((road) => (
    road.name === "新华路" && !road.bridge && !road.tunnel
  ));
  assert.ok(xinhuaRoad);

  const roadSamples = xinhuaRoad.points.slice(1).map((end, index) => {
    const start = xinhuaRoad.points[index];
    return [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2,
    ];
  });
  const sample = roadSamples.find(([x, z]) => (
    visibleRoadSurfaceOffsetAt(x, z) >= 0.1585
  ));
  assert.ok(sample, "应找到新华路柏油中心的可见表面样本");
  const [x, z] = sample;
  assert.ok(
    autumnShadowSurfaceHeightAt(x, z)
      > terrainHeightAt(x, z) + 0.1585,
    "道路树影必须位于柏油顶面之上",
  );
});
