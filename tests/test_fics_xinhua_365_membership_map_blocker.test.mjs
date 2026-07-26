import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = new URL("../", import.meta.url);
const rootPath = fileURLToPath(root);
const blockerPath = "docs/research/fics-xinhua-365-membership-map-blocker.json";

async function json(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(new URL(relativePath, root)))
    .digest("hex");
}

function snapshotSha256(commit, relativePath) {
  return createHash("sha256")
    .update(execFileSync("git", ["show", `${commit}:${relativePath}`], {
      cwd: rootPath,
    }))
    .digest("hex");
}

test("FICS membership blocker 固定输入、候选集与冻结 transform", async () => {
  const [blocker, recovery, record] = await Promise.all([
    json(blockerPath),
    json("docs/research/fics-xinhua-365-recovery-map-audit.json"),
    json("docs/research/build-records/tiers/xinhua-road/massing-v2/fics-xinhua-365-massing.json"),
  ]);

  for (const source of Object.values(blocker.sources)) {
    assert.equal(await sha256(source.path), source.sha256, source.path);
  }
  assert.deepEqual(blocker.formalPlacement, {
    ...record.placement,
    rawOsmRoundTripMaximumSceneUnits: recovery.mapCalibration.authoredToRawOsmRoundTrip.maxSceneUnits,
    rawOsmRoundTripMaximumMeters: recovery.mapCalibration.authoredToRawOsmRoundTrip.maxMeters,
  });
  assert.deepEqual(
    blocker.membership.candidateWayIds,
    record.children.map(({ sourceWayId }) => sourceWayId),
  );
  assert.ok(record.children.every(
    ({ candidateRole }) => candidateRole === "unbound-member-candidate",
  ));
  assert.equal(blocker.membership.formalMembership, "blocked-no-primary-or-cadastral-binding");
});

test("FICS 审查时公共 registry 快照与主窗口当前值分开记录", async () => {
  const blocker = await json(blockerPath);
  const snapshot = blocker.sharedRegistrySnapshot;
  const registry = await json(snapshot.path);
  const currentEntry = registry.landmarks.find(({ id }) => id === blocker.assetId);

  assert.equal(snapshot.capturedAtAudit, true);
  assert.equal(snapshot.liveHashRequired, false);
  assert.match(snapshot.sha256AtAudit, /^[a-f0-9]{64}$/);
  assert.notEqual(snapshot.sha256AtAudit, snapshot.currentMainWindowShaAtIntegration);
  assert.equal(snapshot.shaPolicy, "review-time-snapshot-public-cross-cut-file");
  assert.equal(
    snapshotSha256(snapshot.integrationCommit, snapshot.path),
    snapshot.currentMainWindowShaAtIntegration,
  );
  assert.notEqual(await sha256(snapshot.path), snapshot.currentMainWindowShaAtIntegration);
  assert.equal(snapshot.ficsEntryModified, false);
  assert.ok(currentEntry);
  assert.deepEqual(currentEntry.position, blocker.formalPlacement.position);
  assert.equal(currentEntry.yaw, blocker.formalPlacement.yaw);
  assert.equal(currentEntry.scale, blocker.formalPlacement.scale);
});

test("FICS OSM way 没有名称或门牌，不能伪装成正式成员", async () => {
  const [blocker, snapshot] = await Promise.all([
    json(blockerPath),
    json("docs/research/data/requested-pois-osm-20260717-103840.json"),
  ]);
  const target = snapshot.targets.find(({ target: item }) => item.id === blocker.assetId);
  assert.ok(target);
  const ways = target.overpass.elements.filter(
    ({ type, id }) => type === "way" && blocker.membership.candidateWayIds.includes(id),
  );
  assert.equal(ways.length, blocker.membership.candidateWayIds.length);
  for (const way of ways) {
    assert.equal(way.tags?.building, "yes");
    assert.equal(way.tags?.name, undefined);
    assert.equal(way.tags?.["name:zh"], undefined);
    assert.equal(way.tags?.["addr:housenumber"], undefined);
  }
});

test("FICS service road 是真实 blocker，候选碰撞壳不得写入 runtime", async () => {
  const [blocker, recovery, finalAudit] = await Promise.all([
    json(blockerPath),
    json("docs/research/fics-xinhua-365-recovery-map-audit.json"),
    json("docs/research/fics-xinhua-365-final-gap-audit.json"),
  ]);
  const service = blocker.mapAndCollision.campusServiceRoad;
  assert.deepEqual(service, {
    osmWayId: recovery.mapCalibration.roads.campusServiceRoad.osmWayId,
    candidateWayId: recovery.mapCalibration.roads.campusServiceRoad.candidateWayId,
    centerlineDistanceSceneUnits: recovery.mapCalibration.roads.campusServiceRoad.centerlineDistanceSceneUnits,
    asphaltClearanceSceneUnits: recovery.mapCalibration.roads.campusServiceRoad.asphaltClearanceSceneUnits,
    asphaltClearanceMeters: recovery.mapCalibration.roads.campusServiceRoad.asphaltClearanceMeters,
    status: "blocked-visible-road-overlap",
  });
  assert.ok(service.asphaltClearanceSceneUnits < 0);
  assert.equal(blocker.mapAndCollision.collisionShell.runtimeWrite, "withheld");
  assert.equal(blocker.scope.runtimeCollisionShellWritten, false);
  assert.equal(finalAudit.gates.formalMemberBinding, "blocked");
  assert.equal(finalAudit.gates.serviceRoad, "blocked");
  assert.equal(blocker.verdict.formalMapAcceptance, "blocked");
});
