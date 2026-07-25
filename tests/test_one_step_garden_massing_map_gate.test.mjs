import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(path.join(root, relativePath)))
    .digest("hex");
}

function transformedFootprint({ position, yaw, scale }, localBounds, margin) {
  const [positionX, positionZ] = position;
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  const worldX = [];
  const worldZ = [];

  for (const localX of [localBounds.minX, localBounds.maxX]) {
    for (const sourceZ of [localBounds.minZ, localBounds.maxZ]) {
      // 与运行时一致：Blender GLB 的 Z 轴进入 Three.js 场景时会翻转。
      const localZ = -sourceZ;
      worldX.push(positionX + scale * (cosine * localX + sine * localZ));
      worldZ.push(positionZ + scale * (-sine * localX + cosine * localZ));
    }
  }

  return {
    minX: Math.min(...worldX) - margin,
    maxX: Math.max(...worldX) + margin,
    minZ: Math.min(...worldZ) - margin,
    maxZ: Math.max(...worldZ) + margin,
  };
}

function assertObstacleClose(actual, expected, tolerance = 1e-6) {
  for (const key of ["minX", "maxX", "minZ", "maxZ"]) {
    assert.ok(
      Math.abs(actual[key] - expected[key]) <= tolerance,
      `${key} 应为 ${expected[key]}，实际为 ${actual[key]}`,
    );
  }
}

function isPointClear([x, z], radius, obstacles) {
  return obstacles.every((obstacle) => (
    x + radius <= obstacle.minX
    || x - radius >= obstacle.maxX
    || z + radius <= obstacle.minZ
    || z - radius >= obstacle.maxZ
  ));
}

test("一号花园 Massing map gate 保持单建筑边界并锁定后续授权", async () => {
  const qa = await readJson("docs/research/one-step-garden-massing-map-qa.json");
  const gates = await readJson("docs/research/one-step-garden-blender-mcp-gates.json");
  const record = await readJson(
    "docs/research/build-records/tiers/xinhua-road/massing-v2/one-step-garden-massing.json",
  );

  assert.equal(qa.assetId, "one-step-garden");
  assert.equal(qa.tier, "massing");
  assert.equal(qa.status, "pass");
  assert.equal(qa.qaAssembly.temporary, true);
  assert.equal(qa.qaAssembly.sourceBeforeSha256, qa.qaAssembly.sourceAfterRestoreSha256);
  assert.equal(qa.qaAssembly.sourceRestoredByteIdentical, true);
  assert.equal(qa.qaAssembly.sourceRegistryCommitted, false);
  assert.equal(qa.qaAssembly.heroAssetOverwritten, false);
  assert.equal(qa.qaAssembly.sharedRuntimeFilesCommitted, false);
  assert.deepEqual(qa.qaAssembly.frozenPlacement, {
    position: [60.86, 120.73],
    yawRadians: -0.38,
    scale: 0.88,
    movementAuthorized: false,
  });

  assert.equal(gates.massingGate.status, "pass");
  assert.equal(gates.mapGate.status, "pass");
  assert.equal(gates.mapGate.heroMasterReviewAuthorized, true);
  assert.equal(gates.mapGate.identityAuthorized, false);
  assert.equal(gates.heroGate.status, "ready-for-main-window-review-after-map-gate-pass");
  assert.equal(gates.identityGate.status, "blocked-until-reviewed-hero-master");
  assert.equal(gates.runtimeIntegration.status, "pending-main-window-shared-registry-integration");

  assert.equal(record.status, "mcp1-and-map-pass-awaiting-main-window-runtime-integration");
  assert.equal(record.placement.mapGate, "pass");
  assert.equal(record.mapAcceptance, "pass");
  assert.equal(record.runtimeGate, "pass-temporary-qa-assembly");
  assert.equal(record.runtimeQa.record, "docs/research/one-step-garden-massing-map-qa.json");
  assert.equal(record.runtimeQa.sharedRegistryIntegration, "pending-main-window");
  assert.equal(record.identityAllowed, false);
  assert.equal(record.generatorSha256, await sha256(record.generator));
  assert.ok(record.massingGeometry.omitted.includes("trees"));
  assert.ok(record.massingGeometry.omitted.includes("temporary-commercial-dressing"));
});

test("一号花园 Massing GLB、截图和浏览器资源证据可逐项复核", async () => {
  const qa = await readJson("docs/research/one-step-garden-massing-map-qa.json");
  const glbPath = qa.resource.sourcePath;
  const glb = await readFile(path.join(root, glbPath));
  assert.equal(glb.toString("utf8", 0, 4), "glTF");
  assert.equal(glb.length, 18_316);
  assert.equal(await sha256(glbPath), qa.resource.sourceSha256);
  assert.equal(qa.resource.responseStatus, 200);
  assert.equal(qa.resource.responseContentType, "model/gltf-binary");
  assert.equal(qa.resource.responseContentLength, glb.length);
  assert.equal(qa.resource.sourceSha256, qa.resource.distSha256);
  assert.equal(qa.console.logs.length, 0);
  assert.equal(qa.console.pageErrors.length, 0);
  assert.ok(qa.performance.sampleDurationMs >= 10_000);
  assert.equal(qa.performance.pageVisibility, "visible");
  assert.equal(qa.performance.claim, "absolute-runtime-sample-only-no-performance-improvement-claim");

  for (const screenshot of Object.values(qa.screenshots)) {
    const contents = await readFile(path.join(root, screenshot.path));
    const metadata = await stat(path.join(root, screenshot.path));
    assert.equal(contents.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(metadata.size, screenshot.bytes);
    assert.equal(await sha256(screenshot.path), screenshot.sha256);
    assert.deepEqual(
      [contents.readUInt32BE(16), contents.readUInt32BE(20)],
      [1440, 900],
    );
  }
});

test("一号花园分体碰撞保留入口、前后间隙、起点和相机净空", async () => {
  const qa = await readJson("docs/research/one-step-garden-massing-map-qa.json");
  const placement = {
    position: qa.qaAssembly.frozenPlacement.position,
    yaw: qa.qaAssembly.frozenPlacement.yawRadians,
    scale: qa.qaAssembly.frozenPlacement.scale,
  };
  const margin = qa.collisionAndWalkable.collisionMargin;
  const calculatedObstacles = qa.qaAssembly.proposedLocalObstacles.map(
    (obstacle) => transformedFootprint(placement, obstacle, margin),
  );

  assert.equal(calculatedObstacles.length, 8);
  calculatedObstacles.forEach((obstacle, index) => {
    assertObstacleClose(obstacle, qa.collisionAndWalkable.worldObstacles[index]);
  });
  assertObstacleClose(
    transformedFootprint(placement, qa.qaAssembly.proposedLocalBounds, margin),
    qa.mapCalibration.worldBoundsWithCollisionMargin,
  );

  assert.equal(
    isPointClear(
      qa.collisionAndWalkable.start.position,
      qa.collisionAndWalkable.playerRadius,
      calculatedObstacles,
    ),
    true,
  );
  for (const probe of qa.collisionAndWalkable.cameraProbes) {
    assert.equal(isPointClear(probe.position, 0.26, calculatedObstacles), true);
  }
  assert.ok(
    qa.collisionAndWalkable.entranceClearWidthAfterScaleAndMargins
      > qa.collisionAndWalkable.playerDiameter,
  );
  assert.ok(
    qa.collisionAndWalkable.frontRearClearWidthAfterScaleAndMargins
      > qa.collisionAndWalkable.playerDiameter,
  );
  assert.match(
    qa.collisionAndWalkable.scriptedPaths.wallBlock.result,
    /^pass-character-stopped-/,
  );
  assert.match(
    qa.collisionAndWalkable.scriptedPaths.entranceTraversal.result,
    /^pass-character-entered-/,
  );
});

test("公共 registry 在建筑分支保持旧 Hero，或由主窗口一次性接入提案值", async () => {
  const qa = await readJson("docs/research/one-step-garden-massing-map-qa.json");
  const registry = await readJson("app/scene/xinhua-road-landmarks-data.json");
  const landmark = registry.landmarks.find(({ id }) => id === "one-step-garden");
  assert.ok(landmark);
  assert.deepEqual(landmark.position, [60.86, 120.73]);
  assert.equal(landmark.yaw, -0.38);
  assert.equal(landmark.scale, 0.88);

  if (landmark.model === "/models/xinhua-road/one-step-garden.glb") {
    assert.equal(landmark.cacheVersion, "20260718-detail-1");
    assert.deepEqual(landmark.localObstacles, [
      { minX: -8.8, maxX: 8.8, minZ: -6.1, maxZ: 4.7 },
    ]);
    assert.equal(qa.verdict.sharedRegistryIntegration, "pending-main-window");
  } else {
    assert.equal(landmark.model, qa.qaAssembly.temporaryModelOverride.model);
    assert.equal(landmark.cacheVersion, qa.qaAssembly.temporaryModelOverride.cacheVersion);
    assert.deepEqual(landmark.localBounds, qa.qaAssembly.proposedLocalBounds);
    assert.deepEqual(landmark.localObstacles, qa.qaAssembly.proposedLocalObstacles);
  }
});
