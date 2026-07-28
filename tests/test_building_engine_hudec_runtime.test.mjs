import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCEPTED_BUILDING_TIER_QA,
  resolveBuildingTierQa,
} from "../app/scene/building-massing-qa-contract.mjs";
import landmarkData from "../app/scene/xinhua-road-landmarks-data.json" with { type: "json" };

const assetId = "hudec-memorial";
const engineTier = "engine-master";

test("邬达克 Building Engine Master 只通过显式 QA 参数接入真实地图", () => {
  const resolved = resolveBuildingTierQa(
    `?qaModelId=${assetId}&qaModelTier=${engineTier}`,
  );
  assert.ok(resolved);
  assert.equal(resolved.assetId, assetId);
  assert.equal(resolved.requestedTier, engineTier);
  assert.equal(
    resolved.modelPath,
    "/models/building-engine-spike/hudec-memorial/"
      + "hudec-memorial-master.glb?v=6de1f632a388",
  );
  assert.equal(
    resolved.buildRecord,
    "docs/research/build-records/building-engine-spike/"
      + "hudec-memorial/master.json",
  );
  assert.equal(resolved.runtimePromotionAllowed, false);
  assert.equal(
    resolved.blocker,
    "experimental-building-engine-only-not-production-replacement",
  );
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
  assert.equal(resolved.localObstacles.length, 8);
});

test("邬达克 Engine 碰撞按 glTF Z 轴绑定八个拆分体块", () => {
  const resolved = ACCEPTED_BUILDING_TIER_QA[assetId][engineTier];
  assert.deepEqual(resolved.localObstacles[0], {
    minX: -4.1,
    maxX: 4.1,
    minZ: -2.7,
    maxZ: 2.7,
  });
  assert.deepEqual(resolved.localObstacles[3], {
    minX: -5.7,
    maxX: -1.9,
    minZ: -3.85,
    maxZ: -1.65,
  });
  assert.deepEqual(resolved.localObstacles[4], {
    minX: 2.26,
    maxX: 2.54,
    minZ: 3.41,
    maxZ: 3.69,
  });
  assert.deepEqual(resolved.localObstacles[5], {
    minX: 3.86,
    maxX: 4.14,
    minZ: 3.41,
    maxZ: 3.69,
  });
  assert.deepEqual(resolved.localObstacles[6], {
    minX: -5.25,
    maxX: -4.95,
    minZ: 2.83,
    maxZ: 3.33,
  });
});

test("默认 Hudec 产品入口仍使用已发布 Hero，不会静默切换 Engine", () => {
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
    "/models/requested-pois/hudec-memorial-v2-hero.glb",
  );
  assert.equal(landmark.cacheVersion, "20260726-hero-598b2ba19e24");
});
