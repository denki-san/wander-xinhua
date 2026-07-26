import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath = "docs/research/build-records/tiers/xinhua-road/identity-v2/villa-le-bec-identity-v2.json";
const heroSha = "4f909a3b149e2f16e00843d4f965dc37e0a96ea2c69d67ab4e12282d7d1b5b00";
const blendSha = "6619a2eaa1b1e2c65d656ac3a52ebb940ff9ecb4ae3fd6f572737728da45276a";
async function bytes(path) { return readFile(new URL(path, root)); }
async function digest(path) { return createHash("sha256").update(await bytes(path)).digest("hex"); }
async function json(path) { return JSON.parse((await bytes(path)).toString("utf8")); }
function glb(buffer) { return JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString("utf8").trim()); }

test("Villa Le Bec Identity v2 锁定当前 Hero v2 并保留双楼开放庭院", async () => {
  const record = await json(recordPath);
  assert.equal(record.status, "identity-v2-built-pending-mcp3-and-runtime");
  assert.equal(record.derivedFrom.heroGlbSha256, heroSha);
  assert.equal(record.derivedFrom.heroBlendSha256, blendSha);
  assert.equal(record.derivedFrom.massingSha256, "593cc3995046439d973788108ac00cd6176c3f7c8fce67702e98db01d54b975f");
  assert.equal(record.continuity.collision.sameAsHeroAndMassing, true);
  assert.equal(record.continuity.collision.openCourtyard, true);
  assert.deepEqual(record.continuity.collision.solidWays, [864493176, 864493175]);
  assert.equal(record.scope.twoBuildingsOnly, true);
  assert.equal(record.gates.mcp3, "not-run");
  assert.equal(record.gates.runtime, "not-run-by-scope");
  for (const forbidden of ["trees", "decorations", "brand", "interior", "extra-ways"]) assert.ok(record.scope.excluded.includes(forbidden));
});

test("Villa Le Bec Identity v2 符合降档预算和预览可追溯性", async () => {
  const record = await json(recordPath); const buffer = await bytes(record.outputs.glb.path); const asset = glb(buffer);
  const triangles = asset.meshes.flatMap((m) => m.primitives).reduce((n, p) => n + asset.accessors[p.indices].count / 3, 0);
  assert.equal(await digest(record.generator.path), record.generator.sha256);
  assert.equal(await digest(record.outputs.blend.path), record.outputs.blend.sha256);
  assert.equal(await digest(record.outputs.glb.path), record.outputs.glb.sha256);
  assert.ok(buffer.length < record.budget.heroBytes); assert.ok(buffer.length <= record.budget.maxBytes);
  assert.ok(asset.nodes.length <= record.budget.maxNodes); assert.ok(triangles <= record.budget.maxTriangles); assert.ok(asset.materials.length <= record.budget.maxMaterials); assert.equal(asset.images?.length ?? 0, 0);
  assert.equal(asset.nodes[0].extras.runtime_tier, "identity"); assert.equal(asset.nodes[0].extras.derived_from_hero_v2_sha256, heroSha);
  for (const preview of record.outputs.previews) assert.equal(await digest(preview.path), preview.sha256);
});
