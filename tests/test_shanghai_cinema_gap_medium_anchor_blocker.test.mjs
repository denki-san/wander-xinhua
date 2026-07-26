import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const blockerPath = "docs/research/shanghai-cinema-gap-medium-anchor-blocker-2026-07-26.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256File(relativePath) {
  const source = await readFile(new URL(relativePath, root));
  return createHash("sha256").update(source).digest("hex");
}

test("上海影城仅保留地理双点锚点 blocker，source drift 与 Film 邻栋壳已关闭", async () => {
  const blocker = await readJson(blockerPath);
  for (const source of Object.values(blocker.verifiedInputs)) {
    assert.equal(await sha256File(source.path), source.sha256, source.path);
  }
  for (const tier of Object.values(blocker.retainedAcceptedStages).filter(
    (value) => value && typeof value === "object" && "path" in value,
  )) {
    assert.equal(await sha256File(tier.path), tier.sha256, tier.path);
  }
  assert.equal(blocker.closedFindings.heroSourceDrift.status,
    "closed-pass-exact-source-reproduction");
  assert.equal(blocker.closedFindings.filmNeighborCollision.status,
    "closed-current-no-runtime-aabb-overlap");
  assert.equal(
    blocker.mainWindowPublicRescueReview.input.sha256AtReview,
    "75cfefd43af6ded5dda1269cbca20c0f47b705e1743c3c1aa948db5615f12f25",
  );
  assert.match(
    blocker.mainWindowPublicRescueReview.integrationAdvice,
    /Safe to integrate/,
  );
  assert.match(
    blocker.mainWindowPublicRescueReview.reviewLimitation,
    /did not re-fetch/,
  );
  assert.equal(
    blocker.externalResearchWorkflowReview.officialPrimarySourceReview.status,
    "content-conclusion-acceptable-non-decisive",
  );
  assert.equal(
    blocker.externalResearchWorkflowReview.secondaryDesignerPage.status,
    "non-decisive-not-required-for-anchor",
  );
  assert.equal(
    blocker.externalResearchWorkflowReview.wikiIngestion.status,
    "required-before-formal-external-research-integration",
  );
  assert.match(
    blocker.externalResearchWorkflowReview.wikiIngestion.currentAction,
    /No external-storage write/,
  );
  assert.deepEqual(blocker.remainingAnchorBlocker.currentPlacement, {
    position: [74.1, 80.9], yaw: 2.761592653589793, scale: 1,
  });
  assert.equal(blocker.remainingAnchorBlocker.formalMapAcceptanceAuthorized, false);
  assert.equal(blocker.verdict.mapAnchorClosed, false);
  assert.equal(blocker.verdict.heroSourceDriftClosed, true);
  assert.equal(blocker.verdict.filmNeighborCollisionClosed, true);
  assert.equal(blocker.verdict.publicWiringAuthorized, false);
});
