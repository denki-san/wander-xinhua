import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";
import {
  SHANGHAI_CINEMA_MAP_CALIBRATION,
  SHANGHAI_CINEMA_MASSING_CACHE_VERSION,
  SHANGHAI_CINEMA_MASSING_GLB_BOUNDS,
  SHANGHAI_CINEMA_MASSING_GLB_SHA256,
  SHANGHAI_CINEMA_MASSING_MODEL_PATH,
  SHANGHAI_CINEMA_MCP3_HUMAN_SCALE,
  SHANGHAI_CINEMA_MCP3_QA_VIEWS,
  blenderPointToShanghaiCinemaRuntimeLocal,
  shanghaiCinemaBlenderPointToWorld,
} from "../app/scene/shanghai-cinema-massing-contract.mjs";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

async function parseGlb(path) {
  const buffer = await readFile(new URL(path, root));
  assert.equal(buffer.toString("ascii", 0, 4), "glTF", `${path} 必须是 GLB`);
  const jsonLength = buffer.readUInt32LE(12);
  return {
    buffer,
    json: JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8")),
  };
}

function triangles(glb) {
  return (glb.meshes ?? []).flatMap((mesh) => mesh.primitives ?? [])
    .reduce((total, primitive) => {
      const accessor = primitive.indices === undefined
        ? glb.accessors[primitive.attributes.POSITION]
        : glb.accessors[primitive.indices];
      return total + accessor.count / 3;
    }, 0);
}

function assertRootTransformNormalized(glb, label) {
  assert.equal(glb.nodes.length, 1, `${label} 应只有一个运行时根节点`);
  assert.equal(glb.nodes[0].translation, undefined, `${label} 根节点不得平移`);
  assert.equal(glb.nodes[0].rotation, undefined, `${label} 根节点不得旋转`);
  assert.equal(glb.nodes[0].scale, undefined, `${label} 根节点不得缩放`);
}

function finalAuditObstacle(landmark, obstacle, margin) {
  const cosine = Math.cos(landmark.yaw);
  const sine = Math.sin(landmark.yaw);
  const worldX = [];
  const worldZ = [];
  for (const localX of [obstacle.minX, obstacle.maxX]) {
    for (const sourceZ of [obstacle.minZ, obstacle.maxZ]) {
      const localZ = -sourceZ;
      worldX.push(
        landmark.position[0]
          + landmark.scale * (cosine * localX + sine * localZ),
      );
      worldZ.push(
        landmark.position[1]
          + landmark.scale * (-sine * localX + cosine * localZ),
      );
    }
  }
  return {
    minX: Math.min(...worldX) - margin,
    maxX: Math.max(...worldX) + margin,
    minZ: Math.min(...worldZ) - margin,
    maxZ: Math.max(...worldZ) + margin,
  };
}

function finalAuditAabbOverlap(first, second) {
  const x = Math.min(first.maxX, second.maxX)
    - Math.max(first.minX, second.minX);
  const z = Math.min(first.maxZ, second.maxZ)
    - Math.max(first.minZ, second.minZ);
  return {
    intersects: x >= 0 && z >= 0,
    x,
    z,
    area: Math.max(0, x) * Math.max(0, z),
  };
}

function assertFinalAuditAabbClose(actual, expected) {
  for (const key of ["minX", "maxX", "minZ", "maxZ"]) {
    assert.ok(
      Math.abs(actual[key] - expected[key]) < 1e-12,
      `${key} 的浮点序列化差异必须小于 1e-12`,
    );
  }
}

function finalAuditPointHits(point, obstacle, radius) {
  return point[0] >= obstacle.minX - radius
    && point[0] <= obstacle.maxX + radius
    && point[1] >= obstacle.minZ - radius
    && point[1] <= obstacle.maxZ + radius;
}

function finalAuditCorners(landmark, bounds = landmark.localBounds) {
  const cosine = Math.cos(landmark.yaw);
  const sine = Math.sin(landmark.yaw);
  return [
    [bounds.minX, -bounds.minZ],
    [bounds.maxX, -bounds.minZ],
    [bounds.maxX, -bounds.maxZ],
    [bounds.minX, -bounds.maxZ],
  ].map(([localX, localZ]) => [
    landmark.position[0]
      + landmark.scale * (cosine * localX + sine * localZ),
    landmark.position[1]
      + landmark.scale * (-sine * localX + cosine * localZ),
  ]);
}

function finalAuditOrientation(start, end, point) {
  return (end[0] - start[0]) * (point[1] - start[1])
    - (end[1] - start[1]) * (point[0] - start[0]);
}

function finalAuditPointOnSegment(point, start, end) {
  return Math.abs(finalAuditOrientation(start, end, point)) <= 1e-9
    && point[0] >= Math.min(start[0], end[0]) - 1e-9
    && point[0] <= Math.max(start[0], end[0]) + 1e-9
    && point[1] >= Math.min(start[1], end[1]) - 1e-9
    && point[1] <= Math.max(start[1], end[1]) + 1e-9;
}

function finalAuditPointToSegmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const ratio = Math.max(0, Math.min(1, (
    (point[0] - start[0]) * dx + (point[1] - start[1]) * dz
  ) / (dx * dx + dz * dz)));
  return Math.hypot(
    point[0] - start[0] - ratio * dx,
    point[1] - start[1] - ratio * dz,
  );
}

function finalAuditSegmentsIntersect(startA, endA, startB, endB) {
  const aStart = finalAuditOrientation(startA, endA, startB);
  const aEnd = finalAuditOrientation(startA, endA, endB);
  const bStart = finalAuditOrientation(startB, endB, startA);
  const bEnd = finalAuditOrientation(startB, endB, endA);
  return aStart * aEnd < 0 && bStart * bEnd < 0
    || finalAuditPointOnSegment(startB, startA, endA)
    || finalAuditPointOnSegment(endB, startA, endA)
    || finalAuditPointOnSegment(startA, startB, endB)
    || finalAuditPointOnSegment(endA, startB, endB);
}

function finalAuditSegmentDistance(startA, endA, startB, endB) {
  if (finalAuditSegmentsIntersect(startA, endA, startB, endB)) return 0;
  return Math.min(
    finalAuditPointToSegmentDistance(startA, startB, endB),
    finalAuditPointToSegmentDistance(endA, startB, endB),
    finalAuditPointToSegmentDistance(startB, startA, endA),
    finalAuditPointToSegmentDistance(endB, startA, endA),
  );
}

function finalAuditPolygonToPolylineDistance(polygon, polyline) {
  let distance = Number.POSITIVE_INFINITY;
  for (let edge = 0; edge < polygon.length; edge += 1) {
    for (let segment = 1; segment < polyline.length; segment += 1) {
      distance = Math.min(distance, finalAuditSegmentDistance(
        polygon[edge],
        polygon[(edge + 1) % polygon.length],
        polyline[segment - 1],
        polyline[segment],
      ));
    }
  }
  return distance;
}

function finalAuditProjectOsmPoint(point, mapData) {
  const [centerLon, centerLat] = mapData.meta.centerWgs84;
  return [
    (point.lon - centerLon)
      * 111_320 * Math.cos(centerLat * Math.PI / 180)
      / mapData.meta.metersPerSceneUnit,
    -(point.lat - centerLat)
      * 110_540 / mapData.meta.metersPerSceneUnit,
  ];
}

function finalAuditPolygonCentroid(points) {
  let twiceArea = 0;
  let x = 0;
  let z = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [startX, startZ] = points[index];
    const [endX, endZ] = points[(index + 1) % points.length];
    const cross = startX * endZ - endX * startZ;
    twiceArea += cross;
    x += (startX + endX) * cross;
    z += (startZ + endZ) * cross;
  }
  return [x / (3 * twiceArea), z / (3 * twiceArea)];
}

function finalAuditOrientedOverlap(
  referenceLandmark,
  otherLandmark,
  referenceBounds,
  otherBounds,
  perAssetMargin = 0,
) {
  assert.equal(referenceLandmark.yaw, otherLandmark.yaw);
  assert.equal(referenceLandmark.scale, 1);
  assert.equal(otherLandmark.scale, 1);
  const cosine = Math.cos(referenceLandmark.yaw);
  const sine = Math.sin(referenceLandmark.yaw);
  const dx = otherLandmark.position[0] - referenceLandmark.position[0];
  const dz = otherLandmark.position[1] - referenceLandmark.position[1];
  const offsetX = cosine * dx - sine * dz;
  const offsetZ = -sine * dx - cosine * dz;
  const otherInReference = {
    minX: offsetX + otherBounds.minX - perAssetMargin,
    maxX: offsetX + otherBounds.maxX + perAssetMargin,
    minZ: offsetZ + otherBounds.minZ - perAssetMargin,
    maxZ: offsetZ + otherBounds.maxZ + perAssetMargin,
  };
  const x = Math.min(
    referenceBounds.maxX + perAssetMargin,
    otherInReference.maxX,
  ) - Math.max(
    referenceBounds.minX - perAssetMargin,
    otherInReference.minX,
  );
  const z = Math.min(
    referenceBounds.maxZ + perAssetMargin,
    otherInReference.maxZ,
  ) - Math.max(
    referenceBounds.minZ - perAssetMargin,
    otherInReference.minZ,
  );
  return {
    intersects: x >= 0 && z >= 0,
    x,
    z,
    area: Math.max(0, x) * Math.max(0, z),
    separationX: Math.max(0, -x),
    separationZ: Math.max(0, -z),
  };
}

test("上海影城当前正式 Massing 二进制、build record 与预算一致", async () => {
  const [record, massing] = await Promise.all([
    readJson("docs/research/build-records/shanghai-cinema-massing.json"),
    parseGlb("public/models/xinhua-road/shanghai-cinema-massing.glb"),
  ]);
  assert.equal(
    await sha256("public/models/xinhua-road/shanghai-cinema-massing.glb"),
    SHANGHAI_CINEMA_MASSING_GLB_SHA256,
  );
  assert.equal(record.assetId, "shanghai-cinema");
  assert.equal(record.tier, "massing");
  assert.equal(record.outputs.glb.sha256, SHANGHAI_CINEMA_MASSING_GLB_SHA256);
  assert.equal(record.outputs.glb.cacheVersion, SHANGHAI_CINEMA_MASSING_CACHE_VERSION);
  assert.equal(record.audit.bytes, massing.buffer.length);
  assert.equal(record.audit.nodes, massing.json.nodes.length);
  assert.equal(record.audit.meshes, massing.json.meshes.length);
  assert.equal(record.audit.triangles, triangles(massing.json));
  assert.equal(record.audit.materials, massing.json.materials.length);
  assert.equal(record.audit.images, massing.json.images?.length ?? 0);
  assert.equal(record.audit.textures, massing.json.textures?.length ?? 0);
  assert.ok(record.audit.triangles <= record.budget.maxTriangles);
  assert.ok(record.audit.bytes <= record.budget.maxBytes);
  assertRootTransformNormalized(massing.json, "Massing");
  assert.equal(massing.json.nodes[0].extras.stable_asset_id, "shanghai-cinema");
  assert.equal(massing.json.nodes[0].extras.runtime_tier, "massing");
  assert.equal(
    massing.json.nodes[0].extras.derived_from_hero_sha256,
    record.sourceHero.glb.sha256,
  );
  assert.equal(
    massing.json.nodes[0].extras.derived_from_identity_sha256,
    record.sourceIdentity.glb.sha256,
  );
});

test("上海影城 Identity lineage 复用当前 Hero，且三档根变换一致", async () => {
  const [lineage, identityRecord, hero, identity, massing] = await Promise.all([
    readJson("docs/research/shanghai-cinema-tier-lineage.json"),
    readJson("docs/research/build-records/shanghai-cinema-hybrid-identity.json"),
    parseGlb("public/models/xinhua-road/shanghai-cinema.glb"),
    parseGlb("public/models/xinhua-road/shanghai-cinema-hybrid-identity.glb"),
    parseGlb("public/models/xinhua-road/shanghai-cinema-massing.glb"),
  ]);
  assert.equal(lineage.status, "passed-with-composite-identity-boundary");
  assert.equal(
    await sha256(lineage.hero.glb),
    lineage.hero.glbSha256,
  );
  assert.equal(
    await sha256(lineage.identity.glb),
    lineage.identity.glbSha256,
  );
  assert.equal(
    await sha256(lineage.massing.glb),
    lineage.massing.glbSha256,
  );
  assert.equal(
    identityRecord.lineage.derivedFromHero.glbSha256,
    lineage.hero.glbSha256,
  );
  assert.match(
    await readFile(new URL(lineage.identity.generator, root), "utf8"),
    /from create_xinhua_road_models import/,
  );
  assert.deepEqual(lineage.identity.runtimeComposition, [
    "ShanghaiCinemaProgrammaticBody",
    "ShanghaiCinemaIdentityGlb",
    "ShanghaiCinemaRepeatedDetails",
  ]);
  assert.match(lineage.identity.boundary, /GLB alone is not the complete Identity tier/);
  assertRootTransformNormalized(hero.json, "Hero");
  assertRootTransformNormalized(identity.json, "Identity");
  assertRootTransformNormalized(massing.json, "Massing");
  assert.equal(hero.json.images?.length ?? 0, 0);
  assert.equal(identity.json.images?.length ?? 0, 0);
  assert.equal(massing.json.images?.length ?? 0, 0);
});

test("上海影城 Massing 地图位置、朝向、地面、退界和人物尺度合同冻结", async () => {
  const landmarkData = await readJson("app/scene/xinhua-road-landmarks-data.json");
  const cinema = landmarkData.landmarks.find(({ id }) => id === "shanghai-cinema");
  assert.ok(cinema);
  assert.deepEqual(cinema.position, SHANGHAI_CINEMA_MAP_CALIBRATION.position);
  assert.equal(cinema.yaw, SHANGHAI_CINEMA_MAP_CALIBRATION.yaw);
  assert.equal(cinema.scale, SHANGHAI_CINEMA_MAP_CALIBRATION.scale);
  assert.equal(SHANGHAI_CINEMA_MAP_CALIBRATION.terrainY, 0.909780347);
  assert.equal(SHANGHAI_CINEMA_MAP_CALIBRATION.terrainClearance, 0.1);
  assert.equal(SHANGHAI_CINEMA_MAP_CALIBRATION.placementY, 1.009780347);
  assert.deepEqual(cinema.localBounds, SHANGHAI_CINEMA_MAP_CALIBRATION.localBounds);
  assert.deepEqual(cinema.localObstacles, SHANGHAI_CINEMA_MAP_CALIBRATION.localObstacles);
  assert.deepEqual(cinema.start, SHANGHAI_CINEMA_MAP_CALIBRATION.start);
  assert.deepEqual(cinema.forward, SHANGHAI_CINEMA_MAP_CALIBRATION.forward);
  assert.equal(cinema.cameraTargetHeight, SHANGHAI_CINEMA_MAP_CALIBRATION.cameraTargetHeight);
  assert.equal(cinema.localObstacles.length, 3);
  assert.ok(
    Math.max(...cinema.localObstacles.map(({ maxZ }) => maxZ))
      < cinema.localBounds.maxZ,
    "三块实体碰撞必须在入口侧留出开放广场",
  );
  assert.equal(SHANGHAI_CINEMA_MASSING_GLB_BOUNDS.minY, 0);
  assert.equal(SHANGHAI_CINEMA_MASSING_GLB_BOUNDS.maxY, 17.225000381469727);
  assert.equal(SHANGHAI_CINEMA_MCP3_HUMAN_SCALE.heightMeters, 1.8);
  assert.equal(SHANGHAI_CINEMA_MCP3_HUMAN_SCALE.metersPerSceneUnit, 2.7);
  assert.ok(
    Math.abs(SHANGHAI_CINEMA_MCP3_HUMAN_SCALE.heightSceneUnits - 2 / 3) < 1e-12,
  );
  assert.deepEqual(
    blenderPointToShanghaiCinemaRuntimeLocal([12, -50, 7]),
    [-12, 7, -50],
  );
  assert.deepEqual(
    shanghaiCinemaBlenderPointToWorld({ point: [0, 0, 0] }),
    [74.1, 0, 80.9],
  );
  assert.deepEqual(Object.keys(SHANGHAI_CINEMA_MCP3_QA_VIEWS), [
    "canonical",
    "side",
    "entrance",
  ]);
});

test("上海影城三档 QA 查询只在显式请求时复用真实地图 placement", async () => {
  const [experience, world, runtimeQa, identityContract] = await Promise.all([
    readFile(new URL("app/xinhua-experience.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-world.tsx", root), "utf8"),
    readFile(new URL("app/scene/shanghai-cinema-runtime-qa.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-road-identity-contract.ts", root), "utf8"),
  ]);
  assert.match(experience, /get\("qaCinemaTier"\)/);
  assert.match(experience, /tier === "hero" \|\| tier === "identity" \|\| tier === "massing"/);
  assert.match(experience, /get\("qaCinemaFault"\)/);
  assert.match(experience, /fault === "hero-unavailable" \|\| fault === "identity-unavailable"/);
  assert.match(experience, /data-shanghai-cinema-qa-tier/);
  assert.match(experience, /data-shanghai-cinema-qa-fault/);
  assert.match(world, /name="shanghai-cinema-tier-map-qa"/);
  assert.match(world, /ShanghaiCinemaRuntimeQaAsset/);
  assert.match(world, /showStreetDressing=\{mode === "explore" && !cinemaTierQa\}/);
  assert.match(world, /showHeroTree=\{exploring && !cinemaTierQa\}/);
  assert.match(runtimeQa, /SHANGHAI_CINEMA_HERO_QA_MODEL/);
  assert.match(runtimeQa, /ShanghaiCinemaHybridIdentity/);
  assert.match(runtimeQa, /ShanghaiCinemaProgrammaticBody/);
  assert.match(runtimeQa, /ShanghaiCinemaRepeatedDetails/);
  assert.match(runtimeQa, /ShanghaiCinemaMassingGlb/);
  assert.match(
    identityContract,
    new RegExp(SHANGHAI_CINEMA_MASSING_MODEL_PATH.replaceAll("/", "\\/")),
  );
});

test("上海影城 Headless 与 MCP1/MCP2 候选证据均已保留", async () => {
  const paths = [
    "test_artifacts/test_shanghai-cinema-massing_canonical_preview.png",
    "test_artifacts/test_shanghai-cinema-massing_side_preview.png",
    "test_artifacts/test_shanghai-cinema-massing_entrance_preview.png",
    "test_artifacts/test_shanghai-cinema_mcp1_massing_canonical.png",
    "test_artifacts/test_shanghai-cinema_mcp1_massing_side.png",
    "test_artifacts/test_shanghai-cinema_mcp1_massing_entrance.png",
    "test_artifacts/test_shanghai-cinema_mcp2_hero_canonical.png",
    "test_artifacts/test_shanghai-cinema_mcp2_hero_side.png",
    "test_artifacts/test_shanghai-cinema_mcp2_hero_entrance.png",
  ];
  await Promise.all(paths.map((path) => access(new URL(path, root))));
  for (const path of paths) {
    assert.ok((await stat(new URL(path, root))).size > 10_000, `${path} 不是有效截图`);
  }
});

test("上海影城 MCP3 gate 锁定三档同机位、修正人物标尺和完整 Identity recipe", async () => {
  const [gate, buildRecord, recipeSource] = await Promise.all([
    readJson("docs/research/shanghai-cinema-blender-mcp-gates.json"),
    readJson("docs/research/build-records/shanghai-cinema-massing.json"),
    readFile(new URL("app/scene/shanghai-cinema-hybrid-identity.tsx", root)),
  ]);
  assert.equal(gate.threeTierGate.status, "pass");
  assert.equal(gate.threeTierGate.interactiveReview, "Blender MCP");
  assert.deepEqual(gate.threeTierGate.acceptedInteractiveChanges, []);
  assert.deepEqual(buildRecord.mcp3.acceptedInteractiveChanges, []);
  assert.equal(buildRecord.gates.mcp3SameCameraThreeTier, "passed");
  assert.equal(
    buildRecord.gates.threeTierRuntime,
    "passed-static-runtime-with-fault-injection",
  );
  assert.ok(
    Math.abs(gate.threeTierGate.humanScale.heightSceneUnits - 2 / 3) < 1e-7,
  );
  assert.equal(gate.threeTierGate.humanScale.bottomAtGroundDatum, true);
  const recipeSha = createHash("sha256").update(recipeSource).digest("hex");
  assert.equal(
    recipeSha,
    "c36bdf9450bfa23d266f2ba1e878360031ea54001f7b984955e7899c814e4c31",
  );
  assert.equal(
    gate.threeTierGate.identityRepresentation.sourceSha256,
    recipeSha,
  );
  assert.deepEqual(gate.threeTierGate.identityRepresentation.components, [
    "ShanghaiCinemaProgrammaticBody",
    "ShanghaiCinemaIdentityGlb",
    "ShanghaiCinemaRepeatedDetails",
  ]);
  assert.equal(
    gate.threeTierGate.identityRepresentation.identityGlb.role,
    "identity-increment-not-standalone-tier",
  );
  for (const [viewName, expected] of Object.entries(SHANGHAI_CINEMA_MCP3_QA_VIEWS)) {
    const actual = gate.threeTierGate.fixedViews[viewName];
    assert.deepEqual(actual.camera, expected.cameraBlender);
    assert.deepEqual(actual.target, expected.targetBlender);
    assert.equal(actual.lensMm, expected.lensMm);
    assert.deepEqual(actual.triptych.order, ["hero", "identity", "massing"]);
    for (const tier of ["hero", "identity", "massing", "triptych"]) {
      const capture = actual[tier];
      assert.equal(await sha256(capture.path), capture.sha256);
      assert.equal((await stat(new URL(capture.path, root))).size, capture.bytes);
    }
  }
});

test("上海影城 Three.js 三档与两条故障注入链均有实际页面证据", async () => {
  const [runtimeQa, buildRecord, gate, runtimeSource] = await Promise.all([
    readJson("test_artifacts/test_shanghai-cinema_three-tier_runtime_qa.json"),
    readJson("docs/research/build-records/shanghai-cinema-massing.json"),
    readJson("docs/research/shanghai-cinema-blender-mcp-gates.json"),
    readFile(new URL("app/scene/shanghai-cinema-runtime-qa.tsx", root), "utf8"),
  ]);
  assert.equal(runtimeQa.status, "passed");
  assert.equal(runtimeQa.sharedSpatialContract.position[0], 74.1);
  assert.equal(runtimeQa.sharedSpatialContract.position[1], 80.9);
  assert.equal(runtimeQa.sharedSpatialContract.yaw, 2.761592653589793);
  assert.equal(runtimeQa.sharedSpatialContract.runtimePlacementY, 1.009780347);
  assert.equal(runtimeQa.camera.mode, "spring-clear");
  assert.equal(runtimeQa.camera.blocker, "none");
  for (const tier of ["hero", "identity", "massing"]) {
    const runtimeCase = runtimeQa.cases[tier];
    assert.equal(runtimeCase.requestedTier, tier);
    assert.equal(runtimeCase.renderedTier, tier);
    assert.equal(runtimeCase.status, "loaded");
    assert.deepEqual(runtimeCase.browserErrors, []);
    assert.ok(runtimeCase.frameSample.fps >= 55);
  }
  assert.equal(runtimeQa.cases.heroUnavailable.requestedTier, "hero");
  assert.equal(runtimeQa.cases.heroUnavailable.renderedTier, "identity");
  assert.equal(
    runtimeQa.cases.heroUnavailable.fallback,
    "hero-unavailable-to-identity",
  );
  assert.equal(runtimeQa.cases.heroUnavailable.assertions.heroRequestPresent, false);
  assert.ok(
    runtimeQa.cases.heroUnavailable.resources.every(
      ({ url }) => !url.includes("/shanghai-cinema.glb"),
    ),
  );
  assert.equal(runtimeQa.cases.identityUnavailable.requestedTier, "identity");
  assert.equal(runtimeQa.cases.identityUnavailable.renderedTier, "programmatic");
  assert.equal(
    runtimeQa.cases.identityUnavailable.fallback,
    "identity-unavailable-to-programmatic",
  );
  assert.equal(
    runtimeQa.cases.identityUnavailable.assertions.identityGlbRequestPresent,
    false,
  );
  assert.ok(
    runtimeQa.cases.identityUnavailable.resources.every(
      ({ url }) => !url.includes("shanghai-cinema-hybrid-identity.glb"),
    ),
  );
  for (const runtimeCase of Object.values(runtimeQa.cases)) {
    assert.deepEqual(runtimeCase.browserErrors, []);
    assert.equal(
      await sha256(runtimeCase.screenshot.path),
      runtimeCase.screenshot.sha256,
    );
    assert.equal(
      (await stat(new URL(runtimeCase.screenshot.path, root))).size,
      runtimeCase.screenshot.bytes,
    );
  }
  assert.equal(buildRecord.threeTierRuntime.status, "passed");
  assert.equal(gate.threeJsRuntimeGate.threeTierRuntime, "pass");
  assert.deepEqual(gate.threeJsRuntimeGate.browserErrors, []);
  assert.match(runtimeSource, /hero-unavailable-to-identity/);
  assert.match(runtimeSource, /identity-unavailable-to-programmatic/);
  assert.match(runtimeSource, /programmatic-runtime-recipe/);
  assert.match(runtimeSource, /20260721-cinema-7/);
  assert.match(runtimeSource, /SHANGHAI_CINEMA_HYBRID_IDENTITY_MODEL/);
  assert.match(runtimeSource, /SHANGHAI_CINEMA_MASSING_MODEL/);
});

test("上海影城运行时地图证据与 MCP3 候选锁定当前三档路径和修正人物标尺", async () => {
  const [runtimeQa, mcp3] = await Promise.all([
    readJson("test_artifacts/test_shanghai-cinema_massing_runtime_qa.json"),
    readJson("test_artifacts/test_shanghai-cinema_mcp3_candidate.json"),
  ]);
  assert.equal(runtimeQa.runtimeContract.mainDataShanghaiCinemaQaTier, "massing");
  assert.equal(
    runtimeQa.runtimeContract.documentDataShanghaiCinemaMassingRuntime,
    "loaded",
  );
  assert.equal(runtimeQa.resourceTiming.encodedBodySize, 714228);
  assert.equal(runtimeQa.mapCalibration.groundDatum.glbMinY, 0);
  assert.equal(runtimeQa.mapCalibration.localObstacles.length, 3);
  assert.deepEqual(runtimeQa.browserErrors, []);
  assert.equal(
    await sha256(runtimeQa.visualEvidence.screenshot),
    runtimeQa.visualEvidence.sha256,
  );
  assert.equal(
    mcp3.tiers.hero.glbSha256,
    await sha256("public/models/xinhua-road/shanghai-cinema.glb"),
  );
  assert.equal(
    mcp3.tiers.identity.glbSha256,
    await sha256("public/models/xinhua-road/shanghai-cinema-hybrid-identity.glb"),
  );
  assert.equal(
    mcp3.tiers.massing.glbSha256,
    await sha256("public/models/xinhua-road/shanghai-cinema-massing.glb"),
  );
  assert.equal(mcp3.humanScaleProxy.heightSceneUnits, 2 / 3);
  assert.match(mcp3.tiers.identity.warning, /完整 Identity tier/);
  assert.deepEqual(mcp3.fixedViews, SHANGHAI_CINEMA_MCP3_QA_VIEWS);
});

test("上海影城最终审计拆分地图锚点、AABB 碰撞壳与 Hero 生成器漂移 blocker", async () => {
  const [
    audit,
    landmarkData,
    mapData,
    buildings,
    heroRecord,
    lineage,
    runtimeQa,
    integrationQa,
    hero,
    identity,
    massing,
  ] = await Promise.all([
    readJson("docs/research/shanghai-cinema-final-audit-2026-07-26.json"),
    readJson("app/scene/xinhua-road-landmarks-data.json"),
    readJson("app/scene/xinhua-map-data.json"),
    readJson("docs/research/data/xinhua-buildings-osm-20260725-074802.json"),
    readJson("docs/research/build-records/shanghai-cinema.json"),
    readJson("docs/research/shanghai-cinema-tier-lineage.json"),
    readJson("test_artifacts/test_shanghai-cinema_three-tier_runtime_qa.json"),
    readJson("docs/research/shanghai-cinema-integration-runtime-qa.json"),
    parseGlb("public/models/xinhua-road/shanghai-cinema.glb"),
    parseGlb("public/models/xinhua-road/shanghai-cinema-hybrid-identity.glb"),
    parseGlb("public/models/xinhua-road/shanghai-cinema-massing.glb"),
  ]);

  assert.equal(
    audit.integrationBase,
    "d2c0f23ef05098563d9ed81fba3eac8bf706c978",
  );
  assert.equal(
    audit.verdict.status,
    "blocked-map-binding-collision-shell-and-hero-generator-drift",
  );
  assert.equal(audit.verdict.eligibleForFinalComplete, false);
  assert.deepEqual(
    audit.verdict.blockers.map(({ id }) => id),
    [
      "map-origin-and-footprint-anchor",
      "runtime-aabb-neighbor-collision",
      "hero-generator-source-drift",
    ],
  );
  assert.equal(audit.scope.browserUsed, false);
  assert.equal(audit.scope.blenderRebuildPerformed, false);
  assert.equal(audit.scope.recoveryQualifiedStageRedone, false);

  for (const item of [
    audit.evidence.manifest,
    audit.evidence.brief,
    audit.evidence.viewCoverage.canonical,
    audit.evidence.viewCoverage.rightDepth,
    audit.evidence.viewCoverage.leftDepth,
    audit.evidence.viewCoverage.entranceIdentity,
    audit.assets.hero.blend,
    audit.assets.hero.glb,
    audit.assets.hero.buildRecord,
    audit.assets.identity.generator,
    audit.assets.identity.blend,
    audit.assets.identity.glb,
    audit.assets.identity.runtimeRecipe,
    audit.assets.identity.buildRecord,
    audit.assets.massing.generator,
    audit.assets.massing.blend,
    audit.assets.massing.glb,
    audit.assets.massing.buildRecord,
    audit.lineage.record,
    audit.blenderMcpGates.record,
    audit.mapAudit.registrySource,
    audit.mapAudit.productionRoadSource,
    audit.mapAudit.osmBuildingSource,
    audit.mapAudit.existingCandidate.record,
    audit.threeJsRuntime.tierRuntimeRecord,
    audit.threeJsRuntime.publicIntegrationRecord,
  ]) {
    assert.equal(
      await sha256(item.path),
      item.sha256,
      `${item.path} 必须与最终审计指纹一致`,
    );
  }

  assert.equal(hero.buffer.length, audit.assets.hero.glb.bytes);
  assert.equal(identity.buffer.length, audit.assets.identity.glb.bytes);
  assert.equal(massing.buffer.length, audit.assets.massing.glb.bytes);
  assert.equal(
    massing.json.nodes[0].extras.derived_from_hero_sha256,
    audit.assets.hero.glb.sha256,
  );
  assert.equal(
    massing.json.nodes[0].extras.derived_from_identity_sha256,
    audit.assets.identity.glb.sha256,
  );
  assert.equal(
    lineage.identity.derivedFromHero.recordedHeroGlbSha256,
    audit.assets.hero.glb.sha256,
  );
  assert.equal(
    audit.lineage.directBinaryHeroToIdentity,
    "pass-exact-sha",
  );
  assert.equal(
    audit.lineage.directBinaryHeroAndIdentityToMassing,
    "pass-exact-glb-extras",
  );
  assert.equal(
    heroRecord.generator.sha256,
    undefined,
    "旧 Hero build record 没有冻结生成器 SHA，不能补写成已证明",
  );
  assert.equal(audit.assets.hero.buildRecord.generatorShaFieldPresent, false);
  assert.equal(
    await sha256(audit.assets.hero.generator.path),
    audit.assets.hero.generator.currentSha256,
  );
  assert.notEqual(
    audit.assets.hero.generator.currentSha256,
    audit.assets.hero.generator.recordedSha256,
  );
  assert.equal(
    lineage.hero.generatorSha256,
    audit.assets.hero.generator.recordedSha256,
  );
  const currentHeroGenerator = await readFile(
    new URL(audit.assets.hero.generator.path, root),
    "utf8",
  );
  assert.match(currentHeroGenerator, /def remove_degenerate_faces\(/);
  assert.match(currentHeroGenerator, /export_texcoords=export_texcoords/);
  assert.equal(
    audit.lineage.deterministicHeroSource,
    "blocked-current-generator-sha-and-export-policy-drift",
  );

  const cinema = landmarkData.landmarks.find(
    ({ id }) => id === "shanghai-cinema",
  );
  const film = landmarkData.landmarks.find(
    ({ id }) => id === "film-art-center",
  );
  assert.ok(cinema && film);
  assert.deepEqual(cinema.position, audit.mapAudit.placement.position);
  assert.equal(cinema.yaw, audit.mapAudit.placement.yaw);
  assert.equal(cinema.scale, audit.mapAudit.placement.scale);

  const osmCinema = buildings.elements.find(
    ({ type, id }) => (
      type === "way" && id === audit.mapAudit.osmBuildingSource.wayId
    ),
  );
  assert.ok(osmCinema?.geometry);
  const osmPolygon = osmCinema.geometry.slice(0, -1).map(
    (point) => finalAuditProjectOsmPoint(point, mapData),
  );
  const osmCentroid = finalAuditPolygonCentroid(osmPolygon);
  for (let axis = 0; axis < 2; axis += 1) {
    assert.ok(
      Math.abs(
        osmCentroid[axis]
          - audit.mapAudit.osmComplexCentroid.position[axis]
      ) < 1e-9,
    );
  }
  const originDistance = Math.hypot(
    cinema.position[0] - osmCentroid[0],
    cinema.position[1] - osmCentroid[1],
  );
  assert.ok(
    Math.abs(
      originDistance
        - audit.mapAudit.osmComplexCentroid.currentOriginDistanceSceneUnits
    ) < 1e-9,
  );

  const cinemaCorners = finalAuditCorners(cinema);
  const roadAudits = [
    audit.mapAudit.roadRelationships.xinhuaRoad,
    audit.mapAudit.roadRelationships.panyuRoad,
  ];
  for (const roadAudit of roadAudits) {
    const road = mapData.roads.find(
      ({ osmWayId }) => osmWayId === roadAudit.osmWayId,
    );
    assert.ok(road);
    const visibleCenterlineDistance = finalAuditPolygonToPolylineDistance(
      cinemaCorners,
      road.points,
    );
    const osmCenterlineDistance = finalAuditPolygonToPolylineDistance(
      osmPolygon,
      road.points,
    );
    assert.ok(
      Math.abs(
        visibleCenterlineDistance
          - roadAudit.currentVisibleBoundsCenterlineDistance
      ) < 1e-9,
    );
    assert.ok(
      Math.abs(
        osmCenterlineDistance
          - roadAudit.osmComplexBoundaryCenterlineDistance
      ) < 1e-9,
    );
    assert.ok(
      Math.abs(
        visibleCenterlineDistance - roadAudit.renderedWidth / 2
          - roadAudit.currentVisibleBoundsAsphaltEdgeClearance
      ) < 1e-9,
    );
    assert.ok(
      Math.abs(
        osmCenterlineDistance - roadAudit.renderedWidth / 2
          - roadAudit.osmComplexBoundaryAsphaltEdgeClearance
      ) < 1e-9,
    );
  }
  assert.ok(
    audit.mapAudit.roadRelationships.xinhuaRoad
      .modelFartherThanOsmBoundarySceneUnits > 9,
  );
  assert.ok(
    audit.mapAudit.roadRelationships.panyuRoad
      .currentVisibleBoundsAsphaltEdgeClearance
      < audit.mapAudit.roadRelationships.panyuRoad.minimumRequiredClearance,
  );
  assert.equal(
    finalAuditPolygonToPolylineDistance(
      cinemaCorners,
      [...osmPolygon, osmPolygon[0]],
    ),
    0,
  );

  const candidate = {
    ...cinema,
    position: audit.mapAudit.existingCandidate.position,
  };
  const candidateCorners = finalAuditCorners(candidate);
  for (const [roadName, expectedClearance] of [
    [
      "xinhuaRoad",
      audit.mapAudit.existingCandidate.currentProductionRoadData
        .xinhuaRoadAsphaltEdgeClearance,
    ],
    [
      "panyuRoad",
      audit.mapAudit.existingCandidate.currentProductionRoadData
        .panyuRoadAsphaltEdgeClearance,
    ],
  ]) {
    const roadAudit = audit.mapAudit.roadRelationships[roadName];
    const road = mapData.roads.find(
      ({ osmWayId }) => osmWayId === roadAudit.osmWayId,
    );
    const clearance = finalAuditPolygonToPolylineDistance(
      candidateCorners,
      road.points,
    ) - roadAudit.renderedWidth / 2;
    assert.ok(Math.abs(clearance - expectedClearance) < 1e-9);
  }
  assert.ok(
    audit.mapAudit.existingCandidate.currentProductionRoadData
      .panyuRoadAsphaltEdgeClearance
      < audit.mapAudit.existingCandidate.currentProductionRoadData
        .minimumPanyuClearance,
  );
  assert.ok(
    audit.mapAudit.existingCandidate.currentProductionRoadData
      .xinhuaRoadAsphaltEdgeClearance
      > audit.mapAudit.roadRelationships.xinhuaRoad
        .currentVisibleBoundsAsphaltEdgeClearance,
  );

  const allWorldAabbs = landmarkData.landmarks.flatMap((landmark) => (
    landmark.localObstacles.map((obstacle, index) => ({
      assetId: landmark.id,
      index,
      bounds: finalAuditObstacle(
        landmark,
        obstacle,
        landmarkData.collisionMargin,
      ),
    }))
  ));
  const cinemaWorldAabbs = allWorldAabbs.filter(
    ({ assetId }) => assetId === cinema.id,
  );
  const currentAabbOverlaps = [];
  for (const cinemaObstacle of cinemaWorldAabbs) {
    for (const otherObstacle of allWorldAabbs) {
      if (otherObstacle.assetId === cinema.id) continue;
      const overlap = finalAuditAabbOverlap(
        cinemaObstacle.bounds,
        otherObstacle.bounds,
      );
      if (overlap.intersects) {
        currentAabbOverlaps.push({
          cinemaObstacle,
          otherObstacle,
          overlap,
        });
      }
    }
  }
  assert.equal(currentAabbOverlaps.length, 1);
  const [runtimeOverlap] = currentAabbOverlaps;
  const recordedAabb = audit.mapAudit.collisionDiagnosis.runtimeAabbOverlap;
  assert.equal(
    runtimeOverlap.cinemaObstacle.index,
    recordedAabb.shanghaiCinemaObstacleIndex,
  );
  assert.equal(runtimeOverlap.otherObstacle.assetId, "film-art-center");
  assert.equal(
    runtimeOverlap.otherObstacle.index,
    recordedAabb.filmArtCenterObstacleIndex,
  );
  for (const key of ["x", "z", "area"]) {
    assert.ok(
      Math.abs(
        runtimeOverlap.overlap[key]
          - recordedAabb.overlapSceneUnits[key]
      ) < 1e-12,
    );
  }
  assertFinalAuditAabbClose(
    runtimeOverlap.cinemaObstacle.bounds,
    recordedAabb.shanghaiCinemaWorldAabb,
  );
  assertFinalAuditAabbClose(
    runtimeOverlap.otherObstacle.bounds,
    recordedAabb.filmArtCenterWorldAabb,
  );

  let orientedSolidIntersections = 0;
  for (const cinemaObstacle of cinema.localObstacles) {
    for (const filmObstacle of film.localObstacles) {
      const overlap = finalAuditOrientedOverlap(
        cinema,
        film,
        cinemaObstacle,
        filmObstacle,
        landmarkData.collisionMargin,
      );
      if (overlap.intersects) orientedSolidIntersections += 1;
    }
  }
  assert.equal(
    orientedSolidIntersections,
    audit.mapAudit.collisionDiagnosis.orientedSolidRectangles
      .intersectingPairsWithPerAssetMargin,
  );
  const orientedPair = finalAuditOrientedOverlap(
    cinema,
    film,
    cinema.localObstacles[recordedAabb.shanghaiCinemaObstacleIndex],
    film.localObstacles[recordedAabb.filmArtCenterObstacleIndex],
    landmarkData.collisionMargin,
  );
  assert.equal(orientedPair.intersects, false);
  assert.ok(
    Math.abs(
      orientedPair.x
        - audit.mapAudit.collisionDiagnosis.orientedSolidRectangles
          .samePairLocalXOverlap
    ) < 1e-12,
  );
  assert.ok(
    Math.abs(
      orientedPair.separationZ
        - audit.mapAudit.collisionDiagnosis.orientedSolidRectangles
          .samePairLocalZSeparation
    ) < 1e-12,
  );
  const visibleEnvelopeOverlap = finalAuditOrientedOverlap(
    cinema,
    film,
    cinema.localBounds,
    film.localBounds,
  );
  for (const key of ["x", "z", "area"]) {
    assert.ok(
      Math.abs(
        visibleEnvelopeOverlap[key]
          - audit.mapAudit.collisionDiagnosis
            .fullVisibleEnvelopeOrientedOverlap[key]
      ) < 1e-12,
    );
  }

  const forwardLength = Math.hypot(...cinema.forward);
  const cameraPosition = [
    cinema.start[0] - cinema.forward[0] / forwardLength
      * audit.mapAudit.startAndCamera.cameraArmSceneUnits,
    cinema.start[1] - cinema.forward[1] / forwardLength
      * audit.mapAudit.startAndCamera.cameraArmSceneUnits,
  ];
  assert.deepEqual(cameraPosition, audit.mapAudit.startAndCamera.cameraPosition);
  assert.deepEqual(
    allWorldAabbs.filter(({ bounds }) => finalAuditPointHits(
      cinema.start,
      bounds,
      audit.mapAudit.startAndCamera.playerRadius,
    )),
    [],
  );
  assert.deepEqual(
    allWorldAabbs.filter(({ bounds }) => finalAuditPointHits(
      cameraPosition,
      bounds,
      audit.mapAudit.startAndCamera.cameraRadius,
    )),
    [],
  );

  assert.equal(runtimeQa.status, "passed");
  assert.equal(integrationQa.status, "passed");
  assert.notEqual(
    integrationQa.integration.baseCommit,
    audit.integrationBase,
    "旧整合 runtime 记录不得冒充当前 d2c0f23 地图验收",
  );
  assert.equal(
    Object.hasOwn(integrationQa.sharedAssertions, "collisionEvidence"),
    false,
  );
  assert.equal(
    audit.threeJsRuntime.currentIntegratedMapStatus,
    "blocked-not-reaccepted",
  );
  assert.deepEqual(
    audit.mainWindowRepairBoundary.sharedFilesToChangeInThisBranch,
    [],
  );
});
