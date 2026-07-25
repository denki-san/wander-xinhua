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
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import mapData from "./xinhua-map-data.json";
import {
  StreetBinInstances,
  StreetLampInstances,
  StreetPlanterInstances,
  StreetShrubInstances,
  type StreetBinInstancePlacement,
  type StreetLampPlacement,
  type StreetPlanterInstancePlacement,
  type StreetShrubInstancePlacement,
} from "./shared-street-assets";
import { buildXinhuaStreetDressingPlacements } from "./street-dressing-placement.mjs";
import { buildTerrainCells, terrainHeightAt } from "./terrain";
import type { MapPolygonPoint } from "./world-math";
import {
  isSurfaceRoad,
  ROAD_MESH_HEIGHT,
  ROADS,
  ROAD_STYLES,
  roadStyle,
  roadWidth,
  XINHUA_ENVIRONMENT_SCALE,
  XINHUA_ROAD_ASPHALT_WIDTH,
  XINHUA_ROAD_CURB_WIDTH,
  XINHUA_ROAD_SIDEWALK_WIDTH,
  XINHUA_ROAD_VERGE_WIDTH,
  type Road,
  type RoadStyleName,
} from "./road-surface-contract.ts";

export { XINHUA_ENVIRONMENT_SCALE };

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

export const XINHUA_BOUNDARY: MapPolygonPoint[] = mapData.boundary.map(([x, z]) => [x, z]);
export const XINHUA_BOUNDS = mapData.bounds;
export const XINGFULI_PLACEMENT = mapData.landmarks.xingfuli;

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

function applyWorldPlanarUvs(geometry: BufferGeometry, repeatSize: number) {
  const positions = geometry.getAttribute("position");
  const uvs: number[] = [];
  for (let index = 0; index < positions.count; index += 1) {
    uvs.push(positions.getX(index) / repeatSize, positions.getZ(index) / repeatSize);
  }
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
}

function applyRoadVertexColors(geometry: BufferGeometry, baseColor: string) {
  const positions = geometry.getAttribute("position");
  const base = new Color(baseColor);
  const color = new Color();
  const colors: number[] = [];
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const lowFrequency = (
      Math.sin(x * 0.047 + z * 0.031)
      + Math.sin(x * 0.019 - z * 0.061) * 0.62
      + 1.62
    ) / 3.24;
    color.copy(base).multiplyScalar(0.88 + lowFrequency * 0.16);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
}

function createSurfaceTexture(kind: "asphalt" | "path" | "ground") {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const palettes = {
    asphalt: { base: "#dddcd5", dark: "#a7a8a3", light: "#f3f0e6", count: 680 },
    path: { base: "#e1d9c9", dark: "#aaa08c", light: "#f2eadb", count: 520 },
    ground: { base: "#e3e5cf", dark: "#aeb895", light: "#f1edd2", count: 440 },
  } as const;
  const palette = palettes[kind];
  context.fillStyle = palette.base;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // 固定 seed 的轻量程序纹理，避免下载图片和运行时动画噪声。
  let state = kind === "asphalt" ? 9137 : kind === "path" ? 6151 : 4271;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
  for (let index = 0; index < palette.count; index += 1) {
    const x = Math.floor(random() * canvas.width);
    const y = Math.floor(random() * canvas.height);
    const size = random() > 0.86 ? 2 : 1;
    context.globalAlpha = 0.12 + random() * 0.22;
    context.fillStyle = random() > 0.46 ? palette.light : palette.dark;
    context.fillRect(x, y, kind === "path" ? size * 1.7 : size, size);
  }
  if (kind === "asphalt") {
    context.globalAlpha = 0.16;
    context.strokeStyle = palette.dark;
    context.lineWidth = 0.7;
    for (let index = 0; index < 8; index += 1) {
      const x = random() * 128;
      const y = random() * 128;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + 3 + random() * 7, y - 1 + random() * 3);
      context.stroke();
    }
  }
  context.globalAlpha = 1;

  const texture = new CanvasTexture(canvas);
  texture.name = `xinhua-${kind}-surface-128`;
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 2;
  return texture;
}

function mergeRoadMeshes(roads: Road[], styleName: RoadStyleName) {
  const style = ROAD_STYLES[styleName];
  const pieces: BufferGeometry[] = [];
  for (const road of roads.filter((candidate) => isSurfaceRoad(candidate) && roadStyle(candidate) === styleName)) {
    const width = roadWidth(road) * (road.highway.endsWith("_link") ? 0.78 : 1);
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
      const segment = new BoxGeometry(width, ROAD_MESH_HEIGHT, length);
      const matrix = slopedSegmentMatrix(start, end, y);
      segment.applyMatrix4(matrix);
      pieces.push(segment);
    }
    for (const [x, z] of road.points) {
      const join = new CylinderGeometry(
        width / 2,
        width / 2,
        ROAD_MESH_HEIGHT,
        10,
      );
      join.translate(x, terrainHeightAt(x, z) + y, z);
      pieces.push(join);
    }
  }
  if (pieces.length === 0) return null;
  const merged = mergeGeometries(pieces, false);
  pieces.forEach((piece) => piece.dispose());
  applyWorldPlanarUvs(merged, styleName === "lane" || styleName === "service" ? 4.8 : 6.5);
  applyRoadVertexColors(merged, ROAD_STYLES[styleName].color);
  return merged;
}

function mergeMinorRoadShoulders(roads: Road[]) {
  const pieces: BufferGeometry[] = [];
  for (const road of roads.filter((candidate) => (
    isSurfaceRoad(candidate) && ["lane", "service"].includes(roadStyle(candidate))
  ))) {
    const width = roadWidth(road) * (road.highway.endsWith("_link") ? 0.78 : 1)
      + 0.12 * XINHUA_ENVIRONMENT_SCALE;
    for (let index = 0; index < road.points.length - 1; index += 1) {
      const start = road.points[index];
      const end = road.points[index + 1];
      const length = Math.hypot(
        end[0] - start[0],
        terrainHeightAt(end[0], end[1]) - terrainHeightAt(start[0], start[1]),
        end[1] - start[1],
      );
      if (length < 0.02) continue;
      const shoulder = new BoxGeometry(width, 0.05, length + 0.1);
      shoulder.applyMatrix4(slopedSegmentMatrix(start, end, 0.085));
      pieces.push(shoulder);
    }
  }
  if (pieces.length === 0) return null;
  const merged = mergeGeometries(pieces, false);
  pieces.forEach((piece) => piece.dispose());
  applyWorldPlanarUvs(merged, 4.8);
  return merged;
}

function offsetSegment(
  start: readonly [number, number],
  end: readonly [number, number],
  offset: number,
): [[number, number], [number, number]] {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const length = Math.hypot(dx, dz);
  if (length < 0.001) return [[...start], [...end]];
  const normalX = dz / length;
  const normalZ = -dx / length;
  return [
    [start[0] + normalX * offset, start[1] + normalZ * offset],
    [end[0] + normalX * offset, end[1] + normalZ * offset],
  ];
}

function mergeXinhuaRoadEdgeMeshes() {
  const geometries = {
    curb: [] as BufferGeometry[],
    sidewalk: [] as BufferGeometry[],
    verge: [] as BufferGeometry[],
  };
  const specifications = [
    {
      key: "curb" as const,
      width: XINHUA_ROAD_CURB_WIDTH,
      offset: XINHUA_ROAD_ASPHALT_WIDTH / 2 + XINHUA_ROAD_CURB_WIDTH / 2,
      height: 0.18,
      y: 0.135,
    },
    {
      key: "sidewalk" as const,
      width: XINHUA_ROAD_SIDEWALK_WIDTH,
      offset: XINHUA_ROAD_ASPHALT_WIDTH / 2
        + XINHUA_ROAD_CURB_WIDTH
        + XINHUA_ROAD_SIDEWALK_WIDTH / 2,
      height: 0.12,
      y: 0.14,
    },
    {
      key: "verge" as const,
      width: XINHUA_ROAD_VERGE_WIDTH,
      offset: XINHUA_ROAD_ASPHALT_WIDTH / 2
        + XINHUA_ROAD_CURB_WIDTH
        + XINHUA_ROAD_SIDEWALK_WIDTH
        + XINHUA_ROAD_VERGE_WIDTH / 2,
      height: 0.055,
      y: 0.015,
    },
  ];

  for (const road of ROADS.filter((candidate) => candidate.name === "新华路" && isSurfaceRoad(candidate))) {
    for (let index = 0; index < road.points.length - 1; index += 1) {
      const start = road.points[index];
      const end = road.points[index + 1];
      for (const side of [-1, 1]) {
        for (const specification of specifications) {
          const [offsetStart, offsetEnd] = offsetSegment(
            start,
            end,
            specification.offset * side,
          );
          const length = Math.hypot(
            offsetEnd[0] - offsetStart[0],
            terrainHeightAt(offsetEnd[0], offsetEnd[1])
              - terrainHeightAt(offsetStart[0], offsetStart[1]),
            offsetEnd[1] - offsetStart[1],
          );
          if (length < 0.02) continue;
          const geometry = new BoxGeometry(
            specification.width,
            specification.height,
            length + 0.12 * XINHUA_ENVIRONMENT_SCALE,
          );
          geometry.applyMatrix4(slopedSegmentMatrix(offsetStart, offsetEnd, specification.y));
          geometries[specification.key].push(geometry);
        }
      }
    }
  }

  const merged = {
    curb: mergeGeometries(geometries.curb, false),
    sidewalk: mergeGeometries(geometries.sidewalk, false),
    verge: mergeGeometries(geometries.verge, false),
  };
  Object.values(geometries).flat().forEach((geometry) => geometry.dispose());
  return merged;
}

function mergeCenterLines(roads: Road[]) {
  const pieces: BufferGeometry[] = [];
  for (const road of roads.filter((candidate) => isSurfaceRoad(candidate)
    && ["arterial", "collector", "xinhua"].includes(roadStyle(candidate)))) {
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
      if (road.name === "新华路") {
        const planarLength = Math.hypot(dx, dz);
        const dashLength = 0.3 * XINHUA_ENVIRONMENT_SCALE;
        const dashGap = 0.42 * XINHUA_ENVIRONMENT_SCALE;
        for (
          let distance = 0.18 * XINHUA_ENVIRONMENT_SCALE;
          distance < planarLength - 0.1;
          distance += dashLength + dashGap
        ) {
          const endDistance = Math.min(planarLength, distance + dashLength);
          const dashStart: [number, number] = [
            start[0] + dx * distance / planarLength,
            start[1] + dz * distance / planarLength,
          ];
          const dashEnd: [number, number] = [
            start[0] + dx * endDistance / planarLength,
            start[1] + dz * endDistance / planarLength,
          ];
          const dash = new BoxGeometry(
            0.018 * XINHUA_ENVIRONMENT_SCALE,
            0.018,
            Math.hypot(
              dashEnd[0] - dashStart[0],
              terrainHeightAt(dashEnd[0], dashEnd[1])
                - terrainHeightAt(dashStart[0], dashStart[1]),
              dashEnd[1] - dashStart[1],
            ),
          );
          dash.applyMatrix4(slopedSegmentMatrix(dashStart, dashEnd, y));
          pieces.push(dash);
        }
        continue;
      }
      const line = new BoxGeometry(
        0.055 * XINHUA_ENVIRONMENT_SCALE,
        0.018,
        length * 0.86,
      );
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

function mergeXinhuaRoadLaneMeshes() {
  const cycleLanePieces: BufferGeometry[] = [];
  const separatorPieces: BufferGeometry[] = [];
  const cycleLaneWidth = 0.12 * XINHUA_ENVIRONMENT_SCALE;
  const edgeInset = 0.025 * XINHUA_ENVIRONMENT_SCALE;
  const laneOffset = XINHUA_ROAD_ASPHALT_WIDTH / 2 - edgeInset - cycleLaneWidth / 2;
  const separatorOffset = XINHUA_ROAD_ASPHALT_WIDTH / 2 - edgeInset - cycleLaneWidth;

  for (const road of ROADS.filter((candidate) => (
    candidate.name === "新华路" && isSurfaceRoad(candidate)
  ))) {
    for (let index = 0; index < road.points.length - 1; index += 1) {
      const start = road.points[index];
      const end = road.points[index + 1];
      for (const side of [-1, 1]) {
        const [laneStart, laneEnd] = offsetSegment(start, end, laneOffset * side);
        const lane = new BoxGeometry(
          cycleLaneWidth,
          0.012,
          Math.hypot(
            laneEnd[0] - laneStart[0],
            terrainHeightAt(laneEnd[0], laneEnd[1])
              - terrainHeightAt(laneStart[0], laneStart[1]),
            laneEnd[1] - laneStart[1],
          ) + 0.04,
        );
        lane.applyMatrix4(slopedSegmentMatrix(laneStart, laneEnd, 0.168));
        cycleLanePieces.push(lane);

        const [separatorStart, separatorEnd] = offsetSegment(
          start,
          end,
          separatorOffset * side,
        );
        const separator = new BoxGeometry(
          0.014 * XINHUA_ENVIRONMENT_SCALE,
          0.016,
          Math.hypot(
            separatorEnd[0] - separatorStart[0],
            terrainHeightAt(separatorEnd[0], separatorEnd[1])
              - terrainHeightAt(separatorStart[0], separatorStart[1]),
            separatorEnd[1] - separatorStart[1],
          ) + 0.04,
        );
        separator.applyMatrix4(slopedSegmentMatrix(separatorStart, separatorEnd, 0.181));
        separatorPieces.push(separator);
      }
    }
  }

  const merged = {
    cycleLanes: mergeGeometries(cycleLanePieces, false),
    separators: mergeGeometries(separatorPieces, false),
  };
  cycleLanePieces.forEach((geometry) => geometry.dispose());
  separatorPieces.forEach((geometry) => geometry.dispose());
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
  const texture = useMemo(() => createSurfaceTexture("ground"), []);
  const geometry = useMemo(() => {
    const ground = new BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const uvs: number[] = [];
    const low = new Color("#65714b");
    const high = new Color("#8d8f57");
    const dry = new Color("#b29a5d");
    const color = new Color();
    const addVertex = (x: number, z: number) => {
      const y = terrainHeightAt(x, z) - 0.06;
      positions.push(x, y, z);
      uvs.push(x / 17, z / 17);
      const heightMix = Math.min(1, Math.max(0, (y - 0.4) / 5.4));
      const broadVariation = (
        Math.sin(x * 0.057 + z * 0.041)
        + Math.sin(x * 0.021 - z * 0.073) * 0.55
        + 1.55
      ) / 3.1;
      color.lerpColors(low, high, Math.min(1, heightMix * 0.48 + broadVariation * 0.52));
      if (broadVariation > 0.64) {
        color.lerp(dry, (broadVariation - 0.64) * 0.52);
      }
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
    ground.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    ground.computeVertexNormals();
    return ground;
  }, []);
  useEffect(() => () => {
    geometry.dispose();
    texture?.dispose();
  }, [geometry, texture]);

  return (
    <>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial
          vertexColors
          map={texture}
          roughness={1}
          metalness={0}
          side={DoubleSide}
        />
      </mesh>
    </>
  );
}

function AsphaltRoadNetwork() {
  const roads = ROADS;
  const asphaltTexture = useMemo(() => createSurfaceTexture("asphalt"), []);
  const pathTexture = useMemo(() => createSurfaceTexture("path"), []);
  const geometries = useMemo(() => ({
    arterial: mergeRoadMeshes(roads, "arterial"),
    collector: mergeRoadMeshes(roads, "collector"),
    xinhua: mergeRoadMeshes(roads, "xinhua"),
    neighborhood: mergeRoadMeshes(roads, "neighborhood"),
    lane: mergeRoadMeshes(roads, "lane"),
    service: mergeRoadMeshes(roads, "service"),
    minorRoadShoulders: mergeMinorRoadShoulders(roads),
    centerLines: mergeCenterLines(roads),
    xinhuaLanes: mergeXinhuaRoadLaneMeshes(),
    xinhuaEdges: mergeXinhuaRoadEdgeMeshes(),
  }), [roads]);
  useEffect(() => () => {
    (Object.keys(ROAD_STYLES) as RoadStyleName[]).forEach(
      (styleName) => geometries[styleName]?.dispose(),
    );
    geometries.minorRoadShoulders?.dispose();
    geometries.centerLines?.dispose();
    Object.values(geometries.xinhuaLanes).forEach((geometry) => geometry.dispose());
    Object.values(geometries.xinhuaEdges).forEach((geometry) => geometry.dispose());
    asphaltTexture?.dispose();
    pathTexture?.dispose();
  }, [asphaltTexture, geometries, pathTexture]);

  return (
    <group data-road-network="osm-13469094">
      {geometries.minorRoadShoulders && (
        <mesh geometry={geometries.minorRoadShoulders} receiveShadow>
          <meshStandardMaterial
            color="#8d826d"
            map={pathTexture}
            roughness={1}
            metalness={0}
          />
        </mesh>
      )}
      {(Object.keys(ROAD_STYLES) as RoadStyleName[]).map((styleName) => {
        const geometry = geometries[styleName];
        if (!geometry) return null;
        return (
          <mesh key={styleName} geometry={geometry} receiveShadow>
            <meshStandardMaterial
              color="#ffffff"
              map={styleName === "lane" || styleName === "service" ? pathTexture : asphaltTexture}
              vertexColors
              roughness={0.97}
              metalness={0}
            />
          </mesh>
        );
      })}
      {geometries.centerLines && (
        <mesh geometry={geometries.centerLines} receiveShadow>
          <meshStandardMaterial color="#c7a744" roughness={0.92} metalness={0} />
        </mesh>
      )}
      <group
        name="xinhua-road-realistic-lane-treatment"
        userData={{ evidence: "2023-xinhua-road-near-panyu", collision: "none" }}
      >
        <mesh geometry={geometries.xinhuaLanes.cycleLanes} receiveShadow>
          <meshStandardMaterial color="#8d4c45" roughness={0.96} metalness={0} />
        </mesh>
        <mesh geometry={geometries.xinhuaLanes.separators} receiveShadow>
          <meshStandardMaterial color="#d7d4c8" roughness={0.92} metalness={0} />
        </mesh>
      </group>
      <group
        name="xinhua-road-sidewalk-system"
        userData={{ roadName: "新华路", treatment: "curb-sidewalk-verge" }}
      >
        <mesh geometry={geometries.xinhuaEdges.verge} receiveShadow>
          <meshStandardMaterial color="#74794a" roughness={0.96} />
        </mesh>
        <mesh geometry={geometries.xinhuaEdges.sidewalk} receiveShadow castShadow>
          <meshStandardMaterial color="#b8ad91" roughness={0.94} />
        </mesh>
        <mesh geometry={geometries.xinhuaEdges.curb} receiveShadow castShadow>
          <meshStandardMaterial color="#77726a" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

export const XINHUA_STREET_DRESSING_STATE = Object.freeze({
  lamps: Object.freeze({ visible: true, lit: false }),
  planters: Object.freeze({ visible: true, season: "summer" as const }),
  bins: Object.freeze({ visible: true, condition: "clean" as const }),
  shrubs: Object.freeze({ visible: true, season: "summer" as const }),
});

function XinhuaStreetDressing({ lowTier }: { lowTier: boolean }) {
  const placements = useMemo(
    () => buildXinhuaStreetDressingPlacements(lowTier),
    [lowTier],
  );
  const lamps: StreetLampPlacement[] = placements.lamps.map((placement) => ({
    ...placement,
    lit: XINHUA_STREET_DRESSING_STATE.lamps.lit,
    position: [
      placement.position[0],
      terrainHeightAt(placement.position[0], placement.position[1]) + 0.18,
      placement.position[1],
    ],
  }));
  const planters: StreetPlanterInstancePlacement[] = placements.planters.map((placement) => ({
    ...placement,
    position: [
      placement.position[0],
      terrainHeightAt(placement.position[0], placement.position[1]) + 0.13,
      placement.position[1],
    ],
  }));
  const bins: StreetBinInstancePlacement[] = placements.bins.map((placement) => ({
    ...placement,
    position: [
      placement.position[0],
      terrainHeightAt(placement.position[0], placement.position[1]) + 0.13,
      placement.position[1],
    ],
  }));
  const shrubs: StreetShrubInstancePlacement[] = placements.shrubs.map((placement) => ({
    ...placement,
    scale: placement.scale as [number, number, number],
    position: [
      placement.position[0],
      terrainHeightAt(placement.position[0], placement.position[1]) + 0.2,
      placement.position[1],
    ],
  }));
  const evidenceRef = "docs/research/street-surface-refinement-model-brief.md";

  return (
    <group
      name="xinhua-road-furnishing-zone"
      userData={{
        placement: "deterministic-curb-furnishing-zone",
        collision: "none",
        lowTier,
        evidenceRef,
      }}
    >
      {XINHUA_STREET_DRESSING_STATE.lamps.visible && (
        <StreetLampInstances
          name="xinhua-road-instanced-lamps"
          placements={lamps}
          evidenceRef={evidenceRef}
          lightMode="emissive-only"
        />
      )}
      {XINHUA_STREET_DRESSING_STATE.planters.visible && (
        <StreetPlanterInstances
          name="xinhua-road-instanced-planters"
          placements={planters}
          evidenceRef={evidenceRef}
          season={XINHUA_STREET_DRESSING_STATE.planters.season}
        />
      )}
      {XINHUA_STREET_DRESSING_STATE.bins.visible && (
        <StreetBinInstances
          name="xinhua-road-instanced-bins"
          placements={bins}
          evidenceRef={evidenceRef}
          condition={XINHUA_STREET_DRESSING_STATE.bins.condition}
        />
      )}
      {XINHUA_STREET_DRESSING_STATE.shrubs.visible && (
        <StreetShrubInstances
          name="xinhua-road-instanced-shrubs"
          placements={shrubs}
          evidenceRef={evidenceRef}
          season={XINHUA_STREET_DRESSING_STATE.shrubs.season}
        />
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

export function XinhuaStreetMap({
  showRoadLabels = true,
  showStreetDressing = true,
  lowTier = false,
}: {
  showRoadLabels?: boolean;
  showStreetDressing?: boolean;
  lowTier?: boolean;
}) {
  return (
    <group data-map-scale={`${mapData.meta.metersPerSceneUnit}-metres-per-unit`}>
      <MapGround />
      <AsphaltRoadNetwork />
      {showStreetDressing && <XinhuaStreetDressing lowTier={lowTier} />}
      <DistrictBoundary />
      {showRoadLabels && <RoadLabels />}
    </group>
  );
}
