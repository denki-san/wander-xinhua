import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const CHECKPOINT_PATH = resolve(
  ROOT,
  "docs/research/xinhua-villas-329-massing-recovery-checkpoint.json",
);
const RECOVERY_RECORD_PATH = resolve(
  ROOT,
  "docs/research/build-records/tiers/xinhua-road/massing-v2/xinhua-villas-329-massing.json",
);
const REGISTRY_PATH = resolve(
  ROOT,
  "app/scene/xinhua-road-landmarks-data.json",
);
const FAST_MANIFEST_PATH = resolve(
  ROOT,
  "docs/research/building-pipeline-fast-mode.json",
);

async function sha256(filePath) {
  const contents = await readFile(filePath);
  return createHash("sha256").update(contents).digest("hex");
}

test("329弄 Recovery Massing-v2 只接续哈希与 blocker，不冒充地图门或 MCP1", async () => {
  const checkpoint = JSON.parse(await readFile(CHECKPOINT_PATH, "utf8"));
  const recoveryRecord = JSON.parse(await readFile(RECOVERY_RECORD_PATH, "utf8"));
  const registry = JSON.parse(await readFile(REGISTRY_PATH, "utf8"));
  const fastManifest = JSON.parse(await readFile(FAST_MANIFEST_PATH, "utf8"));
  const landmark = registry.landmarks.find(({ id }) => id === checkpoint.assetId);
  const fastBuilding = fastManifest.buildings.find(
    ({ id }) => id === checkpoint.assetId,
  );

  assert(landmark, "共享 registry 缺少 xinhua-villas-329");
  assert(fastBuilding, "Fast Mode manifest 缺少 xinhua-villas-329");
  assert.equal(
    checkpoint.sourceRecoveryCommit,
    "3044cd89f801250afcd477dfbcbc7da358bf4b11",
  );
  assert.equal(checkpoint.recoveryBuildRecord.runtimeGate, "pass");
  assert.equal(checkpoint.recoveryBuildRecord.mapAcceptance, "blocked");
  assert.equal(
    checkpoint.recoveryBuildRecord.mcp1,
    "pending-main-window-batch",
  );
  assert.equal(checkpoint.recoveryBuildRecord.mcp1ClaimFromRecovery, false);
  assert.equal(checkpoint.evidenceGate.status, "blocked-evidence");
  assert.equal(checkpoint.evidenceGate.massingAuthorized, false);
  assert.equal(checkpoint.mapGate.mapAcceptance, "blocked");
  assert.equal(checkpoint.mapGate.newRuntimeRun, false);
  assert.equal(checkpoint.mapGate.newBlenderRun, false);
  assert.equal(checkpoint.mapGate.newMcp1Run, false);
  assert.equal(checkpoint.checkpointResult, "blocked-with-sufficient-evidence-and-reproducible-recovery-lineage");

  assert.equal(recoveryRecord.glb.sha256, "f7ade44ba879dead433abd006603a613520af730d9a2a35dada412b99a0c3819");
  assert.equal(recoveryRecord.runtimeGate, "pass");
  assert.equal(recoveryRecord.mapAcceptance, "blocked");
  assert.equal(recoveryRecord.children.length, 5);
  for (const child of recoveryRecord.children) {
    assert.equal(child.candidateRole, "unbound-member-candidate");
    assert.equal(
      child.heightEvidence,
      "unknown-runtime-fallback-not-evidence",
    );
  }

  for (const file of [
    ...checkpoint.restoredRecoveryFiles,
    ...checkpoint.recoveredQaArtifacts,
  ]) {
    assert.equal(
      await sha256(resolve(ROOT, file.path)),
      file.sha256,
      `${file.path} 不匹配 Recovery lineage`,
    );
  }

  assert.deepEqual(landmark.position, checkpoint.currentSharedState.position);
  assert.equal(landmark.yaw, checkpoint.currentSharedState.yaw);
  assert.equal(landmark.scale, checkpoint.currentSharedState.scale);
  assert.equal(landmark.model, checkpoint.currentSharedState.model);
  // Recovery checkpoint 的整文件哈希只约束当时的建筑分支；主窗口随后可为其他
  // 建筑更新同一 registry。329 本身的 frozen placement/model 仍须逐字段保持。

  assert(
    fastBuilding.glbs.includes(
      "public/models/xinhua-road/xinhua-villas-329.glb",
    ),
    "Fast Mode 必须保留旧 Hero 的结构审计",
  );
  assert(
    fastBuilding.glbs.every((glb) => [
      "public/models/xinhua-road/xinhua-villas-329.glb",
      "public/models/tiers/xinhua-road/massing-v2/xinhua-villas-329-massing.glb",
      "public/models/tiers/xinhua-road/massing-v3/xinhua-villas-329-massing.glb",
    ].includes(glb)),
    "主窗口专项执行只能审计329自身的 Hero、Recovery v2 与当前 v3",
  );
  assert.deepEqual(
    fastBuilding.runtimeRoutes,
    [
      "/?start=villas329&cameraQa=1&qaAutoStart=1",
      "/?start=villas329&qaModelId=xinhua-villas-329&qaModelTier=massing&cameraQa=1&qaAutoStart=1",
    ],
    "主窗口接线后必须保留默认入口并显式声明 scoped Massing QA route",
  );
  assert(
    checkpoint.mainWindowManifestCandidate.tests.includes(
      "tests/test_xinhua_villas_329_massing_recovery_checkpoint.test.mjs",
    ),
  );
  assert(
    checkpoint.mainWindowManifestCandidate.glbs.includes(
      "public/models/tiers/xinhua-road/massing-v2/xinhua-villas-329-massing.glb",
    ),
  );
  assert(
    checkpoint.mainWindowManifestCandidate.runtimeRoutes.some(
      (route) => route.includes("qaModelTier=massing"),
    ),
  );
});
