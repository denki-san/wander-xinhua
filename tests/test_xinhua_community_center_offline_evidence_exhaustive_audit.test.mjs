import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath =
  "docs/research/xinhua-community-center-offline-evidence-exhaustive-audit-2026-07-27.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256File(path) {
  const source = await readFile(path);
  return createHash("sha256").update(source).digest("hex");
}

test("社区营造中心离线审计严格保持只读范围和既有合格阶段", async () => {
  const audit = await readJson(auditPath);
  assert.equal(audit.assetId, "xinhua-community-center");
  assert.equal(
    audit.status,
    "offline-traceable-entrance-detail-found-road-and-side-rear-gates-still-blocked",
  );
  assert.equal(audit.scope.browserAccessed, false);
  assert.equal(audit.scope.networkAccessed, false);
  assert.equal(audit.scope.xiaohongshuAccessed, false);
  assert.equal(audit.scope.externalFilesWritten, false);
  assert.equal(audit.scope.externalFilesMovedOrDeleted, false);
  assert.equal(audit.scope.repositoryAssetsModified, false);
  assert.equal(audit.scope.sharedFilesModified, false);
  assert.equal(audit.scope.recoveryOrHoldModified, false);
  assert.equal(audit.scope.modelBlendGeneratorModified, false);
  assert.equal(audit.scope.mcpMapRegistryRuntimeModified, false);
  assert.equal(audit.scope.qualifiedStageRerun, false);
  for (const stage of [
    "recovery",
    "massing",
    "mcp1",
    "threeRuntimeDiagnostic",
    "collisionDiagnostic",
  ]) {
    assert.match(audit.retainedStagePolicy[stage], /retained-no-rerun/);
  }
});

test("三个外置根目录和五个不可变快照的截止范围固定", async () => {
  const audit = await readJson(auditPath);
  assert.deepEqual(
    audit.rootInventoryAtCutoff.map(({ fileCount, byteCount }) => ({
      fileCount,
      byteCount,
    })),
    [
      { fileCount: 7348, byteCount: 3180987850 },
      { fileCount: 1671, byteCount: 691388513 },
      { fileCount: 316, byteCount: 4481838791 },
    ],
  );
  assert.deepEqual(
    audit.snapshotIntegrity.map(
      ({ snapshotId, declaredFileCount, fullChecksumVerification }) => ({
        snapshotId,
        declaredFileCount,
        fullChecksumVerification,
      }),
    ),
    [
      {
        snapshotId: "2026-07-26-ad37273",
        declaredFileCount: 979,
        fullChecksumVerification: "pass",
      },
      {
        snapshotId: "2026-07-26-5383f2a",
        declaredFileCount: 1210,
        fullChecksumVerification: "pass",
      },
      {
        snapshotId: "2026-07-26-b20494c",
        declaredFileCount: 1155,
        fullChecksumVerification: "pass",
      },
      {
        snapshotId: "2026-07-27-5c5fa52",
        declaredFileCount: 1159,
        fullChecksumVerification: "pass",
      },
      {
        snapshotId: "2026-07-27-a40fe03",
        declaredFileCount: 1162,
        fullChecksumVerification: "pass",
      },
    ],
  );
  assert.equal(
    audit.snapshotIntegrity.at(-1).verificationBasis,
    "direct 1162-file verification in this audit",
  );
});

test("旧 XHS 帖子的十八张原图逐张有唯一指纹和裁决", async () => {
  const audit = await readJson(auditPath);
  assert.equal(audit.legacyXhsSource.post.postId, "690b429000000000040023b7");
  assert.equal(audit.legacyXhsSource.post.rawImageCount, 18);
  assert.equal(audit.legacyXhsSource.post.uniqueShaCount, 18);
  assert.equal(audit.mediaAdjudication.length, 18);
  assert.equal(
    new Set(audit.mediaAdjudication.map(({ sha256 }) => sha256)).size,
    18,
  );
  assert.deepEqual(audit.classificationCounts, {
    realSameSubjectTraceableEntranceDetail: 1,
    realSameVenueAncillaryOrGarden: 2,
    realSameVenueInteriorOrContent: 13,
    wrongSubject: 1,
    participatoryMapNotSurvey: 1,
    total: 18,
  });
  assert.equal(
    audit.searchMethod.repositoryRegistrationCheck.repositoryImageFilesHashed,
    862,
  );
  assert.equal(
    audit.searchMethod.repositoryRegistrationCheck.newCandidateShaMatches,
    0,
  );
});

test("入口细节只扩充证据链且 FICS 误标被原图反证", async () => {
  const audit = await readJson(auditPath);
  const entrance = audit.mediaAdjudication.find(
    ({ file }) => file === "image-03.webp",
  );
  const wrongSubject = audit.mediaAdjudication.find(
    ({ file }) => file === "image-02.webp",
  );
  assert.equal(
    entrance.classification,
    "real-same-subject-traceable-entrance-detail-partial",
  );
  assert.equal(
    entrance.sha256,
    "e6967e7d572cf7c950c0660cfcea90210fd5a87c33cb3f868fb1ffb00b35fdbc",
  );
  assert.equal(wrongSubject.classification, "wrong-subject-fics-xinhua-365");
  assert.match(wrongSubject.observed, /FICS/);
  assert.equal(audit.verdict.newTraceableBuilding4EntranceDetailFound, true);
  assert.equal(audit.verdict.wrongSubjectManifestEntryFound, true);
  assert.equal(audit.verdict.newSideOrRearEvidenceFound, false);
});

test("参与式地图和入口近景不能伪造道路或双控制点验收", async () => {
  const audit = await readJson(auditPath);
  const participantMap = audit.mediaAdjudication.find(
    ({ file }) => file === "image-18.webp",
  );
  assert.equal(
    participantMap.classification,
    "participatory-activity-map-not-survey-or-geometric-control",
  );
  assert.equal(audit.roadContractEvaluation.satisfied.length, 0);
  assert.equal(audit.roadContractEvaluation.result, "blocked-no-change");
  assert.equal(audit.verdict.qualifyingServiceRoadEvidenceFound, false);
  assert.equal(audit.verdict.qualifyingDualControlEvidenceFound, false);
  assert.equal(audit.verdict.heroIdentityAuthorized, false);
  assert.equal(audit.verdict.formalMapAcceptanceAuthorized, false);
  assert.equal(audit.verdict.buildingComplete, false);
  assert.equal(audit.verdict.gateChange, "evidence-ledger-expanded-only");
  assert.equal(
    audit.retainedStagePolicy.roadWidthOrAlignmentChangeAuthorized,
    false,
  );
  assert.equal(
    audit.retainedStagePolicy.runtimePromotionOrDisableAuthorized,
    false,
  );
});

test("外置盘挂载时复核十八张原图、来源索引与快照指纹", async (t) => {
  const audit = await readJson(auditPath);
  try {
    await access("/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/");
    await access("/Volumes/plugin/3D_Modeling_ThreeJS_Knowledge_Base/");
  } catch {
    t.skip("外置盘未挂载，仅保留仓内审计合同检查");
    return;
  }

  assert.equal(
    await sha256File(audit.legacyXhsSource.manifest.path),
    audit.legacyXhsSource.manifest.sha256,
  );
  assert.equal(
    await sha256File(audit.legacyXhsSource.readme.path),
    audit.legacyXhsSource.readme.sha256,
  );
  assert.equal(
    await sha256File(audit.legacyXhsSource.legacyChecksumIndex.path),
    audit.legacyXhsSource.legacyChecksumIndex.sha256,
  );
  for (const snapshot of audit.snapshotIntegrity) {
    assert.equal(await sha256File(snapshot.manifestPath), snapshot.manifestSha256);
    assert.equal(await sha256File(snapshot.checksumPath), snapshot.checksumSha256);
  }

  const sourceRoot = audit.legacyXhsSource.post.rawRoot;
  const sourceImages = (await readdir(sourceRoot))
    .filter((name) => name.endsWith(".webp"))
    .sort();
  assert.deepEqual(
    sourceImages,
    Array.from(
      { length: 18 },
      (_, index) => `image-${String(index + 1).padStart(2, "0")}.webp`,
    ),
  );
  for (const media of audit.mediaAdjudication) {
    assert.equal(
      await sha256File(`${sourceRoot}${media.file}`),
      media.sha256,
      media.file,
    );
  }
});
