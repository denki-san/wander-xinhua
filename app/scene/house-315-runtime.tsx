"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  Suspense,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react";
import {
  Box3,
  Group,
  Mesh,
  type Material,
} from "three";
import { ProgressiveFeatureBoundary } from "../progressive-feature-boundary";
import {
  HOUSE_315_ASSET_ID,
  HOUSE_315_PLACEMENT,
  HOUSE_315_TIERS,
} from "./house-315-tier-contract.mjs";

export type House315Tier = "hero" | "identity" | "massing";
export type House315Fallback = "hero" | "identity" | null;

type House315QaState = {
  instanceId: string;
  assetId: string;
  requestedTier: House315Tier;
  renderedTier: House315Tier;
  requestedUrl: string;
  loadedUrl: string;
  sha256: string;
  bytes: number;
  fallback: string;
  placement: typeof HOUSE_315_PLACEMENT;
  sourceGltfBounds: typeof HOUSE_315_PLACEMENT.sourceGltfBounds;
  renderedLocalBounds: typeof HOUSE_315_PLACEMENT.renderedLocalBounds;
  assetMetrics: {
    meshPrimitives: number;
    triangles: number;
    materials: number;
    sourceGltfBounds: {
      min: number[];
      max: number[];
    };
  };
  frameSample: null | {
    viewport: [number, number];
    visible: boolean;
    frames: number;
    durationMs: number;
    fps: number;
    rendererDrawCalls: number;
    rendererTriangles: number;
    buildMode: string;
  };
};

declare global {
  interface Window {
    __house315QA?: House315QaState;
  }
}

function cloneConfiguredScene(source: Group) {
  const clone = source.clone(true);
  clone.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return clone;
}

function inspectModel(model: Group) {
  let meshPrimitives = 0;
  let triangles = 0;
  const materials = new Set<Material>();
  model.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    meshPrimitives += 1;
    const geometry = child.geometry;
    triangles += geometry.index
      ? geometry.index.count / 3
      : (geometry.attributes.position?.count ?? 0) / 3;
    const childMaterials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    childMaterials.forEach((material) => materials.add(material));
  });
  const bounds = new Box3().setFromObject(model);
  return {
    meshPrimitives,
    triangles,
    materials: materials.size,
    sourceGltfBounds: {
      min: bounds.min.toArray(),
      max: bounds.max.toArray(),
    },
  };
}

function House315LoadedTier({
  tier,
  requestedTier,
  fallback,
}: {
  tier: House315Tier;
  requestedTier: House315Tier;
  fallback: string;
}) {
  const descriptor = HOUSE_315_TIERS[tier];
  const requestedDescriptor = HOUSE_315_TIERS[requestedTier];
  const { scene } = useGLTF(descriptor.url);
  const model = useMemo(() => cloneConfiguredScene(scene), [scene]);
  const assetMetrics = useMemo(() => inspectModel(model), [model]);
  const sample = useRef({ frames: 0, elapsed: 0 });
  const instanceId = useId();

  useEffect(() => {
    const qaState: House315QaState = {
      instanceId,
      assetId: HOUSE_315_ASSET_ID,
      requestedTier,
      renderedTier: tier,
      requestedUrl: requestedDescriptor.url,
      loadedUrl: descriptor.url,
      sha256: descriptor.sha256,
      bytes: descriptor.bytes,
      fallback,
      placement: HOUSE_315_PLACEMENT,
      sourceGltfBounds: HOUSE_315_PLACEMENT.sourceGltfBounds,
      renderedLocalBounds: HOUSE_315_PLACEMENT.renderedLocalBounds,
      assetMetrics,
      frameSample: null,
    };
    window.__house315QA = qaState;
    const root = document.documentElement;
    root.dataset.house315InstanceId = instanceId;
    root.dataset.house315RequestedTier = requestedTier;
    root.dataset.house315RuntimeTier = tier;
    root.dataset.house315RuntimeStatus = "loaded";
    root.dataset.house315RequestedUrl = requestedDescriptor.url;
    root.dataset.house315LoadedUrl = descriptor.url;
    root.dataset.house315Sha256 = descriptor.sha256;
    root.dataset.house315Bytes = String(descriptor.bytes);
    root.dataset.house315Fallback = fallback;
    delete root.dataset.house315FrameSample;
    performance.mark(`house-315-${tier}-runtime-ready`);
    window.dispatchEvent(new CustomEvent("xinhua:active-asset-runtime", {
      detail: qaState,
    }));
    return () => {
      if (window.__house315QA?.instanceId === instanceId) {
        delete window.__house315QA;
      }
      if (root.dataset.house315InstanceId !== instanceId) return;
      delete root.dataset.house315InstanceId;
      delete root.dataset.house315RequestedTier;
      delete root.dataset.house315RuntimeTier;
      delete root.dataset.house315RuntimeStatus;
      delete root.dataset.house315RequestedUrl;
      delete root.dataset.house315LoadedUrl;
      delete root.dataset.house315Sha256;
      delete root.dataset.house315Bytes;
      delete root.dataset.house315Fallback;
      delete root.dataset.house315FrameSample;
      performance.clearMarks(`house-315-${tier}-runtime-ready`);
    };
  }, [
    assetMetrics,
    descriptor.bytes,
    descriptor.sha256,
    descriptor.url,
    fallback,
    instanceId,
    requestedDescriptor.url,
    requestedTier,
    tier,
  ]);

  useFrame(({ gl }, delta) => {
    if (document.visibilityState !== "visible") return;
    if (sample.current.frames >= 120) return;
    sample.current.frames += 1;
    sample.current.elapsed += delta;
    if (
      sample.current.frames < 120
      || window.__house315QA?.instanceId !== instanceId
    ) return;
    const durationMs = sample.current.elapsed * 1000;
    window.__house315QA.frameSample = {
      viewport: [window.innerWidth, window.innerHeight],
      visible: true,
      frames: sample.current.frames,
      durationMs,
      fps: sample.current.frames / sample.current.elapsed,
      rendererDrawCalls: gl.info.render.calls,
      rendererTriangles: gl.info.render.triangles,
      buildMode: process.env.NODE_ENV ?? "unknown",
    };
    document.documentElement.dataset.house315FrameSample = JSON.stringify(
      window.__house315QA.frameSample,
    );
  });

  return (
    <group
      name={`house-315-${tier}-runtime`}
      userData={{
        building: HOUSE_315_ASSET_ID,
        requestedTier,
        renderedTier: tier,
        source: descriptor.url,
        fallback,
        origin: "shared-zero-origin",
        placement: "shared-xinhua-road-contract",
      }}
    >
      <primitive object={model} scale={[1, 1, -1]} />
    </group>
  );
}

function House315Massing({
  requestedTier,
  fallback,
}: {
  requestedTier: House315Tier;
  fallback: string;
}) {
  return (
    <ProgressiveFeatureBoundary
      resetKey={HOUSE_315_TIERS.massing.url}
      fallback={null}
    >
      <Suspense fallback={null}>
        <House315LoadedTier
          tier="massing"
          requestedTier={requestedTier}
          fallback={fallback}
        />
      </Suspense>
    </ProgressiveFeatureBoundary>
  );
}

function House315Identity({
  requestedTier,
  fallback,
}: {
  requestedTier: House315Tier;
  fallback: string;
}) {
  const massingFallback = (
    <House315Massing
      requestedTier={requestedTier}
      fallback={fallback === "none"
        ? "identity-loading-to-massing"
        : `${fallback}-identity-to-massing`}
    />
  );
  return (
    <ProgressiveFeatureBoundary
      resetKey={HOUSE_315_TIERS.identity.url}
      fallback={massingFallback}
    >
      <Suspense fallback={massingFallback}>
        <House315LoadedTier
          tier="identity"
          requestedTier={requestedTier}
          fallback={fallback}
        />
      </Suspense>
    </ProgressiveFeatureBoundary>
  );
}

export function House315RuntimeAsset({
  requestedTier,
  forceFallback = null,
  noLowerTierFallback = false,
}: {
  requestedTier: House315Tier;
  forceFallback?: House315Fallback;
  noLowerTierFallback?: boolean;
}) {
  if (requestedTier === "massing") {
    return (
      <House315Massing
        requestedTier="massing"
        fallback={noLowerTierFallback
          ? "no-lower-tier-render-massing"
          : "none"}
      />
    );
  }
  if (requestedTier === "identity") {
    if (forceFallback === "identity") {
      return (
        <House315Massing
          requestedTier="identity"
          fallback="forced-deterministic-identity-to-massing"
        />
      );
    }
    return <House315Identity requestedTier="identity" fallback="none" />;
  }
  if (forceFallback === "hero") {
    return (
      <House315Identity
        requestedTier="hero"
        fallback="forced-deterministic-hero-to-identity"
      />
    );
  }

  const identityFallback = (
    <House315Identity
      requestedTier="hero"
      fallback="hero-loading-to-identity"
    />
  );
  return (
    <ProgressiveFeatureBoundary
      resetKey={HOUSE_315_TIERS.hero.url}
      fallback={identityFallback}
    >
      <Suspense fallback={identityFallback}>
        <House315LoadedTier
          tier="hero"
          requestedTier="hero"
          fallback="none"
        />
      </Suspense>
    </ProgressiveFeatureBoundary>
  );
}
