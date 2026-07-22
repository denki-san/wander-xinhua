"use client";

import { useGLTF } from "@react-three/drei";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { InstancedMesh, Matrix4, Mesh, Quaternion, Vector3 } from "three";

export type PlaneTreeVariant = 0 | 1 | 2;

export type PlaneTreeInstancePlacement = {
  id: string;
  variant: PlaneTreeVariant;
  position: [number, number, number];
  yaw: number;
  scale: [number, number, number];
};

export const PLANE_TREE_MODELS = [
  "/models/xinhua-road/plane-tree-a.glb?v=2",
  "/models/xinhua-road/plane-tree-b.glb?v=2",
  "/models/xinhua-road/plane-tree-c.glb?v=2",
] as const;

export const PLANE_TREE_GROUND_INSET = 0.04;

function InstancedPlaneTreePart({
  sourceMesh,
  placements,
  variant,
  part,
}: {
  sourceMesh: Mesh;
  placements: PlaneTreeInstancePlacement[];
  variant: PlaneTreeVariant;
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
      const [x, y, z] = placement.position;
      const [scaleX, scaleY, scaleZ] = placement.scale;
      // 父组统一翻转 Blender 导出的 Z 轴；实例内部使用镜像位置和反向旋转，
      // 确保所有单实例矩阵保持正缩放，避免 InstancedMesh 的负行列式问题。
      position.set(x, y - PLANE_TREE_GROUND_INSET, -z);
      quaternion.setFromAxisAngle(up, -placement.yaw);
      scale.set(scaleX, scaleY, scaleZ);
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
      frustumCulled
      userData={{ vegetation: "xinhua-plane-tree", variant, part, instanced: true }}
    />
  );
}

function InstancedPlaneTreeVariant({
  variant,
  placements,
}: {
  variant: PlaneTreeVariant;
  placements: PlaneTreeInstancePlacement[];
}) {
  const { scene } = useGLTF(PLANE_TREE_MODELS[variant]);
  const sourceMeshes = useMemo(() => {
    const result: Mesh[] = [];
    scene.updateMatrixWorld(true);
    scene.traverse((child) => {
      if (child instanceof Mesh) result.push(child);
    });
    if (result.length === 0) {
      throw new Error(`梧桐树模型缺少网格：${PLANE_TREE_MODELS[variant]}`);
    }
    return result;
  }, [scene, variant]);

  return sourceMeshes.map((sourceMesh, part) => (
    <InstancedPlaneTreePart
      key={sourceMesh.uuid}
      sourceMesh={sourceMesh}
      placements={placements}
      variant={variant}
      part={part}
    />
  ));
}

export function PlaneTreeInstances({
  placements,
  name = "plane-tree-instances",
}: {
  placements: PlaneTreeInstancePlacement[];
  name?: string;
}) {
  const placementsByVariant = useMemo(() => {
    const grouped: Record<PlaneTreeVariant, PlaneTreeInstancePlacement[]> = {
      0: [],
      1: [],
      2: [],
    };
    for (const placement of placements) grouped[placement.variant].push(placement);
    return grouped;
  }, [placements]);

  return (
    <group
      name={name}
      scale={[1, 1, -1]}
      userData={{ vegetation: "xinhua-plane-tree-family", variants: 3, instanced: true }}
    >
      {([0, 1, 2] as const).map((variant) => (
        placementsByVariant[variant].length > 0 ? (
          <Suspense key={PLANE_TREE_MODELS[variant]} fallback={null}>
            <InstancedPlaneTreeVariant
              variant={variant}
              placements={placementsByVariant[variant]}
            />
          </Suspense>
        ) : null
      ))}
    </group>
  );
}
