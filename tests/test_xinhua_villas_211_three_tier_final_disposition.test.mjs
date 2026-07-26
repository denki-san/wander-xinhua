import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const dispositionPath = "docs/research/xinhua-villas-211-three-tier-final-disposition.json";

async function json(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(new URL(relativePath, root)))
    .digest("hex");
}

test("211三档 final disposition 锁定输入与可复用 Massing", async () => {
  const [disposition, audit, mcp, runtime, record] = await Promise.all([
    json(dispositionPath),
    json("docs/research/xinhua-villas-211-final-gap-audit.json"),
    json("docs/research/xinhua-villas-211-blender-mcp-gates.json"),
    json("docs/research/xinhua-villas-211-threejs-runtime-qa.json"),
    json("docs/research/build-records/tiers/xinhua-road/massing-v3/xinhua-villas-211-massing.json"),
  ]);

  for (const source of Object.values(disposition.sources)) {
    assert.equal(await sha256(source.path), source.sha256, source.path);
  }
  const massing = disposition.tiers.massing;
  assert.equal(massing.reuse, "allowed-as-massing-only");
  assert.equal(await sha256(massing.glb.path), massing.glb.sha256);
  assert.equal(await sha256(massing.blend.path), massing.blend.sha256);
  assert.equal(massing.glb.sha256, audit.massing.glb.sha256);
  assert.equal(massing.glb.sha256, mcp.source.glbSha256);
  assert.equal(massing.glb.sha256, runtime.asset.sha256);
  assert.equal(massing.glb.sha256, record.glb.sha256);
  assert.deepEqual(massing.placement.position, runtime.placement.position);
  assert.equal(massing.placement.yaw, runtime.placement.yaw);
  assert.equal(massing.placement.scale, runtime.placement.scale);
  assert.equal(massing.mcp1, "pass-main-window-batch");
  assert.equal(massing.mapRuntime, "pass-main-window-real-browser");
  assert.equal(massing.collision.wallStop, "pass-wall-stop-no-penetration");
});

test("211旧 Hero 严格无效，Identity 不存在且禁止由 Massing 冒充", async () => {
  const disposition = await json(dispositionPath);
  const { legacyHero, identity } = disposition.tiers;

  assert.equal(legacyHero.reuse, "prohibited-as-mcp2-source");
  assert.equal(await sha256(legacyHero.glb.path), legacyHero.glb.sha256);
  assert.equal(await sha256(legacyHero.blend.path), legacyHero.blend.sha256);
  assert.ok(legacyHero.strictlyInvalidBecause.includes("unverified-four-villa-fixed-layout"));
  assert.ok(legacyHero.strictlyInvalidBecause.some((item) => item.includes("outside-scope")));
  assert.equal(identity.artifactPresent, false);
  assert.equal(identity.status, "blocked-lineage-and-evidence");
  assert.equal(identity.massingMasqueradeProhibited, true);
  assert.equal(disposition.verdict.buildingComplete, false);
  assert.ok(disposition.verdict.forbidden.includes("derive-identity-from-massing"));
});
