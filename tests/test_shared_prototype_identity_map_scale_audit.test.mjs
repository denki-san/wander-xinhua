import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

test("共享 Identity 地图尺度审计覆盖 72 个实例且不提前放行", async () => {
  const audit = await readJson(
    "docs/research/shared-prototypes-identity-map-scale-audit.json",
  );
  assert.equal(audit.scope.prototypeCount, 8);
  assert.equal(audit.scope.instanceCount, 72);
  assert.equal(audit.scope.xinhuaRoadPlaneTrees, 28);
  assert.equal(audit.scope.xingfuliPlaneTrees, 3);
  assert.equal(audit.scope.xinhuaRoadStreetFurniture, 19);
  assert.equal(audit.scope.xingfuliStreetFurniture, 22);
  assert.equal(audit.decisions.runtimePlacementsChanged, 0);
  assert.equal(audit.decisions.identityPromotedToProductionMap, 0);
  assert.equal(audit.decisions.mapScalePassCount, 0);
  assert.equal(audit.decisions.yawPassCount, 0);
  assert.equal(audit.decisions.collisionAndPassagePassCount, 0);
  assert.equal(audit.decisions.formalIdentityPassCount, 0);
  assert.equal(audit.assets.length, 8);
  assert.equal(
    audit.assets.every(
      ({ transformAudit }) => transformAudit.mapScaleGate === "blocked",
    ),
    true,
  );
});

test("共享 Identity 地图尺度审计可由当前二进制与实例台账复算", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/test_generate_shared_prototype_identity_map_scale_audit.mjs"],
    {
      cwd: new URL(".", root),
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /72 instances, formal map pass 0/);
});
