import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ONE_STEP_GARDEN_ASSET_ID,
  ONE_STEP_GARDEN_FALLBACK_CHAIN,
  ONE_STEP_GARDEN_PLACEMENT,
  ONE_STEP_GARDEN_SOURCE_GLTF_BOUNDS,
  ONE_STEP_GARDEN_SOURCE_GLTF_OBSTACLES,
  ONE_STEP_GARDEN_TIERS,
  resolveOneStepGardenQa,
} from "../app/scene/one-step-garden-tier-contract.mjs";
import {
  PRODUCTION_BUILDING_QUALITY_MANIFEST,
  XINHUA_ROAD_BUILDING_QUALITY_MANIFEST,
} from "../app/scene/xinhua-road-identity-contract.ts";
import {
  transformedLandmarkFootprint,
} from "../app/scene/xinhua-road-contract.ts";

const root = new URL("../", import.meta.url);

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim());
}

function triangleCount(glb) {
  return (glb.meshes ?? []).reduce((total, mesh) => (
    total + mesh.primitives.reduce((meshTotal, primitive) => {
      const accessorIndex = primitive.indices ?? primitive.attributes.POSITION;
      return meshTotal + glb.accessors[accessorIndex].count / 3;
    }, 0)
  ), 0);
}

function roundedFootprint(footprint) {
  return Object.fromEntries(
    Object.entries(footprint).map(([key, value]) => [key, Number(value.toFixed(6))]),
  );
}

test("One Step Garden 三档二进制与共享空间合同精确一致", async () => {
  const expectedRecords = {
    hero: "docs/research/build-records/tiers/xinhua-road/hero-v2/one-step-garden-hero.json",
    identity:
      "docs/research/build-records/tiers/xinhua-road/identity-v1/one-step-garden-identity.json",
    massing:
      "docs/research/build-records/tiers/xinhua-road/massing-v2/one-step-garden-massing.json",
  };

  for (const tierName of ["hero", "identity", "massing"]) {
    const descriptor = ONE_STEP_GARDEN_TIERS[tierName];
    const [buffer, record] = await Promise.all([
      readFile(new URL(`public${descriptor.path}`, root)),
      readFile(new URL(expectedRecords[tierName], root), "utf8").then(JSON.parse),
    ]);
    const glb = parseGlb(buffer);
    assert.equal(buffer.length, descriptor.bytes);
    assert.equal(sha256(buffer), descriptor.sha256);
    assert.equal(triangleCount(glb), descriptor.triangles);
    assert.equal(glb.materials.length, descriptor.materials);
    assert.deepEqual(descriptor.origin, [0, 0, 0]);
    assert.equal(descriptor.frontDirection, "blender-local-negative-y");
    assert.equal(descriptor.runtimeFrontDirection, "three-local-negative-z");
    assert.equal(descriptor.groundDatum, 0);
    assert.deepEqual(descriptor.bounds, ONE_STEP_GARDEN_SOURCE_GLTF_BOUNDS);
    assert.deepEqual(
      descriptor.runtimeLocalBounds,
      ONE_STEP_GARDEN_PLACEMENT.renderedLocalBounds,
    );
    assert.deepEqual(record.glb.bounds.min, [-7.25, 0, -9.325]);
    assert.deepEqual(record.glb.bounds.max, [7.25, 6.25, 6.9]);
    assert.equal(record.glb.sha256, descriptor.sha256);
    assert.equal(record.glb.bytes, descriptor.bytes);
    const placement = record.placement ?? {
      position: record.continuity.runtimePosition,
      yaw: record.continuity.runtimeYaw,
      runtimeScale: record.continuity.runtimeScale,
    };
    assert.deepEqual(placement.position, ONE_STEP_GARDEN_PLACEMENT.position);
    assert.equal(placement.yaw, ONE_STEP_GARDEN_PLACEMENT.yaw);
    assert.equal(placement.runtimeScale, ONE_STEP_GARDEN_PLACEMENT.scale);
  }
});

test("One Step Garden 生产 Hero、全览 Identity、封面 Massing 使用同一合同", async () => {
  const landmarkData = JSON.parse(await readFile(
    new URL("app/scene/xinhua-road-landmarks-data.json", root),
    "utf8",
  ));
  const landmark = landmarkData.landmarks.find(
    ({ id }) => id === ONE_STEP_GARDEN_ASSET_ID,
  );
  assert.ok(landmark);
  assert.equal(landmark.model, ONE_STEP_GARDEN_TIERS.hero.path);
  assert.equal(landmark.cacheVersion, ONE_STEP_GARDEN_TIERS.hero.cacheVersion);
  assert.deepEqual(landmark.position, ONE_STEP_GARDEN_PLACEMENT.position);
  assert.equal(landmark.yaw, ONE_STEP_GARDEN_PLACEMENT.yaw);
  assert.equal(landmark.scale, ONE_STEP_GARDEN_PLACEMENT.scale);
  assert.deepEqual(landmark.localBounds, ONE_STEP_GARDEN_PLACEMENT.localBounds);
  assert.deepEqual(landmark.localObstacles, ONE_STEP_GARDEN_PLACEMENT.localObstacles);
  assert.equal(landmark.localObstacles.length, 8);

  const quality = XINHUA_ROAD_BUILDING_QUALITY_MANIFEST[ONE_STEP_GARDEN_ASSET_ID];
  assert.equal(quality.hero.model, ONE_STEP_GARDEN_TIERS.hero.path);
  assert.equal(quality.hero.cacheVersion, ONE_STEP_GARDEN_TIERS.hero.cacheVersion);
  assert.equal(quality.identity.strategy, "derived-glb");
  assert.equal(quality.identity.model, ONE_STEP_GARDEN_TIERS.identity.path);
  assert.equal(
    quality.identity.cacheVersion,
    ONE_STEP_GARDEN_TIERS.identity.cacheVersion,
  );
  assert.equal(quality.massing.strategy, "derived-glb");
  assert.equal(quality.massing.model, ONE_STEP_GARDEN_TIERS.massing.path);
  assert.equal(
    quality.massing.cacheVersion,
    ONE_STEP_GARDEN_TIERS.massing.cacheVersion,
  );
  assert.deepEqual(quality.shared.position, ONE_STEP_GARDEN_PLACEMENT.position);
  assert.deepEqual(
    quality.shared.localObstacles,
    ONE_STEP_GARDEN_PLACEMENT.localObstacles,
  );

  const production =
    PRODUCTION_BUILDING_QUALITY_MANIFEST[ONE_STEP_GARDEN_ASSET_ID];
  assert.deepEqual(production.hero.assets, [ONE_STEP_GARDEN_TIERS.hero.url]);
  assert.deepEqual(
    production.identity.assets,
    [ONE_STEP_GARDEN_TIERS.identity.url],
  );
  assert.deepEqual(
    production.massing.assets,
    [ONE_STEP_GARDEN_TIERS.massing.url],
  );
});

test("One Step Garden QA 深链与生产解析同 URL，故障只切换回退档", () => {
  for (const tierName of ["hero", "identity", "massing"]) {
    const resolved = resolveOneStepGardenQa(
      `?start=garden179&qaModelId=one-step-garden&qaModelTier=${tierName}`,
    );
    assert.equal(resolved.requestedTier, tierName);
    assert.equal(resolved.renderedTier, tierName);
    assert.equal(resolved.modelPath, ONE_STEP_GARDEN_TIERS[tierName].url);
    assert.equal(resolved.renderedModelPath, ONE_STEP_GARDEN_TIERS[tierName].url);
    assert.equal(resolved.forcedFallback, false);
  }

  const heroFallback = resolveOneStepGardenQa(
    "?qaModelId=one-step-garden&qaModelTier=hero&qaActiveFallback=one-step-garden:hero",
  );
  assert.equal(heroFallback.modelPath, ONE_STEP_GARDEN_TIERS.hero.url);
  assert.equal(
    heroFallback.renderedModelPath,
    ONE_STEP_GARDEN_TIERS.identity.url,
  );
  assert.equal(heroFallback.renderedTier, "identity");
  assert.equal(heroFallback.fallbackMode, "forced-deterministic-fallback");
  assert.equal(
    heroFallback.fallbackReason,
    "forced-deterministic-hero-to-identity",
  );

  const identityFallback = resolveOneStepGardenQa(
    "?qaModelId=one-step-garden&qaModelTier=identity&qaActiveFallback=one-step-garden:identity",
  );
  assert.equal(identityFallback.modelPath, ONE_STEP_GARDEN_TIERS.identity.url);
  assert.equal(
    identityFallback.renderedModelPath,
    ONE_STEP_GARDEN_TIERS.massing.url,
  );
  assert.equal(identityFallback.renderedTier, "massing");
  assert.equal(identityFallback.fallbackMode, "forced-deterministic-fallback");
  assert.equal(
    identityFallback.fallbackReason,
    "forced-deterministic-identity-to-massing",
  );
  const massingFloor = resolveOneStepGardenQa(
    "?qaModelId=one-step-garden&qaModelTier=massing&qaActiveFallback=one-step-garden:massing",
  );
  assert.equal(massingFloor.forcedFallback, false);
  assert.equal(massingFloor.fallbackMode, "no-lower-tier");
  assert.equal(massingFloor.fallbackReason, "no-lower-tier-render-massing");
  assert.equal(massingFloor.renderedTier, "massing");
  assert.equal(massingFloor.renderedModelPath, ONE_STEP_GARDEN_TIERS.massing.url);
  assert.deepEqual(ONE_STEP_GARDEN_FALLBACK_CHAIN, {
    hero: "identity",
    identity: "massing",
    massing: null,
  });
  assert.equal(resolveOneStepGardenQa("?start=garden179"), null);
  assert.equal(
    resolveOneStepGardenQa(
      "?qaModelId=film-art-center&qaModelTier=hero",
    ),
    null,
  );
  const unscopedFallback = resolveOneStepGardenQa(
    "?qaModelId=one-step-garden&qaModelTier=identity&qaActiveFallback=identity",
  );
  assert.equal(unscopedFallback.forcedFallback, false);
  assert.equal(unscopedFallback.fallbackMode, "none");
});

test("One Step Garden 运行时没有第二 URL 或额外中心偏移", async () => {
  const [runtime, landmarks, massing] = await Promise.all([
    readFile(new URL("app/scene/one-step-garden-runtime.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-road-landmarks.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-road-massing.tsx", root), "utf8"),
  ]);
  assert.match(runtime, /useGLTF\(descriptor\.url\)/);
  assert.match(runtime, /requestedUrl: requestedDescriptor\.url/);
  assert.match(runtime, /loadedUrl: descriptor\.url/);
  assert.match(runtime, /<primitive object=\{model\} scale=\{\[1, 1, -1\]\} \/>/);
  assert.doesNotMatch(runtime, /test_missing|centerOffset|position=\{\[center/);
  assert.match(landmarks, /landmark\.id === ONE_STEP_GARDEN_ASSET_ID/);
  assert.match(landmarks, /<OneStepGardenRuntimeAsset/);
  assert.match(massing, /requestedTier=\{identity \? "identity" : "massing"\}/);
  assert.doesNotMatch(massing, /one-step-garden[\s\S]{0,500}position=\{\[center/);
});

test("One Step Garden 八段碰撞保持入口与前后间隙开放", async () => {
  const qa = JSON.parse(await readFile(
    new URL("docs/research/one-step-garden-massing-map-qa.json", root),
    "utf8",
  ));
  assert.equal(qa.status, "pass");
  assert.deepEqual(qa.qaAssembly.proposedLocalBounds, ONE_STEP_GARDEN_SOURCE_GLTF_BOUNDS);
  assert.deepEqual(
    qa.qaAssembly.proposedLocalObstacles,
    ONE_STEP_GARDEN_SOURCE_GLTF_OBSTACLES,
  );
  assert.deepEqual(ONE_STEP_GARDEN_PLACEMENT.localBounds, ONE_STEP_GARDEN_SOURCE_GLTF_BOUNDS);
  assert.deepEqual(ONE_STEP_GARDEN_PLACEMENT.renderedLocalBounds, {
    minX: -7.25,
    maxX: 7.25,
    minZ: -6.9,
    maxZ: 9.325,
  });
  assert.deepEqual(
    ONE_STEP_GARDEN_PLACEMENT.renderedLocalObstacles,
    ONE_STEP_GARDEN_SOURCE_GLTF_OBSTACLES.map(
      ({ minX, maxX, minZ, maxZ }) => ({
        minX,
        maxX,
        minZ: -maxZ,
        maxZ: -minZ,
      }),
    ),
  );
  const landmarkData = JSON.parse(await readFile(
    new URL("app/scene/xinhua-road-landmarks-data.json", root),
    "utf8",
  ));
  const landmark = landmarkData.landmarks.find(
    ({ id }) => id === ONE_STEP_GARDEN_ASSET_ID,
  );
  assert.deepEqual(landmark.localBounds, ONE_STEP_GARDEN_SOURCE_GLTF_BOUNDS);
  assert.deepEqual(landmark.localObstacles, ONE_STEP_GARDEN_SOURCE_GLTF_OBSTACLES);
  const worldBounds = roundedFootprint(
    transformedLandmarkFootprint(landmark, landmark.localBounds),
  );
  assert.deepEqual(worldBounds, qa.mapCalibration.worldBoundsWithCollisionMargin);
  assert.deepEqual(
    landmark.localObstacles.map(
      (obstacle) => roundedFootprint(
        transformedLandmarkFootprint(landmark, obstacle),
      ),
    ),
    qa.collisionAndWalkable.worldObstacles,
  );
  assert.equal(qa.collisionAndWalkable.entrancePass, true);
  assert.equal(qa.collisionAndWalkable.frontRearPass, true);
  assert.ok(qa.collisionAndWalkable.entranceClearWidthAfterScaleAndMargins > 0.96);
  assert.ok(qa.collisionAndWalkable.frontRearClearWidthAfterScaleAndMargins > 0.96);
  assert.equal(
    qa.collisionAndWalkable.scriptedPaths.wallBlock.result,
    "pass-character-stopped-at-left-front-wing-wall",
  );
  assert.equal(
    qa.collisionAndWalkable.scriptedPaths.entranceTraversal.result,
    "pass-character-entered-under-open-canopy-into-front-courtyard",
  );
});

test("One Step Garden 旧错误 Hero 只读 Hold，未被生产 registry 继续引用", async () => {
  const [legacy, disposition] = await Promise.all([
    readFile(new URL("public/models/xinhua-road/one-step-garden.glb", root)),
    readFile(
      new URL("docs/research/one-step-garden-hero-disposition.json", root),
      "utf8",
    ).then(JSON.parse),
  ]);
  assert.equal(
    sha256(legacy),
    "a68b4e25a44e922af8d98cd4f2e0ee00486b93d94d08b005816e5ceea5b86627",
  );
  assert.equal(
    disposition.decision.legacyHeroDisposition,
    "hold-read-only-rollback-only",
  );
  assert.notEqual(ONE_STEP_GARDEN_TIERS.hero.sha256, sha256(legacy));
  assert.notEqual(
    ONE_STEP_GARDEN_TIERS.hero.path,
    "/models/xinhua-road/one-step-garden.glb",
  );
});
