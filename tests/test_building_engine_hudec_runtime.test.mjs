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
      + "hudec-memorial-master.glb?v=cd3d49fcc108",
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
  assert.equal(resolved.localObstacles.length, 9);
});

test("邬达克 Engine 碰撞按 glTF Z 轴绑定九个拆分体块", () => {
  const resolved = ACCEPTED_BUILDING_TIER_QA[assetId][engineTier];
  assert.deepEqual(resolved.localObstacles[0], {
    minX: -4.2,
    maxX: 4.2,
    minZ: -2.8,
    maxZ: 1.9,
  });
  assert.deepEqual(resolved.localObstacles[3], {
    minX: -4.65,
    maxX: -0.79,
    minZ: 2.02,
    maxZ: 4.74,
  });
  assert.deepEqual(resolved.localObstacles[5], {
    minX: 2.34,
    maxX: 2.62,
    minZ: 3.5,
    maxZ: 3.78,
  });
  assert.deepEqual(resolved.localObstacles[6], {
    minX: 3.98,
    maxX: 4.26,
    minZ: 3.5,
    maxZ: 3.78,
  });
  assert.deepEqual(resolved.localObstacles[7], {
    minX: -6.15,
    maxX: -5.85,
    minZ: 4.06,
    maxZ: 4.58,
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
