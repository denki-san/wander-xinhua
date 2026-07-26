import assert from "node:assert/strict";
import test from "node:test";
import { auditXinhuaVillas211FinalGap } from "../scripts/test_xinhua_villas_211_final_gap_audit.mjs";

test("新华别墅211弄保留 Massing 合格阶段并严禁非法 Hero/Identity 升级", async () => {
  const result = await auditXinhuaVillas211FinalGap();
  assert.equal(result.assetId, "xinhua-villas-211");
  assert.equal(result.massing, "complete-preserved");
  assert.equal(result.mcp1, "pass-preserved");
  assert.equal(result.mapRuntime, "pass-preserved");
  assert.equal(result.hero, "blocked");
  assert.equal(result.mcp2, "not-entered");
  assert.equal(result.identity, "blocked");
  assert.equal(result.buildingComplete, false);
});
