export const PERFORMANCE_SCHEMA_VERSION = "wander-xinhua.performance.v1";
export const DEFAULT_LONG_FRAME_THRESHOLD_MS = 33.33;
export const DEFAULT_PERFORMANCE_WARMUP_MS = 5_000;
export const DEFAULT_PERFORMANCE_SAMPLE_MS = 10_000;

export type RuntimePerformanceTier = "massing" | "identity" | "hero" | "unknown";
export type PerformanceResourceKind = "js" | "glb" | "image" | "other";

export type PerformanceResourceLike = {
  name: string;
  initiatorType?: string;
  startTime: number;
  responseEnd: number;
  duration: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  nextHopProtocol?: string;
};

export type FrameMetrics = {
  frameCount: number;
  durationMs: number;
  fps: number | null;
  averageMs: number | null;
  p95Ms: number | null;
  minimumMs: number | null;
  maximumMs: number | null;
  longFrameThresholdMs: number;
  longFrameCount: number;
  longFrameRatio: number | null;
};

export type PerformanceResourceSummary = {
  requestCount: number;
  transferBytes: number;
  encodedBodyBytes: number;
  decodedBodyBytes: number;
  totalDurationMs: number;
  maximumDurationMs: number;
};

export type FirstPlayableRequestSummary = {
  capturedAtMs: number;
  requestWindowMs: number;
  totals: PerformanceResourceSummary;
  byKind: Record<PerformanceResourceKind, PerformanceResourceSummary>;
  requests: Array<{
    kind: PerformanceResourceKind;
    url: string;
    initiatorType: string;
    startTimeMs: number;
    responseEndMs: number;
    durationMs: number;
    transferBytes: number;
    encodedBodyBytes: number;
    decodedBodyBytes: number;
    nextHopProtocol: string;
  }>;
};

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function isPerformanceDiagnosticsEnabled(search: string) {
  return new URLSearchParams(search).get("perf") === "1";
}

export function normalizeRuntimePerformanceTier(
  value: unknown,
): RuntimePerformanceTier {
  if (value === "massing") return "massing";
  if (value === "identity") return "identity";
  if (value === "hero" || value === "full") return "hero";
  return "unknown";
}

export function calculateFrameMetrics(
  frameDurationsMs: readonly number[],
  longFrameThresholdMs = DEFAULT_LONG_FRAME_THRESHOLD_MS,
): FrameMetrics {
  const validDurations = frameDurationsMs.filter((duration) => (
    Number.isFinite(duration) && duration > 0
  ));
  if (!validDurations.length) {
    return {
      frameCount: 0,
      durationMs: 0,
      fps: null,
      averageMs: null,
      p95Ms: null,
      minimumMs: null,
      maximumMs: null,
      longFrameThresholdMs,
      longFrameCount: 0,
      longFrameRatio: null,
    };
  }

  const sorted = [...validDurations].sort((left, right) => left - right);
  const durationMs = validDurations.reduce((total, duration) => total + duration, 0);
  const averageMs = durationMs / validDurations.length;
  const p95Index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * 0.95) - 1),
  );
  const longFrameCount = validDurations.filter(
    (duration) => duration > longFrameThresholdMs,
  ).length;

  return {
    frameCount: validDurations.length,
    durationMs: round(durationMs),
    fps: round(1_000 / averageMs),
    averageMs: round(averageMs),
    p95Ms: round(sorted[p95Index]),
    minimumMs: round(sorted[0]),
    maximumMs: round(sorted.at(-1) ?? sorted[0]),
    longFrameThresholdMs,
    longFrameCount,
    longFrameRatio: round(longFrameCount / validDurations.length, 4),
  };
}

export function classifyPerformanceResource(
  resource: Pick<PerformanceResourceLike, "name" | "initiatorType">,
): PerformanceResourceKind {
  let pathname = resource.name.toLowerCase();
  try {
    pathname = new URL(resource.name, "https://wander-xinhua.invalid").pathname.toLowerCase();
  } catch {
    // 保留原始字符串作为后缀判断依据。
  }
  if (pathname.endsWith(".glb")) return "glb";
  if (
    resource.initiatorType === "script"
    || pathname.endsWith(".js")
    || pathname.endsWith(".mjs")
  ) return "js";
  if (
    resource.initiatorType === "img"
    || /\.(?:avif|gif|jpe?g|png|svg|webp)$/.test(pathname)
  ) return "image";
  return "other";
}

function emptyResourceSummary(): PerformanceResourceSummary {
  return {
    requestCount: 0,
    transferBytes: 0,
    encodedBodyBytes: 0,
    decodedBodyBytes: 0,
    totalDurationMs: 0,
    maximumDurationMs: 0,
  };
}

function addResource(
  summary: PerformanceResourceSummary,
  resource: PerformanceResourceLike,
) {
  summary.requestCount += 1;
  summary.transferBytes += resource.transferSize || 0;
  summary.encodedBodyBytes += resource.encodedBodySize || 0;
  summary.decodedBodyBytes += resource.decodedBodySize || 0;
  summary.totalDurationMs += resource.duration || 0;
  summary.maximumDurationMs = Math.max(
    summary.maximumDurationMs,
    resource.duration || 0,
  );
}

function roundResourceSummary(
  summary: PerformanceResourceSummary,
): PerformanceResourceSummary {
  return {
    ...summary,
    totalDurationMs: round(summary.totalDurationMs),
    maximumDurationMs: round(summary.maximumDurationMs),
  };
}

export function summarizeFirstPlayableRequests(
  resources: readonly PerformanceResourceLike[],
  capturedAtMs: number,
): FirstPlayableRequestSummary {
  const eligible = resources
    .filter((resource) => (
      resource.startTime <= capturedAtMs
      && resource.responseEnd > 0
      && resource.responseEnd <= capturedAtMs
    ))
    .sort((left, right) => left.startTime - right.startTime);
  const totals = emptyResourceSummary();
  const byKind: Record<PerformanceResourceKind, PerformanceResourceSummary> = {
    js: emptyResourceSummary(),
    glb: emptyResourceSummary(),
    image: emptyResourceSummary(),
    other: emptyResourceSummary(),
  };

  const requests = eligible.map((resource) => {
    const kind = classifyPerformanceResource(resource);
    addResource(totals, resource);
    addResource(byKind[kind], resource);
    return {
      kind,
      url: resource.name,
      initiatorType: resource.initiatorType ?? "",
      startTimeMs: round(resource.startTime),
      responseEndMs: round(resource.responseEnd),
      durationMs: round(resource.duration),
      transferBytes: resource.transferSize || 0,
      encodedBodyBytes: resource.encodedBodySize || 0,
      decodedBodyBytes: resource.decodedBodySize || 0,
      nextHopProtocol: resource.nextHopProtocol ?? "",
    };
  });

  const firstStart = eligible.length
    ? Math.min(...eligible.map((resource) => resource.startTime))
    : capturedAtMs;
  return {
    capturedAtMs: round(capturedAtMs),
    requestWindowMs: round(Math.max(0, capturedAtMs - firstStart)),
    totals: roundResourceSummary(totals),
    byKind: {
      js: roundResourceSummary(byKind.js),
      glb: roundResourceSummary(byKind.glb),
      image: roundResourceSummary(byKind.image),
      other: roundResourceSummary(byKind.other),
    },
    requests,
  };
}
