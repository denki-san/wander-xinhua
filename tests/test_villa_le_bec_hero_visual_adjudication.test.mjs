import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import test from "node:test";
import { historicalSha256 } from "./helpers/historical-git-fixtures.mjs";

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

test("Villa Le Bec Hero v1 第三版固定机位失败且不授权 Identity", async () => {
  const record = await readJson(recordPath);
  const build = await readJson("docs/research/build-records/tiers/xinhua-road/hero-v1/villa-le-bec-hero.json");

  assert.equal(record.assetId, "villa-le-bec");
  assert.equal(record.candidate.sha256, build.outputs.glbSha256);
  assert.equal(record.decision.preMcp2VisualGate, "fail-iteration-3-fixed-view-identity-mismatch");
  assert.equal(record.decision.mcp2, "fail-main-window-blender-mcp-current-sha");
  assert.equal(record.decision.identityAuthorized, false);
  assert.equal(record.decision.runtimePromotionAuthorized, false);
  assert.equal(build.gates.mcp2, "fail-main-window-fixed-view-identity-mismatch");
  assert.equal(build.gates.identity, "not-authorized-from-hero-v1");
});

test("Villa Le Bec 视觉裁决锁定参考和候选截图指纹且保留旧候选", async () => {
  const record = await readJson(recordPath);

  assert.equal(record.candidate.preservation, "retained-blocked-hero-v1-current-sha");
  assert.equal(record.comparisonInputs.length, 5);
  for (const input of record.comparisonInputs) {
    await access(new URL(input.path, root));
    assert.match(input.sha256, /^[a-f0-9]{64}$/);
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  assert.deepEqual(record.reviewHistory.map(({ iteration }) => iteration), [1, 2, 3]);
  for (const historical of record.reviewHistory.slice(0, 2)) {
    assert.equal(
      historicalSha256(historical.gitCommit, record.candidate.glb),
      historical.sha256,
    );
  }
  assert.equal(record.reviewHistory[1].bayGlazingSurfaceFix, "pass");
  assert.equal(record.reviewHistory[2].dormerGlazingSurfaceFix, "pass");
  assert.equal(record.decision.massingMapAndCollisionRetained, true);
  assert.equal(record.scopeGuard.onlyBuilding, "villa-le-bec");
  assert.equal(record.scopeGuard.doNotModify.includes("trees"), true);
  assert.equal(record.scopeGuard.doNotModify.includes("full-map-assets"), true);
});
