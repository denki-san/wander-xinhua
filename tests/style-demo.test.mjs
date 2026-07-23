import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("三种风格 Demo 使用同一幸福里场景并提供稳定深链", async () => {
  const source = await readFile(new URL("../app/style-lab/StyleLab.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/style-lab/page.tsx", import.meta.url), "utf8");

  for (const style of ["atlas", "summer", "comic"]) {
    assert.match(source, new RegExp(`id: "${style}"`));
  }
  assert.match(source, /<XingfuliBlock loadDetailedArchitecture \/>/);
  assert.match(source, /URLSearchParams\(window\.location\.search\)/);
  assert.match(source, /url\.searchParams\.set\("style", nextStyle\)/);
  assert.match(source, /Digit1: "atlas"/);
  assert.match(source, /Digit2: "summer"/);
  assert.match(source, /Digit3: "comic"/);
  assert.match(page, /<StyleLab \/>/);
});

test("两种新增方向在天空、材质、人物与界面上各自形成完整合同", async () => {
  const source = await readFile(new URL("../app/style-lab/StyleLab.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/style-lab/style-lab.module.css", import.meta.url), "utf8");
  const brief = await readFile(new URL("../docs/research/style-demo-brief.md", import.meta.url), "utf8");

  assert.match(source, /function SummerAtmosphere/);
  assert.match(source, /function ComicAtmosphere/);
  assert.match(source, /function retintMaterial/);
  assert.match(source, /style === "summer"/);
  assert.match(source, /style === "comic"/);
  assert.match(source, /style !== "summer" && <InkOutline \/>/);
  assert.match(source, /name={`style-\${style}-wanderer`}/);
  assert.match(source, /onPointerDown/);
  assert.match(css, /data-style="summer"/);
  assert.match(css, /data-style="comic"/);
  assert.match(css, /comicTexture/);
  assert.match(css, /sunWash/);
  assert.match(brief, /Xinhua Summer Storybook/);
  assert.match(brief, /Xinhua Comic Diorama/);
});

test("风格 Demo 不加载参考项目资产且保留人物授权边界", async () => {
  const source = await readFile(new URL("../app/style-lab/StyleLab.tsx", import.meta.url), "utf8");
  const brief = await readFile(new URL("../docs/research/style-demo-brief.md", import.meta.url), "utf8");
  const quaterniusLicense = await readFile(new URL(
    "../assets/models/source/character/QUATERNIUS_MODULAR_MEN_LICENSE.txt",
    import.meta.url,
  ), "utf8");
  const rainLicense = await readFile(new URL(
    "../assets/models/source/character/RAIN_LICENSE.txt",
    import.meta.url,
  ), "utf8");

  assert.doesNotMatch(source, /messenger\.abeto|summer-afternoon\.vlucendo|urban-messenger\.glb/i);
  assert.match(source, /rain-summer-wanderer\.glb/);
  assert.match(source, /Rain Rig © Blender Foundation/);
  assert.match(brief, /Rain 的 CC-BY 派生运行时资产/);
  assert.match(quaterniusLicense, /CC0 1\.0 Universal/);
  assert.match(rainLicense, /CC-BY/);
  assert.match(rainLicense, /Rain Rig © Blender Foundation/);
});
