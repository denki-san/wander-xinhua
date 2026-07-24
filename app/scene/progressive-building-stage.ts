"use client";

import { useMemo } from "react";
import type {
  ProgressiveBuildingTier,
  ProgressiveNetworkProfile,
} from "./progressive-loading";

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
  detailActive,
}: {
  mode: "intro" | "overview" | "explore";
  networkProfile: ProgressiveNetworkProfile;
  detailActive: boolean;
}): ProgressiveBuildingTier {
  if (mode === "intro") return "massing";
  if (
    mode === "explore"
    && detailActive
    && networkProfile === "standard"
  ) return "full";
  return "identity";
}

export function useProgressiveBuildingTier({
  mode,
  networkProfile,
  detailActive,
}: {
  mode: "intro" | "overview" | "explore";
  networkProfile: ProgressiveNetworkProfile;
  detailActive: boolean;
}) {
  return useMemo(
    () => visibleProgressiveBuildingTier(mode, resolveProgressiveBuildingTier({
      mode,
      networkProfile,
      detailActive,
    })),
    [detailActive, mode, networkProfile],
  );
}
