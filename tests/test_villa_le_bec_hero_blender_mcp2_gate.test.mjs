import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const gatePath = "docs/research/villa-le-bec-hero-blender-mcp2-gate-v1.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

test("Villa Le Bec Hero v1 MCP2 锁定第三版当前 SHA 并记录固定机位失败", async () => {
  const [gate, build] = await Promise.all([
    readJson(gatePath),
    readJson("docs/research/build-records/tiers/xinhua-road/hero-v1/villa-le-bec-hero.json"),
  ]);

  assert.equal(gate.gate, "MCP2");
  assert.equal(gate.verdict, "fail-fixed-view-identity-mismatch");
  for (const input of Object.values(gate.inputs)) {
    if (typeof input !== "object" || !input.path) continue;
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  assert.equal(gate.inputs.glb.sha256, build.outputs.glbSha256);
  assert.equal(gate.inputs.massingParentSha256, build.derivedFrom.massingSha256);
  assert.equal(build.gates.mcp2, "fail-main-window-fixed-view-identity-mismatch");
  assert.equal(build.gates.identity, "not-authorized-from-hero-v1");
});

test("Villa Le Bec Hero v1 MCP2 保留通过项，但两项身份固定机位失败", async () => {
  const gate = await readJson(gatePath);

  assert.deepEqual(gate.visualEvidence.map(({ view }) => view), [
    "canonical",
    "side-depth",
    "entrance",
  ]);
  for (const evidence of gate.visualEvidence) {
    assert.equal(await sha256(evidence.path), evidence.sha256, evidence.path);
  }
  assert.equal(gate.criteria.streetFacadeHierarchy.startsWith("fail"), true);
  assert.equal(gate.criteria.gardenEntryBayAndDormer.startsWith("fail"), true);
  for (const [name, value] of Object.entries(gate.criteria)) {
    if (["streetFacadeHierarchy", "gardenEntryBayAndDormer"].includes(name)) continue;
    assert.equal(value.startsWith("pass"), true, name);
  }
  assert.equal(gate.mcpObservedScene.liveReviewObjects, 5);
  assert.equal(gate.mcpObservedScene.temporaryReviewHelpers, 4);
  assert.equal(gate.mcpObservedScene.temporaryReviewHelpersSavedToBlend, false);
  assert.equal(gate.authorization.identity, "not-authorized-from-hero-v1");
  assert.match(gate.batchPolicy.reason, /禁止重做/);
});
