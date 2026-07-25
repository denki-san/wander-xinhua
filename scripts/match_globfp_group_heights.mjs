import { access, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import polygonClipping from "polygon-clipping";

import {
  THRESHOLDS,
  boundsOverlap,
  buildGlobfpSources,
  buildTargets,
  matchMetrics,
  multiPolygonArea,
  multiPolygonBounds,
  multiPolygonCentroid,
} from "./generate_building_height_evidence.mjs";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const MAX_NEARBY_SOURCES = 8;
const MAX_GROUP_MEMBERS = 4;
const MAX_HEIGHT_SPREAD_METRES = 6;

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

function combinations(values, size, start = 0, prefix = [], output = []) {
  if (prefix.length === size) {
    output.push([...prefix]);
    return output;
  }
  for (let index = start; index <= values.length - (size - prefix.length); index += 1) {
    prefix.push(values[index]);
    combinations(values, size, index + 1, prefix, output);
    prefix.pop();
  }
  return output;
}

function validHeight(heightMetres) {
  return (
    Number.isFinite(heightMetres)
    && heightMetres >= THRESHOLDS.minimumHeightMetres
    && heightMetres <= THRESHOLDS.maximumHeightMetres
  );
}

function buildGroupCandidate(target, members) {
  let geometry;
  try {
    geometry = polygonClipping.union(...members.map((member) => member.geometry)) ?? [];
  } catch {
    return null;
  }
  const area = multiPolygonArea(geometry);
  if (!geometry.length || area <= 0) return null;
  const source = {
    geometry,
    area,
    bounds: multiPolygonBounds(geometry),
    centroid: multiPolygonCentroid(geometry),
  };
  const metrics = matchMetrics(target, source);
  const heights = members.map((member) => member.heightMetres);
  const minimumHeight = Math.min(...heights);
  const maximumHeight = Math.max(...heights);
  const heightSpreadMetres = maximumHeight - minimumHeight;
  const selectedHeightMetres = members.reduce(
    (sum, member) => sum + member.heightMetres * member.area,
    0,
  ) / members.reduce((sum, member) => sum + member.area, 0);
  const passesSpatialGate = (
    metrics.iou >= THRESHOLDS.minimumIou
    && metrics.centroidDistanceMetres <= THRESHOLDS.maximumCentroidDistanceMetres
    && metrics.areaRatio >= THRESHOLDS.minimumAreaRatio
    && metrics.areaRatio <= THRESHOLDS.maximumAreaRatio
  );
  return {
    sourceIndices: members.map((member) => member.sourceIndex),
    sourceFeatureIds: members.map((member) => member.featureId),
    sourceHeightsMetres: heights,
    selectedHeightMetres,
    heightSpreadMetres,
    ...metrics,
    passesGate: (
      passesSpatialGate
      && members.every((member) => validHeight(member.heightMetres))
      && heightSpreadMetres <= MAX_HEIGHT_SPREAD_METRES
    ),
  };
}

async function ensureNewOutput(path) {
  try {
    await access(path);
    throw new Error(`输出已存在，按原始数据保留规则拒绝覆盖：${path}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

export async function matchGlobfpGroupHeights({
  evidencePath,
  districtPath,
  osmPath,
  globfpPath,
  outputPath,
}) {
  await ensureNewOutput(outputPath);
  const [evidence, district, osm, globfp] = await Promise.all([
    readFile(evidencePath, "utf8").then(JSON.parse),
    readFile(districtPath, "utf8").then(JSON.parse),
    readFile(osmPath, "utf8").then(JSON.parse),
    readFile(globfpPath, "utf8").then(JSON.parse),
  ]);
  const cIds = new Set(
    evidence.records
      .filter((record) => record.confidence === "C")
      .map((record) => record.osmRef),
  );
  const firstRoundAcceptedSourceIds = new Set(
    evidence.records
      .filter((record) => (
        record.confidence === "B"
        && record.selectedSource === "3D-GloBFP"
        && record.footprintMatch?.sourceFeatureId
      ))
      .map((record) => record.footprintMatch.sourceFeatureId),
  );
  const targets = buildTargets(district, osm).accepted
    .filter((target) => cIds.has(target.record.assetId));
  const sources = buildGlobfpSources(globfp)
    .map((source, sourceIndex) => ({ ...source, sourceIndex }));
  const candidatesByTarget = new Map();

  for (const target of targets) {
    const nearby = sources
      .filter((source) => !firstRoundAcceptedSourceIds.has(source.featureId))
      .filter((source) => boundsOverlap(target.bounds, source.bounds, 8))
      .map((source) => ({
        ...source,
        singleMetrics: matchMetrics(target, source),
      }))
      .filter((source) => (
        source.singleMetrics.intersectionArea > 0
        || source.singleMetrics.centroidDistanceMetres <= 20
      ))
      .sort((left, right) => (
        right.singleMetrics.intersectionArea - left.singleMetrics.intersectionArea
        || left.singleMetrics.centroidDistanceMetres
          - right.singleMetrics.centroidDistanceMetres
      ))
      .slice(0, MAX_NEARBY_SOURCES);
    const candidates = [];
    for (
      let memberCount = 2;
      memberCount <= Math.min(MAX_GROUP_MEMBERS, nearby.length);
      memberCount += 1
    ) {
      for (const members of combinations(nearby, memberCount)) {
        const candidate = buildGroupCandidate(target, members);
        if (candidate) candidates.push(candidate);
      }
    }
    candidates.sort((left, right) => (
      Number(right.passesGate) - Number(left.passesGate)
      || right.iou - left.iou
      || left.centroidDistanceMetres - right.centroidDistanceMetres
      || left.heightSpreadMetres - right.heightSpreadMetres
      || left.sourceFeatureIds.join(",").localeCompare(right.sourceFeatureIds.join(","))
    ));
    candidatesByTarget.set(target.record.assetId, candidates);
  }

  const proposed = new Map();
  const sourceAssignments = new Map();
  for (const target of targets) {
    const passing = (candidatesByTarget.get(target.record.assetId) ?? [])
      .filter((candidate) => candidate.passesGate);
    if (!passing.length) continue;
    proposed.set(target.record.assetId, passing[0]);
    for (const sourceIndex of passing[0].sourceIndices) {
      const assignments = sourceAssignments.get(sourceIndex) ?? [];
      assignments.push(target.record.assetId);
      sourceAssignments.set(sourceIndex, assignments);
    }
  }

  const records = targets.map((target) => {
    const candidates = candidatesByTarget.get(target.record.assetId) ?? [];
    const proposal = proposed.get(target.record.assetId) ?? null;
    const sourceReuse = Boolean(
      proposal
      && proposal.sourceIndices.some(
        (sourceIndex) => (sourceAssignments.get(sourceIndex) ?? []).length > 1,
      )
    );
    const accepted = proposal && !sourceReuse ? proposal : null;
    const best = candidates[0] ?? null;
    return {
      osmRef: target.record.assetId,
      assignment: accepted
        ? "one-target-to-multiple-sources"
        : sourceReuse
          ? "ambiguous-source-reuse"
          : best
            ? "rejected"
            : "unmatched",
      passesGate: Boolean(accepted),
      selectedHeightMetres: accepted ? round(accepted.selectedHeightMetres, 2) : null,
      sourceFeatureIds: accepted?.sourceFeatureIds ?? best?.sourceFeatureIds ?? [],
      sourceHeightsMetres: accepted?.sourceHeightsMetres ?? best?.sourceHeightsMetres ?? [],
      iou: best ? round(best.iou) : null,
      centroidDistanceMetres: best ? round(best.centroidDistanceMetres) : null,
      areaRatio: best ? round(best.areaRatio) : null,
      heightSpreadMetres: best ? round(best.heightSpreadMetres) : null,
      candidateGroupCount: candidates.length,
      passingGroupCount: candidates.filter((candidate) => candidate.passesGate).length,
      candidates: candidates.slice(0, 3).map((candidate) => ({
        sourceFeatureIds: candidate.sourceFeatureIds,
        sourceHeightsMetres: candidate.sourceHeightsMetres.map((height) => round(height, 2)),
        selectedHeightMetres: round(candidate.selectedHeightMetres, 2),
        iou: round(candidate.iou),
        centroidDistanceMetres: round(candidate.centroidDistanceMetres),
        areaRatio: round(candidate.areaRatio),
        heightSpreadMetres: round(candidate.heightSpreadMetres),
        passesGate: candidate.passesGate,
      })),
    };
  }).sort((left, right) => left.osmRef.localeCompare(right.osmRef));

  const output = {
    schemaVersion: 1,
    dataset: "3D-GloBFP group reconciliation",
    generatedAt: new Date().toISOString(),
    targetCount: targets.length,
    policy: {
      memberCount: `2-${MAX_GROUP_MEMBERS}`,
      maximumNearbySources: MAX_NEARBY_SOURCES,
      minimumIou: THRESHOLDS.minimumIou,
      maximumCentroidDistanceMetres: THRESHOLDS.maximumCentroidDistanceMetres,
      minimumAreaRatio: THRESHOLDS.minimumAreaRatio,
      maximumAreaRatio: THRESHOLDS.maximumAreaRatio,
      maximumHeightSpreadMetres: MAX_HEIGHT_SPREAD_METRES,
      sourceReuseAllowed: false,
      firstRoundAcceptedSourceReuseAllowed: false,
    },
    counts: {
      accepted: records.filter((record) => record.passesGate).length,
      sourceReuseRejected: records
        .filter((record) => record.assignment === "ambiguous-source-reuse").length,
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
  const output = await matchGlobfpGroupHeights({
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
    globfpPath: resolve(PROJECT_ROOT, requiredArgument(argumentsList, "--globfp")),
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
