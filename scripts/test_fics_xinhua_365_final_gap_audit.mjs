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

export async function auditFicsXinhua365FinalGap() {
  const [audit, manifest, recovery, mcp, runtime, record, heroGenerator] =
    await Promise.all([
      json("docs/research/fics-xinhua-365-final-gap-audit.json"),
      json("docs/research/poi-reference-manifest.json"),
      json("docs/research/fics-xinhua-365-recovery-map-audit.json"),
      json("docs/research/fics-xinhua-365-blender-mcp-gates.json"),
      json("docs/research/fics-xinhua-365-threejs-runtime-qa.json"),
      json(
        "docs/research/build-records/tiers/xinhua-road/massing-v2/fics-xinhua-365-massing.json",
      ),
      readFile(path.join(root, "scripts/create_requested_poi_models.py"), "utf8"),
    ]);

  assert.equal(audit.assetId, "fics-xinhua-365");
  assert.equal(
    audit.status,
    "massing-mcp1-diagnostic-pass-membership-service-road-hero-identity-blocked",
  );
  assert.equal(audit.scope.browserOpened, false);
  assert.equal(audit.scope.blenderRerun, false);
  assert.equal(audit.scope.sharedFilesModified, false);

  const manifestEntry = manifest.pois.find(({ id }) => id === audit.assetId);
  assert.ok(manifestEntry);
  assert.equal(manifestEntry.photoStatus, "verified-same-compound");
  for (const reference of audit.evidence.references) {
    assert.equal(await sha256(reference.path), reference.sha256);
  }

  const massingBuffer = await bytes(audit.massing.glb.path);
  const massing = parseGlb(massingBuffer);
  assert.equal(await sha256(audit.massing.blend.path), audit.massing.blend.sha256);
  assert.equal(await sha256(audit.massing.glb.path), audit.massing.glb.sha256);
  assert.equal(massingBuffer.length, audit.massing.glb.bytes);
  assert.equal(massing.nodes.length, audit.massing.glb.nodes);
  assert.equal(massing.meshes.length, audit.massing.glb.meshes);
  assert.equal(massing.materials.length, audit.massing.glb.materials);
  assert.equal(massing.images?.length ?? 0, 0);
  assert.equal(triangleCount(massing), audit.massing.glb.triangles);
  assert.equal(record.glb.sha256, audit.massing.glb.sha256);
  assert.equal(mcp.source.glbSha256, audit.massing.glb.sha256);
  assert.equal(mcp.mcp1.status, "pass-shape-only");
  assert.deepEqual(
    record.children.map(({ sourceWayId }) => sourceWayId),
    audit.massing.candidateWayIds,
  );

  assert.equal(
    recovery.mapCalibration.roads.xinhuaRoad.asphaltClearanceSceneUnits,
    audit.map.xinhuaRoad.asphaltClearance,
  );
  assert.equal(
    recovery.mapCalibration.roads.campusServiceRoad.osmWayId,
    audit.map.campusServiceRoad.osmWayId,
  );
  assert.equal(
    recovery.mapCalibration.roads.campusServiceRoad.candidateWayId,
    audit.map.campusServiceRoad.candidateWayId,
  );
  assert.equal(
    recovery.mapCalibration.roads.campusServiceRoad.asphaltClearanceSceneUnits,
    audit.map.campusServiceRoad.asphaltClearance,
  );
  assert.ok(audit.map.campusServiceRoad.asphaltClearance < 0);
  assert.equal(recovery.gates.evidence, "blocked-member-binding");
  assert.equal(recovery.gates.massingMapAcceptance, "blocked");

  assert.equal(runtime.resource.sha256, audit.massing.glb.sha256);
  assert.equal(runtime.acceptance.resource, "pass");
  assert.equal(runtime.acceptance.collisionDiagnostic, "pass");
  assert.equal(runtime.acceptance.performanceSample, "pass-measured");
  assert.equal(runtime.acceptance.formalMembership, "blocked-evidence");
  assert.equal(runtime.acceptance.serviceRoad, "blocked-overlap");
  assert.equal(runtime.acceptance.runtimePromotionAllowed, false);

  const heroBuffer = await bytes(audit.legacyHero.glb.path);
  const hero = parseGlb(heroBuffer);
  assert.equal(await sha256(audit.legacyHero.glb.path), audit.legacyHero.glb.sha256);
  assert.equal(await sha256(audit.legacyHero.blend.path), audit.legacyHero.blend.sha256);
  assert.equal(
    await sha256(audit.legacyHero.generator.path),
    audit.legacyHero.generator.sha256,
  );
  assert.equal(heroBuffer.length, audit.legacyHero.glb.bytes);
  assert.equal(hero.nodes.length, audit.legacyHero.glb.nodes);
  assert.equal(hero.meshes.length, audit.legacyHero.glb.meshes);
  assert.equal(hero.materials.length, audit.legacyHero.glb.materials);
  assert.equal(hero.images?.length ?? 0, 0);

  const functionStart = heroGenerator.indexOf("def build_fics_xinhua_365()");
  const functionEnd = heroGenerator.indexOf("\n\nBUILDERS:", functionStart);
  const heroFunction = heroGenerator.slice(functionStart, functionEnd);
  for (const marker of [
    "base.build_xinhua_mansion()",
    "fics-origin-pad",
    "fics-main",
    "fics-red-building",
    "fics-industrial-wing",
    "fics-central-square",
    "fics-square-detail",
    "fics-tree-",
    "fics-bench-a",
  ]) {
    assert.match(heroFunction, new RegExp(marker.replace(/[().]/g, "\\$&")));
  }

  assert.equal(audit.strictLineage.formalMassingMembership, false);
  assert.equal(audit.strictLineage.serviceRoadResolved, false);
  assert.equal(audit.strictLineage.heroDerivedFromCurrentMassing, false);
  assert.equal(audit.strictLineage.identityDerivationAuthorized, false);
  assert.equal(audit.legacyHero.status, "hold-not-mcp2-candidate");
  assert.equal(audit.gates.mcp2Hero, "not-entered");
  assert.equal(audit.identity.status, "not-created");
  assert.equal(audit.gates.mcp3, "not-entered");

  return {
    assetId: audit.assetId,
    status: audit.status,
    membership: audit.gates.formalMemberBinding,
    mcp1: audit.gates.mcp1Massing,
    diagnostic: audit.gates.threeDiagnostic,
    serviceRoad: audit.gates.serviceRoad,
    map: audit.gates.formalMapAcceptance,
    hero: audit.gates.heroCandidate,
    mcp2: audit.gates.mcp2Hero,
    identity: audit.gates.identity,
    buildingComplete: audit.gates.buildingComplete,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(
    `${JSON.stringify(await auditFicsXinhua365FinalGap(), null, 2)}\n`,
  );
}
