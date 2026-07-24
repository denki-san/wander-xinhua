"use client";

import { useEffect, useMemo } from "react";
import { BoxGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { terrainHeightAt } from "./terrain";
import {
  XINHUA_ROAD_LANDMARKS,
  type LandmarkPlacement,
} from "./xinhua-road-contract";
import { xinhuaRoadIdentityKind } from "./xinhua-road-identity-contract";
import { ShanghaiCinemaHybridIdentity } from "./shanghai-cinema-hybrid-identity";

const IDENTITY_COLORS = [
  "#e8dfcf",
  "#d5c4aa",
  "#c6d0c3",
  "#c8b7a8",
  "#d9c99f",
] as const;

const IDENTITY_VISUAL_SCALE = [0.68, 0.78, 0.68] as const;

function landmarkHeight(landmark: LandmarkPlacement) {
  if (landmark.id === "shanghai-cinema") return 18;
  // 电影艺术中心当前 Full 模型的可见高度约 14.4，Identity 不应比详情模型更高。
  if (landmark.id === "film-art-center") return 14.4;
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

type MiniatureBlockProps = {
  position?: [number, number, number];
  rotationY?: number;
  size: [number, number, number];
  color: string;
};

function MiniatureBlock({
  position = [0, 0, 0],
  rotationY = 0,
  size,
  color,
}: MiniatureBlockProps) {
  return (
    <mesh
      position={[position[0], position[1] + size[1] / 2, position[2]]}
      rotation-y={rotationY}
      castShadow
      receiveShadow
    >
      <boxGeometry args={size} />
      <meshToonMaterial color={color} />
    </mesh>
  );
}

function MiniatureFacadeBand({
  position,
  size,
  color = "#789494",
  rotationY = 0,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
  rotationY?: number;
}) {
  return (
    <mesh position={position} rotation-y={rotationY}>
      <boxGeometry args={size} />
      <meshToonMaterial color={color} />
    </mesh>
  );
}

/**
 * Identity 会在 Full 下载期间进入街道近景，因此四个方向都必须保持建筑读感。
 * 这里使用中性的玻璃/阴影带，不把未知侧立面冒充成照片可证实的细节。
 */
function MiniatureFacadeWrap({
  width,
  depth,
  height,
  glass = "#789494",
}: {
  width: number;
  depth: number;
  height: number;
  glass?: string;
}) {
  const geometry = useMemo(() => {
    const bandHeight = Math.max(0.52, height * 0.16);
    const levels = height > 8 ? [0.3, 0.62] : [0.46];
    const pieces: BoxGeometry[] = [];
    for (const side of [-1, 1]) {
      for (const ratio of levels) {
        const longBand = new BoxGeometry(width * 0.66, bandHeight, 0.14);
        longBand.translate(0, height * ratio, side * depth * 0.505);
        pieces.push(longBand);

        const shortBand = new BoxGeometry(depth * 0.54, bandHeight * 0.82, 0.14);
        shortBand.rotateY(Math.PI / 2);
        shortBand.translate(side * width * 0.505, height * ratio, 0);
        pieces.push(shortBand);
      }
    }
    const merged = mergeGeometries(pieces, false);
    pieces.forEach((piece) => piece.dispose());
    return merged;
  }, [depth, height, width]);
  useEffect(() => () => geometry?.dispose(), [geometry]);

  return (
    <group
      name="identity-four-sided-facade"
      userData={{
        visibleDirections: 4,
        evidence: "neutral-inferred-articulation",
        mergedFacadeDrawCalls: 1,
      }}
    >
      {geometry && (
        <mesh geometry={geometry}>
          <meshToonMaterial color={glass} />
        </mesh>
      )}
      <MiniatureBlock
        position={[0, height - 0.18, 0]}
        size={[width * 1.04, 0.3, depth * 1.04]}
        color="#8a6e58"
      />
    </group>
  );
}

function MiniatureGabledBuilding({
  position = [0, 0, 0],
  width,
  depth,
  height,
  wall,
  roof = "#8a6e58",
  glass = "#789494",
}: {
  position?: [number, number, number];
  width: number;
  depth: number;
  height: number;
  wall: string;
  roof?: string;
  glass?: string;
}) {
  const roofHeight = Math.max(0.7, Math.min(height * 0.28, width * 0.24));
  const roofSlope = Math.atan2(roofHeight, width / 2);
  const roofSlabLength = Math.hypot(width / 2, roofHeight) * 1.06;
  return (
    <group position={position}>
      <MiniatureBlock size={[width, height, depth]} color={wall} />
      <MiniatureFacadeWrap
        width={width}
        depth={depth}
        height={height}
        glass={glass}
      />
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[
            side * width * 0.25,
            height + roofHeight * 0.5,
            0,
          ]}
          rotation-z={-side * roofSlope}
          castShadow
        >
          <boxGeometry args={[roofSlabLength, 0.18, depth * 1.06]} />
          <meshToonMaterial color={roof} />
        </mesh>
      ))}
    </group>
  );
}

function MiniatureTree({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.65, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.16, 1.3, 7]} />
        <meshToonMaterial color="#725841" />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <icosahedronGeometry args={[0.78, 1]} />
        <meshToonMaterial color="#4f8465" />
      </mesh>
    </group>
  );
}

function LandmarkIdentityMiniature({
  landmark,
  width,
  depth,
  height,
  wall,
}: {
  landmark: LandmarkPlacement;
  width: number;
  depth: number;
  height: number;
  wall: string;
}) {
  const kind = xinhuaRoadIdentityKind(landmark.id);
  const roof = "#8a6e58";
  const brick = "#a66d54";
  const cream = "#eee4d2";
  const glass = "#789494";
  const darkGlass = "#547578";
  const accent = "#c45d4c";
  const visualWidth = Math.max(width * 0.88, 5.6);
  const visualDepth = Math.max(depth * 0.82, 4.6);

  if (kind === "cinema") {
    const podiumWidth = visualWidth * 0.88;
    const podiumDepth = visualDepth * 0.76;
    const podiumHeight = height * 0.5;
    return (
      <>
        <MiniatureBlock
          position={[0, 0, -visualDepth * 0.04]}
          size={[podiumWidth, podiumHeight, podiumDepth]}
          color={cream}
        />
        <group position={[0, 0, -visualDepth * 0.04]}>
          <MiniatureFacadeWrap
            width={podiumWidth}
            depth={podiumDepth}
            height={podiumHeight}
            glass={darkGlass}
          />
        </group>
        {[-1, 1].map((side) => (
          <group
            key={side}
            position={[side * visualWidth * 0.36, 0, visualDepth * 0.04]}
          >
            <MiniatureBlock
              size={[visualWidth * 0.24, height * 0.42, visualDepth * 0.72]}
              color={wall}
            />
            <MiniatureFacadeWrap
              width={visualWidth * 0.24}
              depth={visualDepth * 0.72}
              height={height * 0.42}
              glass={glass}
            />
          </group>
        ))}
        <group position={[0, 0, visualDepth * 0.05]}>
          <MiniatureBlock
            size={[visualWidth * 0.32, height * 0.92, visualDepth * 0.72]}
            color="#d8d4c9"
          />
          <MiniatureFacadeWrap
            width={visualWidth * 0.32}
            depth={visualDepth * 0.72}
            height={height * 0.92}
            glass={darkGlass}
          />
        </group>
        <MiniatureFacadeBand
          position={[0, height * 0.49, -visualDepth * 0.42]}
          size={[visualWidth * 0.25, height * 0.62, 0.18]}
          color={darkGlass}
        />
        <MiniatureFacadeBand
          position={[0, height * 0.21, -visualDepth * 0.54]}
          size={[visualWidth * 0.52, 0.72, 0.32]}
          color={accent}
        />
        <mesh
          position={[0, height * 0.55, -visualDepth * 0.57]}
          scale={[1.65, 0.8, 1]}
          rotation-z={-0.18}
          castShadow
        >
          <torusGeometry args={[visualWidth * 0.12, 0.24, 6, 20, Math.PI * 1.82]} />
          <meshToonMaterial color="#d7ded8" />
        </mesh>
        {[-0.34, -0.17, 0, 0.17, 0.34].map((ratio) => (
          <MiniatureFacadeBand
            key={ratio}
            position={[visualWidth * ratio, height * 0.43, -visualDepth * 0.565]}
            size={[0.16, height * 0.54, 0.15]}
            color="#d7ded8"
          />
        ))}
      </>
    );
  }

  if (kind === "arts-cluster" || kind === "orchestra-hall") {
    const hallWall = kind === "orchestra-hall" ? "#ece9df" : wall;
    return (
      <>
        {[-0.31, 0, 0.31].map((ratio, index) => (
          <MiniatureGabledBuilding
            key={ratio}
            position={[
              visualWidth * ratio,
              0,
              (index % 2 ? -0.08 : 0.08) * visualDepth,
            ]}
            width={visualWidth * 0.3}
            depth={visualDepth * (index === 1 ? 0.82 : 0.68)}
            height={height * [0.58, 0.78, 0.64][index]}
            wall={hallWall}
            roof={kind === "orchestra-hall" ? "#87918c" : roof}
            glass={glass}
          />
        ))}
        <MiniatureFacadeBand
          position={[0, height * 0.19, visualDepth * 0.46]}
          size={[visualWidth * 0.72, height * 0.16, 0.16]}
          color={darkGlass}
        />
      </>
    );
  }

  if (kind === "villa-row") {
    return (
      <>
        {[-0.34, -0.11, 0.12, 0.35].map((ratio, index) => (
          <MiniatureGabledBuilding
            key={ratio}
            position={[
              visualWidth * ratio,
              0,
              (index % 2 ? 0.08 : -0.08) * visualDepth,
            ]}
            width={visualWidth * 0.2}
            depth={visualDepth * 0.58}
            height={height * (0.46 + index % 3 * 0.08)}
            wall={index % 2 ? cream : wall}
            roof={index % 2 ? "#9a654d" : roof}
          />
        ))}
      </>
    );
  }

  if (kind === "garden-house") {
    return (
      <>
        <MiniatureGabledBuilding
          position={[-visualWidth * 0.18, 0, -visualDepth * 0.06]}
          width={visualWidth * 0.5}
          depth={visualDepth * 0.64}
          height={height * 0.62}
          wall={cream}
          roof="#9b674c"
        />
        <MiniatureBlock
          position={[visualWidth * 0.24, 0, visualDepth * 0.04]}
          size={[visualWidth * 0.28, height * 0.34, visualDepth * 0.46]}
          color="#a8beb5"
        />
        <MiniatureFacadeBand
          position={[visualWidth * 0.24, height * 0.19, visualDepth * 0.275]}
          size={[visualWidth * 0.22, height * 0.2, 0.1]}
          color={darkGlass}
        />
        <MiniatureTree position={[visualWidth * 0.42, 0, -visualDepth * 0.23]} />
        <MiniatureTree
          position={[visualWidth * 0.12, 0, -visualDepth * 0.3]}
          scale={0.8}
        />
      </>
    );
  }

  if (kind === "modern-villa") {
    return (
      <>
        <group position={[-visualWidth * 0.13, 0, 0]}>
          <MiniatureBlock
            size={[visualWidth * 0.62, height * 0.46, visualDepth * 0.74]}
            color={cream}
          />
          <MiniatureFacadeWrap
            width={visualWidth * 0.62}
            depth={visualDepth * 0.74}
            height={height * 0.46}
            glass={darkGlass}
          />
        </group>
        <group position={[visualWidth * 0.13, height * 0.42, -visualDepth * 0.05]}>
          <MiniatureBlock
            size={[visualWidth * 0.58, height * 0.42, visualDepth * 0.62]}
            color="#d9ddd6"
          />
          <MiniatureFacadeWrap
            width={visualWidth * 0.58}
            depth={visualDepth * 0.62}
            height={height * 0.42}
            glass={glass}
          />
        </group>
        <MiniatureFacadeBand
          position={[-visualWidth * 0.08, height * 0.27, -visualDepth * 0.39]}
          size={[visualWidth * 0.42, height * 0.28, 0.14]}
          color={darkGlass}
        />
        <MiniatureBlock
          position={[-visualWidth * 0.42, 0, visualDepth * 0.18]}
          size={[visualWidth * 0.12, height * 0.32, visualDepth * 0.38]}
          color={brick}
        />
      </>
    );
  }

  if (kind === "memorial-villa" || kind === "townhouse") {
    return (
      <>
        <MiniatureGabledBuilding
          position={[-visualWidth * 0.1, 0, 0]}
          width={visualWidth * 0.62}
          depth={visualDepth * 0.76}
          height={height * 0.64}
          wall={cream}
          roof={roof}
        />
        <MiniatureGabledBuilding
          position={[visualWidth * 0.31, 0, -visualDepth * 0.08]}
          width={visualWidth * 0.24}
          depth={visualDepth * 0.5}
          height={height * 0.82}
          wall={wall}
          roof="#8f5f4c"
        />
        <MiniatureBlock
          position={[-visualWidth * 0.38, 0, visualDepth * 0.22]}
          size={[visualWidth * 0.18, height * 0.23, visualDepth * 0.25]}
          color={kind === "memorial-villa" ? brick : accent}
        />
      </>
    );
  }

  if (kind === "pocket-park") {
    return (
      <>
        <MiniatureBlock
          position={[0, 0, -visualDepth * 0.22]}
          size={[visualWidth * 0.82, 0.22, visualDepth * 0.34]}
          color="#d6c6a7"
        />
        {[-0.32, 0, 0.32].map((ratio) => (
          <MiniatureTree
            key={ratio}
            position={[visualWidth * ratio, 0, -visualDepth * 0.12]}
            scale={0.82 + Math.abs(ratio)}
          />
        ))}
        {[-0.34, 0.34].map((ratio) => (
          <MiniatureBlock
            key={ratio}
            position={[visualWidth * ratio, 0, visualDepth * 0.22]}
            size={[0.24, height * 0.6, 0.24]}
            color={brick}
          />
        ))}
        <MiniatureBlock
          position={[0, height * 0.52, visualDepth * 0.22]}
          size={[visualWidth * 0.82, 0.22, visualDepth * 0.22]}
          color="#806851"
        />
      </>
    );
  }

  if (kind === "heritage-gate") {
    return (
      <>
        <group>
          <MiniatureBlock
            size={[visualWidth * 0.92, height * 0.38, visualDepth * 0.42]}
            color={cream}
          />
          <MiniatureFacadeWrap
            width={visualWidth * 0.92}
            depth={visualDepth * 0.42}
            height={height * 0.38}
            glass="#667a72"
          />
        </group>
        <group position={[0, 0, visualDepth * 0.08]}>
          <MiniatureBlock
            size={[visualWidth * 0.24, height * 0.82, visualDepth * 0.5]}
            color={brick}
          />
          <MiniatureFacadeWrap
            width={visualWidth * 0.24}
            depth={visualDepth * 0.5}
            height={height * 0.82}
            glass="#3f4e4a"
          />
        </group>
        <mesh position={[0, height * 0.88, visualDepth * 0.08]} castShadow>
          <coneGeometry args={[visualWidth * 0.22, height * 0.24, 4]} />
          <meshToonMaterial color={roof} />
        </mesh>
        <MiniatureFacadeBand
          position={[0, height * 0.28, visualDepth * 0.34]}
          size={[visualWidth * 0.12, height * 0.32, 0.12]}
          color="#3f4e4a"
        />
      </>
    );
  }

  if (
    kind === "industrial-campus"
    || kind === "creative-campus"
    || kind === "community-center"
  ) {
    const campusWall = kind === "community-center" ? cream : brick;
    return (
      <>
        <MiniatureGabledBuilding
          position={[-visualWidth * 0.24, 0, -visualDepth * 0.05]}
          width={visualWidth * 0.44}
          depth={visualDepth * 0.72}
          height={height * 0.54}
          wall={campusWall}
          roof={roof}
        />
        <group position={[visualWidth * 0.25, 0, visualDepth * 0.09]}>
          <MiniatureBlock
            size={[visualWidth * 0.38, height * 0.68, visualDepth * 0.56]}
            color={kind === "creative-campus" ? "#b67a58" : wall}
          />
          <MiniatureFacadeWrap
            width={visualWidth * 0.38}
            depth={visualDepth * 0.56}
            height={height * 0.68}
            glass={darkGlass}
          />
        </group>
        <group position={[visualWidth * 0.39, 0, -visualDepth * 0.27]}>
          <MiniatureBlock
            size={[visualWidth * 0.16, height * 0.84, visualDepth * 0.2]}
            color={kind === "community-center" ? accent : "#8c5b45"}
          />
          <MiniatureFacadeWrap
            width={visualWidth * 0.16}
            depth={visualDepth * 0.2}
            height={height * 0.84}
            glass={glass}
          />
        </group>
        <MiniatureFacadeBand
          position={[visualWidth * 0.25, height * 0.4, visualDepth * 0.375]}
          size={[visualWidth * 0.25, height * 0.25, 0.13]}
          color={darkGlass}
        />
      </>
    );
  }

  return (
    <MiniatureGabledBuilding
      width={visualWidth * 0.72}
      depth={visualDepth * 0.72}
      height={height * 0.66}
      wall={wall}
      roof={roof}
    />
  );
}

export function LandmarkProgressiveProxy({
  landmark,
  identity,
}: {
  landmark: LandmarkPlacement;
  identity: boolean;
}) {
  if (identity && landmark.id === "shanghai-cinema") {
    return (
      <group
        name="shanghai-cinema-progressive-proxy"
        userData={{
          building: landmark.id,
          stage: "identity",
          overviewRepresentation: "custom-landmark-hybrid",
          progressive: true,
          fullScaleIdentity: true,
        }}
      >
        <ShanghaiCinemaHybridIdentity />
      </group>
    );
  }

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
        overviewRepresentation: identity ? "architectural-miniature" : "massing",
        progressive: true,
      }}
    >
      {identity ? (
        <group
          scale={IDENTITY_VISUAL_SCALE}
          userData={{ presentation: "compact-architectural-identity" }}
        >
          <LandmarkIdentityMiniature
            landmark={landmark}
            width={width}
            depth={depth}
            height={height}
            wall={wall}
          />
        </group>
      ) : (
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.9, height, depth * 0.86]} />
          <meshToonMaterial color="#c9c3b5" />
        </mesh>
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
        overviewRepresentation: identity ? "architectural-miniatures" : "massing",
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
