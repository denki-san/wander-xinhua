import landmarks from "./xinhua-landmarks-data.json" with { type: "json" };
import elevationData from "./xinhua-elevation-model.json" with { type: "json" };
import mapData from "./xinhua-map-data.json" with { type: "json" };
type TerrainPoint = readonly [number, number];
type TerrainBounds = { minX: number; maxX: number; minZ: number; maxZ: number };

function isPointInsideTerrainPolygon(x: number, z: number, polygon: readonly TerrainPoint[]) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    if (((currentPoint[1] > z) !== (previousPoint[1] > z))
      && x < (previousPoint[0] - currentPoint[0]) * (z - currentPoint[1])
        / (previousPoint[1] - currentPoint[1]) + currentPoint[0]) inside = !inside;
  }
  return inside;
}

type TerrainPlateau = {
  x: number;
  z: number;
  rotationY?: number;
  boundary?: readonly TerrainPoint[];
  halfSize?: readonly [number, number];
  transition: number;
};

function rawTerrainHeight(x: number, z: number) {
  const eastMeters = x * mapData.meta.metersPerSceneUnit;
  const sceneZMeters = z * mapData.meta.metersPerSceneUnit;
  const elevationMeters = elevationData.model.referenceElevationMeters
    + eastMeters * elevationData.model.eastWestGrade
    + sceneZMeters * elevationData.model.sceneZGrade;
  return elevationData.model.referenceSceneHeight
    + (elevationMeters - elevationData.model.referenceElevationMeters)
      / mapData.meta.metersPerSceneUnit;
}

const xingfuliRotation = mapData.landmarks.xingfuli.rotationY;
const xingfuliAxisX = [Math.cos(xingfuliRotation), -Math.sin(xingfuliRotation)] as const;
const xingfuliClearance = 4.1;

const PLATEAUS: TerrainPlateau[] = [
  {
    x: landmarks.huashanGreenland.position[0],
    z: landmarks.huashanGreenland.position[1],
    boundary: landmarks.huashanGreenland.boundary.map(([x, z]) => [x, z] as const),
    transition: 18,
  },
  {
    x: landmarks.shangshengXinsuo.position[0],
    z: landmarks.shangshengXinsuo.position[1],
    boundary: landmarks.shangshengXinsuo.boundary.map(([x, z]) => [x, z] as const),
    transition: 18,
  },
  {
    x: mapData.landmarks.xingfuli.position[0] - xingfuliAxisX[0] * xingfuliClearance / 2,
    z: mapData.landmarks.xingfuli.position[1] - xingfuliAxisX[1] * xingfuliClearance / 2,
    halfSize: [28, 10.5],
    rotationY: xingfuliRotation,
    transition: 7,
  },
];

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function distanceToSegment(
  x: number,
  z: number,
  start: TerrainPoint,
  end: TerrainPoint,
) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, (
    (x - start[0]) * dx + (z - start[1]) * dz
  ) / lengthSquared));
  return Math.hypot(x - (start[0] + dx * t), z - (start[1] + dz * t));
}

function distanceFromPlateau(x: number, z: number, plateau: TerrainPlateau) {
  const dx = x - plateau.x;
  const dz = z - plateau.z;
  const cos = Math.cos(plateau.rotationY ?? 0);
  const sin = Math.sin(plateau.rotationY ?? 0);
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;
  if (plateau.boundary) {
    if (isPointInsideTerrainPolygon(localX, localZ, plateau.boundary)) return 0;
    return Math.min(...plateau.boundary.map((point, index) => distanceToSegment(
      localX,
      localZ,
      point,
      plateau.boundary?.[(index + 1) % plateau.boundary.length] ?? point,
    )));
  }
  const [halfX, halfZ] = plateau.halfSize ?? [0, 0];
  return Math.hypot(
    Math.max(0, Math.abs(localX) - halfX),
    Math.max(0, Math.abs(localZ) - halfZ),
  );
}

/**
 * 新华街道的近似真实地形。高度来自 Copernicus GLO-30 DSM 的低频拟合；
 * 楼顶、树冠和像素噪声已被舍弃，因此只表达街区尺度缓坡，不表达台阶或微地形。
 */
export function terrainHeightAt(x: number, z: number) {
  let height = rawTerrainHeight(x, z);
  for (const plateau of PLATEAUS) {
    const distance = distanceFromPlateau(x, z, plateau);
    if (distance >= plateau.transition) continue;
    const blend = smoothstep(0, plateau.transition, distance);
    const anchorHeight = rawTerrainHeight(plateau.x, plateau.z);
    height = anchorHeight + (height - anchorHeight) * blend;
  }
  return height;
}

// 贴地绘本影只比低频地形高出一个极小余量，避免缓坡上的闪烁、悬空和穿地。
export const AUTUMN_SHADOW_SURFACE_OFFSET = 0.024;

export function autumnShadowSurfaceHeightAt(x: number, z: number) {
  return terrainHeightAt(x, z) + AUTUMN_SHADOW_SURFACE_OFFSET;
}

export type TerrainCell = readonly [number, number, number, number];

function pointInCell(point: TerrainPoint, cell: TerrainCell) {
  return point[0] >= cell[0] && point[0] <= cell[2]
    && point[1] >= cell[1] && point[1] <= cell[3];
}

function cross(a: TerrainPoint, b: TerrainPoint, c: TerrainPoint) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function segmentsIntersect(a: TerrainPoint, b: TerrainPoint, c: TerrainPoint, d: TerrainPoint) {
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  return abC * abD <= 0 && cdA * cdB <= 0;
}

function cellTouchesBoundary(cell: TerrainCell, polygon: readonly TerrainPoint[]) {
  const corners: TerrainPoint[] = [
    [cell[0], cell[1]],
    [cell[2], cell[1]],
    [cell[2], cell[3]],
    [cell[0], cell[3]],
  ];
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    if (pointInCell(start, cell) || pointInCell(end, cell)) return true;
    for (let edge = 0; edge < corners.length; edge += 1) {
      if (segmentsIntersect(start, end, corners[edge], corners[(edge + 1) % corners.length])) return true;
    }
  }
  return false;
}

/**
 * 规则网格的内部区域保持大三角形；只对行政边界相交格递归细分。
 * 最小格小于角色边界留白，既避免可进入的地面缺口，也把外溢压到不可见范围。
 */
export function buildTerrainCells(
  bounds: TerrainBounds,
  polygon: readonly TerrainPoint[],
  step = 9,
  minimumSize = 0.4,
) {
  const cells: TerrainCell[] = [];
  const append = (cell: TerrainCell) => {
    const [minX, minZ, maxX, maxZ] = cell;
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const samples: TerrainPoint[] = [
      [minX, minZ], [maxX, minZ], [maxX, maxZ], [minX, maxZ], [centerX, centerZ],
    ];
    const insideCount = samples.filter(([x, z]) => isPointInsideTerrainPolygon(x, z, polygon)).length;
    const touchesBoundary = cellTouchesBoundary(cell, polygon);
    if (insideCount === samples.length && !touchesBoundary) {
      cells.push(cell);
      return;
    }
    if (Math.max(maxX - minX, maxZ - minZ) <= minimumSize) {
      if (isPointInsideTerrainPolygon(centerX, centerZ, polygon)) cells.push(cell);
      return;
    }
    if (insideCount === 0 && !touchesBoundary) return;
    const middleX = (minX + maxX) / 2;
    const middleZ = (minZ + maxZ) / 2;
    append([minX, minZ, middleX, middleZ]);
    append([middleX, minZ, maxX, middleZ]);
    append([minX, middleZ, middleX, maxZ]);
    append([middleX, middleZ, maxX, maxZ]);
  };

  for (let x = bounds.minX; x < bounds.maxX; x += step) {
    for (let z = bounds.minZ; z < bounds.maxZ; z += step) {
      append([x, z, Math.min(bounds.maxX, x + step), Math.min(bounds.maxZ, z + step)]);
    }
  }
  return cells;
}
