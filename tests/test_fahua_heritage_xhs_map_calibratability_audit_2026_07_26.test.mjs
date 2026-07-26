import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath =
  "docs/research/fahua-heritage-xhs-map-calibratability-audit-2026-07-26.json";

async function bytes(relativePath) {
  return readFile(new URL(relativePath, root));
}

async function json(relativePath) {
  return JSON.parse((await bytes(relativePath)).toString("utf8"));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function allTaggedObjects(value, predicate, found = []) {
  if (Array.isArray(value)) {
    for (const item of value) allTaggedObjects(item, predicate, found);
    return found;
  }
  if (value && typeof value === "object") {
    if (value.tags && predicate(value.tags)) found.push(value);
    for (const child of Object.values(value)) {
      allTaggedObjects(child, predicate, found);
    }
  }
  return found;
}

function transformedPolygon(landmark) {
  const cosine = Math.cos(landmark.yaw);
  const sine = Math.sin(landmark.yaw);
  return [
    [landmark.localBounds.minX, landmark.localBounds.minZ],
    [landmark.localBounds.maxX, landmark.localBounds.minZ],
    [landmark.localBounds.maxX, landmark.localBounds.maxZ],
    [landmark.localBounds.minX, landmark.localBounds.maxZ],
  ].map(([localX, sourceZ]) => [
    landmark.position[0] + landmark.scale * (
      cosine * localX + sine * -sourceZ
    ),
    landmark.position[1] + landmark.scale * (
      -sine * localX + cosine * -sourceZ
    ),
  ]);
}

function pointSegmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const squared = dx * dx + dz * dz;
  const ratio = squared === 0
    ? 0
    : Math.max(0, Math.min(1, (
      (point[0] - start[0]) * dx + (point[1] - start[1]) * dz
    ) / squared));
  return Math.hypot(
    point[0] - (start[0] + dx * ratio),
    point[1] - (start[1] + dz * ratio),
  );
}

function minimumRoadDistance(polygon, roads, roadName) {
  let minimum = Infinity;
  for (const road of roads.filter(
    (candidate) => (
      candidate.name === roadName
      && !candidate.tunnel
      && candidate.layer >= 0
    ),
  )) {
    for (const point of polygon) {
      for (let index = 1; index < road.points.length; index += 1) {
        minimum = Math.min(
          minimum,
          pointSegmentDistance(point, road.points[index - 1], road.points[index]),
        );
      }
    }
  }
  return minimum;
}

function close(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} 应接近 ${expected}`,
  );
}

test("地图可校准性审计锁定现有输入和两帧指纹，不重做模型或公共状态", async () => {
  const audit = await json(auditPath);
  for (const input of Object.values(audit.verifiedInputs)) {
    assert.equal(sha256(await bytes(input.path)), input.sha256, input.path);
  }
  for (const frame of audit.frameInspection) {
    const frameBytes = await bytes(frame.path);
    assert.equal(sha256(frameBytes), frame.sha256, frame.path);
    assert.equal(frameBytes[0], 0xff);
    assert.equal(frameBytes[1], 0xd8);
  }
  assert.equal(audit.scope.binaryModified, false);
  assert.equal(audit.scope.sharedFilesModified, false);
  assert.equal(audit.scope.recoveryHoldModified, false);
  assert.equal(audit.dynamicEvidenceBoundary.wikiEligible, false);
  assert.equal(audit.dynamicEvidenceBoundary.newSnapshotStatus, "pending-main-window-after-integration");
});

test("518 只属于相邻墙面，保存的三套 OSM 无地址或主体绑定", async () => {
  const audit = await json(auditPath);
  const [requested, buildings, roads] = await Promise.all([
    json(audit.verifiedInputs.requestedPoiOsm.path),
    json(audit.verifiedInputs.buildingOsm.path),
    json(audit.verifiedInputs.roadOsm.path),
  ]);
  const count518 = (source) => allTaggedObjects(
    source,
    (tags) => tags["addr:housenumber"] === "518",
  ).length;
  assert.equal(count518(requested), 0);
  assert.equal(count518(buildings), 0);
  assert.equal(count518(roads), 0);
  assert.equal(
    allTaggedObjects(
      requested,
      (tags) => /法华遗韵/u.test(tags.name ?? ""),
    ).length,
    0,
  );
  assert.equal(audit.address518ControlAudit.subjectBinding, "adjacent-wall-control-only");
  assert.equal(audit.address518ControlAudit.canCloseToExistingAddressIntersectionOrOsm, false);
});

test("路口、placement 和道路静态净距从保存输入复算，但仍是零照片控制的候选", async () => {
  const audit = await json(auditPath);
  const [savedRoads, landmarks, map] = await Promise.all([
    json(audit.verifiedInputs.roadOsm.path),
    json(audit.verifiedInputs.runtimeLandmarks.path),
    json(audit.verifiedInputs.runtimeRoads.path),
  ]);
  const fahuazhen = savedRoads.elements.find(({ id }) => id === 66394007);
  const xianghuaqiao = savedRoads.elements.find(({ id }) => id === 85686607);
  const shared = fahuazhen.geometry.find((point) =>
    xianghuaqiao.geometry.some(
      (candidate) => candidate.lat === point.lat && candidate.lon === point.lon,
    ));
  assert.ok(shared);
  assert.deepEqual(
    [shared.lon, shared.lat],
    audit.numericRecomputation.savedRoadIntersection.sharedWgs84,
  );

  const { centerWgs84, metersPerSceneUnit } =
    audit.numericRecomputation.projectionContract;
  const projected = [
    (shared.lon - centerWgs84[0]) * 111320
      * Math.cos(centerWgs84[1] * Math.PI / 180) / metersPerSceneUnit,
    -(shared.lat - centerWgs84[1]) * 110540 / metersPerSceneUnit,
  ];
  close(projected[0], audit.numericRecomputation.savedRoadIntersection.projectedScene[0]);
  close(projected[1], audit.numericRecomputation.savedRoadIntersection.projectedScene[1]);

  const landmark = landmarks.landmarks.find(({ id }) => id === audit.assetId);
  const polygon = transformedPolygon(landmark);
  const fahuazhenDistance = minimumRoadDistance(polygon, map.roads, "法华镇路");
  const xianghuaqiaoDistance = minimumRoadDistance(polygon, map.roads, "香花桥路");
  close(
    fahuazhenDistance,
    audit.numericRecomputation.roadClearanceCandidate
      .fahuazhenMinimumCenterlineDistanceSceneUnits,
  );
  close(
    xianghuaqiaoDistance,
    audit.numericRecomputation.roadClearanceCandidate
      .xianghuaqiaoMinimumCenterlineDistanceSceneUnits,
  );
  assert.equal(
    audit.numericRecomputation.errorAndAuthority.photoToWorldControlCount,
    0,
  );
  assert.equal(audit.numericRecomputation.errorAndAuthority.candidateOnly, true);
  assert.equal(audit.numericRecomputation.errorAndAuthority.formalMapAuthority, false);
});

test("两帧只保留 side/depth 与 street context，通过不了尺度、方向、footprint、背面或完整绕行", async () => {
  const audit = await json(auditPath);
  assert.equal(audit.gateDecision.sideOrDepth, "pass-retained-no-rerun");
  assert.equal(audit.gateDecision.streetContext, "pass-retained-no-rerun");
  assert.match(audit.gateDecision.scale, /^blocked-/u);
  assert.match(audit.gateDecision.orientation, /^blocked-/u);
  assert.match(audit.gateDecision.footprint, /^blocked-/u);
  assert.match(audit.gateDecision.rear, /^blocked-/u);
  assert.match(audit.gateDecision.completeWalkaround, /^blocked-/u);
  assert.equal(audit.gateDecision.formalMap, "blocked");
  assert.equal(audit.gateDecision.placementMutationAuthorized, false);
  assert.equal(audit.gateDecision.modelOrMcpRerunAuthorized, false);
  assert.equal(audit.gateDecision.runtimeOrRegistryMutationAuthorized, false);
});
