import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { promisify } from "node:util";
import test from "node:test";
import { auditRoadSetbacks } from "../scripts/generate_overview_district_massing.mjs";
import {
  districtMassingEligibleAtOverviewEntry,
} from "../app/scene/overview-district-massing-policy.ts";

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
  assert.deepEqual(
    auditRoadSetbacks(source.acceptedBuildings),
    [],
    "通用体块不得进入与运行时同宽的公共道路走廊",
  );
  assert.equal(
    build.counts.roadSetbackAdjusted,
    source.acceptedBuildings.filter((entry) => entry.roadSetbackApplied).length,
  );
  assert.equal(
    build.counts.roadSetbackRejected,
    source.rejectedBuildings.filter(
      (entry) => entry.reason === "road-setback-unresolvable",
    ).length,
  );
  assert.ok(source.rejectedBuildings
    .filter((entry) => entry.reason === "road-setback-unresolvable")
    .every((entry) => (
      ["centroid-inside-road-corridor", "below-minimum-retained-scale"]
        .includes(entry.roadSetbackReason)
      && entry.roadSetbackRoads.length > 0
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
  assert.equal(build.runtimeContract.opacity, 0.58);
  assert.ok(json.materials.every((material) => material.alphaMode === "BLEND"));
  assert.ok(json.materials.every((material) => material.doubleSided !== true));
  assert.ok(json.materials.every((material) => (
    material.pbrMetallicRoughness.baseColorFactor[3] === 0.58
  )));

  let roofTriangles = 0;
  let wallTriangles = 0;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const positionAccessor = json.accessors[primitive.attributes.POSITION];
      const normalAccessor = json.accessors[primitive.attributes.NORMAL];
      const indexAccessor = json.accessors[primitive.indices];
      const binaryOffset = 20 + glb.readUInt32LE(12) + 8;
      const positionView = json.bufferViews[positionAccessor.bufferView];
      const normalView = json.bufferViews[normalAccessor.bufferView];
      const indexView = json.bufferViews[indexAccessor.bufferView];
      const positions = new Float32Array(
        glb.buffer,
        glb.byteOffset + binaryOffset + (positionView.byteOffset ?? 0),
        positionAccessor.count * 3,
      );
      const normals = new Float32Array(
        glb.buffer,
        glb.byteOffset + binaryOffset + (normalView.byteOffset ?? 0),
        normalAccessor.count * 3,
      );
      const IndexArray = indexAccessor.componentType === 5125 ? Uint32Array : Uint16Array;
      const indices = new IndexArray(
        glb.buffer,
        glb.byteOffset + binaryOffset + (indexView.byteOffset ?? 0),
        indexAccessor.count,
      );
      for (let index = 0; index < indices.length; index += 3) {
        const ia = indices[index];
        const ib = indices[index + 1];
        const ic = indices[index + 2];
        const isRoof = (
          normals[ia * 3 + 1] > 0.99
          && normals[ib * 3 + 1] > 0.99
          && normals[ic * 3 + 1] > 0.99
        );
        const isWall = (
          Math.abs(normals[ia * 3 + 1]) < 0.01
          && Math.abs(normals[ib * 3 + 1]) < 0.01
          && Math.abs(normals[ic * 3 + 1]) < 0.01
        );
        assert.ok(isRoof || isWall, "体块只应包含朝上的屋顶或竖直墙面");
        const ax = positions[ia * 3];
        const az = positions[ia * 3 + 2];
        const bx = positions[ib * 3];
        const bz = positions[ib * 3 + 2];
        const cx = positions[ic * 3];
        const cy = positions[ic * 3 + 1];
        const cz = positions[ic * 3 + 2];
        const ay = positions[ia * 3 + 1];
        const by = positions[ib * 3 + 1];
        const abx = bx - ax;
        const aby = by - ay;
        const abz = bz - az;
        const acx = cx - ax;
        const acy = cy - ay;
        const acz = cz - az;
        const crossX = aby * acz - abz * acy;
        const crossY = abz * acx - abx * acz;
        const crossZ = abx * acy - aby * acx;
        const windingDotNormal = (
          crossX * normals[ia * 3]
          + crossY * normals[ia * 3 + 1]
          + crossZ * normals[ia * 3 + 2]
        );
        assert.ok(windingDotNormal > 0, "所有可见面绕序必须与导出的法线一致");
        if (isRoof) {
          roofTriangles += 1;
          const windingY = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
          assert.ok(windingY > 0, "屋顶三角面必须朝上，避免背面发黑");
        } else {
          wallTriangles += 1;
        }
      }
    }
  }
  assert.ok(roofTriangles > 500, "必须审计足够数量的实际屋顶三角面");
  assert.ok(wallTriangles > 1_000, "必须审计足够数量的实际墙面三角面");
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

test("弱网只决定全览首次请求，已显示白模不随瞬时网络降级撤回", () => {
  assert.equal(districtMassingEligibleAtOverviewEntry("standard"), true);
  assert.equal(districtMassingEligibleAtOverviewEntry("weak"), false);
});

test("运行时按全览入口网络档位懒加载且失败不阻断原地图", async () => {
  const [world, component, experience] = await Promise.all([
    readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/overview-district-massing.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(world, /lazy\(\s*\(\) => import\("\.\/overview-district-massing"\)/);
  assert.match(world, /function OverviewDistrictMassingGate/);
  assert.match(world, /const \[eligibleAtEntry\] = useState/);
  assert.match(world, /districtMassingEligibleAtOverviewEntry\(networkProfile\)/);
  assert.match(world, /mode === "overview" && !districtDisabledForQa/);
  assert.doesNotMatch(
    world,
    /mode === "overview" && networkProfile === "standard"/,
  );
  assert.doesNotMatch(world, /resetKey=\{`district-massing-\$\{mode\}-\$\{networkProfile\}`\}/);
  assert.match(world, /resetKey="district-massing-overview"/);
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
    world.indexOf("<OverviewDistrictMassingGate") < world.indexOf("<XingfuliBlock"),
    "街区体块应位于 authored POI 之前",
  );
  assert.match(
    world,
    /function OverviewDistrictMassingGate[\s\S]*?<ProgressiveOverviewDistrictMassing \/>/,
  );
  assert.match(component, /object\.castShadow = false/);
  assert.match(component, /object\.receiveShadow = false/);
  assert.match(component, /object\.raycast = \(\) => \{\}/);
  assert.doesNotMatch(component, /fetch\(|overpass|nominatim/i);
  assert.match(experience, /全览街区体块为非测绘级近似/);
  assert.match(experience, /\{ready && \(\s*<ProgressiveFeatureBoundary/);
  assert.match(experience, /mode === "intro" && !effectsDisabledForQa/);
  assert.match(experience, /"xingfu-road": \[139\.4, -98\.5\]/);
  assert.match(experience, /"fahuazhen-road": \[-131, -36\]/);
  assert.match(experience, /"quiet-southwest": \[-250, 130\]/);
  assert.match(experience, /params\.get\("overview-qa"\) !== "1"/);
  assert.doesNotMatch(world, /#c85f4c/);
  assert.match(
    world,
    /\{near && \([\s\S]*?<torusGeometry[\s\S]*?<coneGeometry[\s\S]*?\)\}/,
  );
  assert.match(world, /name=\{`overview-poi-highlight-\$\{poi\.id\}`\}/);
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
