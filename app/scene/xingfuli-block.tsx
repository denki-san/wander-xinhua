"use client";

import { RoundedBox, useGLTF } from "@react-three/drei";
import {
  Component,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  InstancedMesh,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  Object3D,
} from "three";
import {
  PlaneTreeInstances,
  type PlaneTreeInstancePlacement,
} from "./plane-tree-instances";
import { MixedStonePaving } from "./mixed-stone-paving";
import {
  CantileverCafeUmbrella,
  IrregularStoneBollards,
  OutdoorDiningSet,
  SlattedBench,
  StreetLampInstances,
  StreetPlanter,
  type StoneBollardPlacement,
  type StreetLampPlacement,
} from "./shared-street-assets";
import {
  XINGFULI_BUILDINGS,
  XINGFULI_OBSTACLES,
  XINGFULI_QA_PATHS,
  type XingfuliBuilding,
} from "./xingfuli-collision";

const FLOOR_HEIGHT = 2.08;
const LANE_CENTER_Z = -7;
const XINGFULI_STREET_EVIDENCE = "docs/research/xingfuli-reference-manifest.json";
const GARDEN_CELLS = Array.from({ length: 72 }, (_, index) => ({
  y: 0.7 + Math.floor(index / 8) * 0.78,
  z: -3.1 + (index % 8) * 0.88,
  color: index % 5 === 0 ? "#78924e" : index % 2 ? "#4f7d55" : "#386849",
  scale: 0.26 + (index % 3) * 0.045,
}));
const GARDEN_COLORS = ["#78924e", "#4f7d55", "#386849"] as const;
const REFLECTING_POOL = { x: 16.5, z: -3.95, width: 18, depth: 2.15 };
const XINGFULI_PLANE_TREE_PLACEMENTS: PlaneTreeInstancePlacement[] = [
  {
    id: "xingfuli-panyu-entrance-plane-tree",
    variant: 0,
    position: [40.1, 0.25, -3.15],
    yaw: 1.08,
    scale: [0.66, 0.7, 0.68],
  },
  {
    id: "xingfuli-pool-plane-tree",
    variant: 1,
    position: [REFLECTING_POOL.x + 5.6, 0.48, REFLECTING_POOL.z],
    yaw: 0.42,
    scale: [0.82, 0.86, 0.88],
  },
  {
    id: "xingfuli-lane-plane-tree",
    variant: 2,
    position: [-5, 0.25, -2.6],
    yaw: 2.18,
    scale: [0.72, 0.76, 0.8],
  },
];
const XINGFULI_LAMP_PLACEMENTS: StreetLampPlacement[] = [
  { id: "west-north", position: [-35, 0.26, -2.1] },
  { id: "west-south", position: [-20, 0.26, -11.7], yaw: Math.PI, lit: true },
  { id: "center-north", position: [-6.5, 0.26, -2.1] },
  { id: "center-south", position: [2.5, 0.26, -11.7], yaw: Math.PI },
  { id: "east-south", position: [30, 0.26, -11.7], yaw: Math.PI, lit: true },
  { id: "east-north", position: [39, 0.26, -2.1] },
];
// 公开照片只证明番禺路入口存在一排膝高石桩；不把未知的幸福路入口补成对称造景。
const XINGFULI_ENTRY_BOLLARDS: StoneBollardPlacement[] = [
  -11.8,
  -9,
  -6.2,
  -3.4,
  -0.6,
].map((z, index) => ({
    id: `east-entry-bollard-${index}`,
    position: [44.6, 0.3, z] as [number, number, number],
    scale: [
      0.34 + (index % 2) * 0.045,
      0.26 + (index % 3) * 0.035,
      0.32 + ((index + 1) % 2) * 0.04,
    ] as [number, number, number],
    yaw: index * 0.37,
  }));
export const XINGFULI_DETAIL_UPGRADE = {
  windowLayersBefore: 3,
  windowLayersAfter: 6,
  storefrontLayersBefore: 3,
  storefrontLayersAfter: 7,
  poolEdgeDetailsBefore: 1,
  poolEdgeDetailsAfter: 9,
} as const;

type Building = XingfuliBuilding;

// JSON 是可直接回归测试的结构化事实表；ID 只表示方位，不冒充真实座号。
export { XINGFULI_BUILDINGS, XINGFULI_OBSTACLES, XINGFULI_QA_PATHS };

const XINGFULI_ARCHITECTURE_MODELS = [
  "/models/xingfuli/xingfuli-west.glb?v=20260723-final-1",
  "/models/xingfuli/xingfuli-center.glb?v=20260723-final-1",
  "/models/xingfuli/xingfuli-east.glb?v=20260723-final-1",
] as const;

function configureArchitectureModel(source: Object3D) {
  const clone = source.clone(true);
  const materialCache = new Map<string, MeshToonMaterial | MeshStandardMaterial>();
  clone.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const sourceWasArray = Array.isArray(child.material);
    const sourceMaterials: Material[] = sourceWasArray ? child.material : [child.material];
    const replacements = sourceMaterials.map((sourceMaterial) => {
      const name = sourceMaterial.name || "幸福里灰模材质";
      let replacement = materialCache.get(name);
      if (replacement) return replacement;
      const color = sourceMaterial instanceof MeshStandardMaterial
        || sourceMaterial instanceof MeshToonMaterial
        || sourceMaterial instanceof MeshBasicMaterial
        ? sourceMaterial.color.clone()
        : undefined;
      if (name.includes("玻璃")) {
        replacement = new MeshStandardMaterial({
          color: color ?? "#739b9e",
          transparent: true,
          opacity: 0.78,
          roughness: 0.34,
          metalness: 0,
          depthWrite: false,
        });
      } else {
        replacement = new MeshToonMaterial({ color: color ?? "#e9e7de" });
      }
      replacement.name = name;
      materialCache.set(name, replacement);
      return replacement;
    });
    child.material = sourceWasArray ? replacements : replacements[0];
    child.castShadow = !sourceMaterials.every(({ name }) => name.includes("玻璃"));
    child.receiveShadow = true;
  });
  return clone;
}

function XingfuliArchitectureSegment({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  const model = useMemo(() => configureArchitectureModel(scene), [scene]);
  useEffect(() => () => {
    const materials = new Set<Material>();
    model.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
      childMaterials.forEach((childMaterial) => materials.add(childMaterial));
    });
    materials.forEach((childMaterial) => childMaterial.dispose());
  }, [model]);
  return <primitive object={model} scale={[1, 1, -1]} />;
}

class XingfuliArchitectureBoundary extends Component<{
  children: ReactNode;
  fallback: ReactNode;
}, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function XingfuliProceduralArchitectureFallback() {
  return (
    <>
      <mesh position={[0, 0.17, LANE_CENTER_Z]} receiveShadow>
        <boxGeometry args={[94, 0.18, 14]} />
        <meshToonMaterial color="#aaa9a1" />
      </mesh>
      {XINGFULI_BUILDINGS.map((building) => (
        <XingfuliBuilding key={building.id} building={building} />
      ))}
      <ReflectingPoolHardscapeFallback />
    </>
  );
}

function XingfuliArchitecture() {
  const fallback = <XingfuliProceduralArchitectureFallback />;
  return (
    <XingfuliArchitectureBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <group
          name="xingfuli-final-architecture"
          userData={{
            asset: "xingfuli",
            stage: "final",
            segments: 3,
            referenceManifest: "docs/research/xingfuli-reference-manifest.json",
          }}
        >
          {XINGFULI_ARCHITECTURE_MODELS.map((path) => (
            <XingfuliArchitectureSegment key={path} path={path} />
          ))}
        </group>
      </Suspense>
    </XingfuliArchitectureBoundary>
  );
}

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

function ReflectingPoolHardscapeFallback() {
  return (
    <group position={[REFLECTING_POOL.x, 0, REFLECTING_POOL.z]}>
      <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
        <boxGeometry args={[REFLECTING_POOL.width, 0.34, REFLECTING_POOL.depth]} />
        <meshToonMaterial color="#394b47" />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 0.56, side * 1]} castShadow receiveShadow>
          <boxGeometry args={[REFLECTING_POOL.width + 0.25, 0.13, 0.22]} />
          <meshToonMaterial color="#394b47" />
        </mesh>
      ))}
      <group position={[-3.9, 0.65, 0]}>
        {Array.from({ length: 7 }, (_, index) => (
          <mesh key={index} position={[(index - 3) * 0.34, 0, 0]} castShadow>
            <boxGeometry args={[0.28, 0.13, REFLECTING_POOL.depth + 0.75]} />
            <meshToonMaterial color="#8d5f43" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function ReflectingPoolDynamicDetails() {
  return (
    <group position={[REFLECTING_POOL.x, 0, REFLECTING_POOL.z]}>
      {/* 池壳、池沿和木桥已经进入 site GLB；这里只保留动态水面、喷泉和树基座。 */}
      <mesh position={[0, 0.505, 0]} receiveShadow>
        <boxGeometry args={[REFLECTING_POOL.width - 0.58, 0.05, REFLECTING_POOL.depth - 0.56]} />
        <meshToonMaterial color="#5d9da0" transparent opacity={0.86} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0.52, side * (REFLECTING_POOL.depth / 2 - 0.08)]}>
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
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.72, 0.86, 0.28, 12]} />
          <meshToonMaterial color="#47534e" />
        </mesh>
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

function LaneFurniture() {
  return (
    <group name="xingfuli-reusable-street-dressing">
      <StreetLampInstances
        name="xingfuli-street-lamps"
        placements={XINGFULI_LAMP_PLACEMENTS}
        evidenceRef={XINGFULI_STREET_EVIDENCE}
      />
      <group position={[-27.5, 0.25, -2.7]}>
        <SlattedBench seed={27} evidenceRef={XINGFULI_STREET_EVIDENCE} />
      </group>
      <group position={[29, 0.25, -10.9]} rotation-y={Math.PI}>
        <SlattedBench seed={29} evidenceRef={XINGFULI_STREET_EVIDENCE} />
      </group>
      <group position={[-18.5, 0.29, -8.4]} rotation-y={0.1}>
        <CantileverCafeUmbrella seed={18} evidenceRef={XINGFULI_STREET_EVIDENCE} />
        <OutdoorDiningSet variant="dark-wood-metal" seed={19} evidenceRef={XINGFULI_STREET_EVIDENCE} />
      </group>
      <group position={[34, 0.29, -8.6]} rotation-y={-0.08}>
        <CantileverCafeUmbrella color="#c04f45" seed={7} evidenceRef={XINGFULI_STREET_EVIDENCE} />
        <OutdoorDiningSet variant="white-molded" seed={8} evidenceRef={XINGFULI_STREET_EVIDENCE} />
      </group>
      <group position={[-6.8, 0.29, -10.7]} rotation-y={0.12}>
        <OutdoorDiningSet variant="colorful-folding" seed={32} evidenceRef={XINGFULI_STREET_EVIDENCE} />
      </group>
      <group name="planter-west-square-base" position={[-40, 0.28, -3]} scale={0.9}>
        <StreetPlanter variant="square" seed={40} evidenceRef={XINGFULI_STREET_EVIDENCE} />
      </group>
      <group name="planter-center-tall-base" position={[-11.2, 0.28, -11.4]} scale={0.8}>
        <StreetPlanter variant="tall" seed={11} evidenceRef={XINGFULI_STREET_EVIDENCE} />
      </group>
      <group name="planter-east-long-base" position={[28.8, 0.28, -2.4]} scale={0.78}>
        <StreetPlanter variant="long" seed={28} evidenceRef={XINGFULI_STREET_EVIDENCE} />
      </group>
      <group name="planter-east-square-base" position={[40.3, 0.28, -10.7]} scale={0.9}>
        <StreetPlanter variant="square" seed={41} evidenceRef={XINGFULI_STREET_EVIDENCE} />
      </group>
      <IrregularStoneBollards
        name="xingfuli-entry-stone-bollards"
        placements={XINGFULI_ENTRY_BOLLARDS}
        evidenceRef={XINGFULI_STREET_EVIDENCE}
      />
    </group>
  );
}

/**
 * 幸福里采用公开地图拓扑与多角度公开照片重建；不包含门牌、店名或参考照片贴图。
 */
export function XingfuliBlock({
  loadDetailedArchitecture = true,
}: {
  loadDetailedArchitecture?: boolean;
}) {
  return (
    <group data-neighborhood="xingfuli">
      {loadDetailedArchitecture
        ? <XingfuliArchitecture />
        : <XingfuliProceduralArchitectureFallback />}
      <MixedStonePaving name="xingfuli-mixed-stone-paving" />
      <ReflectingPoolDynamicDetails />
      <VerticalGarden />
      <EntranceMural />
      <LaneFurniture />
      <PlaneTreeInstances
        name="xingfuli-plane-tree-batches"
        placements={XINGFULI_PLANE_TREE_PLACEMENTS}
      />
    </group>
  );
}
