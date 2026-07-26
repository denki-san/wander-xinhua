import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

for (const {
  assetId,
  recordPath,
  expectedMeshes,
  expectedMaterials,
} of [
  {
    assetId: "hudec-memorial",
    recordPath: "docs/research/hudec-memorial-blender-mcp3-gate-v1.json",
    expectedMeshes: 1,
    expectedMaterials: 8,
  },
  {
    assetId: "xinhua-pocket-park",
    recordPath:
      "docs/research/xinhua-pocket-park-blender-mcp3-gate-v1.json",
    expectedMeshes: 3,
    expectedMaterials: 3,
  },
]) {
  test(`${assetId} Identity MCP3 原子场景与三机位证据闭合`, async () => {
    const record = await readJson(recordPath);
    assert.equal(record.assetId, assetId);
    assert.equal(record.status, "pass-main-window-xhigh");
    assert.equal(
      record.mcpSession.method,
      "atomic-open-fingerprint-and-three-view-render",
    );
    assert.equal(record.mcpSession.savedBlend, false);
    assert.equal(
      record.mcpSession.sceneFingerprint.meshCount,
      expectedMeshes,
    );
    assert.equal(
      record.mcpSession.sceneFingerprint.materialCount,
      expectedMaterials,
    );
    assert.equal(
      await sha256(record.source.blend.path),
      record.source.blend.sha256,
    );
    assert.equal(
      await sha256(record.source.glb.path),
      record.source.glb.sha256,
    );
    for (const view of Object.values(record.fixedViews)) {
      assert.match(view.path, /^test_artifacts\/.*\/test_/);
      assert.equal(await sha256(view.path), view.sha256);
      assert.match(view.verdict, /^pass-/);
    }
    assert.equal(record.gates.mcp3, "pass");
    assert.equal(record.gates.threeJsIdentity, "pass-main-window-single-page");
    assert.equal(record.gates.overallBuilding, "complete");
  });
}

test("MCP3 批次拒绝跨调用共享 Blender 场景假设", async () => {
  for (const path of [
    "docs/research/hudec-memorial-blender-mcp3-gate-v1.json",
    "docs/research/xinhua-pocket-park-blender-mcp3-gate-v1.json",
  ]) {
    const record = await readJson(path);
    assert.equal(record.mcpSession.sharedSceneAssumedStableAcrossCalls, false);
  }
});
