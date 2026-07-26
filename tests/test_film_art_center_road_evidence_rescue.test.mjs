import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath =
  "docs/research/film-art-center-road-evidence-rescue-2026-07-26.json";

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

function centroid(points) {
  const vertices = points.slice(0, -1);
  return [
    vertices.reduce((sum, [x]) => sum + x, 0) / vertices.length,
    vertices.reduce((sum, [, z]) => sum + z, 0) / vertices.length,
  ];
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
  for (
    let polygonIndex = 0;
    polygonIndex < polygon.length - 1;
    polygonIndex += 1
  ) {
    for (
      let lineIndex = 0;
      lineIndex < polyline.length - 1;
      lineIndex += 1
    ) {
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

function transformedRuntimeBounds(localBounds, placement) {
  const cosine = Math.cos(placement.yaw);
  const sine = Math.sin(placement.yaw);
  const localPolygon = [
    [localBounds.minX, -localBounds.maxZ],
    [localBounds.maxX, -localBounds.maxZ],
    [localBounds.maxX, -localBounds.minZ],
    [localBounds.minX, -localBounds.minZ],
  ];
  const transformed = localPolygon.map(([localX, localZ]) => [
    placement.position[0] + placement.scale
      * (cosine * localX + sine * localZ),
    placement.position[1] + placement.scale
      * (-sine * localX + cosine * localZ),
  ]);
  return [...transformed, transformed[0]];
}

test("Film road rescue 原始证据 SHA、来源与冻结阶段保持锁定", async () => {
  const audit = await readJson(auditPath);
  const sourceRecords = Object.values(audit.sources);
  for (const source of sourceRecords) {
    if (source === audit.sources.currentRegistry) {
      assert.match(source.sha256, /^[0-9a-f]{64}$/u);
      continue;
    }
    assert.equal(await sha256(source.path), source.sha256);
  }
  assert.equal(
    audit.sources.officialCn124EastPlan.scale,
    "1:1000",
  );
  assert.equal(
    audit.sources.officialProtectionPlanPage.publisher,
    "上海市城市规划管理局",
  );
  assert.equal(
    audit.sources.officialRenovationApproval.publisher,
    "上海市长宁区文化和旅游局",
  );
  assert.equal(audit.frozenQualifiedStages.heroIdentityMassing, "qualified");
  assert.equal(
    audit.frozenQualifiedStages.blenderMcpThreeGates,
    "qualified",
  );
  assert.equal(audit.frozenQualifiedStages.threeJsRuntime, "qualified");
  assert.equal(audit.gateDecision.publicWiring, "pass-main-window-candidate");
  assert.equal(
    audit.gateDecision.runtimeAcceptance,
    "docs/research/film-art-center-map-runtime-qa-v3.json",
  );
});

test("官方存档页绑定沪府批复与 CN-124-E 原始图件", async () => {
  const audit = await readJson(auditPath);
  const [page, designApproval] = await Promise.all([
    readFile(
      new URL(audit.sources.officialProtectionPlanPage.path, root),
      "utf8",
    ),
    readFile(
      new URL(audit.sources.officialDesignApproval.path, root),
      "utf8",
    ),
  ]);
  assert.match(page, /上海市新华路历史文化风貌区保护规划/u);
  assert.match(page, /沪府/u);
  assert.match(page, /2005\]89号/u);
  assert.match(page, /contentimage_8285_CN-124-E\.jpg/u);
  assert.match(designApproval, /新华路200号优秀历史建筑修缮工程/u);
  assert.match(designApproval, /沪房受理长/u);
  assert.equal(
    audit.sources.officialCn124EastPlan.observedFacts.length,
    3,
  );
});

test("证据目录只保存本次建筑相关原件且不含小红书或范围外资产", async () => {
  const entries = await readdir(
    new URL("docs/research/assets/film-art-center-road-evidence/", root),
  );
  assert.deepEqual(entries.sort(), [
    "xinhua-200-current-south-view-2026.jpg",
    "xinhua-200-design-approval-2022.html",
    "xinhua-200-renovation-approval-2021.pdf",
    "xinhua-protection-plan-block-index-2005.jpg",
    "xinhua-protection-plan-cn-124-east-2005.jpg",
    "xinhua-protection-plan-official-page-2006.html",
  ]);
  assert.ok(entries.every((entry) => !/xhs|tree|lamp|bench|map-massing/iu.test(entry)));
});

test("way/864505138 的投影、中心与朝向精确复现接受候选", async () => {
  const [audit, buildings, map, registry] = await Promise.all([
    readJson(auditPath),
    readJson("docs/research/data/xinhua-buildings-osm-20260725-074802.json"),
    readJson("app/scene/xinhua-map-data.json"),
    readJson("app/scene/xinhua-road-landmarks-data.json"),
  ]);
  const footprint = buildings.elements.find(
    ({ id }) => id === audit.acceptedCandidate.sourceOsmWayId,
  );
  const polygon = footprint.geometry.map(
    (point) => projectPoint(point, map.meta),
  );
  assert.deepEqual(
    polygon.map((point) => point.map((value) => rounded(value))),
    audit.acceptedCandidate.polygonScene.map(
      (point) => point.map((value) => rounded(value)),
    ),
  );
  assert.deepEqual(
    centroid(polygon).map((value) => rounded(value)),
    audit.acceptedCandidate.positionScene.map((value) => rounded(value)),
  );

  const firstLongEdge = [
    polygon[2][0] - polygon[1][0],
    polygon[2][1] - polygon[1][1],
  ];
  const yaw = (
    Math.atan2(-firstLongEdge[1], firstLongEdge[0])
    + Math.PI
  ) % (Math.PI * 2);
  assert.equal(
    rounded(yaw),
    rounded(audit.acceptedCandidate.yawRadians),
  );
  const current = registry.landmarks.find(({ id }) => id === "film-art-center");
  assert.ok(Math.abs(current.yaw - yaw) < 0.025);
});

test("160、200、212 门牌顺序与官方街坊拓扑形成闭环", async () => {
  const [audit, buildings] = await Promise.all([
    readJson(auditPath),
    readJson("docs/research/data/xinhua-buildings-osm-20260725-074802.json"),
  ]);
  const byId = new Map(buildings.elements.map((element) => [
    element.id,
    element,
  ]));
  const west = byId.get(376223385);
  const subject = byId.get(864505138);
  const east = byId.get(292250766);
  assert.equal(west.tags["addr:housenumber"], "no,212");
  assert.equal(east.tags["addr:housenumber"], "160");
  const centerLongitude = (way) => (
    way.geometry.slice(0, -1)
      .reduce((sum, { lon }) => sum + lon, 0)
    / (way.geometry.length - 1)
  );
  assert.ok(centerLongitude(west) < centerLongitude(subject));
  assert.ok(centerLongitude(subject) < centerLongitude(east));
  assert.equal(audit.footprintBindingClosure.officialPlanParcel, "124-13");
  assert.equal(
    audit.gateDecision.footprintBinding,
    "pass-evidence-closure-way-864505138",
  );
});

test("接受的主楼碰撞 polygon 与四条道路均保持记录净距", async () => {
  const [audit, roads, map, roadAudit] = await Promise.all([
    readJson(auditPath),
    readJson("docs/research/data/xinhua-roads-osm-20260716-080509.json"),
    readJson("app/scene/xinhua-map-data.json"),
    readJson("docs/research/film-art-center-internal-road-semantics-deep-audit.json"),
  ]);
  const roadWidths = roadAudit.coordinateContract.runtimeRoadWidthsSceneUnits;
  const polygon = audit.acceptedCandidate.polygonScene;
  for (const [roadIdText, expected] of Object.entries(
    audit.acceptedCandidate.roadClearanceSceneUnits,
  )) {
    const roadId = Number(roadIdText);
    const road = roads.elements.find(({ id }) => id === roadId);
    const polyline = road.geometry.map(
      (point) => projectPoint(point, map.meta),
    );
    const width = roadWidths[
      roadId === 682286683 ? "xinhuaRoad" : road.tags.highway
    ];
    const clearance = polygonToPolylineDistance(polygon, polyline) - width / 2;
    assert.equal(rounded(clearance), rounded(expected));
    assert.ok(clearance > 0);
  }
  assert.equal(
    audit.gateDecision.formalMapAcceptance,
    "pass-main-window-map-runtime-v3",
  );
});

test("完整 Hero 以 0.5 比例退出两条场内道路且世界碰撞 footprint 不变", async () => {
  const [audit, map, registry, roadAudit] = await Promise.all([
    readJson(auditPath),
    readJson("app/scene/xinhua-map-data.json"),
    readJson("app/scene/xinhua-road-landmarks-data.json"),
    readJson("docs/research/film-art-center-internal-road-semantics-deep-audit.json"),
  ]);
  const film = registry.landmarks.find(({ id }) => id === "film-art-center");
  const calibration = audit.acceptedCandidate.runtimeScaleCalibration;
  assert.equal(film.scale, audit.acceptedCandidate.runtimeScale);
  assert.equal(film.scale, 0.5);
  assert.deepEqual(
    film.localObstacles.map((obstacle) => ({
      minX: obstacle.minX * film.scale,
      maxX: obstacle.maxX * film.scale,
      minZ: obstacle.minZ * film.scale,
      maxZ: obstacle.maxZ * film.scale,
    })),
    [audit.acceptedCandidate.worldCollisionFootprintAfterScale],
  );

  const completeHeroPolygon = transformedRuntimeBounds(
    film.localBounds,
    film,
  );
  const roadWidths =
    roadAudit.coordinateContract.runtimeRoadWidthsSceneUnits;
  for (const [roadIdText, expected] of Object.entries(
    calibration.completeHeroRoadClearanceSceneUnits,
  )) {
    const roadId = Number(roadIdText);
    const road = map.roads.find(({ osmWayId }) => osmWayId === roadId);
    const width = roadWidths[
      roadId === 682286683 ? "xinhuaRoad" : road.highway
    ];
    const clearance = (
      polygonToPolylineDistance(completeHeroPolygon, road.points)
      - width / 2
    );
    assert.equal(rounded(clearance), rounded(expected));
    assert.ok(clearance > 0);
  }
  assert.ok(
    calibration.completeHeroRoadClearanceSceneUnits["577252297"] >= 0.75,
  );
});
