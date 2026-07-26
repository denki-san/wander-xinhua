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

test("Xingfuli East 三档二进制保留，但严格 lineage 不被伪造", async () => {
  const [audit, hero, identity, massing] = await Promise.all([
    readJson("docs/research/xingfuli-east-tier-map-audit.json"),
    readJson("docs/research/build-records/xingfuli.json"),
    readJson("docs/research/build-records/xingfuli-identity.json"),
    readJson("docs/research/build-records/xingfuli-massing.json"),
  ]);
  const records = { hero, identity, massing };
  for (const [tierName, tier] of Object.entries(audit.tiers)) {
    if (tierName === "recoveryComparison") continue;
    const output = records[tierName].outputs.segments.find(({ id }) => id === "east");
    assert.equal(await sha256(tier.glb), tier.glbSha256);
    assert.equal(output.sha256, tier.glbSha256);
    assert.equal(await sha256(tier.blend), tier.blendSha256);
  }
  assert.ok(Date.parse(massing.generatedAt) < Date.parse(identity.generatedAt));
  assert.ok(Date.parse(identity.generatedAt) < Date.parse(hero.generatedAt));
  assert.equal(JSON.stringify(identity).includes("derivedFrom"), false);
  assert.equal(JSON.stringify(massing).includes("derivedFrom"), false);
  assert.equal(audit.lineageGate.status, "blocked");
  assert.equal(audit.scope.rebuiltAssets, false);
});

test("Xingfuli East 道路相交和东段起点 blocker 保持显式", async () => {
  const audit = await readJson("docs/research/xingfuli-east-tier-map-audit.json");
  const { mapCalibration, collisionAndCamera, gates } = audit;
  assert.equal(mapCalibration.placement.axisAnchorStatus, "pass");
  assert.equal(mapCalibration.roadClearance.status, "blocked");
  assert.ok(mapCalibration.roadClearance.southEastBuildingAsphaltClearanceScene < 0);
  assert.ok(mapCalibration.roadClearance.entranceMatrixWallAsphaltClearanceScene < 0);
  assert.equal(mapCalibration.roadClearance.eastLaneBaseAsphaltClearanceScene, -3.625);
  assert.ok(collisionAndCamera.northNeighborGapWorld > 0);
  assert.ok(collisionAndCamera.northNeighborGapAfterPlayerDiameterWorld > 0);
  assert.equal(collisionAndCamera.eastRouteEnd.blocked, false);
  assert.equal(collisionAndCamera.fastModeCanonicalStart.targetsEast, false);
  assert.equal(collisionAndCamera.eastEntranceStart.blocked, true);
  assert.equal(collisionAndCamera.eastEntranceStart.blockingObstacle, "east-entry-bollard-2");
  assert.equal(gates.roadAndFootprint, "blocked");
  assert.equal(gates.eastStartAndCamera, "blocked");
  assert.equal(gates.overall, "blocked");
});
