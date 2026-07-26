import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
const root = new URL("../", import.meta.url);
const read = (p) => readFile(new URL(p, root));
const sha = (b) => createHash("sha256").update(b).digest("hex");
test("东楼 v2 锁定候选 SHA、派生与地图 blocker", async () => {
 const c=JSON.parse(await read("docs/research/xingfuli-east-lineage-v2-candidate.json"));
 assert.equal(c.mapDecision.status,"blocked-preserved"); assert.equal(c.generator.sourceCommit,"e0790f6ca4e1e34fafe88f63b1d9d9a4bb185539");
 assert.equal(sha(await read("public/models/tiers/xingfuli/identity-v2/xingfuli-east-identity-v2.glb")),c.lineage.identity.glbSha256);
 assert.equal(sha(await read("public/models/tiers/xingfuli/massing-v2/xingfuli-east-massing-v2.glb")),c.lineage.massing.glbSha256);
 assert.equal(c.lineage.identity.doubleBuild.glbByteExact,true); assert.equal(c.lineage.massing.doubleBuild.blendByteExact,false);
});
test("东楼 v2 六张固定预览可审计", async () => {
 const c=JSON.parse(await read("docs/research/xingfuli-east-lineage-v2-candidate.json"));
 const ps=["identity-v2/xingfuli-east/headless/test_xingfuli-east-identity-v2_canonical_preview.png","identity-v2/xingfuli-east/headless/test_xingfuli-east-identity-v2_side_preview.png","identity-v2/xingfuli-east/headless/test_xingfuli-east-identity-v2_street_preview.png","massing-v2/xingfuli-east/headless/test_xingfuli-east-massing-v2_canonical_preview.png","massing-v2/xingfuli-east/headless/test_xingfuli-east-massing-v2_side_preview.png","massing-v2/xingfuli-east/headless/test_xingfuli-east-massing-v2_street_preview.png"];
 for(const p of ps) assert.ok((await read(`test_artifacts/all-models/${p}`)).length>700000,p);
 assert.deepEqual(c.previews.dimensions,[1100,720]);
});
