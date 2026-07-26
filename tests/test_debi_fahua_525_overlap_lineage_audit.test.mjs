import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = new URL("../", import.meta.url);
const rootPath = fileURLToPath(root);
const auditPath =
  "docs/research/debi-fahua-525-overlap-lineage-audit.json";

async function bytes(path) {
  return readFile(new URL(path, root));
}

async function json(path) {
  return JSON.parse((await bytes(path)).toString("utf8"));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function gitBytes(commit, path) {
  return execFileSync("git", ["show", `${commit}:${path}`], {
    cwd: rootPath,
    maxBuffer: 16 * 1024 * 1024,
  });
}

function gitBlob(commit, path) {
  return execFileSync("git", ["rev-parse", `${commit}:${path}`], {
    cwd: rootPath,
    encoding: "utf8",
  }).trim();
}

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
}

function inspectGlb(buffer) {
  const glb = parseGlb(buffer);
  const triangles = (glb.meshes ?? []).flatMap(({ primitives }) => primitives)
    .reduce((sum, primitive) => {
      const accessor = primitive.indices === undefined
        ? glb.accessors[primitive.attributes.POSITION]
        : glb.accessors[primitive.indices];
      return sum + accessor.count / 3;
    }, 0);
  return {
    bytes: buffer.length,
    nodes: glb.nodes?.length ?? 0,
    meshes: glb.meshes?.length ?? 0,
    triangles,
    materials: glb.materials?.length ?? 0,
    images: glb.images?.length ?? 0,
  };
}

test("德必 overlap/lineage 审计锁定当前集成输入且没有越权改公共表面", async () => {
  const audit = await json(auditPath);
  assert.equal(
    audit.baseCommit,
    "e1a2611b5bf8127cea8f229da0a89c12cfd1e4d0",
  );
  for (const source of audit.sources.currentFiles) {
    assert.equal(sha256(await bytes(source.path)), source.sha256, source.path);
  }
  assert.equal(audit.scope.assetOnly, "debi-fahua-525");
  assert.equal(audit.scope.browserNetworkOrXhsAccessed, false);
  assert.equal(audit.scope.modelBinaryRebuilt, false);
  assert.equal(audit.scope.heroModified, false);
  assert.equal(audit.scope.sharedRuntimeRegistryFastOrExactModified, false);
  assert.equal(audit.scope.candidateCollisionProxyProduced, false);
});

test("代表 way 只有 building=yes，法华镇路没有 width/lanes 授权改窄", async () => {
  const [audit, buildings, roads, map] = await Promise.all([
    json(auditPath),
    json("docs/research/data/xinhua-buildings-osm-20260725-074802.json"),
    json("docs/research/data/xinhua-roads-osm-20260716-080509.json"),
    json("app/scene/xinhua-map-data.json"),
  ]);
  const building = buildings.elements.find(
    ({ type, id }) => type === "way" && id === audit.membership.representativeWayId,
  );
  const road = roads.elements.find(
    ({ type, id }) => type === "way"
      && id === audit.footprintAndRoad.fahuazhenRoad.osmWayId,
  );

  assert.deepEqual(building.tags, { building: "yes" });
  assert.equal(Object.hasOwn(building.tags, "name"), false);
  assert.equal(Object.hasOwn(building.tags, "addr:housenumber"), false);
  assert.equal(Object.hasOwn(building.tags, "building:levels"), false);
  assert.equal(road.tags.highway, "tertiary");
  assert.equal(road.tags.surface, "asphalt");
  assert.equal(road.tags.maxspeed, "30");
  assert.equal(Object.hasOwn(road.tags, "width"), false);
  assert.equal(Object.hasOwn(road.tags, "lanes"), false);
  assert.equal(
    1.45 * map.meta.environmentScale,
    audit.footprintAndRoad.fahuazhenRoad.runtimeFullWidthSceneUnits,
  );
  assert.equal(audit.membership.primaryMembershipProofAvailable, false);
});

test("精确 footprint 顶点已进入法华镇路面，完整覆盖 proxy 无法修复", async () => {
  const [audit, mapCandidate] = await Promise.all([
    json(auditPath),
    json("docs/research/debi-fahua-525-map-candidate.json"),
  ]);
  const road = audit.footprintAndRoad.fahuazhenRoad;
  const nearestVertex = audit.footprintAndRoad.nearestFahuazhenFootprintVertex;
  assert.ok(mapCandidate.exactFootprint.worldVertices.some(
    ([x, z]) => x === nearestVertex[0] && z === nearestVertex[1],
  ));
  assert.equal(
    road.exactFootprintCenterlineDistanceSceneUnits
      - road.runtimeHalfWidthSceneUnits,
    road.asphaltClearanceSceneUnits,
  );
  assert.ok(road.asphaltClearanceSceneUnits < 0);
  assert.ok(audit.footprintAndRoad.dingxiRoad.asphaltClearanceSceneUnits > 0);
  assert.equal(
    audit.proxyAdjudication.singleRotatedLocalAabb.dingxiResult,
    "false-positive-overlap",
  );
  assert.equal(
    audit.proxyAdjudication.completeCoverSplitShell.canRemoveFahuazhenOverlap,
    false,
  );
  assert.equal(
    audit.verdict.collisionProxyCandidate,
    "not-produced-no-legal-complete-cover-road-pass",
  );
});

test("道路宽度阈值是 blocker 数值，不是共享道路改窄授权", async () => {
  const audit = await json(auditPath);
  const road = audit.footprintAndRoad.fahuazhenRoad;
  const boundary = audit.roadWidthEvidenceBoundary;
  assert.equal(
    2 * road.exactFootprintCenterlineDistanceSceneUnits,
    boundary.maximumNonOverlappingFullWidthSceneUnits,
  );
  assert.equal(
    road.runtimeFullWidthSceneUnits
      - boundary.maximumNonOverlappingFullWidthSceneUnits,
    boundary.requiredReductionFromCurrentSceneUnits,
  );
  assert.ok(boundary.requiredReductionFromCurrentPercent > 17);
  assert.ok(boundary.requiredReductionWithMarginPercent > 22);
  assert.match(boundary.interpretation, /not authority/u);
});

test("Recovery v2 与孤立 v3 是替代 Massing 候选，不构成正式三档 lineage", async () => {
  const audit = await json(auditPath);
  for (const candidate of [
    audit.tierLineage.recoveryMassingV2,
    audit.tierLineage.isolatedMassingV3,
  ]) {
    const glb = gitBytes(candidate.commit, candidate.glbPathAtCommit);
    const record = gitBytes(candidate.commit, candidate.recordPathAtCommit);
    assert.equal(gitBlob(candidate.commit, candidate.glbPathAtCommit), candidate.glbGitBlob);
    assert.equal(gitBlob(candidate.commit, candidate.recordPathAtCommit), candidate.recordGitBlob);
    assert.equal(sha256(glb), candidate.glbSha256);
    assert.equal(sha256(record), candidate.recordSha256);
    assert.deepEqual(inspectGlb(glb), candidate.metrics);
    assert.equal(candidate.acceptedMassingSource, false);
  }

  const strict = audit.tierLineage.strictGate;
  assert.equal(strict.recoveryAndV3AreAlternativeMassingCandidatesNotRuntimeTiers, true);
  assert.equal(strict.acceptedMassingExists, false);
  assert.equal(strict.heroDerivedFromAcceptedMassing, false);
  assert.equal(strict.identityDerivedFromHeroSha, false);
  assert.equal(strict.threeTierOriginPlacementCollisionLineageProven, false);
  assert.equal(strict.status, "blocked-road-membership-and-lineage");
});

test("当前 legacy Hero 容器通过不等于纯建筑 lineage 通过", async () => {
  const audit = await json(auditPath);
  const hero = audit.tierLineage.currentIntegrationSurface.legacyHero;
  const heroBuffer = await bytes(hero.path);
  assert.equal(sha256(heroBuffer), hero.sha256);
  for (const [key, value] of Object.entries(inspectGlb(heroBuffer))) {
    assert.equal(value, hero[key], key);
  }
  assert.equal(hero.assetLevelBuildRecordPresent, false);
  assert.equal(hero.derivedFromAcceptedMassing, false);
  assert.equal(hero.scopePolluted, true);
  assert.ok(hero.pollution.includes("bamboo clusters"));
  assert.equal(
    audit.tierLineage.currentIntegrationSurface.identityTierBinaryPresent,
    false,
  );
  assert.equal(
    audit.verdict.hero,
    "blocked-legacy-scope-polluted-and-no-accepted-massing-parent",
  );
  assert.equal(audit.verdict.identity, "blocked-missing-and-not-authorized");
});
