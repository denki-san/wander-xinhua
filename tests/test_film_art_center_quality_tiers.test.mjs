import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { Vector3 } from "three";
import {
  isPlanarPositionBlockedInPolygon,
  resolvePolygonMovement,
} from "../app/scene/world-math.ts";
import { terrainHeightAt } from "../app/scene/terrain.ts";
import {
  FILM_ART_CENTER_MASSING_MODEL_PATH,
  FILM_ART_CENTER_MASSING_SHA256,
  resolveFilmArtCenterQaTier,
} from "../app/scene/film-art-center-tier-contract.mjs";

const root = new URL("../", import.meta.url);
const recordUrl = new URL(
  "docs/research/build-records/tiers/xinhua-road/massing/film-art-center-massing.json",
  root,
);
const lineageUrl = new URL(
  "docs/research/film-art-center-tier-lineage.json",
  root,
);
const generatorUrl = new URL(
  "scripts/create_film_art_center_massing_model.py",
  root,
);
const mcpGateUrl = new URL(
  "docs/research/film-art-center-blender-mcp-gates.json",
  root,
);
const mapQaUrl = new URL(
  "docs/research/film-art-center-massing-map-qa.json",
  root,
);

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
  return glb.meshes.reduce(
    (total, mesh) =>
      total +
      mesh.primitives.reduce((meshTotal, primitive) => {
        const accessor = primitive.indices ?? primitive.attributes.POSITION;
        return meshTotal + glb.accessors[accessor].count / 3;
      }, 0),
    0,
  );
}

test("Film Art Center Massing 保持单建筑与 Hold 边界", async () => {
  const [generator, record, lineage] = await Promise.all([
    readFile(generatorUrl, "utf8"),
    readFile(recordUrl, "utf8").then(JSON.parse),
    readFile(lineageUrl, "utf8").then(JSON.parse),
  ]);

  assert.equal(record.assetId, "building:xinhua-road:film-art-center");
  assert.equal(record.tier, "massing");
  assert.equal(record.status, "mcp1-and-map-pass-hero-mcp2-pending");
  assert.deepEqual(record.holdBoundary, {
    trees: "untouched",
    decor: "untouched",
    ordinaryOsm: "not-imported",
    globalMassing: "untouched",
    facilityAndSharedPrototypes: "not-imported",
    otherBuildings: "untouched",
  });
  assert.equal(lineage.activeScope, "active-18-buildings");
  assert.equal(lineage.massing.mcp1, "pass");
  assert.equal(lineage.massing.mapAcceptance, "pass");
  assert.equal(lineage.identity.identityAllowed, false);
  assert.doesNotMatch(
    generator,
    /create_xinhua_road_clean_massing_models|BUILDERS|build_plane_tree/,
  );
  for (const cue of [
    "film-art-massing-main-roof",
    "film-art-massing-gallery-roof",
    "film-art-massing-upper-loggia",
    "film-art-massing-entry-recess",
    "film-art-massing-glass-wing",
  ]) {
    assert.match(generator, new RegExp(cue));
  }
});

test("Film Art Center Massing GLB 与冻结 Hero lineage 精确一致", async () => {
  const record = await readFile(recordUrl, "utf8").then(JSON.parse);
  const [buffer, heroBuffer, blendStats] = await Promise.all([
    readFile(new URL(record.outputs.glb, root)),
    readFile(new URL(record.lineage.heroGlb, root)),
    stat(new URL(record.outputs.blend, root)),
  ]);
  const glb = parseGlb(buffer);
  const rootNode = glb.nodes[0];

  assert.equal(sha256(buffer), record.glb.sha256);
  assert.equal(buffer.length, record.glb.bytes);
  assert.equal(sha256(heroBuffer), record.lineage.heroGlbSha256);
  assert.ok(blendStats.size > 100_000, "editable Blend 不得是空白占位文件");
  assert.equal(glb.nodes.length, record.glb.nodes);
  assert.equal(glb.meshes.length, record.glb.meshes);
  assert.equal(glb.materials.length, record.glb.materials);
  assert.equal(glb.images, undefined);
  assert.equal(glb.textures, undefined);
  assert.equal(triangleCount(glb), record.glb.triangles);
  assert.equal(rootNode.translation, undefined, "根节点不得带平移");
  assert.equal(rootNode.rotation, undefined, "根节点不得带旋转");
  assert.equal(rootNode.scale, undefined, "根节点不得带缩放");
  assert.equal(
    rootNode.extras.asset_id,
    "building:xinhua-road:film-art-center",
  );
  assert.equal(rootNode.extras.tier, "massing");
  assert.equal(rootNode.extras.front_direction, "-Y");
  assert.equal(rootNode.extras.ground_datum, 0);
  assert.equal(
    record.glb.triangles <= record.budgets.maxTriangles,
    true,
  );
  assert.equal(record.glb.bytes <= record.budgets.maxBytes, true);
  assert.equal(record.gates.glbAudit, "pass");
  assert.equal(record.gates.deterministicGlb.status, "pass");
  assert.equal(record.gates.deterministicGlb.sha256, record.glb.sha256);
});

test("Film Art Center 固定三视图与 1.8 m 代理合同可追溯", async () => {
  const record = await readFile(recordUrl, "utf8").then(JSON.parse);
  for (const view of ["canonical", "side", "entrance"]) {
    const preview = record.outputs.previews[view];
    const buffer = await readFile(new URL(preview.path, root));
    assert.ok(buffer.length > 600_000, `${view} 不得为空白占位图`);
    assert.equal(buffer.length, preview.bytes);
    assert.equal(sha256(buffer), preview.sha256);
    assert.ok(preview.lensMm >= 50 && preview.lensMm <= 60);
  }
  assert.equal(record.contract.humanProxy.meters, 1.8);
  assert.ok(
    Math.abs(record.contract.humanProxy.sceneUnits - 2 / 3) < 0.000001,
  );
  assert.equal(record.contract.humanProxy.exported, false);
});

test("Recovery generic box 被保留为反例且不得进入正式 tier", async () => {
  const [record, lineage] = await Promise.all([
    readFile(recordUrl, "utf8").then(JSON.parse),
    readFile(lineageUrl, "utf8").then(JSON.parse),
  ]);
  const decision = record.lineage.recoveryMassingCandidate;
  assert.equal(
    decision.sha256,
    "4b925b2dad96894e7feda2b925962781fcd532d675657a9f17a96467458b0941",
  );
  assert.equal(decision.decision, "rejected-generic-box-map-binding-blocked");
  assert.equal(lineage.recoveryDecision.structure.triangles, 12);
  assert.equal(lineage.recoveryDecision.structure.bytes, 2316);
  assert.equal(lineage.recoveryDecision.decision, "rejected-as-formal-massing");
  assert.notEqual(lineage.massing.glb.sha256, decision.sha256);
});

test("Film Art Center MCP1 场景、固定机位与尺度边界精确封存", async () => {
  const [gate, record, glb, blend, generator] = await Promise.all([
    readFile(mcpGateUrl, "utf8").then(JSON.parse),
    readFile(recordUrl, "utf8").then(JSON.parse),
    readFile(
      new URL(
        "public/models/tiers/xinhua-road/massing/film-art-center-massing.glb",
        root,
      ),
    ),
    readFile(
      new URL(
        "assets/models/source/tiers/xinhua-road/massing/film-art-center-massing.blend",
        root,
      ),
    ),
    readFile(generatorUrl),
  ]);

  assert.equal(gate.assetId, "film-art-center");
  assert.equal(gate.massingGate.status, "pass");
  assert.equal(gate.massingGate.runtimeAsset.sha256, sha256(glb));
  assert.equal(gate.massingGate.editableSource.sha256, sha256(blend));
  assert.equal(gate.massingGate.generator.sha256, sha256(generator));
  assert.equal(gate.massingGate.sceneInspection.meshCount, 1);
  assert.equal(gate.massingGate.sceneInspection.triangles, 3376);
  assert.equal(gate.massingGate.sceneInspection.materials, 6);
  assert.equal(gate.massingGate.sceneInspection.images, 0);
  assert.equal(gate.massingGate.humanScale.heightMeters, 1.8);
  assert.equal(gate.massingGate.humanScale.exportedToGlb, false);
  assert.equal(
    gate.massingGate.checks.runtimePlayerScale,
    "pending-three-js-map-gate",
  );
  assert.equal(
    gate.massingGate.checks.physicalSurveyScale,
    "unknown-not-claimed",
  );
  assert.deepEqual(gate.massingGate.acceptedInteractiveChanges, []);
  assert.equal(gate.massingGate.generatorRoundTrip.status, "not-required");
  assert.equal(record.gates.mcp1, "pass");
  assert.equal(record.gates.mapAcceptance, "pass");
  assert.equal(record.gates.identityAllowed, false);
  assert.equal(record.outputs.blendSha256, sha256(blend));
  assert.equal(record.outputs.blendBytes, blend.length);

  for (const view of ["canonical", "side", "entrance", "scale"]) {
    const screenshot = gate.massingGate.fixedViews[view];
    const buffer = await readFile(new URL(screenshot.screenshot, root));
    assert.equal(buffer.length, screenshot.bytes);
    assert.equal(sha256(buffer), screenshot.sha256);
  }
});

test("Film Art Center Massing 地图 QA 深链不改变生产默认 tier", async () => {
  const runtimeSource = await readFile(
    new URL("app/scene/xinhua-road-landmarks.tsx", root),
    "utf8",
  );
  const contractSource = await readFile(
    new URL("app/scene/film-art-center-tier-contract.mjs", root),
    "utf8",
  );
  const active = resolveFilmArtCenterQaTier(
    "?start=film-art&qaModelTier=massing&qaModelId=film-art-center&cameraQa=1",
  );
  assert.equal(active.assetId, "film-art-center");
  assert.equal(active.tier, "massing");
  assert.equal(active.sha256, FILM_ART_CENTER_MASSING_SHA256);
  assert.equal(active.modelPath, FILM_ART_CENTER_MASSING_MODEL_PATH);
  assert.equal(active.forcedFallback, false);
  assert.equal(active.productionDefaultChanged, false);
  assert.equal(resolveFilmArtCenterQaTier("?start=film-art"), null);
  assert.equal(
    resolveFilmArtCenterQaTier(
      "?qaModelTier=massing&qaModelId=shanghai-cinema",
    ),
    null,
  );

  const fallback = resolveFilmArtCenterQaTier(
    "?qaModelTier=massing&qaModelId=film-art-center&qaActiveFallback=massing",
  );
  assert.equal(fallback.forcedFallback, true);
  assert.match(fallback.modelPath, /test_missing-film-art-center-massing\.glb/);
  assert.match(runtimeSource, /xinhua:active-asset-runtime/);
  assert.match(runtimeSource, /xinhuaRoadQaStatus = "loaded"/);
  assert.match(runtimeSource, /hiddenLandmarkIds=\{activeMountedModelIds\}/);
  assert.match(contractSource, /productionDefaultChanged: false/);
});

test("Film Art Center Massing 地图位置、落地与碰撞门可重复", async () => {
  const [qa, landmarkData] = await Promise.all([
    readFile(mapQaUrl, "utf8").then(JSON.parse),
    readFile(
      new URL("app/scene/xinhua-road-landmarks-data.json", root),
      "utf8",
    ).then(JSON.parse),
  ]);
  const landmark = landmarkData.landmarks.find(
    (candidate) => candidate.id === "film-art-center",
  );
  assert.ok(landmark);
  assert.equal(qa.status, "pass");
  assert.equal(qa.productionDefaultChanged, false);
  assert.equal(qa.asset.sha256, FILM_ART_CENTER_MASSING_SHA256);
  assert.equal(qa.asset.network.status, 200);
  assert.equal(qa.asset.network.contentLength, 240572);
  assert.equal(qa.runtime.pagePlayable, true);
  assert.equal(qa.runtime.console.errors, 0);
  assert.deepEqual(qa.placement.position, landmark.position);
  assert.equal(qa.placement.yaw, landmark.yaw);
  assert.equal(qa.placement.scale, landmark.scale);
  assert.deepEqual(qa.placement.start, landmark.start);
  assert.deepEqual(qa.placement.forward, landmark.forward);
  assert.equal(qa.placement.cameraTargetHeight, landmark.cameraTargetHeight);

  const expectedWorldBase = (
    terrainHeightAt(...landmark.position) + 0.1
  ) * qa.runtime.groundContact.detailWorldScale;
  assert.ok(
    Math.abs(
      qa.runtime.worldBounds.min[1] - expectedWorldBase
    ) < 1e-5,
  );
  assert.equal(qa.runtime.groundContact.status, "pass");

  const cosine = Math.cos(landmark.yaw);
  const sine = Math.sin(landmark.yaw);
  const obstacles = landmark.localObstacles.map((local) => {
    const worldX = [];
    const worldZ = [];
    for (const localX of [local.minX, local.maxX]) {
      for (const sourceZ of [local.minZ, local.maxZ]) {
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
      minX: Math.min(...worldX) - landmarkData.collisionMargin,
      maxX: Math.max(...worldX) + landmarkData.collisionMargin,
      minZ: Math.min(...worldZ) - landmarkData.collisionMargin,
      maxZ: Math.max(...worldZ) + landmarkData.collisionMargin,
    };
  });
  assert.deepEqual(obstacles, qa.collision.worldObstacles);

  const boundary = [
    [-100, -100],
    [200, -100],
    [200, 250],
    [-100, 250],
  ];
  const player = new Vector3(landmark.start[0], 0, landmark.start[1]);
  assert.equal(
    isPlanarPositionBlockedInPolygon(
      player.x,
      player.z,
      boundary,
      obstacles,
      qa.collision.playerRadius,
    ),
    false,
  );
  const step = new Vector3(
    landmark.forward[0],
    0,
    landmark.forward[1],
  ).normalize().multiplyScalar(
    qa.collision.deterministicApproach.stepSceneUnits,
  );
  for (
    let index = 0;
    index < qa.collision.deterministicApproach.steps;
    index += 1
  ) {
    resolvePolygonMovement(
      player,
      step,
      boundary,
      obstacles,
      qa.collision.playerRadius,
      player,
    );
  }
  assert.ok(
    Math.abs(player.x - qa.collision.deterministicApproach.result[0]) < 1e-9,
  );
  assert.ok(
    Math.abs(player.z - qa.collision.deterministicApproach.result[1]) < 1e-9,
  );
  assert.equal(
    isPlanarPositionBlockedInPolygon(
      player.x,
      player.z,
      boundary,
      obstacles,
      qa.collision.playerRadius,
    ),
    false,
  );

  for (const screenshot of Object.values(qa.screenshots)) {
    const buffer = await readFile(new URL(screenshot.path, root));
    assert.equal(buffer.length, screenshot.bytes);
    assert.equal(sha256(buffer), screenshot.sha256);
  }
  assert.equal(qa.forcedFallback.pagePlayable, true);
  assert.equal(qa.forcedFallback.blankOrBlack, false);
  assert.equal(qa.scope.trees, "untouched");
  assert.equal(qa.scope.decor, "untouched");
  assert.equal(qa.scope.globalMassing, "untouched");
  assert.equal(qa.nextGate, "blender-mcp2-hero-master-review");
  assert.equal(qa.identityAllowed, false);
});
