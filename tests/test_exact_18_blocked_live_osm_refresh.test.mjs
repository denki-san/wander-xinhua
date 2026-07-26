import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const auditUrl = new URL(
  "../docs/research/exact-18-blocked-live-osm-refresh-2026-07-26.json",
  import.meta.url,
);
const snapshotUrl = new URL(
  "../docs/research/data/exact-18-blocked-live-osm-20260726-2126.json",
  import.meta.url,
);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

test("live OSM 刷新严格限制在18栋 blocker 相关 way", async () => {
  const audit = await readJson(auditUrl);
  assert.equal(audit.scope.readOnly, true);
  assert.equal(audit.scope.assetIds.length, 9);
  assert.equal(audit.scope.holdUntouched, true);
  assert.deepEqual(audit.scope.excludedAndUntouched, [
    "trees",
    "decorations",
    "full-map assets",
    "Recovery/Hold",
    "buildings outside the exact 18",
  ]);
});

test("41 个 live way 全部返回且没有父 relation", async () => {
  const audit = await readJson(auditUrl);
  const snapshot = await readJson(snapshotUrl);
  const ways = snapshot.elements.filter(({ type }) => type === "way");
  const relations = snapshot.elements.filter(({ type }) => type === "relation");

  assert.equal(audit.results.requestedWays, 41);
  assert.equal(audit.results.returnedWays, 41);
  assert.equal(ways.length, 41);
  assert.equal(audit.results.parentRelations, 0);
  assert.equal(relations.length, 0);
});

test("live 标签没有越权解除成员、道路宽度或精确锚点门", async () => {
  const audit = await readJson(auditUrl);
  assert.equal(audit.comparison.newRelationMembership, false);
  assert.equal(audit.comparison.newBuildingAddressBinding, false);
  assert.equal(audit.comparison.newRoadWidthOrLanes, false);
  assert.equal(audit.comparison.newCoveredLayerTunnelOrPassageTags, false);
  assert.equal(audit.comparison.newExactAnchorControlPoint, false);
  assert.equal(audit.verdict.mapGateUnlocked, false);
  assert.equal(audit.verdict.placementMutationAuthorized, false);
  assert.equal(audit.verdict.roadWidthMutationAuthorized, false);
  assert.equal(audit.verdict.runtimeRemovalPerformed, false);
});
