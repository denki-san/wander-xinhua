import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCEPTED_BUILDING_TIER_QA,
  resolveBuildingTierQa,
} from "../app/scene/building-massing-qa-contract.mjs";

const assetId = "villa-le-bec";

test("Villa Le Bec 单页 QA 锁定 MCP3 通过的三档路径与同一 placement", () => {
  const hero = resolveBuildingTierQa(
    `?qaModelId=${assetId}&qaModelTier=hero`,
  );
  const identity = resolveBuildingTierQa(
    `?qaModelId=${assetId}&qaModelTier=identity`,
  );
  const massing = resolveBuildingTierQa(
    `?qaModelId=${assetId}&qaModelTier=massing`,
  );
  assert.equal(
    hero.modelPath,
    "/models/tiers/xinhua-road/hero-v2/villa-le-bec-hero-v2.glb"
      + "?v=20260726-hero-4f909a3b149e",
  );
  assert.equal(
    identity.modelPath,
    "/models/tiers/xinhua-road/identity-v2/villa-le-bec-identity-v2.glb"
      + "?v=20260726-identity-4be0685ed6db",
  );
  assert.equal(
    massing.modelPath,
    "/models/tiers/xinhua-road/massing-v2/villa-le-bec-massing.glb"
      + "?v=20260726-massing-593cc399",
  );
  for (const tier of [hero, identity, massing]) {
    assert.deepEqual(tier.placement, {
      position: [-34.1, 88.8],
      yaw: -0.38,
      scale: 0.82,
    });
    assert.equal(tier.localObstacles.length, 12);
  }
});

test("Villa Le Bec Hero 和 Identity 逐级 fallback，默认产品入口不变", () => {
  assert.deepEqual(Object.keys(ACCEPTED_BUILDING_TIER_QA[assetId]), [
    "hero",
    "identity",
  ]);
  assert.equal(
    resolveBuildingTierQa(
      `?qaModelId=${assetId}&qaModelTier=hero`,
    ).fallbackTier,
    "identity",
  );
  assert.equal(
    resolveBuildingTierQa(
      `?qaModelId=${assetId}&qaModelTier=identity`,
    ).fallbackTier,
    "massing",
  );
  assert.equal(
    resolveBuildingTierQa(
      `?qaModelId=${assetId}&qaModelTier=hero`
      + `&qaActiveFallback=${assetId}:hero`,
    ).forcedFallback,
    true,
  );
  assert.equal(resolveBuildingTierQa("?start=villa-le-bec"), null);
  assert.equal(
    resolveBuildingTierQa("?qaModelId=plane-tree&qaModelTier=hero"),
    null,
  );
});
