import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { XINHUA_ROAD_AXIS } from "../app/scene/xinhua-road-placement.mjs";

const root = new URL("../", import.meta.url);
const candidatePath = "docs/research/xinhua-villas-329-map-candidate.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

function close(actual, expected, tolerance = 1e-6) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} 与 ${expected} 相差超过 ${tolerance}`,
  );
}

function worldPoint([localX, sourceZ], placement) {
  const cosine = Math.cos(placement.yaw);
  const sine = Math.sin(placement.yaw);
  return [
    placement.position[0]
      + placement.scale * (cosine * localX - sine * sourceZ),
    placement.position[1]
      + placement.scale * (-sine * localX - cosine * sourceZ),
  ];
}

function orientation(start, end, point) {
  return (end[0] - start[0]) * (point[1] - start[1])
    - (end[1] - start[1]) * (point[0] - start[0]);
}

function pointOnSegment(point, start, end) {
  const epsilon = 1e-9;
  return Math.abs(orientation(start, end, point)) <= epsilon
    && point[0] >= Math.min(start[0], end[0]) - epsilon
    && point[0] <= Math.max(start[0], end[0]) + epsilon
    && point[1] >= Math.min(start[1], end[1]) - epsilon
    && point[1] <= Math.max(start[1], end[1]) + epsilon;
}

function segmentsIntersect(startA, endA, startB, endB) {
  const aStartSide = orientation(startA, endA, startB);
  const aEndSide = orientation(startA, endA, endB);
  const bStartSide = orientation(startB, endB, startA);
  const bEndSide = orientation(startB, endB, endA);
  if (aStartSide * aEndSide < 0 && bStartSide * bEndSide < 0) return true;
  return pointOnSegment(startB, startA, endA)
    || pointOnSegment(endB, startA, endA)
    || pointOnSegment(startA, startB, endB)
    || pointOnSegment(endA, startB, endB);
}

function pointToSegmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(
    1,
    ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz)
      / lengthSquared,
  ));
  return Math.hypot(
    point[0] - start[0] - ratio * dx,
    point[1] - start[1] - ratio * dz,
  );
}

function segmentDistance(startA, endA, startB, endB) {
  if (segmentsIntersect(startA, endA, startB, endB)) return 0;
  return Math.min(
    pointToSegmentDistance(startA, startB, endB),
    pointToSegmentDistance(endA, startB, endB),
    pointToSegmentDistance(startB, startA, endA),
    pointToSegmentDistance(endB, startA, endA),
  );
}

function polygonDistance(first, second) {
  let distance = Number.POSITIVE_INFINITY;
  for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
    for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
      distance = Math.min(distance, segmentDistance(
        first[firstIndex],
        first[(firstIndex + 1) % first.length],
        second[secondIndex],
        second[(secondIndex + 1) % second.length],
      ));
    }
  }
  return distance;
}

function polygonToRoadDistance(polygon) {
  let distance = Number.POSITIVE_INFINITY;
  for (let polygonIndex = 0; polygonIndex < polygon.length; polygonIndex += 1) {
    for (let roadIndex = 1; roadIndex < XINHUA_ROAD_AXIS.length; roadIndex += 1) {
      distance = Math.min(distance, segmentDistance(
        polygon[polygonIndex],
        polygon[(polygonIndex + 1) % polygon.length],
        XINHUA_ROAD_AXIS[roadIndex - 1],
        XINHUA_ROAD_AXIS[roadIndex],
      ));
    }
  }
  return distance;
}

function transformedCollisionAabb(local, placement, margin) {
  const world = [];
  for (const localX of [local.minX, local.maxX]) {
    for (const sourceZ of [local.minZ, local.maxZ]) {
      world.push(worldPoint([localX, sourceZ], placement));
    }
  }
  return {
    minX: Math.min(...world.map(([x]) => x)) - margin,
    maxX: Math.max(...world.map(([x]) => x)) + margin,
    minZ: Math.min(...world.map(([, z]) => z)) - margin,
    maxZ: Math.max(...world.map(([, z]) => z)) + margin,
  };
}

function aabbPolygon(aabb) {
  return [
    [aabb.minX, aabb.minZ],
    [aabb.minX, aabb.maxZ],
    [aabb.maxX, aabb.maxZ],
    [aabb.maxX, aabb.minZ],
  ];
}

function groupedObstacles(candidate) {
  return candidate.proposedLocalObstacles.map((local) => ({
    ...local,
    world: transformedCollisionAabb(
      local,
      candidate.placement,
      candidate.coordinateContract.runtimeCollisionMarginSceneUnits,
    ),
  })).reduce((groups, obstacle) => {
    (groups[obstacle.member] ??= []).push(obstacle);
    return groups;
  }, {});
}

test("329弄地图候选只读取冻结输入且不修改二进制、放置或共享文件", async () => {
  const candidate = await readJson(candidatePath);
  assert.equal(candidate.assetId, "xinhua-villas-329");
  assert.equal(candidate.baseCommit, "ade098eaa4be7a37d766b2867c909885742d6030");
  assert.equal(
    candidate.status,
    "feasible-candidate-awaiting-main-window-integration",
  );
  for (const input of Object.values(candidate.inputs)) {
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  assert.deepEqual(candidate.placement.position, [-42.13, 79.48]);
  assert.equal(candidate.placement.yaw, -0.38);
  assert.equal(candidate.placement.scale, 0.62);
  assert.equal(candidate.scope.binaryRebuilt, false);
  assert.equal(candidate.scope.sharedFilesModified, false);
  assert.equal(candidate.scope.recoveryOrHoldModified, false);
  assert.equal(candidate.scope.placementChanged, false);
  assert.equal(candidate.scope.memberBindingChanged, false);
  assert.equal(candidate.scope.footprintChanged, false);
});

test("历史 -0.138921 blocker 实际属于 member-42，不属于 member-15", async () => {
  const candidate = await readJson(candidatePath);
  const prior = await readJson(candidate.inputs.priorMapCandidate.path);
  const asphaltHalfWidth =
    candidate.coordinateContract.asphaltHalfWidthSceneUnits;
  const margin = candidate.coordinateContract.runtimeCollisionMarginSceneUnits;
  const originalByMember = Object.fromEntries(
    prior.localObstacles.map((obstacle) => [
      obstacle.id.match(/member-(\d+)/u)[1],
      transformedCollisionAabb(obstacle, candidate.placement, margin),
    ]),
  );
  const clearances = Object.fromEntries(
    Object.entries(originalByMember).map(([member, world]) => [
      member,
      polygonToRoadDistance(aabbPolygon(world)) - asphaltHalfWidth,
    ]),
  );
  close(clearances["15"], 10.316885);
  close(clearances["42"], -0.138921);
  assert.equal(candidate.blockerCorrection.priorReportedMember, "15");
  assert.equal(candidate.blockerCorrection.recomputedActualMember, "42");
  close(
    clearances["15"],
    candidate.blockerCorrection.member15CollisionAabbToAsphaltEdgeSceneUnits,
  );
  close(
    clearances["42"],
    candidate.blockerCorrection
      .member42SingleCollisionAabbToAsphaltEdgeSceneUnits,
  );
});

test("四成员 OSM footprint、证据尺度与方向保持不变且道路可见净距通过", async () => {
  const candidate = await readJson(candidatePath);
  const binding = await readJson(candidate.inputs.memberBinding.path);
  assert.deepEqual(binding.registryPlacement.position, candidate.placement.position);
  assert.equal(binding.registryPlacement.yaw, candidate.placement.yaw);
  assert.equal(binding.registryPlacement.scale, candidate.placement.scale);
  assert.deepEqual(
    binding.members.map(({ sourceWayId }) => sourceWayId),
    candidate.coordinateContract.osmMemberWays,
  );
  assert.deepEqual(
    binding.members.map(({ houseNumber }) => houseNumber),
    candidate.coordinateContract.memberNumbers,
  );
  assert.ok(
    binding.worldProjectionValidation.maximumErrorSceneUnits
      <= candidate.coordinateContract.maximumAllowedWorldVertexErrorSceneUnits,
  );

  const asphaltHalfWidth =
    candidate.coordinateContract.asphaltHalfWidthSceneUnits;
  for (const member of binding.members) {
    const polygon = member.localFootprint.map(
      (point) => worldPoint(point, candidate.placement),
    );
    const clearance = polygonToRoadDistance(polygon) - asphaltHalfWidth;
    close(
      clearance,
      candidate.roadClearanceSceneUnits.visibleOsmFootprintToAsphaltEdge[
        member.houseNumber
      ],
    );
    assert.ok(
      clearance
        >= candidate.coordinateContract.minimumRequiredVisibleClearanceSceneUnits,
    );
  }
});

test("40与42的六条带完整覆盖原 AABB，没有缩放、位移或碰撞空洞", async () => {
  const candidate = await readJson(candidatePath);
  const prior = await readJson(candidate.inputs.priorMapCandidate.path);
  for (const member of ["15", "36", "40", "42"]) {
    const original = prior.localObstacles.find(
      ({ id }) => id.startsWith(`member-${member}-`),
    );
    const strips = candidate.proposedLocalObstacles
      .filter((obstacle) => obstacle.member === member)
      .sort((left, right) => left.minX - right.minX);
    assert.equal(
      strips.length,
      candidate.candidateMethod.stripCountByMember[member],
    );
    close(strips[0].minX, original.minX);
    close(strips.at(-1).maxX, original.maxX);
    for (const strip of strips) {
      close(strip.minZ, original.minZ);
      close(strip.maxZ, original.maxZ);
    }
    for (let index = 1; index < strips.length; index += 1) {
      close(strips[index - 1].maxX, strips[index].minX);
    }
    const stripArea = strips.reduce(
      (sum, strip) =>
        sum + (strip.maxX - strip.minX) * (strip.maxZ - strip.minZ),
      0,
    );
    close(
      stripArea,
      (original.maxX - original.minX) * (original.maxZ - original.minZ),
      1e-5,
    );
  }
});

test("候选碰撞 AABB 全部退出 asphalt，并保留成员间正净距", async () => {
  const candidate = await readJson(candidatePath);
  const groups = groupedObstacles(candidate);
  const asphaltHalfWidth =
    candidate.coordinateContract.asphaltHalfWidthSceneUnits;

  for (const member of ["15", "36", "40", "42"]) {
    const clearance = Math.min(...groups[member].map(({ world }) =>
      polygonToRoadDistance(aabbPolygon(world)) - asphaltHalfWidth));
    close(
      clearance,
      candidate.roadClearanceSceneUnits
        .proposedCollisionAabbToAsphaltEdgeAfterMargin[member],
    );
    assert.ok(
      clearance
        >= candidate.coordinateContract.minimumRequiredVisibleClearanceSceneUnits,
    );
  }

  for (const [pair, expected] of Object.entries(
    candidate.neighborClearanceSceneUnits
      .proposedWorldCollisionAabbsAfterMargin,
  )) {
    if (typeof expected !== "number" || !pair.includes("-")) continue;
    const [first, second] = pair.split("-");
    const clearance = Math.min(...groups[first].flatMap(({ world: left }) =>
      groups[second].map(({ world: right }) =>
        polygonDistance(aabbPolygon(left), aabbPolygon(right)))));
    close(clearance, expected);
    assert.ok(clearance > 0);
  }
});

test("可见 OSM 成员之间无重叠，候选条带不会扩大既有碰撞范围", async () => {
  const candidate = await readJson(candidatePath);
  const binding = await readJson(candidate.inputs.memberBinding.path);
  const prior = await readJson(candidate.inputs.priorMapCandidate.path);
  const groups = groupedObstacles(candidate);
  const polygons = Object.fromEntries(binding.members.map((member) => [
    member.houseNumber,
    member.localFootprint.map((point) => worldPoint(point, candidate.placement)),
  ]));

  for (const [pair, expected] of Object.entries(
    candidate.neighborClearanceSceneUnits.visibleOsmFootprints,
  )) {
    if (typeof expected !== "number" || !pair.includes("-")) continue;
    const [first, second] = pair.split("-");
    const clearance = polygonDistance(polygons[first], polygons[second]);
    close(clearance, expected);
    assert.ok(clearance > 0);
  }

  const margin = candidate.coordinateContract.runtimeCollisionMarginSceneUnits;
  for (const member of ["15", "36", "40", "42"]) {
    const original = prior.localObstacles.find(
      ({ id }) => id.startsWith(`member-${member}-`),
    );
    const originalWorld = transformedCollisionAabb(
      original,
      candidate.placement,
      margin,
    );
    for (const { world } of groups[member]) {
      assert.ok(world.minX >= originalWorld.minX - 1e-9);
      assert.ok(world.maxX <= originalWorld.maxX + 1e-9);
      assert.ok(world.minZ >= originalWorld.minZ - 1e-9);
      assert.ok(world.maxZ <= originalWorld.maxZ + 1e-9);
    }
  }
  assert.equal(candidate.otherLandmarks.priorIntersectionCount, 0);
  assert.equal(candidate.otherLandmarks.candidateIntersectionCount, 0);
});
