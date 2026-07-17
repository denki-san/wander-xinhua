"use client";

import { useGLTF } from "@react-three/drei";
import { InstancedMesh, Matrix4, Mesh, Quaternion, Vector3, type Object3D } from "three";
import { useLayoutEffect, useMemo, useRef } from "react";
import { terrainHeightAt } from "./terrain";
import type { MapObstacle, MapPolygonPoint } from "./world-math";
import landmarkData from "./xinhua-road-landmarks-data.json" with { type: "json" };

type LandmarkPlacement = {
  id: string;
  query: string;
  name: string;
  address: string;
  model: string;
  position: MapPolygonPoint;
  yaw: number;
  scale: number;
  localBounds: MapObstacle;
  start: MapPolygonPoint;
  forward: MapPolygonPoint;
};

// 160 号使用 OSM way 292250766 的建筑轮廓中心；其余位置由新华路中心线、
// 345 弄入口和门牌递增方向校准。奇数门牌位于北侧，偶数门牌位于南侧。
export const XINHUA_ROAD_LANDMARKS = landmarkData.landmarks as unknown as readonly LandmarkPlacement[];

function transformedFootprint({ position, yaw, scale, localBounds }: LandmarkPlacement): MapObstacle {
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

// 这些地标是完整的街景样板，院落尚未设计成可进入区域，因此碰撞覆盖全部可见资产，
// 避免角色穿过围墙、长椅或建筑附属构件。
export const XINHUA_ROAD_OBSTACLES: MapObstacle[] = XINHUA_ROAD_LANDMARKS.map(transformedFootprint);
export const XINHUA_ROAD_CAMERA_OBSTACLES: MapObstacle[] = [...XINHUA_ROAD_OBSTACLES];
export const XINHUA_ROAD_START_PRESETS = Object.fromEntries(
  XINHUA_ROAD_LANDMARKS.map(({ query, start, forward }) => [query, { position: start, forward }]),
) as Record<string, { position: MapPolygonPoint; forward: MapPolygonPoint }>;

const XINHUA_ROAD_AXIS: readonly MapPolygonPoint[] = [
  [-144.9257, 22.4335],
  [-88.5458, 44.2631],
  [55.7046, 102.2229],
  [171.4336, 151.3149],
];

const TREE_CLEARANCES: readonly MapPolygonPoint[] = XINHUA_ROAD_LANDMARKS.map(({ start }) => start);

type TreePlacement = {
  id: string;
  variant: 0 | 1 | 2;
  position: MapPolygonPoint;
  yaw: number;
  scale: number;
};

function polylineLength(points: readonly MapPolygonPoint[]) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]);
  }
  return length;
}

function samplePolyline(points: readonly MapPolygonPoint[], distance: number) {
  let remaining = distance;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const length = Math.hypot(dx, dz);
    if (remaining <= length) {
      const ratio = remaining / length;
      return {
        point: [start[0] + dx * ratio, start[1] + dz * ratio] as MapPolygonPoint,
        tangent: [dx / length, dz / length] as MapPolygonPoint,
      };
    }
    remaining -= length;
  }
  const last = points.at(-1) ?? [0, 0];
  return { point: [...last] as MapPolygonPoint, tangent: [1, 0] as MapPolygonPoint };
}

function buildPlaneTreePlacements(): TreePlacement[] {
  const placements: TreePlacement[] = [];
  const spacing = 14.5;
  const total = polylineLength(XINHUA_ROAD_AXIS);
  const cycle: readonly (0 | 1 | 2)[] = [0, 1, 2, 1];
  for (let side = 0; side < 2; side += 1) {
    for (let distance = 7 + side * spacing * 0.5, index = 0; distance < total - 6; distance += spacing, index += 1) {
      const { point, tangent } = samplePolyline(XINHUA_ROAD_AXIS, distance);
      const sideSign = side === 0 ? 1 : -1;
      const offset = 6.6 + ((index * 17 + side * 11) % 5) * 0.12;
      const position: MapPolygonPoint = [
        point[0] - tangent[1] * offset * sideSign,
        point[1] + tangent[0] * offset * sideSign,
      ];
      // 入口不仅给角色留空，也给第三人称相机留出后退距离，避免树干遮住首屏。
      const tooCloseToEntrance = TREE_CLEARANCES.some(([x, z]) => Math.hypot(position[0] - x, position[1] - z) < 9.2);
      if (tooCloseToEntrance) continue;
      placements.push({
        id: `plane-tree-${side}-${index}`,
        variant: cycle[(index + side * 2) % cycle.length],
        position,
        yaw: (index * 1.618 + side * 0.47) % (Math.PI * 2),
        scale: 0.88 + ((index * 7 + side * 3) % 6) * 0.038,
      });
    }
  }
  return placements;
}

export const XINHUA_PLANE_TREE_PLACEMENTS = buildPlaneTreePlacements();

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

function InstancedPlaneTreeVariant({ variant }: { variant: 0 | 1 | 2 }) {
  const instanceRef = useRef<InstancedMesh>(null);
  const { scene } = useGLTF(TREE_MODELS[variant]);
  const sourceMesh = useMemo(() => {
    let result: Mesh | null = null;
    scene.traverse((child) => {
      if (!result && child instanceof Mesh) result = child;
    });
    if (!result) throw new Error(`梧桐树模型缺少网格：${TREE_MODELS[variant]}`);
    return result as Mesh;
  }, [scene, variant]);
  const placements = useMemo(
    () => XINHUA_PLANE_TREE_PLACEMENTS.filter((placement) => placement.variant === variant),
    [variant],
  );

  useLayoutEffect(() => {
    const instances = instanceRef.current;
    if (!instances) return;
    const matrix = new Matrix4();
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
      matrix.compose(position, quaternion, scale);
      instances.setMatrixAt(index, matrix);
    });
    instances.instanceMatrix.needsUpdate = true;
    instances.computeBoundingSphere();
  }, [placements]);

  return (
    <group scale={[1, 1, -1]}>
      <instancedMesh
        ref={instanceRef}
        args={[sourceMesh.geometry, sourceMesh.material, placements.length]}
        castShadow
        receiveShadow
        userData={{ vegetation: "xinhua-plane-tree", variant }}
      />
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

export function XinhuaRoadLandmarks() {
  return (
    <group name="xinhua-road-photo-reference-landmarks">
      {XINHUA_ROAD_LANDMARKS.map((landmark) => {
        const [x, z] = landmark.position;
        const y = terrainHeightAt(x, z) + 0.1;
        return (
          <group
            key={landmark.id}
            name={landmark.id}
            userData={{ landmark: landmark.id, address: landmark.address, modeling: "photo-reference-blender-glb" }}
          >
            <group position={[x, y, z]} rotation-y={landmark.yaw} scale={landmark.scale}>
              <GlbModel path={landmark.model} />
            </group>
          </group>
        );
      })}
    </group>
  );
}
