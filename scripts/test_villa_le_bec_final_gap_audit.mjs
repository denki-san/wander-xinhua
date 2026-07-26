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

export async function auditVillaLeBecFinalGap() {
  const [audit, manifest, mapGate, record, legacyGenerator] = await Promise.all([
    json("docs/research/villa-le-bec-final-gap-audit.json"),
    json("docs/research/villa-le-bec-reference-manifest.json"),
    json("docs/research/villa-le-bec-massing-map-gate.json"),
    json(
      "docs/research/build-records/tiers/xinhua-road/massing-v2/villa-le-bec-massing.json",
    ),
    readFile(path.join(root, "scripts/create_xinhua_road_models.py"), "utf8"),
  ]);

  assert.equal(audit.assetId, "villa-le-bec");
  assert.equal(audit.status, "massing-mcp1-pass-map-and-hero-lineage-blocked");
  assert.equal(audit.scope.browserOpened, false);
  assert.equal(audit.scope.blenderRerun, false);
  assert.equal(audit.scope.sharedFilesModified, false);
  assert.equal(manifest.subject.id, audit.assetId);
  assert.equal(manifest.canonicalComparison.localPath, audit.evidence.canonical);
  assert.equal(manifest.coverageMatrix.streetFront, "supported-xhs-01");
  assert.equal(manifest.coverageMatrix.sideDepth, "supported-xhs-02");
  assert.equal(manifest.coverageMatrix.formerGarageRelationship, "unknown-not-modeled-as-confirmed");
  for (const selected of manifest.xhsEvidence.selectedMedia) {
    assert.equal(await sha256(selected.localPath), selected.sha256);
  }

  const massingBuffer = await bytes(audit.massing.glb.path);
  const massing = parseGlb(massingBuffer);
  assert.equal(await sha256(audit.massing.generator.path), audit.massing.generator.sha256);
  assert.equal(await sha256(audit.massing.blend.path), audit.massing.blend.sha256);
  assert.equal(await sha256(audit.massing.glb.path), audit.massing.glb.sha256);
  assert.equal(massingBuffer.length, audit.massing.glb.bytes);
  assert.equal(massing.nodes.length, audit.massing.glb.nodes);
  assert.equal(massing.meshes.length, audit.massing.glb.meshes);
  assert.equal(massing.materials.length, audit.massing.glb.materials);
  assert.equal(massing.images?.length ?? 0, 0);
  assert.equal(triangleCount(massing), audit.massing.glb.triangles);
  assert.equal(record.glb.sha256, audit.massing.glb.sha256);
  assert.equal(record.mcp1.status, audit.massing.mcp1);
  assert.equal(mapGate.massingGate.mcp1, audit.massing.mcp1);

  assert.equal(mapGate.verdict.mapAcceptance, "blocked");
  assert.equal(mapGate.verdict.heroOrIdentityAuthorized, false);
  assert.equal(
    mapGate.mapCalibrationCandidate.mapBlocker.nearestEnvelopeToAsphaltEdgeSceneUnits,
    audit.map.road.nearestEnvelopeToAsphaltEdge,
  );
  assert.equal(
    mapGate.mapCalibrationCandidate.mapBlocker.house315IntersectionCount,
    audit.map.neighbor.intersectionCount,
  );

  const heroBuffer = await bytes(audit.legacyHero.glb.path);
  const hero = parseGlb(heroBuffer);
  assert.equal(await sha256(audit.legacyHero.glb.path), audit.legacyHero.glb.sha256);
  assert.equal(await sha256(audit.legacyHero.blend.path), audit.legacyHero.blend.sha256);
  assert.equal(heroBuffer.length, audit.legacyHero.glb.bytes);
  assert.equal(hero.nodes.length, audit.legacyHero.glb.nodes);
  assert.equal(hero.meshes.length, audit.legacyHero.glb.meshes);
  assert.equal(hero.materials.length, audit.legacyHero.glb.materials);
  assert.equal(hero.images?.length ?? 0, 0);

  const functionStart = legacyGenerator.indexOf("def build_villa_le_bec()");
  const functionEnd = legacyGenerator.indexOf("\ndef ", functionStart + 1);
  const legacyFunction = legacyGenerator.slice(functionStart, functionEnd);
  for (const marker of [
    "lebec-patio",
    "lebec-name",
    "lebec-cafe-",
    "lebec-green-",
    "lebec-string-wire",
    "lebec-planter-left",
    "lebec-wine-barrel-",
    "lebec-fence-left",
    "lebec-paving-detail",
  ]) {
    assert.match(legacyFunction, new RegExp(marker));
  }

  assert.equal(audit.strictLineage.heroDerivedFromCurrentMassing, false);
  assert.equal(audit.strictLineage.heroSubjectMatchesCurrentTwoBuildingBoundary, false);
  assert.equal(audit.strictLineage.mapGatePassed, false);
  assert.equal(audit.strictLineage.identityDerivationAuthorized, false);
  assert.equal(audit.legacyHero.status, "hold-not-mcp2-candidate");
  assert.equal(audit.gates.mcp2Hero, "not-entered");
  assert.equal(audit.identity.status, "not-created");
  assert.equal(audit.gates.mcp3, "not-entered");

  return {
    assetId: audit.assetId,
    status: audit.status,
    mcp1: audit.gates.mcp1Massing,
    map: audit.gates.mapAcceptance,
    heroCandidate: audit.gates.heroCandidate,
    mcp2: audit.gates.mcp2Hero,
    identity: audit.gates.identity,
    mcp3: audit.gates.mcp3,
    buildingComplete: audit.gates.buildingComplete,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${JSON.stringify(await auditVillaLeBecFinalGap(), null, 2)}\n`);
}
