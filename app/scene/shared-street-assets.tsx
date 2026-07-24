"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  BufferGeometry,
  Color,
  IcosahedronGeometry,
  InstancedMesh,
  MeshToonMaterial,
  Object3D,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const DEFAULT_EVIDENCE_REF = "docs/knowledge-sources/xinhua-scene-dressing-kit.md";

export type StreetLampPlacement = {
  id: string;
  position: [number, number, number];
  yaw?: number;
  lit?: boolean;
};

export type StoneBollardPlacement = {
  id: string;
  position: [number, number, number];
  scale: [number, number, number];
  yaw: number;
};

export type StreetPlanterInstancePlacement = {
  id: string;
  position: [number, number, number];
  yaw: number;
  scale: number;
  variant: number;
};

export type StreetBinInstancePlacement = {
  id: string;
  position: [number, number, number];
  yaw: number;
  variant: number;
};

export type StreetShrubInstancePlacement = {
  id: string;
  position: [number, number, number];
  yaw: number;
  scale: [number, number, number];
  variant: number;
};

export type StreetAssetAnchor =
  | "entrance"
  | "storefront"
  | "waterside"
  | "courtyard"
  | "road-edge";

type StreetAssetGroupProps = {
  assetId: string;
  variant: string;
  anchor: StreetAssetAnchor;
  seed: number;
  footprint: [number, number];
  collision: "none" | "base-only" | "explicit-box";
  mobileTier: "essential" | "reduced" | "desktop-only";
  evidenceRef: string;
  children: ReactNode;
};

function StreetAssetGroup({
  assetId,
  variant,
  anchor,
  seed,
  footprint,
  collision,
  mobileTier,
  evidenceRef,
  children,
}: StreetAssetGroupProps) {
  return (
    <group
      name={`${assetId}-${variant}`}
      userData={{
        assetId,
        variant,
        anchor,
        seed,
        footprint,
        collision,
        mobileTier,
        evidenceRef,
      }}
    >
      {children}
    </group>
  );
}

export function HeritageLaneLamp({
  lit = false,
  anchor = "courtyard",
  seed = 0,
  evidenceRef,
}: {
  lit?: boolean;
  anchor?: StreetAssetAnchor;
  seed?: number;
  evidenceRef: string;
}) {
  return (
    <StreetAssetGroup
      assetId="lane-lamp-short-arm"
      variant="single-short-arm"
      anchor={anchor}
      seed={seed}
      footprint={[0.24, 0.24]}
      collision="base-only"
      mobileTier="essential"
      evidenceRef={evidenceRef}
    >
      <mesh position={[0, 1.68, 0]} castShadow>
        <cylinderGeometry args={[0.052, 0.086, 3.36, 10]} />
        <meshToonMaterial color="#263634" />
      </mesh>
      <mesh position={[0.24, 3.18, 0]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.042, 0.048, 0.5, 10]} />
        <meshToonMaterial color="#263634" />
      </mesh>
      <mesh position={[0.5, 3.08, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.13, 0.28, 8]} />
        <meshToonMaterial color="#ead39a" />
      </mesh>
      <mesh position={[0.5, 2.93, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.035, 8]} />
        <meshBasicMaterial color="#ffe9ad" />
      </mesh>
      {lit && <pointLight position={[0.5, 2.95, 0]} color="#ffd991" intensity={0.42} distance={4.5} />}
    </StreetAssetGroup>
  );
}

function writeLampPartMatrices(
  instances: InstancedMesh | null,
  placements: StreetLampPlacement[],
  localPosition: [number, number, number],
  localScale: [number, number, number],
  localRotationZ = 0,
) {
  if (!instances) return;
  const root = new Object3D();
  const part = new Object3D();
  root.add(part);
  part.position.set(...localPosition);
  part.scale.set(...localScale);
  part.rotation.z = localRotationZ;
  placements.forEach((placement, index) => {
    root.position.set(...placement.position);
    root.rotation.y = placement.yaw ?? 0;
    root.updateMatrixWorld(true);
    instances.setMatrixAt(index, part.matrixWorld);
  });
  instances.instanceMatrix.needsUpdate = true;
  instances.computeBoundingSphere();
}

export function StreetLampInstances({
  name,
  placements,
  evidenceRef = DEFAULT_EVIDENCE_REF,
  lightMode = "point-lights",
}: {
  name: string;
  placements: StreetLampPlacement[];
  evidenceRef?: string;
  lightMode?: "emissive-only" | "point-lights";
}) {
  const poleInstances = useRef<InstancedMesh>(null);
  const armInstances = useRef<InstancedMesh>(null);
  const shadeInstances = useRef<InstancedMesh>(null);
  const glassInstances = useRef<InstancedMesh>(null);
  const anyLit = placements.some(({ lit }) => lit);
  useLayoutEffect(() => {
    writeLampPartMatrices(poleInstances.current, placements, [0, 1.68, 0], [1, 1, 1]);
    writeLampPartMatrices(armInstances.current, placements, [0.24, 3.18, 0], [1, 1, 1], Math.PI / 2);
    writeLampPartMatrices(shadeInstances.current, placements, [0.5, 3.08, 0], [1, 1, 1]);
    writeLampPartMatrices(glassInstances.current, placements, [0.5, 2.93, 0], [1, 1, 1]);
  }, [placements]);
  return (
    <group
      name={name}
      userData={{
        assetId: "lane-lamp-short-arm",
        variant: "single-short-arm",
        seed: 6700,
        anchor: "road-edge",
        footprint: [0.24, 0.24],
        collision: "base-only",
        mobileTier: "essential",
        evidenceRef,
      }}
    >
      <instancedMesh ref={poleInstances} args={[undefined, undefined, placements.length]} castShadow>
        <cylinderGeometry args={[0.052, 0.086, 3.36, 10]} />
        <meshToonMaterial color="#263634" />
      </instancedMesh>
      <instancedMesh ref={armInstances} args={[undefined, undefined, placements.length]} castShadow>
        <cylinderGeometry args={[0.042, 0.048, 0.5, 10]} />
        <meshToonMaterial color="#263634" />
      </instancedMesh>
      <instancedMesh ref={shadeInstances} args={[undefined, undefined, placements.length]} castShadow>
        <cylinderGeometry args={[0.19, 0.13, 0.28, 8]} />
        <meshToonMaterial color="#ead39a" />
      </instancedMesh>
      <instancedMesh ref={glassInstances} args={[undefined, undefined, placements.length]}>
        <cylinderGeometry args={[0.13, 0.13, 0.035, 8]} />
        <meshStandardMaterial
          color={anyLit ? "#ffe9ad" : "#b8ae94"}
          emissive={anyLit ? "#ffd991" : "#000000"}
          emissiveIntensity={anyLit ? 1.1 : 0}
          roughness={0.72}
        />
      </instancedMesh>
      {lightMode === "point-lights" && placements.filter(({ lit }) => lit).map((placement) => (
        <pointLight
          key={placement.id}
          position={[
            placement.position[0] + Math.cos(placement.yaw ?? 0) * 0.5,
            placement.position[1] + 2.95,
            placement.position[2] - Math.sin(placement.yaw ?? 0) * 0.5,
          ]}
          color="#ffd991"
          intensity={0.42}
          distance={4.5}
        />
      ))}
    </group>
  );
}

export function CantileverCafeUmbrella({
  color = "#b9483e",
  anchor = "storefront",
  seed = 0,
  evidenceRef = DEFAULT_EVIDENCE_REF,
}: {
  color?: string;
  anchor?: StreetAssetAnchor;
  seed?: number;
  evidenceRef?: string;
}) {
  return (
    <StreetAssetGroup
      assetId="cantilever-umbrella"
      variant={color === "#b9483e" ? "coral-red" : "warm-gray"}
      anchor={anchor}
      seed={seed}
      footprint={[2.8, 2.8]}
      collision="none"
      mobileTier="essential"
      evidenceRef={evidenceRef}
    >
      <mesh position={[-1.18, 1.22, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.085, 2.44, 10]} />
        <meshToonMaterial color="#273735" />
      </mesh>
      <mesh position={[-0.43, 2.38, 0]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 1.5, 10]} />
        <meshToonMaterial color="#273735" />
      </mesh>
      <mesh position={[-0.8, 1.93, 0]} rotation-z={-0.7} castShadow>
        <cylinderGeometry args={[0.033, 0.033, 1.02, 8]} />
        <meshToonMaterial color="#273735" />
      </mesh>
      <mesh position={[0.32, 2.36, 0]} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[1.78, 0.42, 4]} />
        <meshToonMaterial color={color} />
      </mesh>
      <mesh position={[-1.18, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.34, 0.16, 10]} />
        <meshToonMaterial color="#59615d" />
      </mesh>
    </StreetAssetGroup>
  );
}

export function CantileverUmbrella({
  variant = 0,
  color,
}: {
  variant?: 0 | 1;
  color?: string;
}) {
  return (
    <CantileverCafeUmbrella
      color={color ?? (variant === 0 ? "#ad493f" : "#bd5548")}
      seed={6720 + variant}
    />
  );
}

function MoldedChair({ x, z, yaw }: { x: number; z: number; yaw: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={yaw}>
      <mesh position={[0, 0.46, 0]} castShadow>
        <boxGeometry args={[0.52, 0.1, 0.52]} />
        <meshToonMaterial color="#e8e6dd" />
      </mesh>
      <mesh position={[0, 0.78, 0.23]} rotation-x={-0.12} castShadow>
        <boxGeometry args={[0.52, 0.58, 0.08]} />
        <meshToonMaterial color="#e8e6dd" />
      </mesh>
      {[-0.19, 0.19].flatMap((legX) => [-0.17, 0.17].map((legZ) => (
        <mesh key={`${legX}-${legZ}`} position={[legX, 0.22, legZ]} castShadow>
          <cylinderGeometry args={[0.025, 0.035, 0.44, 6]} />
          <meshToonMaterial color="#c9c8c0" />
        </mesh>
      )))}
    </group>
  );
}

function DarkWoodChair({ x, z, yaw }: { x: number; z: number; yaw: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={yaw}>
      <mesh position={[0, 0.44, 0]} castShadow>
        <boxGeometry args={[0.52, 0.1, 0.48]} />
        <meshToonMaterial color="#7d553d" />
      </mesh>
      {[0.64, 0.84].map((height) => (
        <mesh key={height} position={[0, height, 0.22]} castShadow>
          <boxGeometry args={[0.52, 0.1, 0.08]} />
          <meshToonMaterial color="#7d553d" />
        </mesh>
      ))}
      {[-0.2, 0.2].map((legX) => (
        <mesh key={legX} position={[legX, 0.22, 0]} castShadow>
          <boxGeometry args={[0.055, 0.44, 0.42]} />
          <meshToonMaterial color="#283936" />
        </mesh>
      ))}
    </group>
  );
}

function FoldingChair({
  x,
  z,
  yaw,
  color,
}: {
  x: number;
  z: number;
  yaw: number;
  color: string;
}) {
  return (
    <group position={[x, 0, z]} rotation-y={yaw}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.48, 0.08, 0.44]} />
        <meshToonMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.76, 0.19]} rotation-x={-0.14} castShadow>
        <boxGeometry args={[0.48, 0.46, 0.07]} />
        <meshToonMaterial color={color} />
      </mesh>
      {[-1, 1].map((direction) => (
        <mesh key={direction} position={[direction * 0.18, 0.22, 0]} rotation-z={direction * 0.18} castShadow>
          <boxGeometry args={[0.045, 0.48, 0.38]} />
          <meshToonMaterial color="#303f3c" />
        </mesh>
      ))}
    </group>
  );
}

export type OutdoorDiningVariant =
  | "white-molded"
  | "dark-wood-metal"
  | "dark-timber"
  | "colorful-folding"
  | "color-folding";

export function OutdoorDiningSet({
  variant,
  anchor = "storefront",
  seed = 0,
  evidenceRef = DEFAULT_EVIDENCE_REF,
}: {
  variant: OutdoorDiningVariant;
  anchor?: StreetAssetAnchor;
  seed?: number;
  evidenceRef?: string;
}) {
  const chairs = [
    { x: -0.92, z: 0, yaw: Math.PI / 2 },
    { x: 0.92, z: 0, yaw: -Math.PI / 2 },
    { x: 0, z: 0.86, yaw: Math.PI },
  ];
  const foldingColors = ["#d3674f", "#4f8c82", "#d4a94f"];
  return (
    <StreetAssetGroup
      assetId="outdoor-table-set"
      variant={variant}
      anchor={anchor}
      seed={seed}
      footprint={[2.4, 2.2]}
      collision="explicit-box"
      mobileTier={variant === "white-molded" ? "essential" : "reduced"}
      evidenceRef={evidenceRef}
    >
      {variant === "white-molded" ? (
        <>
          <mesh position={[0, 0.66, 0]} castShadow>
            <cylinderGeometry args={[0.62, 0.62, 0.1, 14]} />
            <meshToonMaterial color="#e4e2d9" />
          </mesh>
          <mesh position={[0, 0.34, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.075, 0.62, 8]} />
            <meshToonMaterial color="#374542" />
          </mesh>
          {chairs.map((chair) => <MoldedChair key={`${chair.x}-${chair.z}`} {...chair} />)}
        </>
      ) : variant === "dark-wood-metal" || variant === "dark-timber" ? (
        <>
          <mesh position={[0, 0.68, 0]} castShadow>
            <boxGeometry args={[1.34, 0.12, 0.72]} />
            <meshToonMaterial color="#7c563f" />
          </mesh>
          {[-0.48, 0.48].map((x) => (
            <mesh key={x} position={[x, 0.34, 0]} castShadow>
              <boxGeometry args={[0.07, 0.68, 0.58]} />
              <meshToonMaterial color="#2b3a37" />
            </mesh>
          ))}
          {chairs.slice(0, 2).map((chair) => <DarkWoodChair key={`${chair.x}-${chair.z}`} {...chair} />)}
        </>
      ) : (
        <>
          <mesh position={[0, 0.65, 0]} castShadow>
            <boxGeometry args={[1.05, 0.08, 1.05]} />
            <meshToonMaterial color="#d9d0b8" />
          </mesh>
          <mesh position={[0, 0.32, 0]} castShadow>
            <boxGeometry args={[0.1, 0.64, 0.1]} />
            <meshToonMaterial color="#34433f" />
          </mesh>
          {chairs.map((chair, index) => (
            <FoldingChair key={`${chair.x}-${chair.z}`} {...chair} color={foldingColors[index]} />
          ))}
        </>
      )}
    </StreetAssetGroup>
  );
}

export function SlattedBench({
  anchor = "courtyard",
  seed = 0,
  evidenceRef = DEFAULT_EVIDENCE_REF,
}: {
  anchor?: StreetAssetAnchor;
  seed?: number;
  evidenceRef?: string;
}) {
  return (
    <StreetAssetGroup
      assetId="slatted-bench"
      variant="backrest"
      anchor={anchor}
      seed={seed}
      footprint={[2.35, 0.82]}
      collision="explicit-box"
      mobileTier="essential"
      evidenceRef={evidenceRef}
    >
      {[-0.28, -0.08, 0.12].map((z) => (
        <mesh key={z} position={[0, 0.48, z]} castShadow>
          <boxGeometry args={[2.08, 0.1, 0.16]} />
          <meshToonMaterial color="#936448" />
        </mesh>
      ))}
      {[0.69, 0.87].map((y) => (
        <mesh key={y} position={[0, y, 0.28]} castShadow>
          <boxGeometry args={[2.08, 0.12, 0.12]} />
          <meshToonMaterial color="#936448" />
        </mesh>
      ))}
      {[-0.82, 0.82].map((x) => (
        <mesh key={x} position={[x, 0.25, 0]} castShadow>
          <boxGeometry args={[0.11, 0.5, 0.58]} />
          <meshToonMaterial color="#2b3d39" />
        </mesh>
      ))}
    </StreetAssetGroup>
  );
}

export function StreetPlanter({
  variant = "square",
  anchor = "storefront",
  seed = 0,
  evidenceRef = DEFAULT_EVIDENCE_REF,
}: {
  variant?: "square" | "long" | "tall" | 0 | 1 | 2;
  anchor?: StreetAssetAnchor;
  seed?: number;
  evidenceRef?: string;
}) {
  const normalizedVariant = variant === 1 ? "tall" : variant === 2 ? "long" : variant === 0 ? "square" : variant;
  const dimensions = normalizedVariant === "long" ? [1.4, 0.55, 0.54] : normalizedVariant === "tall" ? [0.62, 0.82, 0.62] : [0.72, 0.62, 0.72];
  return (
    <StreetAssetGroup
      assetId="rectangular-planter"
      variant={normalizedVariant}
      anchor={anchor}
      seed={seed}
      footprint={[dimensions[0], dimensions[2]]}
      collision="base-only"
      mobileTier="reduced"
      evidenceRef={evidenceRef}
    >
      <mesh position={[0, dimensions[1] / 2, 0]} castShadow>
        <boxGeometry args={dimensions as [number, number, number]} />
        <meshToonMaterial color="#434c48" />
      </mesh>
      {[-0.22, 0.18].map((x, index) => (
        <mesh key={x} position={[x * (normalizedVariant === "long" ? 2 : 1), dimensions[1] + 0.35 + index * 0.08, 0]} castShadow>
          <icosahedronGeometry args={[0.42 + index * 0.06, 1]} />
          <meshToonMaterial color={index ? "#4e7859" : "#64845d"} />
        </mesh>
      ))}
    </StreetAssetGroup>
  );
}

function writeColoredInstanceMatrices<T extends {
  position: [number, number, number];
  yaw: number;
  variant: number;
}>(
  instances: InstancedMesh | null,
  placements: T[],
  colors: readonly string[],
  localPosition: [number, number, number],
  localScale: [number, number, number],
) {
  if (!instances) return;
  const helper = new Object3D();
  const color = new Color();
  placements.forEach((placement, index) => {
    const placementScale = "scale" in placement && typeof placement.scale === "number"
      ? placement.scale
      : 1;
    const cosine = Math.cos(placement.yaw);
    const sine = Math.sin(placement.yaw);
    helper.position.set(
      placement.position[0] + cosine * localPosition[0] + sine * localPosition[2],
      placement.position[1] + localPosition[1] * placementScale,
      placement.position[2] - sine * localPosition[0] + cosine * localPosition[2],
    );
    helper.rotation.set(0, placement.yaw, 0);
    helper.scale.set(
      localScale[0] * placementScale,
      localScale[1] * placementScale,
      localScale[2] * placementScale,
    );
    helper.updateMatrix();
    instances.setMatrixAt(index, helper.matrix);
    instances.setColorAt(index, color.set(colors[placement.variant % colors.length]));
  });
  instances.instanceMatrix.needsUpdate = true;
  if (instances.instanceColor) instances.instanceColor.needsUpdate = true;
  instances.computeBoundingSphere();
}

export function StreetPlanterInstances({
  name,
  placements,
  evidenceRef = DEFAULT_EVIDENCE_REF,
  season = "summer",
}: {
  name: string;
  placements: StreetPlanterInstancePlacement[];
  evidenceRef?: string;
  season?: "summer" | "autumn";
}) {
  const bases = useRef<InstancedMesh>(null);
  const foliage = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    writeColoredInstanceMatrices(
      bases.current,
      placements,
      ["#3d4844", "#514a42", "#46504b"],
      [0, 0.28, 0],
      [1, 1, 1],
    );
    writeColoredInstanceMatrices(
      foliage.current,
      placements,
      season === "autumn"
        ? ["#8b7548", "#9a8450", "#6f7245"]
        : ["#607b53", "#71865a", "#4f7358"],
      [0, 0.82, 0],
      [0.78, 0.62, 0.78],
    );
  }, [placements, season]);
  return (
    <group
      name={name}
      userData={{
        assetId: "rectangular-planter",
        variant: "instanced-street-family",
        anchor: "road-edge",
        collision: "none",
        mobileTier: "reduced",
        evidenceRef,
      }}
    >
      <instancedMesh ref={bases} args={[undefined, undefined, placements.length]} castShadow receiveShadow>
        <boxGeometry args={[0.78, 0.56, 0.72]} />
        <meshToonMaterial color="#ffffff" />
      </instancedMesh>
      <instancedMesh ref={foliage} args={[undefined, undefined, placements.length]} castShadow>
        <icosahedronGeometry args={[0.62, 1]} />
        <meshToonMaterial color="#ffffff" />
      </instancedMesh>
    </group>
  );
}

export function StreetBinInstances({
  name,
  placements,
  evidenceRef = DEFAULT_EVIDENCE_REF,
  condition = "clean",
}: {
  name: string;
  placements: StreetBinInstancePlacement[];
  evidenceRef?: string;
  condition?: "clean" | "weathered";
}) {
  const bodies = useRef<InstancedMesh>(null);
  const caps = useRef<InstancedMesh>(null);
  const residualPanels = useRef<InstancedMesh>(null);
  const recyclablePanels = useRef<InstancedMesh>(null);
  const residualOpenings = useRef<InstancedMesh>(null);
  const recyclableOpenings = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    writeColoredInstanceMatrices(
      bodies.current,
      placements,
      condition === "weathered"
        ? ["#58716b", "#4d6863"]
        : ["#5f8179", "#52776f"],
      [0, 0.43, 0],
      [1, 1, 1],
    );
    writeColoredInstanceMatrices(
      caps.current,
      placements,
      condition === "weathered"
        ? ["#777970", "#686d68"]
        : ["#b6b9b2", "#9fa6a0"],
      [0, 0.87, 0],
      [1, 1, 1],
    );
    writeColoredInstanceMatrices(
      residualPanels.current,
      placements,
      ["#293332", "#333a37"],
      [-0.205, 0.45, 0.213],
      [1, 1, 1],
    );
    writeColoredInstanceMatrices(
      recyclablePanels.current,
      placements,
      ["#157f9f", "#247893"],
      [0.205, 0.45, 0.213],
      [1, 1, 1],
    );
    writeColoredInstanceMatrices(
      residualOpenings.current,
      placements,
      ["#151a19", "#1c201f"],
      [-0.205, 0.73, 0.226],
      [1, 1, 1],
    );
    writeColoredInstanceMatrices(
      recyclableOpenings.current,
      placements,
      ["#17201f", "#1a2321"],
      [0.205, 0.73, 0.226],
      [1, 1, 1],
    );
  }, [condition, placements]);
  return (
    <group
      name={name}
      userData={{
        assetId: "shanghai-dual-classification-bin",
        variant: "stainless-black-blue-instanced",
        anchor: "road-edge",
        collision: "none",
        mobileTier: "reduced",
        evidenceRef,
      }}
    >
      <instancedMesh ref={bodies} args={[undefined, undefined, placements.length]} castShadow receiveShadow>
        <boxGeometry args={[0.82, 0.82, 0.4]} />
        <meshStandardMaterial color="#ffffff" metalness={0.22} roughness={0.62} />
      </instancedMesh>
      <instancedMesh ref={caps} args={[undefined, undefined, placements.length]} castShadow>
        <boxGeometry args={[0.9, 0.08, 0.46]} />
        <meshStandardMaterial color="#ffffff" metalness={0.24} roughness={0.58} />
      </instancedMesh>
      <instancedMesh ref={residualPanels} args={[undefined, undefined, placements.length]}>
        <boxGeometry args={[0.33, 0.5, 0.025]} />
        <meshToonMaterial color="#ffffff" />
      </instancedMesh>
      <instancedMesh ref={recyclablePanels} args={[undefined, undefined, placements.length]}>
        <boxGeometry args={[0.33, 0.5, 0.025]} />
        <meshToonMaterial color="#ffffff" />
      </instancedMesh>
      <instancedMesh ref={residualOpenings} args={[undefined, undefined, placements.length]}>
        <boxGeometry args={[0.25, 0.11, 0.03]} />
        <meshToonMaterial color="#ffffff" />
      </instancedMesh>
      <instancedMesh ref={recyclableOpenings} args={[undefined, undefined, placements.length]}>
        <boxGeometry args={[0.25, 0.11, 0.03]} />
        <meshToonMaterial color="#ffffff" />
      </instancedMesh>
    </group>
  );
}

function createFacetedShrubGeometry(): BufferGeometry {
  const pieces = [
    { position: [-0.3, 0.33, 0.05], scale: [0.66, 0.46, 0.56], yaw: -0.24 },
    { position: [0.3, 0.36, -0.08], scale: [0.58, 0.52, 0.52], yaw: 0.41 },
    { position: [0.02, 0.62, 0.11], scale: [0.46, 0.42, 0.44], yaw: 0.12 },
  ] as const;
  const geometries = pieces.map(({ position, scale, yaw }) => {
    const geometry = new IcosahedronGeometry(1, 0);
    const transform = new Object3D();
    transform.position.set(position[0], position[1], position[2]);
    transform.scale.set(scale[0], scale[1], scale[2]);
    transform.rotation.y = yaw;
    transform.updateMatrix();
    geometry.applyMatrix4(transform.matrix);
    return geometry;
  });
  const merged = mergeGeometries(geometries, false);
  geometries.forEach((geometry) => geometry.dispose());
  const faceted = merged.index ? merged.toNonIndexed() : merged;
  if (faceted !== merged) merged.dispose();
  faceted.computeVertexNormals();
  return faceted;
}

export function StreetShrubInstances({
  name,
  placements,
  evidenceRef = DEFAULT_EVIDENCE_REF,
  season = "summer",
}: {
  name: string;
  placements: StreetShrubInstancePlacement[];
  evidenceRef?: string;
  season?: "summer" | "autumn";
}) {
  const shrubs = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => createFacetedShrubGeometry(), []);
  const material = useMemo(() => new MeshToonMaterial({ color: "#ffffff" }), []);
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);
  useLayoutEffect(() => {
    if (!shrubs.current) return;
    const helper = new Object3D();
    const color = new Color();
    const colors = season === "autumn"
      ? ["#7d7248", "#907b4b", "#65704a"]
      : ["#526f4e", "#678052", "#486957"];
    placements.forEach((placement, index) => {
      helper.position.set(...placement.position);
      helper.rotation.set(0, placement.yaw, 0);
      helper.scale.set(...placement.scale);
      helper.updateMatrix();
      shrubs.current?.setMatrixAt(index, helper.matrix);
      shrubs.current?.setColorAt(index, color.set(colors[placement.variant % colors.length]));
    });
    shrubs.current.instanceMatrix.needsUpdate = true;
    if (shrubs.current.instanceColor) shrubs.current.instanceColor.needsUpdate = true;
    shrubs.current.computeBoundingSphere();
  }, [placements, season]);
  return (
    <instancedMesh
      ref={shrubs}
      geometry={geometry}
      material={material}
      args={[undefined, undefined, placements.length]}
      castShadow
      name={name}
      userData={{
        assetId: "road-edge-shrub",
        variant: "three-lobe-faceted-low-poly",
        anchor: "road-edge",
        collision: "none",
        mobileTier: "reduced",
        evidenceRef,
      }}
    />
  );
}

export function IrregularStoneBollard({
  variant,
  anchor = "entrance",
  seed,
  evidenceRef = DEFAULT_EVIDENCE_REF,
}: {
  variant: 0 | 1 | 2;
  anchor?: StreetAssetAnchor;
  seed: number;
  evidenceRef?: string;
}) {
  const radius = [0.34, 0.29, 0.38][variant];
  const height = [0.9, 0.76, 0.64][variant];
  return (
    <StreetAssetGroup
      assetId="irregular-stone-bollard"
      variant={["squat-square", "slanted-square", "low-block"][variant]}
      anchor={anchor}
      seed={seed}
      footprint={[radius * 2, radius * 2]}
      collision="base-only"
      mobileTier="essential"
      evidenceRef={evidenceRef}
    >
      <mesh position={[0, height / 2, 0]} rotation-y={variant * 0.37} rotation-z={(variant - 1) * 0.035} castShadow>
        <boxGeometry args={[radius * 1.7, height, radius * 1.45]} />
        <meshToonMaterial color={["#4f5450", "#444946", "#5b5d57"][variant]} />
      </mesh>
    </StreetAssetGroup>
  );
}

export function IrregularStoneBollards({
  name,
  placements,
  evidenceRef = DEFAULT_EVIDENCE_REF,
}: {
  name: string;
  placements: StoneBollardPlacement[];
  evidenceRef?: string;
}) {
  const instances = useRef<InstancedMesh>(null);
  const helper = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => {
    if (!instances.current) return;
    placements.forEach((placement, index) => {
      helper.position.set(...placement.position);
      helper.scale.set(...placement.scale);
      helper.rotation.set(0, placement.yaw, (index % 3 - 1) * 0.035);
      helper.updateMatrix();
      instances.current?.setMatrixAt(index, helper.matrix);
    });
    instances.current.instanceMatrix.needsUpdate = true;
    instances.current.computeBoundingSphere();
  }, [helper, placements]);
  return (
    <instancedMesh
      ref={instances}
      args={[undefined, undefined, placements.length]}
      castShadow
      name={name}
      userData={{
        assetId: "irregular-stone-bollard",
        variant: "five-deterministic-squat-blocks",
        seed: 6740,
        anchor: "entrance",
        collision: "base-only",
        mobileTier: "essential",
        evidenceRef,
      }}
    >
      <boxGeometry args={[1.6, 1.45, 1.35]} />
      <meshToonMaterial color="#4f5450" />
    </instancedMesh>
  );
}
