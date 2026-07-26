import assert from "node:assert/strict";
import test from "node:test";
import { auditShanghaiOrchestraFinalGap } from "../scripts/test_shanghai_orchestra_final_gap_audit.mjs";

test("上海民族乐团保留 Massing 诊断并锁住未绑定 Hero/Identity 晋级", async () => {
  const result = await auditShanghaiOrchestraFinalGap();
  assert.equal(result.assetId, "shanghai-orchestra");
  assert.equal(result.membership, "blocked");
  assert.equal(result.mcp1, "pass-shape-only-preserved");
  assert.equal(result.diagnostic, "pass-preserved-no-promotion");
  assert.equal(result.map, "blocked");
  assert.equal(result.hero, "blocked");
  assert.equal(result.mcp2, "not-entered");
  assert.equal(result.identity, "blocked");
  assert.equal(result.buildingComplete, false);
});
