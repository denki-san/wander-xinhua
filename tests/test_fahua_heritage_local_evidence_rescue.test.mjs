import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath = "docs/research/fahua-heritage-local-evidence-rescue.json";

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

function parseGlb(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
}

function inspectGlb(buffer) {
  const json = parseGlb(buffer);
  let triangles = 0;
  let primitives = 0;
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
    bytes: buffer.length,
    nodes: json.nodes?.length ?? 0,
    meshes: json.meshes?.length ?? 0,
    primitives,
    triangles,
    materials: json.materials?.length ?? 0,
    images: json.images?.length ?? 0,
    textures: json.textures?.length ?? 0,
  };
}

test("法华遗韵 evidence rescue 的公共输入严格来自审查 baseline blob", async () => {
  const audit = await readJson(auditPath);
  for (const source of audit.sourcePolicy.reviewTimeBaselineGitBlobs) {
    const baselineBlob = gitShow(audit.reviewBaseline, source.path);
    assert.equal(sha256(baselineBlob), source.sha256, source.path);
  }
  assert.equal(audit.validation.sharedFilesChanged, false);
});

test("本栋照片与保留二进制没有在 rescue 中漂移", async () => {
  const audit = await readJson(auditPath);
  for (const source of audit.sourcePolicy.strictCurrentBuildingFiles) {
    assert.equal(await sha256File(source.path), source.sha256, source.path);
  }

  const canonical = await readFile(new URL(
    audit.manifestSupplement.canonicalComparisonView.path,
    root,
  ));
  const publicPhoto = await readFile(new URL(
    audit.manifestSupplement.duplicateEncodings[0].path,
    root,
  ));
  assert.deepEqual(publicPhoto, canonical);
  assert.equal(
    audit.searchAccounting.imagePathClassification.sameSubjectUniquePhotographicCaptures,
    1,
  );
  assert.equal(
    audit.searchAccounting.imagePathClassification.qualifiedNewSideDepthCaptures,
    0,
  );
  assert.equal(
    audit.searchAccounting.imagePathClassification.qualifiedNewStreetContextCaptures,
    0,
  );
});

test("六个历史 manifest blob 均只有同一 front reference", async () => {
  const audit = await readJson(auditPath);
  const expected = audit.historicalManifestAudit.entryInvariant;
  assert.equal(
    audit.historicalManifestAudit.versions.length,
    audit.searchAccounting.historicalManifestCommitCount,
  );

  for (const version of audit.historicalManifestAudit.versions) {
    const blob = gitShow(
      version.commit,
      "docs/research/poi-reference-manifest.json",
    );
    assert.equal(
      execFileSync(
        "git",
        ["rev-parse", `${version.commit}:docs/research/poi-reference-manifest.json`],
        { cwd: new URL(".", root), encoding: "utf8" },
      ).trim(),
      version.blob,
    );
    const manifest = JSON.parse(blob.toString("utf8"));
    const entry = manifest.pois.find(({ id }) => id === audit.assetId);
    assert.ok(entry, version.commit);
    assert.equal(entry.referencePhotos.length, expected.referenceCount);
    assert.equal(entry.referencePhotos[0].path, expected.path);
    assert.equal(entry.referencePhotos[0].view, expected.view);
  }
});

test("Recovery/Hold 只读 blob 证实 side/runtime 图为自生成且 map binding 为空", async () => {
  const audit = await readJson(auditPath);
  for (const source of audit.recoveryHoldAudit.sources) {
    const blob = gitShow(audit.holdCommit, source.path);
    assert.equal(sha256(blob), source.sha256, source.path);
    assert.equal(
      execFileSync(
        "git",
        ["rev-parse", `${audit.holdCommit}:${source.path}`],
        { cwd: new URL(".", root), encoding: "utf8" },
      ).trim(),
      source.gitBlob,
      source.path,
    );
  }

  const binding = JSON.parse(gitShow(
    audit.holdCommit,
    "docs/research/xinhua-road-map-binding-audit.json",
  ));
  const entry = binding.entries.find(({ runtimeId }) => runtimeId === audit.assetId);
  assert.ok(entry);
  assert.equal(entry.geometryRole, "site-feature");
  assert.deepEqual(entry.osmWayCandidates, []);
  assert.deepEqual(entry.corroboratingOsmNodes, []);

  const record = JSON.parse(gitShow(
    audit.holdCommit,
    "docs/research/build-records/tiers/xinhua-road/massing/fahua-heritage-massing.json",
  ));
  assert.equal(record.proxyMethod, "voxel-remesh-current-hero");
  assert.equal(record.glb.auditStatus, "ok");
  assert.equal(record.runtimeGate.mapAcceptance, "required-before-formal-pass");

  const massingGlb = gitShow(
    audit.holdCommit,
    "public/models/tiers/xinhua-road/massing/fahua-heritage-massing.glb",
  );
  assert.deepEqual(inspectGlb(massingGlb), {
    bytes: 92624,
    nodes: 1,
    meshes: 1,
    primitives: 1,
    triangles: 900,
    materials: 1,
    images: 0,
    textures: 0,
  });
});

test("保存的 OSM 与当前 placement 只能支持数值 sanity，不能解除 map blocker", async () => {
  const audit = await readJson(auditPath);
  const [requested, buildings, roads, registry, priorDisposition] =
    await Promise.all([
      readJson("docs/research/data/requested-pois-osm-20260717-103840.json"),
      readJson("docs/research/data/xinhua-buildings-osm-20260725-074802.json"),
      readJson("docs/research/data/xinhua-roads-osm-20260716-080509.json"),
      readJson("app/scene/xinhua-road-landmarks-data.json"),
      readJson("docs/research/fahua-heritage-final-disposition.json"),
    ]);

  assert.equal(
    requested.targets.some(({ target }) => target.id === audit.assetId),
    false,
  );
  const landmark = registry.landmarks.find(({ id }) => id === audit.assetId);
  assert.ok(landmark);
  assert.deepEqual(landmark.position, audit.osmAndMapNegativeEvidence.runtimeOrigin.world);
  assert.equal(landmark.yaw, -0.5);
  assert.equal(landmark.scale, 0.27);

  for (const roadAudit of audit.osmAndMapNegativeEvidence.roads) {
    const road = roads.elements.find(({ id }) => id === roadAudit.osmWayId);
    assert.ok(road, `${roadAudit.osmWayId}`);
    assert.equal(road.tags.name, roadAudit.name);
    assert.equal(road.tags.highway, roadAudit.highway);
    assert.equal(road.tags.surface, roadAudit.surface);
  }
  assert.equal(
    priorDisposition.staticMapAudit.roads.fahuazhen
      .minimumAsphaltEdgeClearanceSceneUnits,
    audit.osmAndMapNegativeEvidence.roads[0]
      .staticAsphaltEdgeClearanceSceneUnits,
  );
  assert.equal(
    priorDisposition.staticMapAudit.roads.xianghuaqiao
      .minimumAsphaltEdgeClearanceSceneUnits,
    audit.osmAndMapNegativeEvidence.roads[1]
      .staticAsphaltEdgeClearanceSceneUnits,
  );

  const nearest = audit.osmAndMapNegativeEvidence.nearestBuildingCandidate;
  const nearestWay = buildings.elements.find(({ id }) => id === nearest.osmWayId);
  assert.ok(nearestWay);
  assert.deepEqual(nearestWay.tags, nearest.tags);
  assert.equal(nearest.decision, "reject-wrong-subject-neighbor");
  assert.equal(audit.disposition.mapBlockerReleased, false);
});

test("最终裁决保持 front-only 与 map 双 blocker，且未授权建模和公共改动", async () => {
  const audit = await readJson(auditPath);
  const hero = await readFile(new URL(
    "public/models/requested-pois/fahua-heritage.glb",
    root,
  ));
  assert.deepEqual(inspectGlb(hero), {
    bytes: 1739160,
    nodes: 1,
    meshes: 1,
    primitives: 7,
    triangles: 28152,
    materials: 7,
    images: 0,
    textures: 0,
  });
  assert.equal(audit.status, "blocked-local-evidence-rescue-exhausted");
  assert.equal(audit.verdict.canonicalFront, "pass-one-unique-photographic-capture");
  assert.equal(audit.verdict.sideOrDepth, "blocked-zero-photographic-captures");
  assert.equal(
    audit.verdict.streetOrEntry,
    "blocked-zero-street-interface-captures",
  );
  assert.equal(audit.verdict.mapPromotion, "blocked");
  assert.equal(audit.verdict.newModelingAuthorized, false);
  assert.equal(audit.verdict.runtimeOrRegistryChangeAuthorized, false);
  assert.equal(audit.disposition.frontOnlyBlockerReleased, false);
  assert.equal(audit.disposition.mapBlockerReleased, false);
  assert.equal(audit.minimumEvidenceGap.status, "blocked");
});
