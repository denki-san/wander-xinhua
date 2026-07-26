import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = new URL("../", import.meta.url);
const rootPath = fileURLToPath(root);
const auditPath = "docs/research/debi-fahua-525-evidence-gate-v2-audit.json";

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

test("德必 evidence gate 锁定基线输入且没有越权修改运行时或 Recovery", async () => {
  const audit = await json(auditPath);
  assert.equal(audit.baseCommit, "04aff4831849da2708b8ace6597991eb8db73faa");
  assert.equal(audit.scope.assetOnly, "debi-fahua-525");
  assert.equal(audit.scope.browserOrXhsOpened, false);
  assert.equal(audit.scope.networkEvidenceFetched, false);
  assert.equal(audit.scope.blenderOpened, false);
  assert.equal(audit.scope.generatorExecuted, false);
  assert.equal(audit.scope.modelOrBinaryGenerated, false);
  assert.equal(audit.scope.publicResolverOrRegistryModified, false);
  assert.equal(audit.scope.recoveryOrHoldModified, false);
  assert.equal(audit.scope.treesDecorationsFullMapOrOtherBuildingsModified, false);

  for (const source of audit.sources.currentFiles) {
    assert.equal(sha256(await bytes(source.path)), source.sha256, source.path);
  }
});

test("manifest 的三张正式参考图与视觉证据边界保持可追溯", async () => {
  const [audit, manifest] = await Promise.all([
    json(auditPath),
    json("docs/research/poi-reference-manifest.json"),
  ]);
  const entry = manifest.pois.find(({ id }) => id === "debi-fahua-525");
  assert.ok(entry);
  assert.equal(
    entry.referencePhotos.length,
    audit.sources.manifestFormalReferenceCount,
  );

  const manifestPaths = new Set(entry.referencePhotos.map(({ path }) => path));
  for (const reference of audit.sources.formalLocalReferences) {
    assert.ok(manifestPaths.has(reference.path), reference.path);
    assert.equal(sha256(await bytes(reference.path)), reference.sha256);
    assert.ok(reference.width > 1000);
    assert.ok(reference.height > 800);
  }

  assert.match(
    audit.referenceEvidenceMatrix.front.unknown.join(" "),
    /Which OSM way/u,
  );
  assert.match(
    audit.referenceEvidenceMatrix.courtyard.unknown.join(" "),
    /courtyard polygon/u,
  );
  assert.equal(
    audit.compoundAndCourtyardAdjudication.uniqueLocalAdjudicationAvailable,
    false,
  );
  assert.equal(
    audit.briefAndManifestAdjudication.manifestPhotoStatus,
    entry.photoStatus,
  );
  assert.match(
    audit.briefAndManifestAdjudication.manifestBoundary,
    /does not identify/u,
  );
  assert.equal(
    audit.briefAndManifestAdjudication.briefClaimStatus,
    "superseded-for-formal-map-acceptance",
  );
});

test("Recovery clean-v2 是只读保留的五体块候选而不是已确认 compound", async () => {
  const audit = await json(auditPath);
  const recovery = audit.recoveryCleanV2;
  const glb = gitBytes(recovery.commit, recovery.glbPathAtCommit);
  const record = gitBytes(recovery.commit, recovery.recordPathAtCommit);

  assert.equal(
    gitBlob(recovery.commit, recovery.glbPathAtCommit),
    recovery.glbGitBlob,
  );
  assert.equal(
    gitBlob(recovery.commit, recovery.recordPathAtCommit),
    recovery.recordGitBlob,
  );
  assert.equal(sha256(glb), recovery.glbSha256);
  assert.equal(sha256(record), recovery.recordSha256);

  const expectedMetrics = {
    bytes: recovery.metrics.bytes,
    nodes: recovery.metrics.nodes,
    meshes: recovery.metrics.meshes,
    triangles: recovery.metrics.triangles,
    materials: recovery.metrics.materials,
    images: recovery.metrics.images,
  };
  assert.deepEqual(inspectGlb(glb), expectedMetrics);
  assert.equal(
    audit.compoundAndCourtyardAdjudication.recoveryCleanV2MemberCandidates.length,
    5,
  );
  assert.equal(
    audit.compoundAndCourtyardAdjudication.singleRepresentativeAndFiveMemberInterpretationsEquivalent,
    false,
  );
  assert.match(recovery.policy, /do-not-rebuild/u);
  assert.equal(recovery.formalMapStatus, "blocked-membership-and-fahuazhen-road-overlap");
});

test("精确道路与邻楼距离证明地图门仍阻塞且无共享道路改窄授权", async () => {
  const audit = await json(auditPath);
  const map = audit.exactMapAdjudication;
  const road = map.fahuazhenRoad;
  const boundary = map.roadWidthBoundary;

  assert.equal(
    road.exactFootprintCenterlineDistanceSceneUnits
      - road.runtimeFullWidthSceneUnits / 2,
    road.asphaltClearanceSceneUnits,
  );
  assert.ok(road.asphaltClearanceSceneUnits < 0);
  assert.ok(map.dingxiRoad.asphaltClearanceSceneUnits > 0);
  assert.ok(map.nearestBuilding.gapAfterBothPointTwoMarginsSceneUnits > 0);
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
  assert.equal(boundary.roadWidthChangeAuthorized, false);
});

test("当前 legacy Hero 仍被 registry 激活，因此只建议主窗口临时禁用并保留文件", async () => {
  const [audit, registry] = await Promise.all([
    json(auditPath),
    json("app/scene/xinhua-road-landmarks-data.json"),
  ]);
  const runtime = audit.currentRuntimeSurface;
  const entry = registry.landmarks.find(({ id }) => id === "debi-fahua-525");
  assert.ok(entry);
  assert.equal(entry.model, runtime.modelPath);
  assert.deepEqual(entry.position, runtime.position);
  assert.equal(entry.yaw, runtime.yaw);
  assert.equal(entry.scale, runtime.scale);
  assert.deepEqual(entry.localBounds, runtime.localBounds);
  assert.equal(entry.localObstacles.length, runtime.localObstacleCount);
  assert.equal(entry.positioning, runtime.positioning);
  assert.equal(runtime.registryEntryActive, true);

  const hero = runtime.legacyHero;
  const heroBuffer = await bytes(hero.path);
  assert.equal(sha256(heroBuffer), hero.sha256);
  for (const [key, value] of Object.entries(inspectGlb(heroBuffer))) {
    assert.equal(value, hero[key], key);
  }
  assert.equal(hero.scopePolluted, true);
  assert.equal(hero.derivedFromAcceptedMassing, false);

  const disposition = audit.disposition;
  assert.equal(disposition.formalModelGenerated, false);
  assert.equal(disposition.isolatedCandidateGenerated, false);
  assert.equal(disposition.recoveryCleanV2Retained, true);
  assert.equal(disposition.legacyFilesRetained, true);
  assert.equal(disposition.sharedRuntimeChangeApplied, false);
  assert.equal(
    disposition.mainWindowRecommendation,
    "temporarily-disable-runtime-instance-retain-files",
  );
});
