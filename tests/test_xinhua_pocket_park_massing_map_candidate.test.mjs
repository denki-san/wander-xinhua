import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const qa = JSON.parse(await readFile(
  new URL("docs/research/xinhua-pocket-park-massing-map-qa.json", root),
  "utf8",
));
const buildings = JSON.parse(await readFile(
  new URL("docs/research/data/xinhua-buildings-osm-20260725-074802.json", root),
  "utf8",
));
const map = JSON.parse(await readFile(
  new URL("app/scene/xinhua-map-data.json", root),
  "utf8",
));

const EPSILON = 1e-6;

function close(actual, expected, tolerance = EPSILON, message = "") {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected}, got ${actual}`,
  );
}

function project({ lon, lat }) {
  const [centerLongitude, centerLatitude] = map.meta.centerWgs84;
  return [
    (lon - centerLongitude)
      * qa.coordinateContract.metersPerLongitudeDegree
      / map.meta.metersPerSceneUnit,
    -(lat - centerLatitude)
      * qa.coordinateContract.metersPerLatitudeDegree
      / map.meta.metersPerSceneUnit,
  ];
}

function element(id) {
  return buildings.elements.find((candidate) => candidate.id === id);
}

function segmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (
    (point[0] - start[0]) * dx + (point[1] - start[1]) * dz
  ) / lengthSquared));
  return Math.hypot(
    point[0] - start[0] - t * dx,
    point[1] - start[1] - t * dz,
  );
}

function orientation(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1])
    - (b[1] - a[1]) * (c[0] - a[0]);
}

function segmentsIntersect(a, b, c, d) {
  return orientation(a, b, c) * orientation(a, b, d) <= 0
    && orientation(c, d, a) * orientation(c, d, b) <= 0;
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    if (
      (currentPoint[1] > point[1]) !== (previousPoint[1] > point[1])
      && point[0] < (
        (previousPoint[0] - currentPoint[0])
        * (point[1] - currentPoint[1])
        / (previousPoint[1] - currentPoint[1])
        + currentPoint[0]
      )
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function polygonDistance(first, second) {
  if (
    first.some((point) => pointInPolygon(point, second))
    || second.some((point) => pointInPolygon(point, first))
  ) {
    return 0;
  }
  let minimum = Infinity;
  for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
    const firstStart = first[firstIndex];
    const firstEnd = first[(firstIndex + 1) % first.length];
    for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
      const secondStart = second[secondIndex];
      const secondEnd = second[(secondIndex + 1) % second.length];
      if (segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)) {
        return 0;
      }
      minimum = Math.min(
        minimum,
        segmentDistance(firstStart, secondStart, secondEnd),
        segmentDistance(secondStart, firstStart, firstEnd),
      );
    }
  }
  return minimum;
}

function worldEnvelope(position, yaw, scale) {
  return [
    [-0.84, -4.6],
    [0.84, -4.6],
    [0.84, 4.6],
    [-0.84, 4.6],
  ].map(([localX, sourceZ]) => [
    position[0] + scale * (
      Math.cos(yaw) * localX - Math.sin(yaw) * sourceZ
    ),
    position[1] + scale * (
      -Math.sin(yaw) * localX - Math.cos(yaw) * sourceZ
    ),
  ]);
}

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim());
}

test("Recovery Massing 二进制保持原 SHA，可编辑源只移除预览地面", async () => {
  const [glbBuffer, blendBuffer] = await Promise.all([
    readFile(new URL(qa.recovery.glb.path, root)),
    readFile(new URL(qa.recovery.blend.path, root)),
  ]);
  assert.equal(
    createHash("sha256").update(glbBuffer).digest("hex"),
    qa.recovery.glb.sha256,
  );
  assert.equal(
    createHash("sha256").update(blendBuffer).digest("hex"),
    qa.recovery.blend.sha256,
  );
  assert.equal(
    qa.recovery.blend.originalRecoverySha256,
    "07cbcef2639046f01f60a777e0c5b9bbcf48fe4ba91fe3d8904f2334e48752c8",
  );
  assert.equal(
    qa.recovery.blend.hygieneCleanup.removedObject,
    "test-preview-ground",
  );
  assert.equal(
    qa.recovery.blend.hygieneCleanup.buildingGeometryChanged,
    false,
  );
  assert.equal(qa.recovery.blend.hygieneCleanup.glbRebuilt, false);
  const glb = parseGlb(glbBuffer);
  assert.equal(glb.nodes.length, 7);
  assert.equal(glb.meshes.length, 7);
  assert.equal(glb.materials.length, 1);
  assert.equal(glb.images, undefined);
  assert.equal(glb.textures, undefined);
});

test("OSM 两栋面对边确定候选中心、方向与官方尺寸约束", () => {
  const west = element(864485662);
  const east = element(864485663);
  assert.deepEqual(west.tags, { building: "yes" });
  assert.deepEqual(east.tags, { building: "yes" });

  const front = project({
    lon: (west.geometry[3].lon + east.geometry[1].lon) / 2,
    lat: (west.geometry[3].lat + east.geometry[1].lat) / 2,
  });
  const rear = project({
    lon: (west.geometry[4].lon + east.geometry[0].lon) / 2,
    lat: (west.geometry[4].lat + east.geometry[0].lat) / 2,
  });
  const center = [
    (front[0] + rear[0]) / 2,
    (front[1] + rear[1]) / 2,
  ];
  const yaw = Math.atan2(rear[0] - front[0], rear[1] - front[1]);

  close(front[0], qa.binding.corridorAxis.frontWorld[0]);
  close(front[1], qa.binding.corridorAxis.frontWorld[1]);
  close(rear[0], qa.binding.corridorAxis.rearWorld[0]);
  close(rear[1], qa.binding.corridorAxis.rearWorld[1]);
  close(center[0], qa.candidatePlacement.position[0]);
  close(center[1], qa.candidatePlacement.position[1]);
  close(yaw, qa.candidatePlacement.yaw);

  close(9.2 * qa.candidatePlacement.scale * 2.7, 21.8592);
  close(1.68 * qa.candidatePlacement.scale * 2.7, 3.99168);
  assert.ok(qa.dimensions.massingLengthMeters <= 22);
  assert.ok(qa.dimensions.massingWidthMeters < 4.2);
});

test("候选包络不压道路、不碰邻楼并保留中心通路", () => {
  const envelope = worldEnvelope(
    qa.candidatePlacement.position,
    qa.candidatePlacement.yaw,
    qa.candidatePlacement.scale,
  );
  for (let index = 0; index < envelope.length; index += 1) {
    close(envelope[index][0], qa.worldEnvelope[index][0]);
    close(envelope[index][1], qa.worldEnvelope[index][1]);
  }

  for (const [wayId, expected] of [
    [864485662, qa.clearance.flankingBuildingsSceneUnits.way864485662],
    [864485663, qa.clearance.flankingBuildingsSceneUnits.way864485663],
    [864493228, qa.clearance.otherNeighborBuildingsSceneUnits.way864493228],
  ]) {
    const polygon = element(wayId).geometry.slice(0, -1).map(project);
    close(polygonDistance(envelope, polygon), expected);
  }
  assert.ok(
    qa.clearance.minimumAfterCollisionMarginSceneUnits > 0,
    "加入人物碰撞余量后仍不得进入相邻建筑",
  );
  assert.ok(qa.clearance.xinhuaRoadSceneUnits.outerVergeEdge > 1.5);
  assert.ok(qa.clearance.xinhuaRoad345LaneSceneUnits.asphaltEdge > 4);
  assert.ok(qa.walkability.wallToWallOpenGapSceneUnits > 1.1);
  assert.ok(qa.walkability.entranceClearWidthSceneUnits > 0.9);
  assert.equal(qa.walkability.recommendedLocalObstacles.length, 2);
});

test("主窗口已通过 MCP1 和碰撞路线，但正式地图被窄廊相机阻塞", () => {
  assert.equal(qa.gates.evidence, "pass-for-massing-and-map-candidate");
  assert.equal(qa.gates.mapGeometry, "pass-candidate");
  assert.equal(qa.gates.massingMcp1, "pass-main-window-batch-review");
  assert.equal(
    qa.gates.massingMcp1Record,
    "docs/research/xinhua-pocket-park-blender-mcp-gates.json",
  );
  assert.equal(
    qa.gates.formalMapAcceptance,
    "blocked-runtime-camera",
  );
  assert.equal(qa.gates.currentRuntime, "blocked-camera");
  assert.equal(
    qa.gates.currentRuntimeRecord,
    "docs/research/xinhua-pocket-park-threejs-runtime-qa.json",
  );
  assert.match(qa.gates.identity, /^blocked/);
  assert.equal(qa.recovery.generator.copiedIntoBuildingBranch, false);
});
