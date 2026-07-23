import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
  assert.match(landmarks, /atmosphere: "storybook-plane-tree-shadows"/);
  assert.match(landmarks, /atmosphere: "storybook-plane-tree-trunk-shadows"/);
  assert.match(landmarks, /<AutumnPlaneTreeShadows \/>/);
});
