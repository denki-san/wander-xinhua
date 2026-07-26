import assert from "node:assert/strict";
import test from "node:test";
import { auditFicsXinhua365FinalGap } from "../scripts/test_fics_xinhua_365_final_gap_audit.mjs";

test("FICS新华365保留诊断合格阶段并锁住 service road 与非法 Hero/Identity", async () => {
  const result = await auditFicsXinhua365FinalGap();
  assert.equal(result.assetId, "fics-xinhua-365");
  assert.equal(result.membership, "blocked");
  assert.equal(result.mcp1, "pass-shape-only-preserved");
  assert.equal(result.diagnostic, "pass-preserved-no-promotion");
  assert.equal(result.serviceRoad, "blocked");
  assert.equal(result.map, "blocked");
  assert.equal(result.hero, "blocked");
  assert.equal(result.mcp2, "not-entered");
  assert.equal(result.identity, "blocked");
  assert.equal(result.buildingComplete, false);
});
