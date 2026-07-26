import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

test("统一状态矩阵与 Fast Mode 使用同一18栋顺序且不混入 Hold", async () => {
  const [status, fastMode] = await Promise.all([
    readJson("docs/research/exact-18-building-status.json"),
    readJson("docs/research/building-pipeline-fast-mode.json"),
  ]);
  const ids = status.buildings.map(({ id }) => id);
  assert.equal(status.scope.buildingCount, 18);
  assert.equal(status.buildings.length, 18);
  assert.deepEqual(ids, fastMode.buildings.map(({ id }) => id));
  for (const excludedId of [
    "plane-tree",
    "campus-tree",
    "huashan-tree",
    "lane-lamp",
    "trash-bin",
    "navy-club-pool",
  ]) {
    assert.equal(ids.includes(excludedId), false);
  }
});

test("完成数、进行中数与逐栋 overall 精确一致", async () => {
  const status = await readJson("docs/research/exact-18-building-status.json");
  const complete = status.buildings
    .filter(({ overall }) => overall === "complete")
    .map(({ id }) => id);
  const inProgress = status.buildings
    .filter(({ overall }) => overall.startsWith("in-progress-"))
    .map(({ id }) => id);
  assert.equal(complete.length, status.summary.complete);
  assert.equal(inProgress.length, status.summary.inProgress);
  assert.equal(
    status.buildings.length - complete.length - inProgress.length,
    status.summary.blockedOrPartial,
  );
  assert.deepEqual(complete, status.summary.completeIds);
  assert.deepEqual(inProgress, status.summary.inProgressIds);
});

test("每栋均保留门状态、runtime policy 与现存裁决记录", async () => {
  const status = await readJson("docs/research/exact-18-building-status.json");
  for (const building of status.buildings) {
    for (const field of [
      "evidence",
      "hero",
      "identity",
      "massing",
      "mcp1",
      "mcp2",
      "mcp3",
      "map",
      "threeJs",
      "overall",
      "runtimePolicy",
    ]) {
      assert.equal(
        typeof building[field],
        "string",
        `${building.id}.${field} 必须显式记录`,
      );
    }
    assert.ok(building.records.length > 0, `${building.id} 必须有裁决记录`);
    for (const path of building.records) {
      await access(new URL(path, root));
    }
  }
});

test("证据不足的法华遗韵只计划停用 runtime，文件必须继续保留", async () => {
  const status = await readJson("docs/research/exact-18-building-status.json");
  const heritage = status.buildings.find(({ id }) => id === "fahua-heritage");
  assert.equal(
    heritage.evidence,
    "pass-xhs-side-depth-and-street-context-map-rear-scale-pending",
  );
  assert.match(heritage.runtimePolicy, /preserve-files/);
  assert.match(heritage.runtimePolicy, /disable-runtime-if-still-missing/);
  for (const path of [
    "docs/research/fahua-heritage-final-disposition.json",
    "docs/research/fahua-heritage-local-evidence-rescue.json",
    "docs/research/fahua-heritage-public-evidence-rescue-2026-07-26.json",
    "docs/research/fahua-heritage-xiaohongshu-local-ingestion-2026-07-26.json",
  ]) {
    assert.equal(heritage.records.includes(path), true);
  }
});
