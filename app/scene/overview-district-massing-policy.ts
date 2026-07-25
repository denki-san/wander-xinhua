import type { ProgressiveNetworkProfile } from "./progressive-loading";

export function districtMassingEligibleAtOverviewEntry(
  networkProfile: ProgressiveNetworkProfile,
) {
  return networkProfile === "standard";
}
