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
