import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseGlb(bytes) {
  assert.equal(bytes.toString("utf8", 0, 4), "glTF");
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const jsonLength = bytes.readUInt32LE(12);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
  return JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength).trim());
}

test("街区体块保留原始 OSM 来源、确定性高度和完整替换追踪", async () => {
  const [source, build, replacements] = await Promise.all([
    readFile(new URL("../app/scene/xinhua-district-massing-data.json", import.meta.url), "utf8")
      .then(JSON.parse),
    readFile(new URL("../docs/research/build-records/xinhua-district-massing.json", import.meta.url), "utf8")
      .then(JSON.parse),
    readFile(new URL("../app/scene/overview-district-massing-replacements.json", import.meta.url), "utf8")
      .then(JSON.parse),
  ]);
  const rawUrl = new URL(`../docs/research/data/${source.meta.sourceSnapshot}`, import.meta.url);
  const rawBytes = await readFile(rawUrl);

  assert.equal(source.meta.osmRelationId, 13469094);
  assert.equal(source.meta.metersPerSceneUnit, 2.7);
  assert.equal(source.meta.buildingPartsPolicy, "held");
  assert.equal(source.meta.sourceSnapshotSha256, sha256(rawBytes));
  assert.equal(build.source.rawSnapshotSha256, sha256(rawBytes));
  assert.equal(build.source.osmLicence, "ODbL-1.0");
  assert.match(build.source.overpassQuery, /area\(3613469094\)/);
  assert.equal(replacements.entries.length, 17);
  assert.ok(replacements.entries.every((entry) => entry.replacementBoundsVerified));
  assert.ok(source.acceptedBuildings.length > 500, "行政边界内建筑覆盖不足");
  assert.equal(
    source.acceptedBuildings.length
      + source.excludedBuildings.length
      + source.rejectedBuildings.length,
    source.sourceCounts.buildingWays + source.sourceCounts.buildingRelations,
  );
  assert.equal(source.heldBuildingParts.length, source.sourceCounts.buildingParts);
  assert.ok(source.excludedBuildings.every((entry) => (
    entry.reason === "authored-replacement"
    && replacements.entries.some((replacement) => replacement.poiId === entry.replacementPoiId)
  )));

  for (const building of source.acceptedBuildings) {
    assert.ok(["osm-height", "osm-levels", "heuristic"].includes(building.heightSource));
    assert.ok(["low", "mid", "high"].includes(building.heightBand));
    assert.ok(Number.isFinite(building.heightMeters) && building.heightMeters >= 3);
    assert.ok(Number.isFinite(building.heightSceneUnits) && building.heightSceneUnits > 0);
    assert.equal(building.sourceSnapshot, source.meta.sourceSnapshot);
    assert.ok(building.outer.length >= 3);
    assert.ok(building.outer.flat().every(Number.isFinite));
  }
});

test("预编译 GLB 满足移动概览的体积、结构和材质预算", async () => {
  const [build, manifest, glb] = await Promise.all([
    readFile(new URL("../docs/research/build-records/xinhua-district-massing.json", import.meta.url), "utf8")
      .then(JSON.parse),
    readFile(new URL("../app/scene/xinhua-district-massing-runtime.json", import.meta.url), "utf8")
      .then(JSON.parse),
    readFile(new URL("../public/models/overview/xinhua-district-massing.glb", import.meta.url)),
  ]);
  const json = parseGlb(glb);
  const triangleCount = (json.accessors ?? [])
    .filter((accessor) => accessor.type === "SCALAR")
    .reduce((sum, accessor) => sum + accessor.count / 3, 0);

  assert.equal(sha256(glb), build.output.sha256);
  assert.equal(manifest.sha256, build.output.sha256);
  assert.equal(manifest.bytes, glb.length);
  assert.ok(glb.length <= build.budgets.maxBytes);
  assert.ok((json.meshes?.length ?? 0) <= build.budgets.maxMeshes);
  assert.ok((json.materials?.length ?? 0) <= build.budgets.maxMaterials);
  assert.equal(json.images?.length ?? 0, 0);
  assert.equal(json.textures?.length ?? 0, 0);
  assert.ok(triangleCount <= build.budgets.maxTriangles);
  assert.equal(build.output.triangles, triangleCount);
  assert.deepEqual(manifest.modes, ["overview"]);
  assert.equal(manifest.weakNetworkPolicy, "skip");
  assert.equal(manifest.collision, false);
  assert.equal(manifest.castShadow, false);
});

test("同一原始快照离线重放会得到当前 GLB 的相同 SHA", async () => {
  const build = JSON.parse(await readFile(
    new URL("../docs/research/build-records/xinhua-district-massing.json", import.meta.url),
    "utf8",
  ));
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      "scripts/generate_overview_district_massing.mjs",
      "--raw",
      build.source.rawSnapshot,
      "--verify-only",
    ],
    {
      cwd: new URL("../", import.meta.url),
      timeout: 30_000,
    },
  );
  const replay = JSON.parse(stdout);
  assert.equal(replay.deterministicReplay, true);
  assert.equal(replay.sha256, build.output.sha256);
});

test("运行时只在标准网络 overview 中懒加载且失败不阻断原地图", async () => {
  const [world, component, experience] = await Promise.all([
    readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/overview-district-massing.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(world, /lazy\(\s*\(\) => import\("\.\/overview-district-massing"\)/);
  assert.match(world, /mode === "overview" && networkProfile === "standard"/);
  assert.match(world, /get\("district"\) === "off"/);
  assert.match(
    world,
    /<ProgressiveFeatureBoundary[\s\S]*?fallback=\{null\}[\s\S]*?<ProgressiveOverviewDistrictMassing \/>/,
  );
  assert.ok(
    world.indexOf("<XinhuaStreetMap") < world.indexOf("<ProgressiveOverviewDistrictMassing"),
    "街区体块应位于地图基底之后",
  );
  assert.ok(
    world.indexOf("<ProgressiveOverviewDistrictMassing") < world.indexOf("<XingfuliBlock"),
    "街区体块应位于 authored POI 之前",
  );
  assert.match(component, /object\.castShadow = false/);
  assert.match(component, /object\.receiveShadow = false/);
  assert.match(component, /object\.raycast = \(\) => \{\}/);
  assert.doesNotMatch(component, /fetch\(|overpass|nominatim/i);
  assert.match(experience, /全览街区体块为非测绘级近似/);
  assert.match(experience, /\{ready && \(\s*<ProgressiveFeatureBoundary/);
  assert.match(experience, /mode === "intro" && !effectsDisabledForQa/);
});

test("需求文档明确冻结首版范围和本地验收边界", async () => {
  const planUrl = new URL(
    "../docs/research/overview-district-massing-implementation-plan.md",
    import.meta.url,
  );
  const [plan, planStat] = await Promise.all([readFile(planUrl, "utf8"), stat(planUrl)]);
  assert.ok(planStat.size > 8_000);
  assert.match(plan, /Existing overview POIs\/areas \| 17 \| retained/);
  assert.match(plan, /Release boundary: local acceptance only/);
  assert.match(plan, /GLB binary size \| ≤ 3\.0 MB/);
  assert.match(plan, /Weak-network GLB requests \| 0/);
  assert.match(plan, /Same-camera before\/after evidence/);
});
