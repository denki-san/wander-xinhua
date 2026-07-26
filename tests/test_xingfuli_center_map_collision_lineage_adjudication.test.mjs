import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(new URL(relativePath, root)))
    .digest("hex");
}

test("Xingfuli Center 三档可保留，严格 Identity lineage 仍是 blocker", async () => {
  const [audit, hero, identity, massing] = await Promise.all([
    readJson("docs/research/xingfuli-center-lineage-map-audit.json"),
    readJson("docs/research/build-records/xingfuli.json"),
    readJson("docs/research/build-records/xingfuli-identity.json"),
    readJson("docs/research/build-records/xingfuli-massing.json"),
  ]);
  const records = { hero, identity, massing };

  for (const [tierName, tier] of Object.entries(audit.tiers)) {
    const record = records[tierName].outputs.segments.find(({ id }) => id === "center");
    assert.equal(await sha256(tier.glb), tier.sha256);
    assert.equal(record.sha256, tier.sha256);
    assert.equal(await sha256(tier.blend), tier.blendSha256);
  }
  assert.ok(Date.parse(massing.generatedAt) < Date.parse(identity.generatedAt));
  assert.ok(Date.parse(identity.generatedAt) < Date.parse(hero.generatedAt));
  assert.equal(audit.lineage.identityHasExplicitDerivedFrom, false);
  assert.equal(audit.gates.identity, "blocked-lineage");
  assert.equal(audit.decision.rebuild, "forbidden-retain-qualified-assets");
});

test("Xingfuli Center 锚点和主巷通过，侧缝与入口 detail start 不误报为通过", async () => {
  const audit = await readJson("docs/research/xingfuli-center-lineage-map-audit.json");
  const map = audit.mapCalibration;

  assert.ok(map.midpointErrorMeters < 0.01);
  assert.ok(map.rotationErrorRadians < 1e-6);
  assert.ok(map.roads.nearestVisibleRoad.asphaltClearanceSceneUnits > 0);
  assert.ok(map.roads.panyuRoad.asphaltClearanceSceneUnits > 0);
  assert.ok(map.centerMainLane.remainingAfterPlayerDiameterSceneUnits > 0);
  assert.equal(map.adjacentSegments.west.productionWorldAabbOverlaps, 2);
  assert.equal(map.adjacentSegments.west.status, "primary-lane-pass-side-gap-merged-by-aabb");
  assert.ok(map.adjacentSegments.east.productionWorldAabbClearanceSceneUnits > 0);
  assert.equal(audit.gates.map, "pass-center-segment");
  assert.equal(audit.gates.collision, "pass-primary-routes-retained-aabb-side-gaps-merged");
  assert.equal(
    audit.startCamera.presets["xingfuli-entrance-detail"].status,
    "blocked-inside-player-radius-of-bollard",
  );
  assert.ok(
    audit.startCamera.presets["xingfuli-entrance-detail"].nearestObstacleSceneUnits
      < audit.startCamera.playerRadiusSceneUnits,
  );
  assert.equal(audit.gates.startCamera, "blocked");
});
