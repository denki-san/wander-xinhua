import assert from "node:assert/strict";
import test from "node:test";
import { auditXinhuaCommunityCenterFinalGap } from "../scripts/test_xinhua_community_center_final_gap_audit.mjs";

test("新华社区营造中心保留4号楼合格阶段并锁住道路与非法 Hero/Identity", async () => {
  const result = await auditXinhuaCommunityCenterFinalGap();
  assert.equal(result.assetId, "xinhua-community-center");
  assert.equal(result.evidence, "pass");
  assert.equal(result.osmBinding, "pass");
  assert.equal(result.mcp1, "pass-preserved");
  assert.equal(result.collision, "pass-preserved");
  assert.equal(result.map, "blocked");
  assert.equal(result.hero, "blocked");
  assert.equal(result.mcp2, "not-entered");
  assert.equal(result.identity, "blocked");
  assert.equal(result.buildingComplete, false);
});
