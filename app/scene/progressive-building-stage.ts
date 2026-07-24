"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState, type RefObject } from "react";
import type {
  ProgressiveBuildingTier,
  ProgressiveNetworkProfile,
} from "./progressive-loading";

export const PROGRESSIVE_STAGE_SAMPLE_SECONDS = 0.2;

export function visibleProgressiveBuildingTier(
  mode: "intro" | "overview" | "explore",
  tier: ProgressiveBuildingTier,
): ProgressiveBuildingTier {
  if (mode !== "intro" && tier === "massing") return "identity";
  return tier;
}

export function resolveProgressiveBuildingTier({
  mode,
  networkProfile,
  distance,
  previousTier,
  fullEnterDistance,
  fullExitDistance,
}: {
  mode: "intro" | "overview" | "explore";
  networkProfile: ProgressiveNetworkProfile;
  distance: number;
  previousTier: ProgressiveBuildingTier;
  fullEnterDistance: number;
  fullExitDistance: number;
}): ProgressiveBuildingTier {
  if (mode === "intro") return "massing";
  if (networkProfile === "weak") return "identity";
  if (previousTier === "full") {
    return distance <= fullExitDistance ? "full" : "identity";
  }
  return distance <= fullEnterDistance ? "full" : "identity";
}

export function useProgressiveBuildingTier({
  mode,
  networkProfile,
  focusPosition,
  center,
  fullEnterDistance,
  fullExitDistance,
}: {
  mode: "intro" | "overview" | "explore";
  networkProfile: ProgressiveNetworkProfile;
  focusPosition: RefObject<readonly [number, number]>;
  center: readonly [number, number];
  fullEnterDistance: number;
  fullExitDistance: number;
}) {
  const [tier, setTier] = useState<ProgressiveBuildingTier>(
    mode === "intro" ? "massing" : "identity",
  );
  const tierRef = useRef(tier);
  const elapsed = useRef(PROGRESSIVE_STAGE_SAMPLE_SECONDS);

  useEffect(() => {
    const [focusX, focusZ] = focusPosition.current;
    const next = resolveProgressiveBuildingTier({
      mode,
      networkProfile,
      distance: Math.hypot(focusX - center[0], focusZ - center[1]),
      previousTier: tierRef.current,
      fullEnterDistance,
      fullExitDistance,
    });
    tierRef.current = next;
    setTier(next);
  }, [
    center,
    focusPosition,
    fullEnterDistance,
    fullExitDistance,
    mode,
    networkProfile,
  ]);

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (elapsed.current < PROGRESSIVE_STAGE_SAMPLE_SECONDS) return;
    elapsed.current = 0;
    const [focusX, focusZ] = focusPosition.current;
    const next = resolveProgressiveBuildingTier({
      mode,
      networkProfile,
      distance: Math.hypot(focusX - center[0], focusZ - center[1]),
      previousTier: tierRef.current,
      fullEnterDistance,
      fullExitDistance,
    });
    if (next === tierRef.current) return;
    tierRef.current = next;
    setTier(next);
  });

  // 模式切换先于 effect 提交。离开封面后立即把残留 Massing 钳制为 Identity，
  // 避免概览或游玩态闪出一帧方盒。
  return visibleProgressiveBuildingTier(mode, tier);
}
