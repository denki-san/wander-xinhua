"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState, type RefObject } from "react";
import type {
  ProgressiveBuildingTier,
  ProgressiveNetworkProfile,
} from "./progressive-loading";
import type { MapObstacle } from "./world-math";

export const PROGRESSIVE_STAGE_SAMPLE_SECONDS = 0.2;

export function planarDistanceToBuildingFootprints(
  [focusX, focusZ]: readonly [number, number],
  footprints: readonly MapObstacle[],
) {
  return footprints.reduce((nearest, footprint) => {
    const outsideX = Math.max(footprint.minX - focusX, 0, focusX - footprint.maxX);
    const outsideZ = Math.max(footprint.minZ - focusZ, 0, focusZ - footprint.maxZ);
    return Math.min(nearest, Math.hypot(outsideX, outsideZ));
  }, Number.POSITIVE_INFINITY);
}

export function visibleProgressiveBuildingTier(
  mode: "intro" | "overview" | "explore",
  networkProfile: ProgressiveNetworkProfile,
  tier: ProgressiveBuildingTier,
): ProgressiveBuildingTier {
  // 网络档位不能把玩家已经看到的 Hero 降回 Identity；弱网下由 Suspense
  // 继续显示 Identity，等附近 Hero 自然加载完成。
  void networkProfile;
  if (mode === "intro") return "massing";
  if (mode === "overview") return "identity";
  if (tier === "massing") return "identity";
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
  // Hero 是否出现只由模式和真实空间距离决定，不读取网络估算结果。
  void networkProfile;
  if (mode === "intro") return "massing";
  if (mode === "overview") return "identity";
  if (previousTier === "full") {
    return distance <= fullExitDistance ? "full" : "identity";
  }
  return distance <= fullEnterDistance ? "full" : "identity";
}

export function useProgressiveBuildingTier({
  mode,
  networkProfile,
  focusPosition,
  footprints,
  fullEnterDistance,
  fullExitDistance,
}: {
  mode: "intro" | "overview" | "explore";
  networkProfile: ProgressiveNetworkProfile;
  focusPosition: RefObject<readonly [number, number]>;
  footprints: readonly MapObstacle[];
  fullEnterDistance: number;
  fullExitDistance: number;
}) {
  const [tier, setTier] = useState<ProgressiveBuildingTier>(
    mode === "intro" ? "massing" : "identity",
  );
  const tierRef = useRef(tier);
  const elapsed = useRef(PROGRESSIVE_STAGE_SAMPLE_SECONDS);

  useEffect(() => {
    const next = resolveProgressiveBuildingTier({
      mode,
      networkProfile,
      distance: planarDistanceToBuildingFootprints(focusPosition.current, footprints),
      previousTier: tierRef.current,
      fullEnterDistance,
      fullExitDistance,
    });
    tierRef.current = next;
    setTier(next);
  }, [
    focusPosition,
    footprints,
    fullEnterDistance,
    fullExitDistance,
    mode,
    networkProfile,
  ]);

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (elapsed.current < PROGRESSIVE_STAGE_SAMPLE_SECONDS) return;
    elapsed.current = 0;
    const next = resolveProgressiveBuildingTier({
      mode,
      networkProfile,
      distance: planarDistanceToBuildingFootprints(focusPosition.current, footprints),
      previousTier: tierRef.current,
      fullEnterDistance,
      fullExitDistance,
    });
    if (next === tierRef.current) return;
    tierRef.current = next;
    setTier(next);
  });

  // 模式切换先于 effect 提交。离开封面后立即把残留 Massing 钳制为 Identity；
  // 网络档变化不得把已经显示的 Hero 降级。
  return visibleProgressiveBuildingTier(mode, networkProfile, tier);
}
