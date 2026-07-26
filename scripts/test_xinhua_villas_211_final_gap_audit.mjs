import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function bytes(relativePath) {
  return readFile(path.join(root, relativePath));
}

async function json(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256").update(await bytes(relativePath)).digest("hex");
}

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim());
}

function triangleCount(glb) {
  return (glb.meshes ?? []).reduce(
    (sum, mesh) => sum + mesh.primitives.reduce((meshSum, primitive) => {
      const accessor = glb.accessors[primitive.indices ?? primitive.attributes.POSITION];
      return meshSum + accessor.count / 3;
    }, 0),
    0,
  );
}

export async function auditXinhuaVillas211FinalGap() {
  const [audit, manifest, gates, runtimeQa, massingRecord, generator] =
    await Promise.all([
      json("docs/research/xinhua-villas-211-final-gap-audit.json"),
      json("docs/research/xinhua-villas-211-reference-manifest.json"),
      json("docs/research/xinhua-villas-211-blender-mcp-gates.json"),
      json("docs/research/xinhua-villas-211-threejs-runtime-qa.json"),
      json(
        "docs/research/build-records/tiers/xinhua-road/massing-v3/xinhua-villas-211-massing.json",
      ),
      readFile(path.join(root, "scripts/create_xinhua_road_models.py"), "utf8"),
    ]);

  assert.equal(audit.assetId, "xinhua-villas-211");
  assert.equal(audit.status, "massing-complete-hero-identity-blocked-evidence");
  assert.equal(audit.scope.sharedFilesModified, false);
  assert.equal(audit.scope.blenderRerun, false);
  assert.equal(audit.scope.browserRerun, false);
  assert.equal(manifest.subject.stableBoundary, audit.scope.stableBoundary);
  assert.equal(
    manifest.canonicalComparison.meaning,
    "compound entrance front, not a member-building facade",
  );

  for (const reference of [
    audit.evidence.canonical,
    audit.evidence.member211_1,
    audit.evidence.member211_2,
  ]) {
    assert.equal(await sha256(reference.path), reference.sha256);
  }
  assert.equal(manifest.coverageMatrix.compoundSideOrDepth, "missing");
  assert.equal(manifest.coverageMatrix.member211_1Placement, "missing");
  assert.equal(manifest.coverageMatrix.member211_2Placement, "missing");

  const heroBuffer = await bytes(audit.legacyHero.glb.path);
  const hero = parseGlb(heroBuffer);
  assert.equal(await sha256(audit.legacyHero.glb.path), audit.legacyHero.glb.sha256);
  assert.equal(await sha256(audit.legacyHero.blend.path), audit.legacyHero.blend.sha256);
  assert.equal(heroBuffer.length, audit.legacyHero.glb.bytes);
  assert.equal(hero.nodes.length, audit.legacyHero.glb.nodes);
  assert.equal(hero.meshes.length, audit.legacyHero.glb.meshes);
  assert.equal(hero.materials.length, audit.legacyHero.glb.materials);
  assert.equal(hero.images?.length ?? 0, 0);
  assert.equal(audit.legacyHero.status, "hold-not-mcp2-candidate");
  assert.equal(audit.legacyHero.mcp2, "not-entered");

  const functionStart = generator.indexOf("def build_xinhua_villas_211()");
  const functionEnd = generator.indexOf("\ndef build_", functionStart + 1);
  const legacyFunction = generator.slice(functionStart, functionEnd);
  for (const marker of [
    "villas-hedge-",
    "villas-lamp-",
    "villas-garden-tree-",
    "villas-planter-left",
    "villas-bench",
    "villas-entry-grid",
  ]) {
    assert.match(legacyFunction, new RegExp(marker));
  }

  const massingBuffer = await bytes(audit.massing.glb.path);
  const massing = parseGlb(massingBuffer);
  assert.equal(await sha256(audit.massing.glb.path), audit.massing.glb.sha256);
  assert.equal(await sha256(audit.massing.blend.path), audit.massing.blend.sha256);
  assert.equal(massingBuffer.length, audit.massing.glb.bytes);
  assert.equal(massing.nodes.length, audit.massing.glb.nodes);
  assert.equal(massing.meshes.length, audit.massing.glb.meshes);
  assert.equal(massing.materials.length, audit.massing.glb.materials);
  assert.equal(massing.images?.length ?? 0, 0);
  assert.equal(triangleCount(massing), audit.massing.glb.triangles);
  assert.equal(massingRecord.glb.sha256, audit.massing.glb.sha256);
  assert.equal(massingRecord.children.length, 9);

  assert.equal(gates.mcp1.status, "pass");
  assert.equal(runtimeQa.status, "massing-runtime-map-pass-hero-identity-blocked");
  assert.equal(runtimeQa.gates.mcp1, "pass-main-window-batch");
  assert.equal(runtimeQa.gates.runtimeMap, "pass-main-window-real-browser");
  assert.equal(runtimeQa.gates.hero, "blocked-evidence");
  assert.equal(runtimeQa.gates.identity, "blocked-evidence");
  assert.equal(runtimeQa.map.polygonOverlapCount, 0);
  assert.equal(runtimeQa.map.localObstacleAabbOverlapCount, 0);
  assert.equal(
    runtimeQa.collisionReplay.result,
    audit.massing.map.collision,
  );
  assert.equal(
    massingRecord.mapCalibration.minimumAsphaltEdgeClearanceSceneUnits,
    audit.massing.map.minimumAsphaltEdgeClearance,
  );
  assert.equal(
    massingRecord.mapCalibration.entranceGap.clearanceSceneUnits,
    audit.massing.map.entranceGap,
  );

  assert.equal(audit.identity.status, "not-created-blocked-lineage");
  assert.equal(audit.identity.massingMasqueradeProhibited, true);
  assert.equal(audit.gates.mcp2Hero, "not-entered");
  assert.equal(audit.gates.mcp3, "not-entered");
  assert.equal(audit.gates.buildingComplete, false);

  return {
    assetId: audit.assetId,
    status: audit.status,
    massing: audit.massing.status,
    mcp1: audit.gates.mcp1Massing,
    mapRuntime: audit.gates.mapRuntimeMassing,
    hero: audit.gates.heroEvidence,
    mcp2: audit.gates.mcp2Hero,
    identity: audit.gates.identityLineage,
    buildingComplete: audit.gates.buildingComplete,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await auditXinhuaVillas211FinalGap();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
