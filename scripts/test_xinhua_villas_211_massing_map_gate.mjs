import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const BINDING_PATH = resolve(
  ROOT,
  "docs/research/xinhua-villas-211-osm-binding.json",
);
const RECORD_PATH = resolve(
  ROOT,
  "docs/research/build-records/tiers/xinhua-road/massing-v3/xinhua-villas-211-massing.json",
);
const INTEGRATION_PATH = resolve(
  ROOT,
  "docs/research/xinhua-villas-211-massing-v3-integration-candidate.json",
);
const MAP_PATH = resolve(ROOT, "app/scene/xinhua-map-data.json");
const OSM_PATH = resolve(
  ROOT,
  "docs/research/data/xinhua-buildings-osm-20260725-074802.json",
);
const REGISTRY_PATH = resolve(
  ROOT,
  "app/scene/xinhua-road-landmarks-data.json",
);
const REPLACEMENTS_PATH = resolve(
  ROOT,
  "app/scene/xinhua-district-massing-data.json",
);
const ROAD_ASPHALT_HALF_WIDTH = 2.45;
const ROAD_OUTER_VERGE_HALF_WIDTH = 3.925;
const PLAYER_DIAMETER = 0.96;

async function sha256(filePath) {
  const contents = await readFile(filePath);
  return createHash("sha256").update(contents).digest("hex");
}

async function readGlbJson(filePath) {
  const bytes = await readFile(filePath);
  assert.equal(bytes.subarray(0, 4).toString("utf8"), "glTF");
  let offset = 12;
  while (offset < bytes.length) {
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    offset += 8;
    const chunk = bytes.subarray(offset, offset + chunkLength);
    offset += chunkLength;
    if (chunkType === 0x4e4f534a) {
      return JSON.parse(chunk.toString("utf8").replace(/\0+$/u, "").trim());
    }
  }
  throw new Error("GLB 缺少 JSON chunk");
}

function projectWgs84(point, mapMeta) {
  const [centerLongitude, centerLatitude] = mapMeta.centerWgs84;
  const metersPerLongitudeDegree =
    111_320 * Math.cos((centerLatitude * Math.PI) / 180);
  return [
    ((point.lon - centerLongitude) * metersPerLongitudeDegree)
      / mapMeta.metersPerSceneUnit,
    (-(point.lat - centerLatitude) * 110_540)
      / mapMeta.metersPerSceneUnit,
  ];
}

function worldToLocal([worldX, worldZ], placement) {
  const dx = (worldX - placement.position[0]) / placement.scale;
  const dz = (worldZ - placement.position[1]) / placement.scale;
  const cosine = Math.cos(placement.yaw);
  const sine = Math.sin(placement.yaw);
  return [
    cosine * dx - sine * dz,
    sine * dx + cosine * dz,
  ];
}

function localToWorld([localX, localZ], placement) {
  const cosine = Math.cos(placement.yaw);
  const sine = Math.sin(placement.yaw);
  return [
    placement.position[0]
      + placement.scale * (cosine * localX + sine * localZ),
    placement.position[1]
      + placement.scale * (-sine * localX + cosine * localZ),
  ];
}

function distancePointToSegment(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const ratio = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, (
      (point[0] - start[0]) * dx + (point[1] - start[1]) * dz
    ) / lengthSquared));
  return Math.hypot(
    point[0] - start[0] - dx * ratio,
    point[1] - start[1] - dz * ratio,
  );
}

function orientation(first, second, third) {
  return (
    (second[0] - first[0]) * (third[1] - first[1])
    - (second[1] - first[1]) * (third[0] - first[0])
  );
}

function pointOnSegment(start, end, point) {
  return (
    point[0] >= Math.min(start[0], end[0]) - 1e-9
    && point[0] <= Math.max(start[0], end[0]) + 1e-9
    && point[1] >= Math.min(start[1], end[1]) - 1e-9
    && point[1] <= Math.max(start[1], end[1]) + 1e-9
  );
}

function segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd) {
  const a = orientation(firstStart, firstEnd, secondStart);
  const b = orientation(firstStart, firstEnd, secondEnd);
  const c = orientation(secondStart, secondEnd, firstStart);
  const d = orientation(secondStart, secondEnd, firstEnd);
  if (
    ((a > 0 && b < 0) || (a < 0 && b > 0))
    && ((c > 0 && d < 0) || (c < 0 && d > 0))
  ) {
    return true;
  }
  return (
    (Math.abs(a) < 1e-9 && pointOnSegment(firstStart, firstEnd, secondStart))
    || (Math.abs(b) < 1e-9 && pointOnSegment(firstStart, firstEnd, secondEnd))
    || (Math.abs(c) < 1e-9 && pointOnSegment(secondStart, secondEnd, firstStart))
    || (Math.abs(d) < 1e-9 && pointOnSegment(secondStart, secondEnd, firstEnd))
  );
}

function distanceSegmentToSegment(firstStart, firstEnd, secondStart, secondEnd) {
  if (segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)) return 0;
  return Math.min(
    distancePointToSegment(firstStart, secondStart, secondEnd),
    distancePointToSegment(firstEnd, secondStart, secondEnd),
    distancePointToSegment(secondStart, firstStart, firstEnd),
    distancePointToSegment(secondEnd, firstStart, firstEnd),
  );
}

function distancePolygonToPolygon(first, second) {
  let distance = Number.POSITIVE_INFINITY;
  for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
    for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
      distance = Math.min(
        distance,
        distanceSegmentToSegment(
          first[firstIndex],
          first[(firstIndex + 1) % first.length],
          second[secondIndex],
          second[(secondIndex + 1) % second.length],
        ),
      );
    }
  }
  return distance;
}

function aabb(footprint) {
  return {
    minX: Math.min(...footprint.map(([x]) => x)),
    maxX: Math.max(...footprint.map(([x]) => x)),
    minZ: Math.min(...footprint.map(([, z]) => z)),
    maxZ: Math.max(...footprint.map(([, z]) => z)),
  };
}

function aabbOverlaps(first, second) {
  return (
    Math.min(first.maxX, second.maxX) > Math.max(first.minX, second.minX)
    && Math.min(first.maxZ, second.maxZ) > Math.max(first.minZ, second.minZ)
  );
}

test("211弄九个 OSM footprint 从 WGS84 到 runtime local 可逐顶点回放", async () => {
  const [binding, record, mapData, osm, registry, district] = await Promise.all([
    readFile(BINDING_PATH, "utf8").then(JSON.parse),
    readFile(RECORD_PATH, "utf8").then(JSON.parse),
    readFile(MAP_PATH, "utf8").then(JSON.parse),
    readFile(OSM_PATH, "utf8").then(JSON.parse),
    readFile(REGISTRY_PATH, "utf8").then(JSON.parse),
    readFile(REPLACEMENTS_PATH, "utf8").then(JSON.parse),
  ]);

  assert.equal(binding.status, "pass-conservative-massing-footprints-only");
  assert.equal(record.gates.evidence, "pass-conservative-massing-footprints-only");
  assert.equal(record.gates.hero, "blocked-evidence");
  assert.equal(record.gates.identity, "blocked-evidence");
  assert.equal(record.gates.mcp1, "pending-main-window-batch");
  assert.equal(record.gates.runtimeMap, "pending-main-window-scoped-qa");

  const expectedWayIds = [
    864485593,
    864485594,
    864485595,
    864485596,
    864485597,
    864485598,
    864485674,
    864485675,
    864485676,
  ];
  assert.deepEqual(
    binding.members.map(({ sourceWayId }) => sourceWayId),
    expectedWayIds,
  );

  const landmark = registry.landmarks.find(
    ({ id }) => id === "xinhua-villas-211",
  );
  assert(landmark);
  assert.deepEqual(landmark.position, binding.registryPlacement.position);
  assert.equal(landmark.yaw, binding.registryPlacement.yaw);
  assert.equal(landmark.scale, binding.registryPlacement.scale);

  const replacementIds = district.excludedBuildings
    .filter(({ replacementPoiId }) => replacementPoiId === "xinhua-villas-211")
    .map(({ assetId }) => Number(assetId.split("/")[1]))
    .sort((left, right) => left - right);
  assert.deepEqual(replacementIds, [...expectedWayIds].sort((a, b) => a - b));

  const ways = new Map(
    osm.elements
      .filter(({ type }) => type === "way")
      .map((way) => [way.id, way]),
  );
  let maximumRoundTripError = 0;
  const worldPolygons = [];
  const localPolygons = [];
  for (const sourceWayId of expectedWayIds) {
    const way = ways.get(sourceWayId);
    assert(way, `OSM 缺少 way/${sourceWayId}`);
    let geometry = way.geometry;
    if (
      geometry[0].lat === geometry.at(-1).lat
      && geometry[0].lon === geometry.at(-1).lon
    ) {
      geometry = geometry.slice(0, -1);
    }
    const worldFootprint = geometry.map((point) => projectWgs84(point, mapData.meta));
    const localFootprint = worldFootprint.map(
      (point) => worldToLocal(point, binding.registryPlacement),
    );
    for (let index = 0; index < worldFootprint.length; index += 1) {
      const replayed = localToWorld(
        localFootprint[index],
        binding.registryPlacement,
      );
      maximumRoundTripError = Math.max(
        maximumRoundTripError,
        Math.hypot(
          replayed[0] - worldFootprint[index][0],
          replayed[1] - worldFootprint[index][1],
        ),
      );
    }
    const child = record.children.find((entry) => entry.sourceWayId === sourceWayId);
    assert(child);
    assert.equal(child.runtimeLocalFootprint.length, localFootprint.length);
    child.runtimeLocalFootprint.forEach((point, index) => {
      assert(Math.hypot(
        point[0] - localFootprint[index][0],
        point[1] - localFootprint[index][1],
      ) < 0.000002);
    });
    worldPolygons.push({ sourceWayId, footprint: worldFootprint });
    localPolygons.push({ sourceWayId, footprint: localFootprint });
  }
  assert(
    maximumRoundTripError
      < binding.coordinateContract.maximumRoundTripErrorSceneUnits,
    `逐顶点回放误差 ${maximumRoundTripError}`,
  );
  assert(maximumRoundTripError < 1e-10);

  let polygonOverlapCount = 0;
  let localAabbOverlapCount = 0;
  let minimumInternalGap = Number.POSITIVE_INFINITY;
  let minimumInternalPair = [];
  for (let first = 0; first < worldPolygons.length; first += 1) {
    for (let second = first + 1; second < worldPolygons.length; second += 1) {
      const distance = distancePolygonToPolygon(
        worldPolygons[first].footprint,
        worldPolygons[second].footprint,
      );
      if (distance === 0) polygonOverlapCount += 1;
      if (distance < minimumInternalGap) {
        minimumInternalGap = distance;
        minimumInternalPair = [
          worldPolygons[first].sourceWayId,
          worldPolygons[second].sourceWayId,
        ];
      }
      if (
        aabbOverlaps(
          aabb(localPolygons[first].footprint),
          aabb(localPolygons[second].footprint),
        )
      ) {
        localAabbOverlapCount += 1;
      }
    }
  }
  assert.equal(polygonOverlapCount, 0);
  assert.equal(localAabbOverlapCount, 0);
  assert.deepEqual(minimumInternalPair, [864485595, 864485596]);
  assert(Math.abs(minimumInternalGap - 1.1667280584) < 0.000001);
  assert(minimumInternalGap > PLAYER_DIAMETER + 0.2);

  const entranceLeft = worldPolygons.find(
    ({ sourceWayId }) => sourceWayId === 864485674,
  );
  const entranceCenter = worldPolygons.find(
    ({ sourceWayId }) => sourceWayId === 864485675,
  );
  const entranceGap = distancePolygonToPolygon(
    entranceLeft.footprint,
    entranceCenter.footprint,
  );
  assert(
    Math.abs(
      entranceGap
      - binding.mapCalibration.entranceGap.clearanceSceneUnits
    ) < 0.0001,
  );
  assert(entranceGap > PLAYER_DIAMETER * 3);

  const includedWayIds = new Set(expectedWayIds);
  const externalWays = osm.elements
    .filter(({ type, id, tags, geometry }) => (
      type === "way"
      && tags?.building
      && geometry?.length > 3
      && !includedWayIds.has(id)
    ))
    .map((way) => {
      let geometry = way.geometry;
      if (
        geometry[0].lat === geometry.at(-1).lat
        && geometry[0].lon === geometry.at(-1).lon
      ) {
        geometry = geometry.slice(0, -1);
      }
      return {
        sourceWayId: way.id,
        footprint: geometry.map((point) => projectWgs84(point, mapData.meta)),
      };
    });
  let minimumExternalGap = Number.POSITIVE_INFINITY;
  let nearestExternalPair = [];
  for (const compound of worldPolygons) {
    for (const external of externalWays) {
      const gap = distancePolygonToPolygon(
        compound.footprint,
        external.footprint,
      );
      if (gap < minimumExternalGap) {
        minimumExternalGap = gap;
        nearestExternalPair = [
          compound.sourceWayId,
          external.sourceWayId,
        ];
      }
    }
  }
  assert.deepEqual(nearestExternalPair, [864485597, 864485677]);
  assert(
    Math.abs(
      minimumExternalGap
      - binding.mapCalibration.nearestExternalNeighbor.clearanceSceneUnits
    ) < 0.0001,
  );
  assert(minimumExternalGap > 0);

  const roadSegments = mapData.roads
    .filter((road) => road.name === "新华路" && !road.tunnel && road.layer >= 0)
    .flatMap((road) => road.points.slice(1).map(
      (end, index) => [road.points[index], end],
    ));
  let minimumRoadDistance = Number.POSITIVE_INFINITY;
  for (const { footprint } of worldPolygons) {
    for (let index = 0; index < footprint.length; index += 1) {
      for (const [start, end] of roadSegments) {
        minimumRoadDistance = Math.min(
          minimumRoadDistance,
          distanceSegmentToSegment(
            footprint[index],
            footprint[(index + 1) % footprint.length],
            start,
            end,
          ),
        );
      }
    }
  }
  assert(
    Math.abs(
      minimumRoadDistance
      - binding.mapCalibration.minimumRoadCenterlineDistanceSceneUnits
    ) < 0.0001,
  );
  assert(minimumRoadDistance - ROAD_ASPHALT_HALF_WIDTH > 3);
  assert(minimumRoadDistance - ROAD_OUTER_VERGE_HALF_WIDTH > 1.5);
});

test("211弄 Massing v3 二进制、节点和分体碰撞候选保持一致", async () => {
  const [record, integration] = await Promise.all([
    readFile(RECORD_PATH, "utf8").then(JSON.parse),
    readFile(INTEGRATION_PATH, "utf8").then(JSON.parse),
  ]);
  const glbPath = resolve(ROOT, record.outputs.glb);
  assert.equal(await sha256(glbPath), record.glb.sha256);
  assert.equal(integration.modelSha256, record.glb.sha256);
  assert.equal(record.glb.nodes, 9);
  assert.equal(record.glb.meshes, 9);
  assert.equal(record.glb.materials, 1);
  assert.equal(record.glb.images, 0);
  assert.equal(record.glb.textures, 0);
  assert.equal(record.glb.rootTransformsNormalized, true);
  assert(record.glb.triangles < 300);
  assert(record.glb.bytes < 180_000);

  const gltf = await readGlbJson(glbPath);
  assert.deepEqual(
    gltf.nodes.map(({ name }) => name).sort(),
    record.children.map(({ name }) => name).sort(),
  );
  for (const node of gltf.nodes) {
    assert.equal(node.translation, undefined);
    assert.equal(node.rotation, undefined);
    assert.equal(node.scale, undefined);
    assert.equal(node.matrix, undefined);
    assert.equal(node.extras.asset_id, "building:xinhua-road:xinhua-villas-211");
    assert.equal(node.extras.tier, "massing");
    assert.equal(node.extras.house_number, "unknown");
    assert(Number.isInteger(node.extras.source_way_id));
  }

  assert.equal(integration.localObstacles.length, 9);
  for (let first = 0; first < integration.localObstacles.length; first += 1) {
    const obstacle = integration.localObstacles[first];
    assert(obstacle.minX >= integration.localBounds.minX);
    assert(obstacle.maxX <= integration.localBounds.maxX);
    assert(obstacle.minZ >= integration.localBounds.minZ);
    assert(obstacle.maxZ <= integration.localBounds.maxZ);
    for (let second = first + 1; second < integration.localObstacles.length; second += 1) {
      assert.equal(
        aabbOverlaps(obstacle, integration.localObstacles[second]),
        false,
      );
    }
  }
  assert(
    integration.fastManifestCandidate.tests.includes(
      "scripts/test_xinhua_villas_211_massing_map_gate.mjs",
    ),
  );
  assert(
    integration.fastManifestCandidate.runtimeRoutes.some(
      (route) => route.includes("qaModelTier=massing"),
    ),
  );

  assert.equal(
    await sha256(resolve(ROOT, record.outputs.blend.path)),
    record.outputs.blend.sha256,
  );
  for (const preview of Object.values(record.outputs.previews)) {
    assert.equal(await sha256(resolve(ROOT, preview.path)), preview.sha256);
    assert(preview.bytes > 100_000);
  }
});
