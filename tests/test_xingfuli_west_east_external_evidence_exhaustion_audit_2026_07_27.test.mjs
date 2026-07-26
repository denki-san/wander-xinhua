import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = new URL("../", import.meta.url);
const rootPath = fileURLToPath(root);
const auditPath =
  "docs/research/xingfuli-west-east-external-evidence-exhaustion-audit-2026-07-27.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256File(pathOrUrl) {
  const source = await readFile(pathOrUrl);
  return createHash("sha256").update(source).digest("hex");
}

function sha256Buffer(source) {
  return createHash("sha256").update(source).digest("hex");
}

async function readIntegratedInput(input) {
  const localUrl = new URL(input.path, root);
  if (existsSync(localUrl)) return readFile(localUrl);
  return execFileSync(
    "git",
    ["show", `${input.integratedCommit}:${input.path}`],
    { cwd: rootPath },
  );
}

test("幸福里西东联合审计锁定用户九图未物化边界与两栋地图裁决", async () => {
  const audit = await readJson(auditPath);
  assert.deepEqual(audit.assetIds, ["xingfuli-west", "xingfuli-east"]);
  for (const [key, input] of Object.entries(audit.repositoryInputs)) {
    const source = key === "mainWindowUserPhotoMaterializationAudit"
      ? await readIntegratedInput(input)
      : await readFile(new URL(input.path, root));
    assert.equal(sha256Buffer(source), input.sha256, input.path);
  }

  assert.equal(audit.userNinePhotoBoundary.attributableOriginalFileCount, 0);
  assert.equal(audit.userNinePhotoBoundary.readableOriginalFileCount, 0);
  assert.equal(audit.userNinePhotoBoundary.routeSlotsMapped, 0);
  assert.equal(audit.userNinePhotoBoundary.publicEvidenceMaySubstitute, false);
  assert.equal(audit.userNinePhotoBoundary.ordinaryImgOrCacheMaySubstitute, false);

  const source = audit.independentPublicSource;
  assert.equal(source.postId, "682071e0000000000303e0ba");
  assert.equal(source.rawFiles.length, 12);
  assert.equal(
    new Set(source.rawFiles.map(({ sha256 }) => sha256)).size,
    12,
  );
  assert.equal(
    source.rawFiles.filter(
      ({ safeAssignment }) =>
        safeAssignment === "xingfuli-east-panyu-road-entrance",
    ).length,
    1,
  );
  assert.equal(
    source.rawFiles.filter(
      ({ safeAssignment }) =>
        safeAssignment === "xingfuli-interior-unassigned",
    ).length,
    11,
  );
  assert.equal(source.adjudicationBoundary.userSequenceSlotMatchCount, 0);

  assert.equal(
    audit.gateAdjudication.west.mapStatus,
    "blocked-pedestrian-way-400066625-ground-level-passage-unknown",
  );
  assert.equal(
    audit.gateAdjudication.east.independentPublicRoadIdentity,
    "pass-visible-panyu-road-381-address-2025",
  );
  assert.equal(
    audit.gateAdjudication.east.sameEastExitContinuity,
    "blocked-no-continuous-inner-lane-threshold-road-chain",
  );
  assert.equal(audit.gateAdjudication.west.mapClosed, false);
  assert.equal(audit.gateAdjudication.east.mapClosed, false);
  assert.equal(audit.verdict.publicMapMutationAuthorized, false);
});

test("幸福里西东既有三档 SHA 不变，已合格 MCP 与 Three.js 门只保留不重跑", async () => {
  const audit = await readJson(auditPath);
  for (const building of Object.values(audit.retainedAcceptedStages)) {
    for (const tier of ["hero", "identityV2", "massingV2"]) {
      assert.equal(
        await sha256File(new URL(building[tier].path, root)),
        building[tier].sha256,
        building[tier].path,
      );
    }
    assert.equal(building.lineage, "pass-retained");
    assert.equal(building.mcp1Mcp2Mcp3, "pass-retained-no-rerun");
    assert.equal(
      building.threeTierFallbackPerformanceCollision,
      "pass-retained-no-rerun",
    );
  }
  assert.equal(audit.scope.acceptedStagesRebuilt, false);
  assert.equal(audit.verdict.acceptedAssetsChanged, false);
});

test("U盘挂载时校验独立 12 图 source linkage、六个重复副本与最新快照去重", async (t) => {
  const audit = await readJson(auditPath);
  const source = audit.independentPublicSource;
  if (!existsSync(source.rawArchive)) {
    t.skip("外置动态证据盘未挂载，仓库裁决与三档 SHA 仍由其他测试锁定");
    return;
  }

  for (const input of Object.values(source.sourceEvidence)) {
    if (!input.path) continue;
    assert.equal(await sha256File(input.path), input.sha256, input.path);
  }

  const sourceManifest = JSON.parse(
    await readFile(source.sourceEvidence.oldKnowledgeBaseManifest.path, "utf8"),
  );
  const post = sourceManifest.sources.find(
    ({ postId }) => postId === source.postId,
  );
  assert.ok(post, source.postId);
  assert.deepEqual(
    Object.keys(post.images).sort(),
    source.rawFiles.map(({ file }) => file).sort(),
  );

  for (const rawFile of source.rawFiles) {
    const path = `${source.rawArchive}/${rawFile.file}`;
    const contents = await readFile(path);
    assert.equal(contents.byteLength, rawFile.bytes, path);
    assert.equal(sha256Buffer(contents), rawFile.sha256, path);
  }

  const selectedManifest = JSON.parse(
    await readFile(source.sourceEvidence.selectedCopyManifest.path, "utf8"),
  );
  const selectedRoot =
    "/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/2026-07-26-ad37273/repository/docs/research/assets/nonbuilding-evidence-pilot/xingfuli-current-street-furniture";
  for (const copy of source.repositorySnapshotCopyDedup) {
    assert.ok(
      selectedManifest.selectedImages.some(
        ({ rawFile, localPath }) =>
          rawFile === copy.rawFile && localPath.endsWith(copy.copyFile),
      ),
      copy.copyFile,
    );
    assert.equal(
      await sha256File(`${selectedRoot}/${copy.copyFile}`),
      copy.sha256,
      copy.copyFile,
    );
  }

  const snapshotDedup = audit.offlineInventory.latestSnapshotTargetDedup;
  const readTargetRows = async (snapshotId) => {
    const checksumPath =
      `/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/${snapshotId}/SHA256SUMS`;
    const rows = (await readFile(checksumPath, "utf8"))
      .split("\n")
      .filter((row) => /xingfuli/i.test(row))
      .sort();
    return `${rows.join("\n")}\n`;
  };
  const previousRows = await readTargetRows(snapshotDedup.previousSnapshot);
  const latestRows = await readTargetRows(snapshotDedup.latestSnapshot);
  assert.equal(previousRows, latestRows);
  assert.equal(previousRows.trimEnd().split("\n").length, snapshotDedup.rowCountEach);
  assert.equal(sha256Buffer(previousRows), snapshotDedup.sortedRowsSha256);
});
