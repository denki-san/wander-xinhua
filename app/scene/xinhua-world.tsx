"use client";

import {
  Float,
  Html,
  RoundedBox,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  BufferGeometry,
  DataTexture,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Float32BufferAttribute,
  Matrix4,
  NearestFilter,
  Quaternion,
  RedFormat,
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

const PLANET_RADIUS = 18;
const DEG = Math.PI / 180;
const WORLD_UP = new Vector3(0, 1, 0);

const BUILDINGS = [
  { polar: 16, azimuth: -30, yaw: 0.08, width: 4.8, depth: 3.2, floors: 3, color: "#e4d8bf", trim: "#546b65", accent: "#d26f55", roof: "flat" },
  { polar: 23, azimuth: -31, yaw: 0.04, width: 4.2, depth: 3.1, floors: 2, color: "#dca17f", trim: "#745142", accent: "#e7c36c", roof: "gable" },
  { polar: 31, azimuth: -29, yaw: -0.06, width: 5.1, depth: 3.4, floors: 3, color: "#d9c9aa", trim: "#496960", accent: "#d7664d", roof: "flat" },
  { polar: 40, azimuth: -27, yaw: 0.08, width: 4.5, depth: 3.0, floors: 2, color: "#c9745d", trim: "#5f433b", accent: "#e7bf58", roof: "gable" },
  { polar: 49, azimuth: -24, yaw: -0.1, width: 5.2, depth: 3.4, floors: 3, color: "#e2d1b5", trim: "#426a61", accent: "#d96b53", roof: "flat" },
  { polar: 17, azimuth: 30, yaw: -0.08, width: 4.3, depth: 3.2, floors: 2, color: "#d98b6c", trim: "#694b42", accent: "#efc35c", roof: "gable" },
  { polar: 25, azimuth: 31, yaw: -0.02, width: 5.0, depth: 3.4, floors: 3, color: "#e6ddc7", trim: "#4b6d65", accent: "#cc6852", roof: "flat" },
  { polar: 34, azimuth: 30, yaw: 0.08, width: 4.6, depth: 3.2, floors: 2, color: "#d6a37e", trim: "#715044", accent: "#e4be5c", roof: "gable" },
  { polar: 43, azimuth: 28, yaw: -0.06, width: 5.2, depth: 3.5, floors: 3, color: "#dbd2bd", trim: "#4d6d66", accent: "#cf7159", roof: "flat" },
  { polar: 52, azimuth: 24, yaw: 0.08, width: 4.2, depth: 3.0, floors: 2, color: "#ca755d", trim: "#5c443d", accent: "#edc865", roof: "gable" },
  { polar: 34, azimuth: -58, yaw: Math.PI / 2, width: 4.5, depth: 3.1, floors: 2, color: "#e2d6be", trim: "#486860", accent: "#d96d52", roof: "flat" },
  { polar: 35, azimuth: 58, yaw: Math.PI / 2, width: 4.8, depth: 3.2, floors: 3, color: "#d99573", trim: "#64483e", accent: "#e8bd57", roof: "flat" },
] as const;

const TREE_POINTS = [
  [10, -48, 0.9], [13, 46, 1.05], [21, -49, 1.1], [28, 47, 0.95],
  [37, -46, 1.1], [46, 44, 1.0], [55, -39, 1.05], [57, 38, 0.95],
  [34, -72, 1.0], [35, 72, 1.08], [61, -8, 1.1], [59, 14, 0.95],
  [8, -8, 0.88], [11, 14, 0.92],
] as const;

const ACTION_DIRECTION = surfaceDirection(31, 10);

function surfaceDirection(polar: number, azimuth: number) {
  const p = polar * DEG;
  const a = azimuth * DEG;
  return new Vector3(
    Math.sin(p) * Math.sin(a),
    Math.cos(p),
    Math.sin(p) * Math.cos(a),
  ).normalize();
}

function SurfaceAnchor({
  polar,
  azimuth,
  offset = 0,
  yaw = 0,
  children,
}: {
  polar: number;
  azimuth: number;
  offset?: number;
  yaw?: number;
  children: ReactNode;
}) {
  const transform = useMemo(() => {
    const direction = surfaceDirection(polar, azimuth);
    return {
      position: direction.multiplyScalar(PLANET_RADIUS + offset),
      quaternion: new Quaternion().setFromUnitVectors(WORLD_UP, direction),
    };
  }, [polar, azimuth, offset]);

  return (
    <group position={transform.position} quaternion={transform.quaternion}>
      <group rotation-y={yaw}>{children}</group>
    </group>
  );
}

function CurvedRoads() {
  const mainRoad = useMemo(() => createRoadStrip(
    Array.from({ length: 34 }, (_, index) => surfaceDirection(2 + index * 1.9, 0)),
    2.1,
    0.2,
  ), []);
  const crossRoad = useMemo(() => createRoadStrip(
    Array.from({ length: 43 }, (_, index) => surfaceDirection(35, -76 + index * 3.62)),
    1.78,
    0.21,
  ), []);
  const lane = useMemo(() => createRoadStrip(
    Array.from({ length: 25 }, (_, index) => surfaceDirection(21.5, -34 + index * 2.83)),
    1.18,
    0.25,
  ), []);

  useEffect(() => () => {
    mainRoad.dispose();
    crossRoad.dispose();
    lane.dispose();
  }, [mainRoad, crossRoad, lane]);

  return (
    <group>
      <mesh geometry={mainRoad} receiveShadow>
        <meshToonMaterial color="#d7caae" side={DoubleSide} />
      </mesh>
      <mesh geometry={crossRoad} receiveShadow>
        <meshToonMaterial color="#c9bea3" side={DoubleSide} />
      </mesh>
      <mesh geometry={lane} receiveShadow>
        <meshToonMaterial color="#eadfc5" side={DoubleSide} />
      </mesh>
      {[8, 17, 26, 44, 53].map((polar) => (
        <SurfaceAnchor key={polar} polar={polar} azimuth={0} offset={0.29}>
          <mesh>
            <boxGeometry args={[0.12, 0.035, 0.74]} />
            <meshBasicMaterial color="#f5ead1" />
          </mesh>
        </SurfaceAnchor>
      ))}
    </group>
  );
}

function createRoadStrip(directions: Vector3[], halfWidth: number, lift: number) {
  const geometry = new BufferGeometry();
  const vertices: number[] = [];
  const indices: number[] = [];
  const tangent = new Vector3();
  const side = new Vector3();
  const left = new Vector3();
  const right = new Vector3();

  directions.forEach((direction, index) => {
    const previous = directions[Math.max(0, index - 1)];
    const next = directions[Math.min(directions.length - 1, index + 1)];
    tangent.copy(next).sub(previous).normalize();
    side.copy(direction).cross(tangent).normalize();
    left.copy(direction).multiplyScalar(PLANET_RADIUS).addScaledVector(side, halfWidth).setLength(PLANET_RADIUS + lift);
    right.copy(direction).multiplyScalar(PLANET_RADIUS).addScaledVector(side, -halfWidth).setLength(PLANET_RADIUS + lift);
    vertices.push(left.x, left.y, left.z, right.x, right.y, right.z);
    if (index < directions.length - 1) {
      const row = index * 2;
      indices.push(row, row + 2, row + 1, row + 2, row + 3, row + 1);
    }
  });

  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
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
    <SurfaceAnchor polar={31} azimuth={10} offset={0.3} yaw={-0.15}>
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
    </SurfaceAnchor>
  );
}

function DecorativeDetails() {
  const lamps = [[14, -9], [25, -10], [39, -10], [51, -9]] as const;
  return (
    <group>
      {lamps.map(([polar, azimuth], index) => (
        <SurfaceAnchor key={`lamp-${index}`} polar={polar} azimuth={azimuth} offset={0.25}>
          <StreetLamp />
        </SurfaceAnchor>
      ))}
      <SurfaceAnchor polar={28} azimuth={-14} offset={0.27} yaw={0.2}>
        <Bicycle />
      </SurfaceAnchor>
      <SurfaceAnchor polar={44} azimuth={12} offset={0.26} yaw={-0.18}>
        <Bicycle color="#e2b64f" />
      </SurfaceAnchor>
      <SurfaceAnchor polar={53} azimuth={-8} offset={0.25} yaw={0.1}>
        <Bench />
      </SurfaceAnchor>
      <SurfaceAnchor polar={19} azimuth={-17} offset={0.28} yaw={0.1}>
        <group>
          {[0, 0.42, 0.84].map((x, index) => (
            <mesh key={x} position={[x - 0.42, 0.22 + index * 0.04, 0]} rotation-y={index * 0.15} castShadow>
              <boxGeometry args={[0.72, 0.42, 0.56]} />
              <meshToonMaterial color={index === 1 ? "#d76851" : "#d8c59e"} />
            </mesh>
          ))}
        </group>
      </SurfaceAnchor>
      <SurfaceAnchor polar={42} azimuth={-12} offset={0.26}>
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
      </SurfaceAnchor>
    </group>
  );
}

function makeTerrainGeometry() {
  const geometry = new IcosahedronGeometry(PLANET_RADIUS, 5);
  const positions = geometry.attributes.position;
  const vector = new Vector3();
  for (let index = 0; index < positions.count; index += 1) {
    vector.fromBufferAttribute(positions, index);
    const wobble = Math.sin(vector.x * 0.72) * 0.13
      + Math.sin(vector.y * 0.61 + 1.4) * 0.11
      + Math.sin(vector.z * 0.83 - 0.7) * 0.09;
    vector.setLength(PLANET_RADIUS + wobble);
    positions.setXYZ(index, vector.x, vector.y, vector.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function TinyPlanet({ onOpenAction }: { onOpenAction: () => void }) {
  const terrain = useMemo(() => makeTerrainGeometry(), []);
  const toonRamp = useMemo(() => {
    const texture = new DataTexture(new Uint8Array([145, 205, 255]), 3, 1, RedFormat);
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
    texture.needsUpdate = true;
    return texture;
  }, []);

  useEffect(() => () => {
    terrain.dispose();
    toonRamp.dispose();
  }, [terrain, toonRamp]);

  return (
    <group>
      <mesh geometry={terrain} receiveShadow castShadow>
        <meshToonMaterial color="#87966c" gradientMap={toonRamp} />
      </mesh>
      <mesh scale={0.978}>
        <sphereGeometry args={[PLANET_RADIUS, 48, 32]} />
        <meshBasicMaterial color="#637a69" side={DoubleSide} />
      </mesh>
      <CurvedRoads />
      {BUILDINGS.map((building, index) => (
        <SurfaceAnchor
          key={index}
          polar={building.polar}
          azimuth={building.azimuth}
          offset={0.18}
          yaw={building.yaw}
        >
          <ShikumenBuilding {...building} />
        </SurfaceAnchor>
      ))}
      {TREE_POINTS.map(([polar, azimuth, scale], index) => (
        <SurfaceAnchor key={index} polar={polar} azimuth={azimuth} offset={0.24} yaw={index * 0.31}>
          <PlaneTree scale={scale} />
        </SurfaceAnchor>
      ))}
      <DecorativeDetails />
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
  // 从主路南端进入，镜头后方没有建筑遮挡，第一帧就能看清角色与街道。
  const initialUp = useMemo(() => surfaceDirection(56, 0), []);
  const initialForward = useMemo(
    // W 键默认朝街区内部前进；相机从南侧看向北侧的建筑群。
    () => new Vector3(0, 0, -1).projectOnPlane(initialUp).normalize(),
    [initialUp],
  );
  const initialCameraOffset = useMemo(
    () => initialForward.clone().multiplyScalar(-7.4).addScaledVector(initialUp, 5.0),
    [initialForward, initialUp],
  );
  const up = useRef(initialUp.clone());
  const forward = useRef(initialForward.clone());
  const previousUp = useRef(initialUp.clone());
  const cameraOffset = useRef(initialCameraOffset.clone());
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
    desiredOffset: new Vector3(),
    characterPosition: new Vector3(),
    cameraPosition: new Vector3(),
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
    const currentUp = up.current;
    const currentForward = forward.current;
    const s = scratch;

    s.quaternion.setFromUnitVectors(previousUp.current, currentUp);
    cameraOffset.current.applyQuaternion(s.quaternion);
    previousUp.current.copy(currentUp);

    if (dragDelta.current.x !== 0) {
      s.quaternion.setFromAxisAngle(currentUp, -dragDelta.current.x * 0.005);
      cameraOffset.current.applyQuaternion(s.quaternion);
    }
    if (dragDelta.current.y !== 0) {
      s.revertedOffset.copy(cameraOffset.current);
      s.right.copy(currentUp).cross(cameraOffset.current).normalize();
      s.quaternion.setFromAxisAngle(s.right, -dragDelta.current.y * 0.004);
      cameraOffset.current.applyQuaternion(s.quaternion);
      const pitch = cameraOffset.current.clone().normalize().dot(currentUp);
      if (pitch > 0.93 || pitch < 0.12) cameraOffset.current.copy(s.revertedOffset);
    }
    dragDelta.current.x = 0;
    dragDelta.current.y = 0;

    if (!dragging.current) {
      s.desiredOffset.copy(currentForward).multiplyScalar(-7.4).addScaledVector(currentUp, 5.0).setLength(zoom.current);
      cameraOffset.current.lerp(s.desiredOffset, Math.min(1, delta * 2.6)).setLength(zoom.current);
    }

    s.cameraForward.copy(cameraOffset.current).multiplyScalar(-1).projectOnPlane(currentUp);
    if (s.cameraForward.lengthSq() < 0.001) s.cameraForward.copy(currentForward);
    s.cameraForward.normalize();
    s.cameraRight.copy(s.cameraForward).cross(currentUp).normalize();

    const z = (inputState.forward ? 1 : 0) - (inputState.back ? 1 : 0);
    const x = (inputState.right ? 1 : 0) - (inputState.left ? 1 : 0);
    const moving = x !== 0 || z !== 0;
    if (moving) {
      s.move.set(0, 0, 0)
        .addScaledVector(s.cameraForward, z)
        .addScaledVector(s.cameraRight, x)
        .normalize();
      const speed = inputState.sprint ? 6.4 : 3.6;
      s.right.copy(currentUp).cross(s.move).normalize();
      s.quaternion.setFromAxisAngle(s.right, speed * delta / PLANET_RADIUS);
      currentUp.applyQuaternion(s.quaternion).normalize();
      currentForward.copy(s.move).projectOnPlane(currentUp).normalize();
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

    s.characterPosition.copy(currentUp).multiplyScalar(PLANET_RADIUS + 0.33 + jumpHeight.current);
    if (outer.current) {
      outer.current.position.copy(s.characterPosition);
      s.right.copy(currentUp).cross(currentForward).normalize();
      s.basis.makeBasis(s.right, currentUp, currentForward);
      outer.current.quaternion.setFromRotationMatrix(s.basis);
    }

    s.cameraTarget.copy(s.characterPosition).addScaledVector(currentUp, 1.35);
    s.cameraPosition.copy(s.characterPosition).add(cameraOffset.current);
    camera.position.lerp(s.cameraPosition, Math.min(1, delta * 8));
    camera.up.lerp(currentUp, Math.min(1, delta * 7)).normalize();
    camera.lookAt(s.cameraTarget);

    const angularDistance = Math.acos(Math.min(1, Math.max(-1, currentUp.dot(ACTION_DIRECTION))));
    const near = angularDistance * PLANET_RADIUS < 5.0;
    if (near !== wasNear.current) {
      wasNear.current = near;
      onNearRef.current(near);
    }
  });

  return <MessengerCharacter outerRef={outer} />;
}

export function IntroCamera() {
  const { camera } = useThree();
  const target = useMemo(() => new Vector3(0, 2.5, 0), []);
  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    const desired = new Vector3(Math.sin(time * 0.11) * 2.2, 29.5, 45.5 + Math.cos(time * 0.12) * 1.1);
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
      <fog attach="fog" args={["#72b7b1", 58, 190]} />
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
        shadow-camera-far={95}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        shadow-bias={-0.00025}
      />
      <TinyPlanet onOpenAction={onOpenAction} />
      {playing ? <PlayableMessenger onNearAction={onNearAction} /> : <IntroCamera />}
    </>
  );
}
