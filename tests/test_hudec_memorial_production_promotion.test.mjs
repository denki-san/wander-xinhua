import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { ACCEPTED_DERIVED_BUILDING_TIERS } from "../app/scene/xinhua-road-identity-contract.ts";
import landmarkData from "../app/scene/xinhua-road-landmarks-data.json" with { type: "json" };
import {
  XINHUA_HUDEC_CAMERA_OBSTACLES,
} from "../app/scene/xinhua-road-contract.ts";

const root = new URL("../", import.meta.url);
const assetId = "hudec-memorial";
const worldSource = await readFile(
  new URL("app/scene/xinhua-world.tsx", root),
  "utf8",
);

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim());
}

function positionBounds(glb) {
  const bounds = glb.meshes.flatMap((mesh) => mesh.primitives).map((primitive) => {
    const accessor = glb.accessors[primitive.attributes.POSITION];
    return { min: accessor.min, max: accessor.max };
  });
  return {
    minX: Math.min(...bounds.map(({ min }) => min[0])),
    maxX: Math.max(...bounds.map(({ max }) => max[0])),
    minZ: Math.min(...bounds.map(({ min }) => min[2])),
    maxZ: Math.max(...bounds.map(({ max }) => max[2])),
  };
}

test("Hudec promotion record 与默认 registry、三档合同保持同一真值", async () => {
  const promotion = JSON.parse(await readFile(
    new URL("building-engine/promotions/hudec-memorial.json", root),
    "utf8",
  ));
  const landmark = landmarkData.landmarks.find(({ id }) => id === assetId);
  const tiers = ACCEPTED_DERIVED_BUILDING_TIERS[assetId];

  assert.ok(
    [
      "runtime-pass-pending-project-gates",
      "production-promotion-ready-local",
    ].includes(promotion.status),
    `未知 promotion 状态：${promotion.status}`,
  );
  assert.equal(landmark.model, promotion.production.hero.path);
  assert.equal(landmark.cacheVersion, promotion.production.hero.cacheVersion);
  assert.deepEqual(landmark.localBounds, promotion.production.localBounds);
  assert.deepEqual(landmark.localObstacles, promotion.production.collision.localObstacles);
  assert.equal(landmark.collisionMargin, promotion.production.collision.collisionMargin);
  assert.deepEqual(landmark.position, promotion.production.placement.position);
  assert.equal(landmark.yaw, promotion.production.placement.yaw);
  assert.equal(landmark.scale, promotion.production.placement.scale);
  assert.deepEqual(landmark.start, promotion.production.start.position);
  assert.deepEqual(landmark.forward, promotion.production.start.forward);

  for (const tier of ["hero", "identity", "massing"]) {
    assert.equal(tiers[tier].path, promotion.production[tier].path);
    assert.equal(tiers[tier].cacheVersion, promotion.production[tier].cacheVersion);
  }
  assert.equal(tiers.hero.path, tiers.identity.path);
  assert.equal(tiers.hero.cacheVersion, tiers.identity.cacheVersion);
});

test("Hudec production 二进制、GLB bounds 与缓存版本绑定当前审核 SHA", async () => {
  const promotion = JSON.parse(await readFile(
    new URL("building-engine/promotions/hudec-memorial.json", root),
    "utf8",
  ));
  for (const tier of ["hero", "identity", "massing"]) {
    const contract = promotion.production[tier];
    const buffer = await readFile(new URL(`public${contract.path}`, root));
    assert.equal(sha256(buffer), contract.sha256);
    assert.equal(contract.cacheVersion, contract.sha256.slice(0, 12));
  }

  const master = await readFile(
    new URL(`public${promotion.production.hero.path}`, root),
  );
  const actualBounds = positionBounds(parseGlb(master));
  for (const key of ["minX", "maxX", "minZ", "maxZ"]) {
    assert.ok(
      Math.abs(actualBounds[key] - promotion.production.localBounds[key]) < 0.001,
      `${key} 必须与 Master POSITION bounds 一致`,
    );
  }
});

test("Hudec 正式碰撞逐项来自 DSL collision，旧 V2 Hero 完整保留", async () => {
  const promotion = JSON.parse(await readFile(
    new URL("building-engine/promotions/hudec-memorial.json", root),
    "utf8",
  ));
  const collisionBuffer = await readFile(
    new URL(`public${promotion.production.collision.path}`, root),
  );
  const collision = JSON.parse(collisionBuffer);
  assert.equal(sha256(collisionBuffer), promotion.production.collision.sha256);
  assert.deepEqual(
    collision.obstacles.map(({ minX, maxX, minY, maxY }) => ({
      minX,
      maxX,
      minZ: -maxY,
      maxZ: -minY,
    })),
    promotion.production.collision.localObstacles,
  );
  assert.equal(collision.requiredOpenPaths.length, 3);

  const rollbackBuffer = await readFile(
    new URL(`public${promotion.rollback.hero.path}`, root),
  );
  assert.equal(sha256(rollbackBuffer), promotion.rollback.hero.sha256);
  assert.equal(promotion.rollback.status, "preserved-not-default");
  assert.equal(promotion.rollback.qaTier, "legacy-hero");
});

test("确定性侧向绕行使用显式 QA 起点，普通 start 参数不受影响", () => {
  assert.match(worldSource, /function requestedQaStartOverride\(\)/);
  assert.match(worldSource, /parameters\.get\("qaAutoStart"\) !== "1"/);
  assert.match(worldSource, /parameters\.get\("cameraQa"\) !== "1"/);
  assert.match(worldSource, /parameters\.get\("qaStart"\)/);
  assert.match(worldSource, /qaStart \? \{ \.\.\.preset, position: qaStart \} : preset/);
});

test("Hudec 五个正式实体单独进入相机障碍层，避免窄通路镜头穿模", () => {
  const landmark = landmarkData.landmarks.find(({ id }) => id === assetId);
  assert.equal(XINHUA_HUDEC_CAMERA_OBSTACLES.length, landmark.localObstacles.length);
  assert.equal(XINHUA_HUDEC_CAMERA_OBSTACLES.length, 5);
});
