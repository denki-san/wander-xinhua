import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import mapData from "../app/scene/xinhua-map-data.json" with { type: "json" };

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const METRES_PER_DEGREE_LATITUDE = 110_540;
const METRES_PER_DEGREE_LONGITUDE = 111_320
  * Math.cos(mapData.meta.centerWgs84[1] * Math.PI / 180);
const THRESHOLDS = {
  maximumCentroidDistanceMetres: 5,
  minimumAreaRatio: 0.67,
  maximumAreaRatio: 1.5,
  minimumHeightMetres: 3,
  maximumHeightMetres: 90,
};

function argumentValue(argumentsList, flag) {
  const index = argumentsList.indexOf(flag);
  return index >= 0 ? argumentsList[index + 1] : null;
}

function requiredArgument(argumentsList, flag) {
  const value = argumentValue(argumentsList, flag);
  if (!value) throw new Error(`缺少必需参数 ${flag}`);
  return value;
}

function round(value, precision = 4) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function project([longitude, latitude]) {
  return [
    (longitude - mapData.meta.centerWgs84[0]) * METRES_PER_DEGREE_LONGITUDE,
    (latitude - mapData.meta.centerWgs84[1]) * METRES_PER_DEGREE_LATITUDE,
  ];
}

function samePoint(left, right, tolerance = 1e-8) {
  return (
    Math.abs(left[0] - right[0]) <= tolerance
    && Math.abs(left[1] - right[1]) <= tolerance
  );
}

function closeRing(ring) {
  return [...ring, ring[0]];
}

function rawWayRing(element) {
  const points = (element?.geometry ?? [])
    .filter((point) => Number.isFinite(point.lon) && Number.isFinite(point.lat))
    .map((point) => project([point.lon, point.lat]));
  if (points.length > 1 && samePoint(points[0], points.at(-1))) points.pop();
  return points.length >= 3 ? closeRing(points) : [];
}

function ringSignedArea(ring) {
  let sum = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const point = ring[index];
    const next = ring[index + 1];
    sum += point[0] * next[1] - next[0] * point[1];
  }
  return sum / 2;
}

function ringCentroid(ring) {
  const signedArea = ringSignedArea(ring);
  if (Math.abs(signedArea) < 1e-8) {
    const points = ring.slice(0, -1);
    return [
      points.reduce((sum, point) => sum + point[0], 0) / points.length,
      points.reduce((sum, point) => sum + point[1], 0) / points.length,
    ];
  }
  let x = 0;
  let y = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const point = ring[index];
    const next = ring[index + 1];
    const cross = point[0] * next[1] - next[0] * point[1];
    x += (point[0] + next[0]) * cross;
    y += (point[1] + next[1]) * cross;
  }
  return [x / (6 * signedArea), y / (6 * signedArea)];
}

function passesGate(candidate) {
  return (
    candidate.centroidDistanceMetres <= THRESHOLDS.maximumCentroidDistanceMetres
    && candidate.areaRatio >= THRESHOLDS.minimumAreaRatio
    && candidate.areaRatio <= THRESHOLDS.maximumAreaRatio
    && candidate.heightMetres >= THRESHOLDS.minimumHeightMetres
    && candidate.heightMetres <= THRESHOLDS.maximumHeightMetres
  );
}

async function ensureNewOutput(path) {
  try {
    await access(path);
    throw new Error(`输出已存在，按原始数据保留规则拒绝覆盖：${path}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

export async function matchGhsObatHeightSlice({
  evidencePath,
  districtPath,
  osmPath,
  ghsObatPath,
  outputPath,
}) {
  await ensureNewOutput(outputPath);
  const [evidence, district, osm, ghsObat] = await Promise.all([
    readFile(evidencePath, "utf8").then(JSON.parse),
    readFile(districtPath, "utf8").then(JSON.parse),
    readFile(osmPath, "utf8").then(JSON.parse),
    readFile(ghsObatPath, "utf8").then(JSON.parse),
  ]);
  const cIds = new Set(
    evidence.records
      .filter((record) => record.confidence === "C")
      .map((record) => record.osmRef),
  );
  const elementById = new Map(
    osm.elements.map((element) => [`${element.type}/${element.id}`, element]),
  );
  const targets = district.acceptedBuildings
    .filter((record) => cIds.has(record.assetId))
    .map((record) => {
      const ring = rawWayRing(elementById.get(record.assetId));
      return {
        osmRef: record.assetId,
        centroid: ringCentroid(ring),
        areaSquareMetres: Math.abs(ringSignedArea(ring)),
      };
    });
  const sources = ghsObat.records.map((record, sourceIndex) => ({
    ...record,
    sourceIndex,
    point: project([record.longitude, record.latitude]),
  }));
  const candidatesByTarget = new Map();
  for (const target of targets) {
    const candidates = sources
      .map((source) => {
        const centroidDistanceMetres = Math.hypot(
          target.centroid[0] - source.point[0],
          target.centroid[1] - source.point[1],
        );
        if (centroidDistanceMetres > 20) return null;
        const candidate = {
          sourceIndex: source.sourceIndex,
          featureId: source.id,
          heightMetres: source.heightMetres,
          centroidDistanceMetres,
          areaRatio: source.areaSquareMetres > 0
            ? target.areaSquareMetres / source.areaSquareMetres
            : Infinity,
          targetAreaSquareMetres: target.areaSquareMetres,
          sourceAreaSquareMetres: source.areaSquareMetres,
        };
        return {
          ...candidate,
          passesGate: passesGate(candidate),
        };
      })
      .filter(Boolean)
      .sort((left, right) => (
        Number(right.passesGate) - Number(left.passesGate)
        || left.centroidDistanceMetres - right.centroidDistanceMetres
        || Math.abs(Math.log(left.areaRatio)) - Math.abs(Math.log(right.areaRatio))
        || left.featureId.localeCompare(right.featureId)
      ));
    candidatesByTarget.set(target.osmRef, candidates);
  }

  const passingSourceAssignments = new Map();
  for (const target of targets) {
    for (const candidate of (candidatesByTarget.get(target.osmRef) ?? [])
      .filter((record) => record.passesGate)) {
      const assignments = passingSourceAssignments.get(candidate.sourceIndex) ?? [];
      assignments.push(target.osmRef);
      passingSourceAssignments.set(candidate.sourceIndex, assignments);
    }
  }

  const records = targets.map((target) => {
    const candidates = candidatesByTarget.get(target.osmRef) ?? [];
    const passing = candidates.filter((candidate) => candidate.passesGate);
    const accepted = passing.length === 1
      && (passingSourceAssignments.get(passing[0].sourceIndex) ?? []).length === 1
      ? passing[0]
      : null;
    const best = candidates[0] ?? null;
    return {
      osmRef: target.osmRef,
      targetAreaSquareMetres: round(target.areaSquareMetres, 2),
      sourceFeatureId: best?.featureId ?? null,
      heightMetres: best?.heightMetres ?? null,
      centroidDistanceMetres: best ? round(best.centroidDistanceMetres) : null,
      areaRatio: best ? round(best.areaRatio) : null,
      candidateCount: candidates.length,
      passingCandidateCount: passing.length,
      assignment: accepted
        ? "one-to-one-centroid-area"
        : passing.length > 1
          ? "ambiguous-multiple-candidates"
          : passing.length === 1
            ? "ambiguous-source-reuse"
            : candidates.length
              ? "rejected"
              : "unmatched",
      passesGate: Boolean(accepted),
      rejectionReasons: accepted || !best ? [] : [
        ...(best.centroidDistanceMetres > THRESHOLDS.maximumCentroidDistanceMetres
          ? ["centroid-distance"]
          : []),
        ...(best.areaRatio < THRESHOLDS.minimumAreaRatio
          || best.areaRatio > THRESHOLDS.maximumAreaRatio
          ? ["area-ratio"]
          : []),
        ...(best.heightMetres < THRESHOLDS.minimumHeightMetres
          || best.heightMetres > THRESHOLDS.maximumHeightMetres
          ? ["height-range"]
          : []),
        ...(passing.length > 1 ? ["multiple-passing-candidates"] : []),
      ],
      candidates: candidates.slice(0, 5).map((candidate) => ({
        featureId: candidate.featureId,
        heightMetres: candidate.heightMetres,
        centroidDistanceMetres: round(candidate.centroidDistanceMetres),
        areaRatio: round(candidate.areaRatio),
        passesGate: candidate.passesGate,
      })),
    };
  }).sort((left, right) => left.osmRef.localeCompare(right.osmRef));

  const output = {
    schemaVersion: 1,
    dataset: "GHS-OBAT R2024A",
    generatedAt: new Date().toISOString(),
    sourcePath: ghsObatPath.slice(PROJECT_ROOT.length + 1),
    sourceSha256: sha256(await readFile(ghsObatPath)),
    targetCount: targets.length,
    thresholds: THRESHOLDS,
    counts: {
      oneToOneMatches: records.filter((record) => record.passesGate).length,
      ambiguous: records.filter((record) => record.assignment.startsWith("ambiguous")).length,
      rejected: records.filter((record) => record.assignment === "rejected").length,
      unmatched: records.filter((record) => record.assignment === "unmatched").length,
    },
    records,
  };
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  return output;
}

async function run() {
  const argumentsList = process.argv.slice(2);
  const districtPath = resolve(
    PROJECT_ROOT,
    argumentValue(argumentsList, "--district")
      ?? "app/scene/xinhua-district-massing-data.json",
  );
  const district = JSON.parse(await readFile(districtPath, "utf8"));
  const output = await matchGhsObatHeightSlice({
    evidencePath: resolve(
      PROJECT_ROOT,
      argumentValue(argumentsList, "--evidence")
        ?? "docs/research/building-height-evidence.json",
    ),
    districtPath,
    osmPath: resolve(
      PROJECT_ROOT,
      "docs/research/data",
      district.meta.sourceSnapshot,
    ),
    ghsObatPath: resolve(PROJECT_ROOT, requiredArgument(argumentsList, "--ghs-obat")),
    outputPath: resolve(PROJECT_ROOT, requiredArgument(argumentsList, "--output")),
  });
  process.stdout.write(`${JSON.stringify({
    dataset: output.dataset,
    targetCount: output.targetCount,
    counts: output.counts,
  }, null, 2)}\n`);
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await run();
}
