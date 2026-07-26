import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  resolveXingfuliQa,
  XINGFULI_SEGMENT_IDS,
  XINGFULI_TIERS,
} from "../app/scene/xingfuli-tier-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(
  path.join(ROOT, "app/scene/xingfuli-architecture-model.tsx"),
  "utf8",
);
const worldSource = fs.readFileSync(
  path.join(ROOT, "app/scene/xinhua-world.tsx"),
  "utf8",
);
const manifest = JSON.parse(fs.readFileSync(
  path.join(ROOT, "docs/research/building-pipeline-fast-mode.json"),
  "utf8",
));
const sha256 = (relativePath) => crypto
  .createHash("sha256")
  .update(fs.readFileSync(path.join(ROOT, relativePath)))
  .digest("hex");

for (const assetId of XINGFULI_SEGMENT_IDS) {
  test(`${assetId} QA 三档锁定当前二进制且默认仍为 final Hero`, () => {
    for (const tierName of ["hero", "identity", "massing"]) {
      const tier = XINGFULI_TIERS[assetId][tierName];
      const relativePath = `public${tier.path}`;
      assert.equal(fs.statSync(path.join(ROOT, relativePath)).size, tier.bytes);
      assert.equal(sha256(relativePath), tier.sha256);
      const resolved = resolveXingfuliQa(
        `?qaModelId=${assetId}&qaModelTier=${tierName}`,
      );
      assert.equal(resolved.requestedTier, tierName);
      assert.equal(resolved.renderedTier, tierName);
      assert.equal(resolved.renderedModelPath, tier.url);
      assert.equal(resolved.forcedFallback, false);
    }
    assert.match(XINGFULI_TIERS[assetId].hero.url, /20260723-final-1$/);
  });

  test(`${assetId} fallback 只降一级且 Massing 不伪造更低档`, () => {
    const hero = resolveXingfuliQa(
      `?qaModelId=${assetId}&qaModelTier=hero`
      + `&qaActiveFallback=${assetId}:hero`,
    );
    assert.equal(hero.renderedTier, "identity");
    assert.equal(hero.forcedFallback, true);

    const identity = resolveXingfuliQa(
      `?qaModelId=${assetId}&qaModelTier=identity`
      + `&qaActiveFallback=${assetId}:identity`,
    );
    assert.equal(identity.renderedTier, "massing");
    assert.equal(identity.forcedFallback, true);

    const massing = resolveXingfuliQa(
      `?qaModelId=${assetId}&qaModelTier=massing`
      + `&qaActiveFallback=${assetId}:massing`,
    );
    assert.equal(massing.renderedTier, "massing");
    assert.equal(massing.forcedFallback, false);
    assert.equal(massing.fallbackMode, "no-lower-tier");
  });

  test(`${assetId} Fast Mode 暴露三档与两条降级深链`, () => {
    const entry = manifest.buildings.find(({ id }) => id === assetId);
    assert.ok(entry.tests.includes(
      "tests/test_xingfuli_threejs_tier_contract.test.mjs",
    ));
    for (const tierName of ["hero", "identity", "massing"]) {
      assert.ok(entry.runtimeRoutes.some(
        (route) => route.includes(`qaModelTier=${tierName}`),
      ));
    }
    assert.ok(entry.runtimeRoutes.some(
      (route) => route.includes(`qaActiveFallback=${assetId}:hero`),
    ));
    assert.ok(entry.runtimeRoutes.some(
      (route) => route.includes(`qaActiveFallback=${assetId}:identity`),
    ));
  });
}

test("幸福里 QA 只接受三栋清单且页面暴露单页性能/档位/fallback 采集", () => {
  assert.equal(resolveXingfuliQa("?qaModelId=plane-tree&qaModelTier=hero"), null);
  assert.equal(resolveXingfuliQa("?qaModelId=xingfuli-west&qaModelTier=unknown"), null);
  assert.match(source, /dataset\.xingfuliQaRequestedTier/);
  assert.match(source, /dataset\.xingfuliQaRenderedTier/);
  assert.match(source, /dataset\.xingfuliQaFallback/);
  assert.match(source, /dataset\.xingfuliQaFrameSample/);
  assert.match(source, /document\.visibilityState !== "visible"/);
  assert.match(worldSource, /resolveXingfuliQa/);
  assert.match(worldSource, /xingfuliQaActive \? "full" : xingfuliTier/);
});
