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
  ONE_STEP_GARDEN_ASSET_ID,
  ONE_STEP_GARDEN_PLACEMENT,
  ONE_STEP_GARDEN_TIERS,
} from "./one-step-garden-tier-contract.mjs";

export type OneStepGardenTier = "hero" | "identity" | "massing";
export type OneStepGardenFallback = "hero" | "identity" | null;

type OneStepGardenQaState = {
  instanceId: string;
  assetId: string;
  requestedTier: OneStepGardenTier;
  renderedTier: OneStepGardenTier;
  requestedUrl: string;
  loadedUrl: string;
  sha256: string;
  bytes: number;
  fallback: string;
  placement: typeof ONE_STEP_GARDEN_PLACEMENT;
  sourceGltfBounds: typeof ONE_STEP_GARDEN_PLACEMENT.sourceGltfBounds;
  renderedLocalBounds: typeof ONE_STEP_GARDEN_PLACEMENT.renderedLocalBounds;
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
    __oneStepGardenQA?: OneStepGardenQaState;
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

function OneStepGardenLoadedTier({
  tier,
  requestedTier,
  fallback,
}: {
  tier: OneStepGardenTier;
  requestedTier: OneStepGardenTier;
  fallback: string;
}) {
  const descriptor = ONE_STEP_GARDEN_TIERS[tier];
  const requestedDescriptor = ONE_STEP_GARDEN_TIERS[requestedTier];
  const { scene } = useGLTF(descriptor.url);
  const model = useMemo(() => cloneConfiguredScene(scene), [scene]);
  const assetMetrics = useMemo(() => inspectModel(model), [model]);
  const sample = useRef({ frames: 0, elapsed: 0 });
  const instanceId = useId();

  useEffect(() => {
    const qaState: OneStepGardenQaState = {
      instanceId,
      assetId: ONE_STEP_GARDEN_ASSET_ID,
      requestedTier,
      renderedTier: tier,
      requestedUrl: requestedDescriptor.url,
      loadedUrl: descriptor.url,
      sha256: descriptor.sha256,
      bytes: descriptor.bytes,
      fallback,
      placement: ONE_STEP_GARDEN_PLACEMENT,
      sourceGltfBounds: ONE_STEP_GARDEN_PLACEMENT.sourceGltfBounds,
      renderedLocalBounds: ONE_STEP_GARDEN_PLACEMENT.renderedLocalBounds,
      assetMetrics,
      frameSample: null,
    };
    window.__oneStepGardenQA = qaState;
    const root = document.documentElement;
    root.dataset.oneStepGardenInstanceId = instanceId;
    root.dataset.oneStepGardenRequestedTier = requestedTier;
    root.dataset.oneStepGardenRuntimeTier = tier;
    root.dataset.oneStepGardenRuntimeStatus = "loaded";
    root.dataset.oneStepGardenRequestedUrl = requestedDescriptor.url;
    root.dataset.oneStepGardenLoadedUrl = descriptor.url;
    root.dataset.oneStepGardenSha256 = descriptor.sha256;
    root.dataset.oneStepGardenBytes = String(descriptor.bytes);
    root.dataset.oneStepGardenFallback = fallback;
    delete root.dataset.oneStepGardenFrameSample;
    performance.mark(`one-step-garden-${tier}-runtime-ready`);
    window.dispatchEvent(new CustomEvent("xinhua:active-asset-runtime", {
      detail: qaState,
    }));
    return () => {
      if (window.__oneStepGardenQA?.instanceId === instanceId) {
        delete window.__oneStepGardenQA;
      }
      if (root.dataset.oneStepGardenInstanceId !== instanceId) return;
      delete root.dataset.oneStepGardenInstanceId;
      delete root.dataset.oneStepGardenRequestedTier;
      delete root.dataset.oneStepGardenRuntimeTier;
      delete root.dataset.oneStepGardenRuntimeStatus;
      delete root.dataset.oneStepGardenRequestedUrl;
      delete root.dataset.oneStepGardenLoadedUrl;
      delete root.dataset.oneStepGardenSha256;
      delete root.dataset.oneStepGardenBytes;
      delete root.dataset.oneStepGardenFallback;
      delete root.dataset.oneStepGardenFrameSample;
      performance.clearMarks(`one-step-garden-${tier}-runtime-ready`);
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
      || window.__oneStepGardenQA?.instanceId !== instanceId
    ) return;
    const durationMs = sample.current.elapsed * 1000;
    window.__oneStepGardenQA.frameSample = {
      viewport: [window.innerWidth, window.innerHeight],
      visible: true,
      frames: sample.current.frames,
      durationMs,
      fps: sample.current.frames / sample.current.elapsed,
      rendererDrawCalls: gl.info.render.calls,
      rendererTriangles: gl.info.render.triangles,
      buildMode: process.env.NODE_ENV ?? "unknown",
    };
    document.documentElement.dataset.oneStepGardenFrameSample = JSON.stringify(
      window.__oneStepGardenQA.frameSample,
    );
  });

  return (
    <group
      name={`one-step-garden-${tier}-runtime`}
      userData={{
        building: ONE_STEP_GARDEN_ASSET_ID,
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

function OneStepGardenMassing({
  requestedTier,
  fallback,
}: {
  requestedTier: OneStepGardenTier;
  fallback: string;
}) {
  return (
    <ProgressiveFeatureBoundary
      resetKey={ONE_STEP_GARDEN_TIERS.massing.url}
      fallback={null}
    >
      <Suspense fallback={null}>
        <OneStepGardenLoadedTier
          tier="massing"
          requestedTier={requestedTier}
          fallback={fallback}
        />
      </Suspense>
    </ProgressiveFeatureBoundary>
  );
}

function OneStepGardenIdentity({
  requestedTier,
  fallback,
}: {
  requestedTier: OneStepGardenTier;
  fallback: string;
}) {
  const massingFallback = (
    <OneStepGardenMassing
      requestedTier={requestedTier}
      fallback={`${fallback}-identity-to-massing`}
    />
  );
  return (
    <ProgressiveFeatureBoundary
      resetKey={ONE_STEP_GARDEN_TIERS.identity.url}
      fallback={massingFallback}
    >
      <Suspense fallback={massingFallback}>
        <OneStepGardenLoadedTier
          tier="identity"
          requestedTier={requestedTier}
          fallback={fallback}
        />
      </Suspense>
    </ProgressiveFeatureBoundary>
  );
}

export function OneStepGardenRuntimeAsset({
  requestedTier,
  forceFallback = null,
  noLowerTierFallback = false,
}: {
  requestedTier: OneStepGardenTier;
  forceFallback?: OneStepGardenFallback;
  noLowerTierFallback?: boolean;
}) {
  if (requestedTier === "massing") {
    return (
      <OneStepGardenMassing
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
        <OneStepGardenMassing
          requestedTier="identity"
          fallback="forced-deterministic-identity-to-massing"
        />
      );
    }
    return <OneStepGardenIdentity requestedTier="identity" fallback="none" />;
  }
  if (forceFallback === "hero") {
    return (
      <OneStepGardenIdentity
        requestedTier="hero"
        fallback="forced-deterministic-hero-to-identity"
      />
    );
  }

  const identityFallback = (
    <OneStepGardenIdentity
      requestedTier="hero"
      fallback="hero-loading-to-identity"
    />
  );
  return (
    <ProgressiveFeatureBoundary
      resetKey={ONE_STEP_GARDEN_TIERS.hero.url}
      fallback={identityFallback}
    >
      <Suspense fallback={identityFallback}>
        <OneStepGardenLoadedTier
          tier="hero"
          requestedTier="hero"
          fallback="none"
        />
      </Suspense>
    </ProgressiveFeatureBoundary>
  );
}
