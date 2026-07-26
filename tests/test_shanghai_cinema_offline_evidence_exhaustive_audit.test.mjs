import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath =
  "docs/research/shanghai-cinema-offline-evidence-exhaustive-audit-2026-07-27.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256File(path) {
  const source = await readFile(path);
  return createHash("sha256").update(source).digest("hex");
}

test("上海影城离线审计严格保持只读范围和既有合格阶段", async () => {
  const audit = await readJson(auditPath);
  assert.equal(audit.assetId, "shanghai-cinema");
  assert.equal(
    audit.status,
    "offline-unregistered-real-closeups-found-no-calibratable-boundary-evidence",
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
  for (const stage of ["hero", "identity", "massing", "mcp1", "mcp2", "mcp3", "threeRuntime"]) {
    assert.match(audit.retainedStagePolicy[stage], /retained-no-rerun/);
  }
});

test("上海影城三个根目录与四个不可变快照的穷尽范围固定", async () => {
  const audit = await readJson(auditPath);
  assert.deepEqual(
    audit.rootInventoryAtCutoff.map(
      ({ fileCount, byteCount, basenameOrPathHits, textContentHits, mediaFileCount }) => ({
        fileCount,
        byteCount,
        basenameOrPathHits,
        textContentHits,
        mediaFileCount,
      }),
    ),
    [
      {
        fileCount: 6184,
        byteCount: 2707059994,
        basenameOrPathHits: 508,
        textContentHits: 250,
        mediaFileCount: 4671,
      },
      {
        fileCount: 1671,
        byteCount: 691388513,
        basenameOrPathHits: 161,
        textContentHits: 81,
        mediaFileCount: 1225,
      },
      {
        fileCount: 316,
        byteCount: 4481838791,
        basenameOrPathHits: 4,
        textContentHits: 10,
        mediaFileCount: 204,
      },
    ],
  );
  assert.deepEqual(
    audit.snapshotIntegrity.map(({ snapshotId, declaredFileCount, fullChecksumVerification }) => ({
      snapshotId,
      declaredFileCount,
      fullChecksumVerification,
    })),
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
    ],
  );
  assert.equal(audit.searchMethod.repositoryRegistrationCheck.repositoryImageFilesHashed, 862);
  assert.equal(audit.searchMethod.repositoryRegistrationCheck.newCandidateShaMatches, 0);
});

test("早期十四张候选按 SHA 去重后只保留三张未登记实拍", async () => {
  const audit = await readJson(auditPath);
  assert.equal(audit.earlyCandidateSet.fileCount, 14);
  assert.equal(audit.earlyCandidateSet.uniqueShaCount, 13);
  assert.equal(audit.earlyCandidateSet.shaGroups.length, 13);
  assert.equal(audit.newUnregisteredRealMedia.length, 3);
  assert.deepEqual(
    audit.newUnregisteredRealMedia.map(({ file, sha256 }) => ({ file, sha256 })),
    [
      {
        file: "test_shanghai_cinema_real.png",
        sha256: "66cdf1b7e6a60b2dd600fb1b78f6a30cf685d192cfc0b1b31ae9d25bb841fd17",
      },
      {
        file: "test_shanghai_cinema_real_747.jpg",
        sha256: "ed68f6a16e5b9ca9265890a49bd5d1dbfe101bbb20f82064f3589739d51c6894",
      },
      {
        file: "test_shanghai_cinema_real_749.jpg",
        sha256: "034c55a4d410061af08871c926fb22d785d1708a87d0ba5e48a1e336888fc0f5",
      },
    ],
  );
  assert.equal(
    audit.earlyCandidateSet.shaGroups.filter(
      ({ classification }) => classification === "wrong-subject-shanghai-film-art-center",
    ).length,
    2,
  );
  assert.equal(
    audit.earlyCandidateSet.shaGroups.filter(
      ({ classification }) => classification === "real-photo-unregistered-source-unbound",
    ).length,
    3,
  );
  assert.equal(audit.verdict.newTraceableRealPhotosFound, 0);
});

test("旧 XHS manifest 的上海影城入口标签被原图反证", async () => {
  const audit = await readJson(auditPath);
  const xhs = audit.legacyXhsAdjudication;
  assert.equal(xhs.manifest.sourceCount, 6);
  assert.equal(xhs.manifest.rawImageCount, 88);
  assert.equal(xhs.orderedRoutePost.postId, "67fcf03c000000000b02d804");
  assert.equal(xhs.orderedRoutePost.rawImageCount, 14);
  assert.equal(
    xhs.orderedRoutePost.actualMedia.sha256,
    "22ea14990cf4e5433f4b375d98a6e3b37edb6d9f1092f3373e5922dc7f9864a2",
  );
  assert.equal(
    xhs.orderedRoutePost.actualMedia.classification,
    "wrong-subject-character-and-live-shopfront",
  );
  assert.equal(audit.verdict.xhsManifestSubjectErrorFound, true);
});

test("新增近景不伪造 Cinema 2、酒店边界或双点地图锚点", async () => {
  const audit = await readJson(auditPath);
  assert.equal(audit.verdict.newRearFacadeEvidenceFound, false);
  assert.equal(audit.verdict.qualifyingCinema2BoundaryFound, false);
  assert.equal(audit.verdict.qualifyingCrownePlazaBoundaryFound, false);
  assert.equal(audit.verdict.qualifyingTwoPointAnchorFound, false);
  assert.equal(audit.verdict.formalMapAcceptanceAuthorized, false);
  assert.equal(audit.verdict.buildingComplete, false);
  assert.equal(audit.verdict.gateChange, "evidence-ledger-expanded-only");
  assert.equal(audit.retainedStagePolicy.exactMapAnchor, "blocked-no-change");
  assert.equal(audit.retainedStagePolicy.runtimePromotionOrDisableAuthorized, false);
  assert.ok(
    audit.acceptanceEvaluation.some(
      ({ category, result }) =>
        category === "cinema-2-and-crowne-plaza-boundary" && result === "blocked",
    ),
  );
});

test("外置盘挂载时复核候选、误标原图和快照索引指纹", async (t) => {
  const audit = await readJson(auditPath);
  try {
    await access("/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/");
    await access("/Volumes/plugin/3D_Modeling_ThreeJS_Knowledge_Base/");
  } catch {
    t.skip("外置盘未挂载，仅保留仓内审计合同检查");
    return;
  }

  for (const media of audit.newUnregisteredRealMedia) {
    assert.equal(await sha256File(media.path), media.sha256, media.path);
  }
  assert.equal(
    await sha256File(audit.legacyXhsAdjudication.orderedRoutePost.actualMedia.path),
    audit.legacyXhsAdjudication.orderedRoutePost.actualMedia.sha256,
  );
  assert.equal(
    await sha256File(audit.legacyXhsAdjudication.manifest.path),
    audit.legacyXhsAdjudication.manifest.sha256,
  );
  assert.equal(
    await sha256File(audit.legacyXhsAdjudication.readme.path),
    audit.legacyXhsAdjudication.readme.sha256,
  );
  for (const snapshot of audit.snapshotIntegrity) {
    assert.equal(await sha256File(snapshot.manifestPath), snapshot.manifestSha256);
    assert.equal(await sha256File(snapshot.checksumPath), snapshot.checksumSha256);
  }

  const earlyCandidates = (await readdir(audit.earlyCandidateSet.root))
    .filter((name) => name.startsWith("test_shanghai_cinema_"))
    .sort();
  assert.equal(earlyCandidates.length, 14);

  const xhsRawRoot =
    "/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/legacy-imports/knowledge-base/wander-xinhua/nonbuilding-street-life-xhs-2026-07-25/raw/xhs/";
  const sourceIds = (await readdir(xhsRawRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.equal(sourceIds.length, 6);
  let rawImageCount = 0;
  for (const sourceId of sourceIds) {
    rawImageCount += (await readdir(`${xhsRawRoot}${sourceId}/`))
      .filter((name) => name.endsWith(".webp")).length;
  }
  assert.equal(rawImageCount, 88);
});
