import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(path.join(root, relativePath)))
    .digest("hex");
}

test("Villa Le Bec checkpoint 只继承 runtime pass，不冒充 MCP1 或 map pass", async () => {
  const gate = await readJson("docs/research/villa-le-bec-massing-map-gate.json");
  const record = await readJson(
    "docs/research/build-records/tiers/xinhua-road/massing-v2/villa-le-bec-massing.json",
  );

  assert.equal(gate.assetId, "villa-le-bec");
  assert.equal(gate.scope.buildingOnly, true);
  assert.equal(gate.scope.sharedRuntimeModified, false);
  assert.equal(gate.scope.sharedRegistryModified, false);
  assert.equal(gate.scope.sharedFastManifestModified, false);
  assert.equal(gate.lineage.generationRepeated, false);
  assert.equal(gate.lineage.blenderMcpRepeated, false);
  assert.equal(gate.inheritedGates.runtimeGate.status, "pass");
  assert.equal(gate.inheritedGates.mcp1.status, "pending-main-window-batch");
  assert.equal(gate.inheritedGates.mcp1.performedInThisCheckpoint, false);
  assert.equal(gate.verdict.mapAcceptance, "blocked");
  assert.equal(gate.verdict.runtimePassPromotedToMapPass, false);
  assert.equal(gate.verdict.heroOrIdentityAuthorized, false);

  assert.equal(record.runtimeGate, "pass");
  assert.equal(record.mapAcceptance, "blocked");
  assert.equal(record.mcp1, "pending-main-window-batch");
  assert.equal(record.identityAllowed, false);
  assert.equal(record.mapGateRecord, "docs/research/villa-le-bec-massing-map-gate.json");
});

test("Villa Le Bec Recovery Massing 的 GLB、Blend 与 runtime 截图哈希保持不变", async () => {
  const gate = await readJson("docs/research/villa-le-bec-massing-map-gate.json");
  const glb = gate.lineage.runtimeAsset;
  const blend = gate.lineage.editableSource;

  assert.equal(await sha256(glb.path), glb.sha256);
  assert.equal((await stat(path.join(root, glb.path))).size, glb.bytes);
  assert.equal(await sha256(blend.path), blend.sha256);

  for (const screenshot of [
    gate.inheritedGates.runtimeGate.contextScreenshot,
    gate.inheritedGates.runtimeGate.isolatedScreenshot,
  ]) {
    const contents = await readFile(path.join(root, screenshot.path));
    assert.equal(screenshot.container, "jpeg-with-historical-png-extension");
    assert.equal(contents.subarray(0, 3).toString("hex"), "ffd8ff");
    assert.equal(contents.length, screenshot.bytes);
    assert.equal(await sha256(screenshot.path), screenshot.sha256);
  }
});

test("Villa Le Bec 六张候选证据审计保留拒绝项并锁定 footprint blocker", async () => {
  const gate = await readJson("docs/research/villa-le-bec-massing-map-gate.json");
  const audit = gate.candidateEvidenceAudit;

  assert.equal(audit.candidateCount, 6);
  assert.equal(audit.candidates.length, 6);
  assert.equal(audit.candidates.filter(({ accepted }) => accepted).length, 2);
  assert.equal(audit.candidates.filter(({ accepted }) => !accepted).length, 4);
  assert.equal(audit.coverageMatrix.sameBuildingSideDepth, "missing");
  assert.equal(audit.coverageMatrix.sameBuildingRear, "missing");
  assert.equal(audit.coverageMatrix.mainVillaToFormerGarageFootprintBinding, "missing");

  for (const candidate of audit.candidates) {
    assert.equal(await sha256(candidate.path), candidate.sha256);
  }
  assert.equal(
    await sha256(audit.supportingLegacyReferenceOutsideCandidateSet.path),
    audit.supportingLegacyReferenceOutsideCandidateSet.sha256,
  );

  assert.equal(gate.mapCalibration.candidateOsmWays.length, 5);
  assert.ok(
    gate.mapCalibration.candidateOsmWays.every(
      ({ candidateRole }) => candidateRole === "unbound-member-candidate",
    ),
  );
  assert.equal(
    gate.mapCalibration.existingSharedReplacementEvidence.acceptedAsRoleBinding,
    false,
  );
});
