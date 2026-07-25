import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function countBy(records, key) {
  return Object.fromEntries(records.reduce((counts, record) => {
    const value = record[key];
    counts.set(value, (counts.get(value) ?? 0) + 1);
    return counts;
  }, new Map()));
}

test("第二轮把全部 676 栋 C 排队并完成无 pending 的逐栋决策", async () => {
  const [queue, evidence, report, gate] = await Promise.all([
    readFile(
      new URL("../docs/research/building-height-round2-queue-final.json", import.meta.url),
      "utf8",
    ).then(JSON.parse),
    readFile(
      new URL("../docs/research/building-height-evidence.json", import.meta.url),
      "utf8",
    ).then(JSON.parse),
    readFile(
      new URL("../docs/research/building-height-match-report.json", import.meta.url),
      "utf8",
    ).then(JSON.parse),
    readFile(
      new URL("../docs/research/building-height-round2-gate.json", import.meta.url),
      "utf8",
    ).then(JSON.parse),
  ]);

  assert.equal(queue.targetCount, 676);
  assert.equal(queue.records.length, 676);
  assert.equal(new Set(queue.records.map((record) => record.osmRef)).size, 676);
  assert.ok(queue.records.every((record) => (
    ["upgrade-B", "retain-C"].includes(record.finalDecision)
  )));
  assert.ok(queue.records.every((record) => record.reviewerNotes.length > 0));
  assert.deepEqual(countBy(queue.records, "finalDecision"), {
    "retain-C": 187,
    "upgrade-B": 489,
  });

  assert.equal(evidence.records.length, 730);
  assert.deepEqual(countBy(evidence.records, "confidence"), {
    A: 11,
    B: 532,
    C: 187,
  });
  assert.deepEqual(report.counts.finalConfidence, {
    A: 11,
    B: 532,
    C: 187,
  });
  assert.equal(report.counts.manualReview.total, 7);
  assert.equal(report.counts.manualReview.pending, 0);
  assert.equal(gate.decision, "pass");
  assert.equal(gate.canonicalRolloutAuthorized, true);
  assert.deepEqual(gate.gates, {
    matching: "pass",
    licence: "pass",
    visualQuality: "pass",
  });
});

test("GBA、GHS-OBAT 和 3D-GloBFP group 均遵守第二轮证据边界", async () => {
  const [evidence, sourceManifest, queue] = await Promise.all([
    readFile(
      new URL("../docs/research/building-height-evidence.json", import.meta.url),
      "utf8",
    ).then(JSON.parse),
    readFile(
      new URL(
        "../docs/research/data/xinhua-building-height-sources-round2-20260725.json",
        import.meta.url,
      ),
      "utf8",
    ).then(JSON.parse),
    readFile(
      new URL("../docs/research/building-height-round2-queue-final.json", import.meta.url),
      "utf8",
    ).then(JSON.parse),
  ]);

  const gbaSelected = evidence.records.filter(
    (record) => record.selectedSource === "GlobalBuildingAtlas GBA.LoD1",
  );
  const groupSelected = evidence.records.filter(
    (record) => record.selectedSource === "3D-GloBFP group reconciliation",
  );
  assert.equal(gbaSelected.length, 487);
  assert.equal(groupSelected.length, 2);
  assert.ok(evidence.records.every((record) => record.selectedSource !== "GHS-OBAT R2024A"));
  assert.ok(gbaSelected.every((record) => (
    record.round2Matches.gba.exactOsmSourceId
    && record.round2Matches.gba.passesGate
    && record.round2Matches.gba.uncertaintyStandardDeviationMetres <= 6
  )));

  const selectedGroupSourceIds = groupSelected.flatMap(
    (record) => record.round2Matches.globfpGroup.sourceFeatureIds,
  );
  assert.equal(new Set(selectedGroupSourceIds).size, selectedGroupSourceIds.length);
  assert.ok(groupSelected.every((record) => (
    record.round2Matches.globfpGroup.passesGate
    && record.round2Matches.globfpGroup.iou >= 0.7
    && record.round2Matches.globfpGroup.centroidDistanceMetres <= 5
    && record.round2Matches.globfpGroup.areaRatio >= 0.67
    && record.round2Matches.globfpGroup.areaRatio <= 1.5
    && record.round2Matches.globfpGroup.heightSpreadMetres <= 6
  )));

  const extreme = queue.records.find((record) => record.osmRef === "way/428379423");
  assert.equal(extreme.finalDecision, "retain-C");
  assert.equal(extreme.proposedHeightMetres, 81.81);
  assert.match(extreme.reviewerNotes, /保留 24 m/);

  assert.equal(sourceManifest.sources.gba.archiveBytes, 545969287);
  assert.equal(
    sourceManifest.sources.gba.archiveSha256,
    "d44d5fc07118fdf0d4131fe0b00bfb2c95bf50e8d7c22c09c0ae5bae5c8349f4",
  );
  assert.equal(sourceManifest.sources.gba.licence, "CC-BY-NC-4.0");
  assert.equal(
    sourceManifest.sources.ghsObat.archiveSha256,
    "136ae36bca1ef8ed569d1802fe8bdff2b1d7b25547424ae418c710258ec30356",
  );
  assert.equal(sourceManifest.sources.ghsObat.licence, "ODbL-1.0");
});

test("第二轮 canonical GLB、build record、回退资产和四视角证据一致", async () => {
  const [glb, build, round1Glb] = await Promise.all([
    readFile(
      new URL(
        "../public/models/overview/xinhua-district-massing.glb",
        import.meta.url,
      ),
    ),
    readFile(
      new URL(
        "../docs/research/build-records/xinhua-district-massing.json",
        import.meta.url,
      ),
      "utf8",
    ).then(JSON.parse),
    readFile(
      new URL(
        "../public/models/overview/xinhua-district-massing-round1.glb",
        import.meta.url,
      ),
    ),
  ]);

  assert.equal(sha256(glb), build.output.sha256);
  assert.equal(
    build.output.sha256,
    "e02289e36c2c75e1202b9084732b94e07249bee76f02aa18c3be82319a90e6f9",
  );
  assert.equal(build.output.bytes, 682104);
  assert.equal(build.output.meshes, 12);
  assert.equal(build.output.triangles, 11779);
  assert.equal(build.output.images, 0);
  assert.equal(build.deterministicReplay.passed, true);
  assert.deepEqual(build.counts.heightConfidence, {
    A: 11,
    B: 532,
    C: 187,
  });
  assert.equal(
    sha256(round1Glb),
    "e4d46d0b59d67e8c4e4a411e1a80333c0ba1310fb353fe1ab6dc881d958d3ee4",
  );

  await Promise.all([
    stat(new URL("../docs/research/building-height-evidence-round1.json", import.meta.url)),
    stat(new URL("../docs/research/building-height-match-report-round1.json", import.meta.url)),
    stat(new URL("../app/scene/xinhua-building-height-runtime-round1.json", import.meta.url)),
    stat(new URL("../docs/research/test_building_height_round2_desktop_1440x1024.png", import.meta.url)),
    stat(new URL("../docs/research/test_building_height_round2_mobile_390x844.png", import.meta.url)),
    stat(
      new URL(
        "../docs/research/test_building_height_round2_xingfu_road_desktop_1440x1024.png",
        import.meta.url,
      ),
    ),
    stat(
      new URL(
        "../docs/research/test_building_height_round2_fahuazhen_road_desktop_1440x1024.png",
        import.meta.url,
      ),
    ),
    stat(
      new URL(
        "../docs/research/test_building_height_round2_final_desktop_1440x1024.png",
        import.meta.url,
      ),
    ),
    stat(
      new URL(
        "../docs/research/test_building_height_round2_final_mobile_390x844.png",
        import.meta.url,
      ),
    ),
    stat(
      new URL(
        "../docs/research/test_building_height_round2_final_runtime_qa.json",
        import.meta.url,
      ),
    ),
  ]);
});
