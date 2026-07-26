import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath =
  "docs/research/film-art-center-internal-road-semantics-deep-audit.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

function rounded(value, precision = 9) {
  return Number(value.toFixed(precision));
}

function projectPoint(point, mapMeta) {
  const [centerLongitude, centerLatitude] = mapMeta.centerWgs84;
  const metersPerLongitudeDegree =
    111_320 * Math.cos(centerLatitude * Math.PI / 180);
  return [
    (point.lon - centerLongitude)
      * metersPerLongitudeDegree
      / mapMeta.metersPerSceneUnit,
    -(point.lat - centerLatitude)
      * 110_540
      / mapMeta.metersPerSceneUnit,
  ];
}

function coordinateKey(point) {
  return `${point.lat.toFixed(7)},${point.lon.toFixed(7)}`;
}

function cross(first, second, third) {
  return (
    (second[0] - first[0]) * (third[1] - first[1])
    - (second[1] - first[1]) * (third[0] - first[0])
  );
}

function pointOnSegment(point, start, end) {
  return (
    Math.abs(cross(start, end, point)) < 1e-9
    && point[0] >= Math.min(start[0], end[0]) - 1e-9
    && point[0] <= Math.max(start[0], end[0]) + 1e-9
    && point[1] >= Math.min(start[1], end[1]) - 1e-9
    && point[1] <= Math.max(start[1], end[1]) + 1e-9
  );
}

function segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd) {
  const firstCrossStart = cross(firstStart, firstEnd, secondStart);
  const firstCrossEnd = cross(firstStart, firstEnd, secondEnd);
  const secondCrossStart = cross(secondStart, secondEnd, firstStart);
  const secondCrossEnd = cross(secondStart, secondEnd, firstEnd);
  return (
    (
      (
        (firstCrossStart > 0 && firstCrossEnd < 0)
        || (firstCrossStart < 0 && firstCrossEnd > 0)
      )
      && (
        (secondCrossStart > 0 && secondCrossEnd < 0)
        || (secondCrossStart < 0 && secondCrossEnd > 0)
      )
    )
    || pointOnSegment(secondStart, firstStart, firstEnd)
    || pointOnSegment(secondEnd, firstStart, firstEnd)
    || pointOnSegment(firstStart, secondStart, secondEnd)
    || pointOnSegment(firstEnd, secondStart, secondEnd)
  );
}

function pointToSegment(point, start, end) {
  const deltaX = end[0] - start[0];
  const deltaZ = end[1] - start[1];
  const lengthSquared = deltaX * deltaX + deltaZ * deltaZ;
  const ratio = lengthSquared === 0
    ? 0
    : Math.min(1, Math.max(
      0,
      (
        (point[0] - start[0]) * deltaX
        + (point[1] - start[1]) * deltaZ
      ) / lengthSquared,
    ));
  return Math.hypot(
    point[0] - start[0] - deltaX * ratio,
    point[1] - start[1] - deltaZ * ratio,
  );
}

function segmentDistance(firstStart, firstEnd, secondStart, secondEnd) {
  if (segmentsIntersect(
    firstStart,
    firstEnd,
    secondStart,
    secondEnd,
  )) return 0;
  return Math.min(
    pointToSegment(firstStart, secondStart, secondEnd),
    pointToSegment(firstEnd, secondStart, secondEnd),
    pointToSegment(secondStart, firstStart, firstEnd),
    pointToSegment(secondEnd, firstStart, firstEnd),
  );
}

function polygonToPolylineDistance(polygon, polyline) {
  let minimum = Infinity;
  for (let polygonIndex = 0; polygonIndex < polygon.length - 1; polygonIndex += 1) {
    for (let lineIndex = 0; lineIndex < polyline.length - 1; lineIndex += 1) {
      minimum = Math.min(
        minimum,
        segmentDistance(
          polygon[polygonIndex],
          polygon[polygonIndex + 1],
          polyline[lineIndex],
          polyline[lineIndex + 1],
        ),
      );
    }
  }
  return minimum;
}

function polygonArea(polygon) {
  let doubledArea = 0;
  for (let index = 0; index < polygon.length - 1; index += 1) {
    doubledArea += (
      polygon[index][0] * polygon[index + 1][1]
      - polygon[index + 1][0] * polygon[index][1]
    );
  }
  return Math.abs(doubledArea) / 2;
}

function polygonCentroid(polygon) {
  const vertices = polygon.slice(0, -1);
  return [
    vertices.reduce((sum, point) => sum + point[0], 0) / vertices.length,
    vertices.reduce((sum, point) => sum + point[1], 0) / vertices.length,
  ];
}

function polylineLength(polyline) {
  return polyline.slice(1).reduce(
    (sum, point, index) => sum + Math.hypot(
      point[0] - polyline[index][0],
      point[1] - polyline[index][1],
    ),
    0,
  );
}

function sourceRectangle(obstacle) {
  return [
    [obstacle.minX, -obstacle.maxZ],
    [obstacle.maxX, -obstacle.maxZ],
    [obstacle.maxX, -obstacle.minZ],
    [obstacle.minX, -obstacle.minZ],
    [obstacle.minX, -obstacle.maxZ],
  ];
}

function transformLocal(points, placement) {
  const cosine = Math.cos(placement.yaw);
  const sine = Math.sin(placement.yaw);
  return points.map(([localX, localZ]) => [
    placement.position[0]
      + placement.scale * (cosine * localX + sine * localZ),
    placement.position[1]
      + placement.scale * (-sine * localX + cosine * localZ),
  ]);
}

test("Film internal-road 深审来源 SHA 与只读范围保持锁定", async () => {
  const audit = await readJson(auditPath);
  for (const source of Object.values(audit.sources)) {
    assert.equal(await sha256(source.path), source.sha256);
  }
  assert.equal(
    audit.baseCommit,
    "0189d06a939651c0f7e2876d074321f2caa9a903",
  );
  assert.equal(audit.scope.modelModified, false);
  assert.equal(audit.scope.publicGlbModified, false);
  assert.equal(audit.scope.runtimeModified, false);
  assert.equal(audit.scope.registryModified, false);
  assert.equal(audit.scope.roadContractModified, false);
  assert.equal(audit.scope.manifestModified, false);
});

test("两条 decisive 道路端点坐标重合且 runtime 明确作为地表道路", async () => {
  const [audit, rawRoads, runtimeMap, roadContract] = await Promise.all([
    readJson(auditPath),
    readJson("docs/research/data/xinhua-roads-osm-20260716-080509.json"),
    readJson("app/scene/xinhua-map-data.json"),
    readFile(new URL("app/scene/road-surface-contract.ts", root), "utf8"),
  ]);
  const ways = rawRoads.elements.filter(
    ({ type, geometry }) => type === "way" && geometry,
  );
  const coordinateOwners = new Map();
  for (const way of ways) {
    for (const point of way.geometry) {
      const key = coordinateKey(point);
      const owners = coordinateOwners.get(key) ?? [];
      owners.push(way.id);
      coordinateOwners.set(key, owners);
    }
  }

  for (const roadAudit of audit.roadSemantics.slice(0, 2)) {
    const road = ways.find(({ id }) => id === roadAudit.osmWayId);
    const firstOwners = coordinateOwners.get(coordinateKey(road.geometry[0]));
    const lastOwners = coordinateOwners.get(
      coordinateKey(road.geometry.at(-1)),
    );
    assert.ok(firstOwners.includes(
      roadAudit.geometricEndpointCoincidence
        .firstEndpoint.publicRoadWayId,
    ));
    assert.ok(lastOwners.includes(
      roadAudit.geometricEndpointCoincidence
        .lastEndpoint.publicRoadWayId,
    ));
    const projected = road.geometry.map(
      (point) => projectPoint(point, audit.coordinateContract),
    );
    assert.equal(
      rounded(polylineLength(projected)),
      rounded(roadAudit.lengthSceneUnits),
    );
    assert.equal(
      rounded(polylineLength(projected) * 2.7),
      rounded(roadAudit.lengthMeters),
    );
    for (const key of ["layer", "tunnel", "covered", "bridge"]) {
      assert.equal(road.tags[key], undefined);
    }
    assert.equal(
      roadAudit.classification.surfaceSuppressionAuthorized,
      false,
    );
    assert.match(
      roadAudit.geometricEndpointCoincidence.evidenceBoundary,
      /no node IDs/u,
    );

    const runtimeRoad = runtimeMap.roads.find(
      ({ osmWayId }) => osmWayId === roadAudit.osmWayId,
    );
    assert.ok(runtimeRoad);
    assert.equal(runtimeRoad.layer, 0);
    assert.equal(runtimeRoad.tunnel, false);
    assert.equal(runtimeRoad.bridge, false);
  }

  assert.match(
    roadContract,
    /return !road\.tunnel && road\.layer >= 0/u,
  );
  const roadWidthContract = roadContract.slice(
    roadContract.indexOf("export function roadWidth"),
    roadContract.indexOf("export function isSurfaceRoad"),
  );
  assert.match(
    roadWidthContract,
    /if \(highway === "living_street" \|\| highway === "unclassified"\) \{\s+return 0\.68 \* XINHUA_ENVIRONMENT_SCALE;/u,
  );
  assert.match(
    roadWidthContract,
    /return 0\.5 \* XINHUA_ENVIRONMENT_SCALE/u,
  );

  const service = ways.find(({ id }) => id === 577252297);
  assert.equal(service.tags.highway, "service");
  assert.equal(service.tags.service, "alley");
  assert.equal(service.tags.access, "private");
  const unclassified = ways.find(({ id }) => id === 1520590652);
  assert.deepEqual(unclassified.tags, { highway: "unclassified" });
});

test("1520590653 两端坐标落在 1520590652 几何上但仍没有 suppress authority", async () => {
  const [audit, rawRoads] = await Promise.all([
    readJson(auditPath),
    readJson("docs/research/data/xinhua-roads-osm-20260716-080509.json"),
  ]);
  const loopAudit = audit.roadSemantics.find(
    ({ osmWayId }) => osmWayId === 1520590653,
  );
  const trunk = rawRoads.elements.find(({ id }) => id === 1520590652);
  const loop = rawRoads.elements.find(({ id }) => id === 1520590653);
  const trunkCoordinates = new Set(trunk.geometry.map(coordinateKey));

  assert.ok(trunkCoordinates.has(coordinateKey(loop.geometry[0])));
  assert.ok(trunkCoordinates.has(coordinateKey(loop.geometry.at(-1))));
  const projectedLoop = loop.geometry.map(
    (point) => projectPoint(point, audit.coordinateContract),
  );
  assert.equal(
    rounded(polylineLength(projectedLoop)),
    rounded(loopAudit.lengthSceneUnits),
  );
  assert.match(
    loopAudit.geometricEndpointCoincidence.evidenceBoundary,
    /no node IDs/u,
  );
  for (const spurId of loopAudit
    .geometricEndpointCoincidence.attachedSpurWayIds) {
    const spur = rawRoads.elements.find(({ id }) => id === spurId);
    assert.ok(spur);
    assert.ok(spur.geometry.some(
      (point) => loop.geometry.some(
        (loopPoint) => coordinateKey(point) === coordinateKey(loopPoint),
      ),
    ));
  }
  assert.equal(
    loopAudit.classification.surfaceSuppressionAuthorized,
    false,
  );
});

test("OSM replacement 表不能绑定新华路200号 footprint", async () => {
  const [audit, rawBuildings, districtMassing] = await Promise.all([
    readJson(auditPath),
    readJson("docs/research/data/xinhua-buildings-osm-20260725-074802.json"),
    readJson("app/scene/xinhua-district-massing-data.json"),
  ]);
  const addressMatches = rawBuildings.elements.filter(({ tags }) => (
    /(^|[^0-9])200([^0-9]|$)/u.test(
      String(tags?.["addr:housenumber"] ?? ""),
    )
  ));
  assert.equal(addressMatches.length, 0);
  const nameMatches = rawBuildings.elements.filter(({ tags }) => (
    /电影艺术中心|新华两佰|film art center/iu.test(
      [
        tags?.name ?? "",
        tags?.["name:zh"] ?? "",
        tags?.["name:en"] ?? "",
      ].join(" "),
    )
  ));
  assert.deepEqual(nameMatches.map(({ id }) => id), [292250766]);
  assert.equal(nameMatches[0].tags["addr:housenumber"], "160");
  assert.equal(nameMatches[0].tags["name:zh"], "上海影城");

  for (const binding of audit.footprintBindingAudit
    .replacementTableObservations) {
    const exclusion = districtMassing.excludedBuildings.find(
      ({ assetId }) => assetId === `way/${binding.osmWayId}`,
    );
    assert.equal(exclusion.replacementPoiId, binding.replacementPoiId);
  }

  const postOffice = rawBuildings.elements.find(
    ({ id }) => id === 376223385,
  );
  assert.equal(postOffice.tags.name, "新华路邮政所");
  assert.equal(postOffice.tags.amenity, "post_office");
  const apartments = rawBuildings.elements.find(
    ({ id }) => id === 864505141,
  );
  assert.equal(apartments.tags.building, "apartments");
  const plausible = rawBuildings.elements.find(
    ({ id }) => id === 864505138,
  );
  assert.deepEqual(plausible.tags, { building: "yes" });
  assert.equal(
    audit.footprintBindingAudit.nearestPlausibleFootprint.status,
    "inferred-nearest-not-authoritative",
  );
});

test("最近但未绑定的 OSM footprint 与道路有正净距", async () => {
  const [audit, rawRoads, rawBuildings, map, registry] = await Promise.all([
    readJson(auditPath),
    readJson("docs/research/data/xinhua-roads-osm-20260716-080509.json"),
    readJson("docs/research/data/xinhua-buildings-osm-20260725-074802.json"),
    readJson("app/scene/xinhua-map-data.json"),
    readJson("app/scene/xinhua-road-landmarks-data.json"),
  ]);
  const placement = registry.landmarks.find(
    ({ id }) => id === "film-art-center",
  );
  const footprint = rawBuildings.elements.find(({ id }) => id === 864505138);
  const footprintPolygon = footprint.geometry.map(
    (point) => projectPoint(point, map.meta),
  );
  const footprintAudit =
    audit.footprintBindingAudit.nearestPlausibleFootprint;
  const centroid = polygonCentroid(footprintPolygon);
  assert.deepEqual(
    centroid.map((value) => rounded(value)),
    footprintAudit.centroidScene.map((value) => rounded(value)),
  );
  assert.equal(
    rounded(Math.hypot(
      centroid[0] - placement.position[0],
      centroid[1] - placement.position[1],
    )),
    rounded(footprintAudit.centroidDistanceToFormalPlacementSceneUnits),
  );
  assert.equal(
    rounded(polygonArea(footprintPolygon)),
    rounded(footprintAudit.areaSceneUnitsSquared),
  );

  for (const clearance of audit.roadClearanceRecomputation
    .rawOsmProjectedCrossCheck) {
    const road = rawRoads.elements.find(
      ({ id }) => id === clearance.osmWayId,
    );
    const roadPoints = road.geometry.map(
      (point) => projectPoint(point, map.meta),
    );
    const roadWidth = audit.coordinateContract
      .runtimeRoadWidthsSceneUnits[
        clearance.osmWayId === 682286683
          ? "xinhuaRoad"
          : road.tags.highway
      ];
    const edgeClearance =
      polygonToPolylineDistance(footprintPolygon, roadPoints)
      - roadWidth / 2;
    assert.equal(
      rounded(edgeClearance),
      rounded(clearance.nearestPlausibleFootprintAsphaltEdgeClearance),
    );
    assert.ok(edgeClearance > 0);
  }
});

test("runtime map 中正式实体仍被两条地表道路中心线穿越", async () => {
  const [audit, map, registry, candidate] = await Promise.all([
    readJson(auditPath),
    readJson("app/scene/xinhua-map-data.json"),
    readJson("app/scene/xinhua-road-landmarks-data.json"),
    readJson("docs/research/film-art-center-map-candidate-v2.json"),
  ]);
  const placement = registry.landmarks.find(
    ({ id }) => id === "film-art-center",
  );
  const modelPolygons = candidate.formalPlacements.filmArtCenter
    .sourceLocalSolidObstacles.map(
      (obstacle) => transformLocal(sourceRectangle(obstacle), placement),
    );

  for (const roadId of [577252297, 1520590652]) {
    const road = map.roads.find(({ osmWayId }) => osmWayId === roadId);
    assert.ok(road);
    assert.equal(road.layer, 0);
    assert.equal(road.tunnel, false);
    assert.equal(road.bridge, false);
    const minimumDistance = Math.min(...modelPolygons.map(
      (polygon) => polygonToPolylineDistance(polygon, road.points),
    ));
    const roadAudit = audit.roadClearanceRecomputation.runtimeGeometry.find(
      ({ osmWayId }) => osmWayId === roadId,
    );
    const expectedWidth = road.highway === "unclassified"
      ? 0.68 * map.meta.environmentScale
      : 0.5 * map.meta.environmentScale;
    assert.equal(minimumDistance, 0);
    assert.ok(
      Math.abs(roadAudit.renderedWidthSceneUnits - expectedWidth) <= 1e-12,
      `道路 ${roadId} 宽度应与 runtime contract 一致`,
    );
    assert.equal(roadAudit.centerlineCrossesFormalSolid, true);
    assert.equal(
      roadAudit.formalSolidAsphaltEdgeClearance,
      -roadAudit.renderedWidthSceneUnits / 2,
    );
    assert.equal(roadAudit.status, "blocking");
  }
});

test("1520590653 旧净距记录被复算纠正但不改变 blocker", async () => {
  const [audit, map, registry, candidate] = await Promise.all([
    readJson(auditPath),
    readJson("app/scene/xinhua-map-data.json"),
    readJson("app/scene/xinhua-road-landmarks-data.json"),
    readJson("docs/research/film-art-center-map-candidate-v2.json"),
  ]);
  const placement = registry.landmarks.find(
    ({ id }) => id === "film-art-center",
  );
  const runtimeRoad = map.roads.find(
    ({ osmWayId }) => osmWayId === 1520590653,
  );
  const source = candidate.formalPlacements.filmArtCenter;
  const envelopePolygon = transformLocal(
    sourceRectangle(source.massingV2LocalBounds),
    placement,
  );
  const modelPolygons = source.sourceLocalSolidObstacles.map(
    (obstacle) => transformLocal(sourceRectangle(obstacle), placement),
  );
  const runtimeRecord = audit.roadClearanceRecomputation.runtimeGeometry.find(
    ({ osmWayId }) => osmWayId === 1520590653,
  );
  const envelopeEdge =
    polygonToPolylineDistance(envelopePolygon, runtimeRoad.points)
    - runtimeRecord.renderedWidthSceneUnits / 2;
  const solidEdge =
    Math.min(...modelPolygons.map(
      (polygon) => polygonToPolylineDistance(polygon, runtimeRoad.points),
    ))
    - runtimeRecord.renderedWidthSceneUnits / 2;

  assert.equal(
    rounded(envelopeEdge),
    rounded(runtimeRecord.formalEnvelopeAsphaltEdgeClearance),
  );
  assert.equal(
    rounded(solidEdge),
    rounded(runtimeRecord.formalSolidAsphaltEdgeClearance),
  );
  assert.ok(envelopeEdge > 0);
  assert.ok(solidEdge > 0);
  const priorRecord = candidate.roadClearance.internalRoads.find(
    ({ osmWayId }) => osmWayId === 1520590653,
  );
  assert.equal(
    priorRecord.massingV2EnvelopeToAsphaltEdgeSceneUnits,
    audit.roadClearanceRecomputation.supersededPriorValue
      .recordedEnvelopeAsphaltEdgeClearance,
  );
  assert.equal(
    priorRecord.solidObstaclesToAsphaltEdgeSceneUnits,
    audit.roadClearanceRecomputation.supersededPriorValue
      .recordedSolidAsphaltEdgeClearance,
  );
  assert.equal(
    audit.roadClearanceRecomputation.supersededPriorValue.status,
    "superseded-by-direct-recomputation",
  );
  assert.equal(
    audit.roadClearanceRecomputation.supersededPriorValue.blockerImpact,
    "none-ways-577252297-and-1520590652-remain-centerline-through-solid",
  );
});

test("证据分类与最终裁决诚实保留 formal map blocker", async () => {
  const audit = await readJson(auditPath);
  assert.ok(audit.evidenceClassification.observed.length >= 6);
  assert.ok(audit.evidenceClassification.inferred.length >= 3);
  assert.ok(audit.evidenceClassification.unknown.length >= 4);
  assert.equal(
    audit.verdict.status,
    "blocked-formal-map-footprint-and-road-semantics-unbound",
  );
  assert.equal(audit.verdict.formalMapBlockerReleased, false);
  assert.equal(
    audit.gateDecision.filmArtCenterFootprintBinding,
    "blocked-unbound",
  );
  assert.equal(audit.gateDecision.formalMapAcceptance, "blocked");
  assert.equal(audit.gateDecision.publicWiring, "not-authorized");
  assert.match(audit.minimumAdditionalEvidence.singleBestArtifact, /总平面图/u);
});
