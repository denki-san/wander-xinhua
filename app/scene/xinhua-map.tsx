"use client";

import { Html } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Matrix4,
  Shape,
  ShapeGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import mapData from "./xinhua-map-data.json";
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

const ROAD_STYLES: Record<RoadStyleName, { width: number; color: string; y: number }> = {
  arterial: { width: 2.18, color: "#424a4a", y: 0.13 },
  collector: { width: 1.45, color: "#535a58", y: 0.12 },
  neighborhood: { width: 0.9, color: "#666b67", y: 0.11 },
  lane: { width: 0.68, color: "#777971", y: 0.1 },
  service: { width: 0.5, color: "#8a877d", y: 0.09 },
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
  if (highway.startsWith("trunk")) return 2.62;
  if (highway.startsWith("primary")) return 2.18;
  if (highway.startsWith("secondary")) return 1.82;
  if (highway.startsWith("tertiary")) return 1.45;
  if (highway === "residential") return 0.9;
  if (highway === "living_street" || highway === "unclassified") return 0.68;
  return 0.5;
}

function isSurfaceRoad(road: Road) {
  return !road.tunnel && road.layer >= 0;
}

function representativeRoadPosition(roads: Road[]) {
  const segmentLengths = roads.flatMap((road) => road.points.slice(1).map((end, index) => ({
    start: road.points[index],
    end,
    length: Math.hypot(end[0] - road.points[index][0], end[1] - road.points[index][1]),
  })));
  const totalLength = segmentLengths.reduce((sum, segment) => sum + segment.length, 0);
  let walked = 0;
  for (const segment of segmentLengths) {
    if (walked + segment.length >= totalLength / 2) {
      const t = (totalLength / 2 - walked) / segment.length;
      return [
        segment.start[0] + (segment.end[0] - segment.start[0]) * t,
        segment.start[1] + (segment.end[1] - segment.start[1]) * t,
      ] as const;
    }
    walked += segment.length;
  }
  return roads[0].points[0];
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
      const length = Math.hypot(dx, dz);
      if (length < 0.02) continue;
      const segment = new BoxGeometry(width, 0.075, length);
      const matrix = new Matrix4().makeRotationY(Math.atan2(dx, dz));
      matrix.setPosition((start[0] + end[0]) / 2, y, (start[1] + end[1]) / 2);
      segment.applyMatrix4(matrix);
      pieces.push(segment);
    }
    for (const [x, z] of road.points) {
      const join = new CylinderGeometry(width / 2, width / 2, 0.075, 10);
      join.translate(x, y, z);
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
      const length = Math.hypot(dx, dz);
      if (length < 0.12) continue;
      const line = new BoxGeometry(0.055, 0.018, length * 0.86);
      const matrix = new Matrix4().makeRotationY(Math.atan2(dx, dz));
      matrix.setPosition((start[0] + end[0]) / 2, y, (start[1] + end[1]) / 2);
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
  for (let index = 0; index < XINHUA_BOUNDARY.length; index += 1) {
    const start = XINHUA_BOUNDARY[index];
    const end = XINHUA_BOUNDARY[(index + 1) % XINHUA_BOUNDARY.length];
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const length = Math.hypot(dx, dz);
    const curb = new BoxGeometry(0.26, 0.22, length + 0.08);
    const matrix = new Matrix4().makeRotationY(Math.atan2(dx, dz));
    matrix.setPosition((start[0] + end[0]) / 2, 0.18, (start[1] + end[1]) / 2);
    curb.applyMatrix4(matrix);
    pieces.push(curb);
  }
  const merged = mergeGeometries(pieces, false);
  pieces.forEach((piece) => piece.dispose());
  return merged;
}

function MapGround() {
  const geometry = useMemo(() => {
    const shape = new Shape();
    XINHUA_BOUNDARY.forEach(([x, z], index) => {
      if (index === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });
    shape.closePath();
    const ground = new ShapeGeometry(shape);
    ground.rotateX(-Math.PI / 2);
    return ground;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <>
      <mesh geometry={geometry} position={[0, -0.06, 0]} receiveShadow>
        <meshToonMaterial color="#869873" side={DoubleSide} />
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
        <group key={`${x}-${z}`} position={[x * 0.985, 0.16, z * 0.985]} rotation-y={index * 0.73}>
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

function RoadLabels() {
  const roads = ROADS;
  const labels = useMemo(() => LABELLED_ROADS.flatMap((name) => {
    const candidates = roads.filter((road) => road.name === name && isSurfaceRoad(road));
    if (candidates.length === 0) return [];
    return [{ name, position: representativeRoadPosition(candidates) }];
  }), [roads]);

  return (
    <group>
      {labels.map((label) => (
        <Html
          key={label.name}
          center
          transform
          sprite
          distanceFactor={20}
          position={[label.position[0], 0.72, label.position[1]]}
          style={{ pointerEvents: "none" }}
        >
          <span className="map-road-label">{label.name}</span>
        </Html>
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
