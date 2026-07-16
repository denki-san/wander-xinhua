"use client";

import { Html } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  Object3D,
  Shape,
  ShapeGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import landmarks from "./xinhua-landmarks-data.json";
import { isPointInsidePolygon, type MapObstacle, type MapPolygonPoint } from "./world-math";

type Path = { id: number; points: [number, number][] };

const PARK = landmarks.huashanGreenland;
export const HUASHAN_GREEN_POSITION = PARK.position as [number, number];
const PARK_POSITION = HUASHAN_GREEN_POSITION;
const PARK_BOUNDARY: MapPolygonPoint[] = PARK.boundary.map(([x, z]) => [x, z]);
const PARK_PATHS = PARK.paths as Path[];
const POND = { x: -7.8, z: 39.2, radiusX: 9.4, radiusZ: 4.5 };
const POND_BRIDGE_CLEARANCE = 2.4;
const POND_COLLISION_RADIUS_X = POND.radiusX * 0.88;
const POND_COLLISION_RADIUS_Z = POND.radiusZ * 0.82;

function offsetObstacle(obstacle: MapObstacle): MapObstacle {
  return {
    minX: PARK_POSITION[0] + obstacle.minX,
    maxX: PARK_POSITION[0] + obstacle.maxX,
    minZ: PARK_POSITION[1] + obstacle.minZ,
    maxZ: PARK_POSITION[1] + obstacle.maxZ,
  };
}

const HUASHAN_FIXED_OBSTACLES: MapObstacle[] = [
  offsetObstacle(PARK.serviceBuilding.collision),
  // 水面分成栈桥两侧，给旋转后的桥面和角色半径留出完整通行廊道。
  offsetObstacle({
    minX: POND.x - POND_COLLISION_RADIUS_X,
    maxX: POND.x + POND_COLLISION_RADIUS_X,
    minZ: POND.z + POND_BRIDGE_CLEARANCE,
    maxZ: POND.z + POND_COLLISION_RADIUS_Z,
  }),
  offsetObstacle({
    minX: POND.x - POND_COLLISION_RADIUS_X,
    maxX: POND.x + POND_COLLISION_RADIUS_X,
    minZ: POND.z - POND_COLLISION_RADIUS_Z,
    maxZ: POND.z - POND_BRIDGE_CLEARANCE,
  }),
];

// 树干仍阻挡角色，但不参与每帧镜头视线判断，避免林地镜头检测被细小障碍拖慢。
export const HUASHAN_GREEN_CAMERA_OBSTACLES: MapObstacle[] = [...HUASHAN_FIXED_OBSTACLES];

function polygonGeometry(points: readonly MapPolygonPoint[]) {
  const shape = new Shape();
  points.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  shape.closePath();
  const geometry = new ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function segmentIntersectionT(
  start: MapPolygonPoint,
  end: MapPolygonPoint,
  edgeStart: MapPolygonPoint,
  edgeEnd: MapPolygonPoint,
) {
  const rx = end[0] - start[0];
  const rz = end[1] - start[1];
  const sx = edgeEnd[0] - edgeStart[0];
  const sz = edgeEnd[1] - edgeStart[1];
  const cross = rx * sz - rz * sx;
  if (Math.abs(cross) < 1e-9) return null;
  const qx = edgeStart[0] - start[0];
  const qz = edgeStart[1] - start[1];
  const t = (qx * sz - qz * sx) / cross;
  const u = (qx * rz - qz * rx) / cross;
  return t > 1e-6 && t < 1 - 1e-6 && u >= 0 && u <= 1 ? t : null;
}

/** 把 OSM 园路逐段裁到绿地多边形内，避免入口连接线在草地外形成“建筑基底”。 */
function clippedPathSegments(paths: Path[]) {
  const clipped: { start: MapPolygonPoint; end: MapPolygonPoint; width: number }[] = [];
  for (const path of paths) {
    const width = path.points.length <= 2 ? 0.5 : 0.72;
    for (let index = 0; index < path.points.length - 1; index += 1) {
      const start = path.points[index] as MapPolygonPoint;
      const end = path.points[index + 1] as MapPolygonPoint;
      const cuts = [0, 1];
      for (let edge = 0; edge < PARK_BOUNDARY.length; edge += 1) {
        const t = segmentIntersectionT(
          start,
          end,
          PARK_BOUNDARY[edge],
          PARK_BOUNDARY[(edge + 1) % PARK_BOUNDARY.length],
        );
        if (t !== null) cuts.push(t);
      }
      cuts.sort((a, b) => a - b);
      const uniqueCuts = cuts.filter((cut, cutIndex) => cutIndex === 0 || Math.abs(cut - cuts[cutIndex - 1]) > 1e-6);
      for (let cutIndex = 0; cutIndex < uniqueCuts.length - 1; cutIndex += 1) {
        const from = uniqueCuts[cutIndex];
        const to = uniqueCuts[cutIndex + 1];
        const middle = (from + to) / 2;
        const middleX = start[0] + (end[0] - start[0]) * middle;
        const middleZ = start[1] + (end[1] - start[1]) * middle;
        if (!isPointInsidePolygon(middleX, middleZ, PARK_BOUNDARY)) continue;
        clipped.push({
          start: [start[0] + (end[0] - start[0]) * from, start[1] + (end[1] - start[1]) * from],
          end: [start[0] + (end[0] - start[0]) * to, start[1] + (end[1] - start[1]) * to],
          width,
        });
      }
    }
  }
  return clipped;
}

function mergePathGeometry(paths: Path[]) {
  const pieces: BufferGeometry[] = [];
  for (const { start, end, width } of clippedPathSegments(paths)) {
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const length = Math.hypot(dx, dz);
    if (length < 0.05) continue;
    const segment = new BoxGeometry(width, 0.08, length);
    const matrix = new Matrix4().makeRotationY(Math.atan2(dx, dz));
    matrix.setPosition((start[0] + end[0]) / 2, 0.11, (start[1] + end[1]) / 2);
    segment.applyMatrix4(matrix);
    pieces.push(segment);
    for (const [x, z] of [start, end]) {
      const join = new CylinderGeometry(width / 2, width / 2, 0.08, 10);
      join.translate(x, 0.11, z);
      pieces.push(join);
    }
  }
  const merged = mergeGeometries(pieces, false);
  pieces.forEach((piece) => piece.dispose());
  return merged;
}

function ParkGroundAndPaths() {
  const ground = useMemo(() => polygonGeometry(PARK_BOUNDARY), []);
  const paths = useMemo(() => mergePathGeometry(PARK_PATHS), []);
  useEffect(() => () => {
    ground.dispose();
    paths.dispose();
  }, [ground, paths]);
  return (
    <group>
      <mesh geometry={ground} position={[0, 0.08, 0]} receiveShadow>
        <meshToonMaterial color="#6f8b62" side={DoubleSide} />
      </mesh>
      <mesh geometry={paths} receiveShadow>
        <meshToonMaterial color="#aaa38f" />
      </mesh>
    </group>
  );
}

function distanceToPathSegment(x: number, z: number, start: [number, number], end: [number, number]) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (
    (x - start[0]) * dx + (z - start[1]) * dz
  ) / lengthSquared));
  return Math.hypot(x - (start[0] + dx * t), z - (start[1] + dz * t));
}

function isNearParkPath(x: number, z: number) {
  return PARK_PATHS.some((path) => path.points.slice(1).some((end, index) => (
    distanceToPathSegment(x, z, path.points[index], end) < 1.65
  )));
}

const FOREST_TREES = Array.from({ length: 320 }, (_, index) => {
  const x = -39 + ((index * 37) % 790) / 10;
  const z = -55 + ((index * 53) % 1180) / 10;
  return { x, z, index };
}).filter(({ x, z }) => (
  isPointInsidePolygon(x, z, PARK_BOUNDARY)
  && !isNearParkPath(x, z)
  && Math.hypot((x - POND.x) / 1.4, z - POND.z) > 8
  && !(x > 8 && x < 22 && z > 31 && z < 48)
  && !(x > 20 && z > -3 && z < 22)
)).slice(0, 112);

const FOREST_UNDERSTORY = FOREST_TREES.slice(0, 84).map(({ x, z, index }) => ({
  x: x + (index % 3 - 1) * 1.05,
  z: z + (index % 5 - 2) * 0.48,
  index,
})).filter(({ x, z }) => isPointInsidePolygon(x, z, PARK_BOUNDARY) && !isNearParkPath(x, z));

export const HUASHAN_GREEN_OBSTACLES: MapObstacle[] = [
  ...HUASHAN_FIXED_OBSTACLES,
  ...FOREST_TREES.map(({ x, z }) => offsetObstacle({
    minX: x - 0.22,
    maxX: x + 0.22,
    minZ: z - 0.22,
    maxZ: z + 0.22,
  })),
];

function ForestInstances() {
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    FOREST_TREES.forEach(({ x, z, index }, instance) => {
      const height = 7.8 + (index % 7) * 0.58;
      const width = 2.55 + (index % 5) * 0.22;
      dummy.position.set(x, height * 0.42, z);
      dummy.scale.set(0.68 + index % 3 * 0.08, height * 0.82, 0.68 + index % 3 * 0.08);
      dummy.rotation.y = index * 1.73;
      dummy.updateMatrix();
      trunks.current?.setMatrixAt(instance, dummy.matrix);

      dummy.position.set(x, height, z);
      dummy.scale.set(width, 2.15 + index % 4 * 0.18, width);
      dummy.rotation.y = index * 0.91;
      dummy.updateMatrix();
      crowns.current?.setMatrixAt(instance, dummy.matrix);
    });
    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true;
    if (crowns.current) crowns.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group name="huashan-greenland-forest" userData={{ feature: "urban-forest" }}>
      <instancedMesh ref={trunks} args={[undefined, undefined, FOREST_TREES.length]} castShadow>
        <cylinderGeometry args={[0.13, 0.2, 1, 7]} />
        <meshToonMaterial color="#655848" />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, FOREST_TREES.length]} castShadow receiveShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshToonMaterial color="#3f6d49" />
      </instancedMesh>
    </group>
  );
}

function UnderstoryInstances() {
  const shrubs = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    FOREST_UNDERSTORY.forEach(({ x, z, index }, instance) => {
      dummy.position.set(x, 0.5 + index % 3 * 0.08, z);
      dummy.scale.set(0.52 + index % 4 * 0.09, 0.48 + index % 3 * 0.08, 0.52 + index % 4 * 0.09);
      dummy.rotation.y = index * 0.83;
      dummy.updateMatrix();
      shrubs.current?.setMatrixAt(instance, dummy.matrix);
    });
    if (shrubs.current) shrubs.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={shrubs} args={[undefined, undefined, FOREST_UNDERSTORY.length]} receiveShadow>
      <icosahedronGeometry args={[1, 1]} />
      <meshToonMaterial color="#55784b" />
    </instancedMesh>
  );
}

function PondGarden() {
  return (
    <group name="huashan-water-and-boardwalk" position={[POND.x, 0.18, POND.z]} userData={{ landscape: "water-and-boardwalk" }}>
      <mesh rotation-x={-Math.PI / 2} scale={[POND.radiusX, POND.radiusZ, 1]} receiveShadow>
        <circleGeometry args={[1, 40]} />
        <meshToonMaterial color="#78a89b" transparent opacity={0.9} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.04, 0]} scale={[POND.radiusX + 0.55, POND.radiusZ + 0.55, 1]}>
        <ringGeometry args={[0.91, 1, 40]} />
        <meshToonMaterial color="#8c7f65" />
      </mesh>
      <group rotation-y={0.13} position={[0.4, 0.03, 0]}>
        {Array.from({ length: 24 }, (_, index) => (
          <mesh key={index} position={[(index - 11.5) * 0.72, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.66, 0.16, 1.62]} />
            <meshToonMaterial color={index % 2 ? "#8f6a47" : "#a47b52"} />
          </mesh>
        ))}
        {[-8.35, 8.35].map((x) => (
          <mesh key={x} position={[x, 0.38, 0.72]} castShadow>
            <boxGeometry args={[0.08, 0.7, 0.08]} />
            <meshToonMaterial color="#3f5145" />
          </mesh>
        ))}
      </group>
      {Array.from({ length: 16 }, (_, index) => {
        const angle = index * 2.13;
        return (
          <group key={index} position={[Math.cos(angle) * 7.6, 0.1, Math.sin(angle) * 3.5]}>
            <mesh position={[0, 0.46, 0]} castShadow>
              <cylinderGeometry args={[0.035, 0.045, 0.9, 6]} />
              <meshToonMaterial color="#526d46" />
            </mesh>
            {index % 3 === 0 && (
              <mesh position={[0, 0.96, 0]} castShadow>
                <cylinderGeometry args={[0.09, 0.09, 0.34, 8]} />
                <meshToonMaterial color="#755542" />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function BasketballCourt() {
  const court = PARK.basketballCourt;
  return (
    <group
      name="huashan-basketball-court"
      position={[court.position[0], 0.18, court.position[1]]}
      rotation-y={court.rotationY}
      userData={{ sport: "basketball", osmWayId: court.osmWayId }}
    >
      <mesh receiveShadow>
        <boxGeometry args={[court.width + 0.7, 0.12, court.depth + 0.7]} />
        <meshToonMaterial color="#375c4d" />
      </mesh>
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[court.width, 0.06, court.depth]} />
        <meshToonMaterial color="#b76450" />
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <boxGeometry args={[0.06, 0.03, court.depth * 0.94]} />
        <meshBasicMaterial color="#eee4c8" />
      </mesh>
      {[-1, 1].map((sign) => (
        <group key={sign} position={[sign * (court.width / 2 - 0.65), 0, 0]} rotation-y={sign < 0 ? Math.PI : 0}>
          <mesh position={[0, 1.45, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 2.9, 8]} />
            <meshToonMaterial color="#31423d" />
          </mesh>
          <mesh position={[0.12, 2.65, 0]} rotation-y={Math.PI / 2} castShadow>
            <boxGeometry args={[0.08, 0.95, 1.28]} />
            <meshToonMaterial color="#e2ded0" />
          </mesh>
          <mesh position={[-0.06, 2.35, 0]} rotation-y={Math.PI / 2} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.3, 0.035, 8, 20]} />
            <meshToonMaterial color="#c25745" />
          </mesh>
        </group>
      ))}
      {Array.from({ length: 20 }, (_, index) => {
        const alongX = index < 10;
        const offset = (index % 10) / 9 - 0.5;
        return (
          <mesh
            key={index}
            position={alongX
              ? [offset * (court.width + 0.4), 1.35, index % 2 ? court.depth / 2 + 0.42 : -court.depth / 2 - 0.42]
              : [index % 2 ? court.width / 2 + 0.42 : -court.width / 2 - 0.42, 1.35, offset * (court.depth + 0.4)]}
            castShadow
          >
            <cylinderGeometry args={[0.035, 0.045, 2.7, 6]} />
            <meshToonMaterial color="#344b42" />
          </mesh>
        );
      })}
    </group>
  );
}

function ParkFacilities() {
  const service = PARK.serviceBuilding;
  return (
    <group>
      <group position={[service.position[0], 0.72, service.position[1]]} rotation-y={service.rotationY}>
        <mesh castShadow>
          <boxGeometry args={[service.width, 1.35, service.depth]} />
          <meshToonMaterial color="#d8cfbb" />
        </mesh>
        <mesh position={[0, 0.78, 0]} rotation-y={Math.PI / 4} castShadow>
          <coneGeometry args={[0.86, 0.48, 4]} />
          <meshToonMaterial color="#4d6854" />
        </mesh>
      </group>
      <group name="huashan-bird-pergola" position={[-25, 0.22, 17.5]} userData={{ landscape: "bird-pergola" }}>
        {Array.from({ length: 9 }, (_, index) => {
          const angle = index / 8 * Math.PI;
          return (
            <mesh key={index} position={[Math.cos(angle) * 2.4, 1.45 + Math.sin(angle) * 1.5, 0]} rotation-z={angle - Math.PI / 2} castShadow>
              <cylinderGeometry args={[0.045, 0.045, 3.1, 6]} />
              <meshToonMaterial color="#385743" />
            </mesh>
          );
        })}
        <mesh position={[0, 0.18, 0]} castShadow>
          <boxGeometry args={[5.2, 0.16, 2.2]} />
          <meshToonMaterial color="#94836a" />
        </mesh>
      </group>
      <group name="huashan-happiness-corner" position={[25, 0.16, 10]} userData={{ landscape: "happiness-corner" }}>
        {[-2.4, 0, 2.4].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            {[-1.1, 1.1].map((z) => (
              <mesh key={z} position={[0, 1.25, z]} castShadow>
                <boxGeometry args={[0.12, 2.5, 0.12]} />
                <meshToonMaterial color="#ece6d7" />
              </mesh>
            ))}
            <mesh position={[0, 2.48, 0]} castShadow>
              <boxGeometry args={[0.15, 0.15, 2.35]} />
              <meshToonMaterial color="#ece6d7" />
            </mesh>
          </group>
        ))}
        {Array.from({ length: 18 }, (_, index) => (
          <mesh key={index} position={[-3.3 + index % 7 * 1.05, 0.26, -2.1 + Math.floor(index / 7) * 2.1]} castShadow>
            <icosahedronGeometry args={[0.32 + index % 3 * 0.04, 1]} />
            <meshToonMaterial color={["#d98078", "#e8b78c", "#f0d7a2"][index % 3]} />
          </mesh>
        ))}
      </group>
      {[[6, 52], [-18, 30], [13, -12], [-4, -28], [-31, 51]].map(([x, z], index) => (
        <group key={`${x}-${z}`} position={[x, 0.2, z]} rotation-y={index * 0.7}>
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[2.1, 0.18, 0.65]} />
            <meshToonMaterial color="#8b674b" />
          </mesh>
          {[-0.8, 0.8].map((leg) => (
            <mesh key={leg} position={[leg, 0.15, 0]} castShadow>
              <boxGeometry args={[0.12, 0.45, 0.48]} />
              <meshToonMaterial color="#33453e" />
            </mesh>
          ))}
        </group>
      ))}
      {[[2, -18], [19, 22], [-31, 8], [6, 31], [-23, 49], [28, 47]].map(([x, z]) => (
        <group key={`${x}-${z}`} position={[x, 0.2, z]}>
          <mesh position={[0, 1.6, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.09, 3.2, 8]} />
            <meshToonMaterial color="#354942" />
          </mesh>
          <mesh position={[0, 3.15, 0]} castShadow>
            <sphereGeometry args={[0.22, 10, 8]} />
            <meshToonMaterial color="#f2dca2" emissive="#8a6f42" emissiveIntensity={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function HuashanGreenBlock() {
  return (
    <group
      name="huashan-greenland"
      position={[PARK_POSITION[0], 0.16, PARK_POSITION[1]]}
      userData={{ landmark: "huashan-greenland", osmWayId: 444342095 }}
    >
      <ParkGroundAndPaths />
      <ForestInstances />
      <UnderstoryInstances />
      <PondGarden />
      <BasketballCourt />
      <ParkFacilities />
      <Html center transform sprite position={[0, 8.8, -3]} distanceFactor={34} style={{ pointerEvents: "none" }}>
        <span className="map-road-label map-landmark-label">华山绿地</span>
      </Html>
    </group>
  );
}
