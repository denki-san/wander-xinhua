"use client";

import { useEffect, useMemo } from "react";
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Matrix4,
  SRGBColorSpace,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import mapData from "./xinhua-map-data.json";
import { buildTerrainCells, terrainHeightAt } from "./terrain";
import type { MapPolygonPoint } from "./world-math";

type Road = {
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

type RoadStyleName = "arterial" | "collector" | "neighborhood" | "lane" | "service";

export const XINHUA_ENVIRONMENT_SCALE = mapData.meta.environmentScale;

const ROAD_STYLES: Record<RoadStyleName, { width: number; color: string; y: number }> = {
  arterial: { width: 2.18 * XINHUA_ENVIRONMENT_SCALE, color: "#424a4a", y: 0.13 },
  collector: { width: 1.45 * XINHUA_ENVIRONMENT_SCALE, color: "#535a58", y: 0.12 },
  neighborhood: { width: 0.9 * XINHUA_ENVIRONMENT_SCALE, color: "#666b67", y: 0.11 },
  lane: { width: 0.68 * XINHUA_ENVIRONMENT_SCALE, color: "#777971", y: 0.1 },
  service: { width: 0.5 * XINHUA_ENVIRONMENT_SCALE, color: "#8a877d", y: 0.09 },
};

const LABELLED_ROADS = [
  "延安西路",
  "凯旋路",
  "淮海西路",
  "华山路",
  "新华路",
  "番禺路",
  "法华镇路",
  "幸福路",
  "定西路",
  "安顺路",
] as const;

const ROADS: Road[] = mapData.roads.map((road) => ({
  ...road,
  points: road.points.map(([x, z]) => [x, z]),
}));

export const XINHUA_BOUNDARY: MapPolygonPoint[] = mapData.boundary.map(([x, z]) => [x, z]);
export const XINHUA_BOUNDS = mapData.bounds;
export const XINGFULI_PLACEMENT = mapData.landmarks.xingfuli;

function roadStyle(highway: string): RoadStyleName {
  if (/^(trunk|primary|secondary)/.test(highway)) return "arterial";
  if (/^tertiary/.test(highway)) return "collector";
  if (highway === "residential") return "neighborhood";
  if (highway === "living_street" || highway === "unclassified") return "lane";
  return "service";
}

function roadWidth(highway: string) {
  if (highway.startsWith("trunk")) return 2.62 * XINHUA_ENVIRONMENT_SCALE;
  if (highway.startsWith("primary")) return 2.18 * XINHUA_ENVIRONMENT_SCALE;
  if (highway.startsWith("secondary")) return 1.82 * XINHUA_ENVIRONMENT_SCALE;
  if (highway.startsWith("tertiary")) return 1.45 * XINHUA_ENVIRONMENT_SCALE;
  if (highway === "residential") return 0.9 * XINHUA_ENVIRONMENT_SCALE;
  if (highway === "living_street" || highway === "unclassified") return 0.68 * XINHUA_ENVIRONMENT_SCALE;
  return 0.5 * XINHUA_ENVIRONMENT_SCALE;
}

function isSurfaceRoad(road: Road) {
  return !road.tunnel && road.layer >= 0;
}

type RoadLabelPlacement = {
  key: string;
  name: string;
  position: readonly [number, number];
  yaw: number;
};

function roadLabelPlacements(name: string, roads: Road[]): RoadLabelPlacement[] {
  const segmentLengths = roads.flatMap((road) => road.points.slice(1).map((end, index) => ({
    start: road.points[index],
    end,
    length: Math.hypot(end[0] - road.points[index][0], end[1] - road.points[index][1]),
  })));
  const totalLength = segmentLengths.reduce((sum, segment) => sum + segment.length, 0);
  const fractions = totalLength > 190 ? [0.26, 0.58, 0.84] : totalLength > 95 ? [0.35, 0.72] : [0.5];
  return fractions.flatMap((fraction, labelIndex) => {
    const target = totalLength * fraction;
    let walked = 0;
    for (const segment of segmentLengths) {
      if (walked + segment.length >= target) {
        const t = (target - walked) / segment.length;
        const dx = segment.end[0] - segment.start[0];
        const dz = segment.end[1] - segment.start[1];
        return [{
          key: `${name}-${labelIndex}`,
          name,
          position: [
            segment.start[0] + dx * t,
            segment.start[1] + dz * t,
          ] as const,
          yaw: -Math.atan2(dz, dx),
        }];
      }
      walked += segment.length;
    }
    return [];
  });
}

function slopedSegmentMatrix(start: readonly [number, number], end: readonly [number, number], yOffset: number) {
  const startY = terrainHeightAt(start[0], start[1]) + yOffset;
  const endY = terrainHeightAt(end[0], end[1]) + yOffset;
  const zAxis = new Vector3(end[0] - start[0], endY - startY, end[1] - start[1]).normalize();
  const xAxis = new Vector3(end[1] - start[1], 0, -(end[0] - start[0])).normalize();
  const yAxis = zAxis.clone().cross(xAxis).normalize();
  return new Matrix4()
    .makeBasis(xAxis, yAxis, zAxis)
    .setPosition((start[0] + end[0]) / 2, (startY + endY) / 2, (start[1] + end[1]) / 2);
}

function mergeRoadMeshes(roads: Road[], styleName: RoadStyleName) {
  const style = ROAD_STYLES[styleName];
  const pieces: BufferGeometry[] = [];
  for (const road of roads.filter((candidate) => isSurfaceRoad(candidate) && roadStyle(candidate.highway) === styleName)) {
    const width = roadWidth(road.highway) * (road.highway.endsWith("_link") ? 0.78 : 1);
    const y = style.y + (road.bridge ? 0.17 + Math.max(0, road.layer) * 0.035 : 0);
    for (let index = 0; index < road.points.length - 1; index += 1) {
      const start = road.points[index];
      const end = road.points[index + 1];
      const dx = end[0] - start[0];
      const dz = end[1] - start[1];
      const startY = terrainHeightAt(start[0], start[1]);
      const endY = terrainHeightAt(end[0], end[1]);
      const length = Math.hypot(dx, endY - startY, dz);
      if (length < 0.02) continue;
      const segment = new BoxGeometry(width, 0.075, length);
      const matrix = slopedSegmentMatrix(start, end, y);
      segment.applyMatrix4(matrix);
      pieces.push(segment);
    }
    for (const [x, z] of road.points) {
      const join = new CylinderGeometry(width / 2, width / 2, 0.075, 10);
      join.translate(x, terrainHeightAt(x, z) + y, z);
      pieces.push(join);
    }
  }
  if (pieces.length === 0) return null;
  const merged = mergeGeometries(pieces, false);
  pieces.forEach((piece) => piece.dispose());
  return merged;
}

function mergeCenterLines(roads: Road[]) {
  const pieces: BufferGeometry[] = [];
  for (const road of roads.filter((candidate) => isSurfaceRoad(candidate)
    && (roadStyle(candidate.highway) === "arterial" || roadStyle(candidate.highway) === "collector"))) {
    if (road.highway.endsWith("_link")) continue;
    const y = 0.185 + (road.bridge ? 0.17 + Math.max(0, road.layer) * 0.035 : 0);
    for (let index = 0; index < road.points.length - 1; index += 1) {
      const start = road.points[index];
      const end = road.points[index + 1];
      const dx = end[0] - start[0];
      const dz = end[1] - start[1];
      const startY = terrainHeightAt(start[0], start[1]);
      const endY = terrainHeightAt(end[0], end[1]);
      const length = Math.hypot(dx, endY - startY, dz);
      if (length < 0.12) continue;
      const line = new BoxGeometry(0.055 * XINHUA_ENVIRONMENT_SCALE, 0.018, length * 0.86);
      const matrix = slopedSegmentMatrix(start, end, y);
      line.applyMatrix4(matrix);
      pieces.push(line);
    }
  }
  if (pieces.length === 0) return null;
  const merged = mergeGeometries(pieces, false);
  pieces.forEach((piece) => piece.dispose());
  return merged;
}

function mergeBoundaryCurb() {
  const pieces: BufferGeometry[] = [];
  const curbHeight = 0.22 * XINHUA_ENVIRONMENT_SCALE;
  const curbCenterY = 0.07 + curbHeight / 2;
  for (let index = 0; index < XINHUA_BOUNDARY.length; index += 1) {
    const start = XINHUA_BOUNDARY[index];
    const end = XINHUA_BOUNDARY[(index + 1) % XINHUA_BOUNDARY.length];
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const length = Math.hypot(
      dx,
      terrainHeightAt(end[0], end[1]) - terrainHeightAt(start[0], start[1]),
      dz,
    );
    const curb = new BoxGeometry(
      0.26 * XINHUA_ENVIRONMENT_SCALE,
      curbHeight,
      length + 0.08 * XINHUA_ENVIRONMENT_SCALE,
    );
    const matrix = slopedSegmentMatrix(start, end, curbCenterY);
    curb.applyMatrix4(matrix);
    pieces.push(curb);
  }
  const merged = mergeGeometries(pieces, false);
  pieces.forEach((piece) => piece.dispose());
  return merged;
}

function MapGround() {
  const geometry = useMemo(() => {
    const ground = new BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const low = new Color("#718b66");
    const high = new Color("#9ba477");
    const color = new Color();
    const addVertex = (x: number, z: number) => {
      const y = terrainHeightAt(x, z) - 0.06;
      positions.push(x, y, z);
      color.lerpColors(low, high, Math.min(1, Math.max(0, (y - 0.4) / 5.4)));
      colors.push(color.r, color.g, color.b);
    };
    for (const [x, z, x1, z1] of buildTerrainCells(XINHUA_BOUNDS, XINHUA_BOUNDARY)) {
      addVertex(x, z);
      addVertex(x, z1);
      addVertex(x1, z1);
      addVertex(x, z);
      addVertex(x1, z1);
      addVertex(x1, z);
    }
    ground.setAttribute("position", new Float32BufferAttribute(positions, 3));
    ground.setAttribute("color", new Float32BufferAttribute(colors, 3));
    ground.computeVertexNormals();
    return ground;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <>
      <mesh geometry={geometry} receiveShadow>
        <meshToonMaterial vertexColors side={DoubleSide} />
      </mesh>
    </>
  );
}

function AsphaltRoadNetwork() {
  const roads = ROADS;
  const geometries = useMemo(() => ({
    arterial: mergeRoadMeshes(roads, "arterial"),
    collector: mergeRoadMeshes(roads, "collector"),
    neighborhood: mergeRoadMeshes(roads, "neighborhood"),
    lane: mergeRoadMeshes(roads, "lane"),
    service: mergeRoadMeshes(roads, "service"),
    centerLines: mergeCenterLines(roads),
  }), [roads]);
  useEffect(() => () => Object.values(geometries).forEach((geometry) => geometry?.dispose()), [geometries]);

  return (
    <group data-road-network="osm-13469094">
      {(Object.keys(ROAD_STYLES) as RoadStyleName[]).map((styleName) => {
        const geometry = geometries[styleName];
        if (!geometry) return null;
        return (
          <mesh key={styleName} geometry={geometry} receiveShadow>
            <meshToonMaterial color={ROAD_STYLES[styleName].color} />
          </mesh>
        );
      })}
      {geometries.centerLines && (
        <mesh geometry={geometries.centerLines}>
          <meshBasicMaterial color="#e7d6a2" />
        </mesh>
      )}
    </group>
  );
}

function DistrictBoundary() {
  const curb = useMemo(() => mergeBoundaryCurb(), []);
  useEffect(() => () => curb?.dispose(), [curb]);
  return (
    <group data-administrative-boundary="osm-13469094">
      {curb && (
        <mesh geometry={curb} castShadow receiveShadow>
          <meshToonMaterial color="#d8c796" />
        </mesh>
      )}
      {XINHUA_BOUNDARY.filter((_, index) => index % 4 === 0).map(([x, z], index) => (
        <group
          key={`${x}-${z}`}
          position={[x * 0.985, terrainHeightAt(x * 0.985, z * 0.985) + 0.16, z * 0.985]}
          rotation-y={index * 0.73}
          scale={XINHUA_ENVIRONMENT_SCALE}
        >
          <mesh position={[0, 0.44, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.16, 0.88, 7]} />
            <meshToonMaterial color="#425e4e" />
          </mesh>
          <mesh position={[0, 1.02, 0]} castShadow>
            <icosahedronGeometry args={[0.62 + index % 3 * 0.08, 1]} />
            <meshToonMaterial color={index % 2 ? "#527a58" : "#668a58"} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function RoadSurfaceLabels({
  name,
  labels,
}: {
  name: string;
  labels: RoadLabelPlacement[];
}) {
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(246, 236, 205, 0.96)";
    context.strokeStyle = "rgba(35, 45, 43, 0.72)";
    context.lineWidth = 9;
    context.lineJoin = "round";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "800 71px -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif";
    context.strokeText(name, canvas.width / 2, canvas.height / 2 + 2);
    context.fillText(name, canvas.width / 2, canvas.height / 2 + 2);
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    result.anisotropy = 4;
    return result;
  }, [name]);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;

  const width = Math.max(11, name.length * 3.1);
  return (
    <group name={`road-paint-${name}`}>
      {labels.map((label) => (
        <group
          key={label.key}
          position={[
            label.position[0],
            terrainHeightAt(label.position[0], label.position[1]) + 0.245,
            label.position[1],
          ]}
          rotation-y={label.yaw}
          userData={{ roadName: name, treatment: "painted-on-asphalt" }}
        >
          <mesh rotation-x={-Math.PI / 2}>
            <planeGeometry args={[width, 3.15]} />
            <meshBasicMaterial
              map={texture}
              transparent
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-2}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function RoadLabels() {
  const roads = ROADS;
  const labelGroups = useMemo(() => LABELLED_ROADS.flatMap((name) => {
    const candidates = roads.filter((road) => road.name === name && isSurfaceRoad(road));
    if (candidates.length === 0) return [];
    return [{ name, labels: roadLabelPlacements(name, candidates) }];
  }), [roads]);

  return (
    <group name="road-surface-labels">
      {labelGroups.map((group) => (
        <RoadSurfaceLabels key={group.name} name={group.name} labels={group.labels} />
      ))}
    </group>
  );
}

export function XinhuaStreetMap() {
  return (
    <group data-map-scale={`${mapData.meta.metersPerSceneUnit}-metres-per-unit`}>
      <MapGround />
      <AsphaltRoadNetwork />
      <DistrictBoundary />
      <RoadLabels />
    </group>
  );
}
