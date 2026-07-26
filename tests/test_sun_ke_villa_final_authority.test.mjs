import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import {
  SUN_KE_PORTE_COCHERE_COLUMN_OBSTACLES,
} from "../app/scene/sun-ke-villa-tier-contract.mjs";

const root = new URL("../", import.meta.url);
const auditPath = "docs/research/sun-ke-villa-final-authority-audit.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

async function inspectGlb(path) {
  const buffer = await readFile(new URL(path, root));
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(
    buffer.subarray(20, 20 + jsonLength).toString("utf8").trim(),
  );
  let triangles = 0;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      const accessor = primitive.indices === undefined
        ? json.accessors[primitive.attributes.POSITION]
        : json.accessors[primitive.indices];
      triangles += accessor.count / 3;
    }
  }
  return {
    buffer,
    json,
    metrics: {
      bytes: buffer.length,
      triangles,
      nodes: json.nodes?.length ?? 0,
      meshes: json.meshes?.length ?? 0,
      materials: json.materials?.length ?? 0,
      images: json.images?.length ?? 0,
      textures: json.textures?.length ?? 0,
    },
  };
}

test("孙科最终审计只固定本栋权威输入且未重做既有门", async () => {
  const audit = await readJson(auditPath);
  assert.equal(
    audit.baseCommit,
    "d2c0f23ef05098563d9ed81fba3eac8bf706c978",
  );
  assert.equal(audit.scope.binaryRebuilt, false);
  assert.equal(audit.scope.qualifiedGateRerun, false);
  assert.equal(audit.scope.browserOrXhsAccessed, false);
  assert.equal(audit.scope.sharedFilesModified, false);
  assert.equal(audit.scope.legacyCandidateOverwrittenOrDeleted, false);
  for (const input of Object.values(audit.inputs)) {
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  for (const record of audit.recordPrecedence.filter(({ sha256: hash }) => hash)) {
    assert.equal(await sha256(record.path), record.sha256, record.path);
  }
});

test("当前 public 三档与 build record、Blend 和 generator 精确一致", async () => {
  const audit = await readJson(auditPath);
  for (const [tierName, tier] of Object.entries(audit.authoritativeTiers)) {
    for (const artifact of [tier.generator, tier.blend, tier.glb, tier.buildRecord]) {
      assert.equal(await sha256(artifact.path), artifact.sha256, artifact.path);
      if (artifact.bytes !== undefined) {
        assert.equal((await stat(new URL(artifact.path, root))).size, artifact.bytes);
      }
    }
    const { metrics } = await inspectGlb(tier.glb.path);
    for (const key of [
      "bytes",
      "triangles",
      "nodes",
      "meshes",
      "materials",
      "images",
      "textures",
    ]) {
      assert.equal(metrics[key], tier.glb[key], `${tierName}.${key}`);
    }
  }
});

test("Hero 到 Identity 是严格血统，Massing 保持独立证据来源", async () => {
  const audit = await readJson(auditPath);
  const heroRecord = await readJson(audit.authoritativeTiers.hero.buildRecord.path);
  const identityRecord = await readJson(
    audit.authoritativeTiers.identity.buildRecord.path,
  );
  const massingRecord = await readJson(
    audit.authoritativeTiers.massing.buildRecord.path,
  );
  const identityGlb = await inspectGlb(audit.authoritativeTiers.identity.glb.path);

  assert.equal(heroRecord.lineageId, audit.authoritativeTiers.hero.lineageId);
  assert.equal(
    identityRecord.derivedFrom.heroLineageId,
    audit.authoritativeTiers.hero.lineageId,
  );
  assert.equal(
    identityRecord.derivedFrom.heroGlbSha256,
    audit.authoritativeTiers.hero.glb.sha256,
  );
  assert.equal(
    identityRecord.derivedFrom.heroBlendSha256,
    audit.authoritativeTiers.hero.blend.sha256,
  );
  assert.equal(
    identityGlb.json.nodes[0].extras.source_lineage_id,
    audit.authoritativeTiers.hero.lineageId,
  );
  assert.equal(massingRecord.identityAllowed, false);
  assert.equal(
    audit.strictTierLineage.identityToMassing,
    "not-a-derivation-edge",
  );
  assert.ok(
    audit.authoritativeTiers.hero.glb.triangles
      > audit.authoritativeTiers.identity.glb.triangles,
  );
  assert.ok(
    audit.authoritativeTiers.identity.glb.triangles
      > audit.authoritativeTiers.massing.glb.triangles,
  );
});

test("MCP v2、地图和开放门廊车道仍绑定当前三档", async () => {
  const audit = await readJson(auditPath);
  const mcp = await readJson(audit.mcpAndMap.mcpRecord);
  const map = await readJson(audit.mcpAndMap.mapRecord);
  assert.equal(mcp.status, "pass");
  assert.equal(
    mcp.heroGate.glbSha256,
    audit.authoritativeTiers.hero.glb.sha256,
  );
  assert.equal(
    mcp.identityGate.glbSha256,
    audit.authoritativeTiers.identity.glb.sha256,
  );
  assert.equal(
    mcp.massingGate.glbSha256,
    audit.authoritativeTiers.massing.glb.sha256,
  );
  assert.equal(map.acceptance.final, "pass");
  assert.equal(map.collisionEvidence.porteCochereFrontColumnsBlock, true);
  assert.equal(map.collisionEvidence.porteCochereCoveredLaneRemainsOpen, true);
  assert.deepEqual(
    SUN_KE_PORTE_COCHERE_COLUMN_OBSTACLES,
    audit.mcpAndMap.frontColumnObstacles,
  );
  const [left, right] = audit.mcpAndMap.frontColumnObstacles;
  assert.ok(
    Math.abs(
      (right.minX - left.maxX)
        - audit.mcpAndMap.coveredLaneClearWidthSceneUnits,
    ) < 1e-9,
  );
});

test("Three.js v3 是 public runtime 与 fallback 的当前权威", async () => {
  const audit = await readJson(auditPath);
  const runtime = await readJson(audit.runtimeAuthority.record);
  const tierSource = await readFile(
    new URL(audit.inputs.runtimeTierSource.path, root),
    "utf8",
  );
  assert.equal(runtime.version, 3);
  assert.equal(runtime.acceptance.final, "pass");
  assert.equal(runtime.acceptance.identityToProgrammaticFallback, "pass-after-v3-fix");
  for (const [tierName, tier] of Object.entries(audit.authoritativeTiers)) {
    assert.equal(runtime.tierArtifacts[tierName].sha256, tier.glb.sha256);
    assert.equal(runtime.tierArtifacts[tierName].contentLength, tier.glb.bytes);
    assert.match(
      tierSource,
      new RegExp(`${tier.glb.sha256.slice(0, 12)}`),
      `${tierName} runtime cache URL`,
    );
  }
  assert.match(
    runtime.reason,
    /程序化降级暴露旧大体块误判，修复后复验通过/u,
  );
  assert.deepEqual(audit.runtimeAuthority.v2SupersededEvidence, [
    "identity-to-programmatic visual verdict before integrated fallback fix",
  ]);
});

test("较重旧候选只保留在历史，不得恢复成 public 权威", async () => {
  const audit = await readJson(auditPath);
  assert.equal(
    audit.historicalCandidate.commit,
    "50bb0e046daadb6ff83b868cf2deba10ea2c6d62",
  );
  assert.equal(
    audit.historicalCandidate.status,
    "retained-in-git-history-not-public-runtime-authority",
  );
  for (const [tierName, candidate] of Object.entries(
    audit.historicalCandidate.tiers,
  )) {
    assert.notEqual(
      candidate.sha256,
      audit.authoritativeTiers[tierName].glb.sha256,
    );
  }
  assert.equal(audit.gates.overall, "formal-pass");
  assert.match(audit.mainWindowAction, /不得重跑已合格门/u);
});
