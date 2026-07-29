import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCEPTED_BUILDING_TIER_QA,
  resolveBuildingTierQa,
} from "../app/scene/building-massing-qa-contract.mjs";
import landmarkData from "../app/scene/xinhua-road-landmarks-data.json" with { type: "json" };

const assetId = "hudec-memorial";
const engineTier = "engine-master";

test("邬达克 Building Engine Master 与当前默认生产资产使用同一二进制", () => {
  const resolved = resolveBuildingTierQa(
    `?qaModelId=${assetId}&qaModelTier=${engineTier}`,
  );
  assert.ok(resolved);
  assert.equal(resolved.assetId, assetId);
  assert.equal(resolved.requestedTier, engineTier);
  assert.equal(
    resolved.modelPath,
    "/models/building-engine-spike/hudec-memorial/"
      + "hudec-memorial-master.glb?v=b7002cbd4e5c",
  );
  assert.equal(
    resolved.buildRecord,
    "docs/research/build-records/building-engine-spike/"
      + "hudec-memorial/master.json",
  );
  assert.equal(resolved.runtimePromotionAllowed, true);
  assert.equal(resolved.fallbackTier, "identity");
  assert.equal(resolved.collisionMargin, 0);
  assert.deepEqual(resolved.placement, {
    position: [92.535374, -132.52181],
    yaw: 0.153486288,
    scale: 0.88,
  });
  assert.deepEqual(resolved.start, {
    position: [92.5, -145],
    forward: [0, 1],
  });
  assert.equal(resolved.localObstacles.length, 5);
});

test("邬达克 Engine 碰撞按 glTF Z 轴绑定五个 DSL 拆分体块", () => {
  const resolved = ACCEPTED_BUILDING_TIER_QA[assetId][engineTier];
  assert.deepEqual(resolved.localObstacles[0], {
    minX: -4.6,
    maxX: 4.6,
    minZ: -2.85,
    maxZ: 1.95,
  });
  assert.deepEqual(resolved.localObstacles[3], {
    minX: -6.65,
    maxX: -4.25,
    minZ: -1.8,
    maxZ: 3.1,
  });
  assert.deepEqual(resolved.localObstacles[4], {
    minX: 4.075,
    maxX: 6.225,
    minZ: -2.25,
    maxZ: 0.85,
  });
});

test("默认 Hudec 产品入口使用 A 方案，旧 V2 Hero 只保留显式回滚入口", () => {
  const landmark = landmarkData.landmarks.find(({ id }) => id === assetId);
  assert.equal(resolveBuildingTierQa("?start=hudec"), null);
  assert.equal(
    resolveBuildingTierQa(
      "?qaModelId=house-315&qaModelTier=engine-master",
    ),
    null,
  );
  assert.equal(
    landmark.model,
    "/models/building-engine-spike/hudec-memorial/hudec-memorial-master.glb",
  );
  assert.equal(landmark.cacheVersion, "b7002cbd4e5c");
  const rollback = resolveBuildingTierQa(
    "?qaModelId=hudec-memorial&qaModelTier=legacy-hero",
  );
  assert.equal(
    rollback.modelPath,
    "/models/requested-pois/hudec-memorial-v2-hero.glb"
      + "?v=20260726-hero-598b2ba19e24",
  );
  assert.equal(rollback.rollbackOnly, true);
  assert.equal(rollback.runtimePromotionAllowed, false);
  assert.equal(rollback.collisionMargin, 0.2);
});
