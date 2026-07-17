"use client";

import { Html, useGLTF } from "@react-three/drei";
import { InstancedMesh, Matrix4, Mesh, Quaternion, Vector3, type Object3D } from "three";
import { useLayoutEffect, useMemo, useRef } from "react";
import { terrainHeightAt } from "./terrain";
import type { MapObstacle, MapPolygonPoint } from "./world-math";
import {
  buildPlaneTreePlacements,
  XINHUA_ROAD_TRANSPARENT_CAMERA_OBSTACLES,
} from "./xinhua-road-placement.mjs";
import landmarkData from "./xinhua-road-landmarks-data.json" with { type: "json" };

type LandmarkPlacement = {
  id: string;
  query: string;
  aliases?: string[];
  name: string;
  address: string;
  model: string;
  cacheVersion?: string;
  position: MapPolygonPoint;
  yaw: number;
  scale: number;
  localBounds: MapObstacle;
  localObstacles?: MapObstacle[];
  start: MapPolygonPoint;
  forward: MapPolygonPoint;
  poi?: boolean;
  labelHeight?: number;
  labelOffset?: MapPolygonPoint;
  positioning?: string;
};

// 160 号使用 OSM way 292250766 的建筑轮廓中心；其余位置由新华路中心线、
// 345 弄入口和门牌递增方向校准。奇数门牌位于北侧，偶数门牌位于南侧。
export const XINHUA_ROAD_LANDMARKS = landmarkData.landmarks as unknown as readonly LandmarkPlacement[];

function transformedFootprint(
  { position, yaw, scale }: LandmarkPlacement,
  localBounds: MapObstacle,
): MapObstacle {
  const [positionX, positionZ] = position;
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  const worldX: number[] = [];
  const worldZ: number[] = [];

  for (const localX of [localBounds.minX, localBounds.maxX]) {
    for (const sourceZ of [localBounds.minZ, localBounds.maxZ]) {
      // GlbModel 会把 Blender 导出的 Z 轴翻转到场景坐标，这里使用完全相同的变换。
      const localZ = -sourceZ;
      worldX.push(positionX + scale * (cosine * localX + sine * localZ));
      worldZ.push(positionZ + scale * (-sine * localX + cosine * localZ));
    }
  }

  const margin = landmarkData.collisionMargin;
  return {
    minX: Math.min(...worldX) - margin,
    maxX: Math.max(...worldX) + margin,
    minZ: Math.min(...worldZ) - margin,
    maxZ: Math.max(...worldZ) + margin,
  };
}

// 所有地标均按真实建筑、墙体、水池或纪念展板拆分碰撞；
// 广场、车道、草坪、庭院铺装和口袋公园路径保持可步行。
export const XINHUA_ROAD_OBSTACLES: MapObstacle[] = XINHUA_ROAD_LANDMARKS.flatMap(
  (landmark) => (landmark.localObstacles ?? [landmark.localBounds]).map(
    (localObstacle) => transformedFootprint(landmark, localObstacle),
  ),
);
const XINHUA_ROAD_MODEL_FOOTPRINTS: MapObstacle[] = XINHUA_ROAD_LANDMARKS.map(
  (landmark) => transformedFootprint(landmark, landmark.localBounds),
);
// 人物仍被建筑阻挡，但第三人称摄像机把街景地标视为透明层。
// 这样人物贴近门面转动视角时，镜头可以短暂穿过建筑，而不会被锁在门前。
export const XINHUA_ROAD_CAMERA_OBSTACLES = XINHUA_ROAD_TRANSPARENT_CAMERA_OBSTACLES as MapObstacle[];
export const XINHUA_ROAD_START_PRESETS = Object.fromEntries(
  XINHUA_ROAD_LANDMARKS.flatMap(({ query, aliases = [], start, forward }) => (
    [query, ...aliases].map((preset) => [preset, { position: start, forward }])
  )),
) as Record<string, { position: MapPolygonPoint; forward: MapPolygonPoint }>;

type TreePlacement = {
  id: string;
  variant: 0 | 1 | 2;
  position: MapPolygonPoint;
  yaw: number;
  scale: number;
};

export const XINHUA_PLANE_TREE_PLACEMENTS = buildPlaneTreePlacements(
  XINHUA_ROAD_LANDMARKS,
  XINHUA_ROAD_MODEL_FOOTPRINTS,
) as unknown as TreePlacement[];

function configureModel(model: Object3D) {
  model.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return model;
}

function GlbModel({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  const model = useMemo(() => configureModel(scene.clone(true)), [scene]);
  return <primitive object={model} scale={[1, 1, -1]} />;
}

const TREE_MODELS = [
  "/models/xinhua-road/plane-tree-a.glb",
  "/models/xinhua-road/plane-tree-b.glb",
  "/models/xinhua-road/plane-tree-c.glb",
] as const;

function InstancedPlaneTreePart({
  sourceMesh,
  placements,
  variant,
  part,
}: {
  sourceMesh: Mesh;
  placements: TreePlacement[];
  variant: 0 | 1 | 2;
  part: number;
}) {
  const instanceRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const instances = instanceRef.current;
    if (!instances) return;
    const placementMatrix = new Matrix4();
    const instanceMatrix = new Matrix4();
    const quaternion = new Quaternion();
    const position = new Vector3();
    const scale = new Vector3();
    const up = new Vector3(0, 1, 0);
    placements.forEach((placement, index) => {
      const [x, z] = placement.position;
      // InstancedMesh 不支持单实例负缩放；把统一的 Z 翻转放到父组，
      // 实例矩阵使用等价的镜像位置与反向旋转，保持每个矩阵行列式为正。
      position.set(x, terrainHeightAt(x, z) + 0.08, -z);
      quaternion.setFromAxisAngle(up, -placement.yaw);
      scale.setScalar(placement.scale);
      placementMatrix.compose(position, quaternion, scale);
      instanceMatrix.multiplyMatrices(placementMatrix, sourceMesh.matrixWorld);
      instances.setMatrixAt(index, instanceMatrix);
    });
    instances.instanceMatrix.needsUpdate = true;
    instances.computeBoundingSphere();
  }, [placements, sourceMesh]);

  return (
    <instancedMesh
      ref={instanceRef}
      args={[sourceMesh.geometry, sourceMesh.material, placements.length]}
      castShadow
      receiveShadow
      userData={{ vegetation: "xinhua-plane-tree", variant, part }}
    />
  );
}

function InstancedPlaneTreeVariant({ variant }: { variant: 0 | 1 | 2 }) {
  const { scene } = useGLTF(TREE_MODELS[variant]);
  const sourceMeshes = useMemo(() => {
    const result: Mesh[] = [];
    scene.updateMatrixWorld(true);
    scene.traverse((child) => {
      if (child instanceof Mesh) result.push(child);
    });
    if (result.length === 0) throw new Error(`梧桐树模型缺少网格：${TREE_MODELS[variant]}`);
    return result;
  }, [scene, variant]);
  const placements = useMemo(
    () => XINHUA_PLANE_TREE_PLACEMENTS.filter((placement) => placement.variant === variant),
    [variant],
  );

  return (
    <group scale={[1, 1, -1]}>
      {sourceMeshes.map((sourceMesh, part) => (
        <InstancedPlaneTreePart
          key={sourceMesh.uuid}
          sourceMesh={sourceMesh}
          placements={placements}
          variant={variant}
          part={part}
        />
      ))}
    </group>
  );
}

export function XinhuaRoadPlaneTrees() {
  return (
    <group name="xinhua-road-plane-trees" userData={{ variants: 3, arrangement: "A-B-C-B" }}>
      <InstancedPlaneTreeVariant variant={0} />
      <InstancedPlaneTreeVariant variant={1} />
      <InstancedPlaneTreeVariant variant={2} />
    </group>
  );
}

export function XinhuaRoadLandmarks({ showLabels = true }: { showLabels?: boolean }) {
  return (
    <group name="xinhua-road-photo-reference-landmarks">
      {XINHUA_ROAD_LANDMARKS.map((landmark) => {
        const [x, z] = landmark.position;
        const [labelOffsetX, labelOffsetZ] = landmark.labelOffset ?? [0, 0];
        const y = terrainHeightAt(x, z) + 0.1;
        return (
          <group
            key={landmark.id}
            name={landmark.id}
            userData={{
              landmark: landmark.id,
              address: landmark.address,
              positioning: landmark.positioning,
              modeling: "photo-reference-blender-glb",
            }}
          >
            <group position={[x, y, z]} rotation-y={landmark.yaw} scale={landmark.scale}>
              <GlbModel
                path={landmark.cacheVersion
                  ? `${landmark.model}?v=${landmark.cacheVersion}`
                  : landmark.model}
              />
            </group>
            {showLabels && landmark.poi && (
              <Html
                center
                position={[
                  x + labelOffsetX,
                  y + (landmark.labelHeight ?? 8),
                  z + labelOffsetZ,
                ]}
                style={{ pointerEvents: "none" }}
              >
                <span
                  className="map-road-label map-landmark-label"
                  data-poi={landmark.id}
                  data-poi-address={landmark.address}
                >
                  {landmark.name}
                </span>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
