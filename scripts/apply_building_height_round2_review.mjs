import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");

const MANUAL_DECISIONS = new Map([
  ["way/297854167", {
    decision: "upgrade-B",
    notes: "接受 GBA exact OSM ID 高度 29.47 m；标准差 5.3449 m 通过 6 m 门。GHS-OBAT 为 100 m GHSL 栅格派生辅助值，不覆盖逐栋 exact-ID 选择；四个真实页面视角未见针状高点。",
  }],
  ["way/428379423", {
    decision: "retain-C",
    notes: "保留 24 m 启发式基线。3D-GloBFP group 为 81.81 m，GBA 为 65.44 m 且标准差 8.164 m 未过门，GHS-OBAT 为 47.56 m；极端候选之间存在未解决分歧，视觉正常不能把估算冲突提升为 B。",
  }],
  ["way/474632970", {
    decision: "upgrade-B",
    notes: "接受 GBA exact OSM ID 高度 3.94 m；标准差 0.8289 m 明显通过门。该低层候选仍在 3–90 m 范围内，四个真实页面视角未见洞、漂浮或道路穿插。",
  }],
  ["way/493383440", {
    decision: "upgrade-B",
    notes: "接受 GBA exact OSM ID 高度 36.81 m；标准差 5.8956 m 在冻结 6 m 门内。GHS-OBAT 仅作街区尺度辅助检查，真实页面未见异常高点。",
  }],
  ["way/864485636", {
    decision: "upgrade-B",
    notes: "接受 GBA exact OSM ID 高度 37.21 m；标准差 5.7509 m 通过门，且 GHS-OBAT 34.74 m 在 6 m 内提供方向一致的辅助证据。",
  }],
  ["way/864847905", {
    decision: "upgrade-B",
    notes: "接受 GBA exact OSM ID 高度 39.99 m；标准差 4.6467 m 通过门，GHS-OBAT 45.30 m 在 6 m 内提供辅助一致性，真实页面层级正常。",
  }],
  ["way/864847949", {
    decision: "upgrade-B",
    notes: "接受 GBA exact OSM ID 高度 35.74 m；标准差 5.5214 m 通过门，GHS-OBAT 35.88 m 提供辅助一致性，真实页面层级正常。",
  }],
]);

const VISUAL_EVIDENCE = [
  "docs/research/test_building_height_round2_desktop_1440x1024.png",
  "docs/research/test_building_height_round2_mobile_390x844.png",
  "docs/research/test_building_height_round2_xingfu_road_desktop_1440x1024.png",
  "docs/research/test_building_height_round2_fahuazhen_road_desktop_1440x1024.png",
];

function argumentValue(argumentsList, flag) {
  const index = argumentsList.indexOf(flag);
  return index >= 0 ? argumentsList[index + 1] : null;
}

function requiredArgument(argumentsList, flag) {
  const value = argumentValue(argumentsList, flag);
  if (!value) throw new Error(`缺少必需参数 ${flag}`);
  return resolve(PROJECT_ROOT, value);
}

function countBy(records, selector) {
  const counts = new Map();
  for (const record of records) {
    const value = selector(record);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort());
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

function finalizeCandidate(candidate, firstRound, queueRecord) {
  if (!queueRecord) {
    return {
      ...candidate,
      scope: "full",
      provisional: undefined,
      round2Status: "retained-first-round-A-or-B",
      finalDecision: "retain-first-round-A-or-B",
    };
  }

  const review = MANUAL_DECISIONS.get(candidate.osmRef);
  if (queueRecord.manualReviewRequired && !review) {
    throw new Error(`人工复核项缺少决策：${candidate.osmRef}`);
  }
  if (!queueRecord.manualReviewRequired && review) {
    throw new Error(`人工决策不应指向非复核项：${candidate.osmRef}`);
  }

  const decision = review?.decision
    ?? (queueRecord.proposedHeightMetres !== null ? "upgrade-B" : "retain-C");
  if (decision === "retain-C") {
    return {
      ...firstRound,
      scope: "full",
      sourceFeatures: candidate.sourceFeatures,
      heightCandidates: candidate.heightCandidates,
      evidencePaths: candidate.evidencePaths,
      currentnessRisks: candidate.currentnessRisks,
      round2Matches: candidate.round2Matches,
      round2Status: review ? "reviewed-retain-C" : "retain-C-no-passing-evidence",
      finalDecision: "retain-C",
      manualReviewRequired: Boolean(review),
      manualReviewStatus: review ? "complete-retain-C" : "not-required",
      reviewerNotes: review?.notes ?? "第二轮没有来源通过选择门，保留第一轮 C 级启发式高度。",
      selectionReason: review
        ? "人工复核发现极端候选与独立估算之间存在未解决分歧，保留第一轮 C 级基线"
        : firstRound.selectionReason,
    };
  }

  return {
    ...candidate,
    scope: "full",
    provisional: undefined,
    round2Status: review ? "reviewed-upgrade-B" : "upgrade-B",
    finalDecision: "upgrade-B",
    manualReviewRequired: Boolean(review),
    manualReviewStatus: review ? "complete-upgrade-B" : "not-required",
    reviewerNotes: review?.notes ?? "证据、许可与四视角视觉门均通过，接受第二轮 B 级逐栋估算。",
  };
}

async function run() {
  const argumentsList = process.argv.slice(2);
  const paths = {
    firstRound: requiredArgument(argumentsList, "--first-round"),
    candidate: requiredArgument(argumentsList, "--candidate"),
    queue: requiredArgument(argumentsList, "--queue"),
    sourceManifest: requiredArgument(argumentsList, "--source-manifest"),
    notices: requiredArgument(argumentsList, "--notices"),
    evidenceOutput: requiredArgument(argumentsList, "--evidence-output"),
    queueOutput: requiredArgument(argumentsList, "--queue-output"),
    reportOutput: requiredArgument(argumentsList, "--report-output"),
    runtimeOutput: requiredArgument(argumentsList, "--runtime-output"),
    gateOutput: requiredArgument(argumentsList, "--gate-output"),
  };
  await Promise.all([
    ensureNewOutput(paths.evidenceOutput),
    ensureNewOutput(paths.queueOutput),
    ensureNewOutput(paths.reportOutput),
    ensureNewOutput(paths.runtimeOutput),
    ensureNewOutput(paths.gateOutput),
    ...VISUAL_EVIDENCE.map((path) => access(resolve(PROJECT_ROOT, path))),
  ]);

  const [
    firstRound,
    candidate,
    queue,
    sourceManifest,
    notices,
  ] = await Promise.all([
    readFile(paths.firstRound, "utf8").then(JSON.parse),
    readFile(paths.candidate, "utf8").then(JSON.parse),
    readFile(paths.queue, "utf8").then(JSON.parse),
    readFile(paths.sourceManifest, "utf8").then(JSON.parse),
    readFile(paths.notices, "utf8"),
  ]);

  if (candidate.records.length !== 730) {
    throw new Error(`候选证据必须覆盖 730 栋，实际 ${candidate.records.length}`);
  }
  if (queue.records.length !== 676) {
    throw new Error(`第二轮队列必须覆盖 676 栋，实际 ${queue.records.length}`);
  }
  const queueById = new Map(queue.records.map((record) => [record.osmRef, record]));
  const firstRoundById = new Map(firstRound.records.map((record) => [record.osmRef, record]));
  if (queueById.size !== 676 || firstRoundById.size !== 730) {
    throw new Error("队列或第一轮证据存在重复 OSM ID");
  }

  const manualIds = queue.records
    .filter((record) => record.manualReviewRequired)
    .map((record) => record.osmRef)
    .sort();
  const expectedManualIds = [...MANUAL_DECISIONS.keys()].sort();
  if (JSON.stringify(manualIds) !== JSON.stringify(expectedManualIds)) {
    throw new Error(`人工复核集合不一致：${manualIds.join(", ")}`);
  }

  if (
    sourceManifest.sources.gba.licence !== "CC-BY-NC-4.0"
    || sourceManifest.sources.ghsObat.licence !== "ODbL-1.0"
    || !notices.includes("GlobalBuildingAtlas")
    || !notices.includes("GHS-OBAT")
    || !notices.includes("CC BY-NC 4.0")
  ) {
    throw new Error("第二轮来源清单或第三方许可声明不完整");
  }

  const records = candidate.records.map((record) => finalizeCandidate(
    record,
    firstRoundById.get(record.osmRef),
    queueById.get(record.osmRef),
  ));
  const generatedAt = new Date().toISOString();
  const finalQueue = queue.records.map((record) => {
    const review = MANUAL_DECISIONS.get(record.osmRef);
    const finalRecord = records.find((candidateRecord) => candidateRecord.osmRef === record.osmRef);
    return {
      ...record,
      status: finalRecord.round2Status,
      finalDecision: finalRecord.finalDecision,
      reviewerNotes: review?.notes ?? finalRecord.reviewerNotes,
    };
  });
  const confidence = countBy(records, (record) => record.confidence);
  const decisionCounts = countBy(finalQueue, (record) => record.finalDecision);
  if (
    confidence.A !== 11
    || confidence.B !== 532
    || confidence.C !== 187
    || decisionCounts["upgrade-B"] !== 489
    || decisionCounts["retain-C"] !== 187
  ) {
    throw new Error(`最终计数异常：${JSON.stringify({ confidence, decisionCounts })}`);
  }
  if (finalQueue.some((record) => record.finalDecision.startsWith("pending"))) {
    throw new Error("第二轮队列仍有 pending 决策");
  }

  const evidenceOutput = {
    ...candidate,
    generatedAt,
    scope: "full",
    provisional: false,
    sourceEvidence: paths.candidate.slice(PROJECT_ROOT.length + 1),
    records,
  };
  const reportOutput = {
    schemaVersion: 2,
    generatedAt,
    targetCount: 676,
    allBuildingCount: 730,
    policy: {
      matchingThresholdsFrozen: true,
      gbaMatch: "exact OSM source ID plus height and <=6 m internal standard-deviation gate",
      ghsObatRole: "auxiliary-only; never sufficient alone for B",
      globfpGroup: "2-4 unique source union under frozen spatial gate and <=6 m height spread",
      significantChangeManualReviewMetres: 20,
      deployment: "local-only; Sites and VPS excluded",
    },
    counts: {
      firstRoundConfidence: countBy(firstRound.records, (record) => record.confidence),
      round2Queue: 676,
      gbaExactIdCandidates: queue.records
        .filter((record) => record.round2Matches.gba).length,
      gbaPassing: queue.records
        .filter((record) => record.round2Matches.gba?.passesGate).length,
      ghsSpatialPassingAuxiliary: queue.records
        .filter((record) => record.round2Matches.ghsObat?.passesSpatialGate).length,
      globfpGroupPassing: queue.records
        .filter((record) => record.round2Matches.globfpGroup?.passesGate).length,
      manualReview: {
        total: MANUAL_DECISIONS.size,
        upgradeB: [...MANUAL_DECISIONS.values()]
          .filter((record) => record.decision === "upgrade-B").length,
        retainC: [...MANUAL_DECISIONS.values()]
          .filter((record) => record.decision === "retain-C").length,
        pending: 0,
      },
      decisions: decisionCounts,
      finalConfidence: confidence,
    },
    gates: {
      evidence: "pass",
      licence: "pass",
      candidateVisualQuality: "pass",
      canonicalRollout: "authorized",
    },
  };
  const runtimeOutput = {
    schemaVersion: 2,
    generatedAt,
    sourceEvidence: paths.evidenceOutput.slice(PROJECT_ROOT.length + 1),
    provisional: false,
    records: records.map((record) => ({
      overviewAssetId: record.overviewAssetId,
      selectedHeightMetres: record.selectedHeightMetres,
      selectedSource: record.selectedSource,
      confidence: record.confidence,
    })),
  };
  const gateOutput = {
    schemaVersion: 1,
    generatedAt,
    decision: "pass",
    canonicalRolloutAuthorized: true,
    targetCount: 676,
    gates: {
      matching: "pass",
      licence: "pass",
      visualQuality: "pass",
    },
    finalConfidence: confidence,
    queueDecisions: decisionCounts,
    manualReview: {
      total: MANUAL_DECISIONS.size,
      complete: MANUAL_DECISIONS.size,
      pending: 0,
      decisions: Object.fromEntries(MANUAL_DECISIONS),
    },
    sourcePolicy: {
      gba: "CC BY-NC 4.0; current community non-commercial use only; exact OSM ID; <=6 m internal standard deviation",
      ghsObat: "ODbL 1.0; coarse GHSL-derived auxiliary evidence only",
      globfp: "CC BY 4.0; frozen spatial gate; group union requires 2-4 unique features and <=6 m spread",
    },
    visualEvidence: VISUAL_EVIDENCE.map((path) => ({
      path,
      result: "pass",
    })),
    deployment: {
      sites: "not-published",
      vps: "not-published",
    },
  };

  await Promise.all([
    writeFile(paths.evidenceOutput, `${JSON.stringify(evidenceOutput, null, 2)}\n`),
    writeFile(paths.queueOutput, `${JSON.stringify({
      schemaVersion: 2,
      generatedAt,
      targetCount: 676,
      records: finalQueue,
    }, null, 2)}\n`),
    writeFile(paths.reportOutput, `${JSON.stringify(reportOutput, null, 2)}\n`),
    writeFile(paths.runtimeOutput, `${JSON.stringify(runtimeOutput, null, 2)}\n`),
    writeFile(paths.gateOutput, `${JSON.stringify(gateOutput, null, 2)}\n`),
  ]);
  process.stdout.write(`${JSON.stringify(reportOutput.counts, null, 2)}\n`);
}

await run();
