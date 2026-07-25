import {
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";

const RUN_STAMP = new Date().toISOString()
  .replace(/[-:]/g, "")
  .replace("T", "-")
  .slice(0, 15);
const MAP_FILE = new URL("../app/scene/xinhua-map-data.json", import.meta.url);
const RESEARCH_DIR = new URL("../docs/research/data/", import.meta.url);
const OUTPUT_FILE = new URL(
  `xinhua-building-inventory-${RUN_STAMP}.json`,
  RESEARCH_DIR,
);
const RAW_PREFIX = "xinhua-buildings-overpass-";

const CORE_BUILDING_IDS = new Set([
  743778426,
  864847856,
  864847877,
  864847881,
  864847883,
  864847892,
  1364679201,
  1364679204,
  1364679205,
  1368808689,
  1368808690,
  1537478450,
]);
const NAMED_LANDMARK_IDS = new Set([
  292250766,
  494633921,
]);

function round(value, precision = 5) {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

function pointInPolygon([x, z], polygon) {
  let inside = false;
  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index, index += 1
  ) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const intersects = ((currentPoint[1] > z) !== (previousPoint[1] > z))
      && x < (previousPoint[0] - currentPoint[0]) * (z - currentPoint[1])
        / (previousPoint[1] - currentPoint[1]) + currentPoint[0];
    if (intersects) inside = !inside;
  }
  return inside;
}

function polygonAreaAndCentroid(points) {
  let twiceArea = 0;
  let centroidX = 0;
  let centroidZ = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const cross = current[0] * next[1] - next[0] * current[1];
    twiceArea += cross;
    centroidX += (current[0] + next[0]) * cross;
    centroidZ += (current[1] + next[1]) * cross;
  }
  if (Math.abs(twiceArea) < 1e-8) {
    return {
      areaSceneSq: 0,
      centroid: [
        points.reduce((sum, [x]) => sum + x, 0) / points.length,
        points.reduce((sum, [, z]) => sum + z, 0) / points.length,
      ],
    };
  }
  return {
    areaSceneSq: Math.abs(twiceArea) / 2,
    centroid: [
      centroidX / (3 * twiceArea),
      centroidZ / (3 * twiceArea),
    ],
  };
}

function longestEdgeYaw(points) {
  let longest = { length: 0, yaw: 0 };
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const dx = next[0] - current[0];
    const dz = next[1] - current[1];
    const length = Math.hypot(dx, dz);
    if (length > longest.length) {
      longest = { length, yaw: Math.atan2(dx, dz) };
    }
  }
  let yaw = longest.yaw;
  while (yaw >= Math.PI / 2) yaw -= Math.PI;
  while (yaw < -Math.PI / 2) yaw += Math.PI;
  return yaw;
}

function parseMetric(value) {
  const parsed = Number.parseFloat(String(value ?? "").replace(/[^\d.+-]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function fallbackHeightMeters(buildingType) {
  if (buildingType === "roof") return 3;
  if (buildingType === "house") return 7.5;
  if (["apartments", "residential", "dormitory", "hotel"].includes(buildingType)) return 19.5;
  if (["university", "hospital", "school", "commercial", "office", "retail"].includes(buildingType)) return 13.5;
  return 10.5;
}

function heightContract(tags) {
  const explicitHeight = parseMetric(tags.height);
  if (explicitHeight) {
    return {
      heightMeters: round(explicitHeight, 2),
      heightEvidence: "observed-osm-height-tag",
      runtimeFallback: false,
    };
  }
  const levels = parseMetric(tags["building:levels"]);
  if (levels) {
    return {
      heightMeters: round(levels * 3.15 + 0.75, 2),
      heightEvidence: "inferred-from-osm-building-levels",
      runtimeFallback: false,
    };
  }
  return {
    heightMeters: fallbackHeightMeters(tags.building ?? "yes"),
    heightEvidence: "unknown-runtime-type-fallback",
    runtimeFallback: true,
  };
}

const names = (await readdir(RESEARCH_DIR))
  .filter((name) => name.startsWith(RAW_PREFIX) && name.endsWith(".json"))
  .sort();
const rawName = process.argv[2] ?? names.at(-1);
if (!rawName) throw new Error("没有找到 xinhua-buildings-overpass 原始快照");

const map = JSON.parse(await readFile(MAP_FILE, "utf8"));
const raw = JSON.parse(await readFile(new URL(rawName, RESEARCH_DIR), "utf8"));
const [centerLon, centerLat] = map.meta.centerWgs84;
const metersPerSceneUnit = map.meta.metersPerSceneUnit;
const metersPerLonDegree = 111_320 * Math.cos(centerLat * Math.PI / 180);
const metersPerLatDegree = 110_540;
const project = (longitude, latitude) => [
  (longitude - centerLon) * metersPerLonDegree / metersPerSceneUnit,
  -(latitude - centerLat) * metersPerLatDegree / metersPerSceneUnit,
];

const excluded = [];
const inventory = [];
for (const element of raw.elements) {
  if (element.type !== "way" || !Array.isArray(element.geometry)) {
    excluded.push({
      osmType: element.type,
      osmId: element.id,
      reason: "relation-or-missing-way-geometry-needs-review",
    });
    continue;
  }
  const footprint = element.geometry
    .filter(({ lon, lat }) => Number.isFinite(lon) && Number.isFinite(lat))
    .map(({ lon, lat }) => project(lon, lat));
  if (footprint.length > 1) {
    const first = footprint[0];
    const last = footprint.at(-1);
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) < 1e-7) {
      footprint.pop();
    }
  }
  if (footprint.length < 3) {
    excluded.push({
      osmType: element.type,
      osmId: element.id,
      reason: "fewer-than-three-footprint-points",
    });
    continue;
  }
  const { areaSceneSq, centroid } = polygonAreaAndCentroid(footprint);
  const intersectsBoundary = pointInPolygon(centroid, map.boundary)
    || footprint.some((point) => pointInPolygon(point, map.boundary));
  if (!intersectsBoundary) {
    excluded.push({
      osmType: element.type,
      osmId: element.id,
      reason: "outside-administrative-boundary",
    });
    continue;
  }

  const tags = element.tags ?? {};
  const isBuildingPart = Boolean(tags["building:part"]);
  const canonicalId = isBuildingPart
    ? `building-part:xinhua:osm-way-${element.id}`
    : `building:xinhua:osm-way-${element.id}`;
  const role = CORE_BUILDING_IDS.has(element.id)
    ? "core-building"
    : NAMED_LANDMARK_IDS.has(element.id)
      ? "named-landmark"
      : isBuildingPart
        ? "building-part"
        : "ordinary-building";
  const height = heightContract(tags);
  const sceneFootprint = footprint.map(([x, z]) => [round(x), round(z)]);
  inventory.push({
    id: canonicalId,
    role,
    osm: {
      type: element.type,
      id: element.id,
      building: tags.building ?? null,
      buildingPart: tags["building:part"] ?? null,
      levels: tags["building:levels"] ?? null,
      height: tags.height ?? null,
      name: tags.name ?? null,
      nameEn: tags["name:en"] ?? null,
      address: {
        street: tags["addr:street"] ?? null,
        houseNumber: tags["addr:housenumber"] ?? null,
      },
      heritage: tags.heritage ?? null,
      historic: tags.historic ?? null,
      roofShape: tags["roof:shape"] ?? null,
      roofMaterial: tags["roof:material"] ?? null,
      buildingMaterial: tags["building:material"] ?? null,
    },
    positioning: {
      authoredPosition: [round(centroid[0]), round(centroid[1])],
      footprint: sceneFootprint,
      footprintAreaSqMeters: round(areaSceneSq * metersPerSceneUnit ** 2, 1),
      axisYawRadians: round(longestEdgeYaw(footprint), 6),
      canonicalFront: "unknown",
      entranceDirection: "unknown",
      positionEvidence: "observed-osm-footprint",
      yawEvidence: "inferred-longest-footprint-edge-not-entrance-direction",
      scaleEvidence: {
        horizontal: "observed-osm-footprint",
        vertical: height.heightEvidence,
      },
      heightMeters: height.heightMeters,
      heightSceneUnits: round(height.heightMeters / metersPerSceneUnit, 4),
      runtimeFallbackHeight: height.runtimeFallback,
    },
    tierStrategy: {
      hero: role === "ordinary-building"
        ? "shared-validated-prototype-instance"
        : "asset-specific",
      identity: "shared-or-asset-specific-identity-required",
      massing: "footprint-derived-required",
      status: "inventory-only",
    },
    evidence: {
      sourceSnapshot: `docs/research/data/${rawName}`,
      fetchedAt: raw.research?.fetchedAt ?? null,
      geometry: "observed",
      facade: "unknown",
      rear: "unknown",
      roof: tags["roof:shape"] ? "observed-osm-tag" : "unknown",
    },
  });
}

inventory.sort((left, right) => left.id.localeCompare(right.id));
const countByRole = Object.fromEntries(
  [...new Set(inventory.map(({ role }) => role))]
    .sort()
    .map((role) => [role, inventory.filter((entry) => entry.role === role).length]),
);
const countByBuildingType = Object.fromEntries(
  [...new Set(inventory.map((entry) => entry.osm.building ?? "building-part"))]
    .sort()
    .map((buildingType) => [
      buildingType,
      inventory.filter((entry) => (entry.osm.building ?? "building-part") === buildingType).length,
    ]),
);
const output = {
  version: 1,
  generatedAt: new Date().toISOString(),
  scope: {
    administrativeRelationId: map.meta.osmRelationId,
    name: map.meta.name,
    metersPerSceneUnit,
    coordinateConvention: "X east, Z south",
    sourceSnapshot: `docs/research/data/${rawName}`,
  },
  qualityBoundary: {
    footprint: "OSM geometry is observed map evidence",
    axisYaw: "longest footprint edge is inferred massing axis, not a confirmed entrance/front",
    fallbackHeight: "runtime-only estimate; every missing real height remains explicitly unknown",
    facade: "web/photo research is still required before asset-specific Identity or Hero modeling",
  },
  summary: {
    included: inventory.length,
    excluded: excluded.length,
    countByRole,
    countByBuildingType,
    explicitHeightCount: inventory.filter((entry) => entry.positioning.scaleEvidence.vertical === "observed-osm-height-tag").length,
    levelsHeightCount: inventory.filter((entry) => entry.positioning.scaleEvidence.vertical === "inferred-from-osm-building-levels").length,
    fallbackHeightCount: inventory.filter((entry) => entry.positioning.runtimeFallbackHeight).length,
  },
  buildings: inventory,
  excluded,
};

await mkdir(RESEARCH_DIR, { recursive: true });
await writeFile(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({
  output: OUTPUT_FILE.pathname,
  ...output.summary,
}, null, 2));
