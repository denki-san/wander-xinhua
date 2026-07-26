import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const gatePath = "docs/research/villa-le-bec-hero-v2-blender-mcp2-gate.json";

async function bytes(path) {
  return readFile(new URL(path, root));
}

async function json(path) {
  return JSON.parse((await bytes(path)).toString("utf8"));
}

async function sha256(path) {
  return createHash("sha256").update(await bytes(path)).digest("hex");
}

test("Villa Le Bec Hero v2 MCP2 锁定当前二进制、父级与被拒 v1 裁决", async () => {
  const [gate, build] = await Promise.all([
    json(gatePath),
    json("docs/research/build-records/tiers/xinhua-road/hero-v2/villa-le-bec-hero-v2.json"),
  ]);

  assert.equal(gate.verdict, "pass");
  for (const input of Object.values(gate.inputs)) {
    if (typeof input !== "object" || !input.path) continue;
    if (input.gitCommit) {
      const snapshot = execFileSync(
        "git",
        ["show", `${input.gitCommit}:${input.path}`],
        { cwd: decodeURIComponent(root.pathname) },
      );
      assert.equal(
        createHash("sha256").update(snapshot).digest("hex"),
        input.sha256,
        `${input.path}@${input.gitCommit}`,
      );
      continue;
    }
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  assert.equal(gate.inputs.glb.sha256, build.outputs.glbSha256);
  assert.equal(gate.inputs.massingParentSha256, build.derivedFrom.massingSha256);
  assert.equal(build.gates.mcp2, "pass-main-window-blender-mcp-current-v2-sha");
  assert.equal(build.gates.identity, "authorized-from-current-hero-v2-sha-only");
});

test("Villa Le Bec Hero v2 三固定机位和范围通过，旧 v1/Identity 继续 Hold", async () => {
  const gate = await json(gatePath);

  assert.deepEqual(gate.visualEvidence.map(({ view }) => view), [
    "canonical",
    "side-depth",
    "entrance",
  ]);
  for (const evidence of gate.visualEvidence) {
    assert.equal(await sha256(evidence.path), evidence.sha256, evidence.path);
  }
  assert.ok(Object.values(gate.criteria).every((value) => value.startsWith("pass")));
  assert.equal(gate.mcpObservedScene.savedAssetObjects, 1);
  assert.equal(gate.mcpObservedScene.liveReviewObjects, 6);
  assert.equal(gate.mcpObservedScene.temporaryReviewHelpers, 5);
  assert.equal(gate.mcpObservedScene.temporaryReviewHelpersSavedToBlend, false);
  assert.equal(gate.mcpObservedScene.dirtyAfterReopen, false);
  assert.match(gate.supersession.heroV1, /^hold-/);
  assert.match(gate.supersession.identityV1, /^hold-/);
  assert.equal(gate.authorization.identityV2, "authorized-from-current-hero-v2-sha-only");
  assert.match(gate.batchPolicy.reason, /禁止重做/);
});
