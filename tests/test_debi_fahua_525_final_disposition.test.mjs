import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const dispositionPath = "docs/research/debi-fahua-525-final-disposition.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
}

function inspectGlb(buffer, data) {
  let triangles = 0;
  let primitives = 0;
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  for (const mesh of data.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      primitives += 1;
      const position = data.accessors[primitive.attributes.POSITION];
      const indices = primitive.indices === undefined
        ? position
        : data.accessors[primitive.indices];
      triangles += indices.count / 3;
      for (let axis = 0; axis < 3; axis += 1) {
        bounds.min[axis] = Math.min(bounds.min[axis], position.min[axis]);
        bounds.max[axis] = Math.max(bounds.max[axis], position.max[axis]);
      }
    }
  }
  return {
    bytes: buffer.length,
    nodes: data.nodes?.length ?? 0,
    meshes: data.meshes?.length ?? 0,
    primitives,
    triangles,
    materials: data.materials?.length ?? 0,
    images: data.images?.length ?? 0,
    textures: data.textures?.length ?? 0,
    bounds,
  };
}

function closeArray(actual, expected, tolerance = 1e-5) {
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < actual.length; index += 1) {
    assert.ok(Math.abs(actual[index] - expected[index]) <= tolerance);
  }
}

test("德必法华525最终 disposition 只固定本栋输入且未重建二进制", async () => {
  const disposition = await readJson(dispositionPath);
  for (const input of [
    disposition.inputs.referenceManifest,
    disposition.inputs.modelBrief,
    disposition.inputs.legacyGenerator,
    ...disposition.inputs.localReferences,
  ]) {
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  assert.equal(
    disposition.baseCommit,
    "2b9eb49a2c77bcdb126da15566bd204c44786e66",
  );
  assert.equal(disposition.scope.binaryRebuilt, false);
  assert.equal(disposition.scope.identityDerived, false);
  assert.equal(disposition.scope.browserOrXhsAccessed, false);
  assert.equal(disposition.scope.sharedFilesModified, false);
  assert.equal(
    disposition.status,
    "blocked-map-mcp1-hero-lineage-and-identity",
  );
});

test("德必法华525 Recovery 合格阶段仅保留 runtime 可见结论", async () => {
  const disposition = await readJson(dispositionPath);
  const recovery = disposition.recoveryMassingV2;
  assert.equal(
    recovery.commit,
    "3044cd89f801250afcd477dfbcbc7da358bf4b11",
  );
  assert.equal(
    recovery.glb.sha256,
    "b9093a059417e15e722b836a38276fecabe769f6bbc9c63dfea4a08c9d95d63e",
  );
  assert.equal(recovery.runtimeGate, "pass");
  assert.equal(recovery.runtimeGeometryVisual, "pass");
  assert.equal(recovery.mapAcceptance, "blocked");
  assert.equal(recovery.identityAllowed, false);
  assert.equal(recovery.candidateStatus, "five-member-candidates-pending");
  assert.equal(disposition.gates.mcp1, "pending-not-passed");
});

test("德必法华525孤立 v3 候选不冒充当前 MCP1 或正式地图通过", async () => {
  const disposition = await readJson(dispositionPath);
  const candidate = disposition.isolatedMassingV3;
  assert.equal(
    candidate.commit,
    "0a5bbe811c5647d96a20bfafc85d6f6c7d4a7709",
  );
  assert.equal(candidate.sourceWayId, 864847922);
  assert.equal(candidate.mcp1, "pending-main-window-batch-review");
  assert.equal(candidate.runtimePromotion, false);
  assert.match(candidate.formalMapAcceptance, /^blocked-/u);
  assert.ok(disposition.mapGate.fahuazhenRoad.asphaltClearanceSceneUnits < 0);
  assert.ok(disposition.mapGate.dingxiRoad.asphaltClearanceSceneUnits > 0);
  assert.ok(
    disposition.mapGate.neighborCollision.gapAfterBothMarginsSceneUnits > 0,
  );
  assert.equal(
    disposition.mapGate.runtimeCollision,
    "not-run-because-formal-map-and-mcp1-blocked",
  );
});

test("德必法华525 legacy Hero 精确 SHA 保留但不具备纯建筑 lineage", async () => {
  const disposition = await readJson(dispositionPath);
  const hero = disposition.legacyHeroDisposition;
  assert.equal(await sha256(hero.blend.path), hero.blend.sha256);
  assert.equal(await sha256(hero.glb.path), hero.glb.sha256);

  const buffer = await readFile(new URL(hero.glb.path, root));
  const metrics = inspectGlb(buffer, parseGlb(buffer));
  for (const key of [
    "bytes",
    "nodes",
    "meshes",
    "primitives",
    "triangles",
    "materials",
    "images",
    "textures",
  ]) {
    assert.equal(metrics[key], hero.glb[key], `hero.${key}`);
  }
  closeArray(metrics.bounds.min, hero.glb.bounds.min);
  closeArray(metrics.bounds.max, hero.glb.bounds.max);

  const generator = await readFile(
    new URL(disposition.inputs.legacyGenerator.path, root),
    "utf8",
  );
  for (const token of [
    '"debi-site"',
    '"debi-fish-pond"',
    '"debi-bamboo-left"',
    '"debi-ginkgo-a"',
    '"debi-heritage-stone"',
  ]) {
    assert.ok(generator.includes(token), token);
  }
  assert.equal(hero.derivedFromAcceptedMassing, false);
  assert.equal(hero.mcp2Authorized, false);
  assert.equal(hero.mcp2Candidate, false);
  assert.ok(hero.scopePollution.includes("bamboo clusters"));
  assert.equal(disposition.strictLineageGate.status, "blocked");
});

test("德必法华525不越过 MCP1、地图与 Hero 门派生 Identity", async () => {
  const disposition = await readJson(dispositionPath);
  const identity = disposition.identityDisposition;
  assert.equal(identity.status, "not-created-not-authorized");
  assert.equal(identity.generatorCreated, false);
  assert.equal(identity.blendCreated, false);
  assert.equal(identity.glbCreated, false);
  assert.equal(identity.buildRecordCreated, false);
  assert.equal(identity.previewsCreated, false);
  assert.equal(disposition.gates.mapAcceptance, "blocked");
  assert.equal(disposition.gates.mcp2, "not-authorized");
  assert.equal(disposition.gates.identity, "not-authorized");
  assert.equal(disposition.gates.mcp3, "not-reachable");
  assert.equal(disposition.gates.threeJsThreeTier, "not-reachable");
  assert.equal(
    disposition.threeJsDisposition.threeTierFallbackPerformanceCollision,
    "not-reachable",
  );
  assert.equal(disposition.threeJsDisposition.improvementClaimed, false);
});
