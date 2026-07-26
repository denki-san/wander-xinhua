import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  resolveBuildingMassingQa,
} from "../app/scene/building-massing-qa-contract.mjs";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(`../${path}`, import.meta.url)))
    .digest("hex");
}

test("329弄 Massing 的精准碰撞壳与真实页面终验同步", async () => {
  const qa = resolveBuildingMassingQa(
    "?qaModelId=xinhua-villas-329&qaModelTier=massing",
  );
  const record = await readJson(
    "docs/research/xinhua-villas-329-threejs-runtime-qa-v2.json",
  );
  assert.equal(qa.localObstacles.length, 14);
  assert.deepEqual(qa.placement, record.inputs.placement);
  assert.equal(record.status, "pass-massing-map-and-runtime");
  assert.equal(record.runtime.loadStatus, "loaded");
  assert.equal(record.runtime.consoleErrors, 0);
  assert.ok(record.runtime.frameSample.fps >= 50);
  assert.ok(record.collision.targetError >= 6);
  assert.equal(record.map.formalMassingAcceptance, "pass");
  assert.equal(record.scope.buildingComplete, false);
  assert.equal(
    await sha256(record.screenshot.path),
    record.screenshot.sha256,
  );
});

test("Villa Le Bec 的两栋实体阻挡人物且中间通路保持开放", async () => {
  const qa = resolveBuildingMassingQa(
    "?qaModelId=villa-le-bec&qaModelTier=massing",
  );
  const record = await readJson(
    "docs/research/villa-le-bec-threejs-runtime-qa-v2.json",
  );
  assert.equal(qa.localObstacles.length, 12);
  assert.deepEqual(qa.placement, record.inputs.placement);
  assert.equal(record.status, "pass-massing-map-and-runtime");
  assert.equal(record.runtime.loadStatus, "loaded");
  assert.equal(record.runtime.consoleErrors, 0);
  assert.ok(record.runtime.frameSample.fps >= 50);
  assert.ok(record.openPassage.targetError <= 0.02);
  assert.ok(record.buildingCollision.targetError >= 3.7);
  assert.equal(record.map.formalMassingAcceptance, "pass");
  assert.equal(record.scope.buildingComplete, false);
  assert.equal(
    await sha256(record.screenshot.path),
    record.screenshot.sha256,
  );
});
