import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function countBy(records, key) {
  return Object.fromEntries(records.reduce((counts, record) => {
    const value = record[key];
    counts.set(value, (counts.get(value) ?? 0) + 1);
    return counts;
  }, new Map()));
}

test("80 栋 PoC 覆盖冻结类别并通过匹配、许可和视觉门", async () => {
  const [
    selection,
    evidence,
    report,
    review,
    gate,
    build,
    glb,
  ] = await Promise.all([
    readFile(new URL("../docs/research/building-height-poc-selection.json", import.meta.url), "utf8")
      .then(JSON.parse),
    readFile(new URL("../docs/research/building-height-evidence-poc.json", import.meta.url), "utf8")
      .then(JSON.parse),
    readFile(new URL("../docs/research/building-height-match-report-poc.json", import.meta.url), "utf8")
      .then(JSON.parse),
    readFile(new URL("../docs/research/building-height-manual-review-queue-poc.json", import.meta.url), "utf8")
      .then(JSON.parse),
    readFile(new URL("../docs/research/building-height-poc-gate.json", import.meta.url), "utf8")
      .then(JSON.parse),
    readFile(
      new URL(
        "../test_artifacts/test_building_height_poc/test_xinhua-district-massing-poc-build-record.json",
        import.meta.url,
      ),
      "utf8",
    ).then(JSON.parse),
    readFile(
      new URL(
        "../test_artifacts/test_building_height_poc/test_xinhua-district-massing-poc.glb",
        import.meta.url,
      ),
    ),
  ]);

  assert.equal(selection.count, 80);
  assert.equal(selection.records.length, 80);
  assert.equal(new Set(selection.records.map((record) => record.assetId)).size, 80);
  const reasons = new Set(selection.records.flatMap((record) => record.reasons));
  assert.ok(reasons.has("direct-osm-height-or-levels"));
  assert.ok(reasons.has("low-rise-house-or-small-footprint"));
  assert.ok(reasons.has("medium-district-block"));
  assert.ok(reasons.has("current-tallest-candidate"));
  assert.ok(reasons.has("core-road-interface"));
  assert.ok(reasons.has("authored-poi-replacement-edge"));

  assert.equal(evidence.scope, "poc");
  assert.equal(evidence.records.length, 80);
  assert.equal(report.targetCount, 80);
  assert.equal(
    Object.values(report.counts.confidence).reduce((sum, count) => sum + count, 0),
    80,
  );
  assert.equal(review.records.length, 30);
  assert.ok(review.records.every((record) => record.decision !== "pending"));
  assert.ok(review.records.every((record) => record.reviewerNotes.length > 0));

  assert.equal(gate.decision, "pass");
  assert.equal(gate.fullRolloutAuthorized, true);
  assert.deepEqual(gate.gates, {
    matching: "pass",
    licence: "pass",
    visualQuality: "pass",
  });
  assert.equal(sha256(glb), build.output.sha256);
  assert.equal(build.deterministicReplay.passed, true);
  assert.ok(glb.length <= build.budgets.maxBytes);
});

test("全量 730 栋都保留 A/B/C、逐栋来源、匹配和未知项", async () => {
  const [
    evidence,
    report,
    runtime,
    district,
    build,
  ] = await Promise.all([
    readFile(new URL("../docs/research/building-height-evidence.json", import.meta.url), "utf8")
      .then(JSON.parse),
    readFile(new URL("../docs/research/building-height-match-report.json", import.meta.url), "utf8")
      .then(JSON.parse),
    readFile(new URL("../app/scene/xinhua-building-height-runtime.json", import.meta.url), "utf8")
      .then(JSON.parse),
    readFile(new URL("../app/scene/xinhua-district-massing-data.json", import.meta.url), "utf8")
      .then(JSON.parse),
    readFile(new URL("../docs/research/build-records/xinhua-district-massing.json", import.meta.url), "utf8")
      .then(JSON.parse),
  ]);

  assert.equal(evidence.scope, "full");
  assert.equal(evidence.records.length, 730);
  assert.equal(report.targetCount, 676);
  assert.equal(report.allBuildingCount, 730);
  assert.equal(runtime.records.length, 730);
  assert.equal(district.acceptedBuildings.length, 730);
  assert.equal(new Set(evidence.records.map((record) => record.osmRef)).size, 730);
  assert.deepEqual(
    countBy(evidence.records, "confidence"),
    report.counts.finalConfidence,
  );
  assert.deepEqual(
    countBy(evidence.records, "confidence"),
    build.counts.heightConfidence,
  );

  for (const record of evidence.records) {
    assert.ok(["A", "B", "C"].includes(record.confidence));
    assert.match(record.osmRef, /^(way|relation)\/\d+/);
    assert.equal(record.overviewAssetId, record.osmRef);
    assert.ok(Number.isFinite(record.selectedHeightMetres));
    assert.ok(record.selectedHeightMetres >= 3 && record.selectedHeightMetres <= 90);
    assert.ok(record.heightCandidates.length >= 1);
    assert.ok(record.observedFacts.length >= 1);
    assert.ok(record.inferences.length >= 1 || record.confidence === "A");
    assert.ok(record.unknowns.length >= 2);
    assert.ok(record.evidencePaths.length >= 1);
    if (record.confidence === "B") {
      assert.ok([
        "3D-GloBFP",
        "GlobalBuildingAtlas GBA.LoD1",
        "3D-GloBFP group reconciliation",
      ].includes(record.selectedSource));
      if (record.selectedSource === "3D-GloBFP") {
        assert.equal(record.footprintMatch.assignment, "one-to-one");
        assert.equal(record.footprintMatch.passesSpatialGate, true);
        assert.ok(record.footprintMatch.iou >= evidence.thresholds.minimumIou);
      }
      if (record.selectedSource === "GlobalBuildingAtlas GBA.LoD1") {
        assert.equal(record.round2Matches.gba.exactOsmSourceId, true);
        assert.equal(record.round2Matches.gba.passesGate, true);
        assert.ok(
          record.round2Matches.gba.uncertaintyStandardDeviationMetres
            <= evidence.thresholds.gbaMaximumUncertaintyStandardDeviationMetres,
        );
      }
      if (record.selectedSource === "3D-GloBFP group reconciliation") {
        assert.equal(record.round2Matches.globfpGroup.passesGate, true);
        assert.ok(record.round2Matches.globfpGroup.sourceFeatureIds.length >= 2);
        assert.ok(record.round2Matches.globfpGroup.sourceFeatureIds.length <= 4);
      }
    }
    if (record.confidence === "C") {
      assert.equal(record.selectedSource, "wander-xinhua-heuristic");
    }
  }
});

test("原始来源、许可边界与基线回退保持可追溯", async () => {
  const [
    baseline,
    sourceManifest,
    firstRoundReport,
    round2Report,
    round2SourceManifest,
    notices,
    generator,
    evidenceGenerator,
  ] = await Promise.all([
    readFile(new URL("../docs/research/building-height-baseline.json", import.meta.url), "utf8")
      .then(JSON.parse),
    readFile(
      new URL("../docs/research/data/xinhua-building-height-sources-20260725.json", import.meta.url),
      "utf8",
    ).then(JSON.parse),
    readFile(new URL("../docs/research/building-height-match-report-round1.json", import.meta.url), "utf8")
      .then(JSON.parse),
    readFile(new URL("../docs/research/building-height-match-report.json", import.meta.url), "utf8")
      .then(JSON.parse),
    readFile(
      new URL(
        "../docs/research/data/xinhua-building-height-sources-round2-20260725.json",
        import.meta.url,
      ),
      "utf8",
    )
      .then(JSON.parse),
    readFile(new URL("../docs/THIRD_PARTY_NOTICES.md", import.meta.url), "utf8"),
    readFile(new URL("../scripts/generate_overview_district_massing.mjs", import.meta.url), "utf8"),
    readFile(new URL("../scripts/generate_building_height_evidence.mjs", import.meta.url), "utf8"),
  ]);

  assert.equal(baseline.acceptedBuildings, 730);
  assert.equal(
    baseline.files.find((file) => file.path.endsWith(".glb")).sha256,
    "b61cec4fc93e5326f87845f022abf92008c8254c78bfd95de8ea1e19d4f11dea",
  );
  assert.equal(sourceManifest.sources.globfp.archiveMd5, "8476dc9ee2ff403d9f524faa1627296d");
  assert.equal(sourceManifest.sources.globfp.licence, "CC-BY-4.0");
  assert.equal(sourceManifest.sources.overture.release, "2026-07-22.0");
  assert.equal(sourceManifest.sources.gba.imported, false);
  assert.equal(
    firstRoundReport.sourceAvailability
      .find((source) => source.dataset === "GlobalBuildingAtlas").status,
    "unavailable",
  );
  assert.equal(round2SourceManifest.sources.gba.licence, "CC-BY-NC-4.0");
  assert.equal(round2SourceManifest.sources.gba.exactIdMatchCount, 590);
  assert.equal(round2SourceManifest.sources.gba.passingCount, 487);
  assert.equal(round2SourceManifest.sources.ghsObat.licence, "ODbL-1.0");
  assert.equal(round2Report.counts.finalConfidence.B, 532);
  assert.match(notices, /3D-GloBFP/);
  assert.match(notices, /GHS-OBAT/);
  assert.match(notices, /CC BY-NC 4\.0/);
  assert.match(notices, /2026-07-22\.0/);
  assert.match(generator, /PoC 三道质量门尚未全部通过/);
  assert.match(evidenceGenerator, /拒绝生成全量证据/);

  await Promise.all([
    stat(new URL("../docs/research/data/globfp-world-grid-zenodo-15459025-20260725.zip", import.meta.url)),
    stat(
      new URL(
        "../docs/research/data/xinhua-buildings-globfp-grid-2435-2020-20260725.json",
        import.meta.url,
      ),
    ),
    stat(
      new URL(
        "../docs/research/data/xinhua-buildings-overture-2026-07-22.0-20260725.geojson",
        import.meta.url,
      ),
    ),
  ]);
});
