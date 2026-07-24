import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("资产后台完整覆盖五类生产资产与建筑三档", async () => {
  const [page, data, client] = await Promise.all([
    readFile(new URL("app/asset-library/page.tsx", root), "utf8"),
    readFile(new URL("app/asset-library/asset-data.ts", root), "utf8"),
    readFile(new URL("app/asset-library/AssetLibrary.tsx", root), "utf8"),
  ]);
  assert.match(page, /AssetLibrary/);
  for (const category of ["buildings", "lighting", "trees", "decor", "characters"]) {
    assert.match(data, new RegExp(category));
  }
  for (const level of ["Hero \\/ Full", "Hybrid Identity", "Massing"]) {
    assert.match(data, new RegExp(level));
  }
  assert.match(client, /View\.Port/);
  assert.match(client, /IntersectionObserver/);
  assert.match(client, /setVisible\(entry\.isIntersecting\)/);
  assert.doesNotMatch(client, /if \(entry\.isIntersecting\)[\s\S]{0,120}observer\.disconnect\(\)/);
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
