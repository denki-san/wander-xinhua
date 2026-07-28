"use client";

import { addAfterEffect, useFrame, useThree } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import type { Object3D, WebGLRenderer } from "three";
import styles from "./performance-diagnostics.module.css";
import {
  calculateFrameMetrics,
  DEFAULT_LONG_FRAME_THRESHOLD_MS,
  DEFAULT_PERFORMANCE_SAMPLE_MS,
  DEFAULT_PERFORMANCE_WARMUP_MS,
  normalizeRuntimePerformanceTier,
  PERFORMANCE_SCHEMA_VERSION,
  summarizeFirstPlayableRequests,
  type FirstPlayableRequestSummary,
  type FrameMetrics,
  type PerformanceResourceLike,
  type RuntimePerformanceTier,
} from "./performance-metrics";

type ExperienceMode = "intro" | "overview" | "explore";
type SampleStatus = "idle" | "warming" | "sampling" | "complete" | "error";

export type PerformanceSampleOptions = {
  warmupMs?: number;
  durationMs?: number;
  cacheState?: "disabled" | "cold" | "warm" | "unknown";
  movementRoute?: string;
  networkCondition?: string;
  label?: string;
};

type RendererSnapshot = {
  drawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  geometries: number;
  textures: number;
  programs: number | null;
};

type RendererSampleSummary = {
  last: RendererSnapshot;
  average: Pick<RendererSnapshot, "drawCalls" | "triangles" | "points" | "lines">;
  maximum: Pick<RendererSnapshot, "drawCalls" | "triangles" | "points" | "lines">;
};

type SceneTierEntry = {
  assetId: string;
  tier: RuntimePerformanceTier;
  objectName: string;
  chunkId: string | null;
};

type SceneTierSnapshot = {
  entries: SceneTierEntry[];
  tierCounts: Record<RuntimePerformanceTier, number>;
  assetIds: string[];
  chunkIds: string[];
};

type SceneSnapshot = {
  semantics: {
    loaded: "mounted-in-scene-graph";
    visible: "object-visible-chain-not-camera-frustum";
  };
  loaded: SceneTierSnapshot;
  visible: SceneTierSnapshot;
  activeAssetIds: string[];
  loadedChunkIds: string[];
  visibleChunkIds: string[];
};

type RuntimeContext = {
  mode: ExperienceMode;
  entry: string;
  renderDpr: number;
  qualityTier: "low" | "high";
  networkProfile: string;
};

type FirstPlayableSnapshot = {
  entry: string;
  mode: ExperienceMode;
  atMs: number;
  markName: string;
  requests: FirstPlayableRequestSummary;
};

type VisibilityProtocol = {
  start: DocumentVisibilityState;
  end: DocumentVisibilityState;
  visibleThroughout: boolean;
  visibilityChangeCount: number;
  hiddenDurationMs: number;
};

export type PerformanceSampleExport = {
  schemaVersion: typeof PERFORMANCE_SCHEMA_VERSION;
  generatedAt: string;
  sampleKind: "rolling-snapshot" | "fixed-duration";
  label: string;
  page: {
    url: string;
    entry: string;
    mode: ExperienceMode;
    buildMode: "production" | "development";
  };
  protocol: {
    viewport: {
      width: number;
      height: number;
      devicePixelRatio: number;
      renderDpr: number;
    };
    device: {
      userAgent: string;
      platform: string;
      hardwareConcurrency: number | null;
      deviceMemoryGb: number | null;
      maxTouchPoints: number;
    };
    browserLanguage: string;
    qualityTier: "low" | "high";
    networkProfile: string;
    networkInformation: {
      effectiveType: string | null;
      downlinkMbps: number | null;
      rttMs: number | null;
      saveData: boolean | null;
    };
    networkCondition: string;
    cacheState: "disabled" | "cold" | "warm" | "unknown";
    warmupMs: number;
    requestedSampleDurationMs: number;
    actualSampleDurationMs: number;
    frameTimingSource:
      | "consecutive-r3f-after-effect-observation-timestamps"
      | "r3f-clock-delta";
    movementRoute: string;
    visibility: VisibilityProtocol;
  };
  firstPlayable: FirstPlayableSnapshot | null;
  frames: FrameMetrics;
  renderer: RendererSampleSummary;
  resources: {
    geometries: number;
    textures: number;
    programs: number | null;
    gpuMemoryBytes: null;
    note: string;
  };
  scene: SceneSnapshot;
};

type StoreState = {
  context: RuntimeContext;
  status: SampleStatus;
  statusMessage: string;
  liveFrames: FrameMetrics;
  renderer: RendererSnapshot;
  scene: SceneSnapshot;
  firstPlayable: FirstPlayableSnapshot | null;
  latestExport: PerformanceSampleExport | null;
};

type ActiveSample = {
  token: number;
  context: RuntimeContext;
  options: Required<PerformanceSampleOptions>;
  frameDurations: number[];
  rendererSnapshots: RendererSnapshot[];
  visibilityStart: DocumentVisibilityState;
  visibilityChangeCount: number;
  hiddenStartedAt: number | null;
  hiddenDurationMs: number;
  sampleStartedAtMs: number | null;
  sampleDeadlineAtMs: number | null;
  lastFrameEndedAtMs: number | null;
  completedAtMs: number | null;
  resolve: (value: PerformanceSampleExport) => void;
  reject: (reason: Error) => void;
};

type NetworkInformationLike = {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
};

type NavigatorWithRuntimeInformation = Navigator & {
  deviceMemory?: number;
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
};

declare global {
  interface Window {
    __XINHUA_PERF__?: {
      schemaVersion: typeof PERFORMANCE_SCHEMA_VERSION;
      getState: () => StoreState;
      snapshot: () => PerformanceSampleExport;
      sample: (options?: PerformanceSampleOptions) => Promise<PerformanceSampleExport>;
      download: () => PerformanceSampleExport;
    };
  }
}

const EMPTY_RENDERER: RendererSnapshot = {
  drawCalls: 0,
  triangles: 0,
  points: 0,
  lines: 0,
  geometries: 0,
  textures: 0,
  programs: null,
};

function emptyTierSnapshot(): SceneTierSnapshot {
  return {
    entries: [],
    tierCounts: { massing: 0, identity: 0, hero: 0, unknown: 0 },
    assetIds: [],
    chunkIds: [],
  };
}

function emptySceneSnapshot(): SceneSnapshot {
  return {
    semantics: {
      loaded: "mounted-in-scene-graph",
      visible: "object-visible-chain-not-camera-frustum",
    },
    loaded: emptyTierSnapshot(),
    visible: emptyTierSnapshot(),
    activeAssetIds: [],
    loadedChunkIds: [],
    visibleChunkIds: [],
  };
}

const DEFAULT_CONTEXT: RuntimeContext = {
  mode: "intro",
  entry: "intro",
  renderDpr: 1,
  qualityTier: "high",
  networkProfile: "unknown",
};

let storeState: StoreState = {
  context: DEFAULT_CONTEXT,
  status: "idle",
  statusMessage: "等待采样",
  liveFrames: calculateFrameMetrics([]),
  renderer: EMPTY_RENDERER,
  scene: emptySceneSnapshot(),
  firstPlayable: null,
  latestExport: null,
};
const listeners = new Set<() => void>();
const liveFrameDurations: number[] = [];
const firstPlayableByEntry = new Map<string, FirstPlayableSnapshot>();
let activeSample: ActiveSample | null = null;
let sampleTimer: number | null = null;
let sampleSequence = 0;
let lastStoreEmitAt = 0;
let lastSceneScanAt = 0;

function emitStoreState(patch: Partial<StoreState>) {
  storeState = { ...storeState, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribeStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getStoreState() {
  return storeState;
}

function rendererSnapshot(gl: WebGLRenderer): RendererSnapshot {
  return {
    drawCalls: gl.info.render.calls,
    triangles: gl.info.render.triangles,
    points: gl.info.render.points,
    lines: gl.info.render.lines,
    geometries: gl.info.memory.geometries,
    textures: gl.info.memory.textures,
    programs: gl.info.programs?.length ?? null,
  };
}

function objectTierEntry(object: Object3D): SceneTierEntry | null {
  const data = object.userData as Record<string, unknown>;
  const performanceAssetId = typeof data.performanceAssetId === "string"
    && data.performanceAssetId.length
    ? data.performanceAssetId
    : null;
  const legacyAssetId = (
    data.assetId
    ?? data.asset
    ?? data.landmark
    ?? data.building
  );
  const assetId = performanceAssetId ?? (
    typeof legacyAssetId === "string" && legacyAssetId.length
      ? legacyAssetId
      : null
  );
  // 不使用 object.name 猜资产：stage/quality 等 userData 也会出现在普通容器和
  // GLB 子 mesh 上，猜测会把同一 chunk 的 high/mid/low 节点重复计入。
  if (!assetId) return null;
  const rawTier = (
    data.performanceTier
    ?? data.renderedTier
    ?? data.stage
    ?? data.quality
    ?? data.tier
  );
  const chunkId = typeof data.chunkId === "string"
    ? data.chunkId
    : typeof data.districtChunk === "string"
      ? data.districtChunk
      : null;
  const tier = chunkId && rawTier === undefined
    ? "massing"
    : normalizeRuntimePerformanceTier(rawTier);
  if (tier === "unknown" && !performanceAssetId && !chunkId) return null;
  return {
    assetId,
    tier,
    objectName: object.name,
    chunkId,
  };
}

function tierSnapshot(entries: readonly SceneTierEntry[]): SceneTierSnapshot {
  const tierRank: Record<RuntimePerformanceTier, number> = {
    unknown: 0,
    massing: 1,
    identity: 2,
    hero: 3,
  };
  const unique = new Map<string, SceneTierEntry>();
  entries.forEach((entry) => {
    const key = `${entry.assetId}:${entry.chunkId ?? ""}`;
    const current = unique.get(key);
    if (!current || tierRank[entry.tier] > tierRank[current.tier]) {
      unique.set(key, entry);
    }
  });
  const sortedEntries = [...unique.values()].sort((left, right) => (
    left.assetId.localeCompare(right.assetId)
    || left.tier.localeCompare(right.tier)
    || (left.chunkId ?? "").localeCompare(right.chunkId ?? "")
  ));
  const tierCounts: SceneTierSnapshot["tierCounts"] = {
    massing: 0,
    identity: 0,
    hero: 0,
    unknown: 0,
  };
  sortedEntries.forEach(({ tier }) => {
    tierCounts[tier] += 1;
  });
  return {
    entries: sortedEntries,
    tierCounts,
    assetIds: [...new Set(sortedEntries.map(({ assetId }) => assetId))].sort(),
    chunkIds: [...new Set(
      sortedEntries
        .map(({ chunkId }) => chunkId)
        .filter((chunkId): chunkId is string => Boolean(chunkId)),
    )].sort(),
  };
}

function collectSceneSnapshot(scene: Object3D): SceneSnapshot {
  const loadedEntries: SceneTierEntry[] = [];
  const visibleEntries: SceneTierEntry[] = [];
  scene.traverse((object) => {
    const entry = objectTierEntry(object);
    if (entry) loadedEntries.push(entry);
  });
  scene.traverseVisible((object) => {
    const entry = objectTierEntry(object);
    if (entry) visibleEntries.push(entry);
  });
  const loaded = tierSnapshot(loadedEntries);
  const visible = tierSnapshot(visibleEntries);
  return {
    semantics: {
      loaded: "mounted-in-scene-graph",
      visible: "object-visible-chain-not-camera-frustum",
    },
    loaded,
    visible,
    activeAssetIds: visible.assetIds,
    loadedChunkIds: loaded.chunkIds,
    visibleChunkIds: visible.chunkIds,
  };
}

function average(values: readonly number[]) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function summarizeRendererSamples(
  snapshots: readonly RendererSnapshot[],
  fallback: RendererSnapshot,
): RendererSampleSummary {
  const eligible = snapshots.length ? snapshots : [fallback];
  const last = eligible.at(-1) ?? fallback;
  return {
    last,
    average: {
      drawCalls: round(average(eligible.map(({ drawCalls }) => drawCalls))),
      triangles: round(average(eligible.map(({ triangles }) => triangles))),
      points: round(average(eligible.map(({ points }) => points))),
      lines: round(average(eligible.map(({ lines }) => lines))),
    },
    maximum: {
      drawCalls: Math.max(...eligible.map(({ drawCalls }) => drawCalls)),
      triangles: Math.max(...eligible.map(({ triangles }) => triangles)),
      points: Math.max(...eligible.map(({ points }) => points)),
      lines: Math.max(...eligible.map(({ lines }) => lines)),
    },
  };
}

function currentConnection() {
  const candidate = navigator as NavigatorWithRuntimeInformation;
  return candidate.connection ?? candidate.mozConnection ?? candidate.webkitConnection;
}

function currentVisibilityProtocol(
  sample?: ActiveSample,
): VisibilityProtocol {
  const now = performance.now();
  const hiddenDurationMs = sample
    ? sample.hiddenDurationMs + (
      sample.hiddenStartedAt === null ? 0 : now - sample.hiddenStartedAt
    )
    : 0;
  return {
    start: sample?.visibilityStart ?? document.visibilityState,
    end: document.visibilityState,
    visibleThroughout: (
      (sample?.visibilityStart ?? document.visibilityState) === "visible"
      && document.visibilityState === "visible"
      && (sample?.visibilityChangeCount ?? 0) === 0
    ),
    visibilityChangeCount: sample?.visibilityChangeCount ?? 0,
    hiddenDurationMs: round(hiddenDurationMs),
  };
}

function buildExport({
  sampleKind,
  context,
  options,
  frameDurations,
  rendererSnapshots,
  sample,
}: {
  sampleKind: PerformanceSampleExport["sampleKind"];
  context: RuntimeContext;
  options: Required<PerformanceSampleOptions>;
  frameDurations: readonly number[];
  rendererSnapshots: readonly RendererSnapshot[];
  sample?: ActiveSample;
}): PerformanceSampleExport {
  const connection = currentConnection();
  const runtimeNavigator = navigator as NavigatorWithRuntimeInformation;
  const frames = calculateFrameMetrics(
    frameDurations,
    DEFAULT_LONG_FRAME_THRESHOLD_MS,
  );
  const renderer = summarizeRendererSamples(
    rendererSnapshots,
    storeState.renderer,
  );
  return {
    schemaVersion: PERFORMANCE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sampleKind,
    label: options.label,
    page: {
      url: window.location.href,
      entry: context.entry,
      mode: context.mode,
      buildMode: process.env.NODE_ENV === "production"
        ? "production"
        : "development",
    },
    protocol: {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
        renderDpr: context.renderDpr,
      },
      device: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency || null,
        deviceMemoryGb: runtimeNavigator.deviceMemory ?? null,
        maxTouchPoints: navigator.maxTouchPoints ?? 0,
      },
      browserLanguage: navigator.language,
      qualityTier: context.qualityTier,
      networkProfile: context.networkProfile,
      networkInformation: {
        effectiveType: connection?.effectiveType ?? null,
        downlinkMbps: connection?.downlink ?? null,
        rttMs: connection?.rtt ?? null,
        saveData: connection?.saveData ?? null,
      },
      networkCondition: options.networkCondition,
      cacheState: options.cacheState,
      warmupMs: options.warmupMs,
      requestedSampleDurationMs: options.durationMs,
      actualSampleDurationMs: sample?.sampleStartedAtMs !== null
        && sample?.sampleStartedAtMs !== undefined
        ? round(
          (sample.completedAtMs ?? performance.now()) - sample.sampleStartedAtMs,
        )
        : frames.durationMs,
      frameTimingSource: sample
        ? "consecutive-r3f-after-effect-observation-timestamps"
        : "r3f-clock-delta",
      movementRoute: options.movementRoute,
      visibility: currentVisibilityProtocol(sample),
    },
    firstPlayable: firstPlayableByEntry.get(context.entry) ?? null,
    frames,
    renderer,
    resources: {
      geometries: renderer.last.geometries,
      textures: renderer.last.textures,
      programs: renderer.last.programs,
      gpuMemoryBytes: null,
      note: "renderer.info 只提供资源数量；浏览器 JavaScript 不提供精确 GPU memory 字节数。",
    },
    scene: storeState.scene,
  };
}

function defaultSampleOptions(
  options: PerformanceSampleOptions = {},
): Required<PerformanceSampleOptions> {
  return {
    warmupMs: options.warmupMs ?? DEFAULT_PERFORMANCE_WARMUP_MS,
    durationMs: options.durationMs ?? DEFAULT_PERFORMANCE_SAMPLE_MS,
    cacheState: options.cacheState ?? "unknown",
    movementRoute: options.movementRoute ?? "stationary",
    networkCondition: options.networkCondition ?? "browser-observed",
    label: options.label ?? `${storeState.context.entry}-baseline`,
  };
}

function clearSampleTimer() {
  if (sampleTimer !== null) {
    window.clearTimeout(sampleTimer);
    sampleTimer = null;
  }
}

function cancelActiveSample(message: string) {
  if (!activeSample) return;
  const current = activeSample;
  activeSample = null;
  clearSampleTimer();
  emitStoreState({
    status: "error",
    statusMessage: message,
  });
  current.reject(new Error(message));
}

function finishActiveSample(completedAtMs = performance.now()) {
  if (!activeSample) return;
  const current = activeSample;
  current.completedAtMs = completedAtMs;
  activeSample = null;
  clearSampleTimer();
  const result = buildExport({
    sampleKind: "fixed-duration",
    context: current.context,
    options: current.options,
    frameDurations: current.frameDurations,
    rendererSnapshots: current.rendererSnapshots,
    sample: current,
  });
  emitStoreState({
    status: "complete",
    statusMessage: `已完成 ${Math.round(current.options.durationMs / 1_000)} 秒采样`,
    latestExport: result,
    liveFrames: result.frames,
  });
  current.resolve(result);
}

function startPerformanceSample(
  options?: PerformanceSampleOptions,
): Promise<PerformanceSampleExport> {
  if (activeSample) {
    cancelActiveSample("新的采样已替换上一轮未完成采样");
  }
  const resolvedOptions = defaultSampleOptions(options);
  const context = { ...storeState.context };
  const token = ++sampleSequence;
  return new Promise((resolve, reject) => {
    activeSample = {
      token,
      context,
      options: resolvedOptions,
      frameDurations: [],
      rendererSnapshots: [],
      visibilityStart: document.visibilityState,
      visibilityChangeCount: 0,
      hiddenStartedAt: document.visibilityState === "hidden"
        ? performance.now()
        : null,
      hiddenDurationMs: 0,
      sampleStartedAtMs: null,
      sampleDeadlineAtMs: null,
      lastFrameEndedAtMs: null,
      completedAtMs: null,
      resolve,
      reject,
    };
    emitStoreState({
      status: resolvedOptions.warmupMs > 0 ? "warming" : "sampling",
      statusMessage: resolvedOptions.warmupMs > 0
        ? `预热 ${Math.round(resolvedOptions.warmupMs / 1_000)} 秒`
        : `采样 ${Math.round(resolvedOptions.durationMs / 1_000)} 秒`,
      latestExport: null,
    });

    const begin = () => {
      if (!activeSample || activeSample.token !== token) return;
      activeSample.frameDurations = [];
      activeSample.rendererSnapshots = [];
      activeSample.sampleStartedAtMs = performance.now();
      activeSample.sampleDeadlineAtMs = (
        activeSample.sampleStartedAtMs + resolvedOptions.durationMs
      );
      activeSample.lastFrameEndedAtMs = null;
      emitStoreState({
        status: "sampling",
        statusMessage: `采样 ${Math.round(resolvedOptions.durationMs / 1_000)} 秒`,
      });
      // 正常完成由跨过 deadline 的首个 afterEffect 帧触发，确保截止附近的
      // long frame 不会被 setTimeout 抢先漏掉；这里只保留失去帧流时的失败看门狗。
      sampleTimer = window.setTimeout(() => {
        if (!activeSample || activeSample.token !== token) return;
        cancelActiveSample("采样截止后未收到完整渲染帧，拒绝导出不完整样本");
      }, resolvedOptions.durationMs + Math.max(5_000, resolvedOptions.durationMs));
    };
    if (resolvedOptions.warmupMs > 0) {
      sampleTimer = window.setTimeout(begin, resolvedOptions.warmupMs);
    } else {
      begin();
    }
  });
}

function rollingSnapshot() {
  return buildExport({
    sampleKind: "rolling-snapshot",
    context: storeState.context,
    options: {
      ...defaultSampleOptions(),
      warmupMs: 0,
      durationMs: storeState.liveFrames.durationMs,
      label: `${storeState.context.entry}-rolling`,
    },
    frameDurations: liveFrameDurations,
    rendererSnapshots: [storeState.renderer],
  });
}

function downloadPerformanceJson() {
  const result = storeState.latestExport ?? rollingSnapshot();
  const blob = new Blob([`${JSON.stringify(result, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const timestamp = result.generatedAt.replace(/[:.]/g, "-");
  anchor.href = url;
  anchor.download = `test_wander_xinhua_perf_${result.page.entry}_${timestamp}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return result;
}

function updateRuntimeContext(context: RuntimeContext) {
  const previous = storeState.context;
  const entryChanged = (
    previous.mode !== context.mode
    || previous.entry !== context.entry
  );
  const measurementContextChanged = (
    entryChanged
    || previous.renderDpr !== context.renderDpr
    || previous.qualityTier !== context.qualityTier
    || previous.networkProfile !== context.networkProfile
  );
  if (
    activeSample
    && measurementContextChanged
  ) {
    cancelActiveSample("采样期间入口或性能协议发生变化，请在状态稳定后重新采样");
  }
  const firstPlayable = firstPlayableByEntry.get(context.entry) ?? null;
  if (measurementContextChanged) {
    liveFrameDurations.length = 0;
    lastStoreEmitAt = 0;
    lastSceneScanAt = 0;
    emitStoreState({
      context,
      status: "idle",
      statusMessage: "入口已切换，等待采样",
      liveFrames: calculateFrameMetrics([]),
      renderer: EMPTY_RENDERER,
      scene: emptySceneSnapshot(),
      firstPlayable,
      latestExport: null,
    });
    return;
  }
  if (
    storeState.firstPlayable === firstPlayable
  ) return;
  emitStoreState({ context, firstPlayable });
}

function recordEntryFirstPlayable(
  entry: string,
  mode: ExperienceMode,
) {
  if (firstPlayableByEntry.has(entry)) return;
  const atMs = performance.now();
  const markName = `xinhua-perf-${entry}-first-playable`;
  performance.mark(markName);
  const resources = performance.getEntriesByType("resource")
    .filter((item): item is PerformanceResourceTiming => (
      item.entryType === "resource"
    ))
    .map((item): PerformanceResourceLike => ({
      name: item.name,
      initiatorType: item.initiatorType,
      startTime: item.startTime,
      responseEnd: item.responseEnd,
      duration: item.duration,
      transferSize: item.transferSize,
      encodedBodySize: item.encodedBodySize,
      decodedBodySize: item.decodedBodySize,
      nextHopProtocol: item.nextHopProtocol,
    }));
  const snapshot: FirstPlayableSnapshot = {
    entry,
    mode,
    atMs: round(atMs),
    markName,
    requests: summarizeFirstPlayableRequests(resources, atMs),
  };
  firstPlayableByEntry.set(entry, snapshot);
  if (storeState.context.entry === entry) {
    emitStoreState({ firstPlayable: snapshot });
  }
}

function onDocumentVisibilityChange() {
  if (!activeSample) return;
  const now = performance.now();
  activeSample.visibilityChangeCount += 1;
  if (document.visibilityState === "hidden" && activeSample.hiddenStartedAt === null) {
    activeSample.hiddenStartedAt = now;
    activeSample.lastFrameEndedAtMs = null;
  }
  if (document.visibilityState === "visible" && activeSample.hiddenStartedAt !== null) {
    activeSample.hiddenDurationMs += now - activeSample.hiddenStartedAt;
    activeSample.hiddenStartedAt = null;
  }
}

function recordRuntimeFrame({
  deltaMs,
  frameEndedAtMs,
  renderer,
  scene,
}: {
  deltaMs: number;
  frameEndedAtMs: number;
  renderer: RendererSnapshot;
  scene: Object3D;
}) {
  const visible = document.visibilityState === "visible";
  if (visible && Number.isFinite(deltaMs) && deltaMs > 0) {
    liveFrameDurations.push(deltaMs);
    if (liveFrameDurations.length > 240) liveFrameDurations.shift();
  }
  if (activeSample && storeState.status === "sampling" && visible) {
    const current = activeSample;
    if (current.lastFrameEndedAtMs !== null) {
      const measuredDurationMs = frameEndedAtMs - current.lastFrameEndedAtMs;
      if (Number.isFinite(measuredDurationMs) && measuredDurationMs > 0) {
        current.frameDurations.push(measuredDurationMs);
        current.rendererSnapshots.push(renderer);
      }
    }
    current.lastFrameEndedAtMs = frameEndedAtMs;
    if (
      current.sampleDeadlineAtMs !== null
      && frameEndedAtMs >= current.sampleDeadlineAtMs
    ) {
      const finalSceneSnapshot = collectSceneSnapshot(scene);
      lastSceneScanAt = frameEndedAtMs;
      emitStoreState({
        renderer,
        scene: finalSceneSnapshot,
      });
      finishActiveSample(frameEndedAtMs);
    }
  }

  const now = frameEndedAtMs;
  const shouldScanScene = now - lastSceneScanAt >= 500;
  const sceneSnapshot = shouldScanScene
    ? collectSceneSnapshot(scene)
    : storeState.scene;
  if (shouldScanScene) lastSceneScanAt = now;
  if (now - lastStoreEmitAt < 250) return;
  lastStoreEmitAt = now;
  emitStoreState({
    renderer,
    scene: sceneSnapshot,
    liveFrames: calculateFrameMetrics(liveFrameDurations),
  });
}

export function PerformanceDiagnosticsCanvasProbe({
  enabled,
  mode,
  entry,
  ready,
}: {
  enabled: boolean;
  mode: ExperienceMode;
  entry: string;
  ready: boolean;
}) {
  const { gl, scene } = useThree();
  const scheduledEntry = useRef<string | null>(null);
  const scheduledFrame = useRef<number | null>(null);
  const latestDeltaMs = useRef(0);

  useFrame((_, delta) => {
    if (!enabled) return;
    latestDeltaMs.current = delta * 1_000;
    if (!ready || firstPlayableByEntry.has(entry) || scheduledEntry.current === entry) {
      return;
    }
    scheduledEntry.current = entry;
    scheduledFrame.current = window.requestAnimationFrame(() => {
      recordEntryFirstPlayable(entry, mode);
      scheduledFrame.current = null;
    });
  });

  /* eslint-disable react-hooks/immutability -- renderer.info 是 Three.js 暴露的帧统计器；
   * perf=1 生命周期内必须切换 autoReset，才能累计 R3F 与 postprocessing 的完整帧。 */
  useEffect(() => {
    if (!enabled) return;
    const previousAutoReset = gl.info.autoReset;
    gl.info.autoReset = false;
    gl.info.reset();
    const removeAfterEffect = addAfterEffect(() => {
      recordRuntimeFrame({
        deltaMs: latestDeltaMs.current,
        // addAfterEffect 的回调参数是该帧 rAF 起始时间；这里在完整
        // R3F + postprocessing 帧结束后重新取时，避免首个锚点落在采样开始前。
        frameEndedAtMs: performance.now(),
        renderer: rendererSnapshot(gl),
        scene,
      });
      // perf=1 下按完整 R3F + postprocessing 帧聚合后手动清零，
      // 避免只读到最后一个 composer pass。
      gl.info.reset();
    });
    return () => {
      removeAfterEffect();
      gl.info.autoReset = previousAutoReset;
      gl.info.reset();
      if (scheduledFrame.current !== null) {
        window.cancelAnimationFrame(scheduledFrame.current);
      }
    };
  }, [enabled, gl, scene]);
  /* eslint-enable react-hooks/immutability */

  return null;
}

function metric(value: number | null, suffix = "") {
  return value === null ? "—" : `${value}${suffix}`;
}

function tierSummary(snapshot: SceneTierSnapshot) {
  const { massing, identity, hero, unknown } = snapshot.tierCounts;
  return `M ${massing} / I ${identity} / H ${hero} / U ${unknown}`;
}

export function PerformanceDiagnosticsPanel({
  enabled,
  mode,
  entry,
  renderDpr,
  qualityTier,
  networkProfile,
}: {
  enabled: boolean;
  mode: ExperienceMode;
  entry: string;
  renderDpr: number;
  qualityTier: "low" | "high";
  networkProfile: string;
}) {
  const state = useSyncExternalStore(
    subscribeStore,
    getStoreState,
    getStoreState,
  );

  useEffect(() => {
    if (!enabled) return;
    updateRuntimeContext({
      mode,
      entry,
      renderDpr,
      qualityTier,
      networkProfile,
    });
  }, [enabled, entry, mode, networkProfile, qualityTier, renderDpr]);

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener("visibilitychange", onDocumentVisibilityChange);
    window.__XINHUA_PERF__ = {
      schemaVersion: PERFORMANCE_SCHEMA_VERSION,
      getState: getStoreState,
      snapshot: rollingSnapshot,
      sample: startPerformanceSample,
      download: downloadPerformanceJson,
    };
    return () => {
      document.removeEventListener("visibilitychange", onDocumentVisibilityChange);
      if (window.__XINHUA_PERF__?.getState === getStoreState) {
        delete window.__XINHUA_PERF__;
      }
      cancelActiveSample("性能诊断面板已卸载");
    };
  }, [enabled]);

  const startSample = useCallback(() => {
    void startPerformanceSample().catch(() => undefined);
  }, []);

  if (!enabled) return null;
  const completedExport = state.status === "complete"
    ? state.latestExport
    : null;
  const frameMetrics = completedExport?.frames ?? state.liveFrames;
  const displayRenderer = completedExport?.renderer.last ?? state.renderer;
  const displayScene = completedExport?.scene ?? state.scene;
  const displayFirstPlayable = (
    completedExport?.firstPlayable ?? state.firstPlayable
  );
  const requests = displayFirstPlayable?.requests;
  return (
    <aside
      className={styles.panel}
      aria-label="性能诊断"
      data-performance-diagnostics="true"
      data-performance-status={state.status}
      data-performance-entry={entry}
    >
      <div className={styles.header}>
        <div>
          <span>PERF · {PERFORMANCE_SCHEMA_VERSION.split(".").at(-1)}</span>
          <strong>{entry} / {mode}</strong>
        </div>
        <span className={styles.status}>{state.statusMessage}</span>
      </div>

      <dl className={styles.grid}>
        <div><dt>FPS</dt><dd>{metric(frameMetrics.fps)}</dd></div>
        <div><dt>Frame avg</dt><dd>{metric(frameMetrics.averageMs, " ms")}</dd></div>
        <div><dt>Frame P95</dt><dd>{metric(frameMetrics.p95Ms, " ms")}</dd></div>
        <div>
          <dt>Long frames</dt>
          <dd>{frameMetrics.longFrameCount} / {frameMetrics.frameCount}</dd>
        </div>
        <div><dt>Draw calls</dt><dd>{displayRenderer.drawCalls}</dd></div>
        <div><dt>Triangles</dt><dd>{displayRenderer.triangles.toLocaleString()}</dd></div>
        <div><dt>Points / lines</dt><dd>{displayRenderer.points} / {displayRenderer.lines}</dd></div>
        <div>
          <dt>资源数（非 GPU MB）</dt>
          <dd>
            {displayRenderer.geometries} geo / {displayRenderer.textures} tex /{" "}
            {displayRenderer.programs ?? "—"} prog
          </dd>
        </div>
        <div><dt>Mode / DPR</dt><dd>{mode} / {renderDpr}</dd></div>
        <div><dt>Quality / network</dt><dd>{qualityTier} / {networkProfile}</dd></div>
        <div><dt>Loaded tier</dt><dd>{tierSummary(displayScene.loaded)}</dd></div>
        <div><dt>Visible tier</dt><dd>{tierSummary(displayScene.visible)}</dd></div>
        <div>
          <dt>Chunks loaded / visible</dt>
          <dd>{displayScene.loadedChunkIds.length} / {displayScene.visibleChunkIds.length}</dd>
        </div>
        <div>
          <dt>Active assets</dt>
          <dd title={displayScene.activeAssetIds.join(", ")}>
            {displayScene.activeAssetIds.length}
          </dd>
        </div>
        <div>
          <dt>First playable</dt>
          <dd>
            {displayFirstPlayable
              ? `${displayFirstPlayable.atMs} ms`
              : "等待入口首帧"}
          </dd>
        </div>
        <div>
          <dt>Requests @ playable</dt>
          <dd>
            {requests
              ? `${requests.byKind.js.requestCount} JS / ${requests.byKind.glb.requestCount} GLB / ${requests.byKind.image.requestCount} IMG`
              : "—"}
          </dd>
        </div>
      </dl>

      <p className={styles.note}>
        Long frame &gt; {DEFAULT_LONG_FRAME_THRESHOLD_MS} ms · 默认预热 5 秒 / 采样 10 秒
        {" · "}Visible 指 Object3D.visible 链路，非相机视锥
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          onClick={startSample}
          disabled={state.status === "warming" || state.status === "sampling"}
        >
          {state.status === "warming" || state.status === "sampling"
            ? state.statusMessage
            : "开始同协议采样"}
        </button>
        <button type="button" onClick={downloadPerformanceJson}>
          导出 JSON
        </button>
      </div>
    </aside>
  );
}
