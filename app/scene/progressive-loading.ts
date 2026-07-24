"use client";

import { useEffect, useState } from "react";

export type ProgressiveNetworkProfile = "standard" | "weak";
export type ProgressiveBuildingTier = "massing" | "identity" | "full";

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
};

export const WEAK_NETWORK_DOWNLINK_Mbps = 2.5;

type ResourceTimingEvidence = {
  startTime: number;
  responseEnd: number;
  encodedBodySize: number;
  transferSize: number;
};

export function estimateProgressiveDownlinkMbps(
  entries: readonly ResourceTimingEvidence[],
) {
  const usable = entries.filter((entry) => (
    entry.encodedBodySize > 0
    && entry.transferSize > 0
    && entry.responseEnd > entry.startTime
  ));
  if (!usable.length) return undefined;
  const startedAt = Math.min(...usable.map((entry) => entry.startTime));
  const finishedAt = Math.max(...usable.map((entry) => entry.responseEnd));
  const elapsedMs = finishedAt - startedAt;
  const transferredBytes = usable.reduce(
    (total, entry) => total + entry.encodedBodySize,
    0,
  );
  if (elapsedMs < 20 || transferredBytes < 32_000) return undefined;
  return transferredBytes * 8 / elapsedMs / 1_000;
}

export function classifyProgressiveNetwork(
  connection?: NetworkInformationLike,
  measuredDownlinkMbps?: number,
): ProgressiveNetworkProfile {
  if (connection?.saveData) return "weak";
  if (
    connection?.effectiveType === "slow-2g"
    || connection?.effectiveType === "2g"
    || connection?.effectiveType === "3g"
  ) return "weak";
  if (
    typeof connection?.downlink === "number"
    && connection.downlink > 0
    && connection.downlink < WEAK_NETWORK_DOWNLINK_Mbps
  ) return "weak";
  if (
    connection?.effectiveType === "4g"
    || (
      typeof connection?.downlink === "number"
      && connection.downlink >= WEAK_NETWORK_DOWNLINK_Mbps
    )
  ) return "standard";
  if (
    typeof measuredDownlinkMbps === "number"
    && measuredDownlinkMbps >= WEAK_NETWORK_DOWNLINK_Mbps
  ) return "standard";
  // Network Information API 缺失或信息不完整时先保守停在 Identity，
  // 只有同源启动资源提供了足够吞吐证据才升级到标准档。
  return "weak";
}

function requestedNetworkProfile(): ProgressiveNetworkProfile | undefined {
  if (typeof window === "undefined") return undefined;
  const requested = new URLSearchParams(window.location.search).get("network");
  return requested === "weak" || requested === "standard" ? requested : undefined;
}

function currentConnection() {
  if (typeof navigator === "undefined") return undefined;
  if (
    typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("network-api") === "missing"
  ) return undefined;
  const candidate = navigator as NavigatorWithConnection;
  return candidate.connection ?? candidate.mozConnection ?? candidate.webkitConnection;
}

function measuredStartupDownlink() {
  if (typeof performance === "undefined") return undefined;
  const entries = performance.getEntriesByType("resource")
    .filter((entry): entry is PerformanceResourceTiming => (
      entry instanceof PerformanceResourceTiming
      && entry.initiatorType === "script"
      && entry.name.startsWith(window.location.origin)
    ));
  return estimateProgressiveDownlinkMbps(entries);
}

function detectProgressiveNetworkProfile(): ProgressiveNetworkProfile {
  return requestedNetworkProfile() ?? classifyProgressiveNetwork(
    currentConnection(),
    measuredStartupDownlink(),
  );
}

export function useProgressiveNetworkProfile() {
  const [profile, setProfile] = useState<ProgressiveNetworkProfile>(
    detectProgressiveNetworkProfile,
  );

  useEffect(() => {
    const connection = currentConnection();
    const sync = () => setProfile(detectProgressiveNetworkProfile());
    sync();
    const frame = window.requestAnimationFrame(sync);
    connection?.addEventListener?.("change", sync);
    return () => {
      window.cancelAnimationFrame(frame);
      connection?.removeEventListener?.("change", sync);
    };
  }, []);

  return profile;
}
