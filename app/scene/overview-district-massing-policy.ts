import type { ProgressiveNetworkProfile } from "./progressive-loading";

export function districtMassingEligibleAtOverviewEntry(
  networkProfile: ProgressiveNetworkProfile,
) {
  // 约 666KB 的街区白模负责全览的基础城市肌理，不能因为不稳定的
  // Network Information API 结果而整层消失。网络档位只作为遥测保留。
  void networkProfile;
  return true;
}
