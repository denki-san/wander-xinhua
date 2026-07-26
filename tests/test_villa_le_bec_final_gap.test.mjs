import assert from "node:assert/strict";
import test from "node:test";
import { auditVillaLeBecFinalGap } from "../scripts/test_villa_le_bec_final_gap_audit.mjs";

test("Villa Le Bec 保留 MCP1 并锁住地图、Hero 与 Identity 非法晋级", async () => {
  const result = await auditVillaLeBecFinalGap();
  assert.equal(result.assetId, "villa-le-bec");
  assert.equal(result.mcp1, "pass-preserved");
  assert.equal(result.map, "blocked");
  assert.equal(result.heroCandidate, "blocked");
  assert.equal(result.mcp2, "not-entered");
  assert.equal(result.identity, "blocked");
  assert.equal(result.mcp3, "not-entered");
  assert.equal(result.buildingComplete, false);
});
