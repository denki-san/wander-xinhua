import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordUrl = new URL(
  "docs/research/build-records/hudec-memorial-massing.json",
  root,
);
const glbUrl = new URL(
  "public/models/requested-pois/hudec-memorial-massing.glb",
  root,
);
const blendUrl = new URL(
  "assets/models/source/requested-pois/hudec-memorial-massing.blend",
  root,
);
const generatorUrl = new URL("scripts/create_hudec_memorial_v2.py", root);
const mcpGateUrl = new URL(
  "docs/research/hudec-memorial-blender-mcp-gates.json",
  root,
);
const runtimeQaUrl = new URL(
  "test_artifacts/test_hudec-memorial_massing_runtime_metrics.json",
  root,
);
const mapCalibrationUrl = new URL(
  "test_artifacts/test_hudec-memorial_map_calibration.json",
  root,
);
const landmarkDataUrl = new URL(
  "app/scene/xinhua-road-landmarks-data.json",
  root,
);

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim());
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

test("Hudec Massing 保持单资产安全并记录证据边界", async () => {
  const [generator, record] = await Promise.all([
    readFile(generatorUrl, "utf8"),
    readFile(recordUrl, "utf8").then(JSON.parse),
  ]);

  assert.equal(record.stableAssetId, "hudec-memorial");
  assert.equal(record.qualityTier, "massing");
  assert.equal(record.status, "fast-massing-mcp1-and-runtime-map-pass");
  assert.equal(record.generator.singleAssetSafe, true);
  assert.deepEqual(record.holdBoundary, {
    trees: "untouched",
    decor: "untouched",
    characters: "no runtime character asset; preview-only scale proxy",
    otherBuildings: "untouched",
    globalMassing: "untouched",
  });
  assert.match(generator, /stage == "massing"/);
  assert.match(generator, /stage == "hero"/);
  assert.match(generator, /Identity 必须等主窗口 MCP2 通过并冻结 Hero/);
  assert.doesNotMatch(generator, /BUILDERS/);
  for (const cue of [
    "chimney-tower",
    "chimney-flue",
    "main-roof",
    "end-wing-roof",
    "end-gable-timber",
    "low-glass-wing",
  ]) {
    assert.match(generator, new RegExp(cue));
  }
});

test("Hudec 历史 Three.js 证据保留，V2 Hero 退出默认 registry 后仍可回滚", async () => {
  const [qa, gate, record, glb, landmarkSource] = await Promise.all([
    readFile(runtimeQaUrl, "utf8").then(JSON.parse),
    readFile(mcpGateUrl, "utf8").then(JSON.parse),
    readFile(recordUrl, "utf8").then(JSON.parse),
    readFile(glbUrl),
    readFile(landmarkDataUrl),
  ]);

  assert.equal(qa.status, "blocked-entrance-collision-and-qa-provenance");
  assert.equal(qa.runtime.fixedStartQuery, "hudec");
  assert.equal(qa.runtime.networkProfile, "standard");
  assert.equal(qa.runtime.pageVisibility, "visible");
  assert.deepEqual(qa.runtime.viewport, {
    width: 1440,
    height: 900,
    devicePixelRatio: 1,
  });
  assert.equal(qa.resource.responseStatus, 200);
  assert.equal(qa.resource.encodedBodySize, 158312);
  assert.equal(
    qa.resource.sha256,
    "c38302eb136dbb4dfb9b882f725957d26260bc0cb10929459e44aeb4e96d14a5",
  );
  assert.notEqual(
    qa.resource.sha256,
    sha256(glb),
    "旧运行时记录必须保留为 superseded 证据，不得伪装成当前二进制验收",
  );
  assert.equal(qa.console.logs.length, 0);
  assert.equal(qa.console.pageErrors.length, 0);
  assert.equal(qa.networkBoundary.isAssetFailure, false);
  assert.equal(qa.qaAssembly.sourceRegistryCommitted, false);
  assert.equal(qa.qaAssembly.heroAssetOverwritten, false);
  assert.equal(
    qa.qaAssembly.sourceBeforeSha256,
    qa.qaAssembly.sourceAfterRestoreSha256,
    "历史 QA 必须证明临时 registry 修改已逐字节恢复",
  );
  assert.equal(gate.mapGate.status, "historical-blocked-superseded-candidate");
  assert.equal(gate.mapGate.heroIdentityAuthorized, false);
  assert.equal(gate.heroGate.status, "authorized-for-main-window-mcp2");
  assert.equal(qa.verdict.mapGate, "blocked");
  assert.equal(qa.performance.sampleDurationMs < 10_000, true);
  assert.equal(
    qa.performance.contractStatus,
    "diagnostic-only-sample-shorter-than-required-10-seconds",
  );
  assert.equal(
    record.validation.previousRuntimeQaRecord,
    "test_artifacts/test_hudec-memorial_massing_runtime_metrics.json",
  );

  const committedLandmarks = JSON.parse(landmarkSource);
  const committedHudec = committedLandmarks.landmarks.find(
    ({ id }) => id === "hudec-memorial",
  );
  assert.equal(
    committedHudec.model,
    "/models/building-engine-spike/hudec-memorial/hudec-memorial-master.glb",
    "公共 registry 必须使用用户选定并重新验收的 A 方案 Master",
  );
  assert.equal(committedHudec.cacheVersion, "b7002cbd4e5c");

  for (const screenshot of Object.values(qa.screenshots)) {
    const buffer = await readFile(new URL(screenshot.path, root));
    assert.equal(buffer.length, screenshot.bytes);
    assert.equal(sha256(buffer), screenshot.sha256);
  }
});

function sourceNumber(source, pattern, label) {
  const match = source.match(pattern);
  assert.ok(match, `生成器必须保留 ${label} 可审计常量`);
  return Number(match[1]);
}

test("Hudec Fast Massing 真实门廊在建议缩放下通过，旧缩碰撞方案仍保持拒绝", async () => {
  const [qa, calibration, generator] = await Promise.all([
    readFile(runtimeQaUrl, "utf8").then(JSON.parse),
    readFile(mapCalibrationUrl, "utf8").then(JSON.parse),
    readFile(generatorUrl, "utf8"),
  ]);

  const authoredScale = sourceNumber(
    generator,
    /AUTHORED_SCALE\s*=\s*([0-9.]+)/,
    "AUTHORED_SCALE",
  );
  const sideWidth = sourceNumber(
    generator,
    /side_width\s*=\s*([0-9.]+)/,
    "porch side_width",
  );
  const porchWidth = sourceNumber(
    generator,
    /porch_width\s*=\s*([0-9.]+)/,
    "porch_width",
  );
  const centerX = sourceNumber(
    generator,
    /add_open_entrance_porch\(\s*"hudec-v2-entrance-porch",\s*([0-9.]+)/,
    "entrance center_x",
  );
  const leftCenter = centerX - porchWidth / 2 + sideWidth / 2;
  const rightCenter = centerX + porchWidth / 2 - sideWidth / 2;
  const leftWall = [
    (leftCenter - sideWidth / 2) * authoredScale,
    (leftCenter + sideWidth / 2) * authoredScale,
  ];
  const rightWall = [
    (rightCenter - sideWidth / 2) * authoredScale,
    (rightCenter + sideWidth / 2) * authoredScale,
  ];
  const actualGap = rightWall[0] - leftWall[1];
  const requiredGap = calibration.collisionRecommendation.requiredEntranceGap;
  const worldGap = actualGap * calibration.recommendation.scale;

  assert.equal(Number(actualGap.toFixed(4)), 1.5912);
  assert.equal(Number(worldGap.toFixed(6)), 1.400256);
  assert.ok(
    worldGap >= requiredGap,
    "建议 runtime scale 下必须保留计入 margin 与玩家半径后的合法中心线",
  );
  assert.equal(calibration.collisionRecommendation.status, "pass-static-geometry");
  assert.equal(calibration.collisionRecommendation.localObstacles.length, 7);
  assert.equal(
    qa.mapCalibration.collisionAndWalkable.rejectedCalibration.includes("允许角色穿入可见墙体"),
    true,
  );
});

test("Hudec 静态地图建议由 OSM 长轴导出且不压番禺路机动车道", async () => {
  const calibration = await readFile(mapCalibrationUrl, "utf8").then(JSON.parse);
  assert.equal(calibration.status, "passed-static-map-recommendation-awaiting-main-runtime");
  assert.deepEqual(calibration.recommendation.position, [92.535374, -132.52181]);
  assert.equal(calibration.recommendation.yawRadians, 0.153486288);
  assert.equal(calibration.recommendation.scale, 0.88);
  assert.equal(calibration.orientationGate.rejectedLegacyYawRadians, Math.PI / 2);
  assert.equal(calibration.roadGate.status, "pass");
  assert.ok(calibration.roadGate.modelToAsphaltEdgeSceneUnits > 10);
  assert.ok(Math.abs(calibration.roadGate.setbackDeltaSceneUnits) < 1);
  assert.equal(calibration.integrationBoundary.publicRegistryEdited, false);
  assert.equal(calibration.integrationBoundary.runtimeEdited, false);
});

test("Hudec Massing GLB 与 build record 的结构和哈希一致", async () => {
  const [buffer, record, blendStats] = await Promise.all([
    readFile(glbUrl),
    readFile(recordUrl, "utf8").then(JSON.parse),
    stat(blendUrl),
  ]);
  const glb = parseGlb(buffer);

  assert.equal(sha256(buffer), record.artifacts.glb.sha256);
  assert.equal(buffer.length, record.artifacts.glb.bytes);
  assert.equal(blendStats.size, record.artifacts.blend.bytes);
  assert.equal(glb.nodes.length, record.structure.nodes);
  assert.equal(glb.meshes.length, record.structure.meshes);
  assert.equal(glb.materials.length, record.structure.materials);
  assert.equal(glb.images, undefined);
  assert.equal(glb.textures, undefined);
  assert.equal(glb.nodes[0].translation, undefined, "根节点不得带非零平移");
  assert.equal(glb.nodes[0].rotation, undefined, "根节点不得带非零旋转");
  assert.equal(glb.nodes[0].scale, undefined, "根节点不得带非一缩放");
  assert.equal(glb.nodes[0].extras.stable_asset_id, "hudec-memorial");
  assert.equal(glb.nodes[0].extras.quality_tier, "massing");
  assert.equal(record.structure.triangles <= record.budget.maxTriangles, true);
  assert.equal(record.artifacts.glb.bytes <= record.budget.maxBytes, true);
});

test("三张 Headless 固定机位与 1.8 m 代理合同齐全", async () => {
  const [record, generator] = await Promise.all([
    readFile(recordUrl, "utf8").then(JSON.parse),
    readFile(generatorUrl, "utf8"),
  ]);
  for (const view of ["canonical", "side", "entrance"]) {
    const preview = record.previews[view];
    const stats = await stat(new URL(preview.path, root));
    assert.ok(stats.size > 100_000, `${view} 固定机位不得是空白占位图`);
  }
  assert.equal(record.previews.scaleProxy.heightMeters, 1.8);
  assert.ok(
    Math.abs(record.previews.scaleProxy.heightSceneUnits - 2 / 3) < 1e-9,
  );
  assert.equal(record.previews.scaleProxy.previewOnly, true);
  assert.equal(record.previews.scaleProxy.exportedToGlb, false);
  assert.match(generator, /test-human-1_8m-body/);
  assert.match(generator, /test-human-1_8m-head/);
  assert.match(generator, /asset=False/);
});

test("Hudec Fast Massing 当前二进制已通过主窗口 MCP1 与真实地图门", async () => {
  const [gate, recordBuffer, glb, blend, calibrationBuffer] = await Promise.all([
    readFile(mcpGateUrl, "utf8").then(JSON.parse),
    readFile(recordUrl),
    readFile(glbUrl),
    readFile(blendUrl),
    readFile(mapCalibrationUrl),
  ]);
  const record = JSON.parse(recordBuffer);
  const candidate = gate.fastModeCandidate;

  assert.equal(gate.assetId, "hudec-memorial");
  assert.equal(gate.activeCandidate, "fastModeCandidate");
  assert.equal(candidate.status, "mcp1-and-runtime-map-pass");
  assert.equal(candidate.runtimeAsset.sha256, sha256(glb));
  assert.equal(candidate.editableSource.sha256, sha256(blend));
  assert.equal(candidate.mapCalibration.sha256, sha256(calibrationBuffer));
  assert.equal(candidate.headless.triangles, 2180);
  assert.equal(candidate.headless.materials, 5);
  assert.equal(candidate.headless.images, 0);
  assert.equal(candidate.mainWindowReview.mcp1, "pass-current-sha-visual-and-structure");
  assert.equal(candidate.mainWindowReview.mapAcceptance, "pass");
  assert.equal(candidate.nextGate, "main-window-hero-mcp2");
  assert.equal(candidate.publicRegistryEdited, false);
  assert.equal(candidate.runtimeEdited, false);
  assert.equal(
    candidate.buildRecord.sha256,
    sha256(recordBuffer),
    "Fast 候选必须指向当前 build record",
  );
  assert.equal(
    record.validation.mcpRecord,
    "docs/research/hudec-memorial-blender-mcp-gates.json",
  );
  assert.equal(record.mainWindowReview.mcp1.captures.length, 3);
  assert.equal(record.mainWindowReview.runtime.consoleEvents, 0);
  assert.ok(
    record.mainWindowReview.runtime.performance.sampleDurationMs >= 10_000,
  );
  assert.equal(record.mainWindowReview.mapAcceptance, "pass");
  assert.equal(record.mainWindowReview.heroReviewAuthorized, true);
  assert.equal(record.mainWindowReview.identityAuthorized, false);

  for (const view of ["canonical", "side", "entrance"]) {
    const screenshot = candidate.headless.fixedViews[view];
    const buffer = await readFile(new URL(screenshot.path, root));
    assert.equal(buffer.length, screenshot.bytes);
    assert.equal(sha256(buffer), screenshot.sha256);
  }
  for (const screenshot of [
    ...record.mainWindowReview.mcp1.captures,
    ...record.mainWindowReview.runtime.screenshots,
  ]) {
    const buffer = await readFile(new URL(screenshot.path, root));
    assert.equal(buffer.length, screenshot.bytes);
    assert.equal(sha256(buffer), screenshot.sha256);
  }
});
