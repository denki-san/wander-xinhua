"use client";

import { Html, useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo } from "react";
import { Color, Mesh, Vector3 } from "three";

const SHARED_PROTOTYPE_MASSING = [
  { id: "xinhua-plane-tree", family: "vegetation", path: "/models/tiers/shared-prototypes/massing/xinhua-plane-tree-massing.glb?v=c0e90c130e1f" },
  { id: "shangsheng-campus-tree", family: "vegetation", path: "/models/tiers/shared-prototypes/massing/shangsheng-campus-tree-massing.glb?v=d43e6e5144f4" },
  { id: "huashan-canopy-tree", family: "vegetation", path: "/models/tiers/shared-prototypes/massing/huashan-canopy-tree-massing.glb?v=9d5fca57ec81" },
  { id: "huashan-understory", family: "vegetation", path: "/models/tiers/shared-prototypes/massing/huashan-understory-massing.glb?v=2a18baa8bb9c" },
  { id: "road-edge-shrub", family: "vegetation", path: "/models/tiers/shared-prototypes/massing/road-edge-shrub-massing.glb?v=f46f832e6a0c" },
  { id: "lane-lamp-short-arm", family: "street-furniture", path: "/models/tiers/shared-prototypes/massing/lane-lamp-short-arm-massing.glb?v=815cbceb975b" },
  { id: "cantilever-umbrella", family: "street-furniture", path: "/models/tiers/shared-prototypes/massing/cantilever-umbrella-massing.glb?v=bb9f7ae3ac1c" },
  { id: "outdoor-table-set", family: "street-furniture", path: "/models/tiers/shared-prototypes/massing/outdoor-table-set-massing.glb?v=5600a2de04ff" },
  { id: "slatted-bench", family: "street-furniture", path: "/models/tiers/shared-prototypes/massing/slatted-bench-massing.glb?v=0a02128b8d06" },
  { id: "rectangular-planter", family: "street-furniture", path: "/models/tiers/shared-prototypes/massing/rectangular-planter-massing.glb?v=0ecdb359f37a" },
  { id: "shanghai-dual-classification-bin", family: "street-furniture", path: "/models/tiers/shared-prototypes/massing/shanghai-dual-classification-bin-massing.glb?v=1cf3d579308c" },
  { id: "irregular-stone-bollard", family: "street-furniture", path: "/models/tiers/shared-prototypes/massing/irregular-stone-bollard-massing.glb?v=510047ea7b67" },
] as const;

const GALLERY_COLUMNS = 4;
const GALLERY_SPACING_X = 4.4;
const GALLERY_SPACING_Z = 4.25;

export type SharedPrototypeQaGroup =
  | "all"
  | "vegetation"
  | "street-furniture";

function galleryPosition(
  index: number,
  group: SharedPrototypeQaGroup,
): [number, number, number] {
  if (group === "vegetation") {
    const column = index % 3;
    const row = Math.floor(index / 3);
    return [(column - 1) * 4.2, 0.09, (row - 0.5) * 4.0];
  }
  if (group === "street-furniture") {
    const column = index % 4;
    const row = Math.floor(index / 4);
    return [(column - 1.5) * 1.75, 0.025, (row - 0.5) * 1.7];
  }
  const column = index % GALLERY_COLUMNS;
  const row = Math.floor(index / GALLERY_COLUMNS);
  return [
    (column - 1.5) * GALLERY_SPACING_X,
    0.09,
    (row - 1) * GALLERY_SPACING_Z,
  ];
}

function SharedPrototypeMassingAsset({
  id,
  family,
  path,
  displayIndex,
  group,
}: (typeof SHARED_PROTOTYPE_MASSING)[number] & {
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
  const position = galleryPosition(displayIndex, group);
  const visible = group === "all" || family === group;

  return (
    <group
      name={`shared-prototype-massing-${id}`}
      position={position}
      visible={visible}
      userData={{
        assetId: id,
        tier: "massing",
        qaOnly: true,
        displayScale: 1,
        family,
        authoredFrontBlender: "-Y",
        exportedFrontThree: "+Z",
      }}
    >
      <mesh position={[0, -0.04, 0]} receiveShadow>
        <cylinderGeometry args={[
          family === "vegetation" ? 1.72 : 0.72,
          family === "vegetation" ? 1.72 : 0.72,
          0.08,
          32,
        ]} />
        <meshToonMaterial
          color={family === "vegetation" ? "#50655b" : "#665c52"}
        />
      </mesh>
      <primitive object={model} />
      {visible ? (
        <Html
          center
          position={[
            0,
            family === "vegetation" ? 0.26 : 0.12,
            family === "vegetation" ? 1.9 : 0.82,
          ]}
          distanceFactor={family === "vegetation" ? 13 : 3.8}
          transform
          sprite
        >
          <span
            style={{
              color: "#f4efe4",
              background: "rgba(23, 30, 30, 0.84)",
              border: "1px solid rgba(255,255,255,0.18)",
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

function QaScaleReference({
  group,
}: {
  group: SharedPrototypeQaGroup;
}) {
  const position: [number, number, number] = group === "vegetation"
    ? [-5.7, 0, 3.2]
    : group === "street-furniture"
      ? [-4.1, 0, 1.5]
      : [-8.0, 0, 0];
  const personHeight = 1.75 / 2.7;
  const oneMeter = 1 / 2.7;
  const headRadius = 0.072;
  const legHeight = 0.25;
  const torsoHeight = personHeight - headRadius * 2 - legHeight;
  return (
    <group
      name="qa-authored-scale-reference"
      position={position}
      userData={{
        authoredMetersPerSceneUnit: 2.7,
        personHeightMeters: 1.75,
        rulerMeters: 1,
      }}
    >
      <mesh position={[0.12, 0.008, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.016, 24]} />
        <meshBasicMaterial color="#6f3e31" />
      </mesh>
      <mesh position={[0, personHeight - headRadius, 0]} castShadow>
        <sphereGeometry args={[headRadius, 12, 8]} />
        <meshToonMaterial color="#d36c54" />
      </mesh>
      <mesh
        position={[0, legHeight + torsoHeight * 0.5, 0]}
        castShadow
      >
        <capsuleGeometry args={[0.085, torsoHeight - 0.17, 4, 8]} />
        <meshToonMaterial color="#d36c54" />
      </mesh>
      {[-0.045, 0.045].map((x) => (
        <mesh key={x} position={[x, legHeight * 0.5, 0]} castShadow>
          <capsuleGeometry args={[0.035, legHeight - 0.07, 4, 8]} />
          <meshToonMaterial color="#d36c54" />
        </mesh>
      ))}
      <mesh position={[0.34, oneMeter * 0.5, 0]}>
        <boxGeometry args={[0.025, oneMeter, 0.025]} />
        <meshBasicMaterial color="#f4d46b" />
      </mesh>
      {[0, oneMeter].map((height) => (
        <mesh key={height} position={[0.34, height, 0]}>
          <boxGeometry args={[0.15, 0.018, 0.025]} />
          <meshBasicMaterial color="#f4d46b" />
        </mesh>
      ))}
      <Html
        center
        position={[0.12, personHeight + 0.12, 0]}
        distanceFactor={group === "street-furniture" ? 4.5 : 13}
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

export function SharedPrototypeMassingQaCamera({
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
      camera.position.set(9.7, 7.5, 11.6);
    } else if (group === "street-furniture") {
      camera.position.set(5.4, 3.8, 6.2);
    } else {
      camera.position.set(13.8, 11.8, 16.2);
    }
    camera.up.set(0, 1, 0);
    camera.lookAt(new Vector3(0, group === "street-furniture" ? 0.35 : 2.05, 0));
    camera.updateProjectionMatrix();
  }, [active, camera, group]);
  return null;
}

export function SharedPrototypeMassingQaScene({
  group,
}: {
  group: SharedPrototypeQaGroup;
}) {
  const groupedAssets = SHARED_PROTOTYPE_MASSING.filter(
    (asset) => group === "all" || asset.family === group,
  );
  const displayIndexById = new Map(
    groupedAssets.map((asset, index) => [asset.id, index]),
  );
  return (
    <group
      name="shared-prototype-massing-qa-gallery"
      userData={{
        tier: "massing",
        qaOnly: true,
        prototypeCount: SHARED_PROTOTYPE_MASSING.length,
        vegetationCount: 5,
        streetFurnitureCount: 7,
        group,
        authoredMetersPerSceneUnit: 2.7,
      }}
    >
      <color attach="background" args={[new Color("#1b2525")]} />
      <hemisphereLight color="#fff6df" groundColor="#38423d" intensity={1.55} />
      <directionalLight
        castShadow
        position={[10, 16, 12]}
        intensity={2.1}
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
          group === "street-furniture" ? 9.4 : 18.8,
          0.12,
          group === "street-furniture" ? 6.2 : 14.2,
        ]} />
        <meshToonMaterial color="#2d3937" />
      </mesh>
      <QaScaleReference group={group} />
      {SHARED_PROTOTYPE_MASSING.map((asset) => (
        <Suspense key={asset.id} fallback={null}>
          <SharedPrototypeMassingAsset
            {...asset}
            group={group}
            displayIndex={displayIndexById.get(asset.id) ?? 0}
          />
        </Suspense>
      ))}
    </group>
  );
}
