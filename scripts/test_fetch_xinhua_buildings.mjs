import { mkdir, readFile, writeFile } from "node:fs/promises";

const RUN_STAMP = new Date().toISOString()
  .replace(/[-:]/g, "")
  .replace("T", "-")
  .slice(0, 15);
const RELATION_ID = 13469094;
const MAP_FILE = new URL("../app/scene/xinhua-map-data.json", import.meta.url);
const RESEARCH_DIR = new URL("../docs/research/data/", import.meta.url);
const OUTPUT_FILE = new URL(
  `xinhua-buildings-overpass-${RUN_STAMP}.json`,
  RESEARCH_DIR,
);
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const map = JSON.parse(await readFile(MAP_FILE, "utf8"));
const [centerLon, centerLat] = map.meta.centerWgs84;
const metersPerSceneUnit = map.meta.metersPerSceneUnit;
const metersPerLonDegree = 111_320 * Math.cos(centerLat * Math.PI / 180);
const metersPerLatDegree = 110_540;
const sceneToWgs84 = ([x, z]) => [
  centerLon + x * metersPerSceneUnit / metersPerLonDegree,
  centerLat - z * metersPerSceneUnit / metersPerLatDegree,
];
const boundaryWgs84 = map.boundary.map(sceneToWgs84);
const longitudes = boundaryWgs84.map(([longitude]) => longitude);
const latitudes = boundaryWgs84.map(([, latitude]) => latitude);
const paddingDegrees = 0.00008;
const bbox = [
  Math.min(...latitudes) - paddingDegrees,
  Math.min(...longitudes) - paddingDegrees,
  Math.max(...latitudes) + paddingDegrees,
  Math.max(...longitudes) + paddingDegrees,
];
const bboxText = bbox.map((value) => value.toFixed(7)).join(",");
const query = `[out:json][timeout:180];
(
  way["building"](${bboxText});
  relation["building"](${bboxText});
  way["building:part"](${bboxText});
  relation["building:part"](${bboxText});
);
out tags center geom;`;

let result;
const errors = [];
for (const endpoint of OVERPASS_ENDPOINTS) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(210_000),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "WanderXinhuaBuildingInventory/1.0 (local research)",
      },
      body: new URLSearchParams({ data: query }),
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    result = await response.json();
    result.research = {
      endpoint,
      query,
      fetchedAt: new Date().toISOString(),
      administrativeRelationId: RELATION_ID,
      bbox,
      boundarySource: "app/scene/xinhua-map-data.json",
      policy: "原始 Overpass 响应只读保留；后续派生清单使用新文件。",
    };
    break;
  } catch (error) {
    errors.push(`${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (!result) {
  throw new Error(`所有 Overpass 端点均失败：${errors.join(" | ")}`);
}

await mkdir(RESEARCH_DIR, { recursive: true });
await writeFile(OUTPUT_FILE, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });

const buildings = result.elements.filter((element) => element.tags?.building);
const buildingParts = result.elements.filter((element) => element.tags?.["building:part"]);
console.log(JSON.stringify({
  output: OUTPUT_FILE.pathname,
  totalElements: result.elements.length,
  buildings: buildings.length,
  buildingParts: buildingParts.length,
  errors,
}, null, 2));
