import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("资产后台完整覆盖五类生产资产与建筑三档", async () => {
  const [page, data, client, staticEntry, styles] = await Promise.all([
    readFile(new URL("app/asset-library/page.tsx", root), "utf8"),
    readFile(new URL("app/asset-library/asset-data.ts", root), "utf8"),
    readFile(new URL("app/asset-library/AssetLibrary.tsx", root), "utf8"),
    readFile(new URL("static-entry.tsx", root), "utf8"),
    readFile(new URL("app/asset-library/asset-library.module.css", root), "utf8"),
  ]);
  assert.match(page, /AssetLibrary/);
  for (const category of ["buildings", "lighting", "trees", "decor", "characters"]) {
    assert.match(data, new RegExp(category));
  }
  for (const level of ["Hero \\/ Full", "Hybrid Identity", "Massing"]) {
    assert.match(data, new RegExp(level));
  }
  assert.doesNotMatch(client, /View\.Port/);
  assert.match(client, /IntersectionObserver/);
  assert.match(client, /setVisible\(entry\.isIntersecting\)/);
  assert.doesNotMatch(client, /if \(entry\.isIntersecting\)[\s\S]{0,120}observer\.disconnect\(\)/);
  assert.match(client, /condition=\{variant === 1 \? "weathered" : "clean"\}/);
  assert.match(client, /const interactiveVariants = asset\.id === "plane-tree" \|\| asset\.id === "trash-bin"/);
  assert.match(client, /dpr=\{dpr\}/);
  assert.match(client, /frameloop=\{animate \? "always" : "demand"\}/);
  assert.doesNotMatch(client, /ContactShadows|shadow-mapSize/);
  assert.match(staticEntry, /lazy\(\(\) => import\("\.\/app\/asset-library\/AssetLibrary"\)/);
  assert.match(staticEntry, /routePath === "\/asset-library"/);
  assert.match(styles, /\.shell\s*\{[\s\S]*height:\s*100svh;[\s\S]*overflow-y:\s*auto;/);
  assert.match(client, /搜索名称、门牌号或资产 ID/);
});

test("当前资产口径保留真实数量与缺口提示", async () => {
  const [data, client] = await Promise.all([
    readFile(new URL("app/asset-library/asset-data.ts", root), "utf8"),
    readFile(new URL("app/asset-library/AssetLibrary.tsx", root), "utf8"),
  ]);
  assert.match(data, /instanceCount: 32/);
  assert.match(data, /instanceCount: 44/);
  assert.match(data, /instanceCount: 112/);
  assert.match(data, /雨季夏日漫游者/);
  assert.match(data, /上海双分类垃圾桶/);
  assert.match(data, /preview: "trash-bin"/);
  assert.match(data, /共享低模结构，以 InstancedMesh 按街道路缘布置/);
  assert.match(client, /<StreetBinInstances/);
  assert.match(client, /正午/);
});

test("资产后台引用的生产 GLB 均存在", async () => {
  const [data, landmarksText] = await Promise.all([
    readFile(new URL("app/asset-library/asset-data.ts", root), "utf8"),
    readFile(new URL("app/scene/xinhua-road-landmarks-data.json", root), "utf8"),
  ]);
  const landmarks = JSON.parse(landmarksText);
  const literalPaths = [...data.matchAll(/model:\s*"([^"]+\.glb(?:\?[^"]*)?)"/g)]
    .map((match) => match[1]);
  const generatedPaths = ["west", "center", "east"].flatMap((zone) => [
    `/models/xingfuli/xingfuli-${zone}.glb`,
    `/models/xingfuli/xingfuli-${zone}-identity.glb`,
    `/models/xingfuli/xingfuli-${zone}-massing.glb`,
  ]);
  const modelPaths = new Set([
    ...literalPaths,
    ...generatedPaths,
    ...landmarks.landmarks.map((landmark) => landmark.model),
  ]);

  await Promise.all([...modelPaths].map((modelPath) => {
    const cleanPath = modelPath.split("?")[0].replace(/^\//, "");
    return access(new URL(`public/${cleanPath}`, root));
  }));
});
