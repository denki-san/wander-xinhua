"use client";

import { RoundedBox } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import { InstancedMesh, Object3D } from "three";
import layout from "./xingfuli-layout.json";
import type { MapObstacle } from "./world-math";

const FLOOR_HEIGHT = 2.08;
const LANE_CENTER_Z = -7;
const PAVING_DARK_INDICES = Array.from({ length: 31 }, (_, index) => index).filter((index) => index % 3 === 0);
const PAVING_LIGHT_INDICES = Array.from({ length: 31 }, (_, index) => index).filter((index) => index % 3 !== 0);
const GARDEN_CELLS = Array.from({ length: 72 }, (_, index) => ({
  y: 0.7 + Math.floor(index / 8) * 0.78,
  z: -3.1 + (index % 8) * 0.88,
  color: index % 5 === 0 ? "#78924e" : index % 2 ? "#4f7d55" : "#386849",
  scale: 0.26 + (index % 3) * 0.045,
}));
const GARDEN_COLORS = ["#78924e", "#4f7d55", "#386849"] as const;
const REFLECTING_POOL = { x: 16.5, z: -3.95, width: 18, depth: 2.15 };
export const XINGFULI_DETAIL_UPGRADE = {
  windowLayersBefore: 3,
  windowLayersAfter: 6,
  storefrontLayersBefore: 3,
  storefrontLayersAfter: 7,
  poolEdgeDetailsBefore: 1,
  poolEdgeDetailsAfter: 9,
} as const;

type Building = {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  floors: number;
  side: "north" | "south";
  wall: string;
  frame: string;
  glass: string;
  feature: "bands" | "bay" | "balcony" | "glass" | "mural" | "pavilion" | "timber";
};

// JSON 是可直接回归测试的结构化事实表；ID 只表示方位，不冒充真实座号。
export const XINGFULI_BUILDINGS = layout.buildings as Building[];

export const XINGFULI_OBSTACLES: MapObstacle[] = [
  ...XINGFULI_BUILDINGS.map((building) => ({
    minX: building.x - building.width / 2 - 0.28,
    maxX: building.x + building.width / 2 + 0.28,
    minZ: building.z - building.depth / 2 - 0.28,
    maxZ: building.z + building.depth / 2 + 0.28,
  })),
  // 倒影池向北收进庭院，主通道保留连续净空；只有真实水面参与碰撞。
  {
    minX: REFLECTING_POOL.x - REFLECTING_POOL.width / 2 + 0.18,
    maxX: REFLECTING_POOL.x + REFLECTING_POOL.width / 2 - 0.18,
    minZ: REFLECTING_POOL.z - REFLECTING_POOL.depth / 2 + 0.12,
    maxZ: REFLECTING_POOL.z + REFLECTING_POOL.depth / 2 - 0.12,
  },
  // 东入口绿墙略伸出 7 座主体，单独补齐端墙碰撞。
  { minX: 41.75, maxX: 43.2, minZ: -21.6, maxZ: -12.8 },
  // 只给占地明显的长椅和咖啡桌组简化碰撞，小花盆与灯杆保持通行宽容度。
  { minX: -28.7, maxX: -26.3, minZ: -3.15, maxZ: -2.25 },
  { minX: 27.8, maxX: 30.2, minZ: -11.35, maxZ: -10.45 },
  { minX: -19.75, maxX: -17.25, minZ: -9.65, maxZ: -7.15 },
  { minX: 32.75, maxX: 35.25, minZ: -9.85, maxZ: -7.35 },
];

function Window({
  x,
  y,
  z,
  sign,
  glass,
  frame,
  wide = false,
}: {
  x: number;
  y: number;
  z: number;
  sign: number;
  glass: string;
  frame: string;
  wide?: boolean;
}) {
  const width = wide ? 1.92 : 1.32;
  return (
    <group position={[x, y, z]}>
      <mesh castShadow>
        <boxGeometry args={[width, 1.12, 0.14]} />
        <meshToonMaterial color={frame} />
      </mesh>
      <mesh position={[0, 0, sign * 0.082]}>
        <boxGeometry args={[width - 0.16, 0.94, 0.035]} />
        <meshToonMaterial color={glass} />
      </mesh>
      <mesh position={[0, 0, sign * 0.11]}>
        <boxGeometry args={[0.045, 0.94, 0.02]} />
        <meshBasicMaterial color="#d9dfd7" />
      </mesh>
      <mesh position={[0, 0, sign * 0.112]}>
        <boxGeometry args={[width - 0.2, 0.04, 0.024]} />
        <meshBasicMaterial color="#d9dfd7" />
      </mesh>
      <mesh position={[0, -0.59, sign * 0.12]} castShadow>
        <boxGeometry args={[width + 0.08, 0.08, 0.24]} />
        <meshToonMaterial color="#dddcd2" />
      </mesh>
      <mesh position={[0, 0.62, sign * 0.13]} castShadow>
        <boxGeometry args={[width + 0.12, 0.07, 0.28]} />
        <meshToonMaterial color={frame} />
      </mesh>
    </group>
  );
}

function Storefront({ building, frontZ }: { building: Building; frontZ: number }) {
  const sign = building.side === "north" ? -1 : 1;
  const unitCount = Math.max(3, Math.round(building.width / 4.3));
  const unitWidth = building.width / unitCount;
  return (
    <group>
      {Array.from({ length: unitCount }, (_, index) => {
        const x = -building.width / 2 + unitWidth * (index + 0.5);
        return (
          <group key={index} position={[x, 1.05, frontZ + sign * 0.04]}>
            <mesh castShadow>
              <boxGeometry args={[unitWidth - 0.2, 1.72, 0.16]} />
              <meshToonMaterial color={building.frame} />
            </mesh>
            <mesh position={[0, 0.06, sign * 0.09]}>
              <boxGeometry args={[unitWidth - 0.38, 1.42, 0.035]} />
              <meshToonMaterial color={index % 2 ? "#6d9998" : building.glass} />
            </mesh>
            <mesh position={[0, 0.65, sign * 0.13]}>
              <boxGeometry args={[unitWidth - 0.42, 0.07, 0.025]} />
              <meshBasicMaterial color="#d6d7cb" />
            </mesh>
            {[-0.23, 0.23].map((ratio) => (
              <mesh key={ratio} position={[unitWidth * ratio, 0.02, sign * 0.135]}>
                <boxGeometry args={[0.045, 1.34, 0.028]} />
                <meshBasicMaterial color="#d8ddd5" />
              </mesh>
            ))}
            <mesh position={[0, 0.3, sign * 0.14]}>
              <boxGeometry args={[unitWidth - 0.46, 0.045, 0.028]} />
              <meshBasicMaterial color="#d8ddd5" />
            </mesh>
            <mesh position={[unitWidth * 0.18, -0.2, sign * 0.17]}>
              <boxGeometry args={[0.035, 0.28, 0.04]} />
              <meshToonMaterial color="#d7b86d" />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, 2.04, frontZ + sign * 0.08]} castShadow>
        <boxGeometry args={[building.width - 0.18, 0.25, 0.24]} />
        <meshToonMaterial color={building.frame} />
      </mesh>
    </group>
  );
}

function Balcony({
  x,
  y,
  z,
  sign,
  frame,
}: {
  x: number;
  y: number;
  z: number;
  sign: number;
  frame: string;
}) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, -0.58, sign * 0.2]} castShadow>
        <boxGeometry args={[2.5, 0.16, 0.78]} />
        <meshToonMaterial color="#d8d8d0" />
      </mesh>
      <mesh position={[0, -0.14, sign * 0.53]} castShadow>
        <boxGeometry args={[2.42, 0.62, 0.07]} />
        <meshToonMaterial color={frame} transparent opacity={0.72} />
      </mesh>
      {[-1.05, -0.52, 0, 0.52, 1.05].map((rail) => (
        <mesh key={rail} position={[rail, -0.12, sign * 0.56]} castShadow>
          <boxGeometry args={[0.035, 0.68, 0.045]} />
          <meshBasicMaterial color={frame} />
        </mesh>
      ))}
    </group>
  );
}

function BuildingFacade({ building, height }: { building: Building; height: number }) {
  const sign = building.side === "north" ? -1 : 1;
  const frontZ = sign * (building.depth / 2 + 0.08);
  const columns = Math.max(3, Math.floor(building.width / 3.25));
  const upperFloors = Array.from({ length: building.floors - 1 }, (_, index) => index + 1);

  return (
    <group>
      <Storefront building={building} frontZ={frontZ} />
      {upperFloors.flatMap((floor) => Array.from({ length: columns }, (_, column) => {
        const x = -building.width / 2 + (building.width / columns) * (column + 0.5);
        const y = 1.18 + floor * FLOOR_HEIGHT;
        const wide = building.feature === "glass" || building.feature === "bands";
        return (
          <Window
            key={`${floor}-${column}`}
            x={x}
            y={y}
            z={frontZ + sign * 0.04}
            sign={sign}
            glass={building.glass}
            frame={building.frame}
            wide={wide}
          />
        );
      }))}

      {building.feature === "balcony" && [1, 2, 3].flatMap((floor) => (
        [-building.width * 0.28, building.width * 0.28].map((x) => (
          <Balcony
            key={`${floor}-${x}`}
            x={x}
            y={1.25 + floor * FLOOR_HEIGHT}
            z={frontZ + sign * 0.36}
            sign={sign}
            frame={building.frame}
          />
        ))
      ))}

      {building.feature === "bay" && (
        <group position={[building.width * 0.24, height * 0.56, frontZ + sign * 0.42]}>
          <RoundedBox args={[4.3, height * 0.58, 0.84]} radius={0.08} smoothness={2} castShadow>
            <meshToonMaterial color="#9fa8a5" />
          </RoundedBox>
          {[0.31, 0.52, 0.73].map((ratio) => (
            <mesh key={ratio} position={[0, height * (ratio - 0.56), sign * 0.47]}>
              <boxGeometry args={[3.62, 0.72, 0.04]} />
              <meshToonMaterial color="#799fa1" />
            </mesh>
          ))}
        </group>
      )}

      {building.feature === "timber" && (
        <group position={[6.5, height * 0.56, frontZ + sign * 0.26]}>
          {Array.from({ length: 18 }, (_, index) => (
            <mesh key={index} position={[(index - 8.5) * 0.43, 0, sign * 0.16]} castShadow>
              <boxGeometry args={[0.13, height * 0.64, 0.18]} />
              <meshToonMaterial color={index % 2 ? "#916448" : "#a87651"} />
            </mesh>
          ))}
        </group>
      )}

      {building.feature === "glass" && (
        <group>
          <group position={[building.width * 0.2, height * 0.55, frontZ + sign * 0.22]}>
            <mesh castShadow>
              <boxGeometry args={[building.width * 0.48, height * 0.54, 0.25]} />
              <meshToonMaterial color="#628f91" />
            </mesh>
            {[-0.32, -0.16, 0, 0.16, 0.32].map((ratio) => (
              <mesh key={ratio} position={[building.width * ratio * 0.48, 0, sign * 0.17]}>
                <boxGeometry args={[0.08, height * 0.51, 0.045]} />
                <meshBasicMaterial color="#31433f" />
              </mesh>
            ))}
          </group>

          {/* 番禺路入口右侧的白色玻璃转角体量，正面与东端墙连续包角。 */}
          <group position={[building.width / 2 - 2.55, 3.3, frontZ + sign * 0.5]}>
            <RoundedBox args={[5.25, 4.65, 1.15]} radius={0.08} smoothness={2} castShadow>
              <meshToonMaterial color="#86abad" transparent opacity={0.88} />
            </RoundedBox>
            {[-2.08, -1.04, 0, 1.04, 2.08].map((x) => (
              <mesh key={x} position={[x, 0, sign * 0.62]} castShadow>
                <boxGeometry args={[0.08, 4.55, 0.08]} />
                <meshToonMaterial color="#30423f" />
              </mesh>
            ))}
            <mesh position={[0, 0, sign * 0.66]}>
              <boxGeometry args={[5.1, 0.09, 0.06]} />
              <meshBasicMaterial color="#dfe5dc" />
            </mesh>
            <mesh position={[2.68, 0, -sign * 1.25]} castShadow>
              <boxGeometry args={[0.18, 4.65, 3.7]} />
              <meshToonMaterial color="#7ca2a4" />
            </mesh>
            {[-1.05, 0, 1.05].map((z) => (
              <mesh key={z} position={[2.8, 0, z - sign * 1.25]} castShadow>
                <boxGeometry args={[0.08, 4.5, 0.08]} />
                <meshToonMaterial color="#30423f" />
              </mesh>
            ))}
            <mesh position={[0, 2.48, -sign * 0.1]} castShadow>
              <boxGeometry args={[5.7, 0.2, 2.15]} />
              <meshToonMaterial color="#ece9df" />
            </mesh>
            <mesh position={[0, 2.94, sign * 0.85]} castShadow>
              <boxGeometry args={[5.45, 0.78, 0.08]} />
              <meshToonMaterial color="#354743" transparent opacity={0.68} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
}

function RoofDetails({ building, height }: { building: Building; height: number }) {
  if (building.feature === "pavilion") {
    return (
      <group position={[1.1, height + 0.55, 0]}>
        <mesh position={[0, -0.68, 0]} castShadow receiveShadow>
          <boxGeometry args={[9.2, 0.16, 6.1]} />
          <meshToonMaterial color="#9d704d" />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[7.8, 1.18, 4.7]} />
          <meshToonMaterial color="#39504d" transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 0.72, 0]} castShadow>
          <boxGeometry args={[8.3, 0.2, 5.15]} />
          <meshToonMaterial color="#263b38" />
        </mesh>
        {[-3.45, -1.15, 1.15, 3.45].map((x) => (
          <mesh key={x} position={[x, 0.02, 0]} castShadow>
            <boxGeometry args={[0.08, 1.1, 4.8]} />
            <meshBasicMaterial color="#d9ddd6" />
          </mesh>
        ))}
        {[-4.3, 4.3].flatMap((x) => [-2.7, 2.7].map((z) => (
          <group key={`${x}-${z}`} position={[x, -0.15, z]}>
            <mesh position={[0, 0.22, 0]} castShadow>
              <boxGeometry args={[0.72, 0.45, 0.72]} />
              <meshToonMaterial color="#3f4b46" />
            </mesh>
            <mesh position={[0, 0.72, 0]} castShadow>
              <icosahedronGeometry args={[0.5, 1]} />
              <meshToonMaterial color="#4d805f" />
            </mesh>
          </group>
        )))}
        {[-4.45, 4.45].map((x) => (
          <mesh key={x} position={[x, -0.18, 0]} castShadow>
            <boxGeometry args={[0.08, 0.72, 5.75]} />
            <meshToonMaterial color="#2f423e" />
          </mesh>
        ))}
      </group>
    );
  }

  if (building.feature === "glass") {
    return (
      <group position={[0, height + 0.5, 0]}>
        <group position={[-3.2, 0, 0]}>
          <mesh position={[0, 0.58, 0]} castShadow>
            <cylinderGeometry args={[1.15, 1.15, 1.3, 12]} />
            <meshToonMaterial color="#60706b" />
          </mesh>
          <mesh position={[0, 1.3, 0]} castShadow>
            <coneGeometry args={[1.28, 0.45, 12]} />
            <meshToonMaterial color="#374b46" />
          </mesh>
          {[-0.72, 0.72].map((x) => [-0.72, 0.72].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, -0.2, z]} castShadow>
              <cylinderGeometry args={[0.08, 0.11, 0.6, 8]} />
              <meshToonMaterial color="#344943" />
            </mesh>
          )))}
        </group>
        {[-7, -0.4, 3.8, 7].map((x, index) => (
          <group key={x} position={[x, -0.04, index % 2 ? 2.8 : -2.8]}>
            <mesh position={[0, 0.24, 0]} castShadow>
              <boxGeometry args={[1.45, 0.48, 0.72]} />
              <meshToonMaterial color="#4a514c" />
            </mesh>
            <mesh position={[0, 0.68, 0]} castShadow>
              <icosahedronGeometry args={[0.48, 1]} />
              <meshToonMaterial color={index % 2 ? "#4c805d" : "#658b59"} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  return (
    <group position={[building.width * -0.24, height + 0.32, 0]}>
      <mesh castShadow>
        <boxGeometry args={[building.width * 0.34, 0.42, building.depth * 0.42]} />
        <meshToonMaterial color="#5c6964" />
      </mesh>
    </group>
  );
}

function XingfuliBuilding({ building }: { building: Building }) {
  const height = building.floors * FLOOR_HEIGHT + 0.4;
  return (
    <group position={[building.x, 0.22, building.z]}>
      <RoundedBox
        args={[building.width, height, building.depth]}
        radius={0.1}
        smoothness={2}
        position={[0, height / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshToonMaterial color={building.wall} />
      </RoundedBox>
      <mesh position={[0, height - 0.18, 0]} castShadow>
        <boxGeometry args={[building.width + 0.18, 0.3, building.depth + 0.18]} />
        <meshToonMaterial color={building.frame} />
      </mesh>
      <BuildingFacade building={building} height={height} />
      <RoofDetails building={building} height={height} />
    </group>
  );
}

function PavingBands({ indices, color }: { indices: number[]; color: string }) {
  const instances = useRef<InstancedMesh>(null);
  const helper = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => {
    if (!instances.current) return;
    indices.forEach((index, instanceIndex) => {
      helper.position.set(-45 + index * 3, 0.275, LANE_CENTER_Z);
      helper.updateMatrix();
      instances.current?.setMatrixAt(instanceIndex, helper.matrix);
    });
    instances.current.instanceMatrix.needsUpdate = true;
  }, [helper, indices]);
  return (
    <instancedMesh ref={instances} args={[undefined, undefined, indices.length]} receiveShadow>
      <boxGeometry args={[1.08, 0.035, 13.55]} />
      <meshBasicMaterial color={color} />
    </instancedMesh>
  );
}

function LanePaving() {
  return (
    <group>
      <mesh position={[0, 0.17, LANE_CENTER_Z]} receiveShadow>
        <boxGeometry args={[94, 0.18, 14]} />
        <meshToonMaterial color="#c9c5b8" />
      </mesh>
      <PavingBands indices={PAVING_DARK_INDICES} color="#a9aaa3" />
      <PavingBands indices={PAVING_LIGHT_INDICES} color="#b8b7ae" />
      {[-13.2, -0.8].map((z) => (
        <mesh key={z} position={[0, 0.3, z]} receiveShadow>
          <boxGeometry args={[93, 0.035, 0.22]} />
          <meshBasicMaterial color="#5f6b66" />
        </mesh>
      ))}
    </group>
  );
}

function PlaneTree({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 1.45, 0]} castShadow>
        <cylinderGeometry args={[0.21, 0.31, 2.9, 9]} />
        <meshToonMaterial color="#76644e" />
      </mesh>
      {[
        [-0.42, 2.85, 0.12, 0.78],
        [0.32, 3.2, -0.18, 0.92],
        [0.72, 2.75, 0.22, 0.74],
        [-0.2, 3.55, 0.16, 0.72],
      ].map(([x, y, z, size], index) => (
        <mesh key={index} position={[x, y, z]} scale={size} castShadow>
          <icosahedronGeometry args={[0.9, 1]} />
          <meshToonMaterial color={index % 2 ? "#4f8567" : "#3d725a"} />
        </mesh>
      ))}
    </group>
  );
}

function ReflectingPool() {
  return (
    <group position={[REFLECTING_POOL.x, 0, REFLECTING_POOL.z]}>
      <mesh position={[0, 0.31, 0]} castShadow receiveShadow>
        <boxGeometry args={[REFLECTING_POOL.width, 0.32, REFLECTING_POOL.depth]} />
        <meshToonMaterial color="#303f3c" />
      </mesh>
      <mesh position={[0, 0.49, 0]} receiveShadow>
        <boxGeometry args={[REFLECTING_POOL.width - 0.58, 0.05, REFLECTING_POOL.depth - 0.56]} />
        <meshToonMaterial color="#5d9da0" transparent opacity={0.86} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0.52, side * (REFLECTING_POOL.depth / 2 - 0.08)]}>
          <mesh castShadow>
            <boxGeometry args={[REFLECTING_POOL.width + 0.28, 0.12, 0.22]} />
            <meshToonMaterial color="#59635f" />
          </mesh>
          {[-6.6, -2.2, 2.2, 6.6].map((x) => (
            <mesh key={x} position={[x, 0.065, side * 0.12]}>
              <boxGeometry args={[1.25, 0.025, 0.07]} />
              <meshBasicMaterial color="#263b38" />
            </mesh>
          ))}
        </group>
      ))}
      {[-6.2, -2.7, 0.7, 4.1].map((x, index) => (
        <group key={x} position={[x, 0.66, index % 2 ? 0.34 : -0.28]}>
          <mesh castShadow>
            <dodecahedronGeometry args={[0.28 + index * 0.035, 0]} />
            <meshToonMaterial color="#3e514d" />
          </mesh>
          <mesh position={[0, 0.42 + index * 0.06, 0]}>
            <cylinderGeometry args={[0.025, 0.04, 0.72 + index * 0.12, 8]} />
            <meshBasicMaterial color="#d3eee7" transparent opacity={0.72} />
          </mesh>
        </group>
      ))}
      <group position={[5.6, 0.48, 0]}>
        <PlaneTree scale={0.86} />
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.72, 0.86, 0.28, 12]} />
          <meshToonMaterial color="#47534e" />
        </mesh>
      </group>
      <group position={[-3.9, 0.57, 0]}>
        {Array.from({ length: 7 }, (_, index) => (
          <mesh key={index} position={[(index - 3) * 0.34, 0, 0]} castShadow>
            <boxGeometry args={[0.28, 0.13, REFLECTING_POOL.depth + 0.72]} />
            <meshToonMaterial color={index % 2 ? "#9a704f" : "#ad7d55"} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function GardenInstances({
  x,
  color,
}: {
  x: number;
  color: (typeof GARDEN_COLORS)[number];
}) {
  const cells = useMemo(() => GARDEN_CELLS.filter((cell) => cell.color === color), [color]);
  const instances = useRef<InstancedMesh>(null);
  const helper = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => {
    if (!instances.current) return;
    cells.forEach((cell, index) => {
      helper.position.set(x, cell.y, cell.z);
      helper.scale.setScalar(cell.scale);
      helper.updateMatrix();
      instances.current?.setMatrixAt(index, helper.matrix);
    });
    instances.current.instanceMatrix.needsUpdate = true;
  }, [cells, helper, x]);
  return (
    <instancedMesh ref={instances} args={[undefined, undefined, cells.length]} castShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshToonMaterial color={color} />
    </instancedMesh>
  );
}

function VerticalGarden() {
  return (
    <group position={[42.45, 0.2, -17.2]}>
      <mesh position={[0, 3.75, 0]} castShadow>
        <boxGeometry args={[1.15, 7.5, 8.2]} />
        <meshToonMaterial color="#293f3b" />
      </mesh>
      {[-0.61, 0.61].flatMap((x) => GARDEN_COLORS.map((color) => (
        <GardenInstances key={`${x}-${color}`} x={x} color={color} />
      )))}
      <mesh position={[0.7, 1.35, 0]} castShadow>
        <boxGeometry args={[0.16, 1.6, 4.4]} />
        <meshToonMaterial color="#242f2d" />
      </mesh>
      {[-1.25, 0, 1.25].map((z) => (
        <mesh key={z} position={[0.8, 1.35, z]} rotation-y={Math.PI / 2}>
          <boxGeometry args={[0.62, 0.09, 0.03]} />
          <meshBasicMaterial color="#e3ded0" />
        </mesh>
      ))}
    </group>
  );
}

function EntranceMural() {
  const colors = ["#e36d45", "#e9b847", "#2d8585", "#7e506f", "#cf4c50", "#3c6f79"];
  return (
    <group position={[-43.1, 2.4, -17.5]} rotation-y={Math.PI / 2}>
      <mesh castShadow>
        <boxGeometry args={[8.1, 4.7, 0.18]} />
        <meshToonMaterial color="#263b38" />
      </mesh>
      {Array.from({ length: 20 }, (_, index) => {
        const row = Math.floor(index / 5);
        const column = index % 5;
        return (
          <mesh
            key={index}
            position={[-3.1 + column * 1.55, -1.65 + row * 1.08, 0.12]}
            rotation-z={(index % 3 - 1) * 0.18}
          >
            <boxGeometry args={[1.26, 0.76, 0.05]} />
            <meshToonMaterial color={colors[index % colors.length]} />
          </mesh>
        );
      })}
    </group>
  );
}

function LaneLamp({ lit = false }: { lit?: boolean }) {
  return (
    <group>
      <mesh position={[0, 1.65, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.09, 3.3, 8]} />
        <meshToonMaterial color="#283b38" />
      </mesh>
      <mesh position={[0.25, 3.15, 0]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.5, 8]} />
        <meshToonMaterial color="#283b38" />
      </mesh>
      <mesh position={[0.54, 3.02, 0]} castShadow>
        <boxGeometry args={[0.34, 0.32, 0.34]} />
        <meshToonMaterial color="#f0cf79" />
      </mesh>
      {lit && <pointLight position={[0.54, 3, 0]} color="#ffd991" intensity={0.45} distance={4.5} />}
    </group>
  );
}

function Bench({ yaw = 0 }: { yaw?: number }) {
  return (
    <group rotation-y={yaw}>
      {[0.48, 0.83].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <boxGeometry args={[2.1, 0.15, 0.32]} />
          <meshToonMaterial color="#9c6c4b" />
        </mesh>
      ))}
      {[-0.82, 0.82].map((x) => (
        <mesh key={x} position={[x, 0.24, 0]} castShadow>
          <boxGeometry args={[0.12, 0.52, 0.48]} />
          <meshToonMaterial color="#2f4541" />
        </mesh>
      ))}
    </group>
  );
}

function CafeCluster({ x, z, yaw = 0 }: { x: number; z: number; yaw?: number }) {
  return (
    <group position={[x, 0.28, z]} rotation-y={yaw}>
      <mesh position={[0, 1.92, 0]} castShadow>
        <coneGeometry args={[2.05, 0.65, 8]} />
        <meshToonMaterial color="#be5549" />
      </mesh>
      <mesh position={[0, 0.92, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.08, 2.1, 8]} />
        <meshToonMaterial color="#374a46" />
      </mesh>
      <mesh position={[0, 0.64, 0]} castShadow>
        <cylinderGeometry args={[0.72, 0.72, 0.12, 14]} />
        <meshToonMaterial color="#a77551" />
      </mesh>
      {[-1.05, 1.05].map((offset) => (
        <group key={offset} position={[offset, 0, 0]}>
          <mesh position={[0, 0.42, 0]} castShadow>
            <boxGeometry args={[0.56, 0.12, 0.62]} />
            <meshToonMaterial color="#334844" />
          </mesh>
          <mesh position={[0, 0.24, 0]} castShadow>
            <boxGeometry args={[0.09, 0.48, 0.09]} />
            <meshToonMaterial color="#334844" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Planter({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0.28, z]} scale={scale}>
      <mesh position={[0, 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.5, 0.68, 10]} />
        <meshToonMaterial color="#474f4b" />
      </mesh>
      <mesh position={[0, 0.93, 0]} castShadow>
        <icosahedronGeometry args={[0.58, 1]} />
        <meshToonMaterial color="#4d805f" />
      </mesh>
    </group>
  );
}

function EntryBollards() {
  return (
    <group>
      {[-44.6, 44.6].flatMap((x) => [-11, -8.2, -5.4, -2.6].map((z, index) => (
        <mesh key={`${x}-${z}`} position={[x, 0.66, z]} castShadow>
          <coneGeometry args={[0.34, 0.86 + index * 0.02, 4]} />
          <meshToonMaterial color="#6f7771" />
        </mesh>
      )))}
    </group>
  );
}

function LaneFurniture() {
  const lamps = [
    [-35, -2.1], [-20, -11.7], [-6.5, -2.1], [2.5, -11.7], [30, -11.7], [39, -2.1],
  ] as const;
  return (
    <group>
      {/* 连续导向铺装把可步行带从倒影池南侧明确标出来，避免视觉上误判为死路。 */}
      {Array.from({ length: 12 }, (_, index) => (
        <mesh key={`pool-bypass-${index}`} position={[4.5 + index * 2.15, 0.31, -8.15]} receiveShadow>
          <boxGeometry args={[1.55, 0.035, 0.42]} />
          <meshBasicMaterial color={index % 2 ? "#e4ddca" : "#d0c5ad"} />
        </mesh>
      ))}
      {lamps.map(([x, z], index) => (
        <group key={index} position={[x, 0.26, z]} rotation-y={index % 2 ? Math.PI : 0}>
          <LaneLamp lit={index === 1 || index === 4} />
        </group>
      ))}
      <group position={[-27.5, 0.25, -2.7]}><Bench /></group>
      <group position={[29, 0.25, -10.9]}><Bench yaw={Math.PI} /></group>
      <CafeCluster x={-18.5} z={-8.4} yaw={0.1} />
      <CafeCluster x={34} z={-8.6} yaw={-0.08} />
      <Planter x={-40} z={-3} scale={0.9} />
      <Planter x={-11.2} z={-11.4} scale={0.8} />
      <Planter x={28.8} z={-2.4} scale={0.78} />
      <Planter x={40.3} z={-10.7} scale={0.9} />
      <group position={[-5, 0.25, -2.6]}><PlaneTree scale={0.76} /></group>
      <EntryBollards />
    </group>
  );
}

/**
 * 幸福里采用公开地图拓扑与多角度公开照片重建；不包含门牌、店名或参考照片贴图。
 */
export function XingfuliBlock() {
  return (
    <group data-neighborhood="xingfuli">
      <LanePaving />
      {XINGFULI_BUILDINGS.map((building) => (
        <XingfuliBuilding key={building.id} building={building} />
      ))}
      <ReflectingPool />
      <VerticalGarden />
      <EntranceMural />
      <LaneFurniture />
    </group>
  );
}
