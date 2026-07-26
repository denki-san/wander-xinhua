import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const root=new URL("../",import.meta.url);
const json=async p=>JSON.parse(await readFile(new URL(p,root),"utf8"));
test("FICS 365 alias、compound和道路审计保持只读 blocker",async()=>{const a=await json("docs/research/fics-xinhua-365-exact-compound-audit-2026-07-26.json");assert.equal(a.aliases.canonical,"fics-xinhua-365");assert.equal(a.aliases.filmArtCenter,"distinct-registry-id-film-art-center");assert.equal(a.massing.status,"recovery-retained-no-rebuild");assert.ok(a.map.serviceRoadOverlapMeters<0);assert.ok(a.map.xinhuaRoadClearanceMeters>0);assert.equal(a.gates.map,"blocked");assert.equal(a.gates.identity,"blocked");});
