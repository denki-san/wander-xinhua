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
  assert.equal(record.status, "mcp1-pass-map-blocked-entrance-collision");
  assert.equal(record.generator.singleAssetSafe, true);
  assert.deepEqual(record.holdBoundary, {
    trees: "untouched",
    decor: "untouched",
    characters: "no runtime character asset; preview-only scale proxy",
    otherBuildings: "untouched",
    globalMassing: "untouched",
  });
  assert.match(generator, /当前只开放 massing/);
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

function transformObstacle(placement, obstacle) {
  const [positionX, positionZ] = placement.position;
  const cosine = Math.cos(placement.yawRadians);
  const sine = Math.sin(placement.yawRadians);
  const worldX = [];
  const worldZ = [];
  for (const localX of [obstacle.minX, obstacle.maxX]) {
    for (const sourceZ of [obstacle.minZ, obstacle.maxZ]) {
      const localZ = -sourceZ;
      worldX.push(
        positionX + placement.scale * (cosine * localX + sine * localZ),
      );
      worldZ.push(
        positionZ + placement.scale * (-sine * localX + cosine * localZ),
      );
    }
  }
  return {
    minX: Math.min(...worldX) - placement.collisionMargin,
    maxX: Math.max(...worldX) + placement.collisionMargin,
    minZ: Math.min(...worldZ) - placement.collisionMargin,
    maxZ: Math.max(...worldZ) + placement.collisionMargin,
  };
}

function pointInsideObstacle([x, z], obstacle, radius = 0) {
  return (
    x >= obstacle.minX - radius
    && x <= obstacle.maxX + radius
    && z >= obstacle.minZ - radius
    && z <= obstacle.maxZ + radius
  );
}

test("Hudec Massing Three.js 地图门保留精确资源、截图与源 registry 边界", async () => {
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
  assert.equal(qa.resource.encodedBodySize, glb.length);
  assert.equal(qa.resource.sha256, sha256(glb));
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
  assert.equal(gate.mapGate.status, "blocked");
  assert.equal(gate.mapGate.heroIdentityAuthorized, false);
  assert.equal(gate.heroGate.status, "blocked-until-map-gate-pass");
  assert.equal(qa.verdict.mapGate, "blocked");
  assert.equal(qa.performance.sampleDurationMs < 10_000, true);
  assert.equal(
    qa.performance.contractStatus,
    "diagnostic-only-sample-shorter-than-required-10-seconds",
  );
  assert.equal(
    record.validation.runtimeQaRecord,
    "test_artifacts/test_hudec-memorial_massing_runtime_metrics.json",
  );

  const committedLandmarks = JSON.parse(landmarkSource);
  const committedHudec = committedLandmarks.landmarks.find(
    ({ id }) => id === "hudec-memorial",
  );
  assert.equal(
    committedHudec.model,
    "/models/requested-pois/hudec-memorial.glb",
    "公共 registry 必须保持 legacy Hero，不得把临时 Massing QA 路径提交进去",
  );

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

test("Hudec Massing 起点与相机安全，但真实门廊净宽阻塞地图门", async () => {
  const [qa, generator] = await Promise.all([
    readFile(runtimeQaUrl, "utf8").then(JSON.parse),
    readFile(generatorUrl, "utf8"),
  ]);
  const values = qa.qaAssembly.runtimeValues;
  const placement = {
    position: values.position,
    yawRadians: values.yawRadians,
    scale: values.scale,
    collisionMargin: values.collisionMargin,
  };
  const worldObstacles = values.localObstacles.map((obstacle) => (
    transformObstacle(placement, obstacle)
  ));
  const playerRadius = qa.mapCalibration.collisionAndWalkable.playerRadius;

  assert.equal(values.localObstacles.length, 8);
  assert.equal(
    worldObstacles.some((obstacle) => (
      pointInsideObstacle(values.start, obstacle, playerRadius)
    )),
    false,
  );
  assert.equal(
    worldObstacles.some((obstacle) => (
      pointInsideObstacle(
        qa.mapCalibration.camera.startCameraClearanceProbe,
        obstacle,
      )
    )),
    false,
  );

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
  const requiredGap = 2 * (values.collisionMargin + playerRadius);
  const blocker = qa.mapCalibration.collisionAndWalkable;

  assert.deepEqual(
    leftWall.map((value) => Number(value.toFixed(4))),
    blocker.actualPorchGeometry.leftWallX,
  );
  assert.deepEqual(
    rightWall.map((value) => Number(value.toFixed(4))),
    blocker.actualPorchGeometry.rightWallX,
  );
  assert.equal(Number(actualGap.toFixed(4)), blocker.actualPorchGeometry.visualGap);
  assert.equal(Number(requiredGap.toFixed(2)), blocker.requiredGapWithMarginAndPlayerRadius);
  assert.equal(Number((requiredGap - actualGap).toFixed(4)), blocker.gapDeficit);
  assert.ok(
    actualGap < requiredGap,
    "真实门廊墙之间没有计入 margin 与玩家半径后的合法中心线",
  );
  assert.equal(blocker.status, "blocked-entrance-width");
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

test("Hudec Massing MCP1 固定机位、结构检查与正式二进制一致", async () => {
  const [gate, recordBuffer, glb] = await Promise.all([
    readFile(mcpGateUrl, "utf8").then(JSON.parse),
    readFile(recordUrl),
    readFile(glbUrl),
  ]);
  const record = JSON.parse(recordBuffer);

  assert.equal(gate.assetId, "hudec-memorial");
  assert.equal(gate.massingGate.status, "pass");
  assert.equal(gate.massingGate.runtimeAsset.sha256, sha256(glb));
  assert.equal(gate.massingGate.sceneInspection.triangles, 2180);
  assert.equal(gate.massingGate.sceneInspection.materials, 5);
  assert.equal(gate.massingGate.sceneInspection.images, 0);
  assert.deepEqual(gate.massingGate.acceptedInteractiveChanges, []);
  assert.equal(gate.massingGate.generatorRoundTrip.status, "not-required");
  assert.equal(
    gate.massingGate.buildRecord.sha256,
    sha256(recordBuffer),
    "MCP gate 必须指向当前 build record，而不是更新前的旧哈希",
  );
  assert.equal(
    record.validation.mcpRecord,
    "docs/research/hudec-memorial-blender-mcp-gates.json",
  );

  for (const view of ["canonical", "side", "entrance"]) {
    const screenshot = gate.massingGate.fixedViews[view];
    const buffer = await readFile(new URL(screenshot.screenshot, root));
    assert.equal(buffer.length, screenshot.bytes);
    assert.equal(sha256(buffer), screenshot.sha256);
  }
});
