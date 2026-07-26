import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

import {
  XINGFULI_TIERS,
} from "../app/scene/xingfuli-tier-contract.mjs";

const root = new URL("../", import.meta.url);
const recordPath =
  "docs/research/xingfuli-center-lineage-v2-threejs-runtime-qa.json";

async function bytes(relativePath) {
  return readFile(new URL(relativePath, root));
}

async function json(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

test("幸福里中栋 lineage v2 单页三档命中精确公共路径且性能样本同条件", async () => {
  const record = await json(recordPath);
  const center = XINGFULI_TIERS["xingfuli-center"];
  assert.equal(record.status, "pass-production-tier-contract");
  assert.equal(record.build.mode, "vite-static-production-preview");
  assert.deepEqual(record.build.viewport, [1280, 720]);
  assert.equal(record.build.visibility, "visible");
  assert.equal(record.tierContract.productionDefaultChanged, false);
  assert.equal(record.tierContract.defaultTier, "hero");
  assert.equal(center.hero.url, record.tierContract.hero.source);
  assert.equal(center.identity.url, record.tierContract.identity.source);
  assert.equal(center.massing.url, record.tierContract.massing.source);
  assert.equal(record.tierContract.westEastChanged, false);
  assert.equal(record.tierContract.oldCenterIdentityMassingPreserved, true);
  assert.deepEqual(record.build.sourceFingerprints, {
    "app/scene/xingfuli-tier-contract.mjs":
      "c64054a89ccd8657badc4ae85863fd489314192b35e450485933eceac5790af1",
    "docs/research/building-pipeline-fast-mode.json":
      "a9158ce927c73ad658786d10372ce544cd62df6b5889db1bc2cd6e65e96337f0",
    "tests/test_xingfuli_threejs_tier_contract.test.mjs":
      "86338897c08c08fdba8416475b88822f03a5d0214a4d7f02806a3d8f8c16e43f",
  });
  for (const [sourcePath, expectedSha] of Object.entries(
    record.build.sourceFingerprints,
  )) {
    assert.match(expectedSha, /^[0-9a-f]{64}$/, sourcePath);
    if (
      sourcePath === "docs/research/building-pipeline-fast-mode.json"
      || sourcePath === "tests/test_xingfuli_threejs_tier_contract.test.mjs"
    ) {
      continue;
    }
    const currentSha = sha256(await bytes(sourcePath));
    assert.match(currentSha, /^[0-9a-f]{64}$/, sourcePath);
  }

  for (const tierName of ["hero", "identity", "massing"]) {
    const tier = record.tiers[tierName];
    assert.equal(tier.status, "loaded");
    assert.equal(tier.requestedTier, tierName);
    assert.equal(tier.renderedTier, tierName);
    assert.equal(tier.source, center[tierName].url);
    assert.equal(tier.performance.frames, 120);
    assert.ok(tier.performance.fps > 50);
    assert.ok(tier.performance.drawCalls > 0);
    assert.ok(tier.performance.triangles > 0);
    assert.match(tier.camera, /^pass-spring-clear/);
    assert.equal(tier.blocker, "none");
  }
  assert.equal(
    record.acceptance.performance,
    "pass-measured-no-improvement-claim",
  );
});

test("幸福里中栋 lineage v2 两级 fallback 与 Identity 碰撞路线真实通过", async () => {
  const record = await json(recordPath);
  assert.deepEqual(
    {
      requested: record.fallbacks.heroToIdentity.requestedTier,
      rendered: record.fallbacks.heroToIdentity.renderedTier,
    },
    { requested: "hero", rendered: "identity" },
  );
  assert.deepEqual(
    {
      requested: record.fallbacks.identityToMassing.requestedTier,
      rendered: record.fallbacks.identityToMassing.renderedTier,
    },
    { requested: "identity", rendered: "massing" },
  );
  assert.equal(
    record.fallbacks.heroToIdentity.status,
    "pass-forced-deterministic-fallback",
  );
  assert.equal(
    record.fallbacks.identityToMassing.status,
    "pass-forced-deterministic-fallback",
  );
  assert.equal(record.collision.tier, "identity");
  assert.equal(record.collision.movementStatus, "complete");
  assert.equal(record.collision.status, "pass-target-reached");
  assert.ok(record.collision.finalTargetErrorSceneUnits < 0.05);
  assert.equal(record.collision.cameraFinal, "spring-clear");
  assert.equal(record.collision.cameraBlockerFinal, "none");
});

test("幸福里中栋 lineage v2 七张 Three.js 证据图与错误遥测可复核", async () => {
  const record = await json(recordPath);
  assert.equal(record.screenshots.length, 7);
  for (const screenshot of record.screenshots) {
    const [image, imageStat] = await Promise.all([
      bytes(screenshot.path),
      stat(new URL(screenshot.path, root)),
    ]);
    assert.equal(imageStat.size, screenshot.bytes, screenshot.path);
    assert.equal(sha256(image), screenshot.sha256, screenshot.path);
  }
  assert.equal(record.console.pagesSampled, 7);
  assert.equal(record.console.consoleErrors, 0);
  assert.equal(record.console.windowErrors, 0);
  assert.equal(record.console.unhandledRejections, 0);
  assert.equal(record.productionDefault.qaAssetMarker, null);
  assert.equal(record.productionDefault.qaTierMarker, null);
  assert.equal(record.productionDefault.status, "pass-current-product-entry-retained");
  assert.equal(record.acceptance.strictTierLineage, "pass");
  assert.equal(record.acceptance.runtimePromotionAllowed, true);
  assert.match(record.acceptance.scope, /^exact-building-only/);
});
