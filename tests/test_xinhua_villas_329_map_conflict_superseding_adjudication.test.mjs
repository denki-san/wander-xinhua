import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const finalPath = "docs/research/xinhua-villas-329-final-disposition.json";
const candidatePath = "docs/research/xinhua-villas-329-map-candidate.json";
const runtimePath = "docs/research/xinhua-villas-329-threejs-runtime-qa-v2.json";
const candidateCommit = "2e2ec14";
const integrationCommit = "833bb8a";

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function readCommitJson(commit, relativePath) {
  return JSON.parse(git("show", `${commit}:${relativePath}`));
}

test("329弄旧 final disposition 在候选、集成与当前树中是同一陈旧 blob", () => {
  const candidateBlob = git("rev-parse", `${candidateCommit}:${finalPath}`);
  const integrationBlob = git("rev-parse", `${integrationCommit}:${finalPath}`);
  const currentBlob = git("rev-parse", `HEAD:${finalPath}`);
  assert.equal(candidateBlob, integrationBlob);
  assert.equal(integrationBlob, currentBlob);

  const stale = readCommitJson(integrationCommit, finalPath);
  assert.equal(stale.mapGate.member15CollisionAabbToAsphaltEdgeSceneUnits, -0.138921);
  assert.equal(stale.mapGate.runtimeCollision, "not-run-because-map-gate-blocked");
  assert.equal(stale.gates.mapAcceptance, "blocked");
});

test("833bb8a 以未变 Massing 二进制、strip proxy 与真实 telemetry 解除 map blocker", () => {
  const candidate = readCommitJson(integrationCommit, candidatePath);
  const runtime = readCommitJson(integrationCommit, runtimePath);
  const candidateBlob = git("rev-parse", `${candidateCommit}:${candidatePath}`);
  const integrationBlob = git("rev-parse", `${integrationCommit}:${candidatePath}`);

  assert.equal(candidateBlob, integrationBlob);
  assert.equal(candidate.blockerCorrection.priorReportedMember, "15");
  assert.equal(candidate.blockerCorrection.recomputedActualMember, "42");
  assert.equal(candidate.blockerCorrection.member15CollisionAabbToAsphaltEdgeSceneUnits, 10.316885);
  assert.equal(candidate.blockerCorrection.member42SingleCollisionAabbToAsphaltEdgeSceneUnits, -0.138921);
  assert.equal(candidate.candidateMethod.localUnionEqualsOriginalAabb, true);
  assert.deepEqual(candidate.candidateMethod.stripCountByMember, {
    15: 1, 36: 1, 40: 6, 42: 6,
  });
  assert.equal(candidate.roadClearanceSceneUnits.proposedCollisionAabbToAsphaltEdgeAfterMargin.minimum, 0.848155);
  assert.equal(candidate.neighborClearanceSceneUnits.proposedWorldCollisionAabbsAfterMargin.minimum, 0.174798);

  assert.equal(runtime.status, "pass-massing-map-and-runtime");
  assert.equal(runtime.inputs.modelSha256, candidate.inputs.massingGlb.sha256);
  assert.deepEqual(runtime.inputs.placement.position, candidate.placement.position);
  assert.equal(runtime.inputs.placement.yaw, candidate.placement.yaw);
  assert.equal(runtime.inputs.placement.scale, candidate.placement.scale);
  assert.equal(runtime.runtime.frameSample.frames, 120);
  assert.equal(runtime.runtime.consoleErrors, 0);
  assert.equal(runtime.collision.verdict, "pass-hard-collision-before-interior-target");
  assert.equal(runtime.map.formalMassingAcceptance, "pass");
});

test("833bb8a 的 Massing pass 不越权解除 Hero、Identity 与 MCP2/3 blocker", () => {
  const runtime = readCommitJson(integrationCommit, runtimePath);
  assert.equal(runtime.scope.hero, "blocked-invalid-cross-asset-lineage");
  assert.equal(runtime.scope.identity, "missing");
  assert.equal(runtime.scope.buildingComplete, false);
  assert.equal(runtime.scope.holdAssetsModified, false);
});
