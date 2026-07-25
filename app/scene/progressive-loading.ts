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
  // 启动脚本的 PerformanceResourceTiming 会混入缓存、主线程阻塞和连接复用，
  // 只能作为升级证据，不能据此把已进入近景的 Hero 永久撤回 Identity。
  // Safari 等浏览器没有 Network Information API；缺少证据不等于弱网。
  // 默认允许标准档，仅在 Save-Data 或 Network Information 明确报告慢网时降级。
  return "standard";
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
    const retryTimers = [1_500, 5_000, 15_000].map((delay) => (
      window.setTimeout(sync, delay)
    ));
    connection?.addEventListener?.("change", sync);
    window.addEventListener("online", sync);
    window.addEventListener("pageshow", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.cancelAnimationFrame(frame);
      retryTimers.forEach((timer) => window.clearTimeout(timer));
      connection?.removeEventListener?.("change", sync);
      window.removeEventListener("online", sync);
      window.removeEventListener("pageshow", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return profile;
}
