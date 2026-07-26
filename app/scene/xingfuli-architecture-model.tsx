"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Box3,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  Object3D,
} from "three";
import {
  resolveXingfuliQa,
  XINGFULI_SEGMENT_IDS,
  XINGFULI_TIERS,
} from "./xingfuli-tier-contract.mjs";

type XingfuliTier = "hero" | "identity" | "massing";
type XingfuliQa = {
  assetId: string;
  requestedTier: XingfuliTier;
  renderedTier: XingfuliTier;
  renderedModelPath: string;
  fallbackMode: string;
  fallbackReason: string;
};

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

function XingfuliArchitectureSegment({
  path,
  assetId,
  requestedTier,
  renderedTier,
  fallbackMode,
  fallbackReason,
  qaActive,
}: {
  path: string;
  assetId: string;
  requestedTier: XingfuliTier;
  renderedTier: XingfuliTier;
  fallbackMode: string;
  fallbackReason: string;
  qaActive: boolean;
}) {
  const { scene } = useGLTF(path);
  const model = useMemo(() => configureArchitectureModel(scene), [scene]);
  const frameSample = useRef({
    startedAt: 0,
    frames: 0,
    complete: false,
  });
  useEffect(() => () => {
    const materials = new Set<Material>();
    model.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
      childMaterials.forEach((childMaterial) => materials.add(childMaterial));
    });
    materials.forEach((childMaterial) => childMaterial.dispose());
  }, [model]);
  useEffect(() => {
    if (!qaActive) return;
    frameSample.current = {
      startedAt: 0,
      frames: 0,
      complete: false,
    };
    model.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(model);
    const root = document.documentElement;
    root.dataset.xingfuliQaAsset = assetId;
    root.dataset.xingfuliQaRequestedTier = requestedTier;
    root.dataset.xingfuliQaRenderedTier = renderedTier;
    root.dataset.xingfuliQaStatus = "loaded";
    root.dataset.xingfuliQaSource = path;
    root.dataset.xingfuliQaFallback = fallbackMode;
    root.dataset.xingfuliQaFallbackReason = fallbackReason;
    root.dataset.xingfuliQaBounds = JSON.stringify({
      min: bounds.min.toArray(),
      max: bounds.max.toArray(),
    });
    window.dispatchEvent(new CustomEvent("xinhua:active-asset-runtime", {
      detail: {
        assetId,
        requestedTier,
        renderedTier,
        status: "loaded",
        source: path,
        fallbackMode,
      },
    }));
    return () => {
      if (root.dataset.xingfuliQaSource !== path) return;
      delete root.dataset.xingfuliQaAsset;
      delete root.dataset.xingfuliQaRequestedTier;
      delete root.dataset.xingfuliQaRenderedTier;
      delete root.dataset.xingfuliQaStatus;
      delete root.dataset.xingfuliQaSource;
      delete root.dataset.xingfuliQaFallback;
      delete root.dataset.xingfuliQaFallbackReason;
      delete root.dataset.xingfuliQaBounds;
      delete root.dataset.xingfuliQaRender;
      delete root.dataset.xingfuliQaFrameSample;
    };
  }, [
    assetId,
    fallbackMode,
    fallbackReason,
    model,
    path,
    qaActive,
    renderedTier,
    requestedTier,
  ]);
  useFrame(({ gl }) => {
    if (!qaActive) return;
    const root = document.documentElement;
    root.dataset.xingfuliQaRender = JSON.stringify({
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      lines: gl.info.render.lines,
      points: gl.info.render.points,
    });
    const sample = frameSample.current;
    if (sample.complete || document.visibilityState !== "visible") return;
    const now = window.performance.now();
    if (sample.startedAt === 0) sample.startedAt = now;
    sample.frames += 1;
    if (sample.frames < 120) return;
    const durationMs = now - sample.startedAt;
    sample.complete = true;
    root.dataset.xingfuliQaFrameSample = JSON.stringify({
      viewport: [window.innerWidth, window.innerHeight],
      visible: true,
      frames: sample.frames,
      durationMs,
      fps: durationMs > 0 ? sample.frames * 1_000 / durationMs : 0,
      rendererDrawCalls: gl.info.render.calls,
      rendererTriangles: gl.info.render.triangles,
      buildMode: "browser-runtime",
    });
  });
  return <primitive object={model} scale={[1, 1, -1]} />;
}

export default function XingfuliArchitectureModel() {
  const qa = resolveXingfuliQa(
    typeof window === "undefined" ? "" : window.location.search,
  ) as XingfuliQa | null;
  const models = XINGFULI_SEGMENT_IDS.map((assetId) => {
    const qaActive = qa?.assetId === assetId;
    const requestedTier = qaActive ? qa.requestedTier : "hero";
    const renderedTier = qaActive ? qa.renderedTier : "hero";
    return {
      assetId,
      requestedTier,
      renderedTier,
      path: qaActive
        ? qa.renderedModelPath
        : XINGFULI_TIERS[
          assetId as keyof typeof XINGFULI_TIERS
        ].hero.url,
      fallbackMode: qaActive ? qa.fallbackMode : "none",
      fallbackReason: qaActive ? qa.fallbackReason : "none",
      qaActive,
    };
  });
  return (
    <group
      name="xingfuli-final-architecture"
      userData={{
        asset: "xingfuli",
        stage: qa?.requestedTier ?? "full",
        segments: 3,
        qaAssetId: qa?.assetId,
        qaRenderedTier: qa?.renderedTier,
        qaFallbackMode: qa?.fallbackMode,
        referenceManifest: "docs/research/xingfuli-reference-manifest.json",
      }}
    >
      {models.map((model) => (
        <XingfuliArchitectureSegment
          key={`${model.assetId}:${model.path}`}
          {...model}
        />
      ))}
    </group>
  );
}
