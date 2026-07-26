import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const path = "docs/research/xinhua-villas-329-hero-readiness-adjudication.json";

async function json(relativePath) { return JSON.parse(await readFile(new URL(relativePath, root), "utf8")); }
async function sha256(relativePath) { return createHash("sha256").update(await readFile(new URL(relativePath, root))).digest("hex"); }

test("329 Hero readiness 冻结 833bb8a 已通过的四成员 Massing/map/runtime 合同", async () => {
  const adjudication = await json(path);
  for (const source of Object.values(adjudication.sources)) assert.equal(await sha256(source.path), source.sha256);
  const frozen = adjudication.frozenMassingMapRuntime;
  assert.equal(frozen.integrationCommit, "833bb8a");
  assert.deepEqual(frozen.placement, { position: [-42.13, 79.48], yaw: -0.38, scale: 0.62 });
  assert.deepEqual(frozen.members, ["15", "36", "40", "42"]);
  assert.deepEqual(frozen.stripCountByMember, { 15: 1, 36: 1, 40: 6, 42: 6 });
  assert.equal(frozen.collisionProxyCount, 14);
  assert.equal(frozen.formalMassingAcceptance, "pass");
  assert.equal(frozen.movementScaleFootprintChangesAuthorized, false);
});

test("329 有四组可辨识构件但视角与成员绑定不足以授权纯建筑 Hero", async () => {
  const adjudication = await json(path);
  assert.equal(adjudication.status, "blocked-pure-building-hero-evidence");
  assert.ok(Object.keys(adjudication.identityComponents).length >= 3);
  assert.equal(adjudication.viewMatrix.member15FullSilhouette, "partial");
  assert.equal(adjudication.viewMatrix.member40SideOrDepth, "partial");
  assert.equal(adjudication.viewMatrix.member42SideOrDepth, "missing");
  assert.equal(adjudication.memberBinding["15"], "bound-medium");
  assert.equal(adjudication.memberBinding["42"], "bound-medium-high");
  assert.equal(adjudication.heroAuthorization.authorized, false);
  assert.equal(adjudication.heroAuthorization.hardGates.length, 5);
  assert.ok(adjudication.heroAuthorization.forbidden.includes("reuse legacy cross-asset hero"));
  assert.ok(adjudication.heroAuthorization.forbidden.includes("derive identity from massing"));
});
