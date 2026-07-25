import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const GBA_MAXIMUM_UNCERTAINTY_STANDARD_DEVIATION_METRES = 6;
const SOURCE_AGREEMENT_METRES = 6;
const HEIGHT_RANGE = {
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

function countBy(records, selector) {
  const counts = new Map();
  for (const record of records) {
    const value = selector(record);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort());
}

function validHeight(value) {
  return (
    Number.isFinite(value)
    && value >= HEIGHT_RANGE.minimumHeightMetres
    && value <= HEIGHT_RANGE.maximumHeightMetres
  );
}

async function ensureNewOutput(path) {
  try {
    await access(path);
    throw new Error(`输出已存在，按证据保留规则拒绝覆盖：${path}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await mkdir(dirname(path), { recursive: true });
}

function sourceAgreement(left, right) {
  return (
    Number.isFinite(left)
    && Number.isFinite(right)
    && Math.abs(left - right) <= SOURCE_AGREEMENT_METRES
  );
}

function buildRound2Record({
  firstRound,
  gba,
  ghs,
  group,
}) {
  if (firstRound.confidence !== "C") {
    return {
      ...firstRound,
      scope: "round2-candidate",
      round2Status: "retained-first-round-A-or-B",
      round2Matches: null,
    };
  }

  const sourceFeatures = [...firstRound.sourceFeatures];
  const heightCandidates = [...firstRound.heightCandidates];
  if (gba) {
    sourceFeatures.push({
      dataset: "GlobalBuildingAtlas GBA.LoD1",
      versionOrYear: "v1.0.0 / 2018-2019 imagery",
      featureId: gba.featureId,
      licence: "CC-BY-NC-4.0",
      heightMetres: gba.heightMetres,
      uncertaintyVariance: gba.uncertaintyVariance,
      uncertaintyStandardDeviationMetres: gba.uncertaintyStandardDeviationMetres,
      independence: "independent-ml-height-exact-osm-source-id",
      accessedAt: "2026-07-25",
    });
    heightCandidates.push({
      dataset: "GlobalBuildingAtlas GBA.LoD1",
      sourceFeatureId: gba.featureId,
      heightMetres: gba.heightMetres,
      method: "exact-osm-source-id",
      permitted: true,
      direct: false,
      uncertaintyStandardDeviationMetres: gba.uncertaintyStandardDeviationMetres,
    });
  }
  if (ghs?.sourceFeatureId) {
    sourceFeatures.push({
      dataset: "GHS-OBAT R2024A",
      versionOrYear: "R2024A V1.0 / 2020",
      featureId: ghs.sourceFeatureId,
      licence: "ODbL-1.0",
      heightMetres: ghs.heightMetres,
      independence: "independent-ghsl-raster-derived-auxiliary",
      accessedAt: "2026-07-25",
    });
    heightCandidates.push({
      dataset: "GHS-OBAT R2024A",
      sourceFeatureId: ghs.sourceFeatureId,
      heightMetres: ghs.heightMetres,
      method: "centroid-area-one-to-one",
      permitted: true,
      direct: false,
      selectionRole: "auxiliary-only-because-height-originates-from-coarse-ghsl-raster",
      passesSpatialGate: ghs.passesGate,
    });
  }
  if (group?.passesGate) {
    for (let index = 0; index < group.sourceFeatureIds.length; index += 1) {
      sourceFeatures.push({
        dataset: "3D-GloBFP",
        versionOrYear: "2020",
        featureId: group.sourceFeatureIds[index],
        licence: "CC-BY-4.0",
        heightMetres: group.sourceHeightsMetres[index],
        independence: "independent-modelled-estimate-group-member",
        accessedAt: "2026-07-25",
      });
    }
    heightCandidates.push({
      dataset: "3D-GloBFP",
      sourceFeatureIds: group.sourceFeatureIds,
      heightMetres: group.selectedHeightMetres,
      method: "one-target-to-multiple-source-union",
      permitted: true,
      direct: false,
      passesSpatialGate: true,
      heightSpreadMetres: group.heightSpreadMetres,
    });
  }

  const gbaEligible = Boolean(
    gba
    && validHeight(gba.heightMetres)
    && Number.isFinite(gba.uncertaintyStandardDeviationMetres)
    && gba.uncertaintyStandardDeviationMetres
      <= GBA_MAXIMUM_UNCERTAINTY_STANDARD_DEVIATION_METRES
  );
  const groupEligible = Boolean(group?.passesGate && validHeight(group.selectedHeightMetres));
  const independentSourceConflict = Boolean(
    gbaEligible
    && groupEligible
    && !sourceAgreement(gba.heightMetres, group.selectedHeightMetres)
  );
  let proposal = null;
  if (!independentSourceConflict && gbaEligible) {
    proposal = {
      source: "GlobalBuildingAtlas GBA.LoD1",
      heightMetres: round(gba.heightMetres, 2),
      reason: groupEligible
        ? "exact OSM source ID GBA estimate agrees with strict 3D-GloBFP group reconciliation"
        : "exact OSM source ID GBA estimate passes height and internal-uncertainty gates",
    };
  } else if (!independentSourceConflict && groupEligible) {
    proposal = {
      source: "3D-GloBFP group reconciliation",
      heightMetres: round(group.selectedHeightMetres, 2),
      reason: "2-4 source footprints form one unique union match with consistent heights",
    };
  }

  const largeHeightChange = Boolean(
    proposal
    && Math.abs(proposal.heightMetres - firstRound.baselineHeightMetres) >= 20
  );
  const skylineHighPoint = Boolean(proposal && proposal.heightMetres > 60);
  const manualReviewRequired = Boolean(
    independentSourceConflict
    || largeHeightChange
    || skylineHighPoint
  );
  const ghsAgreesWithProposal = Boolean(
    proposal
    && ghs?.passesGate
    && sourceAgreement(proposal.heightMetres, ghs.heightMetres)
  );
  const round2Status = independentSourceConflict
    ? "retain-C-source-conflict"
    : proposal && manualReviewRequired
      ? "candidate-needs-manual-review"
      : proposal
        ? "candidate-ready-for-visual-gate"
        : "retain-C-no-passing-evidence";

  return {
    ...firstRound,
    scope: "round2-candidate",
    sourceFeatures,
    heightCandidates,
    selectedHeightMetres: proposal?.heightMetres ?? firstRound.selectedHeightMetres,
    selectedSource: proposal?.source ?? firstRound.selectedSource,
    selectionReason: proposal?.reason ?? (
      independentSourceConflict
        ? "independent permitted round-two sources disagree by more than 6 m; retain C pending review"
        : "no round-two source passed its evidence-quality gate; retain first-round C height"
    ),
    confidence: proposal ? "B" : "C",
    inferences: proposal
      ? [
        ...firstRound.inferences.filter(
          (inference) => inference !== "height remains a footprint/type heuristic",
        ),
        "round-two selected height remains a modelled estimate, not survey-grade truth",
      ]
      : firstRound.inferences,
    unknowns: proposal
      ? firstRound.unknowns.filter((unknown) => unknown !== "real building height remains unknown")
      : firstRound.unknowns,
    currentnessRisks: [
      ...new Set([
        ...firstRound.currentnessRisks,
        ...(gba ? ["GBA uses 2018-2019 PlanetScope imagery"] : []),
        ...(ghs ? ["GHS-OBAT represents 2020 GHSL-derived conditions"] : []),
      ]),
    ],
    manualReviewRequired,
    manualReviewStatus: manualReviewRequired ? "round2-pending" : "not-required",
    round2Status,
    round2Matches: {
      gba: gba ? {
        featureId: gba.featureId,
        heightMetres: gba.heightMetres,
        uncertaintyStandardDeviationMetres: round(
          gba.uncertaintyStandardDeviationMetres,
        ),
        exactOsmSourceId: true,
        passesGate: gbaEligible,
        rejectionReasons: gbaEligible ? [] : [
          ...(!validHeight(gba.heightMetres) ? ["height-range"] : []),
          ...(gba.uncertaintyStandardDeviationMetres
            > GBA_MAXIMUM_UNCERTAINTY_STANDARD_DEVIATION_METRES
            ? ["internal-uncertainty"]
            : []),
        ],
      } : null,
      ghsObat: ghs ? {
        sourceFeatureId: ghs.sourceFeatureId,
        heightMetres: ghs.heightMetres,
        centroidDistanceMetres: ghs.centroidDistanceMetres,
        areaRatio: ghs.areaRatio,
        passesSpatialGate: ghs.passesGate,
        selectionRole: "auxiliary-only",
        agreesWithProposal: ghsAgreesWithProposal,
      } : null,
      globfpGroup: group ? {
        sourceFeatureIds: group.sourceFeatureIds,
        heightMetres: group.selectedHeightMetres,
        iou: group.iou,
        centroidDistanceMetres: group.centroidDistanceMetres,
        areaRatio: group.areaRatio,
        heightSpreadMetres: group.heightSpreadMetres,
        passesGate: groupEligible,
      } : null,
      independentSourceConflict,
      sourceAgreementThresholdMetres: SOURCE_AGREEMENT_METRES,
    },
    evidencePaths: [
      ...new Set([
        ...firstRound.evidencePaths,
        ...(gba
          ? ["docs/research/data/xinhua-buildings-gba-lod1-20260725.json"]
          : []),
        ...(ghs
          ? ["docs/research/data/xinhua-buildings-ghs-obat-matches-20260725.json"]
          : []),
        ...(group
          ? ["docs/research/data/xinhua-buildings-globfp-group-matches-v2-20260725.json"]
          : []),
      ]),
    ],
  };
}

async function run() {
  const argumentsList = process.argv.slice(2);
  const paths = {
    firstRound: resolve(PROJECT_ROOT, requiredArgument(argumentsList, "--first-round")),
    gba: resolve(PROJECT_ROOT, requiredArgument(argumentsList, "--gba")),
    ghs: resolve(PROJECT_ROOT, requiredArgument(argumentsList, "--ghs")),
    group: resolve(PROJECT_ROOT, requiredArgument(argumentsList, "--group")),
    queue: resolve(PROJECT_ROOT, requiredArgument(argumentsList, "--queue-output")),
    evidence: resolve(PROJECT_ROOT, requiredArgument(argumentsList, "--evidence-output")),
    report: resolve(PROJECT_ROOT, requiredArgument(argumentsList, "--report-output")),
    runtime: resolve(PROJECT_ROOT, requiredArgument(argumentsList, "--runtime-output")),
  };
  await Promise.all([
    ensureNewOutput(paths.queue),
    ensureNewOutput(paths.evidence),
    ensureNewOutput(paths.report),
    ensureNewOutput(paths.runtime),
  ]);
  const [firstRound, gba, ghs, group] = await Promise.all([
    readFile(paths.firstRound, "utf8").then(JSON.parse),
    readFile(paths.gba, "utf8").then(JSON.parse),
    readFile(paths.ghs, "utf8").then(JSON.parse),
    readFile(paths.group, "utf8").then(JSON.parse),
  ]);
  const gbaById = new Map(gba.records.map((record) => [record.osmRef, record]));
  const ghsById = new Map(ghs.records.map((record) => [record.osmRef, record]));
  const groupById = new Map(group.records.map((record) => [record.osmRef, record]));
  const records = firstRound.records.map((record) => buildRound2Record({
    firstRound: record,
    gba: gbaById.get(record.osmRef) ?? null,
    ghs: ghsById.get(record.osmRef) ?? null,
    group: groupById.get(record.osmRef) ?? null,
  }));
  const queueRecords = records
    .filter((record) => record.round2Status !== "retained-first-round-A-or-B")
    .map((record, index) => ({
      queueIndex: index + 1,
      osmRef: record.osmRef,
      firstRoundConfidence: "C",
      baselineHeightMetres: record.baselineHeightMetres,
      proposedHeightMetres: record.confidence === "B"
        ? record.selectedHeightMetres
        : null,
      proposedSource: record.confidence === "B" ? record.selectedSource : null,
      status: record.round2Status,
      manualReviewRequired: record.manualReviewRequired,
      round2Matches: record.round2Matches,
      finalDecision: "pending-visual-and-licence-gates",
      reviewerNotes: "",
    }));
  if (queueRecords.length !== 676) {
    throw new Error(`第二轮队列必须是 676 栋，实际 ${queueRecords.length}`);
  }
  const generatedAt = new Date().toISOString();
  const report = {
    schemaVersion: 1,
    generatedAt,
    targetCount: queueRecords.length,
    policy: {
      gbaMatch: "exact OSM source ID",
      gbaMaximumUncertaintyStandardDeviationMetres:
        GBA_MAXIMUM_UNCERTAINTY_STANDARD_DEVIATION_METRES,
      ghsObatRole: "auxiliary-only because height originates from coarse GHSL raster",
      globfpGroup: "one target to 2-4 source-footprint union; frozen spatial gate; max 6 m spread",
      sourceAgreementMetres: SOURCE_AGREEMENT_METRES,
      deployment: "local-only; Sites and VPS excluded",
    },
    counts: {
      firstRoundConfidence: countBy(firstRound.records, (record) => record.confidence),
      gbaExactIdCandidates: queueRecords.filter((record) => record.round2Matches.gba).length,
      gbaPassing: queueRecords.filter((record) => record.round2Matches.gba?.passesGate).length,
      ghsSpatialPassingAuxiliary: queueRecords
        .filter((record) => record.round2Matches.ghsObat?.passesSpatialGate).length,
      globfpGroupPassing: queueRecords
        .filter((record) => record.round2Matches.globfpGroup?.passesGate).length,
      independentSourceConflicts: queueRecords
        .filter((record) => record.round2Matches.independentSourceConflict).length,
      proposedUpgrades: queueRecords.filter((record) => record.proposedHeightMetres).length,
      manualReviewRequired: queueRecords
        .filter((record) => record.manualReviewRequired).length,
      queueStatus: countBy(queueRecords, (record) => record.status),
    },
    gateStatus: {
      evidence: "candidate-generated",
      licence: "pending-final-attribution-audit",
      visualQuality: "pending-real-page-QA",
      canonicalRollout: "blocked",
    },
  };
  const evidenceOutput = {
    schemaVersion: 2,
    generatedAt,
    scope: "round2-candidate",
    provisional: true,
    sourceEvidence: paths.firstRound.slice(PROJECT_ROOT.length + 1),
    thresholds: {
      ...firstRound.thresholds,
      gbaMaximumUncertaintyStandardDeviationMetres:
        GBA_MAXIMUM_UNCERTAINTY_STANDARD_DEVIATION_METRES,
      sourceAgreementMetres: SOURCE_AGREEMENT_METRES,
    },
    records,
  };
  const runtime = {
    schemaVersion: 2,
    generatedAt,
    sourceEvidence: paths.evidence.slice(PROJECT_ROOT.length + 1),
    provisional: true,
    records: records.map((record) => ({
      overviewAssetId: record.overviewAssetId,
      selectedHeightMetres: record.selectedHeightMetres,
      selectedSource: record.selectedSource,
      confidence: record.confidence,
    })),
  };
  await Promise.all([
    writeFile(paths.queue, `${JSON.stringify({
      schemaVersion: 1,
      generatedAt,
      targetCount: queueRecords.length,
      records: queueRecords,
    }, null, 2)}\n`),
    writeFile(paths.evidence, `${JSON.stringify(evidenceOutput, null, 2)}\n`),
    writeFile(paths.report, `${JSON.stringify(report, null, 2)}\n`),
    writeFile(paths.runtime, `${JSON.stringify(runtime, null, 2)}\n`),
  ]);
  process.stdout.write(`${JSON.stringify(report.counts, null, 2)}\n`);
}

await run();
