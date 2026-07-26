import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath = "docs/research/fics-xinhua-365-public-primary-source-rescue-2026-07-26.json";
const sourcePath = "docs/knowledge-sources/fics-xinhua-365-public-primary-source-rescue-2026-07-26.md";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

function inspectGlb(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  const glb = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
  let primitives = 0;
  let triangles = 0;
  for (const mesh of glb.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      primitives += 1;
      triangles += glb.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3;
    }
  }
  return { nodes: glb.nodes?.length ?? 0, meshes: glb.meshes?.length ?? 0, primitives, triangles, images: glb.images?.length ?? 0, textures: glb.textures?.length ?? 0 };
}

test("FICS public primary-source rescue 只锁定可复核官方来源与只读范围", async () => {
  const audit = await readJson(auditPath);
  assert.equal(audit.status, "primary-public-context-pass-formal-membership-and-surface-still-blocked");
  assert.equal(audit.sources.length, 4);
  for (const source of audit.sources) {
    assert.match(source.url, /^https:\/\/(www\.)?(shcn\.gov\.cn|hzjl\.sh\.gov\.cn|whlyj\.sh\.gov\.cn)\//u);
    assert.equal(source.type.startsWith("official-government"), true);
  }
  for (const input of Object.values(audit.existingInputs)) {
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  assert.equal(audit.scope.xiaohongshuAccessed, false);
  assert.equal(audit.scope.userBrowserAccessed, false);
  assert.equal(audit.scope.recoveryStageRerun, false);
  assert.equal(audit.scope.publicRegistryModified, false);
});

test("FICS 官方公开语境不冒充成员表或内部道路地表证据", async () => {
  const audit = await readJson(auditPath);
  const [surface, membership] = await Promise.all([
    readJson(audit.existingInputs.mapSurfaceAudit.path),
    readJson(audit.existingInputs.membershipBlocker.path),
  ]);
  assert.deepEqual(audit.unknown[0], "Formal membership of candidate ways 864493178, 864493177, 864493179, 864493181, and 864493230.");
  assert.equal(surface.membership.formalBinding, "blocked-no-primary-cadastral-or-georeferenced-member-binding");
  assert.equal(surface.serviceRoadSemantics.osmWayId, 577252268);
  assert.equal(surface.exactGeometry.closestPair.candidateWayId, 864493177);
  assert.equal(membership.verdict.formalMapAcceptance, "blocked");
  assert.equal(audit.blockerDecision.formalMemberBinding, "unchanged-blocked");
  assert.equal(audit.blockerDecision.serviceSurfaceSemantics, "unchanged-blocked");
  assert.equal(audit.blockerDecision.heroAndIdentity, "unchanged-blocked");
});

test("FICS 保留 Massing 二进制，不因公开语境重跑或升格", async () => {
  const audit = await readJson(auditPath);
  const glb = await readFile(new URL(audit.existingInputs.massingGlb.path, root));
  const metrics = inspectGlb(glb);
  assert.equal(metrics.images, 0);
  assert.equal(metrics.textures, 0);
  assert.ok(metrics.nodes > 0);
  assert.ok(metrics.primitives > 0);
  assert.match(audit.blockerDecision.recoveryMassing, /preserved-not-rerun/u);
  assert.equal(audit.minimumAdditionalEvidence.length, 2);
  const sourceText = await readFile(new URL(sourcePath, root), "utf8");
  for (const source of audit.sources) assert.match(sourceText, new RegExp(source.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "u"));
});
