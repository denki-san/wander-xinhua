"use client";

import {
  Float,
  Html,
  RoundedBox,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  Group,
  Matrix4,
  Quaternion,
  Vector3,
} from "three";
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { inputState, resetInput } from "./input";
import {
  composeCameraOffset,
  isPlanarPositionBlocked,
  type MapObstacle,
  resolvePlanarMovement,
  rotateTangentTowards,
} from "./world-math";

const WORLD_UP = new Vector3(0, 1, 0);
const CAMERA_DISTANCE = 7.4;
const CAMERA_HEIGHT = 5.0;
const CAMERA_FOLLOW_YAW_SPEED = 3.4;
const CAMERA_DEFAULT_PITCH = CAMERA_HEIGHT / Math.hypot(CAMERA_DISTANCE, CAMERA_HEIGHT);
const PLAYER_RADIUS = 0.48;
const MAP_BOUNDS = { minX: -24, maxX: 24, minZ: -31, maxZ: 31 } as const;
const ACTION_POSITION = new Vector3(3.8, 0.3, -11.5);

const BUILDINGS = [
  { x: -8.2, z: 23, yaw: Math.PI / 2, width: 5.2, depth: 3.4, floors: 3, color: "#e4d8bf", trim: "#546b65", accent: "#d26f55", roof: "flat" },
  { x: -8.3, z: 15, yaw: Math.PI / 2, width: 4.5, depth: 3.1, floors: 2, color: "#dca17f", trim: "#745142", accent: "#e7c36c", roof: "gable" },
  { x: -8.4, z: 7, yaw: Math.PI / 2, width: 5.1, depth: 3.4, floors: 3, color: "#d9c9aa", trim: "#496960", accent: "#d7664d", roof: "flat" },
  { x: -8.2, z: -16, yaw: Math.PI / 2, width: 4.7, depth: 3.0, floors: 2, color: "#c9745d", trim: "#5f433b", accent: "#e7bf58", roof: "gable" },
  { x: -8.3, z: -24, yaw: Math.PI / 2, width: 5.2, depth: 3.4, floors: 3, color: "#e2d1b5", trim: "#426a61", accent: "#d96b53", roof: "flat" },
  { x: 8.2, z: 23, yaw: -Math.PI / 2, width: 4.5, depth: 3.2, floors: 2, color: "#d98b6c", trim: "#694b42", accent: "#efc35c", roof: "gable" },
  { x: 8.3, z: 15, yaw: -Math.PI / 2, width: 5.0, depth: 3.4, floors: 3, color: "#e6ddc7", trim: "#4b6d65", accent: "#cc6852", roof: "flat" },
  { x: 8.2, z: 6, yaw: -Math.PI / 2, width: 4.6, depth: 3.2, floors: 2, color: "#d6a37e", trim: "#715044", accent: "#e4be5c", roof: "gable" },
  { x: 8.4, z: -17, yaw: -Math.PI / 2, width: 5.2, depth: 3.5, floors: 3, color: "#dbd2bd", trim: "#4d6d66", accent: "#cf7159", roof: "flat" },
  { x: 8.2, z: -25, yaw: -Math.PI / 2, width: 4.5, depth: 3.0, floors: 2, color: "#ca755d", trim: "#5c443d", accent: "#edc865", roof: "gable" },
  { x: -17.5, z: -11.2, yaw: 0, width: 5.2, depth: 3.2, floors: 2, color: "#e2d6be", trim: "#486860", accent: "#d96d52", roof: "flat" },
  { x: 17.5, z: -2.8, yaw: Math.PI, width: 5.4, depth: 3.2, floors: 3, color: "#d99573", trim: "#64483e", accent: "#e8bd57", roof: "flat" },
] as const;

const TREE_POINTS = [
  [-5.2, 27, 0.95], [5.2, 27, 1.05], [-5.2, 18, 1.08], [5.2, 18, 0.95],
  [-5.2, 9, 1.06], [5.2, 8, 1.0], [-5.1, -18, 1.05], [5.2, -20, 0.95],
  [-21, 25, 1.0], [21, 24, 1.08], [-20, -25, 1.1], [20, -24, 0.95],
  [-20, 2, 0.92], [20, 7, 0.9],
] as const;

const BUILDING_OBSTACLES: MapObstacle[] = BUILDINGS.map((building) => {
  const cos = Math.abs(Math.cos(building.yaw));
  const sin = Math.abs(Math.sin(building.yaw));
  const halfX = (building.width * cos + building.depth * sin) / 2 + 0.3;
  const halfZ = (building.width * sin + building.depth * cos) / 2 + 0.3;
  return {
    minX: building.x - halfX,
    maxX: building.x + halfX,
    minZ: building.z - halfZ,
    maxZ: building.z + halfZ,
  };
});

function GroundAnchor({
  x,
  z,
  y = 0,
  yaw = 0,
  children,
}: {
  x: number;
  z: number;
  y?: number;
  yaw?: number;
  children: ReactNode;
}) {
  return (
    <group position={[x, y, z]} rotation-y={yaw}>
      {children}
    </group>
  );
}

function NeighborhoodRoads() {
  return (
    <group>
      <mesh position={[0, 0.16, 0]} receiveShadow>
        <boxGeometry args={[7.2, 0.16, 62]} />
        <meshBasicMaterial color="#e8dcc0" />
      </mesh>
      <mesh position={[0, 0.165, -7]} receiveShadow>
        <boxGeometry args={[48, 0.17, 6.4]} />
        <meshBasicMaterial color="#d9cdb1" />
      </mesh>
      <mesh position={[-13, 0.17, 12.5]} receiveShadow>
        <boxGeometry args={[19, 0.18, 3.7]} />
        <meshBasicMaterial color="#efe5cb" />
      </mesh>
      {[-25, -16, 2, 11, 20, 28].map((z) => (
        <mesh key={z} position={[0, 0.25, z]}>
            <boxGeometry args={[0.12, 0.035, 1.4]} />
            <meshBasicMaterial color="#f5ead1" />
        </mesh>
      ))}
      {[-5.25, 5.25].map((x) => (
        <mesh key={x} position={[x, 0.16, 0]} receiveShadow>
          <boxGeometry args={[2.9, 0.16, 62]} />
          <meshBasicMaterial color="#bdae8d" />
        </mesh>
      ))}
      {[-17, -11, 11, 17].map((x) => (
        <mesh key={x} position={[x, 0.165, -11.4]} receiveShadow>
          <boxGeometry args={[5.1, 0.17, 2.2]} />
          <meshBasicMaterial color="#bdae8d" />
        </mesh>
      ))}
    </group>
  );
}

function ShikumenBuilding({
  width,
  depth,
  floors,
  color,
  trim,
  accent,
  roof,
}: {
  width: number;
  depth: number;
  floors: number;
  color: string;
  trim: string;
  accent: string;
  roof: "flat" | "gable";
}) {
  const height = floors * 1.75 + 0.65;
  const windows = useMemo(
    () => Array.from({ length: floors * 3 }, (_, index) => ({
      floor: Math.floor(index / 3),
      column: index % 3,
    })),
    [floors],
  );

  return (
    <group>
      <RoundedBox args={[width, height, depth]} radius={0.12} smoothness={2} position={[0, height / 2, 0]} castShadow receiveShadow>
        <meshToonMaterial color={color} />
      </RoundedBox>

      <mesh position={[0, height - 0.22, depth / 2 + 0.035]} castShadow>
        <boxGeometry args={[width + 0.18, 0.22, 0.16]} />
        <meshToonMaterial color={trim} />
      </mesh>
      <mesh position={[0, 0.34, depth / 2 + 0.12]} castShadow>
        <boxGeometry args={[1.45, 0.68, 0.25]} />
        <meshToonMaterial color={trim} />
      </mesh>
      <mesh position={[0, 0.72, depth / 2 + 0.14]} castShadow>
        <torusGeometry args={[0.72, 0.13, 5, 18, Math.PI]} />
        <meshToonMaterial color={trim} />
      </mesh>
      <mesh position={[0, 0.62, depth / 2 + 0.27]} castShadow>
        <boxGeometry args={[0.68, 1.08, 0.12]} />
        <meshToonMaterial color="#3e5350" />
      </mesh>

      {windows.map(({ floor, column }) => {
        const x = (column - 1) * (width * 0.27);
        const y = 1.58 + floor * 1.68;
        return (
          <group key={`${floor}-${column}`} position={[x, y, depth / 2 + 0.11]}>
            <mesh castShadow>
              <boxGeometry args={[0.7, 0.82, 0.13]} />
              <meshToonMaterial color={trim} />
            </mesh>
            <mesh position={[0, 0, 0.075]}>
              <boxGeometry args={[0.48, 0.58, 0.035]} />
              <meshToonMaterial color={floor % 2 === 0 ? "#8bb7ae" : "#ead79f"} />
            </mesh>
            <mesh position={[0, 0, 0.105]}>
              <boxGeometry args={[0.045, 0.58, 0.025]} />
              <meshBasicMaterial color="#39514e" />
            </mesh>
          </group>
        );
      })}

      {floors >= 3 && (
        <group position={[-width * 0.34, 2.95, depth / 2 + 0.27]}>
          <mesh castShadow>
            <boxGeometry args={[0.9, 0.56, 0.42]} />
            <meshToonMaterial color="#d8d6c5" />
          </mesh>
          <mesh position={[0, 0, 0.22]}>
            <circleGeometry args={[0.18, 14]} />
            <meshBasicMaterial color="#6f7e78" />
          </mesh>
        </group>
      )}

      <mesh position={[width * 0.28, 1.15, depth / 2 + 0.34]} rotation-z={-0.035} castShadow>
        <boxGeometry args={[1.25, 0.48, 0.14]} />
        <meshToonMaterial color={accent} />
      </mesh>
      <mesh position={[width * 0.28, 1.15, depth / 2 + 0.42]}>
        <boxGeometry args={[0.78, 0.07, 0.025]} />
        <meshBasicMaterial color="#fff0be" />
      </mesh>

      {roof === "gable" ? (
        <mesh position={[0, height + 0.5, 0]} rotation-y={Math.PI / 4} castShadow>
          <coneGeometry args={[Math.max(width, depth) * 0.52, 1.05, 4]} />
          <meshToonMaterial color="#4d6660" />
        </mesh>
      ) : (
        <group position={[0, height + 0.17, 0]}>
          <mesh castShadow>
            <boxGeometry args={[width + 0.35, 0.32, depth + 0.35]} />
            <meshToonMaterial color="#62746d" />
          </mesh>
          <mesh position={[width * 0.28, 0.37, 0]} castShadow>
            <boxGeometry args={[0.72, 0.55, 0.72]} />
            <meshToonMaterial color="#b7b5a4" />
          </mesh>
        </group>
      )}

      <group position={[-width * 0.22, height + 0.55, 0]}>
        <mesh position={[0, 0.48, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.11, 0.95, 8]} />
          <meshToonMaterial color="#344a46" />
        </mesh>
        <mesh position={[0, 0.99, 0]} rotation-z={0.2} castShadow>
          <boxGeometry args={[0.52, 0.08, 0.08]} />
          <meshToonMaterial color="#344a46" />
        </mesh>
      </group>
    </group>
  );
}

function PlaneTree({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 1.35, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.34, 2.7, 8]} />
        <meshToonMaterial color="#765f49" />
      </mesh>
      <mesh position={[-0.35, 2.65, 0]} rotation-z={-0.45} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.55, 7]} />
        <meshToonMaterial color="#765f49" />
      </mesh>
      <mesh position={[0.38, 2.75, 0]} rotation-z={0.5} castShadow>
        <cylinderGeometry args={[0.11, 0.18, 1.45, 7]} />
        <meshToonMaterial color="#765f49" />
      </mesh>
      {[
        [-0.65, 3.55, 0.12, 1.05], [0.18, 3.85, -0.2, 1.18],
        [0.8, 3.5, 0.12, 0.95], [-0.05, 3.25, 0.58, 0.9],
      ].map(([x, y, z, s], index) => (
        <mesh key={index} position={[x, y, z]} scale={s} castShadow>
          <icosahedronGeometry args={[0.9, 1]} />
          <meshToonMaterial color={index % 2 ? "#4e8768" : "#3d715b"} />
        </mesh>
      ))}
    </group>
  );
}

function StreetLamp() {
  return (
    <group>
      <mesh position={[0, 1.55, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.13, 3.1, 8]} />
        <meshToonMaterial color="#304b47" />
      </mesh>
      <mesh position={[0.32, 3.0, 0]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.65, 8]} />
        <meshToonMaterial color="#304b47" />
      </mesh>
      <mesh position={[0.66, 2.82, 0]} castShadow>
        <boxGeometry args={[0.42, 0.5, 0.42]} />
        <meshToonMaterial color="#f0cd72" />
      </mesh>
      <pointLight position={[0.66, 2.8, 0]} color="#ffd987" intensity={0.7} distance={5} />
    </group>
  );
}

function Bicycle({ color = "#d05e4b" }: { color?: string }) {
  return (
    <group scale={0.72} rotation-y={0.2}>
      {[-0.72, 0.72].map((x) => (
        <mesh key={x} position={[x, 0.56, 0]} rotation-y={Math.PI / 2} castShadow>
          <torusGeometry args={[0.5, 0.075, 8, 24]} />
          <meshToonMaterial color="#2e403d" />
        </mesh>
      ))}
      <mesh position={[0, 0.78, 0]} rotation-z={-0.12} castShadow>
        <boxGeometry args={[1.45, 0.09, 0.09]} />
        <meshToonMaterial color={color} />
      </mesh>
      <mesh position={[-0.25, 1.04, 0]} rotation-z={0.65} castShadow>
        <boxGeometry args={[0.78, 0.09, 0.09]} />
        <meshToonMaterial color={color} />
      </mesh>
      <mesh position={[0.45, 1.12, 0]} rotation-z={-0.72} castShadow>
        <boxGeometry args={[0.82, 0.09, 0.09]} />
        <meshToonMaterial color={color} />
      </mesh>
      <mesh position={[0.55, 1.55, 0]} castShadow>
        <boxGeometry args={[0.62, 0.08, 0.08]} />
        <meshToonMaterial color="#304744" />
      </mesh>
    </group>
  );
}

function Bench() {
  return (
    <group>
      {[0.42, 0.78].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <boxGeometry args={[1.8, 0.18, 0.34]} />
          <meshToonMaterial color="#9a6b4b" />
        </mesh>
      ))}
      {[-0.68, 0.68].map((x) => (
        <mesh key={x} position={[x, 0.22, 0]} castShadow>
          <boxGeometry args={[0.13, 0.5, 0.46]} />
          <meshToonMaterial color="#344c48" />
        </mesh>
      ))}
    </group>
  );
}

function ActionInstallation({ onOpenAction }: { onOpenAction: () => void }) {
  return (
    <GroundAnchor x={ACTION_POSITION.x} z={ACTION_POSITION.z} y={ACTION_POSITION.y} yaw={-0.15}>
      <group
        data-action-point="one-square-metre"
        onClick={(event) => {
          event.stopPropagation();
          onOpenAction();
        }}
      >
        <mesh position={[0, 0.05, 0]} receiveShadow>
          <boxGeometry args={[2.35, 0.12, 2.35]} />
          <meshToonMaterial color="#e8b94f" />
        </mesh>
        <mesh position={[0, 0.12, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[1.45, 0.09, 8, 42]} />
          <meshBasicMaterial color="#fff1b1" />
        </mesh>
        {[[-0.94, -0.94], [0.94, -0.94], [-0.94, 0.94], [0.94, 0.94]].map(([x, z], index) => (
          <group key={index} position={[x, 0.28, z]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.24, 0.3, 0.48, 8]} />
              <meshToonMaterial color="#c45d4c" />
            </mesh>
            <mesh position={[0, 0.42, 0]} castShadow>
              <icosahedronGeometry args={[0.38, 1]} />
              <meshToonMaterial color="#4f8465" />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 1.22, -0.82]} castShadow>
          <boxGeometry args={[1.65, 0.92, 0.12]} />
          <meshToonMaterial color="#f0ede0" />
        </mesh>
        <mesh position={[0, 1.22, -0.75]}>
          <boxGeometry args={[1.05, 0.08, 0.025]} />
          <meshBasicMaterial color="#cf604d" />
        </mesh>
        <Float speed={2.1} rotationIntensity={0.08} floatIntensity={0.28}>
          <group position={[0, 2.45, 0]}>
            <mesh castShadow>
              <boxGeometry args={[1.15, 0.78, 0.22]} />
              <meshToonMaterial color="#fff2cc" />
            </mesh>
            <mesh position={[0, 0.07, 0.125]} rotation-z={Math.PI / 4}>
              <boxGeometry args={[0.66, 0.66, 0.035]} />
              <meshToonMaterial color="#d36c54" />
            </mesh>
          </group>
        </Float>
        <Html center position={[0, 3.45, 0]} distanceFactor={9} transform sprite>
          <button type="button" className="world-label" onClick={onOpenAction}>一平米行动</button>
        </Html>
      </group>
    </GroundAnchor>
  );
}

function DecorativeDetails() {
  const lamps = [[-4.5, 24], [-4.5, 10], [4.5, -1], [4.5, -21]] as const;
  return (
    <group>
      {lamps.map(([x, z], index) => (
        <GroundAnchor key={`lamp-${index}`} x={x} z={z} y={0.14}>
          <StreetLamp />
        </GroundAnchor>
      ))}
      <GroundAnchor x={-4.8} z={5.2} y={0.14} yaw={0.2}>
        <Bicycle />
      </GroundAnchor>
      <GroundAnchor x={4.9} z={-18} y={0.14} yaw={-0.18}>
        <Bicycle color="#e2b64f" />
      </GroundAnchor>
      <GroundAnchor x={4.9} z={23.5} y={0.14} yaw={0.1}>
        <Bench />
      </GroundAnchor>
      <GroundAnchor x={-4.8} z={17} y={0.14} yaw={0.1}>
        <group>
          {[0, 0.42, 0.84].map((x, index) => (
            <mesh key={x} position={[x - 0.42, 0.22 + index * 0.04, 0]} rotation-y={index * 0.15} castShadow>
              <boxGeometry args={[0.72, 0.42, 0.56]} />
              <meshToonMaterial color={index === 1 ? "#d76851" : "#d8c59e"} />
            </mesh>
          ))}
        </group>
      </GroundAnchor>
      <GroundAnchor x={-14.5} z={-3.2} y={0.14}>
        <group>
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.52, 0.62, 0.9, 10]} />
            <meshToonMaterial color="#b75e4d" />
          </mesh>
          <mesh position={[0, 1.05, 0]} castShadow>
            <icosahedronGeometry args={[0.72, 1]} />
            <meshToonMaterial color="#56886a" />
          </mesh>
        </group>
      </GroundAnchor>
    </group>
  );
}

function RoadBarrier({ x, z, yaw = 0 }: { x: number; z: number; yaw?: number }) {
  return (
    <GroundAnchor x={x} z={z} y={0.14} yaw={yaw}>
      <group>
        {[-1.65, 1.65].map((postX) => (
          <mesh key={postX} position={[postX, 0.55, 0]} castShadow>
            <boxGeometry args={[0.16, 1.1, 0.16]} />
            <meshToonMaterial color="#3d5550" />
          </mesh>
        ))}
        <mesh position={[0, 0.82, 0]} castShadow>
          <boxGeometry args={[3.65, 0.48, 0.18]} />
          <meshToonMaterial color="#e7c25e" />
        </mesh>
        {[-1.15, -0.38, 0.38, 1.15].map((stripe) => (
          <mesh key={stripe} position={[stripe, 0.82, 0.1]} rotation-z={-0.45}>
            <boxGeometry args={[0.18, 0.52, 0.025]} />
            <meshBasicMaterial color="#b95b4b" />
          </mesh>
        ))}
      </group>
    </GroundAnchor>
  );
}

function NeighborhoodBoundary() {
  const wallSegments = [
    { x: -25, z: 13, width: 0.6, depth: 36 },
    { x: -25, z: -25, width: 0.6, depth: 10 },
    { x: 25, z: 13, width: 0.6, depth: 36 },
    { x: 25, z: -25, width: 0.6, depth: 10 },
    { x: -15, z: -33, width: 20, depth: 0.6 },
    { x: 15, z: -33, width: 20, depth: 0.6 },
    { x: -15, z: 33, width: 20, depth: 0.6 },
    { x: 15, z: 33, width: 20, depth: 0.6 },
  ] as const;
  const skyline = [
    [-22, -36, 9, 8, 5], [-11, -37, 8, 6, 4], [12, -37, 9, 7, 5], [22, -36, 8, 9, 5],
    [-9, 38, 8, 8, 5], [0, 39, 7, 10, 5], [9, 38, 8, 7, 5],
    [-27, 18, 7, 7, 12], [27, 19, 8, 9, 11], [-27, -20, 8, 10, 9], [27, -21, 7, 8, 10],
  ] as const;

  return (
    <group>
      {wallSegments.map((wall, index) => (
        <mesh key={index} position={[wall.x, 0.75, wall.z]} castShadow receiveShadow>
          <boxGeometry args={[wall.width, 1.5, wall.depth]} />
          <meshToonMaterial color={index % 2 ? "#8b836f" : "#9b8d73"} />
        </mesh>
      ))}
      {skyline.map(([x, z, width, height, depth], index) => (
        <RoundedBox
          key={index}
          args={[width, height, depth]}
          radius={0.12}
          smoothness={2}
          position={[x, height / 2, z]}
          castShadow
        >
          <meshToonMaterial color={index % 3 === 0 ? "#c9876e" : index % 2 ? "#d6cab0" : "#b9b7a5"} />
        </RoundedBox>
      ))}
      <RoadBarrier x={0} z={29.2} />
      <RoadBarrier x={0} z={-29.2} />
      <RoadBarrier x={22.2} z={-7} yaw={Math.PI / 2} />
      <RoadBarrier x={-22.2} z={-7} yaw={Math.PI / 2} />
    </group>
  );
}

function FlatNeighborhood({ onOpenAction }: { onOpenAction: () => void }) {
  return (
    <group>
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[52, 1, 68]} />
        <meshToonMaterial color="#87966c" />
      </mesh>
      <mesh position={[0, 0.035, 0]} receiveShadow>
        <boxGeometry args={[49.5, 0.07, 65.5]} />
        <meshToonMaterial color="#89996f" />
      </mesh>
      <NeighborhoodRoads />
      {BUILDINGS.map((building, index) => (
        <GroundAnchor
          key={index}
          x={building.x}
          z={building.z}
          y={0.2}
          yaw={building.yaw}
        >
          <ShikumenBuilding {...building} />
        </GroundAnchor>
      ))}
      {TREE_POINTS.map(([x, z, scale], index) => (
        <GroundAnchor key={index} x={x} z={z} y={0.12} yaw={index * 0.31}>
          <PlaneTree scale={scale} />
        </GroundAnchor>
      ))}
      <DecorativeDetails />
      <NeighborhoodBoundary />
      <ActionInstallation onOpenAction={onOpenAction} />
    </group>
  );
}

function MessengerCharacter({ outerRef }: { outerRef: RefObject<Group | null> }) {
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const body = useRef<Group>(null);
  const moving = useRef(false);

  useFrame(({ clock }) => {
    const stride = moving.current ? Math.sin(clock.elapsedTime * (inputState.sprint ? 12 : 8)) : 0;
    if (leftArm.current) leftArm.current.rotation.x = stride * 0.62;
    if (rightArm.current) rightArm.current.rotation.x = -stride * 0.62;
    if (leftLeg.current) leftLeg.current.rotation.x = -stride * 0.58;
    if (rightLeg.current) rightLeg.current.rotation.x = stride * 0.58;
    if (body.current) body.current.position.y = moving.current ? Math.abs(stride) * 0.045 : Math.sin(clock.elapsedTime * 2.3) * 0.018;
    moving.current = inputState.forward || inputState.back || inputState.left || inputState.right;
  });

  return (
    <group ref={outerRef}>
      <group ref={body} scale={0.92}>
        <mesh position={[0, 1.24, 0]} castShadow>
          <capsuleGeometry args={[0.39, 0.72, 5, 10]} />
          <meshToonMaterial color="#edae3f" />
        </mesh>
        <mesh position={[0, 2.18, 0.02]} scale={[0.95, 1.05, 0.9]} castShadow>
          <sphereGeometry args={[0.46, 16, 12]} />
          <meshToonMaterial color="#e6bd9d" />
        </mesh>
        <mesh position={[0, 2.52, -0.02]} rotation-x={-0.08} castShadow>
          <cylinderGeometry args={[0.48, 0.44, 0.18, 14]} />
          <meshToonMaterial color="#334f49" />
        </mesh>
        <mesh position={[0, 2.5, 0.34]} rotation-x={0.12} castShadow>
          <boxGeometry args={[0.64, 0.08, 0.48]} />
          <meshToonMaterial color="#334f49" />
        </mesh>
        {[-0.16, 0.16].map((x) => (
          <mesh key={x} position={[x, 2.2, 0.42]}>
            <sphereGeometry args={[0.045, 10, 8]} />
            <meshBasicMaterial color="#293b38" />
          </mesh>
        ))}
        <mesh position={[0, 1.26, -0.43]} castShadow>
          <RoundedBox args={[0.72, 0.88, 0.26]} radius={0.12} smoothness={2}>
            <meshToonMaterial color="#c75547" />
          </RoundedBox>
        </mesh>
        <mesh position={[0, 1.2, -0.58]} castShadow>
          <boxGeometry args={[0.48, 0.34, 0.08]} />
          <meshToonMaterial color="#fff1c6" />
        </mesh>
        <group ref={leftArm} position={[-0.43, 1.72, 0]}>
          <mesh position={[0, -0.42, 0]} castShadow>
            <capsuleGeometry args={[0.13, 0.58, 4, 8]} />
            <meshToonMaterial color="#d88d43" />
          </mesh>
        </group>
        <group ref={rightArm} position={[0.43, 1.72, 0]}>
          <mesh position={[0, -0.42, 0]} castShadow>
            <capsuleGeometry args={[0.13, 0.58, 4, 8]} />
            <meshToonMaterial color="#d88d43" />
          </mesh>
        </group>
        <group ref={leftLeg} position={[-0.2, 0.88, 0]}>
          <mesh position={[0, -0.45, 0]} castShadow>
            <capsuleGeometry args={[0.16, 0.56, 4, 8]} />
            <meshToonMaterial color="#3d5c56" />
          </mesh>
          <mesh position={[0, -0.8, 0.13]} castShadow>
            <boxGeometry args={[0.31, 0.18, 0.52]} />
            <meshToonMaterial color="#263b38" />
          </mesh>
        </group>
        <group ref={rightLeg} position={[0.2, 0.88, 0]}>
          <mesh position={[0, -0.45, 0]} castShadow>
            <capsuleGeometry args={[0.16, 0.56, 4, 8]} />
            <meshToonMaterial color="#3d5c56" />
          </mesh>
          <mesh position={[0, -0.8, 0.13]} castShadow>
            <boxGeometry args={[0.31, 0.18, 0.52]} />
            <meshToonMaterial color="#263b38" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function useKeyboardControls() {
  useEffect(() => {
    const mapping: Record<string, keyof typeof inputState> = {
      KeyW: "forward", ArrowUp: "forward",
      KeyS: "back", ArrowDown: "back",
      KeyA: "left", ArrowLeft: "left",
      KeyD: "right", ArrowRight: "right",
      ShiftLeft: "sprint", ShiftRight: "sprint",
      Space: "jump",
    };
    const setKey = (event: KeyboardEvent, value: boolean) => {
      const key = mapping[event.code];
      if (!key) return;
      event.preventDefault();
      inputState[key] = value;
    };
    const keydown = (event: KeyboardEvent) => setKey(event, true);
    const keyup = (event: KeyboardEvent) => setKey(event, false);
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", resetInput);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", resetInput);
      resetInput();
    };
  }, []);
}

function PlayableMessenger({ onNearAction }: { onNearAction: (near: boolean) => void }) {
  const { camera, gl } = useThree();
  const outer = useRef<Group>(null);
  const initialForward = useMemo(() => new Vector3(0, 0, -1), []);
  const initialCameraOffset = useMemo(
    () => initialForward.clone().multiplyScalar(-CAMERA_DISTANCE).addScaledVector(WORLD_UP, CAMERA_HEIGHT),
    [initialForward],
  );
  const characterPosition = useRef(new Vector3(0, 0.33, 20));
  const forward = useRef(initialForward.clone());
  const cameraOffset = useRef(initialCameraOffset.clone());
  const lockedMoveDirection = useRef(initialForward.clone());
  const driveSignature = useRef("");
  const jumpHeight = useRef(0);
  const jumpVelocity = useRef(0);
  const jumpHeld = useRef(false);
  const dragging = useRef(false);
  const dragDelta = useRef({ x: 0, y: 0 });
  const zoom = useRef(initialCameraOffset.length());
  const wasNear = useRef(false);
  const onNearRef = useRef(onNearAction);
  useKeyboardControls();

  useEffect(() => {
    onNearRef.current = onNearAction;
  }, [onNearAction]);

  const scratch = useMemo(() => ({
    quaternion: new Quaternion(),
    basis: new Matrix4(),
    right: new Vector3(),
    move: new Vector3(),
    cameraForward: new Vector3(),
    cameraRight: new Vector3(),
    cameraHorizontal: new Vector3(),
    desiredHorizontal: new Vector3(),
    displacement: new Vector3(),
    cameraPosition: new Vector3(),
    cameraBase: new Vector3(),
    cameraTarget: new Vector3(),
    revertedOffset: new Vector3(),
  }), []);

  useEffect(() => {
    const canvas = gl.domElement;
    const pointerDown = () => { dragging.current = true; };
    const pointerUp = () => { dragging.current = false; };
    const pointerMove = (event: PointerEvent) => {
      if (!dragging.current || event.pointerType === "touch") return;
      dragDelta.current.x += event.movementX;
      dragDelta.current.y += event.movementY;
    };
    const wheel = (event: WheelEvent) => {
      zoom.current = Math.min(12.5, Math.max(6.4, zoom.current * (1 + event.deltaY * 0.0012)));
    };
    canvas.addEventListener("pointerdown", pointerDown);
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("wheel", wheel, { passive: true });
    return () => {
      canvas.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const currentForward = forward.current;
    const currentPosition = characterPosition.current;
    const s = scratch;

    if (dragDelta.current.x !== 0) {
      s.quaternion.setFromAxisAngle(WORLD_UP, -dragDelta.current.x * 0.005);
      cameraOffset.current.applyQuaternion(s.quaternion);
    }
    if (dragDelta.current.y !== 0) {
      s.revertedOffset.copy(cameraOffset.current);
      s.right.copy(WORLD_UP).cross(cameraOffset.current).normalize();
      s.quaternion.setFromAxisAngle(s.right, -dragDelta.current.y * 0.004);
      cameraOffset.current.applyQuaternion(s.quaternion);
      const pitch = cameraOffset.current.clone().normalize().dot(WORLD_UP);
      if (pitch > 0.93 || pitch < 0.12) cameraOffset.current.copy(s.revertedOffset);
    }
    dragDelta.current.x = 0;
    dragDelta.current.y = 0;

    if (!dragging.current) {
      // 相机只做水平转向；后退时平滑绕到角色正面，不再经过顶部。
      s.cameraHorizontal.copy(cameraOffset.current).projectOnPlane(WORLD_UP);
      s.desiredHorizontal.copy(currentForward).multiplyScalar(-1);
      rotateTangentTowards(
        s.cameraHorizontal,
        s.desiredHorizontal,
        WORLD_UP,
        CAMERA_FOLLOW_YAW_SPEED * delta,
        s.cameraHorizontal,
      );
      const currentPitch = Math.min(0.93, Math.max(
        0.12,
        cameraOffset.current.clone().normalize().dot(WORLD_UP),
      ));
      const pitch = currentPitch + (CAMERA_DEFAULT_PITCH - currentPitch) * Math.min(1, delta * 2.6);
      composeCameraOffset(
        s.cameraHorizontal,
        WORLD_UP,
        zoom.current,
        pitch,
        cameraOffset.current,
      );
    } else {
      cameraOffset.current.setLength(zoom.current);
    }

    s.cameraForward.copy(cameraOffset.current).multiplyScalar(-1).projectOnPlane(WORLD_UP);
    if (s.cameraForward.lengthSq() < 0.001) s.cameraForward.copy(currentForward);
    s.cameraForward.normalize();
    s.cameraRight.copy(s.cameraForward).cross(WORLD_UP).normalize();

    const z = (inputState.forward ? 1 : 0) - (inputState.back ? 1 : 0);
    const x = (inputState.right ? 1 : 0) - (inputState.left ? 1 : 0);
    const moving = x !== 0 || z !== 0;
    if (moving) {
      const signature = `${x}:${z}`;
      if (signature !== driveSignature.current) {
        lockedMoveDirection.current.set(0, 0, 0)
          .addScaledVector(s.cameraForward, z)
          .addScaledVector(s.cameraRight, x)
          .normalize();
        driveSignature.current = signature;
      }
      s.move.copy(lockedMoveDirection.current);
      const speed = inputState.sprint ? 6.4 : 3.6;
      s.displacement.copy(s.move).multiplyScalar(speed * delta);
      resolvePlanarMovement(
        currentPosition,
        s.displacement,
        MAP_BOUNDS,
        BUILDING_OBSTACLES,
        PLAYER_RADIUS,
        currentPosition,
      );
      currentForward.copy(s.move).projectOnPlane(WORLD_UP).normalize();
    } else {
      driveSignature.current = "";
    }

    if (inputState.jump && !jumpHeld.current && jumpHeight.current <= 0.001) {
      jumpVelocity.current = 5.2;
    }
    jumpHeld.current = inputState.jump;
    if (jumpVelocity.current !== 0 || jumpHeight.current > 0) {
      jumpHeight.current += jumpVelocity.current * delta;
      jumpVelocity.current -= 15.5 * delta;
      if (jumpHeight.current <= 0) {
        jumpHeight.current = 0;
        jumpVelocity.current = 0;
      }
    }

    if (outer.current) {
      outer.current.position.set(currentPosition.x, 0.33 + jumpHeight.current, currentPosition.z);
      s.right.copy(WORLD_UP).cross(currentForward).normalize();
      s.basis.makeBasis(s.right, WORLD_UP, currentForward);
      outer.current.quaternion.setFromRotationMatrix(s.basis);
    }

    s.cameraTarget.set(currentPosition.x, 1.68 + jumpHeight.current, currentPosition.z);
    s.cameraBase.set(currentPosition.x, 0.33 + jumpHeight.current, currentPosition.z);
    s.cameraPosition.copy(s.cameraBase).add(cameraOffset.current);
    // 相机绕转经过建筑或地图边缘时沿视线向角色收近，避免穿墙和看到边界外。
    let cameraClear = false;
    for (let scale = 1; scale >= 0.28; scale -= 0.08) {
      s.cameraPosition.copy(s.cameraBase).addScaledVector(cameraOffset.current, scale);
      if (!isPlanarPositionBlocked(
        s.cameraPosition.x,
        s.cameraPosition.z,
        MAP_BOUNDS,
        BUILDING_OBSTACLES,
        0.25,
      )) {
        cameraClear = true;
        break;
      }
    }
    if (!cameraClear) s.cameraPosition.copy(s.cameraBase).addScaledVector(WORLD_UP, 2.2);
    camera.position.lerp(s.cameraPosition, Math.min(1, delta * 8));
    camera.up.copy(WORLD_UP);
    camera.lookAt(s.cameraTarget);

    const near = Math.hypot(
      currentPosition.x - ACTION_POSITION.x,
      currentPosition.z - ACTION_POSITION.z,
    ) < 5.0;
    if (near !== wasNear.current) {
      wasNear.current = near;
      onNearRef.current(near);
    }
  });

  return <MessengerCharacter outerRef={outer} />;
}

export function IntroCamera() {
  const { camera } = useThree();
  const target = useMemo(() => new Vector3(0, 0, -3), []);
  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    const desired = new Vector3(35 + Math.sin(time * 0.11) * 1.6, 34, 42 + Math.cos(time * 0.12) * 1.4);
    camera.position.lerp(desired, Math.min(1, delta * 2.5));
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
  });
  return null;
}

export function XinhuaWorld({
  playing,
  onNearAction,
  onOpenAction,
}: {
  playing: boolean;
  onNearAction: (near: boolean) => void;
  onOpenAction: () => void;
}) {
  return (
    <>
      <fog attach="fog" args={["#72b7b1", 54, 150]} />
      <color attach="background" args={[new Color("#69bab6")]} />
      <ambientLight intensity={1.15} />
      <hemisphereLight args={["#eff8e9", "#6d765c", 1.45]} />
      <directionalLight
        position={[28, 48, 36]}
        intensity={2.1}
        color="#fff2ce"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={120}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-bias={-0.00025}
      />
      <FlatNeighborhood onOpenAction={onOpenAction} />
      {playing ? <PlayableMessenger onNearAction={onNearAction} /> : <IntroCamera />}
    </>
  );
}
