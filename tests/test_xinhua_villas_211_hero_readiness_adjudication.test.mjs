import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const adjudicationPath = "docs/research/xinhua-villas-211-hero-readiness-adjudication.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(new URL(relativePath, root)))
    .digest("hex");
}

test("211 Hero readiness 冻结已通过 Massing、placement 与 collision 合同", async () => {
  const [adjudication, disposition] = await Promise.all([
    readJson(adjudicationPath),
    readJson("docs/research/xinhua-villas-211-three-tier-final-disposition.json"),
  ]);
  for (const source of Object.values(adjudication.sources)) {
    assert.equal(await sha256(source.path), source.sha256, source.path);
  }
  const frozen = adjudication.frozenMassingContract;
  assert.equal(await sha256(frozen.glb), frozen.glbSha256);
  assert.deepEqual(frozen.placement.position, disposition.tiers.massing.placement.position);
  assert.equal(frozen.placement.yaw, disposition.tiers.massing.placement.yaw);
  assert.equal(frozen.placement.scale, disposition.tiers.massing.placement.scale);
  assert.equal(frozen.localObstacleCount, undefined);
  assert.equal(frozen.collision.localObstacleCount, 9);
  assert.equal(frozen.collision.wallStop, "pass-wall-stop-no-penetration");
  assert.equal(frozen.movementOrScaleAuthorized, false);
});

test("211 Hero 门因视角和成员绑定缺口保持 blocked，不借用旧 Hero 或 Massing", async () => {
  const adjudication = await readJson(adjudicationPath);
  assert.equal(adjudication.status, "blocked-evidence-not-authorized-to-build-hero");
  assert.equal(adjudication.viewMatrix.compoundSideOrDepth, "missing");
  assert.equal(adjudication.viewMatrix.member211_1Placement, "missing");
  assert.equal(adjudication.viewMatrix.member211_2Placement, "missing");
  assert.equal(adjudication.heroAuthorization.authorized, false);
  assert.equal(adjudication.heroAuthorization.missingHardGates.length, 4);
  assert.ok(Object.keys(adjudication.identityComponents).length >= 3);
  assert.equal(adjudication.identityComponents.member211_1Cues.heroUse, "not-authorized");
  assert.equal(adjudication.identityComponents.member211_2Cues.heroUse, "not-authorized");
  assert.ok(adjudication.heroAuthorization.forbidden.includes("derive identity from massing"));
  assert.ok(adjudication.heroAuthorization.forbidden.includes("promote legacy hero to MCP2"));
});
