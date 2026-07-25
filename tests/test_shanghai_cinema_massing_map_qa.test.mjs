import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SHANGHAI_CINEMA_MASSING_CACHE_VERSION,
  SHANGHAI_CINEMA_MASSING_GLB_BOUNDS,
  SHANGHAI_CINEMA_MASSING_GLB_SHA256,
  SHANGHAI_CINEMA_MASSING_MODEL_PATH,
  SHANGHAI_CINEMA_MASSING_QA_VIEWS,
  SHANGHAI_CINEMA_MASSING_REVIEW_RENDER_SIZE,
  blenderPointToShanghaiCinemaRuntimeLocal,
  shanghaiCinemaBlenderPointToWorld,
} from "../app/scene/shanghai-cinema-massing-contract.mjs";
import {
  XINHUA_ROAD_LANDMARKS,
  XINHUA_ROAD_OBSTACLES_BY_LANDMARK_ID,
  transformedLandmarkFootprint,
} from "../app/scene/xinhua-road-contract.ts";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

test("上海影城正式 Massing 二进制、lineage 与 Blender MCP 门一致", async () => {
  const [scope, record, gates] = await Promise.all([
    readJson("docs/research/active-asset-scope-31.json"),
    readJson(
      "docs/research/build-records/tiers/shanghai-cinema/massing/"
      + "shanghai-cinema-massing.json",
    ),
    readJson("docs/research/shanghai-cinema-blender-mcp-gates.json"),
  ]);

  assert.equal(scope.totals.assets, 18);
  assert.equal(scope.activeProgress.inProgressIds[0], "shanghai-cinema");
  assert.equal(
    await sha256(
      "public/models/tiers/shanghai-cinema/massing/"
      + "shanghai-cinema-massing.glb",
    ),
    SHANGHAI_CINEMA_MASSING_GLB_SHA256,
  );
  assert.equal(record.audit.sha256, SHANGHAI_CINEMA_MASSING_GLB_SHA256);
  assert.equal(record.audit.nodes, 1);
  assert.equal(record.audit.triangles, 7461);
  assert.equal(record.audit.materials, 3);
  assert.equal(record.audit.images, 0);
  assert.deepEqual(record.audit.transformedNodes, []);
  assert.equal(record.status, "massing-blender-mcp-passed-map-calibration-pending");
  assert.equal(gates.massingGate.status, "passed");
  assert.equal(
    gates.massingGate.nextGate,
    "three-js-massing-map-calibration",
  );
  assert.equal(gates.massingGate.acceptedInteractiveChanges.length, 0);
  assert.equal(gates.massingGate.generatorRoundTrip.status, "not-required");
  assert.equal(gates.massingGate.runtimeAsset.sha256, record.audit.sha256);
});

test("上海影城 Massing 固定机位使用同一镜像、Y-up 与地图 transform 合同", () => {
  assert.equal(
    SHANGHAI_CINEMA_MASSING_MODEL_PATH,
    "/models/tiers/shanghai-cinema/massing/shanghai-cinema-massing.glb",
  );
  assert.equal(SHANGHAI_CINEMA_MASSING_CACHE_VERSION, "be6963875918");
  assert.deepEqual(SHANGHAI_CINEMA_MASSING_REVIEW_RENDER_SIZE, [1080, 760]);
  assert.deepEqual(Object.keys(SHANGHAI_CINEMA_MASSING_QA_VIEWS), [
    "canonical",
    "side",
    "entrance",
  ]);
  assert.deepEqual(
    blenderPointToShanghaiCinemaRuntimeLocal([12, -50, 7]),
    [-12, 7, -50],
  );

  const cinema = XINHUA_ROAD_LANDMARKS.find(
    ({ id }) => id === "shanghai-cinema",
  );
  assert.deepEqual(cinema.position, [74.1, 80.9]);
  assert.equal(cinema.yaw, 2.761592653589793);
  assert.equal(cinema.scale, 1);
  const origin = shanghaiCinemaBlenderPointToWorld({
    point: [0, 0, 0],
    position: cinema.position,
    yaw: cinema.yaw,
    scale: cinema.scale,
    baseY: 1.25,
    detailScale: 1.65,
  });
  assert.deepEqual(origin, [74.1 * 1.65, 1.25 * 1.65, 80.9 * 1.65]);
  assert.equal(SHANGHAI_CINEMA_MASSING_GLB_BOUNDS.height, 17.225);
});

test("上海影城地图 QA 只保留当前资产并复用生产三块碰撞", async () => {
  const cinema = XINHUA_ROAD_LANDMARKS.find(
    ({ id }) => id === "shanghai-cinema",
  );
  const obstacles = XINHUA_ROAD_OBSTACLES_BY_LANDMARK_ID["shanghai-cinema"];
  assert.equal(cinema.localObstacles.length, 3);
  assert.equal(obstacles.length, 3);
  assert.deepEqual(
    obstacles,
    cinema.localObstacles.map((obstacle) => (
      transformedLandmarkFootprint(cinema, obstacle)
    )),
  );

  const [experience, world, massing] = await Promise.all([
    readFile(new URL("app/xinhua-experience.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-world.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-road-massing.tsx", root), "utf8"),
  ]);
  assert.match(
    experience,
    /qaActiveAsset"\) === "shanghai-cinema"[\s\S]*?qaActiveTier"\) === "massing"/,
  );
  assert.match(experience, /qaActiveView/);
  assert.match(experience, /data-active-asset-view-qa/);
  assert.match(experience, /namedActiveAssetQaRequested/);
  assert.match(experience, /data-active-asset-runtime-status/);
  assert.match(experience, /ACTIVE_ASSET_RUNTIME_EVENT/);
  assert.match(world, /xinhua-road-single-asset-massing-map-qa/);
  assert.match(world, /showStreetDressing=\{false\}/);
  assert.match(world, /onlyLandmarkId=\{roadModelQaId\}/);
  assert.match(world, /XINHUA_ROAD_OBSTACLES_BY_LANDMARK_ID\[roadModelQaId\]/);
  assert.match(
    world,
    /proceduralCharacterOnly=\{roadModelTierQa === "massing"\}/,
  );
  assert.match(world, /fixedRoadMassingQa/);
  assert.match(world, /cameraMode: `qa-fixed-\$\{view\}`/);
  assert.match(world, /xinhuaQaCollisionCount/);
  assert.match(world, /xinhuaQaCollisionLast/);
  assert.match(world, /qaCollisionRun/);
  assert.match(world, /xinhuaQaCollisionRun = "complete"/);
  assert.match(
    massing,
    /SHANGHAI_CINEMA_MASSING_MODEL_PATH[\s\S]*?SHANGHAI_CINEMA_MASSING_CACHE_VERSION/,
  );
  assert.match(massing, /FORMAL_MASSING_PATHS\[slug\]/);
  assert.match(massing, /reportActiveAssetRuntime\(slug, path, "loaded"\)/);
  assert.match(massing, /onFailure=\{\(error\) =>/);
});
