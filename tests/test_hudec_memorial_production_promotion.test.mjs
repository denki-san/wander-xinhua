import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { ACCEPTED_DERIVED_BUILDING_TIERS } from "../app/scene/xinhua-road-identity-contract.ts";
import landmarkData from "../app/scene/xinhua-road-landmarks-data.json" with { type: "json" };
import { resolveBuildingTierQa } from "../app/scene/building-massing-qa-contract.mjs";
import {
  hudecCameraObstaclesForQa,
  transformedLandmarkFootprint,
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

async function readDynamicEvidence(relativePath, snapshotId) {
  try {
    return await readFile(new URL(relativePath, root));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  assert.doesNotMatch(relativePath, /(?:^|\/)\.\.(?:\/|$)/);
  const archivePath = [
    "/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots",
    snapshotId,
    "repository",
    relativePath,
  ].join("/");
  try {
    return await readFile(archivePath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    // CI 不挂载用户外置硬盘时，仅校验已提交的路径、bytes 与 SHA 索引。
    return null;
  }
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
  assert.equal(promotion.rollback.collisionMargin, 0.2);
  assert.match(
    promotion.rollback.rollbackProcedure[0],
    /collisionMargin/,
  );
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

test("legacy-hero 同时恢复旧角色碰撞、旧 margin 与旧相机碰撞", () => {
  const landmark = landmarkData.landmarks.find(({ id }) => id === assetId);
  const legacy = resolveBuildingTierQa(
    "?qaModelId=hudec-memorial&qaModelTier=legacy-hero",
  );
  const expectedCameraObstacles = legacy.localObstacles.map(
    (localObstacle) => transformedLandmarkFootprint(
      {
        ...landmark,
        position: [...legacy.placement.position],
        yaw: legacy.placement.yaw,
        scale: legacy.placement.scale,
      },
      localObstacle,
      legacy.collisionMargin,
    ),
  );

  assert.equal(legacy.collisionMargin, 0.2);
  assert.deepEqual(
    hudecCameraObstaclesForQa(legacy),
    expectedCameraObstacles,
  );
  assert.notDeepEqual(
    hudecCameraObstaclesForQa(legacy),
    XINHUA_HUDEC_CAMERA_OBSTACLES,
  );
});

test("production runtime record 的资源、回滚碰撞与截图指纹可复核", async () => {
  const record = JSON.parse(await readFile(
    new URL(
      "docs/research/build-records/building-engine-spike/"
        + "hudec-memorial/production-promotion.json",
      root,
    ),
    "utf8",
  ));

  assert.equal(record.assetId, assetId);
  assert.equal(record.status, "production-promotion-ready-local");
  assert.equal(
    record.defaultProduction.observedHudecResources[1].path,
    "/models/building-engine-spike/hudec-memorial/"
      + "hudec-memorial-master.glb?v=b7002cbd4e5c",
  );
  assert.deepEqual(record.rollbackBaseline.collision, {
    status: "pass",
    characterObstacles: "legacy-five-obstacles",
    cameraObstacles: "legacy-five-obstacles",
    collisionMargin: 0.2,
  });
  assert.equal(record.postReviewRollbackRecheck.status, "pass");
  assert.equal(
    record.postReviewRollbackRecheck.requestedTier,
    "legacy-hero",
  );
  assert.equal(
    record.postReviewRollbackRecheck.loadedTier,
    "legacy-hero",
  );
  assert.equal(
    record.postReviewRollbackRecheck.source,
    "/models/requested-pois/hudec-memorial-v2-hero.glb"
      + "?v=20260726-hero-598b2ba19e24",
  );
  assert.deepEqual(record.postReviewRollbackRecheck.collision, {
    characterObstacles: "legacy-five-obstacles",
    cameraObstacles: "legacy-five-obstacles",
    collisionMargin: 0.2,
    contractTest: "pass",
  });
  assert.equal(record.postReviewRollbackRecheck.consoleErrors, 0);
  assert.equal(record.postReviewRollbackRecheck.pageErrors, 0);
  assert.equal(
    record.postReviewRollbackRecheck.observedFrameSample.includedInMatchedBaseline,
    false,
  );
  assert.match(
    record.postReviewRollbackRecheck.observedFrameSample.exclusionReason,
    /负载|不匹配/,
  );
  assert.equal(
    record.lineage.qaContractSha256,
    sha256(await readFile(
      new URL("app/scene/building-massing-qa-contract.mjs", root),
    )),
  );
  assert.equal(
    record.lineage.cameraCollisionContractSha256,
    "154bb937dc6272e6e96331dfd717a67f7b8fdf9f4aba44091c74473ed1f27e6f",
    "历史 promotion 记录必须冻结当时合同哈希，不得随当前场景合同改写",
  );
  assert.equal(record.publicationBoundary.push, false);
  assert.equal(record.publicationBoundary.merge, false);
  assert.equal(record.publicationBoundary.deploy, false);

  for (const screenshot of record.screenshots) {
    assert.ok(screenshot.bytes > 10_000);
    assert.match(screenshot.sha256, /^[a-f0-9]{64}$/);
    const buffer = await readDynamicEvidence(
      screenshot.path,
      record.acceptanceSnapshot,
    );
    if (buffer === null) continue;
    assert.equal(buffer.byteLength, screenshot.bytes);
    assert.equal(sha256(buffer), screenshot.sha256);
  }
});

test("production promotion 的最终外置快照记录与本地边界闭合", async () => {
  const promotion = JSON.parse(await readFile(
    new URL("building-engine/promotions/hudec-memorial.json", root),
    "utf8",
  ));
  const acceptance = JSON.parse(await readFile(
    new URL(
      "docs/research/build-records/building-engine-spike/"
        + "hudec-memorial/acceptance-snapshot-c2e600a.json",
      root,
    ),
    "utf8",
  ));

  assert.equal(promotion.status, "production-promotion-ready-local");
  assert.equal(acceptance.status, "pass");
  assert.equal(
    promotion.promotionAcceptanceSnapshot,
    acceptance.snapshot.id,
  );
  assert.equal(acceptance.snapshot.sourceWorktreeDirty, false);
  assert.equal(acceptance.snapshot.fileCount, 745);
  assert.equal(acceptance.checksumVerification.independentCheckedFiles, 745);
  assert.equal(acceptance.checksumVerification.independentFailures, 0);
  assert.equal(acceptance.productionBoundary.push, false);
  assert.equal(acceptance.productionBoundary.merge, false);
  assert.equal(acceptance.productionBoundary.deploy, false);
  assert.equal(acceptance.productionBoundary.onlineAcceptance, false);
});
