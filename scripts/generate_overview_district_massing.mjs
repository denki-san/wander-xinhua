import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  Scene,
  ShapeUtils,
  Uint32BufferAttribute,
  Vector2,
} from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import mapData from "../app/scene/xinhua-map-data.json" with { type: "json" };
import landmarkData from "../app/scene/xinhua-landmarks-data.json" with { type: "json" };
import replacementData from "../app/scene/overview-district-massing-replacements.json" with { type: "json" };
import {
  isSurfaceRoad,
  ROADS,
  roadWidth,
} from "../app/scene/road-surface-contract.ts";
import { terrainHeightAt } from "../app/scene/terrain.ts";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = resolve(dirname(SCRIPT_PATH), "..");
const RESEARCH_DATA_DIR = resolve(PROJECT_ROOT, "docs/research/data");
const SOURCE_OUTPUT = resolve(PROJECT_ROOT, "app/scene/xinhua-district-massing-data.json");
const RUNTIME_MANIFEST_OUTPUT = resolve(
  PROJECT_ROOT,
  "app/scene/xinhua-district-massing-runtime.json",
);
const GLB_OUTPUT = resolve(PROJECT_ROOT, "public/models/overview/xinhua-district-massing.glb");
const BUILD_RECORD_OUTPUT = resolve(
  PROJECT_ROOT,
  "docs/research/build-records/xinhua-district-massing.json",
);
const RELATION_ID = 13469094;
const OSM_AREA_ID = 3_600_000_000 + RELATION_ID;
const HEIGHT_BANDS = ["low", "mid", "high"];
const MATERIAL_COLORS = {
  low: "#c4c1b5",
  mid: "#bdbbb0",
  high: "#b6b4aa",
};
const MATERIAL_OPACITY = 0.58;
const ROAD_BUILDING_CLEARANCE = 0.18;
const ROAD_SETBACK_MIN_SCALE = 0.58;
const ROAD_SETBACK_HIGHWAYS = /^(trunk|primary|secondary|tertiary|residential)/;
const RUNTIME_BUDGETS = {
  maxBytes: 3_000_000,
  maxMeshes: 12,
  maxMaterials: 3,
  maxTriangles: 100_000,
  maxImages: 0,
};
const OVERPASS_QUERY = `[out:json][timeout:180];
area(${OSM_AREA_ID})->.searchArea;
(
  way["building"](area.searchArea);
  relation["building"](area.searchArea);
  way["building:part"](area.searchArea);
  relation["building:part"](area.searchArea);
);
out body geom;`;

function round(value, precision = 4) {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function pointKey(point) {
  return `${round(point.lon, 7)},${round(point.lat, 7)}`;
}

function samePoint(left, right, tolerance = 1e-7) {
  return Math.abs(left[0] - right[0]) <= tolerance
    && Math.abs(left[1] - right[1]) <= tolerance;
}

function cleanProjectedRing(points) {
  const cleaned = [];
  for (const point of points) {
    if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) return null;
    if (!cleaned.length || !samePoint(point, cleaned.at(-1))) cleaned.push(point);
  }
  if (cleaned.length > 1 && samePoint(cleaned[0], cleaned.at(-1))) cleaned.pop();
  if (cleaned.length < 3) return null;

  // 删除近似共线点，保持真实转角并降低概览层无意义的顶点成本。
  let changed = true;
  while (changed && cleaned.length > 3) {
    changed = false;
    for (let index = 0; index < cleaned.length; index += 1) {
      const previous = cleaned[(index - 1 + cleaned.length) % cleaned.length];
      const current = cleaned[index];
      const next = cleaned[(index + 1) % cleaned.length];
      const abX = current[0] - previous[0];
      const abZ = current[1] - previous[1];
      const acX = next[0] - previous[0];
      const acZ = next[1] - previous[1];
      const areaTwice = Math.abs(abX * acZ - abZ * acX);
      const baseline = Math.hypot(acX, acZ);
      if (baseline > 0 && areaTwice / baseline < 0.025) {
        cleaned.splice(index, 1);
        changed = true;
        break;
      }
    }
  }
  return cleaned;
}

function polygonSignedArea(ring) {
  return ring.reduce((sum, point, index) => {
    const next = ring[(index + 1) % ring.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2;
}

function polygonCentroid(ring) {
  const signedArea = polygonSignedArea(ring);
  if (Math.abs(signedArea) < 1e-8) {
    return [
      ring.reduce((sum, point) => sum + point[0], 0) / ring.length,
      ring.reduce((sum, point) => sum + point[1], 0) / ring.length,
    ];
  }
  let x = 0;
  let z = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const point = ring[index];
    const next = ring[(index + 1) % ring.length];
    const cross = point[0] * next[1] - next[0] * point[1];
    x += (point[0] + next[0]) * cross;
    z += (point[1] + next[1]) * cross;
  }
  return [x / (6 * signedArea), z / (6 * signedArea)];
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
    const intersects = ((currentPoint[1] > point[1]) !== (previousPoint[1] > point[1]))
      && point[0] < (
        (previousPoint[0] - currentPoint[0]) * (point[1] - currentPoint[1])
          / (previousPoint[1] - currentPoint[1])
        + currentPoint[0]
      );
    if (intersects) inside = !inside;
  }
  return inside;
}

function orientation(a, b, c) {
  const value = (b[1] - a[1]) * (c[0] - b[0])
    - (b[0] - a[0]) * (c[1] - b[1]);
  if (Math.abs(value) < 1e-8) return 0;
  return value > 0 ? 1 : 2;
}

function segmentsIntersect(a, b, c, d) {
  return orientation(a, b, c) !== orientation(a, b, d)
    && orientation(c, d, a) !== orientation(c, d, b);
}

function pointToSegmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, (
    (point[0] - start[0]) * dx + (point[1] - start[1]) * dz
  ) / lengthSquared));
  return Math.hypot(
    point[0] - (start[0] + dx * t),
    point[1] - (start[1] + dz * t),
  );
}

function segmentDistance(leftStart, leftEnd, rightStart, rightEnd) {
  if (segmentsIntersect(leftStart, leftEnd, rightStart, rightEnd)) return 0;
  return Math.min(
    pointToSegmentDistance(leftStart, rightStart, rightEnd),
    pointToSegmentDistance(leftEnd, rightStart, rightEnd),
    pointToSegmentDistance(rightStart, leftStart, leftEnd),
    pointToSegmentDistance(rightEnd, leftStart, leftEnd),
  );
}

const ROAD_SETBACK_SEGMENTS = ROADS
  .filter((road) => (
    isSurfaceRoad(road)
    && !road.bridge
    && ROAD_SETBACK_HIGHWAYS.test(road.highway)
  ))
  .flatMap((road) => {
    const clearance = roadWidth(road)
      * (road.highway.endsWith("_link") ? 0.78 : 1)
      / 2
      + ROAD_BUILDING_CLEARANCE;
    return road.points.slice(1).map((end, index) => {
      const start = road.points[index];
      return {
        roadId: road.id,
        roadName: road.name || null,
        highway: road.highway,
        start,
        end,
        clearance,
        minX: Math.min(start[0], end[0]) - clearance,
        maxX: Math.max(start[0], end[0]) + clearance,
        minZ: Math.min(start[1], end[1]) - clearance,
        maxZ: Math.max(start[1], end[1]) + clearance,
      };
    });
  });

function ringBounds(ring) {
  return ring.reduce((bounds, [x, z]) => ({
    minX: Math.min(bounds.minX, x),
    maxX: Math.max(bounds.maxX, x),
    minZ: Math.min(bounds.minZ, z),
    maxZ: Math.max(bounds.maxZ, z),
  }), {
    minX: Infinity,
    maxX: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  });
}

function ringConflictsWithRoadSegment(ring, bounds, segment) {
  if (
    bounds.maxX < segment.minX
    || bounds.minX > segment.maxX
    || bounds.maxZ < segment.minZ
    || bounds.minZ > segment.maxZ
  ) return false;
  const midpoint = [
    (segment.start[0] + segment.end[0]) / 2,
    (segment.start[1] + segment.end[1]) / 2,
  ];
  if (
    pointInPolygon(segment.start, ring)
    || pointInPolygon(segment.end, ring)
    || pointInPolygon(midpoint, ring)
  ) return true;
  for (let index = 0; index < ring.length; index += 1) {
    if (segmentDistance(
      ring[index],
      ring[(index + 1) % ring.length],
      segment.start,
      segment.end,
    ) < segment.clearance) return true;
  }
  return false;
}

function roadConflicts(ring, candidates = ROAD_SETBACK_SEGMENTS) {
  const bounds = ringBounds(ring);
  return candidates.filter((segment) => (
    ringConflictsWithRoadSegment(ring, bounds, segment)
  ));
}

export function auditRoadSetbacks(records) {
  return records.flatMap((record) => roadConflicts(record.outer).map((segment) => ({
    buildingId: record.assetId,
    roadId: segment.roadId,
    roadName: segment.roadName,
    highway: segment.highway,
  })));
}

function scaleRingFromCentroid(ring, centroid, scale) {
  return ring.map(([x, z]) => [
    centroid[0] + (x - centroid[0]) * scale,
    centroid[1] + (z - centroid[1]) * scale,
  ]);
}

function summarizeRoadConflicts(conflicts) {
  return [...new Map(conflicts.map((segment) => [
    segment.roadId,
    {
      roadId: segment.roadId,
      name: segment.roadName,
      highway: segment.highway,
      clearanceSceneUnits: round(segment.clearance, 3),
    },
  ])).values()].sort((left, right) => left.roadId.localeCompare(right.roadId));
}

function resolveRoadSetback(outer, holes, centroid) {
  const conflicts = roadConflicts(outer);
  if (!conflicts.length) {
    return {
      outer,
      holes,
      applied: false,
      scale: 1,
      roads: [],
    };
  }
  const roads = summarizeRoadConflicts(conflicts);
  if (conflicts.some((segment) => (
    pointToSegmentDistance(centroid, segment.start, segment.end) <= segment.clearance
  ))) {
    return {
      rejected: true,
      rejectionReason: "centroid-inside-road-corridor",
      scale: 0,
      roads,
    };
  }

  let validScale = 0;
  let invalidScale = 1;
  for (let iteration = 0; iteration < 20; iteration += 1) {
    const candidateScale = (validScale + invalidScale) / 2;
    const candidate = scaleRingFromCentroid(outer, centroid, candidateScale);
    if (roadConflicts(candidate, conflicts).length) {
      invalidScale = candidateScale;
    } else {
      validScale = candidateScale;
    }
  }
  const scale = Math.max(0, validScale - 0.002);
  if (scale < ROAD_SETBACK_MIN_SCALE) {
    return {
      rejected: true,
      rejectionReason: "below-minimum-retained-scale",
      scale,
      roads,
    };
  }
  return {
    outer: scaleRingFromCentroid(outer, centroid, scale),
    holes: holes.map((hole) => scaleRingFromCentroid(hole, centroid, scale)),
    applied: true,
    scale,
    roads,
  };
}

function polygonsIntersect(left, right) {
  if (left.some((point) => pointInPolygon(point, right))) return true;
  if (right.some((point) => pointInPolygon(point, left))) return true;
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const leftStart = left[leftIndex];
    const leftEnd = left[(leftIndex + 1) % left.length];
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      if (segmentsIntersect(
        leftStart,
        leftEnd,
        right[rightIndex],
        right[(rightIndex + 1) % right.length],
      )) return true;
    }
  }
  return false;
}

function maskPolygon(mask) {
  return [
    [mask.minX, mask.minZ],
    [mask.maxX, mask.minZ],
    [mask.maxX, mask.maxZ],
    [mask.minX, mask.maxZ],
  ];
}

function project({ lon, lat }) {
  const [centerLon, centerLat] = mapData.meta.centerWgs84;
  const metersPerLonDegree = 111_320 * Math.cos(centerLat * Math.PI / 180);
  return [
    (lon - centerLon) * metersPerLonDegree / mapData.meta.metersPerSceneUnit,
    -(lat - centerLat) * 110_540 / mapData.meta.metersPerSceneUnit,
  ];
}

function joinMemberGeometry(members) {
  const remaining = members
    .filter((member) => Array.isArray(member.geometry) && member.geometry.length >= 2)
    .map((member) => member.geometry.map(({ lon, lat }) => ({ lon, lat })));
  const rings = [];

  while (remaining.length) {
    const chain = remaining.shift();
    let extended = true;
    while (extended && pointKey(chain[0]) !== pointKey(chain.at(-1))) {
      extended = false;
      for (let index = 0; index < remaining.length; index += 1) {
        const candidate = remaining[index];
        const chainStart = pointKey(chain[0]);
        const chainEnd = pointKey(chain.at(-1));
        const candidateStart = pointKey(candidate[0]);
        const candidateEnd = pointKey(candidate.at(-1));
        if (chainEnd === candidateStart) {
          chain.push(...candidate.slice(1));
        } else if (chainEnd === candidateEnd) {
          chain.push(...candidate.slice(0, -1).reverse());
        } else if (chainStart === candidateEnd) {
          chain.unshift(...candidate.slice(0, -1));
        } else if (chainStart === candidateStart) {
          chain.unshift(...candidate.slice(1).reverse());
        } else {
          continue;
        }
        remaining.splice(index, 1);
        extended = true;
        break;
      }
    }
    rings.push({
      closed: pointKey(chain[0]) === pointKey(chain.at(-1)),
      points: chain,
    });
  }
  return rings;
}

function elementPolygons(element) {
  if (element.type === "way") {
    if (!Array.isArray(element.geometry) || element.geometry.length < 4) return [];
    return [{
      outer: element.geometry.map(project),
      holes: [],
    }];
  }
  if (element.type !== "relation" || !Array.isArray(element.members)) return [];
  const outerRings = joinMemberGeometry(
    element.members.filter((member) => member.type === "way" && member.role !== "inner"),
  );
  const innerRings = joinMemberGeometry(
    element.members.filter((member) => member.type === "way" && member.role === "inner"),
  );
  if (outerRings.some((ring) => !ring.closed) || innerRings.some((ring) => !ring.closed)) {
    return [];
  }
  const polygons = outerRings.map((ring) => ({
    outer: ring.points.map(project),
    holes: [],
  }));
  for (const inner of innerRings) {
    const projected = inner.points.map(project);
    const center = polygonCentroid(projected);
    const owner = polygons.find((polygon) => pointInPolygon(center, polygon.outer));
    if (owner) owner.holes.push(projected);
  }
  return polygons;
}

function numericTag(value) {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function resolveHeight(tags, footprintAreaSceneUnits) {
  const rawHeight = numericTag(tags?.height);
  if (rawHeight !== undefined) {
    return {
      heightMeters: Math.min(90, Math.max(3, rawHeight)),
      heightSource: "osm-height",
      rawValue: tags.height,
      adjusted: rawHeight < 3 || rawHeight > 90,
    };
  }
  const rawLevels = numericTag(tags?.["building:levels"]);
  if (rawLevels !== undefined) {
    const resolved = rawLevels * 3;
    return {
      heightMeters: Math.min(90, Math.max(3, resolved)),
      heightSource: "osm-levels",
      rawValue: tags["building:levels"],
      adjusted: resolved < 3 || resolved > 90,
    };
  }

  const areaMeters = footprintAreaSceneUnits
    * mapData.meta.metersPerSceneUnit
    * mapData.meta.metersPerSceneUnit;
  const kind = tags?.building ?? "yes";
  let heightMeters;
  if (["garage", "garages", "shed", "roof", "greenhouse"].includes(kind)) {
    heightMeters = 4.5;
  } else if (["house", "detached", "semidetached_house", "terrace"].includes(kind)) {
    heightMeters = 10.5;
  } else if (areaMeters < 120) {
    heightMeters = 9;
  } else if (areaMeters < 600) {
    heightMeters = 15;
  } else {
    heightMeters = 24;
  }
  return {
    heightMeters,
    heightSource: "heuristic",
    rawValue: null,
    adjusted: false,
  };
}

function heightBand(heightMeters) {
  if (heightMeters <= 12) return "low";
  if (heightMeters <= 24) return "mid";
  return "high";
}

function spatialChunk([x, z]) {
  const horizontal = x < 0 ? "west" : "east";
  const vertical = z < 0 ? "south" : "north";
  return `${horizontal}-${vertical}`;
}

export function materializeReplacementEntries() {
  return replacementData.entries.map((entry) => {
    if (!entry.replacementPolygonSource) return entry;
    const sourceKey = entry.replacementPolygonSource.split(".")[1];
    const source = landmarkData[sourceKey];
    return {
      ...entry,
      replacementPolygons: [
        source.boundary.map(([x, z]) => [
          round(source.position[0] + x),
          round(source.position[1] + z),
        ]),
      ],
    };
  });
}

function replacementFor(assetId, outer, replacements) {
  for (const entry of replacements) {
    if (!entry.replacementBoundsVerified) continue;
    if (entry.osmRefs?.includes(assetId)) return entry.poiId;
    if (entry.replacementMasks?.some((mask) => polygonsIntersect(outer, maskPolygon(mask)))) {
      return entry.poiId;
    }
    if (entry.replacementPolygons?.some((polygon) => polygonsIntersect(outer, polygon))) {
      return entry.poiId;
    }
  }
  return null;
}

function appendBuildingGeometry(accumulator, record) {
  const topRings = [record.outer, ...record.holes];
  const vectors = topRings.map((ring) => ring.map(([x, z]) => new Vector2(x, z)));
  const faces = ShapeUtils.triangulateShape(vectors[0], vectors.slice(1));
  const baseY = terrainHeightAt(record.centroid[0], record.centroid[1]) + 0.035;
  const topY = baseY + record.heightSceneUnits;
  const topVertexOffset = accumulator.positions.length / 3;
  const flattened = topRings.flat();

  for (const [x, z] of flattened) {
    accumulator.positions.push(x, topY, z);
    accumulator.normals.push(0, 1, 0);
  }
  for (const face of faces) {
    accumulator.indices.push(
      topVertexOffset + face[0],
      topVertexOffset + face[2],
      topVertexOffset + face[1],
    );
  }

  for (const ring of topRings) {
    for (let index = 0; index < ring.length; index += 1) {
      const start = ring[index];
      const end = ring[(index + 1) % ring.length];
      const edgeX = end[0] - start[0];
      const edgeZ = end[1] - start[1];
      const length = Math.hypot(edgeX, edgeZ);
      if (length < 1e-6) continue;
      const normalX = edgeZ / length;
      const normalZ = -edgeX / length;
      const offset = accumulator.positions.length / 3;
      accumulator.positions.push(
        start[0], baseY, start[1],
        end[0], baseY, end[1],
        end[0], topY, end[1],
        start[0], topY, start[1],
      );
      for (let vertex = 0; vertex < 4; vertex += 1) {
        accumulator.normals.push(normalX, 0, normalZ);
      }
      accumulator.indices.push(
        offset, offset + 2, offset + 1,
        offset, offset + 3, offset + 2,
      );
    }
  }
  accumulator.buildingIds.push(record.assetId);
}

function createFileReaderPolyfill() {
  if (typeof globalThis.FileReader !== "undefined") return;
  globalThis.FileReader = class NodeFileReader {
    result = null;
    onloadend = null;
    onerror = null;

    async readAsArrayBuffer(blob) {
      try {
        this.result = await blob.arrayBuffer();
        this.onloadend?.();
      } catch (error) {
        this.onerror?.(error);
      }
    }

    async readAsDataURL(blob) {
      try {
        const bytes = Buffer.from(await blob.arrayBuffer());
        this.result = `data:${blob.type};base64,${bytes.toString("base64")}`;
        this.onloadend?.();
      } catch (error) {
        this.onerror?.(error);
      }
    }
  };
}

async function exportBinaryGlb(scene) {
  createFileReaderPolyfill();
  const exporter = new GLTFExporter();
  const binary = await exporter.parseAsync(scene, {
    binary: true,
    onlyVisible: true,
    truncateDrawRange: true,
  });
  return Buffer.from(binary);
}

async function buildGlb(records) {
  const materials = Object.fromEntries(HEIGHT_BANDS.map((band) => [
    band,
    new MeshStandardMaterial({
      name: `district-massing-${band}`,
      color: MATERIAL_COLORS[band],
      roughness: 0.98,
      metalness: 0,
      transparent: true,
      opacity: MATERIAL_OPACITY,
      depthWrite: true,
    }),
  ]));
  const accumulators = new Map();
  for (const record of records) {
    const key = `${record.chunk}-${record.heightBand}`;
    if (!accumulators.has(key)) {
      accumulators.set(key, {
        chunk: record.chunk,
        band: record.heightBand,
        positions: [],
        normals: [],
        indices: [],
        buildingIds: [],
      });
    }
    appendBuildingGeometry(accumulators.get(key), record);
  }

  const scene = new Scene();
  scene.name = "xinhua-district-massing";
  for (const [key, accumulator] of [...accumulators].sort(([left], [right]) => (
    left.localeCompare(right)
  ))) {
    const geometry = new BufferGeometry();
    geometry.name = `district-${key}`;
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute(accumulator.positions, 3),
    );
    geometry.setAttribute(
      "normal",
      new Float32BufferAttribute(accumulator.normals, 3),
    );
    geometry.setIndex(new Uint32BufferAttribute(accumulator.indices, 1));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new Mesh(geometry, materials[accumulator.band]);
    mesh.name = `district-${key}`;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData = {
      chunk: accumulator.chunk,
      heightBand: accumulator.band,
      buildingCount: accumulator.buildingIds.length,
    };
    scene.add(mesh);
  }

  const glb = await exportBinaryGlb(scene);
  const chunks = [...accumulators].sort(([left], [right]) => left.localeCompare(right))
    .map(([key, accumulator]) => ({
      id: key,
      buildingCount: accumulator.buildingIds.length,
      vertices: accumulator.positions.length / 3,
      triangles: accumulator.indices.length / 3,
    }));
  scene.traverse((object) => object.geometry?.dispose?.());
  Object.values(materials).forEach((material) => material.dispose());
  return {
    glb,
    chunks,
    meshes: chunks.length,
    triangles: chunks.reduce((sum, chunk) => sum + chunk.triangles, 0),
  };
}

export function compileSourceRecords(raw) {
  if (!Array.isArray(raw?.elements)) throw new Error("OSM 原始快照缺少 elements 数组");
  const replacements = materializeReplacementEntries();
  const relationMemberWayIds = new Set(
    raw.elements
      .filter((element) => (
        element.type === "relation"
        && element.tags?.building
        && !element.tags?.["building:part"]
      ))
      .flatMap((relation) => relation.members ?? [])
      .filter((member) => member.type === "way")
      .map((member) => member.ref),
  );
  const sourceCounts = {
    totalElements: raw.elements.length,
    buildingWays: 0,
    buildingRelations: 0,
    buildingParts: 0,
  };
  const accepted = [];
  const excluded = [];
  const rejected = [];
  const heldParts = [];
  const acceptedIds = new Set();

  for (const element of raw.elements) {
    const assetId = `${element.type}/${element.id}`;
    const isPart = Boolean(element.tags?.["building:part"]);
    const isBuilding = Boolean(element.tags?.building);
    if (isPart) {
      sourceCounts.buildingParts += 1;
      heldParts.push({
        assetId,
        reason: "building-part-held-for-later-iteration",
      });
      continue;
    }
    if (!isBuilding) continue;
    if (element.type === "way") sourceCounts.buildingWays += 1;
    if (element.type === "relation") sourceCounts.buildingRelations += 1;
    if (element.type === "way" && relationMemberWayIds.has(element.id)) {
      rejected.push({ assetId, reason: "relation-member-outline-superseded" });
      continue;
    }
    const polygons = elementPolygons(element);
    if (!polygons.length) {
      rejected.push({ assetId, reason: "missing-or-open-geometry" });
      continue;
    }

    for (let polygonIndex = 0; polygonIndex < polygons.length; polygonIndex += 1) {
      const polygonId = polygons.length === 1 ? assetId : `${assetId}#${polygonIndex}`;
      if (acceptedIds.has(polygonId)) {
        rejected.push({ assetId: polygonId, reason: "duplicate-id" });
        continue;
      }
      const rawOuter = cleanProjectedRing(polygons[polygonIndex].outer);
      const outer = rawOuter && polygonSignedArea(rawOuter) < 0
        ? [...rawOuter].reverse()
        : rawOuter;
      const holes = polygons[polygonIndex].holes
        .map(cleanProjectedRing)
        .filter(Boolean);
      for (const hole of holes) {
        if (polygonSignedArea(hole) > 0) hole.reverse();
      }
      if (!outer || Math.abs(polygonSignedArea(outer)) < 0.02) {
        rejected.push({ assetId: polygonId, reason: "degenerate-ring" });
        continue;
      }
      const centroid = polygonCentroid(outer);
      const touchesBoundary = pointInPolygon(centroid, mapData.boundary)
        || outer.some((point) => pointInPolygon(point, mapData.boundary));
      if (!touchesBoundary) {
        rejected.push({ assetId: polygonId, reason: "outside-official-boundary" });
        continue;
      }
      const replacementPoiId = replacementFor(assetId, outer, replacements);
      if (replacementPoiId) {
        excluded.push({
          assetId: polygonId,
          reason: "authored-replacement",
          replacementPoiId,
        });
        continue;
      }
      const roadSetback = resolveRoadSetback(outer, holes, centroid);
      if (roadSetback.rejected) {
        rejected.push({
          assetId: polygonId,
          reason: "road-setback-unresolvable",
          roadSetbackReason: roadSetback.rejectionReason,
          roadSetbackScale: round(roadSetback.scale, 4),
          roadSetbackRoads: roadSetback.roads,
        });
        continue;
      }
      const footprintArea = Math.max(
        0,
        Math.abs(polygonSignedArea(outer))
          - holes.reduce((sum, hole) => sum + Math.abs(polygonSignedArea(hole)), 0),
      );
      const height = resolveHeight(element.tags, footprintArea);
      const record = {
        assetId: polygonId,
        osmType: element.type,
        osmId: element.id,
        sourceSnapshot: null,
        buildingType: element.tags.building,
        outer: roadSetback.outer.map(([x, z]) => [round(x), round(z)]),
        holes: roadSetback.holes.map((hole) => (
          hole.map(([x, z]) => [round(x), round(z)])
        )),
        centroid: centroid.map((value) => round(value)),
        footprintAreaSceneUnits: round(footprintArea, 3),
        roadSetbackApplied: roadSetback.applied,
        roadSetbackScale: round(roadSetback.scale, 4),
        roadSetbackRoads: roadSetback.roads,
        heightMeters: round(height.heightMeters, 2),
        heightSceneUnits: round(height.heightMeters / mapData.meta.metersPerSceneUnit, 4),
        heightSource: height.heightSource,
        heightRawValue: height.rawValue,
        heightAdjusted: height.adjusted,
        heightBand: heightBand(height.heightMeters),
        chunk: spatialChunk(centroid),
      };
      accepted.push(record);
      acceptedIds.add(polygonId);
    }
  }

  accepted.sort((left, right) => left.assetId.localeCompare(right.assetId));
  return {
    sourceCounts,
    accepted,
    excluded,
    rejected,
    heldParts,
    replacementEntries: replacements.map((entry) => ({
      poiId: entry.poiId,
      source: entry.source,
      osmRefs: entry.osmRefs,
      overviewAssetState: entry.overviewAssetState,
      replacementBoundsVerified: entry.replacementBoundsVerified,
    })),
  };
}

async function fetchOverpassSnapshot() {
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  const errors = [];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "wander-xinhua-district-massing/1.0 (local generation)",
        },
        body: new URLSearchParams({ data: OVERPASS_QUERY }),
        signal: AbortSignal.timeout(210_000),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const raw = await response.json();
      const stamp = new Date().toISOString()
        .replace(/[-:]/g, "")
        .replace("T", "-")
        .slice(0, 15);
      const filename = `xinhua-buildings-osm-${stamp}.json`;
      const output = resolve(RESEARCH_DATA_DIR, filename);
      await mkdir(RESEARCH_DATA_DIR, { recursive: true });
      await writeFile(output, `${JSON.stringify(raw, null, 2)}\n`);
      return { raw, output, endpoint, errors };
    } catch (error) {
      errors.push(`${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`Overpass 建筑快照获取失败：\n${errors.join("\n")}`);
}

async function latestRawSnapshot() {
  const names = (await readdir(RESEARCH_DATA_DIR))
    .filter((name) => /^xinhua-buildings-osm-\d{8}-\d{6}\.json$/.test(name))
    .sort();
  const name = names.at(-1);
  if (!name) throw new Error("没有可离线重放的建筑快照，请先运行 --fetch");
  const output = resolve(RESEARCH_DATA_DIR, name);
  return {
    raw: JSON.parse(await readFile(output, "utf8")),
    output,
    endpoint: null,
    errors: [],
  };
}

function countBy(items, key) {
  return Object.fromEntries(items.reduce((counts, item) => {
    const value = item[key];
    counts.set(value, (counts.get(value) ?? 0) + 1);
    return counts;
  }, new Map()));
}

async function run() {
  const argumentsList = process.argv.slice(2);
  const rawArgumentIndex = argumentsList.indexOf("--raw");
  let snapshot;
  if (argumentsList.includes("--fetch")) {
    snapshot = await fetchOverpassSnapshot();
  } else if (rawArgumentIndex >= 0) {
    const output = resolve(PROJECT_ROOT, argumentsList[rawArgumentIndex + 1]);
    snapshot = {
      raw: JSON.parse(await readFile(output, "utf8")),
      output,
      endpoint: null,
      errors: [],
    };
  } else {
    snapshot = await latestRawSnapshot();
  }

  const rawBytes = await readFile(snapshot.output);
  const compiled = compileSourceRecords(snapshot.raw);
  const snapshotName = basename(snapshot.output);
  compiled.accepted.forEach((record) => {
    record.sourceSnapshot = snapshotName;
  });
  const firstBuild = await buildGlb(compiled.accepted);
  const secondBuild = await buildGlb(compiled.accepted);
  const firstHash = sha256(firstBuild.glb);
  const secondHash = sha256(secondBuild.glb);
  if (firstHash !== secondHash) {
    throw new Error(`同一快照两次 GLB 输出不一致：${firstHash} != ${secondHash}`);
  }
  const budgetFailures = [];
  if (firstBuild.glb.byteLength > RUNTIME_BUDGETS.maxBytes) budgetFailures.push("bytes");
  if (firstBuild.meshes > RUNTIME_BUDGETS.maxMeshes) budgetFailures.push("meshes");
  if (firstBuild.triangles > RUNTIME_BUDGETS.maxTriangles) budgetFailures.push("triangles");
  if (budgetFailures.length) {
    throw new Error(`街区体块超出运行时预算：${budgetFailures.join(", ")}`);
  }
  if (argumentsList.includes("--verify-only")) {
    const existing = await readFile(GLB_OUTPUT);
    const existingHash = sha256(existing);
    if (existingHash !== firstHash) {
      throw new Error(`离线重放与现有 GLB 不一致：${firstHash} != ${existingHash}`);
    }
    process.stdout.write(`${JSON.stringify({
      deterministicReplay: true,
      sourceSnapshot: snapshotName,
      sha256: firstHash,
      acceptedBuildings: compiled.accepted.length,
      meshes: firstBuild.meshes,
      triangles: firstBuild.triangles,
    }, null, 2)}\n`);
    return;
  }

  const generatedAt = new Date().toISOString();
  const sourceRecord = {
    meta: {
      name: "新华路街道概览建筑体块",
      version: 1,
      generatedAt,
      osmRelationId: RELATION_ID,
      sourceSnapshot: snapshotName,
      sourceSnapshotSha256: sha256(rawBytes),
      coordinateSource: "app/scene/xinhua-map-data.json",
      terrainSource: "app/scene/terrain.ts",
      metersPerSceneUnit: mapData.meta.metersPerSceneUnit,
      buildingPartsPolicy: "held",
      nonSurveyDisclosure: true,
    },
    sourceCounts: compiled.sourceCounts,
    acceptedBuildings: compiled.accepted,
    excludedBuildings: compiled.excluded,
    rejectedBuildings: compiled.rejected,
    heldBuildingParts: compiled.heldParts,
    replacementEntries: compiled.replacementEntries,
  };
  const generatorBytes = await readFile(SCRIPT_PATH);
  const buildRecord = {
    assetId: "xinhua-district-massing",
    generatedAt,
    command: snapshot.endpoint
      ? "node scripts/generate_overview_district_massing.mjs --fetch"
      : `node scripts/generate_overview_district_massing.mjs --raw ${snapshotName}`,
    generator: {
      path: "scripts/generate_overview_district_massing.mjs",
      sha256: sha256(generatorBytes),
    },
    source: {
      rawSnapshot: `docs/research/data/${snapshotName}`,
      rawSnapshotSha256: sha256(rawBytes),
      overpassEndpoint: snapshot.endpoint,
      overpassQuery: OVERPASS_QUERY,
      overpassErrors: snapshot.errors,
      osmGenerator: snapshot.raw.generator ?? null,
      osmTimestamp: snapshot.raw.osm3s?.timestamp_osm_base ?? null,
      osmCopyright: "https://www.openstreetmap.org/copyright",
      osmLicence: "ODbL-1.0",
      relationId: RELATION_ID,
    },
    output: {
      sourceRecord: "app/scene/xinhua-district-massing-data.json",
      runtimeManifest: "app/scene/xinhua-district-massing-runtime.json",
      glb: "public/models/overview/xinhua-district-massing.glb",
      sha256: firstHash,
      bytes: firstBuild.glb.byteLength,
      meshes: firstBuild.meshes,
      nodes: firstBuild.meshes + 1,
      triangles: firstBuild.triangles,
      materials: 3,
      images: 0,
      textures: 0,
      bounds: mapData.bounds,
      chunks: firstBuild.chunks,
    },
    counts: {
      ...compiled.sourceCounts,
      acceptedBuildings: compiled.accepted.length,
      excludedBuildings: compiled.excluded.length,
      rejectedBuildings: compiled.rejected.length,
      heldBuildingParts: compiled.heldParts.length,
      heightProvenance: countBy(compiled.accepted, "heightSource"),
      heightBands: countBy(compiled.accepted, "heightBand"),
      replacementExclusions: countBy(compiled.excluded, "replacementPoiId"),
      roadSetbackAdjusted: compiled.accepted
        .filter((record) => record.roadSetbackApplied).length,
      roadSetbackRejected: compiled.rejected
        .filter((record) => record.reason === "road-setback-unresolvable").length,
    },
    budgets: RUNTIME_BUDGETS,
    deterministicReplay: {
      passed: true,
      firstSha256: firstHash,
      secondSha256: secondHash,
    },
    runtimeContract: {
      modes: ["overview"],
      weakNetworkRequests: 0,
      collisionObjects: 0,
      raycastObjects: 0,
      castShadow: false,
      opacity: MATERIAL_OPACITY,
      fallback: "existing-overview",
    },
  };

  await Promise.all([
    mkdir(dirname(SOURCE_OUTPUT), { recursive: true }),
    mkdir(dirname(RUNTIME_MANIFEST_OUTPUT), { recursive: true }),
    mkdir(dirname(GLB_OUTPUT), { recursive: true }),
    mkdir(dirname(BUILD_RECORD_OUTPUT), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(SOURCE_OUTPUT, `${JSON.stringify(sourceRecord, null, 2)}\n`),
    writeFile(RUNTIME_MANIFEST_OUTPUT, `${JSON.stringify({
      assetId: "xinhua-district-massing",
      url: `/models/overview/xinhua-district-massing.glb?v=${firstHash.slice(0, 12)}`,
      sha256: firstHash,
      bytes: firstBuild.glb.byteLength,
      meshes: firstBuild.meshes,
      triangles: firstBuild.triangles,
      modes: ["overview"],
      weakNetworkPolicy: "skip",
      castShadow: false,
      collision: false,
    }, null, 2)}\n`),
    writeFile(GLB_OUTPUT, firstBuild.glb),
    writeFile(BUILD_RECORD_OUTPUT, `${JSON.stringify(buildRecord, null, 2)}\n`),
  ]);
  process.stdout.write(`${JSON.stringify({
    sourceSnapshot: snapshotName,
    acceptedBuildings: compiled.accepted.length,
    excludedBuildings: compiled.excluded.length,
    rejectedBuildings: compiled.rejected.length,
    heldBuildingParts: compiled.heldParts.length,
    glbBytes: firstBuild.glb.byteLength,
    meshes: firstBuild.meshes,
    triangles: firstBuild.triangles,
    sha256: firstHash,
  }, null, 2)}\n`);
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await run();
}
