import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath = "docs/research/xingfuli-west-fast-audit.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(new URL(relativePath, root)))
    .digest("hex");
}

test("Xingfuli West 三档二进制可保留，但严格 lineage 尚未被历史记录证明", async () => {
  const [audit, hero, identity, massing] = await Promise.all([
    readJson(auditPath),
    readJson("docs/research/build-records/xingfuli.json"),
    readJson("docs/research/build-records/xingfuli-identity.json"),
    readJson("docs/research/build-records/xingfuli-massing.json"),
  ]);

  const records = { hero, identity, massing };
  for (const [tierName, tier] of Object.entries(audit.tiers)) {
    const output = records[tierName].outputs.segments.find(
      ({ id }) => id === "west",
    );
    assert.equal(await sha256(tier.glb), tier.glbSha256);
    assert.equal(output.sha256, tier.glbSha256);
    assert.equal(output.blend, tier.blend);
  }

  assert.ok(Date.parse(massing.generatedAt) < Date.parse(identity.generatedAt));
  assert.ok(Date.parse(identity.generatedAt) < Date.parse(hero.generatedAt));
  assert.equal(JSON.stringify(identity).includes("derivedFrom"), false);
  assert.equal(JSON.stringify(massing).includes("derivedFrom"), false);
  assert.equal(audit.lineage.status, "blocked-formal-lineage-proof");
  assert.equal(audit.lineage.formalDerivedFromHeroField, "historical-record-missing-not-invented");
  assert.deepEqual(
    audit.lineage.historicalBuildOrder.map(({ tier }) => tier),
    ["massing", "identity", "hero"],
  );
  assert.equal(audit.lineage.strictVerdict.existingBinariesRetained, true);
  assert.equal(audit.lineage.strictVerdict.formalHeroToIdentityProof, false);
  assert.equal(audit.lineage.strictVerdict.formalHeroToMassingProof, false);
  assert.equal(audit.lineage.strictVerdict.formalIdentityToMassingProof, false);
  assert.equal(audit.lineage.strictVerdict.assetQualityFailure, false);
  assert.equal(audit.lineage.strictVerdict.rebuildAuthorized, false);
  assert.equal(audit.roadGate.verdict.assetRebuildAuthorized, false);
});

test("Xingfuli West 西/中净距不是道路负净距的修复证据", async () => {
  const audit = await readJson(auditPath);
  const pairs = audit.segmentAndNeighborCollision.neighborPairs;
  assert.deepEqual(
    pairs.map(({ west, center }) => [west, center]),
    [
      ["north-west", "north-inner-west"],
      ["south-west", "south-inner-west"],
    ],
  );
  for (const pair of pairs) {
    assert.ok(pair.localStructuralGap > 0);
    assert.ok(pair.worldStructuralGap > 0);
    assert.ok(pair.worldStructuralGap < audit.segmentAndNeighborCollision.playerDiameterWorld);
  }

  const authored = audit.roadGate.currentAuthoredCollisionFootprints;
  assert.equal(authored.length, 2);
  assert.ok(authored.every(({ asphaltEdgeClearanceScene }) => asphaltEdgeClearanceScene < 0));
  assert.ok(audit.roadGate.sourceOsmComparison.every(
    ({ asphaltEdgeClearanceScene }) => asphaltEdgeClearanceScene > 0,
  ));
  assert.equal(audit.roadGate.verdict.mapGatePass, false);
  assert.equal(audit.roadGate.verdict.globalTranslationAuthorized, false);
  assert.equal(audit.roadGate.verdict.uniformOrNonUniformScaleHackAuthorized, false);
  assert.equal(audit.gates.map, "blocked-road-clearance");
  assert.equal(audit.gates.lineage, "blocked-formal-lineage-proof");
});
