import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUDIT_PATH = path.join(
  ROOT,
  "docs/research/shanghai-orchestra-osm-membership-rescue-audit.json",
);
const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, "utf8"));
const candidatePattern = /86450516[2-9]|864505170/g;
const subjectPattern =
  /上海民族乐团|Shanghai Orchestra|shanghai-orchestra|新华路\s*336|Xinhua Road\s*336/gi;
const identityKeys = [
  "name",
  "name:en",
  "addr:street",
  "addr:housenumber",
  "operator",
  "ref",
];

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: options.encoding ?? "utf8",
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

function uniqueMatches(content, pattern) {
  return [...new Set(content.match(pattern) ?? [])].sort();
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

function parseOvertureFeatures() {
  return JSON.parse(gitBlob(audit.sources.overtureImport.gitBlob)).features;
}

test("rescue 审计只锁本栋文件，共享交叉输入使用 baseline Git blob", () => {
  assert.equal(
    audit.baseline.worktreeHeadBeforeAudit,
    "ca75506635ce483f0b0bf8adbee253feede71b1a",
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
  assert.equal(audit.scope.publicRuntimeModified, false);
});

test("固定三棵 Git data 树的31路径和30 blob 可复算且无隐藏历史版本", () => {
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
  assert.equal(audit.corpusInventory.currentTrackedRawFixtureCacheFiles, 0);
  assert.equal(
    audit.corpusInventory.dataPathsWithMoreThanOneHistoricalBlobVersion,
    0,
  );
});

test("全部 data blob 中候选与主体没有共现，命名地址查询返回零绑定", () => {
  const entries = audit.corpusInventory.fixedTreeCommits
    .flatMap(dataTreeEntries);
  const uniqueBlobs = [...new Set(
    entries.map((entry) => entry.split("\t")[0]),
  )];
  const candidateBlobs = [];
  const subjectBlobs = [];
  const cooccurrenceBlobs = [];
  for (const objectId of uniqueBlobs) {
    const content = gitBlob(objectId);
    const candidateMatches = uniqueMatches(content, candidatePattern);
    const subjectMatches = uniqueMatches(content, subjectPattern);
    if (candidateMatches.length > 0) candidateBlobs.push(objectId);
    if (subjectMatches.length > 0) subjectBlobs.push(objectId);
    if (candidateMatches.length > 0 && subjectMatches.length > 0) {
      cooccurrenceBlobs.push(objectId);
    }
  }
  assert.deepEqual(
    candidateBlobs.sort(),
    [...audit.corpusInventory.candidateBearingBlobObjects].sort(),
  );
  assert.deepEqual(
    subjectBlobs.sort(),
    [...audit.corpusInventory.subjectOrAddressBearingDataBlobObjects].sort(),
  );
  assert.equal(candidateBlobs.length, 9);
  assert.equal(subjectBlobs.length, 1);
  assert.equal(cooccurrenceBlobs.length, 0);
  const namedQuery = gitJson("namedAddressQuery");
  assert.match(namedQuery.research.query, /上海民族乐团/);
  assert.match(namedQuery.research.query, /336/);
  const matches = namedQuery.elements.filter((element) => (
    /上海民族乐团|民族乐团/.test(element.tags?.name ?? "")
    || (
      element.tags?.["addr:street"] === "新华路"
      && /^(336|336号)$/.test(element.tags?.["addr:housenumber"] ?? "")
    )
  ));
  assert.equal(matches.length, 0);
});

test("当前与 Recovery 九个 way 都只有 building=yes，relation members 未被保存", () => {
  const current = gitJson("currentBuildingSnapshot");
  const recovery = gitJson("recoveryRawBuildingQuery");
  const targetIds = new Set(audit.candidateUniverse.allAdjacentWays);
  for (const source of [current, recovery]) {
    const targetWays = source.elements.filter(
      (element) => element.type === "way" && targetIds.has(element.id),
    );
    assert.equal(targetWays.length, 9);
    for (const way of targetWays) {
      assert.deepEqual(way.tags, { building: "yes" });
      assert.equal(
        identityKeys.some((key) => key in (way.tags ?? {})),
        false,
      );
    }
  }
  const fixedData = audit.corpusInventory.fixedTreeCommits
    .flatMap(dataTreeEntries);
  const uniqueBlobs = [...new Set(
    fixedData.map((entry) => entry.split("\t")[0]),
  )];
  const parseableObjects = [];
  for (const objectId of uniqueBlobs) {
    const content = gitBlob(objectId);
    try {
      for (const line of content.trim().split("\n")) {
        if (line.startsWith("{") && !content.trim().startsWith("{\n")) {
          parseableObjects.push(...nestedObjects(JSON.parse(line)));
        }
      }
      if (content.trim().startsWith("{\n") || content.trim().startsWith("[")) {
        parseableObjects.push(...nestedObjects(JSON.parse(content)));
      }
    } catch {
      // zip、txt 或多值 JSON 流不是 relation/member 证据。
    }
  }
  const relations = parseableObjects.filter(
    (entry) => entry.type === "relation",
  );
  const actualMemberRelations = relations.filter(
    (entry) => Array.isArray(entry.members),
  );
  const targetMemberRelations = actualMemberRelations.filter(
    (entry) => entry.members.some(
      (member) => member.type === "way" && targetIds.has(member.ref),
    ),
  );
  assert.equal(relations.length, 40);
  assert.equal(actualMemberRelations.length, 0);
  assert.equal(targetMemberRelations.length, 0);
  assert.equal(
    audit.osmTagAndRelationFindings.allFixedDataTrees
      .relationElementsWithSerializedMembers,
    0,
  );
  assert.equal(
    audit.osmTagAndRelationFindings.allFixedDataTrees
      .relationMembershipCoverage,
    "unavailable-no-serialized-members",
  );
});

test("其他 POI 半径查询只重复匿名 way，不能冒充乐团查询", () => {
  const requested = gitJson("requestedPoisSnapshot");
  const targetIds = new Set(audit.candidateUniverse.allAdjacentWays);
  const records = requested.targets.flatMap((target) => (
    target.overpass.elements
      .filter((element) => element.type === "way" && targetIds.has(element.id))
      .map((element) => ({
        targetId: target.target.id,
        id: element.id,
        tags: element.tags,
      }))
  ));
  assert.equal(records.length, 16);
  assert.equal(new Set(records.map((entry) => entry.id)).size, 8);
  assert.deepEqual(
    [...new Set(records.map((entry) => entry.targetId))].sort(),
    ["debi-fahua-525", "fics-xinhua-365", "xinhua-pocket-park"],
  );
  assert.equal(
    records.some((entry) => entry.targetId === "shanghai-orchestra"),
    false,
  );
  for (const record of records) {
    assert.deepEqual(record.tags, { building: "yes" });
  }
});

test("Overture 导入只提供九个 OSM @1 footprint，不含身份或删除历史", () => {
  const targetIds = new Set(audit.candidateUniverse.allAdjacentWays);
  const targetFeatures = parseOvertureFeatures().filter((feature) => (
    feature.properties.sources.some((source) => {
      const match = source.record_id?.match(/^w(\d+)@(\d+)$/);
      return match && targetIds.has(Number(match[1]));
    })
  ));
  assert.equal(targetFeatures.length, 9);
  const recordIds = targetFeatures
    .flatMap((feature) => feature.properties.sources)
    .map((source) => source.record_id)
    .sort();
  assert.deepEqual(
    recordIds,
    [...audit.importAndDeletionFindings.overtureImport.recordIds].sort(),
  );
  for (const feature of targetFeatures) {
    assert.equal(feature.type, "Feature");
    assert.equal(feature.geometry.type, "Polygon");
    assert.equal(feature.properties.version, 1);
    assert.equal(feature.properties.sources[0].dataset, "OpenStreetMap");
    assert.equal(
      feature.properties.sources[0].update_time,
      "2020-10-28T02:00:44.000Z",
    );
    assert.equal(
      identityKeys.some((key) => key in feature.properties),
      false,
    );
  }
  for (const objectId of audit.corpusInventory.candidateBearingBlobObjects) {
    const content = gitBlob(objectId);
    assert.doesNotMatch(content, /"deleted"\s*:\s*true/i);
    assert.doesNotMatch(content, /"visible"\s*:\s*false/i);
  }
  assert.equal(
    audit.importAndDeletionFindings.historicalDeletionMarkers
      .osmFullHistoryArtifactsFound,
    0,
  );
});

test("一、五、七 way 三种历史作者范围冲突，均不能升级为 OSM membership", () => {
  const recoveryMapAudit = gitJson("recoveryMapBindingAudit");
  const singleWay = nestedObjects(recoveryMapAudit)
    .find((entry) => entry.runtimeId === "shanghai-orchestra");
  assert.equal(singleWay.decision.status, "candidate-pending");
  assert.equal(singleWay.decision.confidence, "low");
  assert.deepEqual(
    singleWay.osmWayCandidates.map((entry) => entry.osmId),
    [864505166],
  );

  const binding = JSON.parse(
    fs.readFileSync(path.join(ROOT, audit.sources.osmBinding.path), "utf8"),
  );
  assert.equal(binding.candidateStatus, "geometry-bound-ownership-blocked");
  assert.equal(binding.membershipConfidence, "low");
  assert.deepEqual(
    binding.candidateWayIds,
    audit.candidateUniverse.currentFiveWayDiagnosticSet,
  );

  const overview = gitJson("overviewMassingData");
  const sevenWays = overview.excludedBuildings
    .filter((entry) => entry.replacementPoiId === "shanghai-orchestra")
    .map((entry) => Number(entry.assetId.replace("way/", "")))
    .sort((left, right) => left - right);
  const overviewBinding = nestedObjects(overview)
    .find((entry) => entry.poiId === "shanghai-orchestra");
  assert.deepEqual(
    sevenWays,
    [864505163, 864505164, 864505165, 864505166, 864505167, 864505168, 864505169],
  );
  assert.equal(overviewBinding.source, "inferred-runtime-placement");
  assert.deepEqual(overviewBinding.osmRefs, []);

  for (const hypothesis of audit.historicalScopeHypotheses) {
    assert.equal(hypothesis.canBindMembership, false);
  }
  assert.equal(
    new Set(audit.historicalScopeHypotheses.map(
      (hypothesis) => hypothesis.wayIds.length,
    )).size,
    3,
  );
});

test("正式 disposition 保持不可提升，并精确声明最小外部或用户补证", () => {
  assert.equal(
    audit.verdict.status,
    "blocked-membership-rescue-exhausted-no-authoritative-osm-membership-local-evidence",
  );
  assert.equal(audit.formalDisposition.localRescueExhausted, true);
  assert.equal(audit.formalDisposition.memberBinding, "blocked");
  assert.equal(audit.formalDisposition.exclusiveCompoundBoundary, "blocked");
  assert.equal(audit.formalDisposition.formalMapAcceptance, "blocked");
  assert.equal(audit.formalDisposition.massingRebuildAuthorized, false);
  assert.equal(audit.formalDisposition.heroAuthorized, false);
  assert.equal(audit.formalDisposition.identityAuthorized, false);
  assert.equal(audit.formalDisposition.runtimePromotionAllowed, false);
  assert.match(
    audit.minimumEvidenceToChangeDisposition.preferredLocalImport,
    /full-history|relation\/member/,
  );
  assert.match(
    audit.minimumEvidenceToChangeDisposition.preferredAuthoritativeArtifact,
    /site plan/,
  );
  assert.match(
    audit.minimumEvidenceToChangeDisposition.acceptableUserAuthority,
    /included and excluded way/,
  );
  assert.ok(
    audit.minimumEvidenceToChangeDisposition.minimumFields.includes(
      "included-way-ids",
    ),
  );
  assert.ok(
    audit.minimumEvidenceToChangeDisposition.minimumFields.includes(
      "excluded-way-ids",
    ),
  );
});
