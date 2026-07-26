"use client";

import { useGLTF } from "@react-three/drei";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Mesh } from "three";
import { ProgressiveFeatureBoundary } from "../progressive-feature-boundary";
import type { ProgressiveNetworkProfile } from "./progressive-loading";
import runtimeManifest from "./xinhua-district-massing-runtime.json" with { type: "json" };

type DistrictChunk = (typeof runtimeManifest.chunks)[number];

function chunkCenter(id: string): readonly [number, number] {
  return [
    id.startsWith("east") ? 1 : -1,
    id.endsWith("north") ? 1 : -1,
  ];
}

function orderedChunks(focusPosition: readonly [number, number]) {
  const focusX = focusPosition[0] < 0 ? -1 : 1;
  const focusZ = focusPosition[1] < 0 ? -1 : 1;
  return [...runtimeManifest.chunks].sort((left, right) => {
    const [leftX, leftZ] = chunkCenter(left.id);
    const [rightX, rightZ] = chunkCenter(right.id);
    return (
      Math.hypot(leftX - focusX, leftZ - focusZ)
      - Math.hypot(rightX - focusX, rightZ - focusZ)
    );
  });
}

function OverviewDistrictChunk({
  chunk,
  onReady,
}: {
  chunk: DistrictChunk;
  onReady: (id: string) => void;
}) {
  const { scene } = useGLTF(chunk.url);
  const model = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.name = `overview-district-massing-${chunk.id}`;
    cloned.userData = {
      ...cloned.userData,
      assetId: runtimeManifest.assetId,
      chunkId: chunk.id,
      sourceSha256: chunk.sha256,
      overviewOnly: true,
      collision: false,
    };
    cloned.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.castShadow = false;
      object.receiveShadow = false;
      object.frustumCulled = true;
      object.userData = {
        ...object.userData,
        districtMassing: true,
        districtChunk: chunk.id,
        raycastTarget: false,
      };
      object.raycast = () => {};
    });
    return cloned;
  }, [chunk.id, chunk.sha256, scene]);

  useEffect(() => {
    onReady(chunk.id);
  }, [chunk.id, onReady]);

  return <primitive object={model} />;
}

/**
 * 730 栋街区白模按玩家所在象限优先加载。每个 GLB 有独立 Suspense 和错误边界，
 * 因此第一块完成就能显示，单块失败也不会让全街区一起消失。
 */
export function OverviewDistrictMassing({
  focusPosition,
  networkProfile,
}: {
  focusPosition: readonly [number, number];
  networkProfile: ProgressiveNetworkProfile;
}) {
  const chunks = useMemo(
    () => orderedChunks(focusPosition),
    [focusPosition],
  );
  const [activeCount, setActiveCount] = useState(1);
  const [readyIds, setReadyIds] = useState<string[]>([]);
  const markReady = useCallback((id: string) => {
    setReadyIds((current) => (
      current.includes(id) ? current : [...current, id]
    ));
  }, []);

  useEffect(() => {
    const interval = networkProfile === "weak" ? 900 : 180;
    const timers = chunks.slice(1).map((_, index) => window.setTimeout(() => {
      setActiveCount(index + 2);
    }, interval * (index + 1)));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [chunks, networkProfile]);

  useEffect(() => {
    document.documentElement.dataset.xinhuaDistrictChunksReady = readyIds.join(",");
    document.documentElement.dataset.xinhuaDistrictChunkCount = String(readyIds.length);
    if (readyIds.length === 1) performance.mark("xinhua-district-first-chunk-visible");
    if (readyIds.length === chunks.length) performance.mark("xinhua-district-all-chunks-visible");
  }, [chunks.length, readyIds]);

  return (
    <>
      {chunks.slice(0, activeCount).map((chunk) => (
        <ProgressiveFeatureBoundary
          key={chunk.id}
          resetKey={`district-massing-${chunk.id}`}
          fallback={null}
        >
          <Suspense fallback={null}>
            <OverviewDistrictChunk chunk={chunk} onReady={markReady} />
          </Suspense>
        </ProgressiveFeatureBoundary>
      ))}
    </>
  );
}

export default OverviewDistrictMassing;
