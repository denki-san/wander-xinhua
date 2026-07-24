"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import {
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
} from "three";
import landmarks from "./xinhua-landmarks-data.json";

type Building = (typeof landmarks.shangshengXinsuo.buildings)[number];

export function SunKeVillaModel({ building }: { building: Building }) {
  const { scene } = useGLTF("/models/shangsheng/sun-ke-villa.glb");
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const materialCache = new Map<string, MeshToonMaterial | MeshStandardMaterial>();
    clone.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const sourceWasArray = Array.isArray(child.material);
      const sources: Material[] = Array.isArray(child.material) ? child.material : [child.material];
      const replacements = sources.map((source) => {
        const materialName = source?.name ?? "SunKe_StuccoWarm";
        let material = materialCache.get(materialName);
        if (!material) {
          const sourceColor = source instanceof MeshStandardMaterial
            || source instanceof MeshToonMaterial
            || source instanceof MeshBasicMaterial
            ? source.color.clone()
            : undefined;
          if (materialName === "SunKe_DeepTealGlass") {
            material = new MeshStandardMaterial({
              color: sourceColor ?? "#334847",
              transparent: true,
              opacity: 0.82,
              roughness: 0.24,
              metalness: 0,
              depthWrite: false,
            });
          } else {
            material = new MeshToonMaterial({ color: sourceColor ?? "#b7a48d" });
          }
          material.name = materialName;
          materialCache.set(materialName, material);
        }
        return material;
      });
      child.material = sourceWasArray ? replacements : replacements[0];
      child.castShadow = !sources.every(
        (source) => source.name === "SunKe_DeepTealGlass",
      );
      child.receiveShadow = true;
    });
    return clone;
  }, [scene]);

  useEffect(() => () => {
    const materials = new Set<MeshToonMaterial | MeshStandardMaterial>();
    model.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of childMaterials) {
        if (
          material instanceof MeshToonMaterial
          || material instanceof MeshStandardMaterial
        ) materials.add(material);
      }
    });
    materials.forEach((material) => material.dispose());
  }, [model]);

  return (
    <group
      name="shangsheng-sun-ke-villa"
      position={[building.position[0], 0.1, building.position[1]]}
      rotation-y={building.rotationY}
      userData={{
        building: "sun-ke-villa",
        osmWayId: building.id,
        referenceView: "garden-front",
        stage: "full",
      }}
    >
      <primitive object={model} />
    </group>
  );
}

export function NavyClubModel({ building }: { building: Building }) {
  const { scene } = useGLTF("/models/shangsheng/navy-club-pool.glb");
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const materialCache = new Map<
      string,
      MeshToonMaterial | MeshStandardMaterial | MeshBasicMaterial
    >();
    clone.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const sources = Array.isArray(child.material) ? child.material : [child.material];
      child.material = sources.map((source) => {
        const materialName = source?.name ?? "PlasterWhite";
        let material = materialCache.get(materialName);
        if (!material) {
          const sourceColor = source && "color" in source && source.color
            ? source.color.clone()
            : undefined;
          if (materialName === "PoolWater") {
            material = new MeshStandardMaterial({
              color: sourceColor ?? "#58bfc4",
              transparent: true,
              opacity: 0.76,
              roughness: 0.16,
              metalness: 0.08,
              depthWrite: false,
            });
          } else if (materialName === "WarmArcadeLight") {
            material = new MeshBasicMaterial({ color: sourceColor ?? "#f1c67a" });
          } else {
            material = new MeshToonMaterial({
              color: sourceColor ?? "#e9e4d9",
              transparent: materialName === "DeepTealGlass",
              opacity: materialName === "DeepTealGlass" ? 0.86 : 1,
            });
          }
          materialCache.set(materialName, material);
        }
        return material;
      });
      child.castShadow = !sources.every(
        ({ name }) => name === "PoolWater" || name === "DeepTealGlass",
      );
      child.receiveShadow = true;
    });
    return clone;
  }, [scene]);

  useEffect(() => () => {
    const materials = new Set<
      MeshToonMaterial | MeshStandardMaterial | MeshBasicMaterial
    >();
    model.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of childMaterials) {
        if (
          material instanceof MeshToonMaterial
          || material instanceof MeshStandardMaterial
          || material instanceof MeshBasicMaterial
        ) materials.add(material);
      }
    });
    materials.forEach((material) => material.dispose());
  }, [model]);

  return (
    <group
      name="shangsheng-navy-club-and-pool"
      userData={{
        building: "navy-club-and-pool",
        osmWayId: building.id,
        stage: "full",
      }}
    >
      <primitive object={model} scale={[1, 1, -1]} />
    </group>
  );
}
