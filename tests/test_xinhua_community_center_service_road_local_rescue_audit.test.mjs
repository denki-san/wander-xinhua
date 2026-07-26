import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const audit = JSON.parse(fs.readFileSync(path.join(
  ROOT,
  "docs/research/xinhua-community-center-service-road-local-rescue-audit.json",
), "utf8"));
const targetRoadId = 577252269;
const missingKeys = [
  "width",
  "est_width",
  "lanes",
  "access",
  "service",
  "surface",
  "maxwidth",
  "vehicle",
];

function git(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function gitBlob(objectId) {
  return git(["cat-file", "blob", objectId]);
}

function gitJson(sourceKey) {
  return JSON.parse(gitBlob(audit.sources[sourceKey].gitBlob));
}

function sha256(relativePath) {
  return crypto.createHash("sha256")
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest("hex");
}

function dataTreeEntries(commit) {
  const output = git([
    "ls-tree",
    "-r",
    "--format=%(objectname)%x09%(path)",
    commit,
    "docs/research/data",
  ]).trim();
  return output ? output.split("\n") : [];
}

function nestedObjects(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) nestedObjects(item, output);
  } else if (value && typeof value === "object") {
    output.push(value);
    for (const item of Object.values(value)) nestedObjects(item, output);
  }
  return output;
}

function targetWays(source) {
  return nestedObjects(source).filter(
    (entry) => entry.type === "way" && entry.id === targetRoadId,
  );
}

test("local rescue 只锁本栋文件，共享道路输入使用 baseline Git blob", () => {
  assert.equal(
    audit.baseline.worktreeHeadBeforeAudit,
    "d37449a34b06d5a9f6a462f9a314bff4a8d222fd",
  );
  assert.equal(audit.baseline.uncommittedChangesAbsorbed, false);
  const currentKeys = new Set(audit.sourceShaPolicy.currentFileImmutable);
  const baselineKeys = new Set(audit.sourceShaPolicy.baselineGitBlobSnapshot);
  const historicalKeys = new Set(
    audit.sourceShaPolicy.historicalGitBlobSnapshot,
  );
  for (const key of currentKeys) {
    const source = audit.sources[key];
    assert.equal(sha256(source.path), source.sha256, key);
    assert.equal("gitBlob" in source, false, key);
  }
  for (const key of [...baselineKeys, ...historicalKeys]) {
    const source = audit.sources[key];
    assert.equal(
      git(["rev-parse", `${source.commit}:${source.path}`]).trim(),
      source.gitBlob,
      key,
    );
    assert.ok(gitBlob(source.gitBlob).length > 0, key);
    assert.equal("sha256" in source, false, key);
  }
  assert.equal(
    currentKeys.size + baselineKeys.size + historicalKeys.size,
    Object.keys(audit.sources).length,
  );
  assert.equal(audit.scope.networkAccessed, false);
  assert.equal(audit.scope.browserAccessed, false);
  assert.equal(audit.scope.blenderOpened, false);
  assert.equal(audit.scope.modelBinaryModified, false);
  assert.equal(audit.scope.sharedRuntimeModified, false);
});

test("当前、Recovery、enrichment 的31个 data 路径与30个 blob 可复算", () => {
  const entries = audit.corpusInventory.fixedTreeCommits
    .flatMap(dataTreeEntries);
  const uniqueEntries = [...new Set(entries)].sort();
  const uniquePaths = new Set(
    uniqueEntries.map((entry) => entry.split("\t")[1]),
  );
  const uniqueBlobs = new Set(
    uniqueEntries.map((entry) => entry.split("\t")[0]),
  );
  const manifest = `${uniqueEntries.join("\n")}\n`;
  const manifestSha = crypto.createHash("sha256")
    .update(manifest)
    .digest("hex");
  const uniqueBytes = [...uniqueBlobs]
    .map((objectId) => Number(git(["cat-file", "-s", objectId]).trim()))
    .reduce((sum, size) => sum + size, 0);
  assert.equal(uniqueEntries.length, 31);
  assert.equal(uniquePaths.size, audit.corpusInventory.unionDataPaths);
  assert.equal(uniqueBlobs.size, audit.corpusInventory.unionUniqueGitBlobs);
  assert.equal(uniqueBytes, audit.corpusInventory.unionUniqueBlobBytes);
  assert.equal(
    manifestSha,
    audit.corpusInventory.canonicalObjectPathManifestSha256,
  );
  const targetBlobs = [...uniqueBlobs].filter(
    (objectId) => gitBlob(objectId).includes(String(targetRoadId)),
  );
  assert.deepEqual(
    targetBlobs.sort(),
    [...audit.corpusInventory.targetRoadBearingDataBlobObjects].sort(),
  );
});

test("三份道路快照与 requested-POIs 六次记录保持同一几何和标签", () => {
  const roadSourceKeys = [
    "roadSnapshot0550",
    "roadSnapshot0636",
    "roadSnapshot0803",
  ];
  const allRoadRecords = roadSourceKeys.flatMap(
    (key) => targetWays(gitJson(key)),
  );
  const requestedRecords = targetWays(gitJson("requestedPoisSnapshot"));
  assert.equal(allRoadRecords.length, 3);
  assert.equal(requestedRecords.length, 3);
  const records = [...allRoadRecords, ...requestedRecords];
  for (const way of records) {
    assert.deepEqual(way.tags, {
      highway: "service",
      name: "新华路345弄",
      oneway: "no",
    });
    assert.deepEqual(way.geometry, records[0].geometry);
    for (const key of missingKeys) assert.equal(key in way.tags, false, key);
  }
  assert.equal(records.length, audit.rawRoadEvidence.totalTargetOccurrences);
  assert.deepEqual(
    audit.rawRoadEvidence.uniqueTagVariants,
    [{ highway: "service", name: "新华路345弄", oneway: "no" }],
  );
  assert.equal(audit.rawRoadEvidence.uniqueGeometryVariants, 1);
  assert.equal(audit.rawRoadEvidence.onewayNoCanDetermineWidth, false);
  assert.equal(audit.rawRoadEvidence.highwayServiceCanDetermineActualWidth, false);
});

test("原始响应没有 relation/member/version/delete，coverage 必须标 unavailable", () => {
  const sourceKeys = [
    "roadSnapshot0550",
    "roadSnapshot0636",
    "roadSnapshot0803",
    "requestedPoisSnapshot",
  ];
  const objects = sourceKeys.flatMap((key) => nestedObjects(gitJson(key)));
  const relations = objects.filter((entry) => entry.type === "relation");
  const memberArrays = objects.filter((entry) => Array.isArray(entry.members));
  const ways = objects.filter(
    (entry) => entry.type === "way" && entry.id === targetRoadId,
  );
  assert.equal(relations.length, 0);
  assert.equal(memberArrays.length, 0);
  for (const way of ways) {
    assert.equal("version" in way, false);
    assert.equal("changeset" in way, false);
    assert.equal("visible" in way, false);
    assert.equal("deleted" in way, false);
  }
  assert.equal(
    audit.relationAndHistoryCoverage.parentRelationCoverage,
    "unavailable-source-responses-do-not-include-relations-or-members",
  );
  assert.equal(
    audit.relationAndHistoryCoverage.historicalTagDeletionVerdict,
    "no-local-deletion-evidence-but-full-history-unavailable",
  );
  assert.equal(audit.relationAndHistoryCoverage.osmFullHistoryArtifactsFound, 0);
});

test("四个 raw road 路径在全部本地历史中都只有一个 blob 版本", () => {
  for (const [relativePath, expectedCount] of Object.entries(
    audit.repositoryHistoryInventory.rawRoadPathBlobVersions,
  )) {
    const commits = git(["log", "--all", "--format=%H", "--", relativePath])
      .trim()
      .split("\n")
      .filter(Boolean);
    const objectIds = new Set();
    for (const commit of commits) {
      try {
        objectIds.add(git(["rev-parse", `${commit}:${relativePath}`]).trim());
      } catch {
        // 删除该路径的提交没有 blob，不计为内容版本。
      }
    }
    assert.equal(objectIds.size, expectedCount, relativePath);
  }
  assert.equal(
    audit.repositoryHistoryInventory.authoritativeSiteOrRoadPlanArtifactsFound,
    0,
  );
  assert.equal(
    audit.repositoryHistoryInventory
      .communityCenterPdfCadGeoTiffOrOrthophotoArtifactsFound,
    0,
  );
});

test("baseline map 与道路 contract 只给 generic service 宽度，不是实测", () => {
  const map = gitJson("mapData");
  const road = map.roads.find((entry) => entry.osmWayId === targetRoadId);
  assert.equal(road.name, "新华路345弄");
  assert.equal(road.highway, "service");
  assert.equal(road.lanes, null);
  for (const key of ["width", "access", "service", "surface"]) {
    assert.equal(key in road, false, key);
  }
  const contract = gitBlob(audit.sources.roadSurfaceContract.gitBlob);
  assert.match(
    contract,
    /service:\s*\{\s*width:\s*0\.5\s*\*\s*XINHUA_ENVIRONMENT_SCALE/,
  );
  assert.match(contract, /return\s+0\.5\s*\*\s*XINHUA_ENVIRONMENT_SCALE/);
  assert.equal(audit.overlapConstraint.currentRenderedFullWidthSceneUnits, 2.5);
  assert.equal(audit.overlapConstraint.currentRenderedFullWidthMeters, 6.75);
});

test("压占与反推宽度可复算，但反推阈值不是道路授权", () => {
  const constraint = gitJson("priorMapConstraint");
  const road = constraint.roadConstraint;
  const distance = road.physicalFootprintToCenterline.sceneUnits;
  const currentWidth = road.runtimeRenderedFullWidthSceneUnits;
  const maximumWidth = distance * 2;
  const overlap = currentWidth / 2 - distance;
  const reduction = currentWidth - maximumWidth;
  assert.equal(maximumWidth, 1.6947298546235958);
  assert.equal(overlap, 0.4026350726882021);
  assert.equal(reduction, 0.8052701453764042);
  assert.equal(reduction * 2.7, 2.1742293925162913);
  assert.equal(
    reduction / currentWidth * 100,
    audit.overlapConstraint.requiredFullWidthReductionPercent,
  );
  assert.equal(audit.overlapConstraint.thresholdIsAuthorizedWidth, false);
  assert.equal(constraint.candidateAnalysis.roadWidthCalibration.status,
    "blocked-missing-measured-width");
  assert.equal(constraint.candidateAnalysis.placementAdjustment.status,
    "rejected");
});

test("本地照片和 manifest 明确不能给出 full road width", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(
    ROOT,
    audit.sources.referenceManifest.path,
  ), "utf8"));
  assert.equal(manifest.references.length, 2);
  assert.ok(manifest.unknown.includes("新华路345弄的实际路面宽度"));
  assert.equal(manifest.viewCoverageMatrix.siteRelationship.status, "partial");
  assert.equal(
    audit.localPlanAndPhotoEvidence.frontReference.canAuthorizeWidth,
    false,
  );
  assert.ok(
    audit.localPlanAndPhotoEvidence.frontReference.missingForWidth
      .includes("opposite-road-edge"),
  );
  assert.equal(
    audit.localPlanAndPhotoEvidence.toyHouseReference.canAuthorizeRoadWidth,
    false,
  );
});

test("正式 disposition 禁止缩路、移楼、重建或晋级", () => {
  assert.equal(
    audit.verdict.status,
    "blocked-local-rescue-exhausted-road-width-and-relation-coverage-unavailable",
  );
  assert.equal(audit.formalDisposition.localRescueExhausted, true);
  assert.equal(audit.formalDisposition.formalRoadSurfaceAcceptance, "blocked");
  assert.equal(audit.formalDisposition.formalMapAcceptance, "blocked");
  assert.equal(audit.formalDisposition.massingRebuildAuthorized, false);
  assert.equal(audit.formalDisposition.buildingTransformChangeAuthorized, false);
  assert.equal(audit.formalDisposition.roadContractChangeAuthorized, false);
  assert.equal(audit.formalDisposition.heroAuthorized, false);
  assert.equal(audit.formalDisposition.identityAuthorized, false);
  assert.equal(audit.formalDisposition.runtimePromotionAllowed, false);
  assert.match(
    audit.minimumEvidenceToChangeDisposition.preferredLocalImport,
    /full-history.*relation\/member/,
  );
  assert.match(
    audit.minimumEvidenceToChangeDisposition.preferredAuthoritativeArtifact,
    /site\/road plan/,
  );
});
