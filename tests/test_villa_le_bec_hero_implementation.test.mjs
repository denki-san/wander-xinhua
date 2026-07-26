import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath = "docs/research/build-records/tiers/xinhua-road/hero-v1/villa-le-bec-hero.json";

async function bytes(path) { return readFile(new URL(path, root)); }
async function sha256(path) { return createHash("sha256").update(await bytes(path)).digest("hex"); }
async function json(path) { return JSON.parse((await bytes(path)).toString("utf8")); }

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8").trim());
}

test("Villa Le Bec Hero 由冻结 Massing SHA 派生且符合预算", async () => {
  const [record, readiness] = await Promise.all([
    json(recordPath),
    json("docs/research/villa-le-bec-hero-readiness.json"),
  ]);
  const glbBuffer = await bytes(record.outputs.glb);
  const glb = parseGlb(glbBuffer);
  const triangles = glb.meshes.flatMap(({ primitives }) => primitives)
    .reduce((total, primitive) => total + glb.accessors[primitive.indices].count / 3, 0);

  assert.equal(await sha256(record.generator), record.generatorSha256);
  assert.equal(await sha256(record.outputs.blend), record.outputs.blendSha256);
  assert.equal(await sha256(record.outputs.glb), record.outputs.glbSha256);
  assert.equal(record.derivedFrom.massingSha256, readiness.frozenInputs.acceptedMassing.sha256);
  assert.deepEqual(record.derivedFrom.placement, {
    ...readiness.frozenInputs.mapContract.placement,
    movementAuthorized: false,
  });
  assert.ok(glb.nodes.length <= record.budget.maxNodes);
  assert.ok(triangles <= record.budget.maxTriangles);
  assert.ok(glb.materials.length <= record.budget.maxMaterials);
  assert.equal(glb.images?.length ?? 0, 0);
  assert.ok(glbBuffer.length <= record.budget.maxBytes);
  assert.equal(glb.nodes[0].extras.runtime_tier, "hero");
  assert.equal(glb.nodes[0].extras.derived_from_massing_sha256, record.derivedFrom.massingSha256);
});

test("Villa Le Bec Hero 保持双楼实体与开放庭院，未越权创建 Identity 或装饰", async () => {
  const record = await json(recordPath);
  assert.equal(record.status, "hero-mcp2-pass-identity-authorized");
  assert.equal(record.scope.twoBuildingsOnly, true);
  assert.equal(record.collisionContract.openCourtyard, true);
  assert.deepEqual(record.collisionContract.solidWays, [864493176, 864493175]);
  assert.ok(record.identityCues.length >= 3);
  for (const forbidden of ["trees", "dressing", "brand", "interior", "low-annex"]) {
    assert.ok(record.scope.excluded.includes(forbidden), forbidden);
  }
  assert.equal(record.gates.mcp2, "pass-main-window-blender-mcp-current-sha");
  assert.equal(record.gates.identity, "authorized-from-current-hero-sha-only");
  assert.equal(record.gates.runtime, "not-run-by-scope");
  assert.deepEqual(record.glazingVisibilityFix.streetProjectingBay, {
    externalNormal: "local -Y / street -v",
    bayHalfDepth: 0.29,
    glazingCenterOffset: 0.335,
    surfaceClearance: 0.045,
  });
  assert.deepEqual(record.glazingVisibilityFix.gardenEntryBay, {
    externalNormal: "local -Y after yaw+90 / garden -u",
    bayHalfDepth: 0.23,
    glazingCenterOffset: 0.275,
    surfaceClearance: 0.045,
  });
  assert.equal(
    record.glazingVisibilityFix.verdict,
    "both-glazing-and-frames-are-outside-their-bay-solid-surface",
  );
  assert.equal(
    record.mcp2IdentityBatchFix.streetFacade,
    "ground-unbranded-entry-and-glazing-rhythm-plus-upper-windows-and-projecting-bay-within-existing-massing-envelope",
  );
  assert.deepEqual(record.mcp2IdentityBatchFix.dormerGlazing, {
    count: 3,
    dormerHalfDepth: 0.41,
    glazingCenterOffset: 0.455,
    surfaceClearance: 0.045,
    externalNormal: "local -Y",
  });
  assert.ok(
    Math.abs(
      record.mcp2IdentityBatchFix.dormerGlazing.glazingCenterOffset
        - (record.mcp2IdentityBatchFix.dormerGlazing.dormerHalfDepth
          + record.mcp2IdentityBatchFix.dormerGlazing.surfaceClearance),
    ) < 1e-9,
  );
  assert.equal(record.mcp2IdentityBatchFix.gardenEntryGlazingChanged, false);
  assert.equal(record.mcp2IdentityBatchFix.massingPlacementOrCollisionChanged, false);
  assert.equal(record.outputs.previews.length, 4);
  for (const preview of record.outputs.previews) {
    assert.equal(await sha256(preview.path), preview.sha256, preview.path);
  }
});
