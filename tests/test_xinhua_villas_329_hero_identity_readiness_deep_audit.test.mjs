import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const rootPath = decodeURIComponent(root.pathname);
const auditPath =
  "docs/research/xinhua-villas-329-hero-identity-readiness-deep-audit.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function gitBuffer(commit, path) {
  return execFileSync("git", ["show", `${commit}:${path}`], {
    cwd: rootPath,
    encoding: null,
    maxBuffer: 8 * 1024 * 1024,
  });
}

async function pathExists(path) {
  try {
    await access(new URL(path, root), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(path) {
  const directory = new URL(`${path}/`, root);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = `${path}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...await listFiles(relativePath));
    } else {
      files.push(relativePath);
    }
  }
  return files;
}

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
}

function inspectGlb(buffer, data) {
  let triangles = 0;
  let primitives = 0;
  for (const mesh of data.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      primitives += 1;
      const accessor = data.accessors[
        primitive.indices ?? primitive.attributes.POSITION
      ];
      triangles += accessor.count / 3;
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
  };
}

test("329 readiness 深审锁定指定集成基线、输入 SHA 与只读范围", async () => {
  const audit = await readJson(auditPath);
  assert.equal(
    audit.baseline.requestedStableCommit,
    "ebae8d865a15761f32d890959499911acf8b092d",
  );
  assert.equal(
    audit.baseline.worktreeBaseCommit,
    "ebae8d865a15761f32d890959499911acf8b092d",
  );
  assert.equal(audit.baseline.uncommittedMainChangesAbsorbed, false);
  const immutableKeys = new Set(
    audit.sourceShaPolicy.currentFileImmutable,
  );
  const baselineKeys = new Set(
    audit.sourceShaPolicy.baselineCommitBlobSnapshot,
  );
  assert.equal(
    immutableKeys.size + baselineKeys.size,
    Object.keys(audit.sources).length,
  );
  for (const key of [...immutableKeys, ...baselineKeys]) {
    assert.ok(audit.sources[key], `sourceShaPolicy 引用了未知来源 ${key}`);
  }
  for (const [key, source] of Object.entries(audit.sources)) {
    assert.notEqual(immutableKeys.has(key), baselineKeys.has(key), key);
    const actualSha = immutableKeys.has(key)
      ? await sha256(source.path)
      : sha256Buffer(gitBuffer(
        audit.sourceShaPolicy.baselineCommit,
        source.path,
      ));
    assert.equal(actualSha, source.sha256, source.path);
  }
  assert.equal(audit.scope.readOnlyEvidenceReview, true);
  assert.equal(audit.scope.browserOrXhsAccessed, false);
  assert.equal(audit.scope.networkAccessed, false);
  assert.equal(audit.scope.blenderOpened, false);
  assert.equal(audit.scope.generatorRun, false);
  assert.equal(audit.scope.binaryRebuilt, false);
  assert.equal(audit.scope.sharedFilesModified, false);
  assert.equal(audit.scope.recoveryMassingV2Modified, false);
  assert.equal(audit.scope.massingV3Modified, false);
});

test("Recovery Massing-v2 保持原字节、结构与候选语义且不需要重做", async () => {
  const audit = await readJson(auditPath);
  const recovery = audit.recoveryMassingV2;
  assert.equal(
    recovery.status,
    "preserved-qualified-recovery-structure-and-runtime-visual-stage-only",
  );
  assert.equal(recovery.rebuildRequired, false);
  assert.equal(recovery.rebuildAuthorized, false);

  for (const artifact of Object.values(recovery.preservedArtifacts)) {
    assert.equal(await sha256(artifact.path), artifact.sha256);
    assert.equal(artifact.byteIdenticalToRecovery, true);
    assert.equal(
      sha256Buffer(gitBuffer(recovery.sourceRecoveryCommit, artifact.path)),
      artifact.sha256,
      artifact.path,
    );
  }
  for (const artifact of recovery.qaArtifacts) {
    assert.equal(await sha256(artifact.path), artifact.sha256);
    assert.match(artifact.meaning, /Recovery|inherited/u);
  }

  const glbBuffer = await readFile(
    new URL(recovery.preservedArtifacts.glb.path, root),
  );
  const glb = parseGlb(glbBuffer);
  const metrics = inspectGlb(glbBuffer, glb);
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
    assert.equal(metrics[key], recovery.preservedArtifacts.glb[key], key);
  }
  const nodeExtras = glb.nodes.map(({ extras }) => extras);
  assert.deepEqual(
    nodeExtras.map(({ source_way_id: wayId }) => wayId).sort((a, b) => a - b),
    [...recovery.nodeSemantics.sourceWayIds].sort((a, b) => a - b),
  );
  for (const extras of nodeExtras) {
    assert.equal(
      extras.candidate_status,
      recovery.nodeSemantics.candidateStatus,
    );
    assert.equal(
      extras.height_evidence,
      recovery.nodeSemantics.heightEvidence,
    );
    assert.equal(extras.map_binding, recovery.nodeSemantics.mapBinding);
  }

  const buildRecord = await readJson(
    recovery.preservedArtifacts.buildRecord.path,
  );
  assert.equal(buildRecord.runtimeGate, "pass");
  assert.equal(buildRecord.mapAcceptance, "blocked");
  assert.equal(buildRecord.identityAllowed, false);
  assert.ok(recovery.notQualifiedFor.includes("Hero source lineage"));
  assert.ok(recovery.notQualifiedFor.includes("production tier promotion"));
});

test("Recovery 共享生成依赖只存在于来源提交，不冒充当前可重建 lineage", async () => {
  const audit = await readJson(auditPath);
  const recovery = audit.recoveryMassingV2;
  for (const dependency of recovery.recoverySourceOnlyDependencies) {
    assert.equal(dependency.presentInCurrentWorktree, false);
    assert.equal(await pathExists(dependency.path), false);
    assert.equal(
      sha256Buffer(gitBuffer(recovery.sourceRecoveryCommit, dependency.path)),
      dependency.sourceCommitSha256,
      dependency.path,
    );
  }
  assert.match(
    recovery.reasonNotToRedo,
    /Massing-v3.*地图和运行时/u,
  );
});

test("后续四成员 Massing-v3 已正式通过 map/runtime，且与 Hero 门分离", async () => {
  const audit = await readJson(auditPath);
  const [runtimeQa, binding, priorReadiness] = await Promise.all([
    readJson(audit.sources.runtimeQaV2.path),
    readJson(audit.sources.memberBinding.path),
    readJson(audit.sources.priorHeroReadiness.path),
  ]);
  const current = audit.currentAcceptedMassing;
  assert.equal(await sha256(current.glbPath), current.modelSha256);
  assert.equal(await sha256(current.blendPath), current.blendSha256);
  const currentGlbBuffer = await readFile(new URL(current.glbPath, root));
  const currentGlb = parseGlb(currentGlbBuffer);
  const currentMetrics = inspectGlb(currentGlbBuffer, currentGlb);
  assert.deepEqual(currentMetrics, current.glbStructure);
  assert.equal(runtimeQa.status, "pass-massing-map-and-runtime");
  assert.equal(runtimeQa.inputs.modelSha256, current.modelSha256);
  assert.deepEqual(runtimeQa.inputs.placement, current.placement);
  assert.equal(runtimeQa.inputs.collisionProxyCount, current.collisionProxyCount);
  assert.equal(runtimeQa.map.formalMassingAcceptance, "pass");
  assert.equal(runtimeQa.collision.verdict, current.runtimeCollision);
  assert.deepEqual(
    binding.members.map(({ houseNumber }) => houseNumber),
    current.members,
  );
  assert.equal(
    priorReadiness.frozenMassingMapRuntime.minimumCollisionRoadClearance,
    current.minimumCollisionRoadClearance,
  );
  assert.equal(
    priorReadiness.frozenMassingMapRuntime.minimumCollisionNeighborClearance,
    current.minimumCollisionNeighborClearance,
  );
  assert.equal(current.movementScaleOrFootprintChangeAuthorized, false);
  assert.equal(current.frozenAndNotRebuilt, true);
  assert.equal(runtimeQa.scope.hero, "blocked-invalid-cross-asset-lineage");
  assert.equal(runtimeQa.scope.identity, "missing");

  const qaContract = await readFile(
    new URL(audit.sources.massingQaContract.path, root),
    "utf8",
  );
  assert.match(
    qaContract,
    /"xinhua-villas-329": Object\.freeze\(\{[\s\S]*?massing-v3\/xinhua-villas-329-massing\.glb[\s\S]*?f245efd0/u,
  );
});

test("stable ID 保持329弄 compound，单成员代表和成员级拆分均未获授权", async () => {
  const audit = await readJson(auditPath);
  const [manifest, binding, registry] = await Promise.all([
    readJson(audit.sources.referenceManifest.path),
    readJson(audit.sources.memberBinding.path),
    readJson(audit.sources.registry.path),
  ]);
  const subject = audit.stableSubjectContract;
  assert.equal(manifest.subject.stableBoundary, "compound-of-historic-residences-and-lane");
  assert.equal(subject.assetBoundary, "329-lane-compound");
  assert.equal(subject.runtimeIdentityKind, "villa-row");
  assert.deepEqual(
    binding.members.map(({ houseNumber }) => houseNumber),
    subject.memberSetWithMassingBinding,
  );
  assert.deepEqual(
    binding.evidenceOnlyNotMapped
      .map(({ houseNumber }) => houseNumber)
      .sort((first, second) => first.localeCompare(second, "zh-CN")),
    [...subject.evidenceOnlyUnmappedMembers]
      .sort((first, second) => first.localeCompare(second, "zh-CN")),
  );
  assert.equal(
    binding.excludedCandidates[0].sourceWayId,
    subject.excludedUnknownAdjacentWayId,
  );
  assert.ok(Object.values(subject.representationStrategies).every(
    ({ authorized }) => authorized === false,
  ));
  const placement = registry.landmarks.find(
    ({ id }) => id === audit.assetId,
  );
  assert.equal(
    placement.model,
    audit.legacyHeroLineage.currentRuntimeWiring.registryModel,
  );
  assert.deepEqual(placement.position, audit.currentAcceptedMassing.placement.position);
  assert.equal(placement.yaw, audit.currentAcceptedMassing.placement.yaw);
  assert.equal(placement.scale, audit.currentAcceptedMassing.placement.scale);
});

test("本地视角矩阵没有把作者声明、单图斜视或轻微横移冒充完整同主体多视角", async () => {
  const audit = await readJson(auditPath);
  const matrix = Object.fromEntries(
    audit.sameSubjectViewMatrix.map((entry) => [entry.subject, entry]),
  );
  assert.equal(matrix["329-lane-compound"].heroGate, "blocked");
  assert.equal(matrix["member-15"].canonical, "missing-full-silhouette");
  assert.equal(matrix["member-15"].sideOrDepth, "missing");
  assert.equal(
    matrix["member-36"].sameSubjectContinuity,
    "author-claim-and-architectural-continuity-not-repeated-doorplate",
  );
  assert.equal(
    matrix["member-40"].sideOrDepth,
    "partial-small-lateral-change-only",
  );
  assert.equal(matrix["member-42"].sideOrDepth, "missing");
  assert.equal(matrix["member-17"].footprintBinding, "missing");
  assert.equal(matrix["member-38"].footprintBinding, "missing");
  assert.ok(Object.values(matrix).every(({ heroGate }) => heroGate === "blocked"));
  assert.ok(audit.localEvidenceReview.observed.length >= 7);
  assert.ok(audit.localEvidenceReview.authorClaimed.length >= 2);
  assert.ok(audit.localEvidenceReview.inferred.length >= 3);
  assert.ok(audit.localEvidenceReview.unknown.length >= 8);

  const inventory = await readJson(audit.sources.xhsInventory.path);
  const selectedIndexes = new Set([1, 3, 4, 5, 6, 7, 8, 18]);
  const selected = inventory.files.filter(({ index }) => selectedIndexes.has(index));
  assert.equal(selected.length, selectedIndexes.size);
  for (const file of selected) {
    assert.equal(
      await sha256(`${inventory.localDirectory}/${file.name}`),
      file.sha256,
    );
    assert.equal(file.visualStatus, "usable");
  }
  assert.equal(
    inventory.files.filter(
      ({ visualStatus }) => visualStatus === "needs-review-black-media",
    ).length,
    9,
  );
});

test("旧 Hero 的跨资产 lineage、缺失 provenance 与装饰范围污染均保持 Hold", async () => {
  const audit = await readJson(auditPath);
  const hero = audit.legacyHeroLineage;
  assert.equal(await sha256(hero.blend.path), hero.blend.sha256);
  assert.equal(await sha256(hero.glb.path), hero.glb.sha256);
  const heroBuffer = await readFile(new URL(hero.glb.path, root));
  const heroGlb = parseGlb(heroBuffer);
  const metrics = inspectGlb(heroBuffer, heroGlb);
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
    assert.equal(metrics[key], hero.glb[key], key);
  }
  assert.deepEqual(heroGlb.nodes[0].extras, hero.glb.nodeExtras);
  const materialNames = new Set(heroGlb.materials.map(({ name }) => name));
  for (const name of hero.scopePollution.materials) {
    assert.ok(materialNames.has(name), name);
  }
  assert.equal(hero.scopePollution.pureBuildingHeroCompliant, false);
  assert.equal(
    hero.crossAssetReferenceVerdict,
    "high-confidence-same-structure-as-official-211-member-2",
  );
  assert.equal(hero.pixelIdentity, false);
  assert.ok(hero.provenanceGaps.includes("no asset-level Hero build record"));
  assert.ok(hero.provenanceGaps.includes("no derivedFrom accepted Massing SHA"));

  const generator = gitBuffer(
    audit.sourceShaPolicy.baselineCommit,
    audit.sources.legacyHeroGenerator.path,
  ).toString("utf8");
  const heroFunction = generator.slice(
    generator.indexOf("def build_xinhua_villas_329"),
    generator.indexOf("def build_house_315"),
  );
  for (const expression of [
    /villa329-lawn/u,
    /villa329-dormer/u,
    /villa329-sunroom/u,
    /villa329-turret/u,
    /villa329-shrub/u,
    /villa329-tree-left/u,
    /villa329-garden-lamp-left/u,
  ]) {
    assert.match(heroFunction, expression);
  }
  assert.equal(
    hero.verdict,
    "hold-cross-asset-contaminated-scope-polluted-not-a-hero-or-identity-source",
  );
});

test("程序化 overview identity 不冒充 Hero 派生 Identity，正式链路仍不可达", async () => {
  const audit = await readJson(auditPath);
  const identity = audit.identityReadiness;
  const tierRoots = [
    "assets/models/source/tiers/xinhua-road",
    "public/models/tiers/xinhua-road",
    "docs/research/build-records/tiers/xinhua-road",
  ];
  const allTierFiles = (await Promise.all(tierRoots.map(listFiles))).flat();
  const standaloneIdentityFiles = allTierFiles.filter((path) => (
    /identity/iu.test(path)
    && /xinhua-villas-329/iu.test(path)
  ));
  assert.deepEqual(standaloneIdentityFiles, []);
  assert.equal(identity.standaloneIdentityArtifactsFound, 0);
  assert.equal(identity.overviewProgrammaticIdentityKind, "villa-row");
  assert.equal(identity.overviewProgrammaticIdentityCountsAsStandaloneTier, false);
  assert.equal(identity.validHeroSourceSha, null);
  assert.equal(identity.heroMcp2Passed, false);
  assert.equal(identity.identityDerivationAuthorized, false);
  assert.equal(identity.mcp3Reachable, false);
  assert.equal(identity.threeTierRuntimeReachable, false);

  const overviewContract = await readFile(
    new URL(audit.sources.overviewIdentityContract.path, root),
    "utf8",
  );
  assert.match(
    overviewContract,
    /"xinhua-villas-329": "villa-row"/u,
  );
});

test("最终裁决精确阻断新 Hero/Identity，并给出 compound 与单成员两条最小补证路径", async () => {
  const audit = await readJson(auditPath);
  assert.equal(
    audit.verdict.status,
    "blocked-new-hero-and-identity-insufficient-same-subject-evidence-and-subject-contract",
  );
  assert.equal(audit.verdict.newHeroAuthorized, false);
  assert.equal(audit.verdict.identityDerivationAuthorized, false);
  assert.equal(audit.verdict.modelingPerformed, false);
  assert.equal(audit.heroReadiness.authorized, false);
  assert.equal(
    audit.heroReadiness.preflightHardGates
      .sameSubjectCanonicalSideEntranceCoverageComplete,
    false,
  );
  assert.equal(
    audit.heroReadiness.preflightHardGates
      .heroMemberOwnershipAndFootprintsBound,
    false,
  );
  assert.equal(
    audit.heroReadiness.preflightHardGates
      .compoundOrRepresentativeScopeExplicitlyAuthorized,
    false,
  );
  assert.ok(audit.heroReadiness.forbiddenUntilUnblocked.includes(
    "open Blender for new Hero construction",
  ));
  assert.match(audit.minimumAdditionalEvidence.firstRequiredDecision, /stable ID/u);
  assert.ok(audit.minimumAdditionalEvidence.forCompoundHero.length >= 3);
  assert.ok(audit.minimumAdditionalEvidence.forSingleRepresentativeHero.length >= 3);
  assert.ok(
    audit.minimumAdditionalEvidence.afterEvidenceForSingleMemberHero.some(
      (step) => /成员级 Massing、placement、registry/u.test(step),
    ),
  );
  assert.match(
    audit.minimumAdditionalEvidence.afterNewHero[0],
    /MCP2/u,
  );
});
