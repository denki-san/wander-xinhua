import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const REVIEW_PATH = resolve(
  PROJECT_ROOT,
  "docs/research/building-height-manual-review-queue-poc.json",
);

const REVIEW_DECISIONS = new Map([
  ["way/494662067", {
    decision: "retain-direct",
    reviewerNotes: "保留 OSM 明确楼层换算的 12 m；3D-GloBFP 候选与直接证据冲突且 IoU 未达到 0.70。",
  }],
  ["way/493383434", {
    decision: "retain-direct",
    reviewerNotes: "保留 OSM 明确楼层换算的 9 m；候选质心、面积比和 IoU 均未通过冻结门槛。",
  }],
  ["way/864847910", {
    decision: "retain-direct",
    reviewerNotes: "保留 OSM 明确楼层换算的 24 m；3D-GloBFP 面积比 3.8288，不构成一对一证据。",
  }],
  ["way/864847908", {
    decision: "retain-direct",
    reviewerNotes: "保留 OSM 明确楼层换算的 24 m；候选 IoU 0.6157 未通过冻结门槛。",
  }],
  ["way/494634318", {
    decision: "retain-direct",
    reviewerNotes: "保留 OSM 明确楼层换算的 21 m；候选 IoU 和质心距离均未通过。",
  }],
  ["way/493402089", {
    decision: "retain-direct",
    reviewerNotes: "保留 OSM 明确楼层换算的 33 m；候选 IoU 0.6148 未通过冻结门槛。",
  }],
  ["way/864847909", {
    decision: "retain-direct",
    reviewerNotes: "保留 OSM 明确楼层换算的 24 m；候选 IoU 与面积比均未通过。",
  }],
  ["way/493414601", {
    decision: "retain-direct",
    reviewerNotes: "保留 OSM 明确楼层换算的 72 m；候选与直接证据冲突，且 IoU、质心、面积比均失败；桌面与 390px 天际线无异常。",
  }],
  ["way/493402379", {
    decision: "retain-direct",
    reviewerNotes: "保留 OSM 明确楼层换算的 33 m；候选 IoU 0.6203 未通过冻结门槛。",
  }],
  ["way/864847907", {
    decision: "retain-direct",
    reviewerNotes: "保留 OSM 明确楼层换算的 24 m；候选 IoU、质心和面积比均未通过。",
  }],
  ["way/494662056", {
    decision: "retain-direct",
    reviewerNotes: "保留 OSM 明确楼层换算的 30 m；候选与直接证据冲突，且 IoU 和质心距离失败。",
  }],
  ["way/1343674557", {
    decision: "retain-baseline",
    reviewerNotes: "保留 C 级 15 m；面积比 1.8204 超过上限，核心道路真实页面未见层级或遮挡异常。",
  }],
  ["way/228966553", {
    decision: "retain-baseline",
    reviewerNotes: "保留 C 级 15 m；IoU 0.5813 且面积比 1.6816，未达到冻结门槛。",
  }],
  ["way/297851858", {
    decision: "retain-baseline",
    reviewerNotes: "保留 C 级 24 m；IoU 0.2281、质心距离 16.5082 m，不能采用模型估算。",
  }],
  ["way/493421562", {
    decision: "retain-baseline",
    reviewerNotes: "保留 C 级 9 m；没有空间候选，未知真实高度保持显式记录。",
  }],
  ["way/864485588", {
    decision: "retain-baseline",
    reviewerNotes: "保留 C 级 15 m；IoU 0.131、质心距离 6.6578 m，匹配失败。",
  }],
  ["way/864493241", {
    decision: "retain-baseline",
    reviewerNotes: "保留 C 级 15 m；IoU 0.6356 未达到 0.70，不因接近阈值而放宽标准。",
  }],
  ["way/864505108", {
    decision: "retain-baseline",
    reviewerNotes: "保留 C 级 15 m；IoU 0.5875 未通过，幸福路/法华镇路页面层级正常。",
  }],
  ["way/864505151", {
    decision: "retain-baseline",
    reviewerNotes: "保留 C 级 15 m；IoU 0.6855 仍低于冻结门槛，不做边界放宽。",
  }],
  ["way/864823833", {
    decision: "retain-baseline",
    reviewerNotes: "保留 C 级 15 m；IoU 0.6251 未通过，POI replacement 边缘未见穿插。",
  }],
  ["way/864505155", {
    decision: "accept",
    reviewerNotes: "接受 10.15 m；唯一候选通过 IoU 0.7051、质心 2.0296 m、面积比 1.0921，真实页面无塌陷或孔洞。",
  }],
  ["way/426764527", {
    decision: "accept",
    reviewerNotes: "接受 34.55 m；唯一候选通过 IoU 0.7064、质心 4.302 m、面积比 0.9128，桌面与 390px 层级正常。",
  }],
  ["way/864493217", {
    decision: "accept",
    reviewerNotes: "接受 16.33 m；唯一候选通过 IoU 0.707、质心 1.7449 m、面积比 1.3604。",
  }],
  ["way/864485657", {
    decision: "accept",
    reviewerNotes: "接受 16.67 m；唯一候选通过 IoU 0.7089、质心 2.3409 m、面积比 0.786。",
  }],
  ["way/1117538713", {
    decision: "accept",
    reviewerNotes: "接受 73.15 m 模型估算；IoU 0.7572、质心 2.9257 m、面积比 0.9651，三机位呈正常宽体高层，非针塔且未压过 POI。",
  }],
  ["way/864493127", {
    decision: "accept",
    reviewerNotes: "接受 60 m 模型估算；IoU 0.7326、质心 2.0144 m、面积比 1.2415，桌面与 390px 天际线复核通过。",
  }],
  ["way/864505114", {
    decision: "accept",
    reviewerNotes: "接受 58.64 m 模型估算；IoU 0.7594、质心 2.4971 m、面积比 0.9175，核心道路视角无异常遮挡。",
  }],
  ["way/428379724", {
    decision: "accept",
    reviewerNotes: "接受 49.37 m；唯一通过候选 IoU 0.7202、质心 1.8471 m、面积比 1.1899，天际线形态正常。",
  }],
  ["way/493401527", {
    decision: "accept",
    reviewerNotes: "接受 48.3 m；唯一通过候选 IoU 0.7792、质心 1.4108 m、面积比 0.9307，未见穿插或层级丢失。",
  }],
  ["way/296006189", {
    decision: "accept",
    reviewerNotes: "接受 40.17 m；唯一候选通过 IoU 0.7528、质心 2.7694 m、面积比 1.3176，法华镇路视角正常。",
  }],
]);

async function run() {
  const review = JSON.parse(await readFile(REVIEW_PATH, "utf8"));
  const queueIds = new Set(review.records.map((record) => record.osmRef));
  const missing = [...REVIEW_DECISIONS.keys()].filter((id) => !queueIds.has(id));
  const unexpected = [...queueIds].filter((id) => !REVIEW_DECISIONS.has(id));
  if (missing.length || unexpected.length || review.records.length !== 30) {
    throw new Error(
      `PoC 复核队列与冻结决策不一致：missing=${missing.join(",")} unexpected=${unexpected.join(",")}`,
    );
  }
  review.reviewedAt = "2026-07-25";
  review.reviewer = "Codex visual and evidence audit";
  review.evidenceViews = [
    "docs/research/test_building_height_poc_desktop_1440x1024.png",
    "docs/research/test_building_height_poc_mobile_390x844.png",
    "docs/research/test_building_height_poc_xingfu_road_desktop_1440x1024.png",
    "docs/research/test_building_height_poc_fahuazhen_road_desktop_1440x1024.png",
  ];
  review.records = review.records.map((record) => ({
    ...record,
    ...REVIEW_DECISIONS.get(record.osmRef),
  }));
  await writeFile(REVIEW_PATH, `${JSON.stringify(review, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({
    reviewed: review.records.length,
    decisions: Object.groupBy(review.records, (record) => record.decision),
  }, null, 2)}\n`);
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await run();
}
