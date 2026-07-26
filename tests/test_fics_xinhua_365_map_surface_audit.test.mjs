import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BUILDING_MASSING_QA_CANDIDATES,
} from "../app/scene/building-massing-qa-contract.mjs";

const root = new URL("../", import.meta.url);
const rootPath = fileURLToPath(root);
const auditPath = "docs/research/fics-xinhua-365-map-surface-audit.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

function gitBlobSha256(commit, path) {
  return createHash("sha256")
    .update(execFileSync(
      "git",
      ["show", `${commit}:${path}`],
      { cwd: rootPath },
    ))
    .digest("hex");
}

function approximatelyEqual(actual, expected, epsilon = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
}

function openRing(points) {
  if (
    points.length > 1
    && points[0][0] === points.at(-1)[0]
    && points[0][1] === points.at(-1)[1]
  ) {
    return points.slice(0, -1);
  }
  return points;
}

function edges(points) {
  return points.map((point, index) => [
    point,
    points[(index + 1) % points.length],
  ]);
}

function orient(a, b, c) {
  return (
    (b[0] - a[0]) * (c[1] - a[1])
    - (b[1] - a[1]) * (c[0] - a[0])
  );
}

function onSegment(a, b, point) {
  return (
    Math.abs(orient(a, b, point)) < 1e-9
    && point[0] >= Math.min(a[0], b[0]) - 1e-9
    && point[0] <= Math.max(a[0], b[0]) + 1e-9
    && point[1] >= Math.min(a[1], b[1]) - 1e-9
    && point[1] <= Math.max(a[1], b[1]) + 1e-9
  );
}

function segmentsIntersect(a, b, c, d) {
  const abC = orient(a, b, c);
  const abD = orient(a, b, d);
  const cdA = orient(c, d, a);
  const cdB = orient(c, d, b);
  if (
    ((abC > 0 && abD < 0) || (abC < 0 && abD > 0))
    && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))
  ) {
    return true;
  }
  return (
    onSegment(a, b, c)
    || onSegment(a, b, d)
    || onSegment(c, d, a)
    || onSegment(c, d, b)
  );
}

function pointToSegmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (
    (point[0] - start[0]) * dx
    + (point[1] - start[1]) * dz
  ) / lengthSquared));
  return Math.hypot(
    point[0] - (start[0] + dx * t),
    point[1] - (start[1] + dz * t),
  );
}

function segmentDistance(a, b, c, d) {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(
    pointToSegmentDistance(a, c, d),
    pointToSegmentDistance(b, c, d),
    pointToSegmentDistance(c, a, b),
    pointToSegmentDistance(d, a, b),
  );
}

function polygonToPolylineDistance(polygon, polyline) {
  return Math.min(
    ...edges(polygon).flatMap(([polygonStart, polygonEnd]) => (
      polyline.slice(0, -1).map((roadStart, index) => (
        segmentDistance(
          polygonStart,
          polygonEnd,
          roadStart,
          polyline[index + 1],
        )
      ))
    )),
  );
}

function projectWgs84(geometry, map) {
  const [centerLongitude, centerLatitude] = map.meta.centerWgs84;
  const metersPerLongitudeDegree = (
    111_320 * Math.cos(centerLatitude * Math.PI / 180)
  );
  return geometry.map(({ lon, lat }) => [
    (lon - centerLongitude)
      * metersPerLongitudeDegree
      / map.meta.metersPerSceneUnit,
    -(lat - centerLatitude)
      * 110_540
      / map.meta.metersPerSceneUnit,
  ]);
}

function sourceObstacleToWorld(obstacle, placement) {
  const cosine = Math.cos(placement.yaw);
  const sine = Math.sin(placement.yaw);
  return [
    [obstacle.minX, obstacle.minZ],
    [obstacle.maxX, obstacle.minZ],
    [obstacle.maxX, obstacle.maxZ],
    [obstacle.minX, obstacle.maxZ],
  ].map(([localX, sourceZ]) => {
    const localZ = -sourceZ;
    return [
      placement.position[0] + placement.scale * (
        cosine * localX + sine * localZ
      ),
      placement.position[1] + placement.scale * (
        -sine * localX + cosine * localZ
      ),
    ];
  });
}

test("FICS 审计锁定真实基线、建筑专属来源和公共文件审查时快照", async () => {
  const audit = await readJson(auditPath);

  assert.equal(
    audit.baseline.actualCommit,
    "ebae8d865a15761f32d890959499911acf8b092d",
  );
  for (const source of Object.values(audit.sources)) {
    if (source.shaPolicy === "review-time-baseline-git-blob") {
      assert.equal(
        gitBlobSha256(audit.baseline.actualCommit, source.path),
        source.sha256,
        source.path,
      );
    } else {
      assert.equal(await sha256(source.path), source.sha256, source.path);
    }
    if (source.bytes !== undefined) {
      assert.equal(
        (await readFile(new URL(source.path, root))).byteLength,
        source.bytes,
      );
    }
  }
  assert.deepEqual(
    Object.entries(audit.sources)
      .filter(([, source]) => (
        source.shaPolicy === "review-time-baseline-git-blob"
      ))
      .map(([key]) => key),
    [
      "runtimeMap",
      "roadSurfaceContract",
      "roadRenderer",
      "massingQaContract",
      "legacyPublicRegistry",
    ],
  );
  assert.deepEqual(
    Object.values(audit.constraints),
    Array(Object.keys(audit.constraints).length).fill(false),
  );
  assert.equal(audit.recoveryQualification.selection, "retained-no-rebuild");
  assert.equal(audit.recoveryQualification.buildRecordRuntimeGate, "pass");
});

test("五个 building=yes 候选没有 relation、名称或门牌，成员绑定仍不成立", async () => {
  const [audit, snapshot, record] = await Promise.all([
    readJson(auditPath),
    readJson("docs/research/data/requested-pois-osm-20260717-103840.json"),
    readJson(
      "docs/research/build-records/tiers/xinhua-road/massing-v2/"
      + "fics-xinhua-365-massing.json",
    ),
  ]);
  const target = snapshot.targets.find(
    ({ target: candidate }) => candidate.id === audit.assetId,
  );

  assert.ok(target);
  assert.equal(
    target.overpass.elements.filter(({ type }) => type === "relation").length,
    0,
  );
  const ways = audit.membership.candidateWayIds.map((wayId) => (
    target.overpass.elements.find(({ type, id }) => (
      type === "way" && id === wayId
    ))
  ));
  assert.ok(ways.every(Boolean));
  for (const way of ways) {
    assert.deepEqual(way.tags, { building: "yes" });
  }
  assert.deepEqual(
    record.children.map(({ sourceWayId }) => sourceWayId),
    audit.membership.candidateWayIds,
  );
  assert.ok(record.children.every(
    ({ candidateRole }) => candidateRole === "unbound-member-candidate",
  ));
  assert.equal(
    audit.membership.formalBinding,
    "blocked-no-primary-cadastral-or-georeferenced-member-binding",
  );
  assert.equal(
    audit.sources.canonicalAerialRendering.reviewClassification,
    "architectural-aerial-rendering-not-orthorectified-or-georeferenced",
  );
});

test("private service alley 仍按当前契约生成可见 surface，但物理材质和宽度未知", async () => {
  const [audit, rawRoads, map, surfaceContract, renderer] = await Promise.all([
    readJson(auditPath),
    readJson("docs/research/data/xinhua-roads-osm-20260716-080509.json"),
    readJson("app/scene/xinhua-map-data.json"),
    readFile(new URL("app/scene/road-surface-contract.ts", root), "utf8"),
    readFile(new URL("app/scene/xinhua-map.tsx", root), "utf8"),
  ]);
  const raw = rawRoads.elements.find(
    ({ type, id }) => type === "way" && id === 577252268,
  );
  const runtime = map.roads.find(({ osmWayId }) => osmWayId === 577252268);

  assert.deepEqual(raw.tags, audit.serviceRoadSemantics.rawTags);
  assert.equal(raw.tags.surface, undefined);
  assert.equal(raw.tags.width, undefined);
  assert.equal(raw.tags.lanes, undefined);
  assert.equal(runtime.highway, "service");
  assert.equal(runtime.layer, 0);
  assert.equal(runtime.tunnel, false);
  assert.equal(raw.geometry.length, 4);
  assert.equal(runtime.points.length, 4);
  assert.match(
    surfaceContract,
    /export function isSurfaceRoad\(road: Road\) \{\s*return !road\.tunnel && road\.layer >= 0;/,
  );
  assert.match(
    surfaceContract,
    /return 0\.5 \* XINHUA_ENVIRONMENT_SCALE;/,
  );
  assert.match(
    renderer,
    /styleName === "lane" \|\| styleName === "service" \? pathTexture/,
  );
  assert.match(
    renderer,
    /\+ 0\.12 \* XINHUA_ENVIRONMENT_SCALE;/,
  );
  assert.equal(
    audit.serviceRoadSemantics.runtimeRepresentation.coreSurfaceWidthSceneUnits,
    2.5,
  );
  assert.equal(
    audit.serviceRoadSemantics.runtimeRepresentation.shoulderWidthSceneUnits,
    3.1,
  );
  assert.equal(
    audit.serviceRoadSemantics.runtimeRepresentation.physicalSurfaceMaterial,
    "unknown-no-osm-surface-tag",
  );
  assert.equal(
    audit.serviceRoadSemantics.runtimeRepresentation.widthClassification,
    "runtime-stylization-not-ground-truth",
  );
});

test("精确 footprint 中心线不穿楼，但 way/864493177 进入当前可见核心面和 shoulder", async () => {
  const [audit, snapshot, map] = await Promise.all([
    readJson(auditPath),
    readJson("docs/research/data/requested-pois-osm-20260717-103840.json"),
    readJson("app/scene/xinhua-map-data.json"),
  ]);
  const target = snapshot.targets.find(
    ({ target: candidate }) => candidate.id === audit.assetId,
  );
  const road = map.roads.find(
    ({ osmWayId }) => osmWayId === audit.serviceRoadSemantics.osmWayId,
  );
  const coreHalfWidth = (
    audit.serviceRoadSemantics.runtimeRepresentation.coreSurfaceHalfWidthSceneUnits
  );
  const shoulderHalfWidth = (
    audit.serviceRoadSemantics.runtimeRepresentation.shoulderHalfWidthSceneUnits
  );

  for (const expected of audit.exactGeometry.perCandidateClearance) {
    const way = target.overpass.elements.find(
      ({ type, id }) => type === "way" && id === expected.wayId,
    );
    const polygon = openRing(projectWgs84(way.geometry, map));
    const distance = polygonToPolylineDistance(polygon, road.points);
    approximatelyEqual(distance, expected.centerlineDistanceSceneUnits);
    approximatelyEqual(
      distance - coreHalfWidth,
      expected.coreSurfaceClearanceSceneUnits,
    );
    approximatelyEqual(
      distance - shoulderHalfWidth,
      expected.shoulderClearanceSceneUnits,
    );
  }

  const conflict = audit.exactGeometry.perCandidateClearance.find(
    ({ wayId }) => wayId === 864493177,
  );
  assert.ok(conflict.centerlineDistanceSceneUnits > 0);
  assert.ok(conflict.coreSurfaceClearanceSceneUnits < 0);
  assert.ok(conflict.shoulderClearanceSceneUnits < 0);
  assert.equal(
    conflict.status,
    "centerline-clear-current-rendered-core-and-shoulder-overlap",
  );
  assert.equal(
    audit.exactGeometry.rawCenterlineCrossCheck.classification,
    "runtime-rounding-does-not-create-the-surface-overlap",
  );
});

test("Recovery 五分体 AABB 只增加约 3.34 mm，核心 surface 冲突不是 AABB 误报", async () => {
  const [audit, map, record] = await Promise.all([
    readJson(auditPath),
    readJson("app/scene/xinhua-map-data.json"),
    readJson(
      "docs/research/build-records/tiers/xinhua-road/massing-v2/"
      + "fics-xinhua-365-massing.json",
    ),
  ]);
  const qa = BUILDING_MASSING_QA_CANDIDATES[audit.assetId];
  const road = map.roads.find(
    ({ osmWayId }) => osmWayId === audit.serviceRoadSemantics.osmWayId,
  );
  for (const [index, child] of record.children.entries()) {
    const expected = {
      minX: Math.min(...child.localFootprint.map(([x]) => x)),
      maxX: Math.max(...child.localFootprint.map(([x]) => x)),
      minZ: -Math.max(...child.localFootprint.map(([, sourceZ]) => sourceZ)),
      maxZ: -Math.min(...child.localFootprint.map(([, sourceZ]) => sourceZ)),
    };
    for (const key of Object.keys(expected)) {
      approximatelyEqual(qa.localObstacles[index][key], expected[key]);
    }
  }
  const candidateIndex = record.children.findIndex(
    ({ sourceWayId }) => sourceWayId === 864493177,
  );
  const aabbPolygon = sourceObstacleToWorld(
    qa.localObstacles[candidateIndex],
    record.placement,
  );
  const distance = polygonToPolylineDistance(aabbPolygon, road.points);
  const adjudication = audit.collisionAdjudication.recoveryQaMemberSolids;

  assert.equal(qa.localObstacles.length, 5);
  approximatelyEqual(
    distance,
    adjudication.memberAabb.centerlineDistanceSceneUnits,
  );
  approximatelyEqual(
    distance - 1.25,
    adjudication.memberAabb.coreSurfaceClearanceSceneUnits,
  );
  approximatelyEqual(
    adjudication.exactFootprint.centerlineDistanceSceneUnits - distance,
    adjudication.aabbInflationAtClosestPairSceneUnits,
  );
  assert.ok(adjudication.exactFootprint.centerlineDistanceSceneUnits > 0);
  assert.ok(adjudication.memberAabb.centerlineDistanceSceneUnits > 0);
  assert.ok(adjudication.exactFootprint.coreSurfaceClearanceSceneUnits < 0);
  assert.equal(adjudication.verdict, "not-an-aabb-false-positive");
});

test("Legacy 六个碰撞实体的穿中心线结果不具 Massing 裁决效力，且不输出候选", async () => {
  const [audit, map, registry, finalGap] = await Promise.all([
    readJson(auditPath),
    readJson("app/scene/xinhua-map-data.json"),
    readJson("app/scene/xinhua-road-landmarks-data.json"),
    readJson("docs/research/fics-xinhua-365-final-gap-audit.json"),
  ]);
  const road = map.roads.find(
    ({ osmWayId }) => osmWayId === audit.serviceRoadSemantics.osmWayId,
  );
  const legacy = registry.landmarks.find(({ id }) => id === audit.assetId);
  const intersecting = legacy.localObstacles
    .map((obstacle, index) => ({
      index,
      distance: polygonToPolylineDistance(
        sourceObstacleToWorld(obstacle, {
          position: legacy.position,
          yaw: legacy.yaw,
          scale: legacy.scale,
        }),
        road.points,
      ),
    }))
    .filter(({ distance }) => distance < 1e-9)
    .map(({ index }) => index);

  assert.equal(legacy.localObstacles.length, 6);
  assert.deepEqual(
    intersecting,
    audit.collisionAdjudication.legacyPublicCollisionSolids
      .centerlineIntersectingIndices,
  );
  assert.equal(finalGap.legacyHero.status, "hold-not-mcp2-candidate");
  assert.equal(
    audit.collisionAdjudication.legacyPublicCollisionSolids
      .adjudicativeForAcceptedMassing,
    false,
  );
  assert.equal(audit.collisionAdjudication.collisionCandidate.written, false);
  assert.equal(audit.verdict.formalMapAcceptance, "blocked");
  assert.equal(audit.verdict.modelingAuthorized, false);
  assert.equal(audit.verdict.runtimePromotionAllowed, false);
});
