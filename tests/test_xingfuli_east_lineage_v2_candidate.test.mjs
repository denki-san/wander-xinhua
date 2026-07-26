import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("幸福里东楼 v2 候选锁定严格父子 SHA、隔离范围与待审地图边界", async () => {
  const candidate = JSON.parse(await read("docs/research/xingfuli-east-lineage-v2-candidate.json"));
  assert.equal(candidate.assetId, "xingfuli-east");
  assert.equal(candidate.status, "candidate-awaiting-main-window-mcp-and-runtime");
  assert.deepEqual(candidate.scope.exactBuildingIds, ["xingfuli-east"]);
  assert.equal(candidate.scope.publicRuntimeModified, false);
  assert.equal(candidate.mapDecision.status, "blocked-preserved");
  assert.equal(candidate.lineage[1].parentGlbSha256, candidate.lineage[0].glbSha256);
  assert.equal(candidate.lineage[2].parentGlbSha256, candidate.lineage[1].glbSha256);
  for (const tier of candidate.lineage) assert.equal(sha(await read(tier.glb)), tier.glbSha256);
  assert.ok(candidate.lineage[0].bytes > candidate.lineage[1].bytes && candidate.lineage[1].bytes > candidate.lineage[2].bytes);
  assert.ok(candidate.lineage[0].triangles > candidate.lineage[1].triangles && candidate.lineage[1].triangles > candidate.lineage[2].triangles);
  assert.ok(candidate.lineage[0].sourceObjects > candidate.lineage[1].sourceObjects && candidate.lineage[1].sourceObjects > candidate.lineage[2].sourceObjects);
});
