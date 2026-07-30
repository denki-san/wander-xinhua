import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const MAP_PATH = new URL("../app/scene/xinhua-map-data.json", import.meta.url);
const BUILDINGS_PATH = new URL(
  "../app/scene/xinhua-district-massing-data.json",
  import.meta.url,
);
const OUTPUT_PATH = new URL(
  "../app/scene/plane-tree-road-network-data.json",
  import.meta.url,
);

const ROAD_SPECS = Object.freeze([
  {
    id: "xinhua",
    name: "新华路",
    nameEn: "Xinhua Road",
    grade: "A",
    targetCount: 98,
    highway: "tertiary",
    sourceRoadIds: [
      "493396664-0",
      "148332232-0",
      "682286683-0",
      "1074722379-0",
    ],
    offsets: [5.05, 6.55],
  },
  {
    id: "panyu",
    name: "番禺路",
    nameEn: "Panyu Road",
    grade: "A",
    targetCount: 60,
    highway: "tertiary",
    sourceRoadIds: ["11960339-0"],
    offsets: [4.65, 4.65],
    clipStartAtRoad: "xinhua",
  },
  {
    id: "anshun",
    name: "安顺路",
    nameEn: "Anshun Road",
    grade: "A",
    targetCount: 48,
    highway: "tertiary",
    sourceRoadIds: ["1073705840-0", "163594779-0"],
    offsets: [4.65, 4.65],
  },
  {
    id: "huaihai-west",
    name: "淮海西路",
    nameEn: "Huaihai West Road",
    grade: "A",
    targetCount: 32,
    highway: "secondary",
    sourceRoadIds: ["1073705814-0", "657297354-0"],
    offsets: [5.65, 5.65],
  },
  {
    id: "hunan",
    name: "湖南路",
    nameEn: "Hunan Road",
    grade: "A",
    targetCount: 18,
    highway: "residential",
    sourceRoadIds: ["232920699-0"],
    offsets: [3.25, 3.25],
  },
  {
    id: "huashan",
    name: "华山路",
    nameEn: "Huashan Road",
    grade: "B",
    targetCount: 56,
    highway: "primary",
    sourceRoadIds: ["482569920-0"],
    offsets: [6.45, 6.45],
  },
  {
    id: "taian",
    name: "泰安路",
    nameEn: "Taian Road",
    grade: "B",
    targetCount: 20,
    highway: "residential",
    sourceRoadIds: ["85686604-0"],
    offsets: [3.25, 3.25],
  },
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function distance(left, right) {
  return Math.hypot(left[0] - right[0], left[1] - right[1]);
}

function joinRoads(roadById, sourceRoadIds) {
  const result = [];
  for (const id of sourceRoadIds) {
    const source = roadById.get(id);
    if (!source) throw new Error(`梧桐道路来源不存在：${id}`);
    const points = source.points.map((point) => [...point]);
    if (result.length === 0) {
      result.push(...points);
    } else if (distance(result.at(-1), points[0]) < 0.01) {
      result.push(...points.slice(1));
    } else if (distance(result.at(-1), points.at(-1)) < 0.01) {
      result.push(...points.reverse().slice(1));
    } else {
      throw new Error(`梧桐道路来源不连续：${id}`);
    }
  }
  return result;
}

function segmentIntersection(startA, endA, startB, endB) {
  const directionA = [endA[0] - startA[0], endA[1] - startA[1]];
  const directionB = [endB[0] - startB[0], endB[1] - startB[1]];
  const cross = (left, right) => left[0] * right[1] - left[1] * right[0];
  const denominator = cross(directionA, directionB);
  if (Math.abs(denominator) < 1e-9) return null;
  const delta = [startB[0] - startA[0], startB[1] - startA[1]];
  const ratioA = cross(delta, directionB) / denominator;
  const ratioB = cross(delta, directionA) / denominator;
  if (
    ratioA < -1e-9
    || ratioA > 1 + 1e-9
    || ratioB < -1e-9
    || ratioB > 1 + 1e-9
  ) {
    return null;
  }
  return [
    startA[0] + directionA[0] * ratioA,
    startA[1] + directionA[1] * ratioA,
  ];
}

function clipStartAtIntersection(points, clipRoadPoints) {
  for (let index = 1; index < points.length; index += 1) {
    for (let clipIndex = 1; clipIndex < clipRoadPoints.length; clipIndex += 1) {
      const intersection = segmentIntersection(
        points[index - 1],
        points[index],
        clipRoadPoints[clipIndex - 1],
        clipRoadPoints[clipIndex],
      );
      if (intersection) return [intersection, ...points.slice(index)];
    }
  }
  throw new Error("梧桐道路裁剪起点未与指定道路相交");
}

function polylineLength(points) {
  return points.slice(1).reduce(
    (total, point, index) => total + distance(point, points[index]),
    0,
  );
}

function uniquePoints(points, tolerance = 0.5) {
  const result = [];
  for (const point of points) {
    if (result.every((current) => distance(current, point) > tolerance)) {
      result.push(point);
    }
  }
  return result;
}

function roadIntersections(contract, mapRoads) {
  const intersections = [];
  for (const road of mapRoads) {
    if (
      contract.sourceRoadIds.includes(road.id)
      || road.name === contract.name
      || road.tunnel
      || road.bridge
      || road.layer < 0
      || /^(footway|path|cycleway|steps|pedestrian)$/u.test(road.highway)
    ) {
      continue;
    }
    for (let index = 1; index < contract.points.length; index += 1) {
      for (let roadIndex = 1; roadIndex < road.points.length; roadIndex += 1) {
        const intersection = segmentIntersection(
          contract.points[index - 1],
          contract.points[index],
          road.points[roadIndex - 1],
          road.points[roadIndex],
        );
        if (intersection) intersections.push(intersection);
      }
    }
  }
  return uniquePoints(intersections);
}

function buildingObstacle(building) {
  const x = building.outer.map((point) => point[0]);
  const z = building.outer.map((point) => point[1]);
  return {
    id: building.assetId,
    minX: Math.min(...x),
    maxX: Math.max(...x),
    minZ: Math.min(...z),
    maxZ: Math.max(...z),
  };
}

const [mapBytes, buildingBytes] = await Promise.all([
  readFile(MAP_PATH),
  readFile(BUILDINGS_PATH),
]);
const mapData = JSON.parse(mapBytes);
const buildingData = JSON.parse(buildingBytes);
const roadById = new Map(mapData.roads.map((road) => [road.id, road]));
const preliminary = ROAD_SPECS.map((spec) => ({
  ...spec,
  points: joinRoads(roadById, spec.sourceRoadIds),
}));
const byContractId = new Map(preliminary.map((road) => [road.id, road]));
const roads = preliminary.map((road) => {
  const points = road.clipStartAtRoad
    ? clipStartAtIntersection(
        road.points,
        byContractId.get(road.clipStartAtRoad).points,
      )
    : road.points;
  const contract = {
    ...road,
    points,
    sceneLength: Number(polylineLength(points).toFixed(6)),
  };
  delete contract.clipStartAtRoad;
  return {
    ...contract,
    intersections: roadIntersections(contract, mapData.roads),
  };
});

const output = {
  schemaVersion: 1,
  generatedAt: "2026-07-30",
  sceneUnitMetres: mapData.meta.sceneUnitMetres,
  source: {
    mapPath: "app/scene/xinhua-map-data.json",
    mapSha256: sha256(mapBytes),
    buildingsPath: "app/scene/xinhua-district-massing-data.json",
    buildingsSha256: sha256(buildingBytes),
  },
  approval: {
    scope: "A+B",
    streetTreeTarget: roads.reduce((sum, road) => sum + road.targetCount, 0),
    xingfuliSharedTrees: 3,
  },
  roads,
  buildingObstacles: buildingData.acceptedBuildings.map(buildingObstacle),
};

await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  output: OUTPUT_PATH.pathname,
  roads: roads.map(({ id, targetCount, sceneLength, intersections }) => ({
    id,
    targetCount,
    sceneLength,
    intersections: intersections.length,
  })),
  streetTreeTarget: output.approval.streetTreeTarget,
  buildingObstacles: output.buildingObstacles.length,
}, null, 2)}\n`);
