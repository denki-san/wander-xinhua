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
import { groundedPlaneTreeTranslationY } from "./xinhua-road-placement.mjs";

export type PlaneTreeVariant = 0 | 1 | 2 | 3;
export type PlaneTreeTier = "identity" | "massing";

export type PlaneTreeInstancePlacement = {
  id: string;
  variant: PlaneTreeVariant;
  position: [number, number, number];
  yaw: number;
  scale: [number, number, number];
};

export const PLANE_TREE_MODELS = [
  "/models/xinhua-road/plane-tree-a.glb?v=ac1e64eb4352",
  "/models/xinhua-road/plane-tree-b.glb?v=f5cb12e0ac1e",
  "/models/xinhua-road/plane-tree-c.glb?v=b89237348db6",
  "/models/xinhua-road/plane-tree-d.glb?v=c3cf688014a2",
] as const;

export const PLANE_TREE_MASSING_MODELS = [
  "/models/xinhua-road/plane-tree-massing-a.glb?v=bd85399575f7",
  "/models/xinhua-road/plane-tree-massing-b.glb?v=cceebc88d362",
  "/models/xinhua-road/plane-tree-massing-c.glb?v=da13f13c657b",
] as const;

export const PLANE_TREE_GROUND_INSET = 0.04;
export const PLANE_TREE_IDENTITY_MINIMUM_Y = [
  -0.079623,
  -0.065563,
  -0.072952,
  -0.0647,
] as const;
export const PLANE_TREE_MASSING_MINIMUM_Y = [
  -0.003856,
  -0.020009,
  -0.015339,
] as const;

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
  minimumY,
  boundsGrounding,
}: {
  sourceMesh: Mesh;
  placements: PlaneTreeInstancePlacement[];
  variant: PlaneTreeVariant;
  part: number;
  minimumY: number;
  boundsGrounding: boolean;
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
      position.set(
        x,
        boundsGrounding
          ? groundedPlaneTreeTranslationY(y, scaleY, minimumY)
          : y - PLANE_TREE_GROUND_INSET,
        -z,
      );
      quaternion.setFromAxisAngle(up, -placement.yaw);
      scale.set(scaleX, scaleY, scaleZ);
      placementMatrix.compose(position, quaternion, scale);
      instanceMatrix.multiplyMatrices(placementMatrix, sourceMesh.matrixWorld);
      instances.setMatrixAt(index, instanceMatrix);
    });
    instances.instanceMatrix.needsUpdate = true;
    instances.computeBoundingSphere();
  }, [boundsGrounding, minimumY, placements, sourceMesh]);

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
  modelPath,
  minimumY,
  boundsGrounding,
}: {
  variant: PlaneTreeVariant;
  placements: PlaneTreeInstancePlacement[];
  modelPath: string;
  minimumY: number;
  boundsGrounding: boolean;
}) {
  const { scene } = useGLTF(modelPath);
  const sourceMeshes = useMemo(() => {
    const result: Mesh[] = [];
    scene.updateMatrixWorld(true);
    scene.traverse((child) => {
      if (child instanceof Mesh) result.push(child);
    });
    if (result.length === 0) {
      throw new Error(`梧桐树模型缺少网格：${modelPath}`);
    }
    return result;
  }, [modelPath, scene]);

  return sourceMeshes.map((sourceMesh, part) => (
    <InstancedPlaneTreePart
      key={sourceMesh.uuid}
      sourceMesh={sourceMesh}
      placements={placements}
      variant={variant}
      part={part}
      minimumY={minimumY}
      boundsGrounding={boundsGrounding}
    />
  ));
}

export function PlaneTreeInstances({
  placements,
  name = "plane-tree-instances",
  tier = "identity",
  grounding = "legacy",
}: {
  placements: PlaneTreeInstancePlacement[];
  name?: string;
  tier?: PlaneTreeTier;
  grounding?: "legacy" | "bounds";
}) {
  const modelPaths = tier === "massing"
    ? PLANE_TREE_MASSING_MODELS
    : PLANE_TREE_MODELS;
  const minimumYByVariant = tier === "massing"
    ? PLANE_TREE_MASSING_MINIMUM_Y
    : PLANE_TREE_IDENTITY_MINIMUM_Y;
  const placementsByVariant = useMemo(() => {
    const grouped: Record<PlaneTreeVariant, PlaneTreeInstancePlacement[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
    };
    for (const placement of placements) {
      const variant = tier === "massing"
        ? placement.variant % PLANE_TREE_MASSING_MODELS.length as PlaneTreeVariant
        : placement.variant;
      grouped[variant].push({ ...placement, variant });
    }
    return grouped;
  }, [placements, tier]);

  return (
    <group
      name={name}
      scale={[1, 1, -1]}
      userData={{
        vegetation: "xinhua-plane-tree-family",
        variants: modelPaths.length,
        tier,
        instanced: true,
      }}
    >
      {modelPaths.map((modelPath, variantIndex) => {
        const variant = variantIndex as PlaneTreeVariant;
        return (
        placementsByVariant[variant].length > 0 ? (
          <Suspense key={modelPath} fallback={null}>
            <InstancedPlaneTreeVariant
              variant={variant}
              placements={placementsByVariant[variant]}
              modelPath={modelPath}
              minimumY={minimumYByVariant[variant]!}
              boundsGrounding={grounding === "bounds"}
            />
          </Suspense>
        ) : null
        );
      })}
    </group>
  );
}
