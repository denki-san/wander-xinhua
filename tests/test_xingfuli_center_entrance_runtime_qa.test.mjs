import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(ROOT, relativePath), "utf8"),
);
const sha256 = (relativePath) => crypto
  .createHash("sha256")
  .update(fs.readFileSync(path.join(ROOT, relativePath)))
  .digest("hex");

test("幸福里中栋入口出生点在生产静态页精确命中且相机未受碰撞压缩", () => {
  const qa = readJson(
    "docs/research/xingfuli-center-entrance-runtime-qa-2026-07-26.json",
  );
  const candidate = readJson(
    "docs/research/xingfuli-center-entrance-direct-start-candidate.json",
  );
  const world = fs.readFileSync(
    path.join(ROOT, "app/scene/xinhua-world.tsx"),
    "utf8",
  );

  assert.equal(qa.assetId, "xingfuli-center");
  assert.deepEqual(qa.candidate.local, candidate.candidate.local);
  assert.deepEqual(qa.candidate.observedWorld, candidate.candidate.world);
  assert.equal(qa.candidate.positionErrorSceneUnits, 0);
  assert.equal(qa.cameraAndCollision.cameraMode, "spring-clear");
  assert.equal(qa.cameraAndCollision.blockerId, "none");
  assert.equal(
    qa.cameraAndCollision.resolvedArm,
    qa.cameraAndCollision.desiredArm,
  );
  assert.equal(qa.cameraAndCollision.playable, true);
  assert.match(world, /xingfuliLocalToWorld\(\s*46,\s*-5\.05,\s*\)/);
});

test("幸福里中栋入口截图和既有单页三档证据被锁定，未夸大 lineage", () => {
  const qa = readJson(
    "docs/research/xingfuli-center-entrance-runtime-qa-2026-07-26.json",
  );

  assert.equal(fs.statSync(path.join(ROOT, qa.screenshot.path)).size, qa.screenshot.bytes);
  assert.equal(sha256(qa.screenshot.path), qa.screenshot.sha256);
  assert.equal(qa.console.errors, 0);
  assert.equal(qa.tierEvidence.repeated, false);
  assert.equal(qa.acceptance.strictTierLineage, "blocked");
  assert.equal(qa.acceptance.runtimePromotionAllowed, false);
  assert.match(qa.acceptance.scope, /^exact-building-only/);
});
