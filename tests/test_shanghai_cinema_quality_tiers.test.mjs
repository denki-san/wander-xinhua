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

test("上海影城 Massing QA 查询只在显式请求时复用真实地图 placement", async () => {
  const [experience, world, massing, identityContract] = await Promise.all([
    readFile(new URL("app/xinhua-experience.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-world.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-road-massing.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-road-identity-contract.ts", root), "utf8"),
  ]);
  assert.match(experience, /get\("qaCinemaTier"\) === "massing"/);
  assert.match(experience, /data-shanghai-cinema-qa-tier/);
  assert.match(world, /name="shanghai-cinema-massing-map-qa"/);
  assert.match(world, /onlyLandmarkId="shanghai-cinema"/);
  assert.match(world, /showStreetDressing=\{mode === "explore" && !cinemaMassingQa\}/);
  assert.match(world, /showHeroTree=\{exploring && !cinemaMassingQa\}/);
  assert.match(massing, /onlyLandmarkId && landmark\.id !== onlyLandmarkId/);
  assert.match(massing, /ShanghaiCinemaMassingGlb/);
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
