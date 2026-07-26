import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath = "docs/research/villa-le-bec-hero-visual-adjudication.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

test("Villa Le Bec Hero 候选固定机位不通过时不得进入 MCP2 或 Identity", async () => {
  const record = await readJson(recordPath);
  const build = await readJson("docs/research/build-records/tiers/xinhua-road/hero-v1/villa-le-bec-hero.json");

  assert.equal(record.assetId, "villa-le-bec");
  assert.equal(record.candidate.sha256, build.outputs.glbSha256);
  assert.equal(record.decision.preMcp2VisualGate, "fail");
  assert.match(record.decision.mcp2, /^not-entered/);
  assert.equal(record.decision.identityAuthorized, false);
  assert.equal(record.decision.runtimePromotionAuthorized, false);
  assert.equal(build.gates.mcp2, "blocked-pre-mcp2-main-visual-review");
  assert.equal(build.gates.identity, "not-authorized");
});

test("Villa Le Bec 视觉裁决锁定参考和候选截图指纹且保留旧候选", async () => {
  const record = await readJson(recordPath);

  assert.match(record.candidate.preservation, /retain-current-blocked-candidate/);
  assert.equal(record.comparisonInputs.length, 5);
  for (const input of record.comparisonInputs) {
    await access(new URL(input.path, root));
    assert.match(input.sha256, /^[a-f0-9]{64}$/);
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  assert.deepEqual(record.reviewHistory.map(({ iteration }) => iteration), [1, 2]);
  const first = record.reviewHistory[0];
  const firstBuffer = execFileSync(
    "git",
    ["show", `${first.gitCommit}:${record.candidate.glb}`],
    { cwd: decodeURIComponent(root.pathname) },
  );
  assert.equal(createHash("sha256").update(firstBuffer).digest("hex"), first.sha256);
  assert.equal(record.reviewHistory[1].bayGlazingSurfaceFix, "pass");
  assert.equal(record.decision.massingMapAndCollisionRetained, true);
  assert.equal(record.scopeGuard.onlyBuilding, "villa-le-bec");
  assert.equal(record.scopeGuard.doNotModify.includes("trees"), true);
  assert.equal(record.scopeGuard.doNotModify.includes("full-map-assets"), true);
});

test("统一状态与 Fast Mode 保持 Villa Le Bec 候选 blocked 且不推广运行时", async () => {
  const [status, fast] = await Promise.all([
    readJson("docs/research/exact-18-building-status.json"),
    readJson("docs/research/building-pipeline-fast-mode.json"),
  ]);
  const building = status.buildings.find((entry) => entry.id === "villa-le-bec");
  const fastBuilding = fast.buildings.find((entry) => entry.id === "villa-le-bec");

  assert.equal(building.hero, "blocked-pre-mcp2-visual-mismatch");
  assert.equal(building.mcp2, "blocked");
  assert.equal(building.identity, "missing");
  assert.equal(building.runtimePolicy, "massing-only-no-tier-promotion");
  assert.equal(building.records.includes(recordPath), true);
  assert.equal(fastBuilding.tests.includes("tests/test_villa_le_bec_hero_visual_adjudication.test.mjs"), true);
  assert.equal(
    fastBuilding.glbs.includes("public/models/tiers/xinhua-road/hero-v1/villa-le-bec-hero.glb"),
    true,
  );
});
