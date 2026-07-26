import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath = "docs/research/film-art-center-road-semantics-2026-07-26.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

function rounded(value, precision = 12) {
  return Number(value.toFixed(precision));
}

function rawWay(snapshot, osmWayId) {
  return snapshot.elements.find(
    ({ type, id }) => type === "way" && id === osmWayId,
  );
}

function runtimeRoad(map, osmWayId) {
  return map.roads.find(({ osmWayId: candidate }) => candidate === osmWayId);
}

function coordinateKey({ lon, lat }) {
  return `${lon.toFixed(7)},${lat.toFixed(7)}`;
}

function projectRawGeometry(geometry, boundary, metersPerSceneUnit) {
  const [south, north, west, east] = boundary[0].boundingbox.map(Number);
  const centerLatitude = (south + north) / 2;
  const centerLongitude = (west + east) / 2;
  const metersPerLongitudeDegree = (
    111_320 * Math.cos(centerLatitude * Math.PI / 180)
  );
  return geometry.map(({ lon, lat }) => [
    (lon - centerLongitude) * metersPerLongitudeDegree / metersPerSceneUnit,
    -(lat - centerLatitude) * 110_540 / metersPerSceneUnit,
  ]);
}

function inversePlacement(point, placement) {
  const worldX = (point[0] - placement.position[0]) / placement.scale;
  const worldZ = (point[1] - placement.position[1]) / placement.scale;
  const cosine = Math.cos(placement.yaw);
  const sine = Math.sin(placement.yaw);
  return [
    cosine * worldX - sine * worldZ,
    sine * worldX + cosine * worldZ,
  ];
}

function clipSegmentToObstacle(start, end, obstacle) {
  let entry = 0;
  let exit = 1;
  const deltaX = end[0] - start[0];
  const deltaZ = end[1] - start[1];
  const checks = [
    [-deltaX, start[0] - obstacle.minX],
    [deltaX, obstacle.maxX - start[0]],
    [-deltaZ, start[1] + obstacle.maxZ],
    [deltaZ, -obstacle.minZ - start[1]],
  ];

  for (const [direction, distance] of checks) {
    if (Math.abs(direction) < 1e-12) {
      if (distance < 0) return null;
      continue;
    }
    const ratio = distance / direction;
    if (direction < 0) {
      if (ratio > exit) return null;
      entry = Math.max(entry, ratio);
    } else {
      if (ratio < entry) return null;
      exit = Math.min(exit, ratio);
    }
  }
  return [entry, exit];
}

function centerlineInsideObstacle(points, placement, obstacle) {
  let length = 0;
  const segments = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const clipped = clipSegmentToObstacle(
      inversePlacement(points[index], placement),
      inversePlacement(points[index + 1], placement),
      obstacle,
    );
    if (!clipped || clipped[1] - clipped[0] <= 1e-10) continue;
    const segmentLength = Math.hypot(
      points[index + 1][0] - points[index][0],
      points[index + 1][1] - points[index][1],
    );
    const insideLength = segmentLength * (clipped[1] - clipped[0]);
    length += insideLength;
    segments.push({
      sourceSegmentIndex: index,
      insideLength,
    });
  }
  return { length, segments };
}

test("道路语义记录锁定仓内来源、对象边界与未修改约束", async () => {
  const [record, buildingSnapshot] = await Promise.all([
    readJson(recordPath),
    readJson("docs/research/data/xinhua-buildings-osm-20260725-074802.json"),
  ]);

  for (const source of Object.values(record.sources)) {
    assert.equal(await sha256(source.path), source.sha256);
    if (source.bytes !== undefined) {
      assert.equal(
        (await readFile(new URL(source.path, root))).byteLength,
        source.bytes,
      );
    }
  }

  const excludedBuilding = rawWay(
    buildingSnapshot,
    record.subjectBoundary.excludedOsmBuilding.osmWayId,
  );
  assert.equal(excludedBuilding.tags["addr:housenumber"], "160");
  assert.equal(excludedBuilding.tags["addr:street"], "新华路");
  assert.equal(excludedBuilding.tags["name:zh"], "上海影城");
  assert.equal(
    record.subjectBoundary.exactXinhua200Footprint,
    "unknown-no-survey-or-subject-specific-osm-building-polygon",
  );
  assert.equal(record.subjectBoundary.placement.changed, false);
  assert.deepEqual(
    Object.values(record.constraints),
    Array(Object.keys(record.constraints).length).fill(false),
  );
});

test("两条穿越线的原始 tags 不支持误标为公共沥青或步行道路", async () => {
  const [record, rawRoads] = await Promise.all([
    readJson(recordPath),
    readJson("docs/research/data/xinhua-roads-osm-20260716-080509.json"),
  ]);
  const privateRoad = rawWay(rawRoads, 577252297);
  const unclassifiedRoad = rawWay(rawRoads, 1520590652);
  const reviewedRoads = [
    privateRoad,
    unclassifiedRoad,
    rawWay(rawRoads, 1520590653),
  ];

  assert.deepEqual(
    privateRoad.tags,
    record.roadClasses.privateServiceAlley.rawTags,
  );
  assert.deepEqual(
    unclassifiedRoad.tags,
    { highway: "unclassified" },
  );
  assert.equal(privateRoad.geometry.length, 2);
  assert.ok(reviewedRoads.every(({ tags }) => (
    tags.surface === undefined
    && tags.footway === undefined
    && tags.pedestrian === undefined
    && !["pedestrian", "footway", "path"].includes(tags.highway)
  )));
  assert.equal(record.roadClasses.pedestrian.classification, "not-proven");
  assert.equal(
    record.roadClasses.privateServiceAlley.classification,
    "observed-private-service-alley-centerline-inferred-driveway-like-use",
  );
  assert.equal(
    record.roadClasses.unclassifiedInternalLoop.classification,
    "observed-unnamed-unclassified-loop-inferred-internal-circulation-unknown-mode",
  );
});

test("坐标拓扑证明两条内部线连接命名道路且 unclassified 形成回路", async () => {
  const [record, rawRoads] = await Promise.all([
    readJson(recordPath),
    readJson("docs/research/data/xinhua-roads-osm-20260716-080509.json"),
  ]);

  for (const topology of record.coordinateTopology) {
    const expectedKey = (
      `${topology.coordinateWgs84[0].toFixed(7)},`
      + `${topology.coordinateWgs84[1].toFixed(7)}`
    );
    for (const connection of topology.connections) {
      const way = rawWay(rawRoads, connection.osmWayId);
      assert.ok(way);
      assert.equal(
        coordinateKey(way.geometry[connection.pointIndex]),
        expectedKey,
      );
    }
  }

  assert.equal(rawWay(rawRoads, 577252297).geometry.length, 2);
  assert.equal(
    coordinateKey(rawWay(rawRoads, 577252297).geometry[0]),
    coordinateKey(rawWay(rawRoads, 682286683).geometry[12]),
  );
  assert.equal(
    coordinateKey(rawWay(rawRoads, 577252297).geometry[1]),
    coordinateKey(rawWay(rawRoads, 66394007).geometry[19]),
  );
  assert.equal(
    coordinateKey(rawWay(rawRoads, 1520590652).geometry[1]),
    coordinateKey(rawWay(rawRoads, 1520590653).geometry.at(-1)),
  );
  assert.equal(
    coordinateKey(rawWay(rawRoads, 1520590652).geometry[4]),
    coordinateKey(rawWay(rawRoads, 1520590653).geometry[0]),
  );
});

test("两条实体穿越保留全部原始顶点，不是运行时 RDP 粗化产物", async () => {
  const [record, rawRoads, boundary, map] = await Promise.all([
    readJson(recordPath),
    readJson("docs/research/data/xinhua-roads-osm-20260716-080509.json"),
    readJson("docs/research/data/xinhua-boundary-osm-20260716-080509.json"),
    readJson("app/scene/xinhua-map-data.json"),
  ]);

  for (const geometryRecord of record.rawToRuntimeGeometry) {
    const raw = rawWay(rawRoads, geometryRecord.osmWayId);
    const runtime = runtimeRoad(map, geometryRecord.osmWayId);
    const projected = projectRawGeometry(
      raw.geometry,
      boundary,
      map.meta.metersPerSceneUnit,
    );
    const retainedDrifts = runtime.points.map(
      (runtimePoint) => Math.min(
        ...projected.map((rawPoint) => Math.hypot(
          runtimePoint[0] - rawPoint[0],
          runtimePoint[1] - rawPoint[1],
        )),
      ),
    );

    assert.equal(raw.geometry.length, geometryRecord.rawPointCount);
    assert.equal(runtime.points.length, geometryRecord.runtimePointCount);
    assert.equal(
      raw.geometry.length - runtime.points.length,
      geometryRecord.removedPointCount,
    );
    assert.equal(
      rounded(Math.max(...retainedDrifts)),
      rounded(
        geometryRecord.maximumRetainedVertexProjectionAndRoundingDriftSceneUnits,
      ),
    );
  }

  for (const osmWayId of [577252297, 1520590652]) {
    const geometryRecord = record.rawToRuntimeGeometry.find(
      ({ osmWayId: candidate }) => candidate === osmWayId,
    );
    assert.equal(geometryRecord.removedPointCount, 0);
    assert.equal(
      geometryRecord.classification,
      "no-coarsening-capable-of-creating-the-crossing",
    );
  }
});

test("原始与运行时中心线穿越相同实体，crossing 结论可复算", async () => {
  const [record, rawRoads, boundary, map, priorCandidate] = await Promise.all([
    readJson(recordPath),
    readJson("docs/research/data/xinhua-roads-osm-20260716-080509.json"),
    readJson("docs/research/data/xinhua-boundary-osm-20260716-080509.json"),
    readJson("app/scene/xinhua-map-data.json"),
    readJson("docs/research/film-art-center-map-candidate-v2.json"),
  ]);
  const placement = {
    ...record.subjectBoundary.placement,
    sourceLocalSolidObstacles:
      priorCandidate.formalPlacements.filmArtCenter.sourceLocalSolidObstacles,
  };

  for (const crossing of record.solidCrossings) {
    const obstacle = placement.sourceLocalSolidObstacles[
      crossing.solidObstacleIndex
    ];
    const rawPoints = projectRawGeometry(
      rawWay(rawRoads, crossing.osmWayId).geometry,
      boundary,
      map.meta.metersPerSceneUnit,
    );
    const runtimePoints = runtimeRoad(map, crossing.osmWayId).points;
    const rawResult = centerlineInsideObstacle(rawPoints, placement, obstacle);
    const runtimeResult = centerlineInsideObstacle(
      runtimePoints,
      placement,
      obstacle,
    );

    assert.equal(rawResult.segments.length, 1);
    assert.equal(
      rawResult.segments[0].sourceSegmentIndex,
      crossing.rawSegmentIndex,
    );
    assert.equal(
      rounded(rawResult.length),
      rounded(crossing.rawCenterlineInsideSolidSceneUnits),
    );
    assert.equal(
      rounded(runtimeResult.length),
      rounded(crossing.runtimeCenterlineInsideSolidSceneUnits),
    );
    assert.equal(
      rounded(rawResult.length * map.meta.metersPerSceneUnit),
      rounded(crossing.rawCenterlineInsideSolidMeters),
    );
    assert.ok(rawResult.length > 8);
    assert.ok(Math.abs(runtimeResult.length - rawResult.length) < 0.000001);
  }

  for (const control of record.nonCrossingControls) {
    const rawPoints = projectRawGeometry(
      rawWay(rawRoads, control.osmWayId).geometry,
      boundary,
      map.meta.metersPerSceneUnit,
    );
    const runtimePoints = runtimeRoad(map, control.osmWayId).points;
    const rawLength = Math.max(
      ...placement.sourceLocalSolidObstacles.map(
        (obstacle) => centerlineInsideObstacle(
          rawPoints,
          placement,
          obstacle,
        ).length,
      ),
    );
    const runtimeLength = Math.max(
      ...placement.sourceLocalSolidObstacles.map(
        (obstacle) => centerlineInsideObstacle(
          runtimePoints,
          placement,
          obstacle,
        ).length,
      ),
    );
    assert.equal(rawLength, control.rawCrossingLengthSceneUnits);
    assert.equal(runtimeLength, control.runtimeCrossingLengthSceneUnits);
  }
});

test("无通道与精确 footprint 证据时只允许正式 blocker，不生成 building-only 候选", async () => {
  const record = await readJson(recordPath);

  assert.equal(record.buildingOnlyCandidate.status, "not-promotable");
  assert.equal(record.buildingOnlyCandidate.candidate, null);
  assert.equal(record.formalBlocker.formalMapPass, false);
  assert.equal(record.formalBlocker.runtimeAcceptance, "blocked");
  assert.ok(record.formalBlocker.minimumSupplementalEvidence.length >= 5);
  assert.equal(
    record.verdict.mappingCoarsening,
    "not-the-cause-of-the-two-solid-crossings",
  );
  assert.equal(
    record.verdict.buildingOnlyCollisionMapCandidate,
    "none-evidence-backed",
  );
  assert.equal(
    record.verdict.formalResult,
    "block-and-request-minimum-supplemental-evidence",
  );
});
