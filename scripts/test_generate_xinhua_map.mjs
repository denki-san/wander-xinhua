import { mkdir, writeFile } from "node:fs/promises";
import { loadLatestCompleteRawSnapshot } from "./xinhua-map-snapshots.mjs";

const RUN_STAMP = new Date().toISOString()
  .replace(/[-:]/g, "")
  .replace("T", "-")
  .slice(0, 15);
const RELATION_ID = 13469094;
const XINGFULI_WAY_ID = 400066625;
const BASE_METERS_PER_SCENE_UNIT = 13.5;
const ENVIRONMENT_SCALE = 5;
const METERS_PER_SCENE_UNIT = BASE_METERS_PER_SCENE_UNIT / ENVIRONMENT_SCALE;
const BASE_XINGFULI_VERTICAL_SCALE = 0.3;
const RESEARCH_DIR = new URL("../docs/research/data/", import.meta.url);
const OUTPUT_FILE = new URL("../app/scene/xinhua-map-data.json", import.meta.url);

const includedHighways = new Set([
  "trunk",
  "trunk_link",
  "primary",
  "primary_link",
  "secondary",
  "secondary_link",
  "tertiary",
  "tertiary_link",
  "residential",
  "living_street",
  "unclassified",
  "service",
]);

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: options.signal ?? AbortSignal.timeout(75_000),
    headers: {
      "User-Agent": "XinhuaMessengerMap/1.0 (local map generation)",
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

function round(value, precision = 4) {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const intersects = ((currentPoint[1] > point[1]) !== (previousPoint[1] > point[1]))
      && point[0] < (previousPoint[0] - currentPoint[0]) * (point[1] - currentPoint[1])
        / (previousPoint[1] - currentPoint[1]) + currentPoint[0];
    if (intersects) inside = !inside;
  }
  return inside;
}

function segmentIntersection(a, b, c, d) {
  const r = [b[0] - a[0], b[1] - a[1]];
  const s = [d[0] - c[0], d[1] - c[1]];
  const denominator = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(denominator) < 1e-9) return null;
  const offset = [c[0] - a[0], c[1] - a[1]];
  const t = (offset[0] * s[1] - offset[1] * s[0]) / denominator;
  const u = (offset[0] * r[1] - offset[1] * r[0]) / denominator;
  if (t < -1e-8 || t > 1 + 1e-8 || u < -1e-8 || u > 1 + 1e-8) return null;
  return Math.min(1, Math.max(0, t));
}

function clipSegmentToPolygon(start, end, polygon) {
  const cuts = [0, 1];
  for (let index = 0; index < polygon.length; index += 1) {
    const t = segmentIntersection(start, end, polygon[index], polygon[(index + 1) % polygon.length]);
    if (t !== null) cuts.push(t);
  }
  const orderedCuts = [...new Set(cuts.map((value) => round(value, 8)))].sort((a, b) => a - b);
  const pieces = [];
  for (let index = 0; index < orderedCuts.length - 1; index += 1) {
    const from = orderedCuts[index];
    const to = orderedCuts[index + 1];
    if (to - from < 1e-8) continue;
    const midpoint = (from + to) / 2;
    const sample = [
      start[0] + (end[0] - start[0]) * midpoint,
      start[1] + (end[1] - start[1]) * midpoint,
    ];
    if (!pointInPolygon(sample, polygon)) continue;
    pieces.push([
      [start[0] + (end[0] - start[0]) * from, start[1] + (end[1] - start[1]) * from],
      [start[0] + (end[0] - start[0]) * to, start[1] + (end[1] - start[1]) * to],
    ]);
  }
  return pieces;
}

function clipPolyline(points, polygon) {
  const chunks = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    for (const [start, end] of clipSegmentToPolygon(points[index], points[index + 1], polygon)) {
      const current = chunks.at(-1);
      const last = current?.at(-1);
      if (last && Math.hypot(last[0] - start[0], last[1] - start[1]) < 1e-5) {
        current.push(end);
      } else {
        chunks.push([start, end]);
      }
    }
  }
  return chunks;
}

function perpendicularDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  if (Math.abs(dx) + Math.abs(dz) < 1e-9) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(point[0] - (start[0] + dx * t), point[1] - (start[1] + dz * t));
}

function simplify(points, tolerance) {
  if (points.length <= 2) return points;
  let farthest = 0;
  let farthestIndex = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = perpendicularDistance(points[index], points[0], points.at(-1));
    if (distance > farthest) {
      farthest = distance;
      farthestIndex = index;
    }
  }
  if (farthest <= tolerance) return [points[0], points.at(-1)];
  return [
    ...simplify(points.slice(0, farthestIndex + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(farthestIndex), tolerance),
  ];
}

function pathLength(points) {
  return points.slice(1).reduce((sum, point, index) => (
    sum + Math.hypot(point[0] - points[index][0], point[1] - points[index][1])
  ), 0);
}

function midpointAndDirection(points) {
  const total = pathLength(points);
  let walked = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
    if (walked + length >= total / 2) {
      const t = (total / 2 - walked) / length;
      return {
        point: [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t],
        direction: [end[0] - start[0], end[1] - start[1]],
      };
    }
    walked += length;
  }
  return { point: points[0], direction: [1, 0] };
}

await mkdir(RESEARCH_DIR, { recursive: true });

let boundarySearch;
let boundaryResult;
let south;
let north;
let west;
let east;
let roadData;
let sourceSnapshotNames;
const replayRawSnapshot = process.argv.includes("--from-raw-snapshot");

if (replayRawSnapshot) {
  const fallback = await loadLatestCompleteRawSnapshot({
    researchDir: RESEARCH_DIR,
    relationId: RELATION_ID,
    xingfuliWayId: XINGFULI_WAY_ID,
  });
  boundarySearch = fallback.boundarySearch;
  roadData = fallback.roadData;
  sourceSnapshotNames = {
    boundary: fallback.boundaryName,
    roads: fallback.roadName,
    mode: "cached-replay",
  };
} else {
  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
  nominatimUrl.search = new URLSearchParams({
    q: "新华路街道,长宁区,上海市",
    format: "jsonv2",
    polygon_geojson: "1",
    addressdetails: "1",
  }).toString();
  boundarySearch = await fetchJson(nominatimUrl);
  boundaryResult = boundarySearch.find((result) => result.osm_type === "relation" && result.osm_id === RELATION_ID);
  if (!boundaryResult || boundaryResult.geojson?.type !== "Polygon") throw new Error("未找到新华路街道 OSM 行政边界");
  [south, north, west, east] = boundaryResult.boundingbox.map(Number);

  // 先按官方边界外接矩形取道路，再在本地用真实多边形逐段裁切；避免公共节点重复计算 relation area。
  const overpassQuery = `[out:json][timeout:60];way[highway](${south},${west},${north},${east});out tags geom;`;
  const overpassEndpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  const overpassErrors = [];
  for (const endpoint of overpassEndpoints) {
    try {
      roadData = await fetchJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ data: overpassQuery }),
      });
      break;
    } catch (error) {
      overpassErrors.push(`${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (!roadData) {
    const fallback = await loadLatestCompleteRawSnapshot({
      researchDir: RESEARCH_DIR,
      relationId: RELATION_ID,
      xingfuliWayId: XINGFULI_WAY_ID,
    });
    boundarySearch = fallback.boundarySearch;
    roadData = fallback.roadData;
    sourceSnapshotNames = {
      boundary: fallback.boundaryName,
      roads: fallback.roadName,
      mode: "cached-fallback",
      overpassErrors,
    };
  } else {
    const boundaryName = `xinhua-boundary-osm-${RUN_STAMP}.json`;
    const roadName = `xinhua-roads-osm-${RUN_STAMP}.json`;
    await writeFile(
      new URL(boundaryName, RESEARCH_DIR),
      `${JSON.stringify(boundarySearch, null, 2)}\n`,
      { flag: "wx" },
    );
    await writeFile(
      new URL(roadName, RESEARCH_DIR),
      `${JSON.stringify(roadData, null, 2)}\n`,
      { flag: "wx" },
    );
    sourceSnapshotNames = { boundary: boundaryName, roads: roadName, mode: "live" };
  }
}

boundaryResult = boundarySearch.find((result) => result.osm_type === "relation" && result.osm_id === RELATION_ID);
if (!boundaryResult || boundaryResult.geojson?.type !== "Polygon") throw new Error("原始快照中缺少新华路街道行政边界");
[south, north, west, east] = boundaryResult.boundingbox.map(Number);

const centerLat = (south + north) / 2;
const centerLon = (west + east) / 2;
const metersPerLonDegree = 111_320 * Math.cos(centerLat * Math.PI / 180);
const metersPerLatDegree = 110_540;
const project = (longitude, latitude) => [
  (longitude - centerLon) * metersPerLonDegree / METERS_PER_SCENE_UNIT,
  -(latitude - centerLat) * metersPerLatDegree / METERS_PER_SCENE_UNIT,
];

const rawBoundary = boundaryResult.geojson.coordinates[0];
const closedBoundary = rawBoundary[0][0] === rawBoundary.at(-1)[0]
  && rawBoundary[0][1] === rawBoundary.at(-1)[1]
  ? rawBoundary.slice(0, -1)
  : rawBoundary;
const projectedBoundary = simplify(
  closedBoundary.map(([longitude, latitude]) => project(longitude, latitude)),
  0.04 * ENVIRONMENT_SCALE,
).map(([x, z]) => [round(x), round(z)]);

const roads = [];
for (const element of roadData.elements) {
  const highway = element.tags?.highway;
  if (!includedHighways.has(highway) || !element.geometry?.length) continue;
  const projected = element.geometry.map(({ lon, lat }) => project(lon, lat));
  const clipped = clipPolyline(projected, projectedBoundary);
  clipped.forEach((chunk, chunkIndex) => {
    const simplified = simplify(
      chunk,
      (highway.includes("link") ? 0.025 : 0.045) * ENVIRONMENT_SCALE,
    )
      .map(([x, z]) => [round(x), round(z)]);
    if (simplified.length < 2 || pathLength(simplified) < 0.08 * ENVIRONMENT_SCALE) return;
    roads.push({
      id: `${element.id}-${chunkIndex}`,
      osmWayId: element.id,
      name: element.tags?.name ?? "",
      nameEn: element.tags?.["name:en"] ?? "",
      highway,
      lanes: Number.parseInt(element.tags?.lanes ?? "", 10) || null,
      bridge: element.tags?.bridge === "yes",
      layer: Number.parseInt(element.tags?.layer ?? "0", 10) || 0,
      tunnel: element.tags?.tunnel === "yes"
        || element.tags?.tunnel === "building_passage"
        || element.tags?.covered === "yes"
        || Number.parseInt(element.tags?.layer ?? "0", 10) < 0,
      points: simplified,
    });
  });
}

const xingfuliWay = roadData.elements.find((element) => element.id === XINGFULI_WAY_ID);
if (!xingfuliWay?.geometry?.length) throw new Error("未找到幸福里 OSM 步行街中心线");
const xingfuliPoints = xingfuliWay.geometry.map(({ lon, lat }) => project(lon, lat));
const xingfuliLengthScene = pathLength(xingfuliPoints);
const xingfuliAnchor = midpointAndDirection(xingfuliPoints);
const xingfuliScale = xingfuliLengthScene / 94;

const xs = projectedBoundary.map(([x]) => x);
const zs = projectedBoundary.map(([, z]) => z);
const output = {
  meta: {
    name: "上海市长宁区新华路街道",
    osmRelationId: RELATION_ID,
    areaSqKm: 2.2,
    environmentScale: ENVIRONMENT_SCALE,
    baseMetersPerSceneUnit: BASE_METERS_PER_SCENE_UNIT,
    metersPerSceneUnit: METERS_PER_SCENE_UNIT,
    centerWgs84: [round(centerLon, 7), round(centerLat, 7)],
    sourceUpdatedAt: new Date().toISOString(),
    sources: {
      officialBoundaryDescription: "https://zwgk.shcn.gov.cn/xxgk/qtzcwj-xhljdzcwj/2022/286/63744.html",
      openStreetMapRelation: `https://www.openstreetmap.org/relation/${RELATION_ID}`,
      openStreetMapCopyright: "https://www.openstreetmap.org/copyright",
      rawSnapshot: sourceSnapshotNames,
    },
  },
  bounds: {
    minX: round(Math.min(...xs)),
    maxX: round(Math.max(...xs)),
    minZ: round(Math.min(...zs)),
    maxZ: round(Math.max(...zs)),
  },
  boundary: projectedBoundary,
  roads,
  landmarks: {
    xingfuli: {
      osmWayId: XINGFULI_WAY_ID,
      address: "幸福路67号 / 番禺路381号",
      position: xingfuliAnchor.point.map((value) => round(value)),
      rotationY: round(-Math.atan2(xingfuliAnchor.direction[1], xingfuliAnchor.direction[0]), 6),
      horizontalScale: round(xingfuliScale, 6),
      verticalScale: round(BASE_XINGFULI_VERTICAL_SCALE * ENVIRONMENT_SCALE, 6),
      localLaneCenterZ: -7,
      lengthMeters: round(xingfuliLengthScene * METERS_PER_SCENE_UNIT, 1),
    },
  },
};

await writeFile(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({
  rawSnapshot: sourceSnapshotNames,
  boundaryPoints: output.boundary.length,
  roadWays: output.roads.length,
  namedRoads: [...new Set(output.roads.map((road) => road.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh")),
  bounds: output.bounds,
  xingfuli: output.landmarks.xingfuli,
}, null, 2));
