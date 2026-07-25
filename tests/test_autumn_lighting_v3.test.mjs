import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  AUTUMN_SHADOW_SURFACE_OFFSET,
  autumnShadowSurfaceHeightAt,
  terrainHeightAt,
} from "../app/scene/terrain.ts";
import {
  ROADS,
  visibleRoadSurfaceOffsetAt,
} from "../app/scene/road-surface-contract.ts";

test("探索态建立可读的秋日下午方向光与局部阴影", async () => {
  const [atmosphere, world, experience] = await Promise.all([
    readFile(new URL("../app/scene/atmosphere-contract.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(atmosphere, /sunOffset:\s*\[-62,\s*60,\s*-150\]/);
  assert.match(atmosphere, /sunIntensity:\s*\{[\s\S]*?explore:\s*5\.0/);
  assert.match(atmosphere, /skyFillIntensity:\s*\{[\s\S]*?explore:\s*2\.15/);
  assert.match(world, /const lightingV3 = atmosphereStyle === "lighting-v3"/);
  assert.match(world, /shadow-camera-left=\{exploring \? \(lightingV3 \? -48 : -72\) : -240\}/);
  assert.match(world, /shadow-camera-right=\{exploring \? \(lightingV3 \? 48 : 72\) : 240\}/);
  assert.match(world, /shadow-mapSize-width=\{exploring && !lowTier \? 2048 : 1024\}/);
  assert.match(world, /<Shadow[\s\S]*?scale=\{\[1\.05, 4\.4, 1\]\}/);
  assert.match(experience, /shadows="percentage"/);
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

  assert.match(experience, /exploring && \([\s\S]*?<AutumnStorybookSky[\s\S]*?<StorybookCloudLayer \/>/);
  assert.match(world, /<fog attach="fog"/);
  assert.match(landmarks, /<LightweightPlaneTreeInstances \/>/);
  assert.match(landmarks, /if \(!showHero\)/);
  assert.match(landmarks, /<AutumnPlaneTreeShadows atmosphere=\{atmosphere\} \/>/);
  assert.match(landmarks, /<AutumnLeafCarpet \/>/);
});

test("问号帮助面板可在秋日下午和当前光照之间即时切换", async () => {
  const [atmosphere, experience, world, effects] = await Promise.all([
    readFile(new URL("../app/scene/atmosphere-contract.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/visual-effects.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(atmosphere, /"autumn-afternoon"/);
  assert.match(atmosphere, /"lighting-v3"/);
  assert.match(atmosphere, /DEFAULT_XINHUA_ATMOSPHERE_STYLE[\s\S]*"lighting-v3"/);
  assert.match(experience, /aria-label="切换画面氛围"/);
  assert.match(experience, /秋日下午/);
  assert.match(experience, /当前光照/);
  assert.match(experience, /setAtmosphereStyle\(style\)/);
  assert.match(experience, /<XinhuaWorld[\s\S]*?atmosphereStyle=\{atmosphereStyle\}/);
  assert.match(world, /const atmosphere = XINHUA_ATMOSPHERES\[atmosphereStyle\]/);
  assert.match(world, /<AutumnLightRig[\s\S]*?atmosphere=\{atmosphere\}/);
  assert.match(effects, /uniform float uLightingV3/);
  assert.match(effects, /AutumnStorybookSky\(\{ atmosphereStyle \}/);
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
