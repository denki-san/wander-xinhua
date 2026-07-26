import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath =
  "docs/research/xinhua-villas-211-local-same-member-evidence-rescue.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function sha256File(relativePath) {
  return sha256(await readFile(new URL(relativePath, root)));
}

function gitShow(commit, relativePath) {
  return execFileSync(
    "git",
    ["show", `${commit}:${relativePath}`],
    { cwd: new URL(".", root), maxBuffer: 32 * 1024 * 1024 },
  );
}

function gitBlob(commit, relativePath) {
  return execFileSync(
    "git",
    ["rev-parse", `${commit}:${relativePath}`],
    { cwd: new URL(".", root), encoding: "utf8" },
  ).trim();
}

function parseGlb(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
}

function inspectGlb(buffer) {
  const json = parseGlb(buffer);
  let primitives = 0;
  let triangles = 0;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      primitives += 1;
      const position = json.accessors[primitive.attributes.POSITION];
      const indices = primitive.indices === undefined
        ? position
        : json.accessors[primitive.indices];
      triangles += indices.count / 3;
    }
  }
  return {
    json,
    metrics: {
      bytes: buffer.length,
      nodes: json.nodes?.length ?? 0,
      meshes: json.meshes?.length ?? 0,
      primitives,
      triangles,
      materials: json.materials?.length ?? 0,
      images: json.images?.length ?? 0,
      textures: json.textures?.length ?? 0,
    },
  };
}

test("211 rescue 的公共输入与 Recovery 输入严格锁定 Git blob", async () => {
  const audit = await readJson(auditPath);
  for (const source of audit.sourcePolicy.baselineGitBlobs) {
    const buffer = gitShow(audit.reviewBaseline, source.path);
    assert.equal(gitBlob(audit.reviewBaseline, source.path), source.gitBlob);
    assert.equal(sha256(buffer), source.sha256, source.path);
  }
  for (const source of audit.sourcePolicy.holdGitBlobs) {
    const buffer = gitShow(audit.holdCommit, source.path);
    assert.equal(gitBlob(audit.holdCommit, source.path), source.gitBlob);
    assert.equal(sha256(buffer), source.sha256, source.path);
  }
  assert.equal(audit.validation.sharedFilesChanged, false);
});

test("专用与共享历史 manifest 的 union 仍只有四个自有 capture", async () => {
  const audit = await readJson(auditPath);
  const historical = audit.historicalManifestAudit;
  assert.equal(historical.dedicatedVersions.length, 4);
  assert.equal(historical.sharedVersions.length, 6);

  for (const version of historical.dedicatedVersions) {
    const path = "docs/research/xinhua-villas-211-reference-manifest.json";
    const manifest = JSON.parse(gitShow(version.commit, path));
    assert.equal(gitBlob(version.commit, path), version.gitBlob);
    assert.equal(manifest.referencePhotos.length, version.photoCount);
  }
  for (const version of historical.sharedVersions) {
    const path = "docs/research/poi-reference-manifest.json";
    const manifest = JSON.parse(gitShow(version.commit, path));
    const entry = manifest.pois.find(({ id }) => id === audit.assetId);
    assert.ok(entry, version.commit);
    assert.equal(gitBlob(version.commit, path), version.gitBlob);
    assert.equal(entry.referencePhotos.length, version.photoCount);
  }

  assert.equal(audit.ownedPhotographicUnion.captures.length, 4);
  assert.equal(audit.searchAccounting.ownedRealPhotoPathCount, 6);
  assert.equal(audit.searchAccounting.ownedUniqueBinaryShaCount, 5);
  assert.equal(audit.searchAccounting.ownedUniquePhotographicCaptureCount, 4);
});

test("四个自有 capture 的指纹与覆盖分类精确，public 仅为重复编码", async () => {
  const audit = await readJson(auditPath);
  for (const capture of audit.ownedPhotographicUnion.captures) {
    assert.equal(
      await sha256File(capture.paths[0]),
      capture.primarySha256,
      capture.captureId,
    );
  }

  const winter = audit.ownedPhotographicUnion.captures[0];
  const [primary, publicCopy] = await Promise.all([
    readFile(new URL(winter.paths[0], root)),
    readFile(new URL(winter.paths[1], root)),
  ]);
  assert.deepEqual(primary, publicCopy);
  assert.notEqual(await sha256File(winter.paths[2]), winter.primarySha256);
  assert.equal(winter.acceptedWayAssignment, "unknown");
  assert.equal(
    audit.ownedPhotographicUnion.captures[2].acceptedWayAssignment,
    "unknown",
  );
  assert.equal(
    audit.ownedPhotographicUnion.captures[3].acceptedWayAssignment,
    "unknown",
  );
  assert.equal(
    audit.ownedPhotographicUnion.coverage.memberToAcceptedWay,
    "blocked-zero-of-nine",
  );
});

test("accepted Massing 九成员均无门牌或照片 way assignment", async () => {
  const audit = await readJson(auditPath);
  const [binding, buildings, namedOsm] = await Promise.all([
    readJson("docs/research/xinhua-villas-211-osm-binding.json"),
    readJson("docs/research/data/xinhua-buildings-osm-20260725-074802.json"),
    readJson("docs/research/data/xinhua-landmarks-overpass-20260717.json"),
  ]);
  const memberAudit = audit.acceptedMassingMemberAudit;
  assert.deepEqual(
    binding.members.map(({ sourceWayId }) => sourceWayId),
    memberAudit.acceptedWayIds,
  );
  for (const wayId of memberAudit.acceptedWayIds) {
    const way = buildings.elements.find(({ id }) => id === wayId);
    assert.ok(way, `${wayId}`);
    assert.equal(way.tags["addr:housenumber"], undefined);
    assert.equal(way.tags["addr:street"], undefined);
  }
  const addressMatches = namedOsm.elements.filter((element) => (
    element.tags?.["addr:street"] === "新华路"
    && /^211/.test(element.tags?.["addr:housenumber"] ?? "")
  ));
  assert.equal(addressMatches.length, 0);
  assert.equal(memberAudit.acceptedMemberCount, 9);
  assert.equal(memberAudit.membersWithOsmHouseNumber, 0);
  assert.equal(memberAudit.membersWithPhotoNumberToWayBinding, 0);
  assert.equal(memberAudit.membersWithSameMemberCompleteDepthSet, 0);
});

test("accepted Massing、legacy Hero 与 Recovery Massing 结构不能组成 Hero lineage", async () => {
  const audit = await readJson(auditPath);
  const acceptedBuffer = gitShow(
    audit.reviewBaseline,
    "public/models/tiers/xinhua-road/massing-v3/xinhua-villas-211-massing.glb",
  );
  const legacyBuffer = gitShow(
    audit.reviewBaseline,
    "public/models/xinhua-road/xinhua-villas-211.glb",
  );
  const recoveryBuffer = gitShow(
    audit.holdCommit,
    "public/models/tiers/xinhua-road/massing/xinhua-villas-211-massing.glb",
  );
  const accepted = inspectGlb(acceptedBuffer);
  const legacy = inspectGlb(legacyBuffer);
  const recovery = inspectGlb(recoveryBuffer);

  assert.deepEqual(accepted.metrics, {
    bytes: 16060,
    nodes: 9,
    meshes: 9,
    primitives: 9,
    triangles: 134,
    materials: 1,
    images: 0,
    textures: 0,
  });
  assert.ok(accepted.json.nodes.every(
    (node) => node.extras.house_number === "unknown",
  ));
  assert.deepEqual(legacy.metrics, {
    bytes: 4188228,
    nodes: 1,
    meshes: 1,
    primitives: 14,
    triangles: 62674,
    materials: 14,
    images: 0,
    textures: 0,
  });
  assert.equal(legacy.json.nodes[0].extras["accepted-massing-sha"], undefined);
  assert.deepEqual(recovery.metrics, {
    bytes: 91400,
    nodes: 1,
    meshes: 1,
    primitives: 1,
    triangles: 898,
    materials: 1,
    images: 0,
    textures: 0,
  });

  const recoveryRecord = JSON.parse(gitShow(
    audit.holdCommit,
    "docs/research/build-records/tiers/xinhua-road/massing/xinhua-villas-211-massing.json",
  ));
  assert.equal(recoveryRecord.proxyMethod, "voxel-remesh-current-hero");
  assert.equal(
    recoveryRecord.sourceHero.sha256,
    audit.lineageAudit.legacyHero.glbSha256,
  );
  assert.equal(audit.lineageAudit.recoveryMassing.acceptedMassingSource, false);
  assert.equal(audit.lineageAudit.legacyHero.sameFootprint, false);
});

test("最终裁决保持 same-member depth 与 lineage 双 blocker", async () => {
  const audit = await readJson(auditPath);
  assert.equal(
    audit.status,
    "blocked-local-evidence-exhausted-no-same-member-way-depth-lineage",
  );
  assert.equal(audit.verdict.photographsBoundToSpecificAcceptedWay, 0);
  assert.equal(audit.verdict.sameMemberSameWayCompleteDepthSets, 0);
  assert.equal(audit.verdict.heroSameMemberDepthBlockerReleased, false);
  assert.equal(audit.verdict.heroLineageBlockerReleased, false);
  assert.equal(audit.verdict.newHeroAuthorized, false);
  assert.equal(audit.crossAssetAndGeneratedRejections.xinhuaVillas329.decision,
    "excluded-forbidden-cross-asset-no-reuse");
  assert.equal(
    audit.searchAccounting.qualifiedNewSameMemberCompleteDepthCaptures,
    0,
  );
  assert.equal(audit.disposition.mcp2Authorized, false);
  assert.equal(audit.disposition.identityAuthorized, false);
  assert.equal(audit.disposition.buildingComplete, false);
  assert.equal(audit.minimumEvidenceGap.status, "blocked");
});
