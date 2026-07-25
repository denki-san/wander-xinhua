"use client";

import { Html, useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo } from "react";
import { Color, Mesh, Vector3 } from "three";
import type { SharedPrototypeQaGroup } from "./shared-prototype-massing";

export const SHARED_PROTOTYPE_IDENTITY_MODELS = [
  {
    id: "xinhua-plane-tree",
    family: "vegetation",
    path: "/models/tiers/shared-prototypes/identity/xinhua-plane-tree-identity.glb?v=8f8707bd9310",
  },
  {
    id: "lane-lamp-short-arm",
    family: "street-furniture",
    path: "/models/tiers/shared-prototypes/identity/lane-lamp-short-arm-identity.glb?v=f848fe9a86f7",
  },
  {
    id: "cantilever-umbrella",
    family: "street-furniture",
    path: "/models/tiers/shared-prototypes/identity/cantilever-umbrella-identity.glb?v=92e0484fa923",
  },
  {
    id: "outdoor-table-set",
    family: "street-furniture",
    path: "/models/tiers/shared-prototypes/identity/outdoor-table-set-identity.glb?v=73fb2d36d73b",
  },
  {
    id: "slatted-bench",
    family: "street-furniture",
    path: "/models/tiers/shared-prototypes/identity/slatted-bench-identity.glb?v=e537d541c410",
  },
  {
    id: "rectangular-planter",
    family: "street-furniture",
    path: "/models/tiers/shared-prototypes/identity/rectangular-planter-identity.glb?v=1f7dfd72af3b",
  },
  {
    id: "shanghai-dual-classification-bin",
    family: "street-furniture",
    path: "/models/tiers/shared-prototypes/identity/shanghai-dual-classification-bin-identity.glb?v=fe65c61f54ca",
  },
  {
    id: "irregular-stone-bollard",
    family: "street-furniture",
    path: "/models/tiers/shared-prototypes/identity/irregular-stone-bollard-identity.glb?v=5233bf658e2b",
  },
] as const;

function identityGalleryPosition(
  index: number,
  group: SharedPrototypeQaGroup,
): [number, number, number] {
  if (group === "vegetation") return [0, 0.04, 0];
  if (group === "street-furniture") {
    const column = index % 4;
    const row = Math.floor(index / 4);
    return [(column - 1.5) * 1.9, 0.025, (row - 0.5) * 1.85];
  }
  if (index === 0) return [-5.2, 0.04, 0];
  const furnitureIndex = index - 1;
  const column = furnitureIndex % 4;
  const row = Math.floor(furnitureIndex / 4);
  return [(column - 0.55) * 2.0, 0.025, (row - 0.5) * 1.9];
}

function SharedPrototypeIdentityAsset({
  id,
  family,
  path,
  displayIndex,
  group,
}: (typeof SHARED_PROTOTYPE_IDENTITY_MODELS)[number] & {
  displayIndex: number;
  group: SharedPrototypeQaGroup;
}) {
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
  const visible = group === "all" || family === group;
  return (
    <group
      name={`shared-prototype-identity-${id}`}
      position={identityGalleryPosition(displayIndex, group)}
      visible={visible}
      userData={{
        assetId: id,
        tier: "identity",
        qaOnly: true,
        displayScale: 1,
        family,
        authoredFrontBlender: "-Y",
        exportedFrontThree: "+Z",
      }}
    >
      <mesh position={[0, -0.04, 0]} receiveShadow>
        <cylinderGeometry args={[
          family === "vegetation" ? 2.1 : 0.78,
          family === "vegetation" ? 2.1 : 0.78,
          0.08,
          32,
        ]} />
        <meshToonMaterial
          color={family === "vegetation" ? "#4f6258" : "#625a51"}
        />
      </mesh>
      <primitive object={model} />
      {visible ? (
        <Html
          center
          position={[
            0,
            family === "vegetation" ? 0.28 : 0.14,
            family === "vegetation" ? 2.35 : 0.9,
          ]}
          distanceFactor={family === "vegetation" ? 14 : 4}
          transform
          sprite
        >
          <span
            style={{
              color: "#fff7e8",
              background: "rgba(23, 30, 30, 0.86)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "999px",
              display: "block",
              fontSize: "10px",
              padding: "3px 7px",
              whiteSpace: "nowrap",
            }}
          >
            {id}
          </span>
        </Html>
      ) : null}
    </group>
  );
}

function IdentityScaleReference({
  group,
}: {
  group: SharedPrototypeQaGroup;
}) {
  const position: [number, number, number] = group === "vegetation"
    ? [-3.8, 0, 2.5]
    : group === "street-furniture"
      ? [-4.5, 0, 1.7]
      : [-8.2, 0, 2.2];
  const personHeight = 1.75 / 2.7;
  const oneMeter = 1 / 2.7;
  return (
    <group
      name="qa-identity-authored-scale-reference"
      position={position}
      userData={{
        authoredMetersPerSceneUnit: 2.7,
        personHeightMeters: 1.75,
        rulerMeters: 1,
      }}
    >
      <mesh position={[0, personHeight * 0.58, 0]} castShadow>
        <capsuleGeometry args={[0.085, personHeight - 0.2, 4, 8]} />
        <meshToonMaterial color="#d66e55" />
      </mesh>
      <mesh position={[0, personHeight - 0.07, 0]} castShadow>
        <sphereGeometry args={[0.07, 12, 8]} />
        <meshToonMaterial color="#d66e55" />
      </mesh>
      <mesh position={[0.34, oneMeter * 0.5, 0]}>
        <boxGeometry args={[0.025, oneMeter, 0.025]} />
        <meshBasicMaterial color="#f3d56b" />
      </mesh>
      {[0, oneMeter].map((height) => (
        <mesh key={height} position={[0.34, height, 0]}>
          <boxGeometry args={[0.15, 0.018, 0.025]} />
          <meshBasicMaterial color="#f3d56b" />
        </mesh>
      ))}
      <Html
        center
        position={[0.16, personHeight + 0.13, 0]}
        distanceFactor={group === "street-furniture" ? 4.8 : 14}
        transform
        sprite
      >
        <span
          style={{
            color: "#fff7dc",
            background: "rgba(23, 30, 30, 0.9)",
            borderRadius: "4px",
            display: "block",
            fontSize: "10px",
            padding: "3px 5px",
            whiteSpace: "nowrap",
          }}
        >
          1.75m person · 1m ruler
        </span>
      </Html>
    </group>
  );
}

export function SharedPrototypeIdentityQaCamera({
  active,
  group,
}: {
  active: boolean;
  group: SharedPrototypeQaGroup;
}) {
  const { camera } = useThree();
  useLayoutEffect(() => {
    if (!active) return;
    if (group === "vegetation") {
      camera.position.set(9.2, 6.9, 11.5);
      camera.lookAt(new Vector3(0, 2.65, 0));
    } else if (group === "street-furniture") {
      camera.position.set(5.8, 3.9, 6.8);
      camera.lookAt(new Vector3(0, 0.42, 0));
    } else {
      camera.position.set(14.8, 10.4, 17.6);
      camera.lookAt(new Vector3(-0.8, 2.25, 0));
    }
    camera.up.set(0, 1, 0);
    camera.updateProjectionMatrix();
  }, [active, camera, group]);
  return null;
}

export function SharedPrototypeIdentityQaScene({
  group,
}: {
  group: SharedPrototypeQaGroup;
}) {
  const groupedAssets = SHARED_PROTOTYPE_IDENTITY_MODELS.filter(
    (asset) => group === "all" || asset.family === group,
  );
  const displayIndexById = new Map(
    groupedAssets.map((asset, index) => [asset.id, index]),
  );
  return (
    <group
      name="shared-prototype-identity-qa-gallery"
      userData={{
        tier: "identity",
        qaOnly: true,
        prototypeCount: 8,
        vegetationCount: 1,
        streetFurnitureCount: 7,
        group,
        authoredMetersPerSceneUnit: 2.7,
      }}
    >
      <color attach="background" args={[new Color("#1a2524")]} />
      <hemisphereLight color="#fff7e1" groundColor="#38423d" intensity={1.6} />
      <directionalLight
        castShadow
        position={[10, 16, 12]}
        intensity={2.15}
        color="#ffe5b6"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[
          group === "street-furniture" ? 10 : 18,
          0.12,
          group === "street-furniture" ? 6.4 : 13.5,
        ]} />
        <meshToonMaterial color="#2c3936" />
      </mesh>
      <IdentityScaleReference group={group} />
      {SHARED_PROTOTYPE_IDENTITY_MODELS.map((asset) => (
        <Suspense key={asset.id} fallback={null}>
          <SharedPrototypeIdentityAsset
            {...asset}
            group={group}
            displayIndex={displayIndexById.get(asset.id) ?? 0}
          />
        </Suspense>
      ))}
    </group>
  );
}
