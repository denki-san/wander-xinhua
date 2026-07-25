import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const qaPath = path.join(
  root,
  "docs/research/xinhua-road-massing-runtime-qa.json",
);
const qa = JSON.parse(readFileSync(qaPath, "utf8"));
const checkOnly = process.argv.includes("--check");

assert.equal(qa.assets.length, 14);
assert.equal(new Set(qa.assets.map(({ slug }) => slug)).size, 14);

for (const asset of qa.assets) {
  const recordPath = path.join(
    root,
    "docs/research/build-records/tiers/xinhua-road/massing",
    `${asset.slug}-massing.json`,
  );
  const record = JSON.parse(readFileSync(recordPath, "utf8"));
  const rebuildRequired = asset.independentReviewStatus === "rebuild-required";
  const expected = {
    ...record,
    status: rebuildRequired
      ? "massing-rebuild-required-independent-review"
      : "massing-generated-runtime-gate-blocked-evidence-and-walkaround",
    outputs: {
      ...record.outputs,
      previews: {
        ...record.outputs.previews,
        threejs: asset.screenshot,
      },
    },
    runtimeGate: {
      status: rebuildRequired
        ? "blocked-rebuild-required"
        : "blocked-evidence-map-and-walkaround-required",
      validatedAt: qa.validatedAt,
      route: asset.route,
      screenshot: asset.screenshot,
      viewport: qa.build.viewport,
      buildMode: qa.build.mode,
      pageVisibility: qa.build.pageVisibility,
      playable: asset.playable,
      canvasCount: asset.canvasCount,
      cameraMode: asset.cameraMode,
      blockerId: asset.blockerId,
      visualStatus: asset.primaryVisualStatus,
      independentReviewStatus: asset.independentReviewStatus,
      requiredActions: asset.requiredActions,
      mapAcceptance: "required-before-formal-pass",
    },
  };
  const serialized = `${JSON.stringify(expected, null, 2)}\n`;

  if (checkOnly) {
    assert.equal(
      readFileSync(recordPath, "utf8"),
      serialized,
      `${asset.slug} build record 与运行时 QA 不一致`,
    );
  } else {
    writeFileSync(recordPath, serialized);
  }
}

if (!checkOnly) {
  console.log("已把 14 个 Massing 主审与独立审查结果写入 build records");
}
