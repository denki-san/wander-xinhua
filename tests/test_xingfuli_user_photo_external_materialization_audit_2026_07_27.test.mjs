import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath =
  "docs/research/xingfuli-user-photo-external-materialization-audit-2026-07-27.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

test("幸福里九图外置盘点锁定三栋、三个快照与只读范围", async () => {
  const audit = await readJson(auditPath);
  assert.deepEqual(audit.assetIds, [
    "xingfuli-west",
    "xingfuli-center",
    "xingfuli-east",
  ]);
  assert.deepEqual(
    audit.externalSnapshotsInspected.map(({ snapshotId }) => snapshotId),
    [
      "2026-07-26-5383f2a",
      "2026-07-26-ad37273",
      "2026-07-26-b20494c",
    ],
  );
  assert.equal(
    audit.externalSnapshotsInspected.at(-1).sourceWorktreeDirty,
    false,
  );
  assert.equal(audit.scopeProtection.externalFilesModified, false);
  assert.equal(audit.scopeProtection.assetFilesModified, false);
  assert.equal(audit.scopeProtection.recoveryOrHoldModified, false);
});

test("路线声明不是九张原图，公开参考也不得替代摄影者序列", async () => {
  const audit = await readJson(auditPath);
  assert.equal(audit.photographerStatement.photoCount, 9);
  assert.equal(audit.photographerStatement.routeEndRoadCandidate, "panyu-road");
  assert.equal(audit.photographerStatement.routeEndRoadAccepted, false);
  assert.equal(audit.materializationVerdict.attributableOriginalFileCount, 0);
  assert.equal(audit.materializationVerdict.sha256Available, false);
  assert.equal(audit.materializationVerdict.publicReferencesMaySubstitute, false);
  assert.equal(
    audit.repositoryInputs.publicReferenceManifest.declaredReferenceCount,
    9,
  );
  assert.equal(
    audit.repositoryInputs.historicalRouteMarkdown.classification,
    "route-statement-only-not-image-materialization",
  );
});

test("九图物化前不得改变地图、模型或运行时门", async () => {
  const audit = await readJson(auditPath);
  assert.equal(audit.materializationVerdict.externalArchiveComplete, false);
  assert.equal(audit.materializationVerdict.mapGateChanged, false);
  assert.equal(audit.materializationVerdict.modelGateChanged, false);
  assert.equal(audit.materializationVerdict.runtimeGateChanged, false);
  assert.equal(
    audit.requiredNextGate.targetArchiveRoot,
    "/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/",
  );
  assert.match(audit.requiredNextGate.archiveMode, /immutable/);
  assert.ok(
    audit.requiredNextGate.requiredOutputs.includes(
      "west-center-east-or-unknown visual assignment",
    ),
  );
});
