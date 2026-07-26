import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const dispositionPath = "docs/research/xinhua-villas-329-final-disposition.json";

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

test("329弄最终 disposition 只固定本栋输入且未声明重建或 Identity", async () => {
  const disposition = await readJson(dispositionPath);
  for (const input of Object.values(disposition.inputs)) {
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  assert.equal(
    disposition.baseCommit,
    "aada3c412d10f822305c2e3410435f3b00278c2c",
  );
  assert.equal(disposition.scope.binaryRebuilt, false);
  assert.equal(disposition.scope.identityDerived, false);
  assert.equal(disposition.scope.browserOrXhsAccessed, false);
  assert.equal(disposition.scope.sharedFilesModified, false);
  assert.equal(disposition.status, "blocked-map-and-hero-lineage");
});

test("329弄 Recovery Massing v2 与当前 Massing v3 均保持精确 SHA 和 disposition", async () => {
  const disposition = await readJson(dispositionPath);
  for (const massing of Object.values(disposition.massingDispositions)) {
    assert.equal(await sha256(massing.blend.path), massing.blend.sha256);
    assert.equal(await sha256(massing.glb.path), massing.glb.sha256);
    assert.equal(await sha256(massing.buildRecord.path), massing.buildRecord.sha256);
    const buffer = await readFile(new URL(massing.glb.path, root));
    const data = parseGlb(buffer);
    const metrics = inspectGlb(buffer, data);
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
      assert.equal(metrics[key], massing.glb[key], `${massing.status}.${key}`);
    }
    if (massing.glb.bounds) {
      closeArray(metrics.bounds.min, massing.glb.bounds.min);
      closeArray(metrics.bounds.max, massing.glb.bounds.max);
    }
  }

  const v3 = disposition.massingDispositions.currentV3;
  assert.equal(await sha256(v3.generator.path), v3.generator.sha256);
  assert.equal(v3.mcp1, "pass-current-sha-visual-and-structure");
  assert.equal(
    v3.runtimeVisibility.status,
    "pass-exact-v3-load-and-visibility-map-rejected",
  );
  assert.equal(v3.runtimeVisibility.improvementClaimed, false);
});

test("329弄本地 XHS 与官方证据只授权保守 Massing", async () => {
  const disposition = await readJson(dispositionPath);
  const [manifest, inventory, binding] = await Promise.all([
    readJson(disposition.inputs.referenceManifest.path),
    readJson(disposition.inputs.xhsInventory.path),
    readJson(disposition.inputs.memberBinding.path),
  ]);
  assert.equal(manifest.evidenceGate.massingAuthorized, true);
  assert.equal(manifest.evidenceGate.heroAuthorized, false);
  assert.equal(manifest.evidenceGate.identityAuthorized, false);
  assert.equal(inventory.files.length, disposition.evidenceGate.localXhsFiles);
  assert.equal(
    inventory.files.filter(({ visualStatus }) => visualStatus === "usable").length,
    disposition.evidenceGate.usableXhsFiles,
  );
  assert.equal(
    inventory.files.filter(
      ({ visualStatus }) => visualStatus === "needs-review-black-media",
    ).length,
    disposition.evidenceGate.blackMediaNeedsReview,
  );
  for (const file of inventory.files) {
    assert.equal(
      await sha256(`${inventory.localDirectory}/${file.name}`),
      file.sha256,
    );
  }
  assert.deepEqual(
    binding.members.map(({ houseNumber }) => houseNumber),
    disposition.evidenceGate.boundMassingMembers,
  );
  assert.equal(
    binding.excludedCandidates[0].sourceWayId,
    disposition.evidenceGate.excludedWayId,
  );
  assert.equal(disposition.evidenceGate.heroAuthorized, false);
  assert.equal(disposition.evidenceGate.identityAuthorized, false);
});

test("329弄地图门精确保留 member-15 入路 blocker", async () => {
  const disposition = await readJson(dispositionPath);
  const candidate = await readJson(disposition.inputs.massingV3Candidate.path);
  const gate = candidate.mainWindowMapGate;
  assert.equal(gate.status, disposition.mapGate.status);
  assert.equal(
    gate.nearestUnexpandedFootprintToAsphaltEdgeSceneUnits,
    disposition.mapGate.member15UnexpandedFootprintToAsphaltEdgeSceneUnits,
  );
  assert.equal(
    gate.nearestCollisionAabbToAsphaltEdgeSceneUnits,
    disposition.mapGate.member15CollisionAabbToAsphaltEdgeSceneUnits,
  );
  assert.equal(
    gate.minimumRequiredVisibleClearanceSceneUnits,
    disposition.mapGate.minimumRequiredVisibleClearanceSceneUnits,
  );
  assert.ok(disposition.mapGate.member15UnexpandedFootprintToAsphaltEdgeSceneUnits
    < disposition.mapGate.minimumRequiredVisibleClearanceSceneUnits);
  assert.ok(disposition.mapGate.member15CollisionAabbToAsphaltEdgeSceneUnits < 0);
  assert.equal(disposition.mapGate.otherLandmarkObstacleIntersectionCount, 0);
  assert.equal(disposition.mapGate.runtimeCollision, "not-run-because-map-gate-blocked");
});

test("329弄旧 Hero 保留为跨资产 Hold，不能进入 MCP2 或 Identity lineage", async () => {
  const disposition = await readJson(dispositionPath);
  const manifest = await readJson(disposition.inputs.referenceManifest.path);
  const hero = disposition.heroDisposition;
  assert.equal(await sha256(hero.blend.path), hero.blend.sha256);
  assert.equal(await sha256(hero.glb.path), hero.glb.sha256);
  const buffer = await readFile(new URL(hero.glb.path, root));
  const data = parseGlb(buffer);
  const metrics = inspectGlb(buffer, data);
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
  assert.equal(
    manifest.legacyBaseline.heroGlb.evidenceVerdict,
    "retained-cross-asset-contaminated-legacy",
  );
  assert.equal(hero.derivedFromMassingV3, false);
  assert.equal(hero.mcp2Authorized, false);
  assert.equal(hero.mcp2Candidate, false);
  assert.equal(hero.subject, "high-confidence-member-211-2-cross-asset-match");
  assert.ok(hero.scopePollution.includes("trees"));
  assert.equal(disposition.strictLineageGate.status, "blocked");
});

test("329弄不越过地图和 Hero 门派生 Identity，主窗口待办保持证据驱动", async () => {
  const disposition = await readJson(dispositionPath);
  assert.equal(disposition.identityDisposition.status, "not-created-not-authorized");
  assert.equal(disposition.identityDisposition.generatorCreated, false);
  assert.equal(disposition.identityDisposition.blendCreated, false);
  assert.equal(disposition.identityDisposition.glbCreated, false);
  assert.equal(disposition.identityDisposition.buildRecordCreated, false);
  assert.equal(disposition.identityDisposition.previewsCreated, false);
  assert.equal(disposition.gates.mapAcceptance, "blocked");
  assert.equal(disposition.gates.heroMcp2, "not-authorized");
  assert.equal(disposition.gates.identity, "not-authorized");
  assert.equal(disposition.gates.mcp3, "not-reachable");
  assert.equal(disposition.gates.threeJsThreeTier, "not-reachable");
  assert.equal(disposition.gates.overall, "blocked-map-and-hero-lineage");
  assert.ok(disposition.mainWindowActions.every(
    (action) => !/任意移动|任意缩放/u.test(action) || /不得/u.test(action),
  ));
});
