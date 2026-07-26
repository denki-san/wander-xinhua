import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("工作流程是独立页面，只承载流程与质量门", async () => {
  const [page, dashboard, header] = await Promise.all([
    readFile(new URL("app/asset-library/workflow/page.tsx", root), "utf8"),
    readFile(new URL("app/asset-library/workflow/WorkflowDashboard.tsx", root), "utf8"),
    readFile(new URL("app/asset-library/AssetAdminHeader.tsx", root), "utf8"),
  ]);
  assert.match(page, /WorkflowDashboard/);
  assert.match(header, /href="\/asset-library\/workflow"/);
  assert.match(header, /工作流程/);
  assert.match(header, /href="\/asset-library"/);
  assert.match(dashboard, /建筑工作流程/);
  assert.match(dashboard, /质量门/);
  assert.match(dashboard, /制作流程与运行时等级分开管理/);
  assert.doesNotMatch(dashboard, /PHOTO COMPARISON/);
  assert.doesNotMatch(dashboard, /进入 \{record\.name\}/);
});

test("建筑详情仍位于资产总览并包含文档、照片、质量等级和游戏入口", async () => {
  const [library, data] = await Promise.all([
    readFile(new URL("app/asset-library/AssetLibrary.tsx", root), "utf8"),
    readFile(new URL("app/asset-library/building-management-data.ts", root), "utf8"),
  ]);
  assert.match(library, /function BuildingDetailModal/);
  assert.match(library, /照片与运行时对比/);
  assert.match(library, /相关文档/);
  assert.match(library, /资产质量等级/);
  assert.match(library, /进入 \{record\.name\}/);
  assert.match(library, /\/\?start=\$\{record\.gameStart\}/);
  assert.match(library, /暂无该等级资产/);
  assert.match(data, /"xingfuli-canonical"/);
  assert.match(data, /"sunke"/);
  for (const start of [
    "cinema",
    "film-art",
    "garden179",
    "villas",
    "villas329",
    "house315",
    "villa-le-bec",
    "orchestra",
    "hudec",
    "pocket-park",
    "community-center",
    "fahua525",
    "fahua-heritage",
    "fics365",
  ]) {
    assert.match(data, new RegExp(`"${start}"`));
  }
});
