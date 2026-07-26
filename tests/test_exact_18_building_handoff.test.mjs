import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const handoffUrl = new URL(
  "../docs/research/exact-18-building-handoff-2026-07-26.md",
  import.meta.url,
);
const statusUrl = new URL(
  "../docs/research/exact-18-building-status.json",
  import.meta.url,
);

test("交接文档覆盖且只引用权威18栋清单", async () => {
  const handoff = await readFile(handoffUrl, "utf8");
  const status = JSON.parse(await readFile(statusUrl, "utf8"));
  assert.equal(status.buildings.length, 18);

  for (const { id } of status.buildings) {
    assert.equal(handoff.includes(`\`${id}\``), true);
  }

  assert.match(handoff, /8 \/ 18 complete/u);
  assert.match(handoff, /10 \/ 18 blocked or Massing-only/u);
  assert.match(handoff, /trees/u);
  assert.match(handoff, /decorations/u);
  assert.match(handoff, /Recovery\/Hold/u);
});

test("完成清单与权威状态矩阵一致", async () => {
  const handoff = await readFile(handoffUrl, "utf8");
  const status = JSON.parse(await readFile(statusUrl, "utf8"));
  const completed = status.buildings
    .filter(({ overall }) => overall === "complete")
    .map(({ id }) => id);

  assert.deepEqual(completed, [
    "film-art-center",
    "one-step-garden",
    "house-315",
    "villa-le-bec",
    "hudec-memorial",
    "xinhua-pocket-park",
    "xingfuli-center",
    "sun-ke-villa",
  ]);

  for (const [index, id] of completed.entries()) {
    assert.equal(handoff.includes(`${index + 1}. \`${id}\``), true);
  }
});

test("交接文档锁定Git、Fast Mode和不可越权边界", async () => {
  const handoff = await readFile(handoffUrl, "utf8");

  assert.match(handoff, /codex\/integrate-18-buildings/u);
  assert.match(
    handoff,
    /719e945e5d0059556e0a95dca3f0b87a314645eb/u,
  );
  assert.match(
    handoff,
    /3044cd89f801250afcd477dfbcbc7da358bf4b11/u,
  );
  assert.match(handoff, /234 commits ahead and 13 commits behind/u);
  assert.match(handoff, /--batch id1,id2,id3 --full/u);
  assert.match(handoff, /Do not directly merge the whole Recovery branch/u);
  assert.match(handoff, /Do not narrow generic roads/u);
  assert.match(handoff, /disable only that building in runtime/u);
});
