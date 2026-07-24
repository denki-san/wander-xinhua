"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import {
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  Object3D,
} from "three";

const XINGFULI_ARCHITECTURE_MODELS = [
  "/models/xingfuli/xingfuli-west.glb?v=20260723-final-1",
  "/models/xingfuli/xingfuli-center.glb?v=20260723-final-1",
  "/models/xingfuli/xingfuli-east.glb?v=20260723-final-1",
] as const;

function configureArchitectureModel(source: Object3D) {
  const clone = source.clone(true);
  const materialCache = new Map<string, MeshToonMaterial | MeshStandardMaterial>();
  clone.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const sourceWasArray = Array.isArray(child.material);
    const sourceMaterials: Material[] = sourceWasArray ? child.material : [child.material];
    const replacements = sourceMaterials.map((sourceMaterial) => {
      const name = sourceMaterial.name || "幸福里灰模材质";
      let replacement = materialCache.get(name);
      if (replacement) return replacement;
      const color = sourceMaterial instanceof MeshStandardMaterial
        || sourceMaterial instanceof MeshToonMaterial
        || sourceMaterial instanceof MeshBasicMaterial
        ? sourceMaterial.color.clone()
        : undefined;
      if (name.includes("玻璃")) {
        replacement = new MeshStandardMaterial({
          color: color ?? "#739b9e",
          transparent: true,
          opacity: 0.78,
          roughness: 0.34,
          metalness: 0,
          depthWrite: false,
        });
      } else {
        replacement = new MeshToonMaterial({ color: color ?? "#e9e7de" });
      }
      replacement.name = name;
      materialCache.set(name, replacement);
      return replacement;
    });
    child.material = sourceWasArray ? replacements : replacements[0];
    child.castShadow = !sourceMaterials.every(({ name }) => name.includes("玻璃"));
    child.receiveShadow = true;
  });
  return clone;
}

function XingfuliArchitectureSegment({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  const model = useMemo(() => configureArchitectureModel(scene), [scene]);
  useEffect(() => () => {
    const materials = new Set<Material>();
    model.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
      childMaterials.forEach((childMaterial) => materials.add(childMaterial));
    });
    materials.forEach((childMaterial) => childMaterial.dispose());
  }, [model]);
  return <primitive object={model} scale={[1, 1, -1]} />;
}

export default function XingfuliArchitectureModel() {
  return (
    <group
      name="xingfuli-final-architecture"
      userData={{
        asset: "xingfuli",
        stage: "full",
        segments: 3,
        referenceManifest: "docs/research/xingfuli-reference-manifest.json",
      }}
    >
      {XINGFULI_ARCHITECTURE_MODELS.map((path) => (
        <XingfuliArchitectureSegment key={path} path={path} />
      ))}
    </group>
  );
}
