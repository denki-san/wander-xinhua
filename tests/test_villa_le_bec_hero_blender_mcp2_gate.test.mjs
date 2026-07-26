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

test("Villa Le Bec MCP2 锁定第三版 Hero 当前 SHA 与 Massing 父级", async () => {
  const [gate, build] = await Promise.all([
    readJson(gatePath),
    readJson("docs/research/build-records/tiers/xinhua-road/hero-v1/villa-le-bec-hero.json"),
  ]);

  assert.equal(gate.gate, "MCP2");
  assert.equal(gate.verdict, "pass");
  for (const input of Object.values(gate.inputs)) {
    if (typeof input !== "object" || !input.path) continue;
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  assert.equal(gate.inputs.glb.sha256, build.outputs.glbSha256);
  assert.equal(gate.inputs.massingParentSha256, build.derivedFrom.massingSha256);
  assert.equal(build.gates.mcp2, "pass-main-window-blender-mcp-current-sha");
  assert.equal(build.gates.identity, "authorized-from-current-hero-sha-only");
});

test("Villa Le Bec MCP2 三固定机位、范围和开放庭院门均通过", async () => {
  const gate = await readJson(gatePath);

  assert.deepEqual(gate.visualEvidence.map(({ view }) => view), [
    "canonical",
    "side-depth",
    "entrance",
  ]);
  for (const evidence of gate.visualEvidence) {
    assert.equal(await sha256(evidence.path), evidence.sha256, evidence.path);
  }
  assert.ok(Object.values(gate.criteria).every((value) => value.startsWith("pass")));
  assert.equal(gate.mcpObservedScene.temporaryReviewHelpersSavedToBlend, false);
  assert.equal(gate.authorization.identity, "authorized-from-current-hero-sha-only");
  assert.match(gate.batchPolicy.reason, /禁止重做/);
});
