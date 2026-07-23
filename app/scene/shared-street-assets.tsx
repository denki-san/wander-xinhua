"use client";

import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { InstancedMesh, Object3D } from "three";

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
}: {
  name: string;
  placements: StreetLampPlacement[];
  evidenceRef?: string;
}) {
  const poleInstances = useRef<InstancedMesh>(null);
  const armInstances = useRef<InstancedMesh>(null);
  const shadeInstances = useRef<InstancedMesh>(null);
  const glassInstances = useRef<InstancedMesh>(null);
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
        <meshBasicMaterial color="#ffe9ad" />
      </instancedMesh>
      {placements.filter(({ lit }) => lit).map((placement) => (
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
