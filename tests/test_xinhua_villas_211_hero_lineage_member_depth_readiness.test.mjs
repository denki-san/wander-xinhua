import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(ROOT, relativePath), "utf8"),
);
const readBytes = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath));
const sha256 = (relativePath) => crypto.createHash("sha256")
  .update(readBytes(relativePath))
  .digest("hex");
const snapshotSha256 = (commit, relativePath) => crypto.createHash("sha256")
  .update(execFileSync("git", ["show", `${commit}:${relativePath}`], {
    cwd: ROOT,
  }))
  .digest("hex");

const readiness = readJson(
  "docs/research/xinhua-villas-211-hero-lineage-member-depth-readiness.json",
);
const binding = readJson("docs/research/xinhua-villas-211-osm-binding.json");
const disposition = readJson(
  "docs/research/xinhua-villas-211-three-tier-final-disposition.json",
);
const mcp = readJson("docs/research/xinhua-villas-211-blender-mcp-gates.json");
const runtime = readJson("docs/research/xinhua-villas-211-threejs-runtime-qa.json");
const buildingOsm = readJson(
  "docs/research/data/xinhua-buildings-osm-20260725-074802.json",
);
const namedOsm = readJson(
  "docs/research/data/xinhua-landmarks-overpass-20260717.json",
);
const district = readJson("app/scene/xinhua-district-massing-data.json");

function parseGlb(relativePath) {
  const buffer = readBytes(relativePath);
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  const jsonLength = buffer.readUInt32LE(12);
  return {
    buffer,
    json: JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim()),
  };
}

function meshBounds(glb, meshIndex) {
  const accessors = glb.meshes[meshIndex].primitives.map(
    (primitive) => glb.accessors[primitive.attributes.POSITION],
  );
  return {
    min: [0, 1, 2].map((axis) => Math.min(
      ...accessors.map((accessor) => accessor.min[axis]),
    )),
    max: [0, 1, 2].map((axis) => Math.max(
      ...accessors.map((accessor) => accessor.max[axis]),
    )),
  };
}

function globalBounds(glb) {
  const accessors = glb.meshes.flatMap((mesh) => mesh.primitives.map(
    (primitive) => glb.accessors[primitive.attributes.POSITION],
  ));
  return {
    min: [0, 1, 2].map((axis) => Math.min(
      ...accessors.map((accessor) => accessor.min[axis]),
    )),
    max: [0, 1, 2].map((axis) => Math.max(
      ...accessors.map((accessor) => accessor.max[axis]),
    )),
  };
}

function boundsContained(inner, outer) {
  return inner.min.every((value, axis) => value >= outer.min[axis])
    && inner.max.every((value, axis) => value <= outer.max[axis]);
}

test("211 Hero 深审锁定已接受 Massing，不重做 MCP1、地图或碰撞", () => {
  for (const source of Object.values(readiness.sources)) {
    const actual = source.path === "app/scene/xinhua-district-massing-data.json"
      ? snapshotSha256(readiness.baselineCommit, source.path)
      : sha256(source.path);
    assert.equal(actual, source.sha256, source.path);
  }
  const frozen = readiness.frozenAcceptedMassing;
  assert.equal(frozen.status, "accepted-massing-only-do-not-reopen");
  assert.equal(sha256(frozen.glb.path), frozen.glb.sha256);
  assert.deepEqual(frozen.placement.position, disposition.tiers.massing.placement.position);
  assert.equal(frozen.placement.yaw, disposition.tiers.massing.placement.yaw);
  assert.equal(frozen.placement.scale, disposition.tiers.massing.placement.scale);
  assert.equal(mcp.mcp1.status, "pass");
  assert.equal(runtime.gates.mcp1, "pass-main-window-batch");
  assert.equal(runtime.gates.runtimeMap, "pass-main-window-real-browser");
  assert.equal(
    runtime.collisionReplay.result,
    "pass-wall-stop-no-penetration",
  );
  assert.equal(frozen.placement.movementAuthorized, false);
});

test("九个 Massing 成员只绑定 footprint，OSM 与 GLB 都没有门牌身份", () => {
  const massing = parseGlb(readiness.frozenAcceptedMassing.glb.path);
  const expectedWays = readiness.frozenAcceptedMassing.memberContract.sourceWayIds;
  assert.deepEqual(expectedWays, binding.members.map((member) => member.sourceWayId));
  assert.equal(massing.json.nodes.length, 9);
  assert.deepEqual(
    massing.json.nodes.map((node) => node.extras.source_way_id),
    expectedWays,
  );
  assert.ok(massing.json.nodes.every(
    (node) => node.extras.house_number === "unknown",
  ));
  for (const member of readiness.memberBindingDepthMatrix) {
    const rawWay = buildingOsm.elements.find(
      (element) => element.id === member.sourceWayId,
    );
    assert.equal(rawWay.tags.building, member.osmBuildingTag);
    assert.equal(rawWay.tags["addr:housenumber"], undefined);
    assert.equal(rawWay.tags["addr:street"], undefined);
    assert.equal(member.houseNumber, "unknown");
    assert.equal(member.heroReady, false);
  }
  const addressMatches = namedOsm.elements.filter((element) => (
    element.tags?.["addr:street"] === "新华路"
    && /^211/.test(element.tags?.["addr:housenumber"] ?? "")
  ));
  assert.equal(namedOsm.research.query.includes("211"), true);
  assert.equal(addressMatches.length, 0);
});

test("replacement inventory 只能支持已接受几何包，不能生成成员身份 lineage", () => {
  const replacement = district.replacementEntries.find(
    (entry) => entry.poiId === "xinhua-villas-211",
  );
  const excludedWays = district.excludedBuildings
    .filter((entry) => entry.replacementPoiId === "xinhua-villas-211")
    .map((entry) => Number(entry.assetId.split("/")[1]));
  assert.equal(replacement.source, "inferred-runtime-placement");
  assert.deepEqual(replacement.osmRefs, []);
  assert.deepEqual(
    excludedWays,
    readiness.frozenAcceptedMassing.memberContract.sourceWayIds,
  );
  assert.equal(
    readiness.frozenAcceptedMassing.memberContract.mapBinding,
    "accepted-compound-footprints-not-member-identity",
  );
});

test("仓内三张照片没有关闭同成员侧后面和 way assignment", () => {
  const references = Object.values(readiness.referenceDepthAudit);
  for (const reference of references) {
    assert.equal(sha256(reference.path), reference.sha256);
  }
  assert.equal(
    readiness.referenceDepthAudit.compoundEntrance.depthCoverage,
    "entrance-axis-only",
  );
  assert.equal(
    readiness.referenceDepthAudit.compoundEntrance.wayAssignment,
    "unknown",
  );
  assert.match(
    readiness.referenceDepthAudit.member211_1.depthCoverage,
    /not-complete-side/,
  );
  assert.equal(
    readiness.referenceDepthAudit.member211_1.rearRoofBackCoverage,
    "missing",
  );
  assert.equal(
    readiness.referenceDepthAudit.member211_1.osmWayAssignment,
    "unknown",
  );
  assert.equal(
    readiness.referenceDepthAudit.member211_2.depthCoverage,
    "partial-oblique-only",
  );
  assert.equal(
    readiness.referenceDepthAudit.member211_2.rearRoofBackCoverage,
    "missing",
  );
  assert.equal(
    readiness.referenceDepthAudit.member211_2.osmWayAssignment,
    "unknown",
  );
});

test("旧 Hero 是四栋合并包，六个 accepted member 超出其包络且无 lineage", () => {
  const massing = parseGlb(readiness.frozenAcceptedMassing.glb.path);
  const legacy = parseGlb(readiness.legacyHeroLineageAudit.glb.path);
  assert.equal(sha256(readiness.legacyHeroLineageAudit.glb.path),
    readiness.legacyHeroLineageAudit.glb.sha256);
  assert.equal(legacy.json.nodes.length, 1);
  assert.deepEqual(
    legacy.json.nodes[0].extras,
    readiness.legacyHeroLineageAudit.nodeExtras,
  );
  for (const field of readiness.legacyHeroLineageAudit.missingRequiredLineageFields) {
    assert.equal(legacy.json.nodes[0].extras[field], undefined);
  }
  const legacyBounds = globalBounds(legacy.json);
  const massingBounds = globalBounds(massing.json);
  assert.deepEqual(legacyBounds, readiness.legacyHeroLineageAudit.localBounds);
  assert.deepEqual(massingBounds, readiness.frozenAcceptedMassing.localBounds);
  const outsideWays = massing.json.nodes
    .filter((node) => !boundsContained(
      meshBounds(massing.json, node.mesh),
      legacyBounds,
    ))
    .map((node) => node.extras.source_way_id);
  assert.deepEqual(
    outsideWays,
    readiness.legacyHeroLineageAudit.massingNodesOutsideLegacyLocalAabb,
  );
  assert.equal(outsideWays.length, 6);

  const generator = fs.readFileSync(
    path.join(ROOT, readiness.sources.legacyGeneratorReadOnly.path),
    "utf8",
  );
  const functionStart = generator.indexOf("def build_xinhua_villas_211()");
  const functionEnd = generator.indexOf("\ndef build_", functionStart + 1);
  const legacyFunction = generator.slice(functionStart, functionEnd);
  const placementLiteral = legacyFunction.match(/placements = \[(.*?)\]\n/s)?.[1] ?? "";
  const placementCount = placementLiteral.match(
    /\(-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?/g,
  )?.length ?? 0;
  assert.equal(placementCount, readiness.legacyHeroLineageAudit.authoredMemberCount);
  assert.equal(placementCount, 4);
  assert.match(legacyFunction, /villas-gate-beam/);
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
});

test("Hero candidate 保持 blocked，不创建二进制也不越权进入 MCP2", () => {
  assert.equal(
    readiness.status,
    "blocked-no-same-member-same-footprint-hero-lineage",
  );
  assert.equal(readiness.lineageGate.sameCompoundMemberSet, false);
  assert.equal(readiness.lineageGate.sameFootprint, false);
  assert.equal(readiness.lineageGate.acceptedMassingShaRecordedByHero, false);
  assert.equal(readiness.lineageGate.memberIdentityPreserved, false);
  assert.equal(readiness.lineageGate.legacyHeroReusable, false);
  assert.equal(readiness.lineageGate.newHeroBuildAuthorized, false);
  assert.equal(readiness.verdict.acceptedMassing, "retain-unchanged");
  assert.equal(
    readiness.verdict.legacyHero,
    "retain-hold-not-mcp2-candidate",
  );
  assert.equal(
    readiness.verdict.newHeroCandidate,
    "not-built-blocked-evidence",
  );
  assert.match(readiness.verdict.mcp2, /reserved-for-main-window/);
  assert.equal(readiness.verdict.formalRuntimeOrRegistryChange, false);
  assert.equal(readiness.verdict.buildingComplete, false);
});
