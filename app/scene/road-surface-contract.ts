import mapData from "./xinhua-map-data.json" with { type: "json" };

export type Road = {
  id: string;
  osmWayId: number;
  name: string;
  nameEn: string;
  highway: string;
  lanes: number | null;
  bridge: boolean;
  layer: number;
  tunnel: boolean;
  points: [number, number][];
};

export type RoadStyleName =
  | "arterial"
  | "collector"
  | "xinhua"
  | "neighborhood"
  | "lane"
  | "service";

export const XINHUA_ENVIRONMENT_SCALE = mapData.meta.environmentScale;
export const ROAD_MESH_HEIGHT = 0.075;

export const ROAD_STYLES: Record<
  RoadStyleName,
  { width: number; color: string; y: number }
> = {
  arterial: { width: 2.18 * XINHUA_ENVIRONMENT_SCALE, color: "#454847", y: 0.13 },
  collector: { width: 1.45 * XINHUA_ENVIRONMENT_SCALE, color: "#585955", y: 0.12 },
  xinhua: { width: 0.98 * XINHUA_ENVIRONMENT_SCALE, color: "#696d69", y: 0.121 },
  neighborhood: { width: 0.9 * XINHUA_ENVIRONMENT_SCALE, color: "#696760", y: 0.11 },
  lane: { width: 0.68 * XINHUA_ENVIRONMENT_SCALE, color: "#777268", y: 0.1 },
  service: { width: 0.5 * XINHUA_ENVIRONMENT_SCALE, color: "#898174", y: 0.09 },
};

export const XINHUA_ROAD_ASPHALT_WIDTH = 0.98 * XINHUA_ENVIRONMENT_SCALE;
export const XINHUA_ROAD_CURB_WIDTH = 0.055 * XINHUA_ENVIRONMENT_SCALE;
export const XINHUA_ROAD_SIDEWALK_WIDTH = 0.16 * XINHUA_ENVIRONMENT_SCALE;
export const XINHUA_ROAD_VERGE_WIDTH = 0.08 * XINHUA_ENVIRONMENT_SCALE;

export const ROADS: Road[] = mapData.roads.map((road) => ({
  ...road,
  points: road.points.map(([x, z]) => [x, z]),
}));

export function roadStyle(road: Pick<Road, "highway" | "name">): RoadStyleName {
  const { highway } = road;
  if (road.name === "新华路" && highway.startsWith("tertiary")) return "xinhua";
  if (/^(trunk|primary|secondary)/.test(highway)) return "arterial";
  if (/^tertiary/.test(highway)) return "collector";
  if (highway === "residential") return "neighborhood";
  if (highway === "living_street" || highway === "unclassified") return "lane";
  return "service";
}

export function roadWidth(road: Pick<Road, "highway" | "name">) {
  const { highway } = road;
  if (road.name === "新华路" && highway.startsWith("tertiary")) {
    return XINHUA_ROAD_ASPHALT_WIDTH;
  }
  if (highway.startsWith("trunk")) return 2.62 * XINHUA_ENVIRONMENT_SCALE;
  if (highway.startsWith("primary")) return 2.18 * XINHUA_ENVIRONMENT_SCALE;
  if (highway.startsWith("secondary")) return 1.82 * XINHUA_ENVIRONMENT_SCALE;
  if (highway.startsWith("tertiary")) return 1.45 * XINHUA_ENVIRONMENT_SCALE;
  if (highway === "residential") return 0.9 * XINHUA_ENVIRONMENT_SCALE;
  if (highway === "living_street" || highway === "unclassified") {
    return 0.68 * XINHUA_ENVIRONMENT_SCALE;
  }
  return 0.5 * XINHUA_ENVIRONMENT_SCALE;
}

export function isSurfaceRoad(road: Road) {
  return !road.tunnel && road.layer >= 0;
}

function distanceToRoadSegment(
  x: number,
  z: number,
  start: readonly [number, number],
  end: readonly [number, number],
) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, (
    (x - start[0]) * dx + (z - start[1]) * dz
  ) / lengthSquared));
  return Math.hypot(
    x - (start[0] + dx * t),
    z - (start[1] + dz * t),
  );
}

function xinhuaRoadEdgeTop(distance: number) {
  const asphaltEdge = XINHUA_ROAD_ASPHALT_WIDTH / 2;
  const curbEdge = asphaltEdge + XINHUA_ROAD_CURB_WIDTH;
  const sidewalkEdge = curbEdge + XINHUA_ROAD_SIDEWALK_WIDTH;
  const vergeEdge = sidewalkEdge + XINHUA_ROAD_VERGE_WIDTH;
  if (distance <= asphaltEdge) return ROAD_STYLES.xinhua.y + ROAD_MESH_HEIGHT / 2;
  if (distance <= curbEdge) return 0.135 + 0.18 / 2;
  if (distance <= sidewalkEdge) return 0.14 + 0.12 / 2;
  if (distance <= vergeEdge) return 0.015 + 0.055 / 2;
  return 0;
}

/**
 * 返回某点可见道路、路缘、人行道或绿化带相对低频地形的顶面高度。
 * 桥梁不接收地面树影；中心线应继续盖在影子上，因此不纳入顶面计算。
 */
export function visibleRoadSurfaceOffsetAt(x: number, z: number) {
  let surfaceOffset = 0;
  for (const road of ROADS) {
    if (!isSurfaceRoad(road) || road.bridge) continue;
    const style = roadStyle(road);
    const width = roadWidth(road) * (road.highway.endsWith("_link") ? 0.78 : 1);
    for (let index = 0; index < road.points.length - 1; index += 1) {
      const distance = distanceToRoadSegment(
        x,
        z,
        road.points[index],
        road.points[index + 1],
      );
      if (road.name === "新华路" && style === "xinhua") {
        surfaceOffset = Math.max(surfaceOffset, xinhuaRoadEdgeTop(distance));
      } else if (distance <= width / 2) {
        surfaceOffset = Math.max(
          surfaceOffset,
          ROAD_STYLES[style].y + ROAD_MESH_HEIGHT / 2,
        );
      }
    }
  }
  return surfaceOffset;
}
