import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CASES = [
  {
    id: "xinhua-pocket-park",
    gate: "docs/research/xinhua-pocket-park-blender-mcp-gates.json",
    expectedStatus: "pass",
    expectedMapGate: "candidate-pass-analytic-runtime-pending",
  },
  {
    id: "fics-xinhua-365",
    gate: "docs/research/fics-xinhua-365-blender-mcp-gates.json",
    expectedStatus: "pass-shape-only",
    expectedMapGate: "blocked-membership-and-service-road-overlap",
  },
  {
    id: "shanghai-orchestra",
    gate: "docs/research/shanghai-orchestra-blender-mcp-gates.json",
    expectedStatus: "pass-shape-only",
    expectedMapGate: "blocked-formal-membership",
  },
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function sha256(relativePath) {
  return crypto.createHash("sha256")
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest("hex");
}

for (const entry of CASES) {
  test(`${entry.id} MCP1 只验收灰模，不越过地图或证据 blocker`, () => {
    const gate = readJson(entry.gate);
    assert.equal(gate.assetId, entry.id);
    assert.equal(gate.mode, "building-fast-batch-mcp1");
    assert.equal(gate.mcp1.status, entry.expectedStatus);
    assert.equal(gate.mapGate, entry.expectedMapGate);
    assert.equal(sha256(gate.source.blend), gate.source.blendSha256);
    assert.equal(sha256(gate.source.glb), gate.source.glbSha256);
    assert.equal(gate.mcp1.sceneInspection.testObjectsInSavedSource, 0);
    assert.equal(gate.mcp1.sceneInspection.referenceImagesEmbedded, false);
    assert.equal(gate.mcp1.scaleProxy.heightMeters, 1.8);
    assert.equal(gate.mcp1.scaleProxy.savedToBlend, false);
    assert.equal(gate.mcp1.scaleProxy.exportedToGlb, false);
    assert.deepEqual(gate.mcp1.interactiveChangesAccepted, []);
    assert.equal(gate.mcp1.qaRigSaved, false);
    assert.equal(gate.mcp1.qaRigExported, false);
    assert.equal(gate.identityAuthorized, false);
    assert.equal(gate.heroAuthorized, false);

    for (const view of Object.values(gate.mcp1.fixedViews)) {
      const absolutePath = path.join(ROOT, view.path);
      assert.equal(fs.statSync(absolutePath).size, view.bytes);
      assert.equal(sha256(view.path), view.sha256);
    }
  });
}
