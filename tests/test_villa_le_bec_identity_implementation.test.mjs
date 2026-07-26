import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath = "docs/research/build-records/tiers/xinhua-road/identity-v1/villa-le-bec-identity.json";
const heroGlbSha = "1374b7a8301345c23736644cfdc9a7ed467efb8371ebcdf72a507217b0015394";
const heroBlendSha = "a087f24cbc5c7b6eb6fb014e635a614d90f1be549441977a831277ed17f89329";

async function bytes(path) { return readFile(new URL(path, root)); }
async function sha256(path) { return createHash("sha256").update(await bytes(path)).digest("hex"); }
async function json(path) { return JSON.parse((await bytes(path)).toString("utf8")); }

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8").trim());
}

test("Villa Le Bec Identity 文件保留但因上游 Hero v1 被拒而保持 Hold", async () => {
  const [record, hero] = await Promise.all([
    json(recordPath),
    json("docs/research/build-records/tiers/xinhua-road/hero-v1/villa-le-bec-hero.json"),
  ]);
  assert.equal(record.status, "hold-derived-from-rejected-hero-v1");
  assert.equal(hero.outputs.glbSha256, heroGlbSha);
  assert.equal(hero.outputs.blendSha256, heroBlendSha);
  assert.equal(record.derivedFrom.heroGlbSha256, heroGlbSha);
  assert.equal(record.derivedFrom.heroBlendSha256, heroBlendSha);
  assert.equal(record.derivedFrom.heroMcp2, "fail-main-window-fixed-view-identity-mismatch");
  assert.equal(record.continuity.collision.sameAsHeroAndMassing, true);
  assert.equal(record.continuity.collision.openCourtyard, true);
  assert.deepEqual(record.continuity.collision.solidWays, [864493176, 864493175]);
  assert.equal(record.scope.twoBuildingsOnly, true);
  for (const forbidden of ["trees", "dressing", "brand", "interior", "low-annex", "extra-ways"]) {
    assert.ok(record.scope.excluded.includes(forbidden), forbidden);
  }
  assert.equal(record.gates.mcp3, "blocked-upstream-hero-v1-rejected");
  assert.equal(record.gates.runtime, "hold-files-retained-no-promotion");
});

test("Villa Le Bec Identity 符合降档预算、结构与预览完整性", async () => {
  const record = await json(recordPath);
  const glbBuffer = await bytes(record.outputs.glb.path);
  const glb = parseGlb(glbBuffer);
  const triangles = glb.meshes.flatMap(({ primitives }) => primitives)
    .reduce((total, primitive) => total + glb.accessors[primitive.indices].count / 3, 0);
  assert.equal(await sha256(record.generator.path), record.generator.sha256);
  assert.equal(await sha256(record.outputs.blend.path), record.outputs.blend.sha256);
  assert.equal(await sha256(record.outputs.glb.path), record.outputs.glb.sha256);
  assert.ok(glbBuffer.length < record.budget.heroBytes);
  assert.ok(glbBuffer.length <= record.budget.maxBytes);
  assert.ok(glb.nodes.length <= record.budget.maxNodes);
  assert.ok(triangles <= record.budget.maxTriangles);
  assert.ok(glb.materials.length <= record.budget.maxMaterials);
  assert.equal(glb.images?.length ?? 0, 0);
  assert.equal(glb.nodes[0].extras.runtime_tier, "identity");
  assert.equal(glb.nodes[0].extras.derived_from_hero_sha256, heroGlbSha);
  assert.ok(record.identityCues.preserved.length >= 3);
  assert.ok(record.identityCues.deliberateLosses.length >= 3);
  assert.equal(record.outputs.previews.length, 4);
  for (const preview of record.outputs.previews) {
    assert.equal(await sha256(preview.path), preview.sha256, preview.path);
  }
});
