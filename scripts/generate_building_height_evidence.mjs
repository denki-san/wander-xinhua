import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import polygonClipping from "polygon-clipping";
import mapData from "../app/scene/xinhua-map-data.json" with { type: "json" };

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const DEFAULT_DISTRICT_RECORD = resolve(
  PROJECT_ROOT,
  "app/scene/xinhua-district-massing-data.json",
);
const DEFAULT_GLOBFP_EXTRACT = resolve(
  PROJECT_ROOT,
  "docs/research/data/xinhua-buildings-globfp-grid-2435-2020-20260725.json",
);
const DEFAULT_OVERTURE_EXTRACT = resolve(
  PROJECT_ROOT,
  "docs/research/data/xinhua-buildings-overture-2026-07-22.0-20260725.geojson",
);
const POC_SELECTION_OUTPUT = resolve(
  PROJECT_ROOT,
  "docs/research/building-height-poc-selection.json",
);
const POC_EVIDENCE_OUTPUT = resolve(
  PROJECT_ROOT,
  "docs/research/building-height-evidence-poc.json",
);
const POC_REPORT_OUTPUT = resolve(
  PROJECT_ROOT,
  "docs/research/building-height-match-report-poc.json",
);
const POC_REVIEW_QUEUE_OUTPUT = resolve(
  PROJECT_ROOT,
  "docs/research/building-height-manual-review-queue-poc.json",
);
const FULL_EVIDENCE_OUTPUT = resolve(
  PROJECT_ROOT,
  "docs/research/building-height-evidence.json",
);
const FULL_REPORT_OUTPUT = resolve(
  PROJECT_ROOT,
  "docs/research/building-height-match-report.json",
);
const RUNTIME_EVIDENCE_OUTPUT = resolve(
  PROJECT_ROOT,
  "app/scene/xinhua-building-height-runtime.json",
);
const POC_GATE_OUTPUT = resolve(
  PROJECT_ROOT,
  "docs/research/building-height-poc-gate.json",
);
const THRESHOLDS = {
  minimumIou: 0.7,
  maximumCentroidDistanceMetres: 5,
  minimumAreaRatio: 0.67,
  maximumAreaRatio: 1.5,
  minimumHeightMetres: 3,
  maximumHeightMetres: 90,
};
const POC_COUNT = 80;
const REVIEW_COUNT = 30;
const METRES_PER_DEGREE_LATITUDE = 110_540;
const METRES_PER_DEGREE_LONGITUDE = 111_320
  * Math.cos(mapData.meta.centerWgs84[1] * Math.PI / 180);

function round(value, precision = 4) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableRank(value) {
  return sha256(value).slice(0, 12);
}

function argumentValue(argumentsList, flag, fallback) {
  const index = argumentsList.indexOf(flag);
  return index >= 0 ? argumentsList[index + 1] : fallback;
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

function cleanRing(ring) {
  if (!Array.isArray(ring)) return null;
  const points = ring
    .filter((point) => (
      Array.isArray(point)
      && Number.isFinite(point[0])
      && Number.isFinite(point[1])
    ))
    .map(project);
  if (points.length > 1 && samePoint(points[0], points.at(-1))) points.pop();
  if (points.length < 3) return null;
  return points;
}

function closeRing(ring) {
  return [...ring, ring[0]];
}

function geometryToMultiPolygon(geometry) {
  if (!geometry) return [];
  const polygons = geometry.type === "Polygon"
    ? [geometry.coordinates]
    : geometry.type === "MultiPolygon"
      ? geometry.coordinates
      : [];
  return polygons
    .map((polygon) => polygon.map(cleanRing).filter(Boolean))
    .filter((polygon) => polygon.length)
    .map((polygon) => polygon.map(closeRing));
}

function rawWayToMultiPolygon(element) {
  const ring = cleanRing(
    (element?.geometry ?? []).map((point) => [point.lon, point.lat]),
  );
  return ring ? [[closeRing(ring)]] : [];
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

function multiPolygonArea(multiPolygon) {
  return multiPolygon.reduce((sum, polygon) => {
    if (!polygon.length) return sum;
    const outer = Math.abs(ringSignedArea(polygon[0]));
    const holes = polygon.slice(1)
      .reduce((holeSum, ring) => holeSum + Math.abs(ringSignedArea(ring)), 0);
    return sum + Math.max(0, outer - holes);
  }, 0);
}

function multiPolygonBounds(multiPolygon) {
  const bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };
  for (const polygon of multiPolygon) {
    for (const ring of polygon) {
      for (const [x, y] of ring) {
        bounds.minX = Math.min(bounds.minX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.maxY = Math.max(bounds.maxY, y);
      }
    }
  }
  return bounds;
}

function boundsOverlap(left, right, padding = 0) {
  return !(
    left.maxX + padding < right.minX
    || left.minX - padding > right.maxX
    || left.maxY + padding < right.minY
    || left.minY - padding > right.maxY
  );
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

function multiPolygonCentroid(multiPolygon) {
  let weightedX = 0;
  let weightedY = 0;
  let totalArea = 0;
  for (const polygon of multiPolygon) {
    if (!polygon.length) continue;
    const area = Math.abs(ringSignedArea(polygon[0]));
    const centroid = ringCentroid(polygon[0]);
    weightedX += centroid[0] * area;
    weightedY += centroid[1] * area;
    totalArea += area;
  }
  return totalArea > 0
    ? [weightedX / totalArea, weightedY / totalArea]
    : [0, 0];
}

function safeIntersection(left, right) {
  try {
    return polygonClipping.intersection(left, right) ?? [];
  } catch {
    return [];
  }
}

function matchMetrics(target, source) {
  const intersectionArea = multiPolygonArea(
    safeIntersection(target.geometry, source.geometry),
  );
  const unionArea = target.area + source.area - intersectionArea;
  const centroidDistanceMetres = Math.hypot(
    target.centroid[0] - source.centroid[0],
    target.centroid[1] - source.centroid[1],
  );
  return {
    iou: unionArea > 0 ? intersectionArea / unionArea : 0,
    centroidDistanceMetres,
    areaRatio: source.area > 0 ? target.area / source.area : Infinity,
    intersectionArea,
  };
}

function passesSpatialGate(metrics, heightMetres) {
  return (
    metrics.iou >= THRESHOLDS.minimumIou
    && metrics.centroidDistanceMetres <= THRESHOLDS.maximumCentroidDistanceMetres
    && metrics.areaRatio >= THRESHOLDS.minimumAreaRatio
    && metrics.areaRatio <= THRESHOLDS.maximumAreaRatio
    && Number.isFinite(heightMetres)
    && heightMetres >= THRESHOLDS.minimumHeightMetres
    && heightMetres <= THRESHOLDS.maximumHeightMetres
  );
}

function numericValue(value) {
  const number = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function globfpHeight(properties) {
  const preferred = ["Height", "height", "HEIGHT", "height_m", "Height_m"];
  for (const key of preferred) {
    const value = numericValue(properties?.[key]);
    if (value !== null) return { key, value };
  }
  const candidates = Object.entries(properties ?? {})
    .filter(([key]) => key.toLowerCase().includes("height"))
    .map(([key, value]) => ({ key, value: numericValue(value) }))
    .filter((entry) => entry.value !== null);
  return candidates.length === 1 ? candidates[0] : { key: null, value: null };
}

function globfpFeatureId(feature, index) {
  const properties = feature.properties ?? {};
  const value = properties.FID
    ?? properties.fid
    ?? properties.OBJECTID
    ?? properties.objectid
    ?? feature.id
    ?? feature.sourceFeatureIndex
    ?? index;
  return `grid-2435/${value}`;
}

function osmAssetId(element) {
  return `${element.type}/${element.id}`;
}

function buildTargets(districtRecord, rawSnapshot) {
  const elements = new Map(
    rawSnapshot.elements.map((element) => [osmAssetId(element), element]),
  );
  const build = (record) => {
    const element = elements.get(record.assetId.split("#")[0]);
    const geometry = rawWayToMultiPolygon(element);
    return {
      record,
      element,
      geometry,
      area: multiPolygonArea(geometry),
      bounds: multiPolygonBounds(geometry),
      centroid: multiPolygonCentroid(geometry),
    };
  };
  return {
    accepted: districtRecord.acceptedBuildings.map(build),
    excluded: districtRecord.excludedBuildings
      .map(build)
      .filter((target) => target.geometry.length),
  };
}

function buildGlobfpSources(extract) {
  return extract.features
    .map((feature, index) => {
      const geometry = geometryToMultiPolygon(feature.geometry);
      const height = globfpHeight(feature.properties);
      return {
        feature,
        featureId: globfpFeatureId(feature, index),
        geometry,
        area: multiPolygonArea(geometry),
        bounds: multiPolygonBounds(geometry),
        centroid: multiPolygonCentroid(geometry),
        heightMetres: height.value,
        heightProperty: height.key,
      };
    })
    .filter((source) => source.geometry.length && source.area > 0);
}

function exactOvertureByOsmRef(overture) {
  const index = new Map();
  for (const feature of overture.features ?? []) {
    for (const source of feature.properties?.sources ?? []) {
      const match = /^([wryn])(\d+)@/.exec(source.record_id ?? "");
      if (!match) continue;
      const type = match[1] === "w" ? "way" : match[1] === "r" ? "relation" : "node";
      const assetId = `${type}/${match[2]}`;
      const records = index.get(assetId) ?? [];
      records.push({
        id: feature.id,
        height: feature.properties?.height ?? null,
        numFloors: feature.properties?.num_floors ?? null,
        source,
      });
      index.set(assetId, records);
    }
  }
  return index;
}

function sortedByStableRank(records) {
  return [...records].sort((left, right) => (
    stableRank(left.record.assetId).localeCompare(stableRank(right.record.assetId))
  ));
}

function selectPocTargets(targets, verifiedGlobfpMatchIds) {
  const selected = new Map();
  function addCandidates(candidates, limit, reason) {
    if (selected.size >= POC_COUNT) return;
    let added = 0;
    for (const target of sortedByStableRank(candidates)) {
      const existing = selected.get(target.record.assetId);
      if (existing) {
        if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
        continue;
      }
      if (selected.size >= POC_COUNT) break;
      selected.set(target.record.assetId, {
        assetId: target.record.assetId,
        reasons: [reason],
      });
      added += 1;
      if (added >= limit || selected.size >= POC_COUNT) break;
    }
  }

  const distanceToReplacement = (target) => targets.excluded.reduce(
    (minimum, excluded) => Math.min(
      minimum,
      Math.hypot(
        target.centroid[0] - excluded.centroid[0],
        target.centroid[1] - excluded.centroid[1],
      ),
    ),
    Infinity,
  );

  addCandidates(
    targets.accepted.filter((target) => target.record.heightSource !== "heuristic"),
    POC_COUNT,
    "direct-osm-height-or-levels",
  );
  addCandidates(
    targets.accepted.filter((target) => target.record.heightMeters >= 24),
    5,
    "current-tallest-candidate",
  );
  addCandidates(
    targets.accepted.filter((target) => target.record.heightMeters <= 10.5),
    5,
    "low-rise-house-or-small-footprint",
  );
  addCandidates(
    targets.accepted.filter((target) => (
      target.record.heightMeters > 10.5 && target.record.heightMeters < 24
    )),
    5,
    "medium-district-block",
  );
  addCandidates(
    targets.accepted.filter((target) => (
      target.record.roadSetbackRoads?.some((road) => (
        road.name === "幸福路" || road.name === "法华镇路"
      ))
    )),
    5,
    "core-road-interface",
  );
  addCandidates(
    targets.accepted
      .filter((target) => distanceToReplacement(target) <= 25)
      .sort((left, right) => distanceToReplacement(left) - distanceToReplacement(right)),
    5,
    "authored-poi-replacement-edge",
  );
  addCandidates(
    targets.accepted.filter((target) => verifiedGlobfpMatchIds.has(target.record.assetId)),
    POC_COUNT,
    "strict-one-to-one-globfp-match",
  );
  addCandidates(targets.accepted, POC_COUNT, "balanced-deterministic-fill");

  const selectedTargets = targets.accepted.filter((target) => selected.has(target.record.assetId));
  return {
    targets: selectedTargets,
    records: [...selected.values()].sort((left, right) => (
      left.assetId.localeCompare(right.assetId)
    )),
  };
}

function candidateMatches(targets, sources) {
  const matches = new Map();
  for (const target of targets) {
    const candidates = [];
    for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex += 1) {
      const source = sources[sourceIndex];
      if (!boundsOverlap(target.bounds, source.bounds, 12)) continue;
      const metrics = matchMetrics(target, source);
      if (metrics.iou < 0.05 && metrics.centroidDistanceMetres > 20) continue;
      candidates.push({
        sourceIndex,
        featureId: source.featureId,
        heightMetres: source.heightMetres,
        heightProperty: source.heightProperty,
        ...metrics,
        passesSpatialGate: passesSpatialGate(metrics, source.heightMetres),
      });
    }
    candidates.sort((left, right) => (
      right.iou - left.iou
      || left.centroidDistanceMetres - right.centroidDistanceMetres
      || left.featureId.localeCompare(right.featureId)
    ));
    matches.set(target.record.assetId, candidates);
  }
  return matches;
}

function uniquePassingMatches(targets, matches) {
  const sourceAssignments = new Map();
  for (const target of targets) {
    const passing = (matches.get(target.record.assetId) ?? [])
      .filter((candidate) => candidate.passesSpatialGate);
    for (const candidate of passing) {
      const targetIds = sourceAssignments.get(candidate.sourceIndex) ?? [];
      targetIds.push(target.record.assetId);
      sourceAssignments.set(candidate.sourceIndex, targetIds);
    }
  }
  const accepted = new Map();
  for (const target of targets) {
    const passing = (matches.get(target.record.assetId) ?? [])
      .filter((candidate) => candidate.passesSpatialGate);
    if (passing.length !== 1) continue;
    const candidate = passing[0];
    if ((sourceAssignments.get(candidate.sourceIndex) ?? []).length !== 1) continue;
    accepted.set(target.record.assetId, candidate);
  }
  return accepted;
}

function directOsmCandidate(target) {
  const tags = target.element?.tags ?? {};
  const directHeight = numericValue(tags.height);
  if (directHeight !== null && directHeight > 0) {
    return {
      dataset: "OpenStreetMap",
      type: "direct-height",
      valueMetres: Math.min(90, Math.max(3, directHeight)),
      rawValue: tags.height,
      licence: "ODbL-1.0",
    };
  }
  const levels = numericValue(tags["building:levels"]);
  if (levels !== null && levels > 0) {
    return {
      dataset: "OpenStreetMap",
      type: "explicit-levels",
      valueMetres: Math.min(90, Math.max(3, levels * 3)),
      floorCount: levels,
      rawValue: tags["building:levels"],
      licence: "ODbL-1.0",
      conversion: "building:levels × 3 m",
    };
  }
  return null;
}

function buildEvidenceRecord({
  target,
  globfpSources,
  candidateList,
  globfpAccepted,
  overtureExact,
  scope,
  pocSelection,
  reviewedPocIds,
}) {
  const direct = directOsmCandidate(target);
  const bestCandidate = candidateList[0] ?? null;
  const acceptedCandidate = globfpAccepted.get(target.record.assetId) ?? null;
  const overtureRecords = overtureExact.get(target.record.assetId) ?? [];
  const sourceFeatures = [];
  const heightCandidates = [];
  const floorCountCandidates = [];

  if (direct) {
    sourceFeatures.push({
      dataset: "OpenStreetMap",
      versionOrYear: target.record.sourceSnapshot,
      featureId: target.record.assetId,
      licence: direct.licence,
      independence: "direct-source-of-record",
      accessedAt: "2026-07-25",
    });
    heightCandidates.push({
      dataset: "OpenStreetMap",
      sourceFeatureId: target.record.assetId,
      heightMetres: direct.valueMetres,
      method: direct.type,
      permitted: true,
      direct: true,
    });
    if (direct.floorCount) {
      floorCountCandidates.push({
        dataset: "OpenStreetMap",
        sourceFeatureId: target.record.assetId,
        floors: direct.floorCount,
        conversion: direct.conversion,
      });
    }
  }

  if (bestCandidate) {
    const source = globfpSources[bestCandidate.sourceIndex];
    sourceFeatures.push({
      dataset: "3D-GloBFP",
      versionOrYear: "2020",
      featureId: bestCandidate.featureId,
      licence: "CC-BY-4.0",
      heightMetres: bestCandidate.heightMetres,
      heightProperty: bestCandidate.heightProperty,
      independence: "independent-modelled-estimate",
      accessedAt: "2026-07-25",
    });
    heightCandidates.push({
      dataset: "3D-GloBFP",
      sourceFeatureId: bestCandidate.featureId,
      heightMetres: bestCandidate.heightMetres,
      method: "spatial-iou",
      permitted: true,
      direct: false,
      passesSpatialGate: bestCandidate.passesSpatialGate,
    });
    if (!source) throw new Error(`找不到 3D-GloBFP sourceIndex ${bestCandidate.sourceIndex}`);
  }

  for (const record of overtureRecords) {
    const osmDerived = record.source.dataset === "OpenStreetMap";
    sourceFeatures.push({
      dataset: "Overture Buildings",
      versionOrYear: "2026-07-22.0",
      featureId: record.id,
      licence: record.source.license,
      upstreamDataset: record.source.dataset,
      upstreamRecordId: record.source.record_id,
      independence: osmDerived ? "osm-derived-not-independent" : "independent",
      accessedAt: "2026-07-25",
    });
    if (record.height !== null) {
      heightCandidates.push({
        dataset: "Overture Buildings",
        sourceFeatureId: record.id,
        heightMetres: record.height,
        method: "exact-upstream-osm-reference",
        permitted: true,
        direct: false,
        independent: !osmDerived,
      });
    }
    if (record.numFloors !== null) {
      floorCountCandidates.push({
        dataset: "Overture Buildings",
        sourceFeatureId: record.id,
        floors: record.numFloors,
        independence: osmDerived ? "osm-derived-not-independent" : "independent",
      });
    }
  }

  heightCandidates.push({
    dataset: "wander-xinhua",
    sourceFeatureId: target.record.assetId,
    heightMetres: target.record.heightMeters,
    method: "baseline-footprint-type-heuristic",
    permitted: true,
    direct: false,
  });

  let confidence = "C";
  let selectedHeightMetres = target.record.heightMeters;
  let selectedSource = "wander-xinhua-heuristic";
  let selectionReason = "no permitted unambiguous match passed; retain deterministic heuristic";
  const modelledEstimateRequiresManualReview = Boolean(
    acceptedCandidate
    && (
      acceptedCandidate.heightMetres > 60
      || Math.abs(acceptedCandidate.heightMetres - target.record.heightMeters) > 30
    )
  );
  const modelledEstimateReviewed = reviewedPocIds.has(target.record.assetId);
  const modelledEstimateAllowed = Boolean(
    acceptedCandidate
    && (
      !modelledEstimateRequiresManualReview
      || scope === "poc"
      || modelledEstimateReviewed
    )
  );
  if (modelledEstimateAllowed) {
    confidence = "B";
    selectedHeightMetres = round(acceptedCandidate.heightMetres, 2);
    selectedSource = "3D-GloBFP";
    selectionReason = "permitted one-to-one 3D-GloBFP estimate passed the frozen spatial gate";
  } else if (acceptedCandidate && modelledEstimateRequiresManualReview) {
    selectionReason = "modelled skyline outlier passed spatial matching but lacks completed manual review; retain deterministic heuristic";
  }
  if (direct) {
    confidence = "A";
    selectedHeightMetres = round(direct.valueMetres, 2);
    selectedSource = "OpenStreetMap";
    selectionReason = direct.type === "direct-height"
      ? "valid direct OSM height outranks modelled estimates"
      : "explicit OSM floor count converted by the documented 3 m rule";
  }

  const passingCount = candidateList.filter((candidate) => candidate.passesSpatialGate).length;
  const sourceReuse = acceptedCandidate
    ? false
    : passingCount > 0 && !globfpAccepted.has(target.record.assetId);
  const directConflict = Boolean(
    direct
    && bestCandidate
    && Number.isFinite(bestCandidate.heightMetres)
    && Math.abs(direct.valueMetres - bestCandidate.heightMetres) > 6
  );
  const currentnessRisks = [];
  if (bestCandidate) currentnessRisks.push("3D-GloBFP represents 2020 conditions");
  if (direct) currentnessRisks.push("OSM field age and contributor accuracy require contextual review");

  return {
    osmRef: target.record.assetId,
    overviewAssetId: target.record.assetId,
    scope,
    pocSelected: pocSelection.has(target.record.assetId),
    pocSelectionReasons: pocSelection.get(target.record.assetId)?.reasons ?? [],
    sourceFeatures,
    footprintMatch: bestCandidate ? {
      method: "spatial-iou",
      sourceFeatureId: bestCandidate.featureId,
      iou: round(bestCandidate.iou),
      centroidDistanceMetres: round(bestCandidate.centroidDistanceMetres),
      areaRatio: round(bestCandidate.areaRatio),
      assignment: acceptedCandidate
        ? "one-to-one"
        : passingCount > 1
          ? "ambiguous-multiple-candidates"
          : sourceReuse
            ? "ambiguous-source-reuse"
            : "rejected-or-unmatched",
      passesSpatialGate: Boolean(acceptedCandidate),
      candidateCount: candidateList.length,
      passingCandidateCount: passingCount,
    } : {
      method: "spatial-iou",
      sourceFeatureId: null,
      iou: null,
      centroidDistanceMetres: null,
      areaRatio: null,
      assignment: "unmatched",
      passesSpatialGate: false,
      candidateCount: 0,
      passingCandidateCount: 0,
    },
    heightCandidates,
    floorCountCandidates,
    baselineHeightMetres: target.record.heightMeters,
    selectedHeightMetres,
    selectedSource,
    selectionReason,
    confidence,
    observedFacts: [
      `OSM footprint ${target.record.assetId} is the overview source of record`,
      ...(direct ? [`OSM directly records ${direct.rawValue} as ${direct.type}`] : []),
    ],
    inferences: [
      ...(confidence === "B"
        ? ["selected height is a 2020 modelled estimate, not a survey measurement"]
        : []),
      ...(confidence === "C"
        ? ["height remains a footprint/type heuristic"]
        : []),
    ],
    unknowns: [
      "roof geometry and podium are not established by this height record",
      "facade, entrance, materials and unseen sides require separate photo evidence",
      ...(confidence === "C" ? ["real building height remains unknown"] : []),
    ],
    roofOrPodiumNotes: [],
    currentnessRisks,
    directEvidenceConflict: directConflict,
    manualReviewRequired: modelledEstimateRequiresManualReview,
    manualReviewStatus: modelledEstimateRequiresManualReview
      ? modelledEstimateReviewed
        ? "reviewed"
        : scope === "poc"
          ? "queued"
          : "retained-baseline-unreviewed"
      : "not-required",
    detailSceneReadiness: confidence === "A" ? "needs-review" : "not-ready",
    evidencePaths: [
      `docs/research/data/${target.record.sourceSnapshot}`,
      ...(bestCandidate
        ? ["docs/research/data/xinhua-buildings-globfp-grid-2435-2020-20260725.json"]
        : []),
      ...(overtureRecords.length
        ? ["docs/research/data/xinhua-buildings-overture-2026-07-22.0-20260725.geojson"]
        : []),
    ],
  };
}

function countBy(records, selector) {
  const counts = new Map();
  for (const record of records) {
    const value = selector(record);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort());
}

function distribution(records, selector) {
  const values = records.map(selector).filter(Number.isFinite).sort((a, b) => a - b);
  const percentile = (fraction) => values[Math.min(
    values.length - 1,
    Math.max(0, Math.floor((values.length - 1) * fraction)),
  )];
  return {
    count: values.length,
    min: round(values[0] ?? 0, 2),
    p25: round(percentile(0.25) ?? 0, 2),
    median: round(percentile(0.5) ?? 0, 2),
    p75: round(percentile(0.75) ?? 0, 2),
    max: round(values.at(-1) ?? 0, 2),
  };
}

function buildManualReviewQueue(evidenceRecords) {
  const queue = new Map();
  function add(records, reason, limit = REVIEW_COUNT) {
    for (const record of records) {
      const existing = queue.get(record.osmRef);
      if (existing) {
        if (!existing.reviewReasons.includes(reason)) existing.reviewReasons.push(reason);
        continue;
      }
      queue.set(record.osmRef, {
        osmRef: record.osmRef,
        reviewReasons: [reason],
        confidence: record.confidence,
        baselineHeightMetres: record.baselineHeightMetres,
        selectedHeightMetres: record.selectedHeightMetres,
        selectedSource: record.selectedSource,
        footprintMatch: record.footprintMatch,
        directEvidenceConflict: record.directEvidenceConflict,
        decision: "pending",
        reviewerNotes: "",
      });
      if (queue.size >= limit) break;
    }
  }
  const byStable = (records) => [...records].sort((left, right) => (
    stableRank(left.osmRef).localeCompare(stableRank(right.osmRef))
  ));
  add(byStable(evidenceRecords.filter((record) => record.confidence === "A")), "direct-evidence");
  add(
    evidenceRecords.filter((record) => (
      record.pocSelectionReasons.includes("core-road-interface")
      || record.pocSelectionReasons.includes("authored-poi-replacement-edge")
    )),
    "road-or-poi-interface",
    20,
  );
  add(
    [...evidenceRecords]
      .filter((record) => record.confidence === "B")
      .sort((left, right) => left.footprintMatch.iou - right.footprintMatch.iou),
    "lowest-passing-iou",
    24,
  );
  add(
    [...evidenceRecords].sort((left, right) => (
      Math.abs(right.selectedHeightMetres - right.baselineHeightMetres)
      - Math.abs(left.selectedHeightMetres - left.baselineHeightMetres)
    )),
    "largest-height-change",
    27,
  );
  add(
    [...evidenceRecords].sort((left, right) => right.selectedHeightMetres - left.selectedHeightMetres),
    "skyline-high-point",
    30,
  );
  add(byStable(evidenceRecords), "balanced-review-fill");
  return [...queue.values()].slice(0, REVIEW_COUNT);
}

function buildReport({
  scope,
  targetCount,
  evidenceRecords,
  globfpExtract,
  overtureExtract,
  manualReviewQueue,
}) {
  const globfpCandidateCount = evidenceRecords
    .filter((record) => record.footprintMatch.candidateCount > 0).length;
  const matchedCount = evidenceRecords
    .filter((record) => record.footprintMatch.passesSpatialGate).length;
  const ambiguousCount = evidenceRecords
    .filter((record) => record.footprintMatch.assignment.startsWith("ambiguous")).length;
  const rejectedCount = evidenceRecords
    .filter((record) => (
      record.footprintMatch.candidateCount > 0
      && !record.footprintMatch.passesSpatialGate
      && !record.footprintMatch.assignment.startsWith("ambiguous")
    )).length;
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    scope,
    targetCount,
    thresholds: THRESHOLDS,
    sourceAvailability: [
      {
        dataset: "OpenStreetMap",
        status: "available",
        licence: "ODbL-1.0",
        role: "footprint source of record and direct tags",
      },
      {
        dataset: "3D-GloBFP",
        status: "available",
        licence: "CC-BY-4.0",
        role: "primary independent modelled height",
        productYear: 2020,
        extractedFeatureCount: globfpExtract.extractedFeatureCount,
        sourceArchiveMd5: globfpExtract.source.archiveMd5,
      },
      {
        dataset: "Overture Buildings",
        status: "available",
        licence: "per-feature",
        role: "provenance-filtered conditional source",
        release: "2026-07-22.0",
        featureCount: overtureExtract.features.length,
        independentHeightOrFloorCount: 0,
        note: "all height/floor fields in the extract are OSM-derived and are not counted twice",
      },
      {
        dataset: "GlobalBuildingAtlas",
        status: "unavailable",
        licence: "CC-BY-NC-4.0 for GBA.Height and GBA.LoD1",
        role: "approved auxiliary source for current non-commercial use",
        note: "official WFS and public API returned HTTP 403 during this run; no GBA value was imported",
      },
    ],
    counts: {
      targetBuildings: evidenceRecords.length,
      confidence: countBy(evidenceRecords, (record) => record.confidence),
      selectedSource: countBy(evidenceRecords, (record) => record.selectedSource),
      globfpCandidates: globfpCandidateCount,
      globfpOneToOneMatches: matchedCount,
      unmatched: evidenceRecords.filter((record) => (
        record.footprintMatch.assignment === "unmatched"
      )).length,
      ambiguous: ambiguousCount,
      rejected: rejectedCount,
      sourceAgeRisks: evidenceRecords.filter((record) => record.currentnessRisks.length).length,
      directEvidenceConflicts: evidenceRecords
        .filter((record) => record.directEvidenceConflict).length,
      manualReviewQueue: manualReviewQueue.length,
    },
    distributions: {
      baselineHeightMetres: distribution(
        evidenceRecords,
        (record) => record.baselineHeightMetres,
      ),
      selectedHeightMetres: distribution(
        evidenceRecords,
        (record) => record.selectedHeightMetres,
      ),
      selectedMinusBaselineMetres: distribution(
        evidenceRecords,
        (record) => record.selectedHeightMetres - record.baselineHeightMetres,
      ),
      matchedIou: distribution(
        evidenceRecords.filter((record) => record.footprintMatch.iou !== null),
        (record) => record.footprintMatch.iou,
      ),
    },
    rolloutDecision: scope === "poc"
      ? "blocked-until-manual-license-runtime-and-visual-gates-pass"
      : "full-evidence-generated-after-poc-gate",
  };
}

async function assertPocGate() {
  const gate = JSON.parse(await readFile(POC_GATE_OUTPUT, "utf8"));
  if (
    gate?.decision !== "pass"
    || gate?.fullRolloutAuthorized !== true
    || gate?.gates?.matching !== "pass"
    || gate?.gates?.licence !== "pass"
    || gate?.gates?.visualQuality !== "pass"
  ) {
    throw new Error("PoC 匹配、许可和视觉质量门尚未全部通过，拒绝生成全量证据");
  }
  return gate;
}

async function run() {
  const argumentsList = process.argv.slice(2);
  const scope = argumentValue(argumentsList, "--scope", "poc");
  if (!["poc", "full"].includes(scope)) throw new Error("--scope 只能是 poc 或 full");
  if (scope === "full") await assertPocGate();

  const districtPath = resolve(
    PROJECT_ROOT,
    argumentValue(argumentsList, "--district-record", DEFAULT_DISTRICT_RECORD),
  );
  const districtRecord = JSON.parse(await readFile(districtPath, "utf8"));
  const rawSnapshotPath = resolve(
    PROJECT_ROOT,
    "docs/research/data",
    districtRecord.meta.sourceSnapshot,
  );
  const rawSnapshot = JSON.parse(await readFile(rawSnapshotPath, "utf8"));
  const globfpPath = resolve(
    PROJECT_ROOT,
    argumentValue(argumentsList, "--globfp", DEFAULT_GLOBFP_EXTRACT),
  );
  const overturePath = resolve(
    PROJECT_ROOT,
    argumentValue(argumentsList, "--overture", DEFAULT_OVERTURE_EXTRACT),
  );
  const [globfpExtract, overtureExtract] = await Promise.all([
    readFile(globfpPath, "utf8").then(JSON.parse),
    readFile(overturePath, "utf8").then(JSON.parse),
  ]);

  const allTargets = buildTargets(districtRecord, rawSnapshot);
  const globfpSources = buildGlobfpSources(globfpExtract);
  // PoC 仍以全部 730 个目标检查 source reuse，避免把只在 80 栋子集中看似唯一的
  // 候选错误提升为一对一匹配。
  const matches = candidateMatches(allTargets.accepted, globfpSources);
  const acceptedMatches = uniquePassingMatches(allTargets.accepted, matches);
  const poc = selectPocTargets(allTargets, new Set(acceptedMatches.keys()));
  if (poc.targets.length !== POC_COUNT) {
    throw new Error(`PoC 选择数量必须为 ${POC_COUNT}，实际 ${poc.targets.length}`);
  }
  const pocSelection = new Map(poc.records.map((record) => [record.assetId, record]));
  const targets = scope === "poc" ? poc.targets : allTargets.accepted;
  const overtureExact = exactOvertureByOsmRef(overtureExtract);
  const reviewedPocIds = scope === "full"
    ? new Set(
      JSON.parse(await readFile(POC_REVIEW_QUEUE_OUTPUT, "utf8")).records
        .filter((record) => ["accept", "retain-direct"].includes(record.decision))
        .map((record) => record.osmRef),
    )
    : new Set();
  const evidenceRecords = targets
    .map((target) => buildEvidenceRecord({
      target,
      globfpSources,
      candidateList: matches.get(target.record.assetId) ?? [],
      globfpAccepted: acceptedMatches,
      overtureExact,
      scope,
      pocSelection,
      reviewedPocIds,
    }))
    .sort((left, right) => left.osmRef.localeCompare(right.osmRef));
  const manualReviewQueue = scope === "poc"
    ? buildManualReviewQueue(evidenceRecords)
    : [];
  const report = buildReport({
    scope,
    targetCount: targets.length,
    evidenceRecords,
    globfpExtract,
    overtureExtract,
    manualReviewQueue,
  });
  const evidence = {
    schemaVersion: 1,
    generatedAt: report.generatedAt,
    scope,
    thresholds: THRESHOLDS,
    sourceFiles: {
      districtRecord: districtPath.slice(PROJECT_ROOT.length + 1),
      osmSnapshot: rawSnapshotPath.slice(PROJECT_ROOT.length + 1),
      globfpExtract: globfpPath.slice(PROJECT_ROOT.length + 1),
      overtureExtract: overturePath.slice(PROJECT_ROOT.length + 1),
    },
    records: evidenceRecords,
  };

  await writeFile(POC_SELECTION_OUTPUT, `${JSON.stringify({
    schemaVersion: 1,
    count: poc.records.length,
    targetCount: POC_COUNT,
    selectionPolicy: [
      "all direct OSM height or levels",
      "low-rise houses and small footprints",
      "medium district blocks",
      "current tallest candidates",
      "Xingfu Road and Fahuazhen Road interfaces",
      "authored POI replacement edges",
      "strict one-to-one 3D-GloBFP matches",
      "deterministic balanced fill",
    ],
    records: poc.records,
  }, null, 2)}\n`);

  if (scope === "poc") {
    await Promise.all([
      writeFile(POC_EVIDENCE_OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`),
      writeFile(POC_REPORT_OUTPUT, `${JSON.stringify(report, null, 2)}\n`),
      writeFile(POC_REVIEW_QUEUE_OUTPUT, `${JSON.stringify({
        schemaVersion: 1,
        requiredReviewCount: REVIEW_COUNT,
        records: manualReviewQueue,
      }, null, 2)}\n`),
    ]);
  } else {
    const runtime = {
      schemaVersion: 1,
      generatedAt: report.generatedAt,
      sourceEvidence: "docs/research/building-height-evidence.json",
      records: evidenceRecords.map((record) => ({
        overviewAssetId: record.overviewAssetId,
        selectedHeightMetres: record.selectedHeightMetres,
        selectedSource: record.selectedSource,
        confidence: record.confidence,
      })),
    };
    await Promise.all([
      writeFile(FULL_EVIDENCE_OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`),
      writeFile(FULL_REPORT_OUTPUT, `${JSON.stringify(report, null, 2)}\n`),
      writeFile(RUNTIME_EVIDENCE_OUTPUT, `${JSON.stringify(runtime, null, 2)}\n`),
    ]);
  }

  process.stdout.write(`${JSON.stringify({
    scope,
    targetCount: targets.length,
    confidence: report.counts.confidence,
    globfpGlobalOneToOneMatches: acceptedMatches.size,
    globfpOneToOneMatches: report.counts.globfpOneToOneMatches,
    ambiguous: report.counts.ambiguous,
    rejected: report.counts.rejected,
    unmatched: report.counts.unmatched,
    manualReviewQueue: report.counts.manualReviewQueue,
  }, null, 2)}\n`);
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await run();
}
