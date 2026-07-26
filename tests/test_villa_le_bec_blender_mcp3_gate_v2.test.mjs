import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const gatePath = "docs/research/villa-le-bec-blender-mcp3-gate-v2.json";
const json = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const sha = async (path) => createHash("sha256")
  .update(await readFile(new URL(path, root)))
  .digest("hex");

test("Villa Le Bec MCP3 锁定 Massing、Hero v2 与 Identity v2 当前 SHA", async () => {
  const gate = await json(gatePath);
  assert.equal(gate.assetId, "villa-le-bec");
  assert.equal(gate.gate, "MCP3");
  assert.equal(gate.verdict, "pass");
  assert.equal(gate.tiers.massing.glb.sha256, "593cc3995046439d973788108ac00cd6176c3f7c8fce67702e98db01d54b975f");
  assert.equal(gate.tiers.hero.glb.sha256, "4f909a3b149e2f16e00843d4f965dc37e0a96ea2c69d67ab4e12282d7d1b5b00");
  assert.equal(gate.tiers.identity.glb.sha256, "4be0685ed6db3f0fe462288de326393175f3bd4285a71992dac17a9f82f56e55");
  for (const tier of Object.values(gate.tiers)) {
    assert.equal(await sha(tier.blend.path), tier.blend.sha256);
    assert.equal(await sha(tier.glb.path), tier.glb.sha256);
    assert.equal(tier.views.length, 3);
    for (const view of tier.views) assert.equal(await sha(view.path), view.sha256);
  }
});

test("Villa Le Bec MCP3 保持三档空间、碰撞和范围连续", async () => {
  const gate = await json(gatePath);
  assert.equal(gate.continuity.rootTransforms, "pass-all-identity");
  assert.equal(gate.continuity.groundDatum, "pass-all-z-zero");
  assert.equal(gate.continuity.twoBuildingEnvelope, "pass");
  assert.equal(gate.continuity.openCourtyard, "pass");
  assert.equal(gate.continuity.placementScaleCollision, "unchanged-from-accepted-massing");
  assert.match(gate.continuity.scopePurity, /no-trees/);
  assert.equal(gate.mcpSession.temporaryReviewHelpersSavedToBlend, false);
  assert.equal(gate.mcpSession.finalSavedAssetObjects, 1);
  assert.equal(gate.mcpSession.dirtyAfterReopen, false);
  assert.equal(gate.authorization.defaultRuntimePromotion, "not-authorized-until-threejs-pass");
  assert.match(gate.authorization.identityV1, /^hold-/);
  assert.match(gate.authorization.heroV1, /^hold-/);
});
