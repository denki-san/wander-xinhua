"use client";

import { terrainHeightAt } from "./terrain";
import {
  XINHUA_ROAD_LANDMARKS,
  type LandmarkPlacement,
} from "./xinhua-road-contract";

const IDENTITY_COLORS = [
  "#e8dfcf",
  "#d5c4aa",
  "#c6d0c3",
  "#c8b7a8",
  "#d9c99f",
] as const;

function landmarkHeight(landmark: LandmarkPlacement) {
  if (landmark.id === "shanghai-cinema") return 18;
  if (landmark.id === "film-art-center") return 22;
  if (landmark.id.includes("villas")) return 13;
  if (landmark.id.includes("park")) return 4.8;
  return Math.max(7.2, (landmark.labelHeight ?? 6.2) * 1.72);
}

function colorForLandmark(landmark: LandmarkPlacement) {
  const seed = [...landmark.id].reduce((total, character) => (
    total + character.charCodeAt(0)
  ), 0);
  return IDENTITY_COLORS[seed % IDENTITY_COLORS.length];
}

export function LandmarkProgressiveProxy({
  landmark,
  identity,
}: {
  landmark: LandmarkPlacement;
  identity: boolean;
}) {
  const bounds = landmark.localBounds;
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = -(bounds.minZ + bounds.maxZ) / 2;
  const height = landmarkHeight(landmark);
  const wall = colorForLandmark(landmark);

  return (
    <group
      name={`${landmark.id}-progressive-proxy`}
      position={[centerX, 0, centerZ]}
      userData={{
        building: landmark.id,
        stage: identity ? "identity" : "massing",
        progressive: true,
      }}
    >
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.9, height, depth * 0.86]} />
        <meshToonMaterial color={identity ? wall : "#c9c3b5"} />
      </mesh>
      {identity && (
        <>
          <mesh position={[0, height + 0.28, 0]} castShadow>
            <boxGeometry args={[width * 0.94, 0.56, depth * 0.9]} />
            <meshToonMaterial color="#826f5e" />
          </mesh>
          <mesh position={[0, height * 0.46, depth * 0.435]}>
            <boxGeometry args={[width * 0.72, height * 0.42, 0.12]} />
            <meshToonMaterial color="#789494" />
          </mesh>
          {[-0.3, 0, 0.3].map((ratio) => (
            <mesh
              key={ratio}
              position={[width * ratio, height * 0.46, depth * 0.51]}
            >
              <boxGeometry args={[0.12, height * 0.44, 0.13]} />
              <meshBasicMaterial color="#e8dfcc" />
            </mesh>
          ))}
          <mesh position={[0, Math.min(2.4, height * 0.2), depth * 0.54]}>
            <boxGeometry args={[Math.min(width * 0.44, 8), 0.66, 0.18]} />
            <meshToonMaterial color="#a95e4c" />
          </mesh>
        </>
      )}
    </group>
  );
}

export function XinhuaRoadMassing({
  identity,
  hiddenLandmarkIds,
}: {
  identity: boolean;
  hiddenLandmarkIds?: ReadonlySet<string>;
}) {
  return (
    <group
      name="xinhua-road-progressive-massing"
      userData={{
        stage: identity ? "identity" : "massing",
        buildings: XINHUA_ROAD_LANDMARKS.length,
      }}
    >
      {XINHUA_ROAD_LANDMARKS.map((landmark) => {
        if (hiddenLandmarkIds?.has(landmark.id)) return null;
        const [x, z] = landmark.position;
        return (
          <group
            key={landmark.id}
            position={[x, terrainHeightAt(x, z) + 0.1, z]}
            rotation-y={landmark.yaw}
            scale={landmark.scale}
          >
            <LandmarkProgressiveProxy landmark={landmark} identity={identity} />
          </group>
        );
      })}
    </group>
  );
}
