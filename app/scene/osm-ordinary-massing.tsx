"use client";

import { useGLTF } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import { Mesh } from "three";

const OSM_ORDINARY_MASSING_CHUNKS = [
  { id: "r0c1", origin: [-90, -270] as const, buildings: 19, path: "/models/tiers/osm-ordinary/massing/osm-ordinary-r0c1-massing.glb?v=b07e6da941f2" },
  { id: "r0c2", origin: [90, -270] as const, buildings: 41, path: "/models/tiers/osm-ordinary/massing/osm-ordinary-r0c2-massing.glb?v=a5f305b397ff" },
  { id: "r0c3", origin: [270, -270] as const, buildings: 20, path: "/models/tiers/osm-ordinary/massing/osm-ordinary-r0c3-massing.glb?v=ff1d3c97aafa" },
  { id: "r1c0", origin: [-270, -90] as const, buildings: 79, path: "/models/tiers/osm-ordinary/massing/osm-ordinary-r1c0-massing.glb?v=0f9694564af1" },
  { id: "r1c1", origin: [-90, -90] as const, buildings: 89, path: "/models/tiers/osm-ordinary/massing/osm-ordinary-r1c1-massing.glb?v=c0ee47aba967" },
  { id: "r1c2", origin: [90, -90] as const, buildings: 81, path: "/models/tiers/osm-ordinary/massing/osm-ordinary-r1c2-massing.glb?v=923ef7b38e0d" },
  { id: "r1c3", origin: [270, -90] as const, buildings: 82, path: "/models/tiers/osm-ordinary/massing/osm-ordinary-r1c3-massing.glb?v=b15e8bd51205" },
  { id: "r2c0", origin: [-270, 90] as const, buildings: 69, path: "/models/tiers/osm-ordinary/massing/osm-ordinary-r2c0-massing.glb?v=a27dd1e35228" },
  { id: "r2c1", origin: [-90, 90] as const, buildings: 184, path: "/models/tiers/osm-ordinary/massing/osm-ordinary-r2c1-massing.glb?v=d7cec34250ec" },
  { id: "r2c2", origin: [90, 90] as const, buildings: 123, path: "/models/tiers/osm-ordinary/massing/osm-ordinary-r2c2-massing.glb?v=ba8088b9c469" },
  { id: "r2c3", origin: [270, 90] as const, buildings: 35, path: "/models/tiers/osm-ordinary/massing/osm-ordinary-r2c3-massing.glb?v=15396b40bcfd" },
  { id: "r3c0", origin: [-270, 270] as const, buildings: 10, path: "/models/tiers/osm-ordinary/massing/osm-ordinary-r3c0-massing.glb?v=8b564ef73194" },
  { id: "r3c1", origin: [-90, 270] as const, buildings: 25, path: "/models/tiers/osm-ordinary/massing/osm-ordinary-r3c1-massing.glb?v=dd3b5c1fd264" },
  { id: "r3c2", origin: [90, 270] as const, buildings: 7, path: "/models/tiers/osm-ordinary/massing/osm-ordinary-r3c2-massing.glb?v=58e3bd27bd28" },
] as const;

function OsmOrdinaryMassingChunk({
  id,
  origin,
  buildings,
  path,
}: (typeof OSM_ORDINARY_MASSING_CHUNKS)[number]) {
  const { scene } = useGLTF(path);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = false;
      child.receiveShadow = true;
    });
    return clone;
  }, [scene]);

  return (
    <group
      name={`osm-ordinary-massing-${id}`}
      position={[origin[0], 0.1, origin[1]]}
      userData={{
        chunkId: id,
        buildings,
        modelTier: "massing",
        qaOnly: true,
      }}
    >
      <primitive object={model} scale={[1, 1, -1]} />
    </group>
  );
}

export function OsmOrdinaryMassingQaLayer() {
  return (
    <group
      name="osm-ordinary-massing-qa-layer"
      userData={{
        modelTier: "massing",
        qaOnly: true,
        chunks: OSM_ORDINARY_MASSING_CHUNKS.length,
        buildings: OSM_ORDINARY_MASSING_CHUNKS.reduce(
          (total, chunk) => total + chunk.buildings,
          0,
        ),
      }}
    >
      {OSM_ORDINARY_MASSING_CHUNKS.map((chunk) => (
        <Suspense key={chunk.id} fallback={null}>
          <OsmOrdinaryMassingChunk {...chunk} />
        </Suspense>
      ))}
    </group>
  );
}
