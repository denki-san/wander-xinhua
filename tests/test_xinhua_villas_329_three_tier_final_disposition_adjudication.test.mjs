import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const dispositionPath = "docs/research/xinhua-villas-329-final-disposition.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(new URL(relativePath, root)))
    .digest("hex");
}

test("329弄当前可验证记录不把 Massing V3 的 MCP1/可见性误报为地图验收", async () => {
  const disposition = await readJson(dispositionPath);
  const candidate = await readJson(disposition.inputs.massingV3Candidate.path);
  const v3 = disposition.massingDispositions.currentV3;

  assert.equal(await sha256(v3.blend.path), v3.blend.sha256);
  assert.equal(await sha256(v3.glb.path), v3.glb.sha256);
  assert.equal(await sha256(v3.buildRecord.path), v3.buildRecord.sha256);
  assert.equal(v3.mcp1, "pass-current-sha-visual-and-structure");
  assert.equal(v3.runtimeVisibility.status, "pass-exact-v3-load-and-visibility-map-rejected");
  assert.equal(v3.runtimeVisibility.improvementClaimed, false);
  assert.equal(candidate.mainWindowMapGate.status, disposition.mapGate.status);
  assert.equal(disposition.mapGate.status, "blocked-road-edge-and-member15-binding");
  assert.equal(disposition.gates.mapAcceptance, "blocked");
  assert.equal(disposition.mapGate.runtimeCollision, "not-run-because-map-gate-blocked");
});

test("329弄 Hero/Identity/MCP2/MCP3 严格缺口保持显式，下一动作不重做 Massing", async () => {
  const disposition = await readJson(dispositionPath);
  const hero = disposition.heroDisposition;
  const strict = disposition.strictLineageGate;

  assert.equal(await sha256(hero.blend.path), hero.blend.sha256);
  assert.equal(await sha256(hero.glb.path), hero.glb.sha256);
  assert.equal(hero.status, "hold-cross-asset-contaminated-not-mcp2-candidate");
  assert.equal(hero.derivedFromMassingV3, false);
  assert.equal(hero.mcp2Authorized, false);
  assert.equal(strict.massingV3MapAccepted, false);
  assert.equal(strict.heroDerivedFromMassingV3, false);
  assert.equal(strict.heroMcp2Passed, false);
  assert.equal(strict.identityDerivationAuthorized, false);
  assert.equal(disposition.identityDisposition.status, "not-created-not-authorized");
  assert.equal(disposition.gates.mcp3, "not-reachable");
  assert.equal(disposition.gates.threeJsThreeTier, "not-reachable");
  assert.equal(disposition.scope.binaryRebuilt, false);
  assert.ok(disposition.mainWindowActions[0].includes("不得用任意移动或缩放绕过道路冲突"));
});
