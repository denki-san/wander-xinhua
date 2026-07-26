import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath = "docs/research/shanghai-orchestra-final-gap-audit.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(new URL(relativePath, root)))
    .digest("hex");
}

test("上海民族乐团 Massing/MCP1/Three diagnostic 可保留但不升级为正式地图", async () => {
  const audit = await readJson(auditPath);
  const massing = audit.massing;
  assert.equal(await sha256(massing.blend.path), massing.blend.sha256);
  assert.equal(await sha256(massing.glb.path), massing.glb.sha256);
  assert.equal(massing.mcp1, "pass-shape-only-preserved");
  assert.equal(massing.threeDiagnostic, "pass-load-performance-collision-stop-qa-only-preserved");
  assert.equal(audit.map.roads.asphaltOverlap, false);
  assert.ok(audit.map.roads.xinhuaMinimumAsphaltEdgeClearance > 0);
  assert.ok(audit.map.roads.fahuazhenMinimumAsphaltEdgeClearance > 0);
  assert.equal(audit.map.currentApproach.collisionFree, true);
  assert.equal(audit.map.promotionAllowed, false);
  assert.equal(audit.gates.formalMapAcceptance, "blocked");
});

test("上海民族乐团 membership 缺口禁止复用旧 Hero 并阻断 Identity/MCP3", async () => {
  const audit = await readJson(auditPath);
  const hero = audit.legacyHero;
  assert.equal(audit.evidence.status, "compound-supported-member-binding-missing");
  assert.equal(audit.massing.candidateWayIds.length, 5);
  assert.ok(audit.evidence.blockingUnknowns.includes("buildings-6-7-8-to-five-osm-way-binding"));
  assert.equal(await sha256(hero.blend.path), hero.blend.sha256);
  assert.equal(await sha256(hero.glb.path), hero.glb.sha256);
  assert.equal(hero.status, "hold-not-mcp2-candidate");
  assert.ok(hero.subjectMismatch.includes("not-derived-from-current-five-way-massing"));
  assert.equal(hero.mcp2, "not-entered");
  assert.equal(audit.gates.formalMemberBinding, "blocked");
  assert.equal(audit.gates.heroCandidate, "blocked");
  assert.equal(audit.gates.identity, "blocked");
  assert.equal(audit.gates.mcp3, "not-entered");
  assert.equal(audit.gates.buildingComplete, false);
});
