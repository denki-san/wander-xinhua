import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildXinhuaStreetDressingPlacements,
  XINHUA_STREET_DRESSING_CONSTRAINTS,
} from "../app/scene/street-dressing-placement.mjs";
import { XINHUA_ROAD_AXIS } from "../app/scene/xinhua-road-placement.mjs";

const root = new URL("../", import.meta.url);

function pointToSegmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(
    1,
    ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz) / lengthSquared,
  ));
  return Math.hypot(
    point[0] - start[0] - ratio * dx,
    point[1] - start[1] - ratio * dz,
  );
}

function distanceToAxis(point) {
  return Math.min(...XINHUA_ROAD_AXIS.slice(1).map((end, index) => (
    pointToSegmentDistance(point, XINHUA_ROAD_AXIS[index], end)
  )));
}

function nearestPointOnAxis(point) {
  let nearest = null;
  for (let index = 1; index < XINHUA_ROAD_AXIS.length; index += 1) {
    const start = XINHUA_ROAD_AXIS[index - 1];
    const end = XINHUA_ROAD_AXIS[index];
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const lengthSquared = dx * dx + dz * dz;
    const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(
      1,
      ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz) / lengthSquared,
    ));
    const candidate = [start[0] + ratio * dx, start[1] + ratio * dz];
    const distance = Math.hypot(point[0] - candidate[0], point[1] - candidate[1]);
    if (!nearest || distance < nearest.distance) nearest = { point: candidate, distance };
  }
  return nearest.point;
}

function pointIntersectsObstacle([x, z], obstacle, radius) {
  return x >= obstacle.minX - radius
    && x <= obstacle.maxX + radius
    && z >= obstacle.minZ - radius
    && z <= obstacle.maxZ + radius;
}

test("道路与默认绿地使用共享小纹理、世界坐标 UV 和顶点色", async () => {
  const source = await readFile(new URL("app/scene/xinhua-map.tsx", root), "utf8");
  assert.match(source, /canvas\.width = 128/);
  assert.match(source, /createSurfaceTexture\("asphalt"\)/);
  assert.match(source, /createSurfaceTexture\("path"\)/);
  assert.match(source, /createSurfaceTexture\("ground"\)/);
  assert.match(source, /applyWorldPlanarUvs/);
  assert.match(source, /applyRoadVertexColors/);
  assert.match(source, /vertexColors/);
  assert.match(source, /minorRoadShoulders/);
  assert.doesNotMatch(source, /Math\.random\(\)/);
});

test("新华路使用黄色短虚线、红色非机动车带与白色连续分隔线", async () => {
  const source = await readFile(new URL("app/scene/xinhua-map.tsx", root), "utf8");
  assert.match(source, /dashLength = 0\.3 \* XINHUA_ENVIRONMENT_SCALE/);
  assert.match(source, /dashGap = 0\.42 \* XINHUA_ENVIRONMENT_SCALE/);
  assert.match(source, /mergeXinhuaRoadLaneMeshes/);
  assert.match(source, /xinhua-road-realistic-lane-treatment/);
  assert.match(source, /color="#8d4c45"/);
  assert.match(source, /color="#d7d4c8"/);
});

test("街具确定性放在新华路 furnishing zone，低配档位会减量", () => {
  const full = buildXinhuaStreetDressingPlacements(false);
  const reduced = buildXinhuaStreetDressingPlacements(true);
  const fullAgain = buildXinhuaStreetDressingPlacements(false);

  assert.deepEqual(full, fullAgain);
  assert.ok(full.lamps.length >= 10);
  assert.ok(full.planters.length >= 4);
  assert.ok(full.bins.length >= 3);
  assert.ok(full.shrubs.length >= 12);
  assert.ok(reduced.lamps.length < full.lamps.length);
  assert.ok(reduced.planters.length < full.planters.length);
  assert.ok(reduced.bins.length < full.bins.length);
  assert.ok(reduced.shrubs.length < full.shrubs.length);

  for (const placement of full.lamps) {
    const distance = distanceToAxis(placement.position);
    assert.ok(distance > 3.15 && distance < 3.3, `路灯偏离 furnishing zone：${distance}`);
  }
  for (const placement of full.planters) {
    const distance = distanceToAxis(placement.position);
    assert.ok(distance > 3.4 && distance < 3.56, `花箱偏离 furnishing zone：${distance}`);
  }
  for (const placement of full.bins) {
    const roadPoint = nearestPointOnAxis(placement.position);
    const outward = [
      placement.position[0] - roadPoint[0],
      placement.position[1] - roadPoint[1],
    ];
    const outwardLength = Math.hypot(...outward);
    const front = [Math.sin(placement.yaw), Math.cos(placement.yaw)];
    const alignment = (
      front[0] * outward[0] + front[1] * outward[1]
    ) / outwardLength;
    assert.ok(alignment > 0.99, `${placement.id} 的分类面板没有朝向人行区域`);
  }
});

test("两档街具都避开建筑、入口出生点与既有梧桐", () => {
  const footprintRadius = {
    lamps: 0.28,
    planters: 0.75,
    bins: 0.45,
    shrubs: 0.9,
  };
  const treeClearance = {
    lamps: 1.8,
    planters: 1.6,
    bins: 1.3,
    shrubs: 1.8,
  };

  for (const lowTier of [false, true]) {
    const placements = buildXinhuaStreetDressingPlacements(lowTier);
    for (const [kind, items] of Object.entries(placements)) {
      for (const placement of items) {
        assert.ok(
          XINHUA_STREET_DRESSING_CONSTRAINTS.entrances.every(
            ([x, z]) => Math.hypot(placement.position[0] - x, placement.position[1] - z) >= 9.2,
          ),
          `${placement.id} 进入地标入口净空`,
        );
        assert.ok(
          XINHUA_STREET_DRESSING_CONSTRAINTS.obstacles.every(
            (obstacle) => !pointIntersectsObstacle(
              placement.position,
              obstacle,
              footprintRadius[kind],
            ),
          ),
          `${placement.id} 进入建筑包络`,
        );
        assert.ok(
          XINHUA_STREET_DRESSING_CONSTRAINTS.treePositions.every(
            ([x, z]) => Math.hypot(placement.position[0] - x, placement.position[1] - z)
              >= treeClearance[kind],
          ),
          `${placement.id} 与既有梧桐重叠`,
        );
      }
    }
  }
});

test("街具复用 InstancedMesh，不为每个重复对象建立独立 draw call", async () => {
  const [mapSource, assetSource, worldSource] = await Promise.all([
    readFile(new URL("app/scene/xinhua-map.tsx", root), "utf8"),
    readFile(new URL("app/scene/shared-street-assets.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-world.tsx", root), "utf8"),
  ]);
  for (const component of [
    "StreetLampInstances",
    "StreetPlanterInstances",
    "StreetBinInstances",
    "StreetShrubInstances",
  ]) {
    assert.match(mapSource, new RegExp(component));
  }
  assert.match(assetSource, /args=\{\[undefined, undefined, placements\.length\]\}/);
  assert.match(worldSource, /showStreetDressing=\{showDetailModels\}/);
  assert.match(mapSource, /lowTier/);
});

test("街具具备集中批量状态，垃圾桶和灌木使用新的共享低模结构", async () => {
  const [mapSource, assetSource] = await Promise.all([
    readFile(new URL("app/scene/xinhua-map.tsx", root), "utf8"),
    readFile(new URL("app/scene/shared-street-assets.tsx", root), "utf8"),
  ]);
  assert.match(mapSource, /XINHUA_STREET_DRESSING_STATE/);
  assert.match(mapSource, /lit: XINHUA_STREET_DRESSING_STATE\.lamps\.lit/);
  assert.match(mapSource, /lightMode="emissive-only"/);
  assert.match(mapSource, /season=\{XINHUA_STREET_DRESSING_STATE\.planters\.season\}/);
  assert.match(mapSource, /condition=\{XINHUA_STREET_DRESSING_STATE\.bins\.condition\}/);

  const binSection = assetSource.slice(
    assetSource.indexOf("export function StreetBinInstances"),
    assetSource.indexOf("function createFacetedShrubGeometry"),
  );
  assert.match(binSection, /shanghai-dual-classification-bin/);
  assert.match(binSection, /boxGeometry args=\{\[0\.82, 0\.82, 0\.4\]\}/);
  assert.match(binSection, /residualPanels/);
  assert.match(binSection, /recyclablePanels/);
  assert.doesNotMatch(binSection, /cylinderGeometry/);

  const shrubSection = assetSource.slice(
    assetSource.indexOf("function createFacetedShrubGeometry"),
    assetSource.indexOf("export function IrregularStoneBollard"),
  );
  assert.match(shrubSection, /new IcosahedronGeometry\(1, 0\)/);
  assert.match(shrubSection, /mergeGeometries\(geometries, false\)/);
  assert.match(shrubSection, /toNonIndexed\(\)/);
  assert.match(shrubSection, /computeVertexNormals\(\)/);
  assert.match(shrubSection, /three-lobe-faceted-low-poly/);
});

test("运行时验收深链使用地标 query 而不是内部 id", async () => {
  const [landmarkSource, brief] = await Promise.all([
    readFile(new URL("app/scene/xinhua-road-landmarks-data.json", root), "utf8"),
    readFile(new URL("docs/research/street-surface-refinement-model-brief.md", root), "utf8"),
  ]);
  const landmarkData = JSON.parse(landmarkSource);
  assert.equal(
    landmarkData.landmarks.find(({ id }) => id === "shanghai-cinema")?.query,
    "cinema",
  );
  assert.equal(
    landmarkData.landmarks.find(({ id }) => id === "film-art-center")?.query,
    "film-art",
  );
  assert.match(brief, /\/\?start=cinema/);
  assert.match(brief, /\/\?start=film-art/);
});
