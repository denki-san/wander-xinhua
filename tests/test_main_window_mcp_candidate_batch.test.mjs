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

test("主窗口 MCP2 冻结邬达克 Hero 并只授权 Identity", async () => {
  const gate = await readJson(
    "docs/research/hudec-memorial-blender-mcp-gates-v2.json",
  );
  const record = await readJson(
    "docs/research/build-records/tiers/xinhua-road/hero/hudec-memorial-v2-hero.json",
  );
  assert.equal(gate.mcp2.status, "pass");
  assert.equal(await sha256(gate.mcp2.runtimeAsset.path), gate.mcp2.runtimeAsset.sha256);
  assert.equal(gate.mcp2.acceptedInteractiveChanges.length, 0);
  assert.equal(gate.mcp2.checks.buildingOnlyScope, "pass-no-courtyard-tree-hedge-or-decoration");
  assert.equal(record.status, "mcp2-pass-identity-authorized");
  assert.equal(record.validation.identityAuthorization, true);
});

test("主窗口 MCP2 冻结口袋公园 Hero 且保留中央通路", async () => {
  const gate = await readJson(
    "docs/research/xinhua-pocket-park-blender-mcp-gates-v2.json",
  );
  const record = await readJson(
    "docs/research/build-records/tiers/xinhua-road/hero-v2/xinhua-pocket-park-hero.json",
  );
  assert.equal(gate.mapAndRuntime.status, "pass-main-window-v2");
  assert.equal(gate.mcp2.status, "pass");
  assert.equal(await sha256(gate.mcp2.runtimeAsset.path), gate.mcp2.runtimeAsset.sha256);
  assert.equal(gate.mcp2.checks.centerPath, "pass-open");
  assert.equal(gate.mcp2.checks.buildingOnlyScope, "pass-no-planting-bench-panels-lighting-or-paving");
  assert.equal(record.status, "mcp2-pass-identity-authorized");
  assert.equal(record.validation.identityAuthorized, true);
});

test("主窗口 MCP1 接受 Film Massing v2 的当前 Hero lineage", async () => {
  const gate = await readJson(
    "docs/research/film-art-center-blender-mcp-gates-v2.json",
  );
  const record = await readJson(
    "docs/research/build-records/tiers/xinhua-road/massing-v2/film-art-center-massing.json",
  );
  assert.equal(gate.mcp1.status, "pass");
  assert.equal(gate.mcp1.lineage.status, "pass-current-final-hero-frozen-parameters");
  assert.equal(await sha256(gate.mcp1.runtimeAsset.path), gate.mcp1.runtimeAsset.sha256);
  assert.equal(gate.mcp1.acceptedInteractiveChanges.length, 0);
  assert.equal(record.status, "mcp1-pass-main-window");
  assert.equal(record.validation.mapAndRuntime, "pending-main-window");
});
