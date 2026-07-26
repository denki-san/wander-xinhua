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
test("东楼 v2 两份 build record 与最终文件一致", async () => {
 for (const [tier, glb, blend, parent] of [["identity-v2","3352d6174273a87a1a049df61a884255d451d424f36a203361cf74671a71db25","5fc4999a58aebdce9c134f1da875a12d65c974fc76557410ff216c49a104ca98","487c3b61669941801f6605ecec3e9711fa1e6cff27c53cc2fc96e4439fbb2d72"],["massing-v2","c0defcbdc99c5939499db3ce33fb4d01cb8f8cf9f9a5fc49dd9270e8a23d3450","339133cf28f9917d49283b118f9e679263bece54fbf6bac4509ae5046586ce8a","5fc4999a58aebdce9c134f1da875a12d65c974fc76557410ff216c49a104ca98"]]) {
  const r=JSON.parse(await read(`docs/research/build-records/tiers/xingfuli/${tier}/xingfuli-east-${tier}.json`));
  assert.equal(r.generator.sourceCommit,"e0790f6ca4e1e34fafe88f63b1d9d9a4bb185539"); assert.equal(r.parent.blendSha256,parent); assert.equal(r.output.glb.sha256,glb); assert.equal(r.output.blend.sha256,blend); assert.equal(r.scope.map,"blocked-preserved"); assert.deepEqual(r.previews.dimensions,[1100,720]);
 }
});
