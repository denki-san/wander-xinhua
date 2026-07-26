import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(ROOT, relativePath), "utf8"),
);
const sha256 = (relativePath) => crypto.createHash("sha256")
  .update(fs.readFileSync(path.join(ROOT, relativePath)))
  .digest("hex");
const snapshotSha256 = (commit, relativePath) => crypto.createHash("sha256")
  .update(execFileSync("git", ["show", `${commit}:${relativePath}`], {
    cwd: ROOT,
  }))
  .digest("hex");
const round = (value, digits = 6) => Number(value.toFixed(digits));

const audit = readJson(
  "docs/research/shanghai-orchestra-osm-membership-deep-audit.json",
);
const binding = readJson("docs/research/shanghai-orchestra-osm-binding.json");
const mapGate = readJson("docs/research/shanghai-orchestra-massing-map-gate.json");
const buildRecord = readJson(
  "docs/research/build-records/tiers/xinhua-road/massing-v2/shanghai-orchestra-massing.json",
);
const buildingOsm = readJson(
  "docs/research/data/xinhua-buildings-osm-20260725-074802.json",
);
const namedOsm = readJson(
  "docs/research/data/xinhua-landmarks-overpass-20260717.json",
);
const mapData = readJson("app/scene/xinhua-map-data.json");

function pointSegmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const squaredLength = dx * dx + dz * dz;
  const ratio = squaredLength === 0
    ? 0
    : Math.max(0, Math.min(1, (
      (point[0] - start[0]) * dx
      + (point[1] - start[1]) * dz
    ) / squaredLength));
  return Math.hypot(
    point[0] - start[0] - dx * ratio,
    point[1] - start[1] - dz * ratio,
  );
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current, current += 1) {
    const [currentX, currentZ] = polygon[current];
    const [previousX, previousZ] = polygon[previous];
    const crosses = (currentZ > point[1]) !== (previousZ > point[1])
      && point[0] < (
        (previousX - currentX) * (point[1] - currentZ)
        / (previousZ - currentZ)
        + currentX
      );
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointPolygonDistance(point, polygon) {
  if (pointInPolygon(point, polygon)) return 0;
  return Math.min(...polygon.map((start, index) => (
    pointSegmentDistance(point, start, polygon[(index + 1) % polygon.length])
  )));
}

function polygonCentroid(points) {
  let twiceArea = 0;
  let weightedX = 0;
  let weightedZ = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    const cross = points[index][0] * next[1] - next[0] * points[index][1];
    twiceArea += cross;
    weightedX += (points[index][0] + next[0]) * cross;
    weightedZ += (points[index][1] + next[1]) * cross;
  }
  return [
    weightedX / (3 * twiceArea),
    weightedZ / (3 * twiceArea),
  ];
}

function hullCross(origin, first, second) {
  return (first[0] - origin[0]) * (second[1] - origin[1])
    - (first[1] - origin[1]) * (second[0] - origin[0]);
}

function convexHull(points) {
  const sorted = [...points].sort((left, right) => (
    left[0] - right[0] || left[1] - right[1]
  ));
  const lower = [];
  for (const point of sorted) {
    while (
      lower.length >= 2
      && hullCross(lower.at(-2), lower.at(-1), point) <= 0
    ) {
      lower.pop();
    }
    lower.push(point);
  }
  const upper = [];
  for (const point of [...sorted].reverse()) {
    while (
      upper.length >= 2
      && hullCross(upper.at(-2), upper.at(-1), point) <= 0
    ) {
      upper.pop();
    }
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function projectWgs84([longitude, latitude]) {
  const [centerLongitude, centerLatitude] = binding.source.centerWgs84;
  const latitudeRadians = centerLatitude * Math.PI / 180;
  return [
    (longitude - centerLongitude) * 111_320 * Math.cos(latitudeRadians)
      / binding.source.metersPerSceneUnit,
    -(latitude - centerLatitude) * 110_540
      / binding.source.metersPerSceneUnit,
  ];
}

function segmentDistance(firstStart, firstEnd, secondStart, secondEnd) {
  const orientation = (a, b, c) => (
    (b[0] - a[0]) * (c[1] - a[1])
    - (b[1] - a[1]) * (c[0] - a[0])
  );
  const intersects = (
    orientation(firstStart, firstEnd, secondStart)
      * orientation(firstStart, firstEnd, secondEnd) < 0
    && orientation(secondStart, secondEnd, firstStart)
      * orientation(secondStart, secondEnd, firstEnd) < 0
  );
  if (intersects) return 0;
  return Math.min(
    pointSegmentDistance(firstStart, secondStart, secondEnd),
    pointSegmentDistance(firstEnd, secondStart, secondEnd),
    pointSegmentDistance(secondStart, firstStart, firstEnd),
    pointSegmentDistance(secondEnd, firstStart, firstEnd),
  );
}

function polygonPolylineDistance(polygon, line) {
  let minimum = Number.POSITIVE_INFINITY;
  for (let polygonIndex = 0; polygonIndex < polygon.length; polygonIndex += 1) {
    for (let lineIndex = 0; lineIndex < line.length - 1; lineIndex += 1) {
      minimum = Math.min(
        minimum,
        segmentDistance(
          polygon[polygonIndex],
          polygon[(polygonIndex + 1) % polygon.length],
          line[lineIndex],
          line[lineIndex + 1],
        ),
      );
    }
  }
  return minimum;
}

function roadWidth(road) {
  const scale = mapData.meta.environmentScale;
  if (road.name === "新华路" && road.highway.startsWith("tertiary")) {
    return 0.98 * scale;
  }
  if (road.highway.startsWith("trunk")) return 2.62 * scale;
  if (road.highway.startsWith("primary")) return 2.18 * scale;
  if (road.highway.startsWith("secondary")) return 1.82 * scale;
  if (road.highway.startsWith("tertiary")) return 1.45 * scale;
  if (road.highway === "residential") return 0.9 * scale;
  if (
    road.highway === "living_street"
    || road.highway === "unclassified"
  ) {
    return 0.68 * scale;
  }
  return 0.5 * scale;
}

function nearestAsphaltEdge(polygon, roadName) {
  return Math.min(...mapData.roads
    .filter((road) => road.name === roadName && !road.tunnel && road.layer >= 0)
    .map((road) => (
      polygonPolylineDistance(polygon, road.points) - roadWidth(road) / 2
    )));
}

test("上海民族乐团深审锁定仓内来源且 OSM 无命名、地址或 relation 绑定", () => {
  for (const source of Object.values(audit.sources)) {
    if (source.path && source.sha256) {
      const actual = source.shaPolicy === "review-time-snapshot-public-cross-cut-file"
        ? snapshotSha256(source.gitCommit, source.path)
        : sha256(source.path);
      assert.equal(actual, source.sha256);
    }
  }
  assert.equal(
    buildingOsm.osm3s.timestamp_osm_base,
    audit.sources.buildingOsm.timestampOsmBase,
  );
  assert.deepEqual(
    [...new Set(buildingOsm.elements.map((element) => element.type))],
    ["way"],
  );
  assert.equal(
    namedOsm.research.query.includes("上海民族乐团"),
    true,
  );
  assert.equal(
    namedOsm.research.query.includes("336"),
    true,
  );
  const namedOrAddressMatches = namedOsm.elements.filter((element) => (
    /上海民族乐团|民族乐团/.test(element.tags?.name ?? "")
    || (
      element.tags?.["addr:street"] === "新华路"
      && /^(336|336号)$/.test(element.tags?.["addr:housenumber"] ?? "")
    )
  ));
  assert.equal(namedOrAddressMatches.length, 0);
});

test("五个 way 的标签、面积、重心、道路和邻接关系均可复算但不含身份", () => {
  assert.deepEqual(audit.candidateWayIds, binding.candidateWayIds);
  for (const adjudication of audit.candidateWayAdjudications) {
    const rawWay = buildingOsm.elements.find(
      (element) => element.id === adjudication.sourceWayId,
    );
    assert.deepEqual(rawWay.tags, { building: "yes" });
    const mapCandidate = mapGate.candidateChecks.find(
      (candidate) => candidate.sourceWayId === adjudication.sourceWayId,
    );
    const buildChild = buildRecord.children.find(
      (child) => child.sourceWayId === adjudication.sourceWayId,
    );
    assert.equal(
      adjudication.footprintAreaSquareMeters,
      buildChild.footprintAreaSqMeters,
    );
    assert.deepEqual(
      adjudication.centroidWorld,
      polygonCentroid(mapCandidate.worldFootprint).map(
        (value) => round(value),
      ),
    );
    assert.equal(
      adjudication.runtimeFrameDistanceSceneUnits,
      round(pointPolygonDistance(
        audit.runtimeFrameDiagnostic.positionScene,
        mapCandidate.worldFootprint,
      )),
    );
    assert.equal(
      adjudication.xinhuaAsphaltEdgeClearanceSceneUnits,
      mapCandidate.roadDistance.xinhua.asphaltEdgeSceneUnits,
    );
    assert.equal(
      adjudication.fahuazhenAsphaltEdgeClearanceSceneUnits,
      mapCandidate.roadDistance.fahuazhen.asphaltEdgeSceneUnits,
    );
    assert.equal(adjudication.formalNamedBinding, "blocked");
  }
});

test("项目 runtime frame 只证明空间相容，不是地址或单栋成员证据", () => {
  const polygons = mapGate.candidateChecks.map(
    (candidate) => candidate.worldFootprint,
  );
  const hull = convexHull(polygons.flat());
  const anchor = audit.runtimeFrameDiagnostic.positionScene;
  assert.equal(pointInPolygon(anchor, hull), true);
  assert.equal(polygons.some((polygon) => pointInPolygon(anchor, polygon)), false);
  assert.equal(
    round(Math.min(...polygons.map(
      (polygon) => pointPolygonDistance(anchor, polygon),
    ))),
    audit.runtimeFrameDiagnostic.minimumCandidateFootprintDistanceSceneUnits,
  );
  assert.match(
    audit.runtimeFrameDiagnostic.sourceClass,
    /not-independent-address-geocode/,
  );
});

test("被排除的匿名 way 反证 proximity 和法华镇路照片不能闭合候选集", () => {
  const adjacentById = new Map(binding.adjacentUnknownWays.map(
    (way) => [way.sourceWayId, way],
  ));
  const way167Clearance = nearestAsphaltEdge(
    adjacentById.get(864505167).wgs84Footprint.map(projectWgs84),
    "法华镇路",
  );
  const way170Clearance = nearestAsphaltEdge(
    adjacentById.get(864505170).wgs84Footprint.map(projectWgs84),
    "法华镇路",
  );
  const selectedMinimum = Math.min(...audit.candidateWayAdjudications.map(
    (candidate) => candidate.fahuazhenAsphaltEdgeClearanceSceneUnits,
  ));
  assert.equal(round(way167Clearance), 0.51211);
  assert.equal(round(way170Clearance), 2.640173);
  assert.ok(way167Clearance < selectedMinimum);
  assert.ok(way170Clearance < selectedMinimum);
  assert.ok(mapGate.adjacency.adjacentGaps.some((gap) => (
    gap.candidateWayId === 864505165
    && gap.adjacentWayId === 864505164
    && gap.gapSceneUnits === 1.169289
  )));
  assert.ok(audit.referenceViewBinding.every(
    (view) => view.waySpecificBinding.length === 0,
  ));
});

test("深审只能保留 diagnostic，formal map、Hero 和 Identity 均不得晋级", () => {
  assert.equal(
    audit.status,
    "blocked-no-way-specific-or-exclusive-compound-membership-evidence",
  );
  assert.ok(audit.candidateWayAdjudications.every(
    (candidate) => candidate.formalNamedBinding === "blocked",
  ));
  assert.equal(
    audit.membershipVerdict.selectedSetExclusiveCompoundBoundary,
    "blocked",
  );
  assert.equal(audit.membershipVerdict.formalMapAcceptance, "blocked");
  assert.equal(
    audit.membershipVerdict.diagnosticGeometryRetention,
    "allowed-no-promotion",
  );
  assert.equal(audit.membershipVerdict.massing, "retained-unchanged");
  assert.equal(audit.membershipVerdict.hero, "hold-unchanged");
  assert.equal(audit.membershipVerdict.identity, "blocked-unchanged");
  assert.equal(audit.membershipVerdict.runtimePromotionAllowed, false);
  assert.match(
    audit.minimumEvidenceToCloseMembership.preferredSingleArtifact,
    /georeferenced|dimensioned authoritative site plan/,
  );
});
