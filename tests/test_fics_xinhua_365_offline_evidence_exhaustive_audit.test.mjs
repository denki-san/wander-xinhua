import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath =
  "docs/research/fics-xinhua-365-offline-evidence-exhaustive-audit-2026-07-27.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256File(path) {
  const source = await readFile(path);
  return createHash("sha256").update(source).digest("hex");
}

test("FICS 离线审计严格保持只读范围和既有合格阶段", async () => {
  const audit = await readJson(auditPath);
  assert.equal(audit.assetId, "fics-xinhua-365");
  assert.equal(
    audit.status,
    "offline-hidden-xhs-photos-found-map-membership-and-service-way-still-blocked",
  );
  assert.equal(audit.scope.browserAccessed, false);
  assert.equal(audit.scope.networkAccessed, false);
  assert.equal(audit.scope.xiaohongshuAccessed, false);
  assert.equal(audit.scope.externalFilesWritten, false);
  assert.equal(audit.scope.externalFilesMovedOrDeleted, false);
  assert.equal(audit.scope.repositoryAssetsModified, false);
  assert.equal(audit.scope.sharedFilesModified, false);
  assert.equal(audit.scope.recoveryOrHoldModified, false);
  assert.equal(audit.retainedStagePolicy.recoveryMassing, "pass-retained-no-rerun");
  assert.equal(audit.retainedStagePolicy.mcp1, "pass-shape-only-retained-no-rerun");
  assert.equal(audit.retainedStagePolicy.projection, "pass-retained-no-rerun");
  assert.equal(
    audit.retainedStagePolicy.threeAndCollisionDiagnostic,
    "pass-diagnostic-retained-no-rerun",
  );
});

test("FICS 三处外置根目录扫描规模、快照校验和重复证据口径固定", async () => {
  const audit = await readJson(auditPath);
  assert.deepEqual(
    audit.rootInventory.map(({ fileCount, byteCount, basenameOrPathHits, textContentHits }) => ({
      fileCount,
      byteCount,
      basenameOrPathHits,
      textContentHits,
    })),
    [
      {
        fileCount: 5023,
        byteCount: 2233188244,
        basenameOrPathHits: 62,
        textContentHits: 88,
      },
      {
        fileCount: 1671,
        byteCount: 691388513,
        basenameOrPathHits: 18,
        textContentHits: 25,
      },
      {
        fileCount: 315,
        byteCount: 4481830524,
        basenameOrPathHits: 0,
        textContentHits: 5,
      },
    ],
  );
  assert.equal(audit.snapshotIntegrity.length, 3);
  assert.ok(
    audit.snapshotIntegrity.every(
      ({ fullChecksumVerification }) => fullChecksumVerification === "pass",
    ),
  );
  assert.equal(audit.existingKnownMaterial.uniqueReferenceImages, 6);
  assert.equal(audit.existingKnownMaterial.immutableDuplicateCopiesPerImage, 5);
  assert.equal(audit.existingKnownMaterial.registeredRealPhotos.length, 3);
  assert.equal(audit.existingKnownMaterial.briefOnlyRenderings.length, 3);
});

test("隐藏旧 XHS 帖子确有两张未登记实拍和一张路线图", async () => {
  const audit = await readJson(auditPath);
  const source = audit.hiddenLegacyXhsSource;
  assert.equal(source.status, "found-unregistered-for-this-building");
  assert.equal(source.postId, "67fcf03c000000000b02d804");
  assert.equal(source.manifest.postImageCount, 14);
  assert.equal(source.manifest.rawPostImageCount, 14);
  assert.equal(source.manifest.postImageSetComplete, true);
  assert.equal(source.repositoryRegistrationAudit.mediaFilesHashed, 849);
  assert.equal(source.repositoryRegistrationAudit.matchingPhotoShaCount, 0);
  assert.deepEqual(
    source.relevantMedia.map(({ file, classification }) => ({ file, classification })),
    [
      { file: "image-01.webp", classification: "real-photo" },
      { file: "image-08.webp", classification: "hand-drawn-route-map" },
      { file: "image-10.webp", classification: "real-photo" },
    ],
  );
  assert.equal(audit.verdict.newUnregisteredRealPhotosFound, 2);
  assert.equal(audit.verdict.newUnregisteredContextFramesFound, 1);
});

test("新照片只补充编号场景和内部窄巷，不伪造 OSM 绑定", async () => {
  const audit = await readJson(auditPath);
  assert.ok(audit.evidenceClassification.observed.some((entry) => entry.includes("numerals 6 and 9")));
  assert.ok(
    audit.evidenceClassification.unknown.some((entry) => entry.includes("way/577252268")),
  );
  assert.equal(audit.verdict.qualifyingMemberBindingFound, false);
  assert.equal(audit.verdict.qualifyingServiceWayBindingFound, false);
  assert.equal(audit.verdict.qualifyingEntranceContinuityFound, false);
  assert.equal(audit.verdict.qualifyingCalibratableFootprintFound, false);
  assert.equal(audit.verdict.buildingComplete, false);
  assert.equal(audit.retainedStagePolicy.runtimePromotionOrDisableAuthorized, false);
  assert.ok(
    audit.acceptanceEvaluation.some(
      ({ category, result }) =>
        category === "way-577252268-surface-width-cover-access"
        && result === "partial-unbound-observation",
    ),
  );
});

test("外置盘挂载时复核隐藏媒体、manifest 与快照索引指纹", async (t) => {
  const audit = await readJson(auditPath);
  try {
    await access("/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/");
    await access("/Volumes/plugin/3D_Modeling_ThreeJS_Knowledge_Base/");
  } catch {
    t.skip("外置盘未挂载，仅保留仓内审计合同检查");
    return;
  }

  assert.equal(
    await sha256File(audit.hiddenLegacyXhsSource.manifest.path),
    audit.hiddenLegacyXhsSource.manifest.sha256,
  );
  assert.equal(
    await sha256File(audit.hiddenLegacyXhsSource.sourceReadme.path),
    audit.hiddenLegacyXhsSource.sourceReadme.sha256,
  );
  for (const media of audit.hiddenLegacyXhsSource.relevantMedia) {
    assert.equal(await sha256File(media.path), media.sha256, media.path);
  }
  for (const snapshot of audit.snapshotIntegrity) {
    assert.equal(await sha256File(snapshot.manifestPath), snapshot.manifestSha256);
    assert.equal(await sha256File(snapshot.checksumPath), snapshot.checksumSha256);
  }

  const rawFiles = await readdir(audit.hiddenLegacyXhsSource.rawMediaRoot);
  assert.deepEqual(
    rawFiles.sort(),
    Array.from({ length: 14 }, (_, index) => `image-${String(index + 1).padStart(2, "0")}.webp`),
  );
});
