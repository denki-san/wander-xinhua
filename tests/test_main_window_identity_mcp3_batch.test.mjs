import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ACCEPTED_BUILDING_TIER_QA,
  resolveBuildingTierQa,
} from "../app/scene/building-massing-qa-contract.mjs";
import {
  ACCEPTED_DERIVED_BUILDING_TIERS,
  XINHUA_ROAD_BUILDING_QUALITY_MANIFEST,
} from "../app/scene/xinhua-road-identity-contract.ts";
import landmarkData from "../app/scene/xinhua-road-landmarks-data.json" with { type: "json" };

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

for (const {
  assetId,
  mcpRecord,
  position,
  yaw,
  scale,
  obstacleCount,
} of [
  {
    assetId: "hudec-memorial",
    mcpRecord: "docs/research/hudec-memorial-identity-blender-mcp3.json",
    position: [92.535374, -132.52181],
    yaw: 0.153486288,
    scale: 0.88,
    obstacleCount: 5,
  },
  {
    assetId: "xinhua-pocket-park",
    mcpRecord:
      "docs/research/xinhua-pocket-park-identity-blender-mcp3.json",
    position: [-57.421934309, 67.06298037],
    yaw: -0.398058989,
    scale: 0.88,
    obstacleCount: 2,
  },
]) {
  test(`${assetId} Identity MCP3 冻结输入并授权单页运行时`, async () => {
    const record = await readJson(mcpRecord);
    assert.equal(record.status, "pass");
    assert.equal(record.mcp3.fallbackUsed, false);
    assert.deepEqual(record.mcp3.acceptedInteractiveChanges, []);
    assert.equal(record.mcp3.blendSavedByMcp, false);
    assert.equal(record.gateDecision.mcp3, "pass");
    assert.equal(record.gateDecision.runtimeIntegrationAuthorized, true);
    // Build record 在 MCP3 后还会继续写入 runtime 结论，因此 review-time
    // 指纹是历史快照；Blend 与 GLB 两个冻结输入仍必须保持不变。
    assert.match(record.inputs.identityBuildRecord.sha256, /^[0-9a-f]{64}$/);
    for (const input of [
      record.inputs.editableSource,
      record.inputs.runtimeAsset,
    ]) {
      assert.equal(await sha256(input.path), input.sha256, input.path);
    }

    const landmark = landmarkData.landmarks.find(({ id }) => id === assetId);
    assert.deepEqual(landmark.position, position);
    assert.equal(landmark.yaw, yaw);
    assert.equal(landmark.scale, scale);
    assert.equal(landmark.localObstacles.length, obstacleCount);

    const manifest = XINHUA_ROAD_BUILDING_QUALITY_MANIFEST[assetId];
    assert.equal(manifest.identity.strategy, "derived-glb");
    assert.equal(
      manifest.identity.model,
      ACCEPTED_DERIVED_BUILDING_TIERS[assetId].identity.path,
    );
    assert.equal(
      manifest.massing.model,
      ACCEPTED_DERIVED_BUILDING_TIERS[assetId].massing.path,
    );
  });
}

test("两栋显式 QA 三档、逐级 fallback 与18栋范围守卫闭合", () => {
  assert.deepEqual(Object.keys(ACCEPTED_BUILDING_TIER_QA), [
    "hudec-memorial",
    "xinhua-pocket-park",
  ]);
  for (const assetId of Object.keys(ACCEPTED_BUILDING_TIER_QA)) {
    const hero = resolveBuildingTierQa(
      `?qaModelId=${assetId}&qaModelTier=hero`,
    );
    const identity = resolveBuildingTierQa(
      `?qaModelId=${assetId}&qaModelTier=identity`,
    );
    const massing = resolveBuildingTierQa(
      `?qaModelId=${assetId}&qaModelTier=massing`,
    );
    assert.equal(hero.requestedTier, "hero");
    assert.equal(hero.fallbackTier, "identity");
    assert.equal(identity.requestedTier, "identity");
    assert.equal(identity.fallbackTier, "massing");
    assert.equal(massing.requestedTier, "massing");
    assert.equal(
      resolveBuildingTierQa(
        `?qaModelId=${assetId}&qaModelTier=hero`
        + `&qaActiveFallback=${assetId}:hero`,
      ).forcedFallback,
      true,
    );
  }
  assert.equal(
    resolveBuildingTierQa("?qaModelId=plane-tree&qaModelTier=hero"),
    null,
  );
  assert.equal(
    resolveBuildingTierQa("?qaModelId=villa-le-bec&qaModelTier=hero"),
    null,
  );
});

test("单页 QA 明确区分请求档、实际加载档并采集 fallback 帧率", async () => {
  const source = await readFile(
    new URL("../app/scene/xinhua-road-landmarks.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /xinhuaRoadQaRequestedTier/);
  assert.match(source, /xinhuaRoadQaLoadedTier/);
  assert.match(source, /browser-runtime-fallback/);
  assert.match(source, /loadedTier=\{buildingMassingQaActive\.fallbackTier\}/);
});
