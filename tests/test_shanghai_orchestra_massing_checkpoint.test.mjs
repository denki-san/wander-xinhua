import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const binding = JSON.parse(fs.readFileSync(
  path.join(ROOT, "docs/research/shanghai-orchestra-osm-binding.json"),
  "utf8",
));
const mapGate = JSON.parse(fs.readFileSync(
  path.join(ROOT, "docs/research/shanghai-orchestra-massing-map-gate.json"),
  "utf8",
));
const buildRecord = JSON.parse(fs.readFileSync(
  path.join(
    ROOT,
    "docs/research/build-records/tiers/xinhua-road/massing-v2/shanghai-orchestra-massing.json",
  ),
  "utf8",
));
const referenceManifest = JSON.parse(fs.readFileSync(
  path.join(ROOT, "docs/research/shanghai-orchestra-reference-manifest.json"),
  "utf8",
));

function sha256(relativePath) {
  return crypto.createHash("sha256")
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest("hex");
}

test("上海民族乐团专项范围只包含五个待归属 OSM 候选", () => {
  assert.equal(binding.assetId, "building:xinhua-road:shanghai-orchestra");
  assert.deepEqual(binding.candidateWayIds, [
    864505166,
    864505168,
    864505165,
    864505169,
    864505163,
  ]);
  assert.equal(binding.candidateWays.length, 5);
  assert.equal(binding.acceptance.formalMembership, "blocked-evidence");
  assert.equal(binding.acceptance.identityAllowed, false);
  assert.ok(binding.candidateWays.every((candidate) => (
    candidate.candidateRole === "unbound-member-candidate"
    && candidate.wgs84Footprint.length >= 4
  )));
});

test("Recovery clean-v2 GLB 保持原 SHA，照片证据也未覆盖", () => {
  assert.equal(
    sha256("public/models/tiers/xinhua-road/massing-v2/shanghai-orchestra-massing.glb"),
    buildRecord.glb.sha256,
  );
  assert.equal(buildRecord.glb.sha256, "63eb25ca4abcbab0e434adb528ea0f37650495c614833f7b9bd05afbc519484c");
  assert.equal(buildRecord.glb.images, 0);
  assert.equal(buildRecord.glb.textures, 0);
  for (const reference of referenceManifest.referencePhotos) {
    assert.equal(sha256(reference.localPath), reference.sha256);
  }
});

test("原始 WGS84 投影与 Recovery 几何误差小于 0.00001 场景单位", () => {
  assert.equal(mapGate.acceptance.sourceProjection, "pass");
  assert.equal(mapGate.acceptance.recoveryGeometryAlignment, "pass");
  assert.ok(mapGate.candidateChecks.every((candidate) => (
    candidate.projectionRoundTripMaxSceneUnits <= 1e-9
    && candidate.recoveryWorldDeltaMaxSceneUnits <= 0.00001
  )));
});

test("候选灰模不压新华路/法华镇路且不与相邻 footprint 相交", () => {
  assert.equal(mapGate.acceptance.asphaltOverlap, "pass");
  assert.equal(mapGate.acceptance.footprintCollision, "pass");
  assert.ok(mapGate.compoundRoadClearance.xinhua.asphaltEdgeSceneUnits > 0);
  assert.ok(mapGate.compoundRoadClearance.fahuazhen.asphaltEdgeSceneUnits > 0);
  assert.deepEqual(mapGate.adjacency.candidatePairIntersections, []);
  assert.deepEqual(mapGate.adjacency.adjacentUnknownIntersections, []);
  assert.ok(mapGate.adjacency.candidatePairMinimumGapSceneUnits > 0);
  assert.ok(mapGate.adjacency.adjacentUnknownMinimumGapSceneUnits > 0);
  assert.equal(mapGate.currentApproach.collisionFree, true);
});

test("地图终审继续阻塞，不能凭坐标候选进入 Identity", () => {
  assert.equal(mapGate.acceptance.formalMembership, "blocked-evidence");
  assert.equal(mapGate.acceptance.mapAcceptance, "blocked-evidence");
  assert.equal(mapGate.acceptance.identityAllowed, false);
  assert.match(mapGate.blocker.reason, /do not map buildings 6, 7, 8/);
  assert.match(mapGate.blocker.nextGate, /MCP1/);
});
