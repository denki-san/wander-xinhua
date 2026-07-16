import { readFile, writeFile } from "node:fs/promises";

const SHANGSHENG_SITE_ID = 765939973;
const HUASHAN_GREEN_ID = 444342095;
const SUN_KE_VILLA_ID = 864847877;
const COUNTRY_CLUB_ID = 864847881;
const NAVY_CLUB_ID = 864847883;
const HUASHAN_COURT_ID = 743778425;
const HUASHAN_SERVICE_BUILDING_ID = 743778426;

const root = new URL("../", import.meta.url);
const mapData = JSON.parse(await readFile(new URL("app/scene/xinhua-map-data.json", root), "utf8"));
const shangshengRaw = JSON.parse(await readFile(
  new URL("docs/research/data/shangsheng-xinsuo-overpass-20260716.json", root),
  "utf8",
));
const huashanRaw = JSON.parse(await readFile(
  new URL("docs/research/data/huashan-green-overpass-20260716.json", root),
  "utf8",
));

function round(value, precision = 4) {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

function openGeometry(geometry) {
  if (geometry.length < 2) return geometry;
  const first = geometry[0];
  const last = geometry.at(-1);
  return first.lon === last.lon && first.lat === last.lat ? geometry.slice(0, -1) : geometry;
}

function centroid(points) {
  return points.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]], [0, 0])
    .map((value) => value / points.length);
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const current = polygon[index];
    const prior = polygon[previous];
    const intersects = ((current[1] > point[1]) !== (prior[1] > point[1]))
      && point[0] < (prior[0] - current[0]) * (point[1] - current[1])
        / (prior[1] - current[1]) + current[0];
    if (intersects) inside = !inside;
  }
  return inside;
}

const [centerLon, centerLat] = mapData.meta.centerWgs84;
const metersPerLonDegree = 111_320 * Math.cos(centerLat * Math.PI / 180);
const metersPerLatDegree = 110_540;
const project = (longitude, latitude) => [
  (longitude - centerLon) * metersPerLonDegree / mapData.meta.metersPerSceneUnit,
  -(latitude - centerLat) * metersPerLatDegree / mapData.meta.metersPerSceneUnit,
];

function wayById(raw, id) {
  const way = raw.elements.find((element) => element.type === "way" && element.id === id);
  if (!way?.geometry?.length) throw new Error(`缺少 OSM way ${id}`);
  return way;
}

function buildSite(raw, siteId) {
  const site = wayById(raw, siteId);
  const lonLatBoundary = openGeometry(site.geometry).map(({ lon, lat }) => [lon, lat]);
  const worldBoundary = lonLatBoundary.map(([lon, lat]) => project(lon, lat));
  const position = centroid(worldBoundary);
  const localize = (geometry) => openGeometry(geometry)
    .map(({ lon, lat }) => project(lon, lat))
    .map(([x, z]) => [round(x - position[0]), round(z - position[1])]);
  const inside = (element) => {
    if (!element.geometry?.length) return false;
    const point = centroid(openGeometry(element.geometry).map(({ lon, lat }) => [lon, lat]));
    return pointInPolygon(point, lonLatBoundary);
  };
  return {
    inside,
    localize,
    position: position.map((value) => round(value)),
    boundary: worldBoundary.map(([x, z]) => [round(x - position[0]), round(z - position[1])]),
    source: site,
  };
}

function orientedBounds(points) {
  let longest = { length: 0, dx: 1, dz: 0 };
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const length = Math.hypot(dx, dz);
    if (length > longest.length) longest = { length, dx, dz };
  }
  const rotationY = Math.atan2(-longest.dz, longest.dx);
  const center = centroid(points);
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  const local = points.map(([x, z]) => {
    const dx = x - center[0];
    const dz = z - center[1];
    return [cos * dx - sin * dz, sin * dx + cos * dz];
  });
  const xs = local.map(([x]) => x);
  const zs = local.map(([, z]) => z);
  return {
    position: center.map((value) => round(value)),
    rotationY: round(rotationY, 6),
    width: round(Math.max(...xs) - Math.min(...xs)),
    depth: round(Math.max(...zs) - Math.min(...zs)),
  };
}

function localBounds(points, padding = 0.16) {
  const xs = points.map(([x]) => x);
  const zs = points.map(([, z]) => z);
  return {
    minX: round(Math.min(...xs) - padding),
    maxX: round(Math.max(...xs) + padding),
    minZ: round(Math.min(...zs) - padding),
    maxZ: round(Math.max(...zs) + padding),
  };
}

function shangshengFeature(id) {
  if (id === SUN_KE_VILLA_ID) return "sun-ke-villa";
  if (id === COUNTRY_CLUB_ID) return "country-club";
  if (id === NAVY_CLUB_ID) return "navy-club";
  if (id >= 1_300_000_000) return "new-campus";
  return "industrial";
}

function buildingStyle(id, feature, area) {
  if (feature === "sun-ke-villa") return { floors: 3, wall: "#b9a58d", roof: "#874a37", frame: "#4b3a31" };
  if (feature === "country-club") return { floors: 2, wall: "#ded4c1", roof: "#8d4d39", frame: "#56483b" };
  if (feature === "navy-club") return { floors: 2, wall: "#ebe3d4", roof: "#8a4e3b", frame: "#5b5145" };
  if (feature === "new-campus") return { floors: 4, wall: "#b7b0a4", roof: "#494b48", frame: "#344340" };
  const palette = [
    { wall: "#c9b9a1", roof: "#785044", frame: "#514740" },
    { wall: "#d9d1c1", roof: "#66564d", frame: "#4d504b" },
    { wall: "#b88d72", roof: "#6a4a40", frame: "#453b37" },
  ][id % 3];
  return { floors: area > 180 ? 4 : area > 72 ? 3 : 2, ...palette };
}

const shangsheng = buildSite(shangshengRaw, SHANGSHENG_SITE_ID);
const shangshengBuildings = shangshengRaw.elements
  .filter((element) => element.type === "way" && element.tags?.building && shangsheng.inside(element))
  .map((element) => {
    const boundary = shangsheng.localize(element.geometry);
    const bounds = orientedBounds(boundary);
    const feature = shangshengFeature(element.id);
    const style = buildingStyle(element.id, feature, bounds.width * bounds.depth);
    return {
      id: element.id,
      name: element.tags.name ?? "",
      feature,
      boundary,
      ...bounds,
      ...style,
      collision: [localBounds(boundary)],
    };
  });

const navyClub = shangshengBuildings.find((building) => building.id === NAVY_CLUB_ID);
if (!navyClub) throw new Error("上生新所数据缺少海军俱乐部");
const navyBounds = localBounds(navyClub.boundary, 0.08);
const navyWidth = navyBounds.maxX - navyBounds.minX;
const navyDepth = navyBounds.maxZ - navyBounds.minZ;
navyClub.collision = [
  {
    minX: navyBounds.minX,
    maxX: round(navyBounds.minX + navyWidth * 0.36),
    minZ: navyBounds.minZ,
    maxZ: navyBounds.maxZ,
  },
  {
    minX: round(navyBounds.minX + navyWidth * 0.72),
    maxX: navyBounds.maxX,
    minZ: navyBounds.minZ,
    maxZ: navyBounds.maxZ,
  },
  {
    minX: round(navyBounds.minX + navyWidth * 0.33),
    maxX: round(navyBounds.minX + navyWidth * 0.75),
    minZ: round(navyBounds.maxZ - navyDepth * 0.18),
    maxZ: navyBounds.maxZ,
  },
];

const huashan = buildSite(huashanRaw, HUASHAN_GREEN_ID);
const paths = huashanRaw.elements
  .filter((element) => element.type === "way" && element.tags?.highway === "footway" && element.geometry?.length)
  .filter((element) => element.geometry.some(({ lon, lat }) => pointInPolygon([lon, lat], openGeometry(huashan.source.geometry).map((point) => [point.lon, point.lat]))))
  .map((element) => ({ id: element.id, points: huashan.localize(element.geometry) }));

const courtWay = wayById(huashanRaw, HUASHAN_COURT_ID);
const serviceBuildingWay = wayById(huashanRaw, HUASHAN_SERVICE_BUILDING_ID);
const courtBoundary = huashan.localize(courtWay.geometry);
const serviceBoundary = huashan.localize(serviceBuildingWay.geometry);

const output = {
  meta: {
    // 使用原始快照时间，确保同一份数据重复生成时输出字节稳定。
    generatedAt: [
      shangshengRaw.osm3s?.timestamp_osm_base,
      huashanRaw.osm3s?.timestamp_osm_base,
    ].filter(Boolean).sort().at(-1),
    metersPerSceneUnit: mapData.meta.metersPerSceneUnit,
    environmentScale: mapData.meta.environmentScale,
    sourceSnapshots: {
      shangshengXinsuo: "docs/research/data/shangsheng-xinsuo-overpass-20260716.json",
      huashanGreenland: "docs/research/data/huashan-green-overpass-20260716.json",
    },
  },
  shangshengXinsuo: {
    osmWayId: SHANGSHENG_SITE_ID,
    position: shangsheng.position,
    boundary: shangsheng.boundary,
    buildings: shangshengBuildings,
    fountains: shangshengRaw.elements
      .filter((element) => element.type === "way" && element.tags?.amenity === "fountain" && shangsheng.inside(element))
      .map((element) => ({ id: element.id, boundary: shangsheng.localize(element.geometry) })),
  },
  huashanGreenland: {
    osmWayId: HUASHAN_GREEN_ID,
    position: huashan.position,
    boundary: huashan.boundary,
    paths,
    basketballCourt: {
      osmWayId: HUASHAN_COURT_ID,
      boundary: courtBoundary,
      ...orientedBounds(courtBoundary),
    },
    serviceBuilding: {
      osmWayId: HUASHAN_SERVICE_BUILDING_ID,
      boundary: serviceBoundary,
      ...orientedBounds(serviceBoundary),
      collision: localBounds(serviceBoundary),
    },
  },
};

await writeFile(
  new URL("app/scene/xinhua-landmarks-data.json", root),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(JSON.stringify({
  shangsheng: {
    position: output.shangshengXinsuo.position,
    boundaryPoints: output.shangshengXinsuo.boundary.length,
    buildings: output.shangshengXinsuo.buildings.length,
    namedBuildings: output.shangshengXinsuo.buildings.filter((building) => building.name).map((building) => building.name),
  },
  huashan: {
    position: output.huashanGreenland.position,
    boundaryPoints: output.huashanGreenland.boundary.length,
    paths: output.huashanGreenland.paths.length,
  },
}, null, 2));
