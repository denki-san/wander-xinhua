"use client";

import { useGLTF } from "@react-three/drei";
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import {
  Color,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
} from "three";

export type PlaneTreeVariant = 0 | 1 | 2;

export type PlaneTreeInstancePlacement = {
  id: string;
  variant: PlaneTreeVariant;
  position: [number, number, number];
  yaw: number;
  scale: [number, number, number];
};

export const PLANE_TREE_MODELS = [
  "/models/xinhua-road/plane-tree-a.glb?v=36ffe252c43b",
  "/models/xinhua-road/plane-tree-b.glb?v=7c2e06d0794f",
  "/models/xinhua-road/plane-tree-c.glb?v=c4c14bd84d9c",
] as const;

export const PLANE_TREE_GROUND_INSET = 0.04;

type ColorMaterial = Material & {
  color?: Color;
  emissive?: Color;
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
};

export function cloneAutumnPlaneTreeMaterial(source: Material) {
  const material = source.clone() as ColorMaterial;
  const name = source.name.toLowerCase();
  if (!material.color) return material;

  if (/叶|leaf/.test(name)) {
    const target = /深|dark/.test(name)
      ? "#74834f"
      : /浅|light/.test(name)
        ? "#d7ad58"
        : "#ad8140";
    material.color.set(target);
    if (material.emissive) {
      material.emissive.set("#3c3420");
      material.emissiveIntensity = 0.055;
    }
    if (typeof material.roughness === "number") material.roughness = 0.96;
    if (typeof material.metalness === "number") material.metalness = 0;
  } else if (/干|枝|bark|trunk|branch/.test(name)) {
    material.color.lerp(new Color("#756654"), 0.38);
    if (typeof material.roughness === "number") material.roughness = 0.92;
    if (typeof material.metalness === "number") material.metalness = 0;
  }
  material.needsUpdate = true;
  return material;
}

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
  const material = useMemo(() => (
    Array.isArray(sourceMesh.material)
      ? sourceMesh.material.map(cloneAutumnPlaneTreeMaterial)
      : cloneAutumnPlaneTreeMaterial(sourceMesh.material)
  ), [sourceMesh.material]);

  useEffect(() => () => {
    if (Array.isArray(material)) material.forEach((item) => item.dispose());
    else material.dispose();
  }, [material]);

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
      args={[sourceMesh.geometry, material, placements.length]}
      castShadow
      receiveShadow
      frustumCulled
      userData={{
        vegetation: "xinhua-plane-tree",
        season: "late-autumn",
        variant,
        part,
        instanced: true,
      }}
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
