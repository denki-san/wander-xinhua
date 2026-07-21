import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("建筑证据实验室作为 wander-xinhua 的独立路由迁入", async () => {
  const [page, layout, workbench, tree, experience] = await Promise.all([
    readFile(new URL("../app/building-evidence-lab/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/building-evidence-lab/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/building-evidence-lab/WonderWorkbench.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/building-evidence-lab/PlaneTreeViewer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /WonderWorkbench/);
  assert.match(layout, /building-evidence-lab\.css/);
  assert.match(workbench, /武康大楼/);
  assert.match(workbench, /\/models\/building-evidence-lab\/wukang-mansion\.glb/);
  assert.match(workbench, /\/models\/xinhua-road\/house-315\.glb/);
  assert.match(workbench, /\/models\/xinhua-road\/shanghai-cinema\.glb/);
  assert.match(workbench, /\/models\/requested-pois\/hudec-memorial\.glb/);
  assert.match(workbench, /\/building-evidence-lab\/plane-tree/);
  assert.match(tree, /\/models\/building-evidence-lab\/xinhua-plane-tree-hero\.glb/);
  assert.match(tree, /href="\/building-evidence-lab"/);
  assert.match(experience, /href="\/building-evidence-lab"/);
});

test("建筑证据、可编辑源文件和运行时资产完整迁入", async () => {
  const manifest = await readFile(
    new URL("../research/poi-evidence-manifest.json", import.meta.url),
    "utf8",
  );

  assert.match(manifest, /wukang-mansion/);
  assert.match(manifest, /house-315/);
  assert.match(manifest, /shanghai-cinema/);
  assert.match(manifest, /hudec-memorial/);

  await Promise.all([
    access(new URL("../public/models/building-evidence-lab/wukang-mansion.glb", import.meta.url)),
    access(new URL("../public/models/building-evidence-lab/xinhua-plane-tree-hero.glb", import.meta.url)),
    access(new URL("../public/models/xinhua-road/house-315.glb", import.meta.url)),
    access(new URL("../public/models/xinhua-road/shanghai-cinema.glb", import.meta.url)),
    access(new URL("../public/models/requested-pois/hudec-memorial.glb", import.meta.url)),
    access(new URL("../public/building-evidence-lab-og.png", import.meta.url)),
    access(new URL("../research/source/create_wukang_mansion.py", import.meta.url)),
    access(new URL("../research/source/wukang-mansion.blend", import.meta.url)),
    access(new URL("../research/references/wukang-mansion/aerial-canonical.jpg", import.meta.url)),
    access(new URL("../research/wukang-mansion-project-handoff.md", import.meta.url)),
    access(new URL("../docs/building-evidence-lab.md", import.meta.url)),
  ]);
});
