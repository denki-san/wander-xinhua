import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("产品主页独立放在资产后台目录并提供日历更新日志", async () => {
  const [page, component, notes, styles, staticEntry, assetLibrary] = await Promise.all([
    readFile(new URL("app/product-homepage/page.tsx", root), "utf8"),
    readFile(new URL("app/asset-library/product-homepage/ProductHomepage.tsx", root), "utf8"),
    readFile(new URL("app/asset-library/product-homepage/release-notes.ts", root), "utf8"),
    readFile(new URL("app/asset-library/product-homepage/product-homepage.module.css", root), "utf8"),
    readFile(new URL("static-entry.tsx", root), "utf8"),
    readFile(new URL("app/asset-library/AssetLibrary.tsx", root), "utf8"),
  ]);
  assert.match(page, /ProductHomepage/);
  assert.match(component, /Release calendar/);
  assert.match(component, /setSelectedId/);
  assert.match(component, /GitHub 可以搬，但不直接搬到前端/);
  assert.match(notes, /RELEASE_NOTES/);
  assert.match(notes, /commit: "44b5cb9"/);
  assert.match(styles, /\.calendarGrid/);
  assert.match(staticEntry, /productHomepageRoute/);
  assert.match(assetLibrary, /href="\/product-homepage"/);
});
