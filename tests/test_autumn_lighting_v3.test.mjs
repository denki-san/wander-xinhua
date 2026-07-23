import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  AUTUMN_SHADOW_SURFACE_OFFSET,
  autumnShadowSurfaceHeightAt,
  terrainHeightAt,
} from "../app/scene/terrain.ts";

test("探索态建立可读的秋日下午方向光与局部阴影", async () => {
  const [atmosphere, world, experience] = await Promise.all([
    readFile(new URL("../app/scene/atmosphere-contract.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(atmosphere, /sunOffset:\s*\[-62,\s*60,\s*-150\]/);
  assert.match(atmosphere, /sunIntensity:\s*\{[\s\S]*?explore:\s*5\.0/);
  assert.match(atmosphere, /skyFillIntensity:\s*\{[\s\S]*?explore:\s*2\.15/);
  assert.match(world, /shadow-camera-left=\{exploring \? -48 : -240\}/);
  assert.match(world, /shadow-camera-right=\{exploring \? 48 : 240\}/);
  assert.match(world, /shadow-mapSize-width=\{exploring && !lowTier \? 2048 : 1024\}/);
  assert.match(world, /<Shadow[\s\S]*?scale=\{\[1\.05, 4\.4, 1\]\}/);
  assert.match(experience, /shadows="percentage"/);
  assert.doesNotMatch(world, /xinhua-lighting-qa|__xinhuaLightingQA/);
});

test("新华路梧桐阴影与主太阳方向共享同一份气氛契约", async () => {
  const landmarks = await readFile(
    new URL("../app/scene/xinhua-road-landmarks.tsx", import.meta.url),
    "utf8",
  );

  assert.match(landmarks, /function AutumnPlaneTreeShadows\(\)/);
  assert.match(landmarks, /XINHUA_AUTUMN_ATMOSPHERE\.sunOffset/);
  assert.match(
    landmarks,
    /autumnShadowSurfaceHeightAt\(positionX, positionZ\)/,
  );
  assert.match(landmarks, /atmosphere: "storybook-plane-tree-shadows"/);
  assert.match(landmarks, /atmosphere: "storybook-plane-tree-trunk-shadows"/);
  assert.match(landmarks, /<AutumnPlaneTreeShadows \/>/);
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
