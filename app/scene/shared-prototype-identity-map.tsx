"use client";

import { Html, useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo } from "react";
import { Mesh, Vector3 } from "three";
import placementSnapshotJson from "../../docs/research/model-placement-registry-20260725.json";
import { terrainHeightAt } from "./terrain";
import {
  SHARED_PROTOTYPE_IDENTITY_MODELS,
} from "./shared-prototype-identity";
import type { SharedPrototypeQaGroup } from "./shared-prototype-massing";

export type SharedPrototypeIdentityMapQaSite = "xinhua-road" | "xingfuli";

type RegisteredPlacement = {
  id: string;
  prototype: string;
  coordinateSpace: "authored-world" | "collection-local";
  position: [number, number, number];
  yaw?: number;
  scale?: number | [number, number, number];
  variant?: number | string;
  evidence: string;
};

type PlacementSnapshot = {
  vegetation: {
    xinhuaRoadPlaneTrees: RegisteredPlacement[];
    xingfuliPlaneTrees: RegisteredPlacement[];
  };
  streetFurniture: {
    xinhuaRoad: RegisteredPlacement[];
    xingfuli: RegisteredPlacement[];
  };
};

const placementSnapshot = placementSnapshotJson as unknown as PlacementSnapshot;
const pathBySlug: ReadonlyMap<string, string> = new Map(
  SHARED_PROTOTYPE_IDENTITY_MODELS.map(({ id, path }) => [id, path]),
);

function prototypeSlug(prototype: string) {
  return prototype.split(":").at(-1) ?? prototype;
}

function placementScale(
  scale: RegisteredPlacement["scale"],
): [number, number, number] {
  if (Array.isArray(scale)) return scale;
  if (typeof scale === "number") return [scale, scale, scale];
  return [1, 1, 1];
}

function roadGroundOffset(slug: string) {
  if (slug === "xinhua-plane-tree") return 0.08;
  if (slug === "lane-lamp-short-arm") return 0.18;
  return 0.13;
}

function IdentityMapInstance({
  placement,
  site,
}: {
  placement: RegisteredPlacement;
  site: SharedPrototypeIdentityMapQaSite;
}) {
  const slug = prototypeSlug(placement.prototype);
  const path = pathBySlug.get(slug);
  if (!path) throw new Error(`未登记 Identity GLB：${slug}`);
  const { scene } = useGLTF(path);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    return clone;
  }, [scene]);
  const [x, sourceY, z] = placement.position;
  const y = site === "xinhua-road"
    ? terrainHeightAt(x, z) + roadGroundOffset(slug)
    : sourceY;
  return (
    <group
      name={`shared-identity-map-${placement.id}`}
      position={[x, y, z]}
      rotation-y={placement.yaw ?? 0}
      scale={placementScale(placement.scale)}
      userData={{
        instanceId: placement.id,
        prototype: placement.prototype,
        tier: "identity",
        qaOnly: true,
        evidence: placement.evidence,
        transformPolicy: "same-registered-transform-no-tier-correction",
      }}
    >
      <mesh position={[0, 0.018, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.22, 0.34, 20]} />
        <meshBasicMaterial color="#ffde45" depthTest={false} />
      </mesh>
      <primitive object={model} />
    </group>
  );
}

function selectedPlacements(
  site: SharedPrototypeIdentityMapQaSite,
  group: SharedPrototypeQaGroup,
) {
  const vegetation = site === "xinhua-road"
    ? placementSnapshot.vegetation.xinhuaRoadPlaneTrees
    : placementSnapshot.vegetation.xingfuliPlaneTrees;
  const streetFurniture = site === "xinhua-road"
    ? placementSnapshot.streetFurniture.xinhuaRoad
    : placementSnapshot.streetFurniture.xingfuli;
  if (group === "vegetation") return vegetation;
  if (group === "street-furniture") return streetFurniture;
  return [...vegetation, ...streetFurniture];
}

export function SharedPrototypeIdentityMapQaLayer({
  site,
  group,
  xingfuliTransform,
}: {
  site: SharedPrototypeIdentityMapQaSite;
  group: SharedPrototypeQaGroup;
  xingfuliTransform: {
    position: [number, number, number];
    rotationY: number;
    scale: [number, number, number];
    localLaneCenterZ: number;
  };
}) {
  const placements = selectedPlacements(site, group);
  const content = (
    <>
      {placements.map((placement) => (
        <Suspense key={placement.id} fallback={null}>
          <IdentityMapInstance placement={placement} site={site} />
        </Suspense>
      ))}
    </>
  );
  const legendPosition: [number, number, number] = site === "xinhua-road"
    ? [12, 7, 86]
    : [0, 5.2, -6.2];
  const legend = (
    <Html center position={legendPosition} distanceFactor={42} transform sprite>
      <span
        style={{
          color: "#fff7dc",
          background: "rgba(24, 31, 30, 0.9)",
          border: "1px solid rgba(255,222,69,0.65)",
          borderRadius: "8px",
          display: "block",
          fontSize: "12px",
          lineHeight: 1.4,
          padding: "6px 9px",
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        Identity map QA · {site} · {group} · {placements.length} instances
        <br />
        same registered transforms · formal pass 0
      </span>
    </Html>
  );
  return (
    <group
      name={`shared-prototype-identity-map-qa-${site}-${group}`}
      userData={{
        tier: "identity",
        qaOnly: true,
        site,
        group,
        instanceCount: placements.length,
        mapScalePassCount: 0,
      }}
    >
      {site === "xinhua-road" ? (
        <>
          {content}
          {legend}
        </>
      ) : (
        <group
          position={xingfuliTransform.position}
          rotation-y={xingfuliTransform.rotationY}
        >
          <group scale={xingfuliTransform.scale}>
            <group position={[0, 0, -xingfuliTransform.localLaneCenterZ]}>
              {content}
              {legend}
            </group>
          </group>
        </group>
      )}
    </group>
  );
}

export function SharedPrototypeIdentityMapQaCamera({
  active,
  site,
  group,
  xingfuliWorldPosition,
}: {
  active: boolean;
  site?: SharedPrototypeIdentityMapQaSite;
  group: SharedPrototypeQaGroup;
  xingfuliWorldPosition: readonly [number, number];
}) {
  const { camera } = useThree();
  useLayoutEffect(() => {
    if (!active || !site) return;
    if (site === "xinhua-road") {
      camera.position.set(225, group === "street-furniture" ? 190 : 225, 330);
      camera.lookAt(new Vector3(12, 0, 86));
    } else {
      const [x, z] = xingfuliWorldPosition;
      camera.position.set(x + 34, 28, z + 44);
      camera.lookAt(new Vector3(x, 1.2, z));
    }
    camera.up.set(0, 1, 0);
    camera.updateProjectionMatrix();
  }, [active, camera, group, site, xingfuliWorldPosition]);
  return null;
}
