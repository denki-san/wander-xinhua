"use client";

import { useGLTF } from "@react-three/drei";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Group, Mesh } from "three";
import {
  SHANGHAI_CINEMA_HYBRID_IDENTITY_MODEL,
  SHANGHAI_CINEMA_MASSING_MODEL,
  ShanghaiCinemaHybridIdentity,
  ShanghaiCinemaMassingGlb,
  ShanghaiCinemaProgrammaticBody,
  ShanghaiCinemaRepeatedDetails,
} from "./shanghai-cinema-hybrid-identity";

export type ShanghaiCinemaRuntimeQaTier = "hero" | "identity" | "massing";
export type ShanghaiCinemaRuntimeQaFault =
  | "hero-unavailable"
  | "identity-unavailable";

export const SHANGHAI_CINEMA_HERO_QA_MODEL =
  "/models/xinhua-road/shanghai-cinema.glb?v=20260721-cinema-7";

function cloneQaScene(source: Group) {
  const clone = source.clone(true);
  clone.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return clone;
}

function ShanghaiCinemaRuntimeQaMarker({
  requestedTier,
  renderedTier,
  status,
  asset,
  fallback,
}: {
  requestedTier: ShanghaiCinemaRuntimeQaTier;
  renderedTier: ShanghaiCinemaRuntimeQaTier | "programmatic";
  status: "loaded" | "fault-injected";
  asset: string;
  fallback: string;
}) {
  useEffect(() => {
    const dataset = document.documentElement.dataset;
    dataset.shanghaiCinemaRuntimeRequestedTier = requestedTier;
    dataset.shanghaiCinemaRuntimeTier = renderedTier;
    dataset.shanghaiCinemaRuntimeStatus = status;
    dataset.shanghaiCinemaRuntimeAsset = asset;
    dataset.shanghaiCinemaRuntimeFallback = fallback;
    performance.mark(`shanghai-cinema-${renderedTier}-qa-ready`);
    return () => {
      delete dataset.shanghaiCinemaRuntimeRequestedTier;
      delete dataset.shanghaiCinemaRuntimeTier;
      delete dataset.shanghaiCinemaRuntimeStatus;
      delete dataset.shanghaiCinemaRuntimeAsset;
      delete dataset.shanghaiCinemaRuntimeFallback;
      performance.clearMarks(`shanghai-cinema-${renderedTier}-qa-ready`);
    };
  }, [asset, fallback, renderedTier, requestedTier, status]);
  return null;
}

function ShanghaiCinemaHeroQaGlb({ onReady }: { onReady: () => void }) {
  const { scene } = useGLTF(SHANGHAI_CINEMA_HERO_QA_MODEL);
  const model = useMemo(() => cloneQaScene(scene), [scene]);
  useEffect(() => {
    onReady();
  }, [onReady]);
  return (
    <group
      name="shanghai-cinema-hero-runtime-qa"
      userData={{
        building: "shanghai-cinema",
        stage: "hero",
        source: SHANGHAI_CINEMA_HERO_QA_MODEL,
      }}
    >
      <primitive object={model} scale={[1, 1, -1]} />
    </group>
  );
}

function ShanghaiCinemaIdentityQa({
  requestedTier,
  fallback,
}: {
  requestedTier: "hero" | "identity";
  fallback: string;
}) {
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);
  return (
    <>
      <ShanghaiCinemaHybridIdentity onReady={handleReady} />
      {ready && (
        <ShanghaiCinemaRuntimeQaMarker
          requestedTier={requestedTier}
          renderedTier="identity"
          status={fallback === "none" ? "loaded" : "fault-injected"}
          asset={SHANGHAI_CINEMA_HYBRID_IDENTITY_MODEL}
          fallback={fallback}
        />
      )}
    </>
  );
}

function ShanghaiCinemaProgrammaticIdentityFallback() {
  return (
    <group
      name="shanghai-cinema-programmatic-runtime-fallback"
      userData={{
        building: "shanghai-cinema",
        stage: "identity-programmatic-fallback",
        injectedFault: "identity-unavailable",
      }}
    >
      <ShanghaiCinemaProgrammaticBody />
      <ShanghaiCinemaRepeatedDetails />
      <ShanghaiCinemaRuntimeQaMarker
        requestedTier="identity"
        renderedTier="programmatic"
        status="fault-injected"
        asset="programmatic-runtime-recipe"
        fallback="identity-unavailable-to-programmatic"
      />
    </group>
  );
}

function ShanghaiCinemaMassingQa() {
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);
  return (
    <>
      <ShanghaiCinemaMassingGlb onReady={handleReady} />
      {ready && (
        <ShanghaiCinemaRuntimeQaMarker
          requestedTier="massing"
          renderedTier="massing"
          status="loaded"
          asset={SHANGHAI_CINEMA_MASSING_MODEL}
          fallback="none"
        />
      )}
    </>
  );
}

export function ShanghaiCinemaRuntimeQaAsset({
  tier,
  fault,
}: {
  tier: ShanghaiCinemaRuntimeQaTier;
  fault: ShanghaiCinemaRuntimeQaFault | null;
}) {
  const [heroReady, setHeroReady] = useState(false);
  const handleHeroReady = useCallback(() => setHeroReady(true), []);

  if (tier === "massing") return <ShanghaiCinemaMassingQa />;
  if (tier === "identity" && fault === "identity-unavailable") {
    return <ShanghaiCinemaProgrammaticIdentityFallback />;
  }
  if (tier === "identity") {
    return <ShanghaiCinemaIdentityQa requestedTier="identity" fallback="none" />;
  }
  if (fault === "hero-unavailable") {
    return (
      <ShanghaiCinemaIdentityQa
        requestedTier="hero"
        fallback="hero-unavailable-to-identity"
      />
    );
  }

  return (
    <Suspense
      fallback={(
        <ShanghaiCinemaIdentityQa
          requestedTier="hero"
          fallback="hero-loading-to-identity"
        />
      )}
    >
      <ShanghaiCinemaHeroQaGlb onReady={handleHeroReady} />
      {heroReady && (
        <ShanghaiCinemaRuntimeQaMarker
          requestedTier="hero"
          renderedTier="hero"
          status="loaded"
          asset={SHANGHAI_CINEMA_HERO_QA_MODEL}
          fallback="none"
        />
      )}
    </Suspense>
  );
}
