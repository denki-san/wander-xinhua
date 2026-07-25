import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const EVIDENCE_PATH = resolve(
  PROJECT_ROOT,
  "docs/research/building-height-evidence-poc.json",
);
const REPORT_PATH = resolve(
  PROJECT_ROOT,
  "docs/research/building-height-match-report-poc.json",
);
const REVIEW_PATH = resolve(
  PROJECT_ROOT,
  "docs/research/building-height-manual-review-queue-poc.json",
);
const BUILD_PATH = resolve(
  PROJECT_ROOT,
  "test_artifacts/test_building_height_poc/test_xinhua-district-massing-poc-build-record.json",
);
const GLB_PATH = resolve(
  PROJECT_ROOT,
  "test_artifacts/test_building_height_poc/test_xinhua-district-massing-poc.glb",
);
const RUNTIME_QA_PATH = resolve(
  PROJECT_ROOT,
  "docs/research/test_building_height_poc_runtime_qa.json",
);
const OUTPUT_PATH = resolve(
  PROJECT_ROOT,
  "docs/research/building-height-poc-gate.json",
);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function passed(value) {
  return value === true || value === "pass";
}

async function run() {
  const [
    evidence,
    report,
    review,
    build,
    glb,
    runtimeQa,
  ] = await Promise.all([
    readFile(EVIDENCE_PATH, "utf8").then(JSON.parse),
    readFile(REPORT_PATH, "utf8").then(JSON.parse),
    readFile(REVIEW_PATH, "utf8").then(JSON.parse),
    readFile(BUILD_PATH, "utf8").then(JSON.parse),
    readFile(GLB_PATH),
    readFile(RUNTIME_QA_PATH, "utf8").then(JSON.parse),
  ]);

  const records = evidence.records ?? [];
  const reviewRecords = review.records ?? [];
  const evidenceBackedCount = records.filter((record) => (
    record.confidence === "A" || record.confidence === "B"
  )).length;
  const selectedB = records.filter((record) => record.confidence === "B");
  const selectedSources = new Set(records.map((record) => record.selectedSource));
  const matchingChecks = {
    targetCountIsBetween50And100: records.length >= 50 && records.length <= 100,
    exactFrozenPocCount: records.length === 80,
    meaningfulEvidenceCoverage: evidenceBackedCount >= 40,
    everyBPassesFrozenSpatialGate: selectedB.every((record) => (
      record.footprintMatch.passesSpatialGate
      && record.footprintMatch.assignment === "one-to-one"
      && record.footprintMatch.iou >= report.thresholds.minimumIou
      && record.footprintMatch.centroidDistanceMetres
        <= report.thresholds.maximumCentroidDistanceMetres
      && record.footprintMatch.areaRatio >= report.thresholds.minimumAreaRatio
      && record.footprintMatch.areaRatio <= report.thresholds.maximumAreaRatio
    )),
    heightsInsideSafetyRange: records.every((record) => (
      Number.isFinite(record.selectedHeightMetres)
      && record.selectedHeightMetres >= report.thresholds.minimumHeightMetres
      && record.selectedHeightMetres <= report.thresholds.maximumHeightMetres
    )),
    manualReviewCountIs20To40: reviewRecords.length >= 20 && reviewRecords.length <= 40,
    manualReviewHasNoPending: reviewRecords.every((record) => (
      ["accept", "retain-direct", "retain-baseline"].includes(record.decision)
      && record.reviewerNotes.trim().length > 0
    )),
    noRejectedBRemainsSelected: reviewRecords.every((reviewRecord) => {
      if (reviewRecord.decision !== "retain-baseline") return true;
      const evidenceRecord = records.find((record) => record.osmRef === reviewRecord.osmRef);
      return evidenceRecord?.confidence !== "B";
    }),
    directConflictsReviewed: records
      .filter((record) => record.directEvidenceConflict)
      .every((record) => reviewRecords.some((reviewRecord) => (
        reviewRecord.osmRef === record.osmRef
        && ["accept", "retain-direct"].includes(reviewRecord.decision)
      ))),
  };
  const matchingPass = Object.values(matchingChecks).every(Boolean);

  const licenceChecks = {
    osmSourceRecorded: records.every((record) => (
      record.sourceFeatures.some((source) => (
        source.dataset === "OpenStreetMap" || record.confidence !== "A"
      ))
    )),
    globfpUsesCcBy4: records
      .flatMap((record) => record.sourceFeatures)
      .filter((source) => source.dataset === "3D-GloBFP")
      .every((source) => source.licence === "CC-BY-4.0"),
    overtureKeepsPerFeatureLicence: records
      .flatMap((record) => record.sourceFeatures)
      .filter((source) => source.dataset === "Overture Buildings")
      .every((source) => (
        typeof source.licence === "string"
        && source.independence === "osm-derived-not-independent"
      )),
    unavailableGbaNotSelected: !selectedSources.has("GlobalBuildingAtlas"),
    thirdPartyNoticeVerified: runtimeQa.attribution?.thirdPartyNoticeUpdated === true,
    nonCommercialBoundaryRecorded: runtimeQa.attribution?.gbaNonCommercialBoundaryRecorded === true,
  };
  const licencePass = Object.values(licenceChecks).every(Boolean);

  const buildChecks = {
    glbShaMatchesBuildRecord: sha256(glb) === build.output.sha256,
    deterministicReplay: build.deterministicReplay?.passed === true,
    bytesWithinBudget: glb.length <= build.budgets.maxBytes,
    meshesWithinBudget: build.output.meshes <= build.budgets.maxMeshes,
    trianglesWithinBudget: build.output.triangles <= build.budgets.maxTriangles,
    materialsWithinBudget: build.output.materials <= build.budgets.maxMaterials,
    zeroImages: build.output.images === 0,
  };
  const visualChecks = {
    desktopSameCameraReviewed: passed(runtimeQa.sameCameraComparison?.desktop?.pass),
    mobile390SameCameraReviewed: passed(runtimeQa.sameCameraComparison?.mobile390?.pass),
    roadAndPoiHierarchyPreserved: passed(runtimeQa.visualQuality?.roadAndPoiHierarchy),
    noUnreviewedExtremeHeight: passed(runtimeQa.visualQuality?.noUnreviewedExtremeHeight),
    noOverlapHoleOrZFighting: passed(runtimeQa.visualQuality?.noOverlapHoleOrZFighting),
    currentGlbRequestSucceeded: runtimeQa.requests?.districtGlb?.status === 200,
    noConsoleErrors: runtimeQa.browser?.errorCount === 0,
    osmAttributionVisible: runtimeQa.attribution?.osmVisible === true,
    nonSurveyDisclosureVisible: runtimeQa.attribution?.nonSurveyDisclosureVisible === true,
  };
  const visualPass = (
    Object.values(buildChecks).every(Boolean)
    && Object.values(visualChecks).every(Boolean)
  );

  const gates = {
    matching: matchingPass ? "pass" : "fail",
    licence: licencePass ? "pass" : "fail",
    visualQuality: visualPass ? "pass" : "fail",
  };
  const decision = Object.values(gates).every((gate) => gate === "pass")
    ? "pass"
    : "fail";
  const output = {
    schemaVersion: 1,
    evaluatedAt: new Date().toISOString(),
    decision,
    fullRolloutAuthorized: decision === "pass",
    pocCount: records.length,
    evidenceBackedCount,
    gates,
    matchingChecks,
    licenceChecks,
    buildChecks,
    visualChecks,
    evidence: {
      matchReport: "docs/research/building-height-match-report-poc.json",
      manualReview: "docs/research/building-height-manual-review-queue-poc.json",
      buildRecord: "test_artifacts/test_building_height_poc/test_xinhua-district-massing-poc-build-record.json",
      runtimeQa: "docs/research/test_building_height_poc_runtime_qa.json",
    },
  };
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({
    decision,
    fullRolloutAuthorized: output.fullRolloutAuthorized,
    pocCount: output.pocCount,
    evidenceBackedCount,
    gates,
  }, null, 2)}\n`);
  if (decision !== "pass") process.exitCode = 1;
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await run();
}
