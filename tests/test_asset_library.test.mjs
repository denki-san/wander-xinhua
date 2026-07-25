import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("资产后台完整覆盖五类生产资产与建筑三档", async () => {
  const [page, data, client, header] = await Promise.all([
    readFile(new URL("app/asset-library/page.tsx", root), "utf8"),
    readFile(new URL("app/asset-library/asset-data.ts", root), "utf8"),
    readFile(new URL("app/asset-library/AssetLibrary.tsx", root), "utf8"),
    readFile(new URL("app/asset-library/AssetAdminHeader.tsx", root), "utf8"),
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
  assert.doesNotMatch(client, /frames=\{visible \? Infinity : 1\}/);
  assert.match(client, /frameloop="demand"/);
  assert.match(client, /function ScrollSync/);
  assert.match(client, /node\.addEventListener\("scroll", refresh/);
  assert.match(client, /frames=\{Infinity\}/);
  assert.doesNotMatch(client, /document\.body\.classList\.add\("asset-library-page"\)/);
  assert.match(client, /#e7e8e4/);
  assert.match(client, /clonePreviewMaterial/);
  assert.doesNotMatch(client, /previewChrome/);
  assert.match(client, /QUALITY_LEVEL_OPTIONS/);
  assert.match(client, /setSelectedLevelId\(level\.id\)/);
  assert.match(client, /function MissingPreview/);
  assert.match(client, /const displayModel = selectedLevel\?\.model/);
  assert.doesNotMatch(client, /selectedLevel\?\.model \?\? asset\.model/);
  assert.match(client, /OrbitControls/);
  assert.match(client, /target=\{\[0, 0, 0\]\}/);
  assert.match(client, /function ModalAssetContent/);
  assert.match(client, /radius \/ Math\.sin\(limitingFov \/ 2\)/);
  assert.match(client, /controls\.target\.set\(0, 0, 0\)/);
  assert.match(client, /<ModalAssetContent model=\{selection\.model\} preview=\{selection\.preview\} variant=\{selection\.variant\} \/>/);
  assert.doesNotMatch(client, /<AssetScene model=\{selection\.model\} preview=\{selection\.preview\}/);
  assert.match(client, /拖动旋转 · 滚轮缩放 · Esc 关闭/);
  assert.match(header, /个人资产后台/);
  assert.doesNotMatch(header, /href="\/"/);
  assert.match(client, /搜索名称、门牌号或资产 ID/);
});

test("当前资产口径保留真实数量与最新街具", async () => {
  const [data, client] = await Promise.all([
    readFile(new URL("app/asset-library/asset-data.ts", root), "utf8"),
    readFile(new URL("app/asset-library/AssetLibrary.tsx", root), "utf8"),
  ]);
  assert.match(data, /instanceCount: 32/);
  assert.match(data, /instanceCount: 44/);
  assert.match(data, /instanceCount: 112/);
  assert.match(data, /雨季夏日漫游者/);
  assert.match(data, /上海双分类垃圾桶/);
  assert.match(client, /StreetBinInstances/);
  assert.match(client, /正午/);
});
