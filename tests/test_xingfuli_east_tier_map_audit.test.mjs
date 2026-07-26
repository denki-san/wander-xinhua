import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  XINGFULI_BUILDING_OBSTACLES,
  XINGFULI_OBSTACLES,
  XINGFULI_QA_PATHS,
  XINGFULI_QA_PLAYER_RADIUS_WORLD,
} from "../app/scene/xingfuli-collision.ts";
import {
  isPlanarPositionBlockedInPolygon,
  transformMapObstacle,
  transformMapPoint,
} from "../app/scene/world-math.ts";

const root = new URL("../", import.meta.url);
const auditPath = new URL(
  "docs/research/xingfuli-east-tier-map-audit.json",
  root,
);

async function sha256(path) {
  const bytes = await readFile(new URL(path, root));
  return createHash("sha256").update(bytes).digest("hex");
}

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
}

function glbMetrics(buffer, data) {
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  let triangles = 0;
  for (const mesh of data.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      const position = data.accessors[primitive.attributes.POSITION];
      const indices = primitive.indices === undefined
        ? position
        : data.accessors[primitive.indices];
      triangles += indices.count / 3;
      for (let axis = 0; axis < 3; axis += 1) {
        bounds.min[axis] = Math.min(bounds.min[axis], position.min[axis]);
        bounds.max[axis] = Math.max(bounds.max[axis], position.max[axis]);
      }
    }
  }
  return {
    bytes: buffer.length,
    nodes: data.nodes?.length ?? 0,
    meshes: data.meshes?.length ?? 0,
    triangles,
    materials: data.materials?.length ?? 0,
    images: data.images?.length ?? 0,
    textures: data.textures?.length ?? 0,
    bounds,
  };
}

function pathLength(points) {
  return points.slice(1).reduce((total, point, index) => (
    total + Math.hypot(point[0] - points[index][0], point[1] - points[index][1])
  ), 0);
}

function midpointAndDirection(points) {
  const total = pathLength(points);
  let walked = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
    if (walked + length >= total / 2) {
      const ratio = (total / 2 - walked) / length;
      return {
        point: [
          start[0] + (end[0] - start[0]) * ratio,
          start[1] + (end[1] - start[1]) * ratio,
        ],
        direction: [end[0] - start[0], end[1] - start[1]],
      };
    }
    walked += length;
  }
  throw new Error("OSM 路径不足以计算中点");
}

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

function orientation(start, end, point) {
  return (end[0] - start[0]) * (point[1] - start[1])
    - (end[1] - start[1]) * (point[0] - start[0]);
}

function onSegment(start, end, point) {
  return point[0] >= Math.min(start[0], end[0]) - 1e-9
    && point[0] <= Math.max(start[0], end[0]) + 1e-9
    && point[1] >= Math.min(start[1], end[1]) - 1e-9
    && point[1] <= Math.max(start[1], end[1]) + 1e-9;
}

function segmentsIntersect(a, b, c, d) {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  if (abC * abD < 0 && cdA * cdB < 0) return true;
  return (Math.abs(abC) < 1e-9 && onSegment(a, b, c))
    || (Math.abs(abD) < 1e-9 && onSegment(a, b, d))
    || (Math.abs(cdA) < 1e-9 && onSegment(c, d, a))
    || (Math.abs(cdB) < 1e-9 && onSegment(c, d, b));
}

function segmentDistance(a, b, c, d) {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(
    pointToSegmentDistance(a, c, d),
    pointToSegmentDistance(b, c, d),
    pointToSegmentDistance(c, a, b),
    pointToSegmentDistance(d, a, b),
  );
}

function polygonEdges(points) {
  return points.map((point, index) => [point, points[(index + 1) % points.length]]);
}

function polygonToSegmentsDistance(polygon, segments) {
  return Math.min(...polygonEdges(polygon).flatMap(([start, end]) => (
    segments.map(([roadStart, roadEnd]) => (
      segmentDistance(start, end, roadStart, roadEnd)
    ))
  )));
}

test("xingfuli-east 三档 GLB、Blend、build record 与保留 SHA 一致", async () => {
  const audit = JSON.parse(await readFile(auditPath, "utf8"));
  for (const [tierName, tier] of Object.entries(audit.tiers)) {
    if (tierName === "recoveryComparison") continue;
    const buffer = await readFile(new URL(tier.glb, root));
    const data = parseGlb(buffer);
    assert.equal(await sha256(tier.glb), tier.glbSha256);
    assert.equal(await sha256(tier.blend), tier.blendSha256);
    assert.deepEqual(glbMetrics(buffer, data), tier.metrics);
    assert.equal(data.nodes[0].extras.segment, "east");
    assert.equal(
      data.nodes[0].extras.stage,
      tierName === "hero" ? "final" : tierName,
    );
    assert.equal(data.nodes[0].extras.reference_photos_embedded, false);
    const record = JSON.parse(await readFile(new URL(tier.buildRecord, root), "utf8"));
    const output = record.outputs.segments.find(({ id }) => id === "east");
    assert.equal(output.sha256, tier.glbSha256);
  }
  assert.equal(
    await sha256(audit.preflight.generator.path),
    audit.preflight.generator.sha256,
  );
  assert.equal(audit.lineageGate.status, "blocked");
  assert.equal(audit.scope.rebuiltAssets, false);
});

test("xingfuli-east 九张证据均在仓库内且 SHA 与 manifest 一致", async () => {
  const audit = JSON.parse(await readFile(auditPath, "utf8"));
  const manifest = JSON.parse(await readFile(
    new URL(audit.evidence.manifest.path, root),
    "utf8",
  ));
  assert.equal(await sha256(audit.evidence.manifest.path), audit.evidence.manifest.sha256);
  assert.equal(await sha256(audit.evidence.brief.path), audit.evidence.brief.sha256);
  assert.equal(manifest.references.length, audit.evidence.manifest.localReferences);
  assert.deepEqual(
    manifest.coverageMatrix.map(({ slot }) => slot),
    audit.evidence.manifest.coverage,
  );
  for (const reference of manifest.references) {
    assert.equal(await sha256(reference.path), reference.sha256);
    assert.equal(reference.usage, "research-only");
  }
  assert.equal(audit.evidence.unknown.includes("east 单栋精确 footprint、背立面、屋顶机电、施工图尺寸和 2026 租户状态。"), true);
});

test("xingfuli-east OSM 锚点与运行时非均匀变换可独立复算", async () => {
  const [audit, map, raw, boundary] = await Promise.all([
    readFile(auditPath, "utf8").then(JSON.parse),
    readFile(new URL("app/scene/xinhua-map-data.json", root), "utf8").then(JSON.parse),
    readFile(
      new URL("docs/research/data/xinhua-roads-osm-20260716-080509.json", root),
      "utf8",
    ).then(JSON.parse),
    readFile(
      new URL("docs/research/data/xinhua-boundary-osm-20260716-080509.json", root),
      "utf8",
    ).then(JSON.parse),
  ]);
  const way = raw.elements.find(({ id }) => id === audit.mapCalibration.osm.wayId);
  assert.equal(way.tags.highway, "pedestrian");
  assert.equal(way.geometry.length, audit.mapCalibration.osm.geometryPoints);
  const relation = boundary.find(({ osm_id: osmId }) => osmId === map.meta.osmRelationId);
  const [south, north, west, east] = relation.boundingbox.map(Number);
  const centerLat = (south + north) / 2;
  const centerLon = (west + east) / 2;
  const metersPerLonDegree = 111_320 * Math.cos(centerLat * Math.PI / 180);
  const projected = way.geometry.map(({ lon, lat }) => [
    (lon - centerLon) * metersPerLonDegree / map.meta.metersPerSceneUnit,
    -(lat - centerLat) * 110_540 / map.meta.metersPerSceneUnit,
  ]);
  const anchor = midpointAndDirection(projected);
  const placement = map.landmarks.xingfuli;
  assert.ok(Math.hypot(
    placement.position[0] - anchor.point[0],
    placement.position[1] - anchor.point[1],
  ) < 0.0001);
  assert.ok(Math.abs(
    placement.rotationY - -Math.atan2(anchor.direction[1], anchor.direction[0]),
  ) < 0.000001);
  assert.ok(Math.abs(
    pathLength(projected) * map.meta.metersPerSceneUnit - placement.lengthMeters,
  ) < 0.06);

  const clearance = 4.1;
  const axis = [Math.cos(placement.rotationY), -Math.sin(placement.rotationY)];
  const position = [
    placement.position[0] - axis[0] * clearance / 2,
    placement.position[1] - axis[1] * clearance / 2,
  ];
  const longitudinalScale = placement.horizontalScale - clearance / 94;
  assert.deepEqual(position, audit.mapCalibration.placement.adjustedRuntimePosition);
  assert.equal(longitudinalScale, audit.mapCalibration.placement.longitudinalScale);
  assert.deepEqual(
    transformMapPoint(
      47,
      placement.localLaneCenterZ,
      position,
      placement.rotationY,
      placement.horizontalScale,
      placement.localLaneCenterZ,
      longitudinalScale,
    ),
    audit.mapCalibration.placement.eastEndWorld,
  );
});

test("xingfuli-east 番禺路冲突保持显式 blocked，不以任意位移掩盖", async () => {
  const [audit, map, layout] = await Promise.all([
    readFile(auditPath, "utf8").then(JSON.parse),
    readFile(new URL("app/scene/xinhua-map-data.json", root), "utf8").then(JSON.parse),
    readFile(new URL("app/scene/xingfuli-layout.json", root), "utf8").then(JSON.parse),
  ]);
  const placement = map.landmarks.xingfuli;
  const clearance = 4.1;
  const axis = [Math.cos(placement.rotationY), -Math.sin(placement.rotationY)];
  const position = [
    placement.position[0] - axis[0] * clearance / 2,
    placement.position[1] - axis[1] * clearance / 2,
  ];
  const longitudinalScale = placement.horizontalScale - clearance / 94;
  const transform = ([x, z]) => transformMapPoint(
    x,
    z,
    position,
    placement.rotationY,
    placement.horizontalScale,
    placement.localLaneCenterZ,
    longitudinalScale,
  );
  const polygon = (minX, maxX, minZ, maxZ) => [
    [minX, minZ],
    [minX, maxZ],
    [maxX, maxZ],
    [maxX, minZ],
  ].map(transform);
  const panyuSegments = map.roads
    .filter(({ name, tunnel, layer }) => name === "番禺路" && !tunnel && layer >= 0)
    .flatMap(({ points }) => points.slice(1).map((point, index) => [
      points[index],
      point,
    ]));
  const asphaltHalfWidth = audit.mapCalibration.roadClearance.asphaltHalfWidthScene;
  const building = layout.buildings.find(({ id }) => id === "south-east-entry");
  const southPolygon = polygon(
    building.x - building.width / 2 - 0.28,
    building.x + building.width / 2 + 0.28,
    building.z - building.depth / 2 - 0.28,
    building.z + building.depth / 2,
  );
  const clearanceToAsphalt = polygonToSegmentsDistance(
    southPolygon,
    panyuSegments,
  ) - asphaltHalfWidth;
  assert.equal(
    clearanceToAsphalt,
    audit.mapCalibration.roadClearance.southEastBuildingAsphaltClearanceScene,
  );
  assert.ok(clearanceToAsphalt < 0);
  assert.equal(audit.mapCalibration.roadClearance.status, "blocked");
  assert.equal(audit.mapCalibration.status, "blocked");
});

test("xingfuli-east 邻栋净距、三段路线与 east start/camera 状态可复算", async () => {
  const [audit, map, layout, qaData] = await Promise.all([
    readFile(auditPath, "utf8").then(JSON.parse),
    readFile(new URL("app/scene/xinhua-map-data.json", root), "utf8").then(JSON.parse),
    readFile(new URL("app/scene/xingfuli-layout.json", root), "utf8").then(JSON.parse),
    readFile(new URL("app/scene/xingfuli-qa-paths.json", root), "utf8").then(JSON.parse),
  ]);
  const placement = map.landmarks.xingfuli;
  const axis = [Math.cos(placement.rotationY), -Math.sin(placement.rotationY)];
  const position = [
    placement.position[0] - axis[0] * 4.1 / 2,
    placement.position[1] - axis[1] * 4.1 / 2,
  ];
  const longitudinalScale = placement.horizontalScale - 4.1 / 94;
  const worldObstacles = XINGFULI_OBSTACLES.map((obstacle) => (
    transformMapObstacle(
      obstacle,
      position,
      placement.rotationY,
      placement.horizontalScale,
      placement.localLaneCenterZ,
      longitudinalScale,
    )
  ));
  const buildingObstacles = XINGFULI_BUILDING_OBSTACLES.map((obstacle) => (
    transformMapObstacle(
      obstacle,
      position,
      placement.rotationY,
      placement.horizontalScale,
      placement.localLaneCenterZ,
      longitudinalScale,
    )
  ));
  const pointBlocked = (local, obstacles) => {
    const world = transformMapPoint(
      local[0],
      local[1],
      position,
      placement.rotationY,
      placement.horizontalScale,
      placement.localLaneCenterZ,
      longitudinalScale,
    );
    return isPlanarPositionBlockedInPolygon(
      world[0],
      world[1],
      map.boundary,
      obstacles,
      XINGFULI_QA_PLAYER_RADIUS_WORLD,
    );
  };

  const neighbor = layout.buildings.find(({ id }) => id === "north-inner-east");
  const east = layout.buildings.find(({ id }) => id === "north-east-entry");
  const localGap = (east.x - east.width / 2 - 0.28)
    - (neighbor.x + neighbor.width / 2 + 0.28);
  assert.equal(
    localGap * longitudinalScale,
    audit.collisionAndCamera.northNeighborGapWorld,
  );
  assert.equal(XINGFULI_QA_PATHS.length, audit.collisionAndCamera.threeSegmentQaRoutes);
  assert.equal(qaData.routes.length, audit.collisionAndCamera.threeSegmentQaRoutes);
  assert.equal(pointBlocked(audit.collisionAndCamera.eastRouteEnd.local, worldObstacles), false);
  assert.equal(
    pointBlocked(audit.collisionAndCamera.fastModeCanonicalStart.local, worldObstacles),
    false,
  );
  assert.equal(
    pointBlocked(audit.collisionAndCamera.eastEntranceStart.local, buildingObstacles),
    false,
  );
  assert.equal(
    pointBlocked(audit.collisionAndCamera.eastEntranceStart.local, worldObstacles),
    true,
  );
  const blockingObstacle = qaData.fixedObstacles.find(
    ({ id }) => id === audit.collisionAndCamera.eastEntranceStart.blockingObstacle,
  );
  assert.ok(blockingObstacle);
  assert.equal(
    pointBlocked(
      audit.collisionAndCamera.eastEntranceStart.local,
      [transformMapObstacle(
        blockingObstacle,
        position,
        placement.rotationY,
        placement.horizontalScale,
        placement.localLaneCenterZ,
        longitudinalScale,
      )],
    ),
    true,
  );
  assert.equal(audit.collisionAndCamera.status, "blocked");
  assert.equal(audit.gates.overall, "blocked");
});
