import assert from "node:assert/strict";
import test from "node:test";
import { auditOneStepGardenFinalGap } from "../scripts/test_one_step_garden_final_gap_audit.mjs";

test("一尺花园最终缺口审计保持三档 lineage、地图和 runtime 门一致", async () => {
  const result = await auditOneStepGardenFinalGap();
  assert.equal(result.assetId, "one-step-garden");
  assert.equal(result.status, "pass-existing-accepted-stages-preserved");
  assert.equal(result.strictLineage, "pass");
  assert.equal(result.gates.mcp1Massing, "pass-preserved");
  assert.equal(result.gates.mcp2Hero, "pass-preserved");
  assert.equal(result.gates.mcp3ThreeTier, "pass-preserved");
  assert.equal(result.gates.threeJsSinglePageRuntime, "pass-preserved");
  assert.equal(result.nearestBuilding.overlap, false);
  assert.equal(result.runtime, "pass-main-window-real-browser-preserved");
});
