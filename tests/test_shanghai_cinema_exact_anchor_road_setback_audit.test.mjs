import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { shanghaiCinemaBlenderPointToWorld } from
  "../app/scene/shanghai-cinema-massing-contract.mjs";

const root = new URL("../", import.meta.url);
const auditPath =
  "docs/research/shanghai-cinema-exact-anchor-road-setback-audit.json";

async function bytes(path) {
  return readFile(new URL(path, root));
}

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function baselineBlob(baseline, path) {
  return execFileSync(
    "git",
    ["show", `${baseline}:${path}`],
    { cwd: new URL(".", root) },
  );
}

function close(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `期望 ${expected}，实际 ${actual}`,
  );
}

function projectOsmPoint(point, mapData) {
  const [centerLon, centerLat] = mapData.meta.centerWgs84;
  return [
    (point.lon - centerLon)
      * 111_320 * Math.cos(centerLat * Math.PI / 180)
      / mapData.meta.metersPerSceneUnit,
    -(point.lat - centerLat)
      * 110_540 / mapData.meta.metersPerSceneUnit,
  ];
}

function polygonCentroid(points) {
  let twiceArea = 0;
  let x = 0;
  let z = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [startX, startZ] = points[index];
    const [endX, endZ] = points[(index + 1) % points.length];
    const cross = startX * endZ - endX * startZ;
    twiceArea += cross;
    x += (startX + endX) * cross;
    z += (startZ + endZ) * cross;
  }
  return [x / (3 * twiceArea), z / (3 * twiceArea)];
}

function polygonArea(points) {
  let twiceArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [startX, startZ] = points[index];
    const [endX, endZ] = points[(index + 1) % points.length];
    twiceArea += startX * endZ - endX * startZ;
  }
  return Math.abs(twiceArea / 2);
}

function localizeWorldPoint([worldX, worldZ], landmark) {
  const dx = worldX - landmark.position[0];
  const dz = worldZ - landmark.position[1];
  const cosine = Math.cos(landmark.yaw);
  const sine = Math.sin(landmark.yaw);
  return [
    cosine * dx - sine * dz,
    -(sine * dx + cosine * dz),
  ];
}

function orientation(start, end, point) {
  return (end[0] - start[0]) * (point[1] - start[1])
    - (end[1] - start[1]) * (point[0] - start[0]);
}

function pointOnSegment(point, start, end) {
  return Math.abs(orientation(start, end, point)) <= 1e-9
    && point[0] >= Math.min(start[0], end[0]) - 1e-9
    && point[0] <= Math.max(start[0], end[0]) + 1e-9
    && point[1] >= Math.min(start[1], end[1]) - 1e-9
    && point[1] <= Math.max(start[1], end[1]) + 1e-9;
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index, index += 1
  ) {
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

function pointInsideOrOnPolygon(point, polygon) {
  return pointInPolygon(point, polygon)
    || polygon.some((start, index) => pointOnSegment(
      point,
      start,
      polygon[(index + 1) % polygon.length],
    ));
}

function pointToSegmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(
    1,
    (
      (point[0] - start[0]) * dx
      + (point[1] - start[1]) * dz
    ) / lengthSquared,
  ));
  return Math.hypot(
    point[0] - start[0] - ratio * dx,
    point[1] - start[1] - ratio * dz,
  );
}

function segmentsIntersect(startA, endA, startB, endB) {
  const aStart = orientation(startA, endA, startB);
  const aEnd = orientation(startA, endA, endB);
  const bStart = orientation(startB, endB, startA);
  const bEnd = orientation(startB, endB, endA);
  return aStart * aEnd < 0 && bStart * bEnd < 0
    || pointOnSegment(startB, startA, endA)
    || pointOnSegment(endB, startA, endA)
    || pointOnSegment(startA, startB, endB)
    || pointOnSegment(endA, startB, endB);
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

function pathToPolylineDistance(path, polyline, closed = true) {
  let distance = Infinity;
  const pathSegments = closed ? path.length : path.length - 1;
  for (let edge = 0; edge < pathSegments; edge += 1) {
    for (let segment = 1; segment < polyline.length; segment += 1) {
      distance = Math.min(distance, segmentDistance(
        path[edge],
        path[(edge + 1) % path.length],
        polyline[segment - 1],
        polyline[segment],
      ));
    }
  }
  return distance;
}

function transformedSourceBounds(landmark, bounds) {
  const cosine = Math.cos(landmark.yaw);
  const sine = Math.sin(landmark.yaw);
  return [
    [bounds.minX, -bounds.minZ],
    [bounds.maxX, -bounds.minZ],
    [bounds.maxX, -bounds.maxZ],
    [bounds.minX, -bounds.maxZ],
  ].map(([localX, localZ]) => [
    landmark.position[0]
      + landmark.scale * (cosine * localX + sine * localZ),
    landmark.position[1]
      + landmark.scale * (-sine * localX + cosine * localZ),
  ]);
}

function blenderRectangle(xCenter, yCenter, width, depth) {
  return [
    [xCenter - width / 2, yCenter - depth / 2],
    [xCenter + width / 2, yCenter - depth / 2],
    [xCenter + width / 2, yCenter + depth / 2],
    [xCenter - width / 2, yCenter + depth / 2],
  ].map(([x, y]) => {
    const world = shanghaiCinemaBlenderPointToWorld({ point: [x, y, 0] });
    return [world[0], world[2]];
  });
}

function ribbonControlLine() {
  const xValues = [
    ...Array.from(
      { length: 77 },
      (_, index) => Number((-15.2 + 30.4 * index / 76).toFixed(6)),
    ),
    8.05 - 4.35,
    8.05 + 4.35,
  ];
  return [...new Set(xValues)].sort((first, second) => first - second)
    .map((x) => {
      const normalized = Math.min(1, Math.abs(x) / 15.2);
      const y = 0.35 - 7.15 * Math.sqrt(
        Math.max(0, 1 - normalized * normalized),
      );
      const world = shanghaiCinemaBlenderPointToWorld({ point: [x, y, 4] });
      return [world[0], world[2]];
    });
}

function glbStructure(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  const gltf = JSON.parse(
    buffer.toString("utf8", 20, 20 + jsonLength).trim(),
  );
  return {
    bytes: buffer.length,
    nodes: gltf.nodes?.length ?? 0,
    meshes: gltf.meshes?.length ?? 0,
    materials: gltf.materials?.length ?? 0,
    images: gltf.images?.length ?? 0,
    textures: gltf.textures?.length ?? 0,
  };
}

test("公共 cross-cut source 使用审查时 baseline blob，上海影城证据使用严格当前 SHA", async () => {
  const audit = await readJson(auditPath);
  assert.equal(
    audit.reviewBaseline,
    "e6e51de88b4374328e0c3f4a2eb1943fdc918313",
  );

  for (const source of audit.sourceIntegrity.reviewTimeBaselineGitBlobs) {
    assert.equal(source.shaPolicy, "review-time-baseline-git-blob");
    assert.equal(
      sha256(baselineBlob(audit.reviewBaseline, source.path)),
      source.sha256,
    );
  }

  for (const source of audit.sourceIntegrity.strictCurrentBuildingSources) {
    assert.equal(sha256(await bytes(source.path)), source.sha256);
  }
});

test("OSM 主体外轮廓身份强绑定，但内部 layer way 与同址商铺都不能充当 exact anchor", async () => {
  const [audit, mapData, buildings, landmarks] = await Promise.all([
    readJson(auditPath),
    readJson("app/scene/xinhua-map-data.json"),
    readJson("docs/research/data/xinhua-buildings-osm-20260725-074802.json"),
    readJson("docs/research/data/xinhua-landmarks-overpass-20260717.json"),
  ]);
  const primary = buildings.elements.find(
    ({ type, id }) => type === "way" && id === 292250766,
  );
  const nested = buildings.elements.find(
    ({ type, id }) => type === "way" && id === 1520590650,
  );
  const apartment = buildings.elements.find(
    ({ type, id }) => type === "way" && id === 864505137,
  );
  assert.ok(primary?.geometry && nested?.geometry && apartment?.geometry);
  assert.equal(primary.tags?.["name:zh"], "上海影城");
  assert.equal(primary.tags?.["addr:street"], "新华路");
  assert.equal(primary.tags?.["addr:housenumber"], "160");
  assert.equal(primary.tags?.amenity, "cinema");
  assert.equal(primary.tags?.building, "yes");
  assert.equal(primary.tags?.wikidata, "Q96079079");

  const primaryPolygon = primary.geometry.slice(0, -1).map(
    (point) => projectOsmPoint(point, mapData),
  );
  const nestedPolygon = nested.geometry.slice(0, -1).map(
    (point) => projectOsmPoint(point, mapData),
  );
  const apartmentPolygon = apartment.geometry.slice(0, -1).map(
    (point) => projectOsmPoint(point, mapData),
  );
  assert.equal(
    primaryPolygon.length,
    audit.osmSubjectBinding.primaryFootprint.uniqueVertices,
  );
  close(
    polygonArea(primaryPolygon),
    audit.osmSubjectBinding.primaryFootprint.areaSceneUnitsSquared,
  );
  assert.deepEqual(
    polygonCentroid(primaryPolygon),
    audit.osmSubjectBinding.primaryFootprint.centroidWorld,
  );

  assert.deepEqual(nested.tags, { building: "yes", layer: "1" });
  assert.equal(
    nestedPolygon.every(
      (point) => pointInsideOrOnPolygon(point, primaryPolygon),
    ),
    true,
  );
  const primaryVertices = new Set(
    primary.geometry.slice(0, -1).map(({ lat, lon }) => `${lat},${lon}`),
  );
  const sharedVertices = new Set(
    nested.geometry.slice(0, -1)
      .map(({ lat, lon }) => `${lat},${lon}`)
      .filter((key) => primaryVertices.has(key)),
  );
  assert.equal(
    sharedVertices.size,
    audit.osmSubjectBinding.nestedCandidate.sharedUniqueVerticesWithPrimary,
  );
  assert.equal(
    buildings.elements.some(({ type }) => type === "relation"),
    false,
  );

  const sameAddressPoi = landmarks.elements.find(
    ({ type, id }) => type === "node" && id === 5232418909,
  );
  assert.equal(sameAddressPoi?.tags?.name, "城市超市");
  assert.equal(sameAddressPoi?.tags?.shop, "supermarket");
  assert.equal(sameAddressPoi?.tags?.["addr:housenumber"], "160");
  close(
    pathToPolylineDistance(
      apartmentPolygon,
      [...primaryPolygon, primaryPolygon[0]],
    ),
    audit.osmSubjectBinding.nearestSeparateFootprint
      .distanceFromPrimarySceneUnits,
  );
  assert.equal(
    [...buildings.elements, ...landmarks.elements].filter(
      ({ tags }) => tags?.entrance != null,
    ).length,
    audit.osmSubjectBinding.entranceNodesInSavedSnapshots,
  );
  assert.equal(
    audit.osmSubjectBinding.nestedCandidate.status,
    "unbound-overlapping-layer-candidate-do-not-use-as-anchor",
  );
});

test("当前 pivot 近 OSM 质心，规则 footprint 在新华路一侧明显过浅", async () => {
  const [audit, mapData, landmarkData, buildings] = await Promise.all([
    readJson(auditPath),
    readJson("app/scene/xinhua-map-data.json"),
    readJson("app/scene/xinhua-road-landmarks-data.json"),
    readJson("docs/research/data/xinhua-buildings-osm-20260725-074802.json"),
  ]);
  const cinema = landmarkData.landmarks.find(
    ({ id }) => id === "shanghai-cinema",
  );
  const primary = buildings.elements.find(
    ({ type, id }) => type === "way" && id === 292250766,
  );
  assert.ok(cinema && primary?.geometry);
  assert.deepEqual(
    {
      position: cinema.position,
      yaw: cinema.yaw,
      scale: cinema.scale,
      localBounds: cinema.localBounds,
    },
    audit.coordinateContract.currentPlacement,
  );

  const primaryPolygon = primary.geometry.slice(0, -1).map(
    (point) => projectOsmPoint(point, mapData),
  );
  const centroid = polygonCentroid(primaryPolygon);
  close(
    Math.hypot(
      cinema.position[0] - centroid[0],
      cinema.position[1] - centroid[1],
    ),
    audit.osmSubjectBinding.primaryFootprint
      .currentPivotDistanceFromCentroidSceneUnits,
  );

  const localized = primaryPolygon.map(
    (point) => localizeWorldPoint(point, cinema),
  );
  const bounds = {
    minX: Math.min(...localized.map(([x]) => x)),
    maxX: Math.max(...localized.map(([x]) => x)),
    minZ: Math.min(...localized.map(([, z]) => z)),
    maxZ: Math.max(...localized.map(([, z]) => z)),
  };
  for (const key of ["minX", "maxX", "minZ", "maxZ"]) {
    close(
      bounds[key],
      audit.footprintAndOriginDiagnosis
        .primaryFootprintInCurrentAssetSourceAxes[key],
    );
  }
  close(
    cinema.localBounds.maxZ - cinema.localBounds.minZ,
    audit.footprintAndOriginDiagnosis.currentRectangularEnvelope.depth,
  );
  close(
    (cinema.localBounds.maxZ - cinema.localBounds.minZ)
      / (bounds.maxZ - bounds.minZ),
    audit.footprintAndOriginDiagnosis.currentRectangularEnvelope
      .depthVsPrimaryRatio,
  );
  assert.ok(
    audit.footprintAndOriginDiagnosis.currentRectangularEnvelope
      .depthVsPrimaryRatio < 0.58,
  );
  assert.equal(
    audit.causeAdjudication.projection.status,
    "ruled-out-as-primary-cause",
  );
});

test("新华路退界复算确认广场、入口台阶和主丝带都显著偏远，且道路宽度不是相对差值原因", async () => {
  const [audit, mapData, landmarkData, buildings, rawRoads, roadSource] =
    await Promise.all([
      readJson(auditPath),
      readJson("app/scene/xinhua-map-data.json"),
      readJson("app/scene/xinhua-road-landmarks-data.json"),
      readJson("docs/research/data/xinhua-buildings-osm-20260725-074802.json"),
      readJson("docs/research/data/xinhua-roads-osm-20260716-080509.json"),
      readFile(new URL("app/scene/road-surface-contract.ts", root), "utf8"),
    ]);
  const cinema = landmarkData.landmarks.find(
    ({ id }) => id === "shanghai-cinema",
  );
  const primary = buildings.elements.find(
    ({ type, id }) => type === "way" && id === 292250766,
  );
  const rawXinhua = rawRoads.elements.find(
    ({ type, id }) => type === "way" && id === 682286683,
  );
  const xinhua = mapData.roads.find(({ osmWayId }) => osmWayId === 682286683);
  assert.ok(cinema && primary?.geometry && rawXinhua && xinhua);
  assert.equal(rawXinhua.tags?.name, "新华路");
  assert.equal(rawXinhua.tags?.surface, "asphalt");
  assert.equal(rawXinhua.tags?.lanes, "2");
  assert.equal(rawXinhua.tags?.width, undefined);
  assert.match(
    roadSource,
    /XINHUA_ROAD_ASPHALT_WIDTH = 0\.98 \* XINHUA_ENVIRONMENT_SCALE/,
  );

  const primaryPolygon = primary.geometry.slice(0, -1).map(
    (point) => projectOsmPoint(point, mapData),
  );
  const plaza = transformedSourceBounds(cinema, cinema.localBounds);
  const ribbon = ribbonControlLine();
  const stepPolygons = Array.from({ length: 5 }, (_, index) => (
    blenderRectangle(
      0,
      -7.55 - index * 0.28,
      23.5 - index * 0.4,
      0.62,
    )
  ));
  const distances = {
    osm: pathToPolylineDistance(primaryPolygon, xinhua.points),
    plaza: pathToPolylineDistance(plaza, xinhua.points),
    ribbon: pathToPolylineDistance(ribbon, xinhua.points, false),
    steps: Math.min(...stepPolygons.map(
      (polygon) => pathToPolylineDistance(polygon, xinhua.points),
    )),
  };
  const records = audit.xinhuaRoadMeasurements;
  close(distances.osm, records.osmPrimaryFootprint.centerlineDistanceSceneUnits);
  close(
    distances.plaza,
    records.currentPlazaEnvelope.centerlineDistanceSceneUnits,
  );
  close(
    distances.ribbon,
    records.authoredMainRibbonFrontLine.centerlineDistanceSceneUnits,
  );
  close(
    distances.steps,
    records.entryStepsUnion.centerlineDistanceSceneUnits,
  );

  const asphaltHalfWidth =
    0.98 * mapData.meta.environmentScale / 2;
  close(
    asphaltHalfWidth,
    audit.roadContract.runtimeStyle.asphaltHalfWidthSceneUnits,
  );
  for (const [key, record] of [
    ["osm", records.osmPrimaryFootprint],
    ["plaza", records.currentPlazaEnvelope],
    ["ribbon", records.authoredMainRibbonFrontLine],
    ["steps", records.entryStepsUnion],
  ]) {
    close(
      distances[key] - asphaltHalfWidth,
      record.asphaltEdgeClearanceSceneUnits,
    );
  }
  for (const [key, record] of [
    ["plaza", records.currentPlazaEnvelope],
    ["ribbon", records.authoredMainRibbonFrontLine],
    ["steps", records.entryStepsUnion],
  ]) {
    close(
      (distances[key] - asphaltHalfWidth)
        - (distances.osm - asphaltHalfWidth),
      record.excessVsOsmSceneUnits,
    );
    assert.ok(record.excessVsOsmMeters > 24);
  }
  assert.equal(
    audit.roadContract.roadWidthCausality.verdict,
    "not-causal-for-model-vs-osm-excess",
  );
  assert.equal(
    audit.verdict.userObservation,
    "confirmed-current-placement-too-far-from-xinhua-road",
  );
  assert.equal(
    audit.verdict.exactPlacement,
    "blocked-no-georeferenced-subject-local-anchor",
  );
  assert.equal(audit.verdict.publicWiringAuthorized, false);
});

test("三档上海影城 GLB 仍是既有合格二进制，本审查不重做资产阶段", async () => {
  const audit = await readJson(auditPath);
  for (const asset of audit.glbAudit.assets) {
    const buffer = await bytes(asset.path);
    assert.equal(sha256(buffer), asset.sha256);
    assert.deepEqual(glbStructure(buffer), {
      bytes: asset.bytes,
      nodes: asset.nodes,
      meshes: asset.meshes,
      materials: asset.materials,
      images: asset.images,
      textures: asset.textures,
    });
    assert.equal(asset.status, "ok");
  }
  assert.deepEqual(audit.retainedAcceptedWork, {
    recovery: "retained-no-rerun",
    hero: "retained-no-rerun",
    identity: "retained-no-rerun",
    massing: "retained-no-rerun",
    mcp: "retained-no-rerun",
    threeRuntime: "retained-no-rerun",
  });
  assert.equal(audit.validation.browserUsed, false);
  assert.equal(audit.validation.networkUsed, false);
  assert.equal(audit.validation.blenderUsed, false);
  assert.equal(audit.validation.sharedFilesChanged, false);
});
