import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const dispositionPath = "docs/research/hudec-memorial-final-disposition.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

async function inspectGlb(path) {
  const buffer = await readFile(new URL(path, root));
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(
    buffer.subarray(20, 20 + jsonLength).toString("utf8").trim(),
  );
  let triangles = 0;
  let primitives = 0;
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      primitives += 1;
      const position = json.accessors[primitive.attributes.POSITION];
      const indices = primitive.indices === undefined
        ? position
        : json.accessors[primitive.indices];
      triangles += indices.count / 3;
      for (let axis = 0; axis < 3; axis += 1) {
        bounds.min[axis] = Math.min(bounds.min[axis], position.min[axis]);
        bounds.max[axis] = Math.max(bounds.max[axis], position.max[axis]);
      }
    }
  }
  return {
    buffer,
    json,
    metrics: {
      bytes: buffer.length,
      nodes: json.nodes?.length ?? 0,
      meshes: json.meshes?.length ?? 0,
      primitives,
      triangles,
      materials: json.materials?.length ?? 0,
      images: json.images?.length ?? 0,
      textures: json.textures?.length ?? 0,
      bounds,
    },
  };
}

function closeArray(actual, expected, tolerance = 1e-5) {
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < actual.length; index += 1) {
    assert.ok(Math.abs(actual[index] - expected[index]) <= tolerance);
  }
}

test("邬达克最终 disposition 只固定本栋输入且没有重做合格阶段", async () => {
  const disposition = await readJson(dispositionPath);
  assert.equal(
    disposition.baseCommit,
    "2e33699f24330f4c9c98f4c63e8048fd657d90e3",
  );
  assert.equal(disposition.scope.binaryRebuilt, false);
  assert.equal(disposition.scope.qualifiedGateRerun, false);
  assert.equal(disposition.scope.browserOrXhsAccessed, false);
  assert.equal(disposition.scope.sharedFilesModified, false);
  assert.equal(disposition.scope.legacyHeroOverwrittenOrDeleted, false);
  for (const input of Object.values(disposition.inputs)) {
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  for (const record of disposition.recordPrecedence.filter(
    ({ sha256: hash }) => hash,
  )) {
    assert.equal(await sha256(record.path), record.sha256, record.path);
  }
});

test("官方证据覆盖 Massing 和 Hero 构建，但未知面保持明确", async () => {
  const disposition = await readJson(dispositionPath);
  const manifest = await readJson(disposition.inputs.referenceManifest.path);
  assert.equal(manifest.assetId, "hudec-memorial");
  assert.equal(manifest.placementEvidence.osmWay, disposition.evidenceGate.osmWayId);
  assert.equal(
    manifest.canonicalReference,
    disposition.evidenceGate.canonicalReference,
  );
  assert.equal(manifest.references.length, 3);
  for (const reference of manifest.references) {
    assert.equal(await sha256(reference.localPath), reference.sha256);
  }
  assert.ok(
    manifest.coverageMatrix.some(
      ({ slot, status }) => slot === "rear-and-east" && status === "unknown",
    ),
  );
  assert.equal(disposition.evidenceGate.xhsSearchRequired, false);
});

test("当前 Massing v2 二进制、生成器和 build record 精确闭合", async () => {
  const disposition = await readJson(dispositionPath);
  const massing = disposition.currentMassing;
  for (const artifact of [massing.generator, massing.blend, massing.glb]) {
    assert.equal(await sha256(artifact.path), artifact.sha256, artifact.path);
    assert.equal((await stat(new URL(artifact.path, root))).size, artifact.bytes);
  }
  const { metrics, json } = await inspectGlb(massing.glb.path);
  for (const key of [
    "bytes",
    "nodes",
    "meshes",
    "primitives",
    "triangles",
    "materials",
    "images",
    "textures",
  ]) {
    assert.equal(metrics[key], massing.glb[key], `massing.${key}`);
  }
  closeArray(metrics.bounds.min, massing.glb.bounds.min);
  closeArray(metrics.bounds.max, massing.glb.bounds.max);
  assert.equal(json.nodes[0].extras.stable_asset_id, "hudec-memorial");
  assert.equal(json.nodes[0].extras.quality_tier, "massing");
  assert.equal(json.nodes[0].extras.generator, massing.generator.path);
  const generator = await readFile(new URL(massing.generator.path, root), "utf8");
  assert.match(generator, /当前只开放 massing/u);
});

test("MCP1、道路、门廊碰撞和真实地图门保持当前 SHA 通过", async () => {
  const disposition = await readJson(dispositionPath);
  const record = await readJson(disposition.currentMassing.buildRecord);
  const calibration = await readJson(
    disposition.recordPrecedence.find(({ rank }) => rank === 4).path,
  );
  assert.equal(record.validation.mcp1, disposition.currentMassing.mcp1);
  assert.equal(
    record.mainWindowReview.runtimeGlbSha256,
    disposition.currentMassing.glb.sha256,
  );
  assert.equal(record.mainWindowReview.mapAcceptance, "pass");
  assert.equal(record.mainWindowReview.identityAuthorized, false);
  assert.equal(calibration.roadGate.status, disposition.mapGate.road.status);
  assert.equal(
    calibration.roadGate.modelToAsphaltEdgeSceneUnits,
    disposition.mapGate.road.modelToAsphaltEdgeSceneUnits,
  );
  assert.equal(
    calibration.collisionRecommendation.worldEntranceGap,
    disposition.mapGate.entrance.worldVisualGapSceneUnits,
  );
  assert.equal(
    calibration.collisionRecommendation.requiredEntranceGap,
    disposition.mapGate.entrance.requiredGapSceneUnits,
  );
  assert.ok(
    disposition.mapGate.entrance.worldVisualGapSceneUnits
      > disposition.mapGate.entrance.requiredGapSceneUnits,
  );
  assert.equal(
    calibration.collisionRecommendation.localObstacles.length,
    disposition.mapGate.localObstacleCount,
  );
  assert.ok(record.mainWindowReview.runtime.performance.sampleDurationMs >= 10_000);
  assert.equal(record.mainWindowReview.runtime.consoleEvents, 0);
});

test("legacy Hero 仅主体命名相同，V2 lineage、transform 和范围均不合格", async () => {
  const disposition = await readJson(dispositionPath);
  const hero = disposition.legacyHero;
  assert.equal(await sha256(hero.generator.path), hero.generator.sha256);
  assert.equal(await sha256(hero.blend.path), hero.blend.sha256);
  assert.equal(await sha256(hero.glb.path), hero.glb.sha256);
  const { metrics, json } = await inspectGlb(hero.glb.path);
  for (const key of [
    "bytes",
    "nodes",
    "meshes",
    "primitives",
    "triangles",
    "materials",
    "images",
    "textures",
  ]) {
    assert.equal(metrics[key], hero.glb[key], `hero.${key}`);
  }
  closeArray(metrics.bounds.min, hero.glb.bounds.min);
  closeArray(metrics.bounds.max, hero.glb.bounds.max);
  const materialNames = json.materials.map(({ name }) => name);
  assert.ok(materialNames.includes("邬达克庭院树干"));
  assert.ok(materialNames.includes("邬达克绿篱"));
  assert.equal(hero.mcp2Authorized, false);
  assert.equal(hero.mcp2Candidate, false);
  assert.notEqual(
    hero.currentDefaultRegistryTransform.yawRadians,
    disposition.mapGate.yawRadians,
  );
  assert.notEqual(
    hero.currentDefaultRegistryTransform.scale,
    disposition.mapGate.scale,
  );
});

test("Hero gate 只授权未来 V2 候选，Identity 和三档仍被 lineage 阻塞", async () => {
  const disposition = await readJson(dispositionPath);
  const gate = await readJson(
    disposition.recordPrecedence.find(({ rank }) => rank === 3).path,
  );
  assert.equal(
    gate.heroGate.status,
    disposition.heroGateInterpretation.sourceRecordValue,
  );
  assert.equal(disposition.heroGateInterpretation.currentEligibleHeroExists, false);
  for (const path of [
    "public/models/requested-pois/hudec-memorial-identity.glb",
    "assets/models/source/requested-pois/hudec-memorial-identity.blend",
    "docs/research/build-records/hudec-memorial-hero.json",
    "docs/research/build-records/hudec-memorial-identity.json",
  ]) {
    await assert.rejects(access(new URL(path, root)));
  }
  assert.equal(disposition.identityDisposition.derivationAuthorized, false);
  assert.equal(disposition.gates.heroLineage, "blocked");
  assert.equal(disposition.gates.identity, "blocked");
  assert.equal(disposition.gates.identityMcp3, "not-reachable");
  assert.equal(disposition.gates.threeTierRuntime, "not-reachable");
  assert.equal(
    disposition.gates.overall,
    "blocked-v2-hero-lineage-and-identity",
  );
});
