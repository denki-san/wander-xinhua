import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath =
  "docs/research/film-art-center-map-runtime-qa-v3.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function pngDimensions(bytes) {
  assert.equal(bytes.toString("ascii", 1, 4), "PNG");
  return [
    bytes.readUInt32BE(16),
    bytes.readUInt32BE(20),
  ];
}

test("Film Art Center v3 地图校准锁定官方 footprint、0.5 比例与道路净距", async () => {
  const [record, rescue, registry] = await Promise.all([
    readJson(recordPath),
    readJson(
      "docs/research/film-art-center-road-evidence-rescue-2026-07-26.json",
    ),
    readJson("app/scene/xinhua-road-landmarks-data.json"),
  ]);
  const landmark = registry.landmarks.find(
    ({ id }) => id === "film-art-center",
  );

  assert.equal(
    record.status,
    "pass-main-window-map-scale-three-tier-fallback-performance-collision",
  );
  assert.deepEqual(record.scope.exactBuildingIds, ["film-art-center"]);
  assert.equal(record.scope.qualifiedModelStagesReused, true);
  assert.equal(record.scope.blenderMcpRepeated, false);
  assert.equal(record.scope.modelBinariesChanged, false);
  assert.equal(record.scope.treesDecorationFullMap, "untouched");
  assert.equal(record.scope.recoveryHold, "untouched");
  assert.deepEqual(landmark.position, record.placement.position);
  assert.equal(landmark.yaw, record.placement.yaw);
  assert.equal(landmark.scale, 0.5);
  assert.equal(record.placement.osmWayId, 864505138);
  assert.equal(
    landmark.collisionEvidence.osmWayId,
    record.placement.osmWayId,
  );
  assert.deepEqual(
    rescue.acceptedCandidate.runtimeScaleCalibration
      .completeHeroRoadClearanceSceneUnits,
    record.placement.completeHeroRoadClearanceSceneUnits,
  );
  assert.ok(
    record.placement.completeHeroRoadClearanceSceneUnits["577252297"]
      >= 0.75,
  );
  assert.ok(
    record.placement.completeHeroRoadClearanceSceneUnits["1520590652"] > 0,
  );
});

test("Film Art Center v3 同页三档保持可见、120 帧和严格资源递减", async () => {
  const record = await readJson(recordPath);
  const tiers = ["hero", "identity", "massing"].map(
    (tier) => record.tiers[tier],
  );

  for (const tier of tiers) {
    assert.equal(tier.status, "loaded");
    assert.equal(tier.performance.frames, 120);
    assert.equal(tier.performance.buildMode, "browser-runtime");
    assert.ok(tier.performance.fps > 50);
    assert.equal(tier.resourceDecodedBodySize, tier.assetBytes);
    assert.equal(tier.unexpectedErrors, 0);
    assert.match(tier.route, /qaAutoStart=1/u);
    assert.match(tier.route, /qaRuntimeTelemetry=1/u);
  }
  assert.ok(tiers[0].assetBytes > tiers[1].assetBytes);
  assert.ok(tiers[1].assetBytes > tiers[2].assetBytes);
  assert.ok(
    tiers[0].performance.rendererTriangles
      > tiers[1].performance.rendererTriangles,
  );
  assert.ok(
    tiers[1].performance.rendererTriangles
      > tiers[2].performance.rendererTriangles,
  );

  const width = (bounds) => bounds.max[0] - bounds.min[0];
  const depth = (bounds) => bounds.max[2] - bounds.min[2];
  assert.ok(width(tiers[0].worldBounds) > width(tiers[1].worldBounds));
  assert.ok(width(tiers[1].worldBounds) > width(tiers[2].worldBounds));
  assert.ok(depth(tiers[0].worldBounds) > depth(tiers[1].worldBounds));
  assert.ok(depth(tiers[1].worldBounds) > depth(tiers[2].worldBounds));
});

test("Film Art Center v3 两条 fallback 与碰撞轨迹保持可游玩且不穿楼", async () => {
  const record = await readJson(recordPath);
  const scoped = record.fallback.scopedIdentity;
  const production = record.fallback.productionIdentity;
  const collision = record.collision;

  assert.equal(scoped.status, "fallback");
  assert.equal(scoped.pagePlayable, true);
  assert.equal(scoped.frames, 120);
  assert.ok(scoped.fps > 50);
  assert.equal(scoped.expectedWindowErrors, 1);
  assert.equal(scoped.unexpectedErrors, 0);
  assert.match(scoped.source, /test_missing-film-art-center-identity/u);

  assert.equal(production.status, "fallback");
  assert.equal(production.pagePlayable, true);
  assert.deepEqual(production.position, [0, 0, -2.25]);
  assert.equal(production.expectedWindowErrors, 1);
  assert.equal(production.unexpectedErrors, 0);

  assert.equal(
    collision.status,
    "pass-blocked-and-wall-slide-no-penetration",
  );
  assert.equal(collision.durationMs, 10000);
  assert.ok(collision.wallSlidePlateauMs >= 4000);
  assert.equal(
    collision.firstWallContact.playerPosition[1],
    collision.end.playerPosition[1],
  );
  assert.ok(collision.end.playerPosition[1] > collision.target[1] + 5);
  assert.ok(collision.targetDistanceAtEnd > 5);
  assert.equal(collision.unexpectedErrors, 0);
});

test("Film Art Center v3 六张真实页面截图 SHA 与视口可追溯", async () => {
  const record = await readJson(recordPath);
  const screenshots = [
    record.tiers.hero.screenshot,
    record.tiers.identity.screenshot,
    record.tiers.massing.screenshot,
    record.fallback.scopedIdentity.screenshot,
    record.fallback.productionIdentity.screenshot,
    record.collision.screenshot,
  ];

  for (const screenshot of screenshots) {
    const bytes = await readFile(new URL(screenshot.path, root));
    assert.equal(bytes.length, screenshot.bytes, screenshot.path);
    assert.equal(sha256(bytes), screenshot.sha256, screenshot.path);
    assert.deepEqual(pngDimensions(bytes), [1280, 577], screenshot.path);
    assert.match(screenshot.path, /\/test_/u);
  }
});

test("Film Art Center v2 最终裁决引用共同 provenance 与双运行时记录", async () => {
  const [finalAcceptance, adjudication, supportingRuntime] =
    await Promise.all([
      readJson(
        "docs/research/film-art-center-final-acceptance-v2-2026-07-26.json",
      ),
      readJson("docs/research/film-art-center-lineage-adjudication-v2.json"),
      readJson(
        "docs/research/film-art-center-footprint-v2-threejs-runtime-qa.json",
      ),
    ]);

  assert.equal(finalAcceptance.status, "complete");
  assert.equal(finalAcceptance.verdict.eligibleForProduction, true);
  assert.equal(finalAcceptance.gates.specialtyFastMode.tests, 67);
  assert.equal(
    finalAcceptance.gates.threeJs.record,
    "docs/research/film-art-center-map-runtime-qa-v3.json",
  );
  assert.equal(
    finalAcceptance.gates.threeJs.supportingDefaultContextRecord,
    "docs/research/film-art-center-footprint-v2-threejs-runtime-qa.json",
  );
  assert.equal(
    finalAcceptance.gates.lineage.record,
    "docs/research/film-art-center-lineage-adjudication-v2.json",
  );
  assert.equal(
    adjudication.status,
    "pass-common-provenance-topology-only-repair",
  );
  assert.equal(
    adjudication.adjudication.directCurrentHeroToMassingSha,
    "not-claimed",
  );
  assert.equal(adjudication.adjudication.mcp1RedoRequired, false);
  assert.equal(adjudication.adjudication.binaryRebuildRequired, false);

  assert.equal(
    supportingRuntime.status,
    "pass-current-footprint-scale-runtime",
  );
  assert.equal(supportingRuntime.placement.scale, 0.5);
  assert.equal(supportingRuntime.scope.qualifiedBlenderAndBinaryStagesRedone, false);
  assert.equal(
    supportingRuntime.performanceBoundary.claim,
    "measured-only-no-performance-improvement-claim",
  );
  for (const tier of Object.values(supportingRuntime.tiers)) {
    assert.equal(tier.frameSample.frames, 120);
    assert.ok(tier.frameSample.fps > 30);
  }
  for (const screenshot of supportingRuntime.screenshots) {
    const bytes = await readFile(new URL(screenshot.path, root));
    assert.equal(bytes.length, screenshot.bytes, screenshot.path);
    assert.equal(sha256(bytes), screenshot.sha256, screenshot.path);
  }
});

test("Film Art Center 默认 production context 的 1280x720 补充采集可追溯", async () => {
  const record = await readJson(
    "docs/research/film-art-center-footprint-v2-threejs-runtime-qa.json",
  );
  assert.equal(record.status, "pass-current-footprint-scale-runtime");
  assert.deepEqual(record.viewport, [1280, 720]);
  assert.equal(record.placement.scale, 0.5);
  assert.equal(record.placement.status, (
    "pass-evidence-footprint-and-complete-hero-clear-of-surface-roads"
  ));
  for (const tier of Object.values(record.tiers)) {
    assert.equal(tier.status, "loaded");
    assert.equal(tier.frameSample.frames, 120);
    assert.ok(tier.frameSample.fps > 30);
  }
  assert.equal(record.collision.status, "pass-blocked-before-center-and-stable");
  assert.ok(record.collision.finalTargetErrorSceneUnits > 5);
  assert.equal(
    record.performanceBoundary.claim,
    "measured-only-no-performance-improvement-claim",
  );
  for (const screenshot of record.screenshots) {
    const bytes = await readFile(new URL(screenshot.path, root));
    assert.equal(bytes.length, screenshot.bytes, screenshot.path);
    assert.equal(sha256(bytes), screenshot.sha256, screenshot.path);
    assert.match(screenshot.path, /\/test_/u);
  }
});

test("Film Art Center v2 终审以真实共同 provenance 关闭旧 blocker", async () => {
  const [acceptance, lineage, historical] = await Promise.all([
    readJson(
      "docs/research/film-art-center-final-acceptance-v2-2026-07-26.json",
    ),
    readJson("docs/research/film-art-center-lineage-adjudication-v2.json"),
    readJson("docs/research/film-art-center-final-audit-2026-07-26.json"),
  ]);
  assert.equal(
    historical.verdict.status,
    "blocked-current-map-and-strict-massing-lineage",
  );
  assert.equal(acceptance.supersedes.preservation, (
    "retained-read-only-not-overwritten"
  ));
  assert.equal(
    lineage.status,
    "pass-common-provenance-topology-only-repair",
  );
  assert.equal(
    lineage.provenanceGraph.massing.directCurrentHeroShaClaim,
    false,
  );
  assert.equal(
    lineage.adjudication.directCurrentHeroToMassingSha,
    "not-claimed",
  );
  assert.equal(lineage.adjudication.binaryRebuildRequired, false);
  assert.equal(lineage.adjudication.mcp1RedoRequired, false);
  assert.equal(acceptance.status, "complete");
  assert.equal(acceptance.verdict.eligibleForProduction, true);
});
