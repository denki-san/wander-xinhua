"use client";

/* eslint-disable @next/next/no-img-element -- POI 实景图由动态数据提供，并需要保留对应的外部图源链接。 */

import { Canvas, useFrame } from "@react-three/fiber";
import { NoToneMapping, SRGBColorSpace } from "three";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  isTouchJumpRegionActive,
  isTouchTapGesture,
  resetInput,
  setMoveVector,
  TOUCH_TAP_MAX_TRAVEL,
  triggerJumpPulse,
} from "./scene/input";
import { ProgressiveFeatureBoundary } from "./progressive-feature-boundary";
import { XinhuaIntroSurface } from "./xinhua-intro-surface";
import {
  AutumnStorybookSky,
} from "./scene/visual-effects";
import {
  DEFAULT_XINHUA_ATMOSPHERE_STYLE,
  resolveXinhuaAtmosphereStyle,
  XINHUA_ATMOSPHERES,
  type XinhuaAtmosphereStyle,
} from "./scene/atmosphere-contract";
import { useProgressiveNetworkProfile } from "./scene/progressive-loading";
import { MAP_POIS, mapPoiById } from "./scene/poi-data";
import { XinhuaWorld } from "./scene/xinhua-world";
import mapData from "./scene/xinhua-map-data.json";
import { cameraQaState } from "./scene/camera-qa";
import {
  RainIdentityPreloader,
  RainIdentityPreloadFallback,
  type RainIdentityPreloadStatus,
} from "./scene/rain-character-preloader";

const ProgressiveVisualEffectComposer = lazy(
  () => import("./scene/visual-effect-composer"),
);
const PerformanceDiagnosticsCanvasProbe = lazy(
  () => import("./performance/performance-diagnostics").then((module) => ({
    default: module.PerformanceDiagnosticsCanvasProbe,
  })),
);
const PerformanceDiagnosticsPanel = lazy(
  () => import("./performance/performance-diagnostics").then((module) => ({
    default: module.PerformanceDiagnosticsPanel,
  })),
);

const TOUCH_STICK_TRAVEL = 42;
type TouchTapCandidate = {
  startedAtMs: number;
  startX: number;
  startY: number;
  maxTravel: number;
  startedInStickZone: boolean;
  startedWhileMoving: boolean;
};
const POI_PHOTO_NEARBY_PREFETCH_COUNT = 2;
const POI_PHOTO_NEARBY_PREFETCH_INTERVAL_MS = 320;
const POI_PHOTO_BACKGROUND_PREFETCH_DELAY_MS = 1_200;
const POI_PHOTO_BACKGROUND_PREFETCH_INTERVAL_MS = 480;
const INITIAL_OVERVIEW_POSITION = [
  mapData.landmarks.xingfuli.position[0],
  mapData.landmarks.xingfuli.position[1],
] as const;
const OVERVIEW_QA_START_POSITIONS = {
  "xingfu-road": [139.4, -98.5],
  "fahuazhen-road": [-131, -36],
  "quiet-southwest": [-250, 130],
} as const;

function requestedOverviewStartPosition(): readonly [number, number] {
  if (typeof window === "undefined") return INITIAL_OVERVIEW_POSITION;
  const params = new URLSearchParams(window.location.search);
  if (params.get("overview-qa") !== "1") return INITIAL_OVERVIEW_POSITION;
  const requested = params.get("overview-start");
  return requested && requested in OVERVIEW_QA_START_POSITIONS
    ? OVERVIEW_QA_START_POSITIONS[
      requested as keyof typeof OVERVIEW_QA_START_POSITIONS
    ]
    : INITIAL_OVERVIEW_POSITION;
}

const ATMOSPHERE_STYLES = ["noon", "golden-hour"] as const;

function requestedAtmosphereStyle(): XinhuaAtmosphereStyle {
  if (typeof window === "undefined") return DEFAULT_XINHUA_ATMOSPHERE_STYLE;
  return resolveXinhuaAtmosphereStyle(
    new URLSearchParams(window.location.search).get("light"),
  );
}

function FirstPlayableFrame({ onReady }: { onReady: () => void }) {
  const signaled = useRef(false);
  const nextFrame = useRef<number | null>(null);

  useFrame(() => {
    if (signaled.current) return;
    signaled.current = true;
    // useFrame 返回后 R3F 才提交当前世界；下一帧再解除遮罩并打点，
    // 保证 Massing 已至少绘制过一次。
    nextFrame.current = window.requestAnimationFrame(onReady);
  });

  useEffect(() => () => {
    if (nextFrame.current !== null) window.cancelAnimationFrame(nextFrame.current);
  }, []);

  return null;
}

function detectLowTier() {
  if (typeof window === "undefined") return false;
  const requested = new URLSearchParams(window.location.search).get("quality");
  if (requested === "low") return true;
  if (requested === "high") return false;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const concurrency = navigator.hardwareConcurrency;
  // 触屏和窄屏只说明交互形态，不代表 GPU 性能。仅在两项硬件信号都明确很低时自动降档；
  // Safari 缺少 deviceMemory 时默认保留标准画质。
  return (
    typeof deviceMemory === "number"
    && deviceMemory <= 2
    && typeof concurrency === "number"
    && concurrency <= 2
  );
}

function detectRenderDpr(lowTier: boolean) {
  if (lowTier) return 1.25;
  if (typeof window === "undefined") return 1;
  return Math.min(Math.max(window.devicePixelRatio || 1, 1), 1.75);
}

function TouchControls({ showPace }: { showPace: boolean }) {
  const zone = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });
  const currentMove = useRef({ x: 0, y: 0 });
  const runEnabled = useRef(true);
  const gestureStartedAtMs = useRef(0);
  const gestureMaxTravel = useRef(0);
  const moveActivated = useRef(false);
  const secondaryTapCandidates = useRef(new Map<number, TouchTapCandidate>());
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [pace, setPace] = useState<"walk" | "run">("run");

  useEffect(() => {
    const element = zone.current;
    if (!element) return;
    const secondaryTapCandidateMap = secondaryTapCandidates.current;

    const clearMove = () => {
      pointerId.current = null;
      currentMove.current = { x: 0, y: 0 };
      gestureStartedAtMs.current = 0;
      gestureMaxTravel.current = 0;
      moveActivated.current = false;
      setKnob({ x: 0, y: 0 });
      setOrigin(null);
      setMoveVector(0, 0, runEnabled.current);
    };
    const clearAllTouches = () => {
      clearMove();
      secondaryTapCandidateMap.clear();
    };
    const beginMove = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      if (!(event.target instanceof HTMLCanvasElement)) return;
      const bounds = element.getBoundingClientRect();
      const insideStickZone = (
        event.clientX >= bounds.left
        && event.clientX <= bounds.right
        && event.clientY >= bounds.top
        && event.clientY <= bounds.bottom
      );
      if (pointerId.current !== null) {
        secondaryTapCandidateMap.set(event.pointerId, {
          startedAtMs: performance.now(),
          startX: event.clientX,
          startY: event.clientY,
          maxTravel: 0,
          startedInStickZone: insideStickZone,
          startedWhileMoving: moveActivated.current,
        });
        // 第二根手指不拦截 Canvas：拖动继续交给镜头，短按则在松手时判定跳跃。
        return;
      }
      if (!insideStickZone) return;

      // 静止时下三分之一用同一手势区分轻点跳跃与拖动移动。
      event.preventDefault();
      event.stopPropagation();
      pointerId.current = event.pointerId;
      center.current = { x: event.clientX, y: event.clientY };
      gestureStartedAtMs.current = performance.now();
      gestureMaxTravel.current = 0;
      moveActivated.current = false;
      setKnob({ x: 0, y: 0 });
      setOrigin(null);
      currentMove.current = { x: 0, y: 0 };
      setMoveVector(0, 0, runEnabled.current);
      event.target.setPointerCapture(event.pointerId);
    };
    const updateMove = (event: PointerEvent) => {
      const secondaryTap = secondaryTapCandidateMap.get(event.pointerId);
      if (secondaryTap) {
        secondaryTap.maxTravel = Math.max(
          secondaryTap.maxTravel,
          Math.hypot(
            event.clientX - secondaryTap.startX,
            event.clientY - secondaryTap.startY,
          ),
        );
        return;
      }
      if (pointerId.current !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      let x = event.clientX - center.current.x;
      let y = event.clientY - center.current.y;
      const length = Math.hypot(x, y);
      gestureMaxTravel.current = Math.max(gestureMaxTravel.current, length);
      if (!moveActivated.current && length <= TOUCH_TAP_MAX_TRAVEL) return;
      if (!moveActivated.current) {
        moveActivated.current = true;
        const bounds = element.getBoundingClientRect();
        setOrigin({
          x: center.current.x - bounds.left,
          y: center.current.y - bounds.top,
        });
      }
      if (length > TOUCH_STICK_TRAVEL) {
        x = x / length * TOUCH_STICK_TRAVEL;
        y = y / length * TOUCH_STICK_TRAVEL;
      }
      setKnob({ x, y });
      currentMove.current = {
        x: x / TOUCH_STICK_TRAVEL,
        y: y / TOUCH_STICK_TRAVEL,
      };
      setMoveVector(
        currentMove.current.x,
        currentMove.current.y,
        runEnabled.current,
      );
    };
    const endMove = (event: PointerEvent, allowTap: boolean) => {
      const secondaryTap = secondaryTapCandidateMap.get(event.pointerId);
      if (secondaryTap) {
        if (
          allowTap
          && isTouchJumpRegionActive(
            secondaryTap.startedInStickZone,
            secondaryTap.startedWhileMoving,
            moveActivated.current,
          )
          && isTouchTapGesture(
            event.pointerType,
            secondaryTap.maxTravel,
            performance.now() - secondaryTap.startedAtMs,
          )
        ) {
          triggerJumpPulse();
        }
        secondaryTapCandidateMap.delete(event.pointerId);
        return;
      }
      if (pointerId.current !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      if (
        allowTap
        && !moveActivated.current
        && isTouchTapGesture(
          event.pointerType,
          gestureMaxTravel.current,
          performance.now() - gestureStartedAtMs.current,
        )
      ) {
        triggerJumpPulse();
      }
      clearMove();
    };
    const pointerUp = (event: PointerEvent) => endMove(event, true);
    const pointerCancel = (event: PointerEvent) => endMove(event, false);

    window.addEventListener("pointerdown", beginMove, { capture: true, passive: false });
    window.addEventListener("pointermove", updateMove, { capture: true, passive: false });
    window.addEventListener("pointerup", pointerUp, { capture: true, passive: false });
    window.addEventListener("pointercancel", pointerCancel, { capture: true, passive: false });
    window.addEventListener("blur", clearAllTouches);
    return () => {
      window.removeEventListener("pointerdown", beginMove, true);
      window.removeEventListener("pointermove", updateMove, true);
      window.removeEventListener("pointerup", pointerUp, true);
      window.removeEventListener("pointercancel", pointerCancel, true);
      window.removeEventListener("blur", clearAllTouches);
      secondaryTapCandidateMap.clear();
      resetInput();
    };
  }, []);

  const selectPace = (nextPace: "walk" | "run") => {
    const nextRunEnabled = nextPace === "run";
    runEnabled.current = nextRunEnabled;
    setPace(nextPace);
    // 双指操作时允许在摇杆仍推着的情况下即时切换速度上限。
    setMoveVector(
      currentMove.current.x,
      currentMove.current.y,
      nextRunEnabled,
    );
  };

  return (
    <div className="touch-controls">
      <div ref={zone} className="touch-stick-zone" aria-hidden="true">
        <div
          className={`touch-stick${origin ? " is-active" : ""}`}
          style={origin ? { left: origin.x, top: origin.y } : undefined}
          aria-hidden="true"
        >
          <span style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
        </div>
      </div>
      {showPace && (
        <div className="touch-pace-toggle" role="group" aria-label="移动速度模式">
          <button
            type="button"
            className={pace === "walk" ? "is-active" : ""}
            aria-pressed={pace === "walk"}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              selectPace("walk");
            }}
            onClick={() => selectPace("walk")}
          >
            走路
          </button>
          <button
            type="button"
            className={pace === "run" ? "is-active" : ""}
            aria-pressed={pace === "run"}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              selectPace("run");
            }}
            onClick={() => selectPace("run")}
          >
            跑步
          </button>
        </div>
      )}
    </div>
  );
}

function CameraQaPanel({ visible }: { visible: boolean }) {
  const output = useRef<HTMLOutputElement>(null);

  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    let lastPaint = 0;
    const paint = (time: number) => {
      const element = output.current;
      if (element && time - lastPaint >= 100) {
        lastPaint = time;
        const state = cameraQaState;
        element.dataset.cameraMode = state.cameraMode;
        element.dataset.blockerId = state.blockerId ?? "none";
        element.dataset.modeChanges = String(state.modeChangeCount);
        element.dataset.desiredArm = state.desiredArmLength.toFixed(3);
        element.dataset.resolvedArm = state.resolvedArmLength.toFixed(3);
        element.dataset.narrowSpaceLift = state.narrowSpaceLift.toFixed(3);
        element.dataset.fov = state.fov.toFixed(1);
        element.dataset.manualGraceMs = state.manualGraceMs.toFixed(0);
        element.dataset.goalYaw = state.goalYawDegrees.toFixed(2);
        element.dataset.desiredArmYaw = state.desiredArmYawDegrees.toFixed(2);
        element.dataset.actualArmYaw = state.actualArmYawDegrees.toFixed(2);
        element.textContent = [
          `mode ${state.cameraMode}`,
          `blocker ${state.blockerId ?? "none"}`,
          `arm ${state.resolvedArmLength.toFixed(2)} / ${state.desiredArmLength.toFixed(2)}`,
          `narrow lift ${state.narrowSpaceLift.toFixed(2)}`,
          `arm yaw ${state.actualArmYawDegrees.toFixed(1)}° / ${state.desiredArmYawDegrees.toFixed(1)}°`,
          `goal yaw ${state.goalYawDegrees.toFixed(1)}°`,
          `input ${state.inputX.toFixed(2)}, ${state.inputY.toFixed(2)}`,
          `FOV ${state.fov.toFixed(1)}° · grace ${state.manualGraceMs.toFixed(0)}ms`,
          `changes ${state.modeChangeCount} · ${state.modeHistory.join(" → ")}`,
        ].join("\n");
      }
      frame = window.requestAnimationFrame(paint);
    };
    frame = window.requestAnimationFrame(paint);
    return () => window.cancelAnimationFrame(frame);
  }, [visible]);

  if (!visible) return null;
  return (
    <output
      ref={output}
      className="camera-qa-panel"
      data-testid="camera-qa"
      aria-label="相机控制验收遥测"
    />
  );
}

function LightingSwitcher({
  atmosphereStyle,
  className = "",
  onChange,
}: {
  atmosphereStyle: XinhuaAtmosphereStyle;
  className?: string;
  onChange: (style: XinhuaAtmosphereStyle) => void;
}) {
  return (
    <div
      className={`lighting-switcher ${className}`.trim()}
      role="group"
      aria-label="切换光线"
    >
      {ATMOSPHERE_STYLES.map((style) => {
        const atmosphere = XINHUA_ATMOSPHERES[style];
        return (
          <button
            key={style}
            type="button"
            className={atmosphereStyle === style ? "is-active" : ""}
            aria-pressed={atmosphereStyle === style}
            onClick={() => onChange(style)}
          >
            <span aria-hidden="true">{atmosphere.icon}</span>
            <strong>{atmosphere.label}</strong>
          </button>
        );
      })}
    </div>
  );
}

export function XinhuaExperience() {
  const [mode, setMode] = useState<"intro" | "overview" | "explore">("intro");
  const [performanceDiagnosticsEnabled] = useState(() => (
    typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("perf") === "1"
  ));
  const [effectsDisabledForQa] = useState(() => (
    typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("effects") === "off"
  ));
  const [rendererReady, setRendererReady] = useState(false);
  const [characterIdentityStatus, setCharacterIdentityStatus] =
    useState<RainIdentityPreloadStatus | null>(null);
  const [characterHeroVisible, setCharacterHeroVisible] = useState(false);
  const [nearPoiId, setNearPoiId] = useState<string | null>(null);
  const [destinationPreset, setDestinationPreset] = useState<string>();
  const [helpOpen, setHelpOpen] = useState(false);
  const [atmosphereStyle, setAtmosphereStyle] = useState<XinhuaAtmosphereStyle>(
    requestedAtmosphereStyle,
  );
  const [fullscreen, setFullscreen] = useState(false);
  // 在 Canvas 首次创建前确定渲染档位，避免低配置设备先分配一套高配后处理资源。
  const [lowTier] = useState(detectLowTier);
  // 固定本次会话的 drawing buffer 比例，避免浏览器 DPR 短暂变化时重建成低分辨率画布。
  const [renderDpr] = useState(() => detectRenderDpr(lowTier));
  const [touchCapable, setTouchCapable] = useState(false);
  const [cameraQaVisible] = useState(() => (
    typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("cameraQa") === "1"
  ));
  const [qaAutoStart] = useState(() => (
    typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("qaAutoStart") === "1"
  ));
  const qaAutoStarted = useRef(false);
  const networkProfile = useProgressiveNetworkProfile();
  const [initialOverviewPosition] = useState(requestedOverviewStartPosition);
  const playerPosition = useRef<readonly [number, number]>(initialOverviewPosition);
  useEffect(() => {
    if (!cameraQaVisible) {
      delete document.documentElement.dataset.xinhuaPlayerPosition;
      return;
    }
    return () => {
      delete document.documentElement.dataset.xinhuaPlayerPosition;
    };
  }, [cameraQaVisible]);
  const overviewPhotoCache = useRef(new Map<string, HTMLImageElement>());
  const [loadedOverviewPhoto, setLoadedOverviewPhoto] = useState<string | null>(null);
  const [overviewStartPosition, setOverviewStartPosition] = useState<readonly [number, number]>(
    initialOverviewPosition,
  );
  const playing = mode !== "intro";
  const exploring = mode === "explore";
  const overview = mode === "overview";
  const nearPoi = mapPoiById(nearPoiId);
  const ready = rendererReady && characterIdentityStatus !== null;
  const performanceEntry = mode === "explore"
    ? destinationPreset ?? "explore"
    : mode;
  const settleCharacterIdentity = useCallback((status: RainIdentityPreloadStatus) => {
    setCharacterIdentityStatus((current) => current ?? status);
  }, []);

  useEffect(() => {
    const markHeroVisible = () => setCharacterHeroVisible(true);
    window.addEventListener("xinhua:character-hero-visible", markHeroVisible);
    return () => window.removeEventListener("xinhua:character-hero-visible", markHeroVisible);
  }, []);

  useEffect(() => {
    const coarse = window.matchMedia("(any-pointer: coarse)").matches;
    const touchQa = new URLSearchParams(window.location.search).get("touchQa") === "1";
    const touch = touchQa || coarse || (navigator.maxTouchPoints ?? 0) > 0;
    const frame = window.requestAnimationFrame(() => {
      setTouchCapable(touch);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const prefetchOverviewPhoto = useCallback((src: string, priority: "high" | "low") => {
    const cached = overviewPhotoCache.current.get(src);
    if (cached) {
      if (priority === "high") cached.fetchPriority = "high";
      return cached;
    }
    const preview = new Image();
    preview.fetchPriority = priority;
    preview.decoding = "async";
    overviewPhotoCache.current.set(src, preview);
    preview.addEventListener("error", () => {
      if (overviewPhotoCache.current.get(src) === preview) {
        overviewPhotoCache.current.delete(src);
      }
    }, { once: true });
    preview.src = src;
    void preview.decode().catch(() => undefined);
    return preview;
  }, []);

  useEffect(() => {
    if (!overview) return;
    // 弱网不做批量图片预取；靠近 POI 时由下一个 effect 只请求实际需要的一张。
    if (networkProfile === "weak") return;
    const [playerX, playerZ] = playerPosition.current;
    const photosByDistance = [...MAP_POIS].sort((left, right) => (
      Math.hypot(left.position[0] - playerX, left.position[1] - playerZ)
      - Math.hypot(right.position[0] - playerX, right.position[1] - playerZ)
    ));
    const eligiblePhotos = characterHeroVisible
      ? photosByDistance
      : photosByDistance.slice(0, POI_PHOTO_NEARBY_PREFETCH_COUNT);
    const timers = eligiblePhotos.map((poi, index) => window.setTimeout(() => {
      prefetchOverviewPhoto(poi.photo.src, index < 2 ? "high" : "low");
    }, index < POI_PHOTO_NEARBY_PREFETCH_COUNT
      ? index * POI_PHOTO_NEARBY_PREFETCH_INTERVAL_MS
      : POI_PHOTO_BACKGROUND_PREFETCH_DELAY_MS
        + (index - POI_PHOTO_NEARBY_PREFETCH_COUNT) * POI_PHOTO_BACKGROUND_PREFETCH_INTERVAL_MS));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [
    characterHeroVisible,
    networkProfile,
    overview,
    prefetchOverviewPhoto,
  ]);

  useEffect(() => {
    const src = overview ? nearPoi?.photo.src : undefined;
    if (!src) return;

    let active = true;
    const preview = prefetchOverviewPhoto(src, "high");
    const reveal = () => {
      if (active && preview.naturalWidth > 0) setLoadedOverviewPhoto(src);
    };
    const decodeAndReveal = () => {
      void preview.decode().catch(() => undefined).finally(reveal);
    };
    if (preview.complete) decodeAndReveal();
    else preview.addEventListener("load", decodeAndReveal, { once: true });

    return () => {
      active = false;
      preview.removeEventListener("load", decodeAndReveal);
    };
  }, [nearPoi?.photo.src, overview, prefetchOverviewPhoto]);

  useEffect(() => () => {
    overviewPhotoCache.current.clear();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.xinhuaNetworkProfile = networkProfile;
  }, [networkProfile]);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.xinhuaPlayable = "true";
    performance.mark("xinhua-world-playable");
    return () => {
      delete document.documentElement.dataset.xinhuaPlayable;
      performance.clearMarks("xinhua-world-playable");
    };
  }, [ready]);

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const begin = useCallback(() => {
    resetInput();
    setNearPoiId(null);
    const requestedPreset = new URLSearchParams(window.location.search).get("start") ?? undefined;
    setDestinationPreset(requestedPreset);
    setMode(requestedPreset ? "explore" : "overview");
  }, []);

  useEffect(() => {
    if (!qaAutoStart || !ready || mode !== "intro" || qaAutoStarted.current) return;
    qaAutoStarted.current = true;
    begin();
  }, [begin, mode, qaAutoStart, ready]);

  const showOverview = useCallback(() => {
    resetInput();
    setNearPoiId(null);
    setOverviewStartPosition(playerPosition.current);
    setDestinationPreset(undefined);
    setMode("overview");
  }, []);

  const enterPoi = useCallback(() => {
    if (!nearPoi) return;
    resetInput();
    setDestinationPreset(nearPoi.startPreset);
    setNearPoiId(null);
    setMode("explore");
  }, [nearPoi]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen?.();
    }
  }, []);

  const selectAtmosphereStyle = useCallback((style: XinhuaAtmosphereStyle) => {
    setAtmosphereStyle(style);
    const url = new URL(window.location.href);
    url.searchParams.set("light", style);
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, []);

  return (
    <main
      className={`xinhua-stage is-${mode}${playing ? " is-playing" : ""}${touchCapable ? " is-touch" : ""}`}
      data-progressive-network={networkProfile}
      data-progressive-stage={ready ? "playable" : "booting"}
      data-lighting-state={atmosphereStyle}
      data-qa-auto-start={qaAutoStart ? (mode === "intro" ? "pending" : "complete") : undefined}
    >
      <Canvas
        shadows="percentage"
        dpr={renderDpr}
        camera={{
          fov: 50,
          near: 0.1,
          far: 800 * mapData.meta.environmentScale,
          position: [35, 34, 42],
        }}
        gl={{
          antialias: true,
          toneMapping: NoToneMapping,
          outputColorSpace: SRGBColorSpace,
          powerPreference: "high-performance",
        }}
      >
        <FirstPlayableFrame onReady={() => setRendererReady(true)} />
        {performanceDiagnosticsEnabled && (
          <Suspense fallback={null}>
            <PerformanceDiagnosticsCanvasProbe
              enabled
              mode={mode}
              entry={performanceEntry}
              ready={ready}
            />
          </Suspense>
        )}
        <ProgressiveFeatureBoundary
          resetKey="rain-identity-preload"
          fallback={(
            <RainIdentityPreloadFallback onSettled={settleCharacterIdentity} />
          )}
        >
          <Suspense fallback={null}>
            <RainIdentityPreloader onSettled={settleCharacterIdentity} />
          </Suspense>
        </ProgressiveFeatureBoundary>
        {exploring && (
          <Suspense fallback={null}>
            <AutumnStorybookSky atmosphereStyle={atmosphereStyle} />
          </Suspense>
        )}
        <XinhuaWorld
          mode={mode}
          lowTier={lowTier}
          atmosphereStyle={atmosphereStyle}
          nearPoiId={nearPoiId}
          overviewStartPosition={overviewStartPosition}
          destinationPreset={destinationPreset}
          cameraQaEnabled={cameraQaVisible}
          onNearPoi={setNearPoiId}
          onPositionChange={(position) => {
            playerPosition.current = position;
            if (cameraQaVisible) {
              document.documentElement.dataset.xinhuaPlayerPosition =
                JSON.stringify(position);
            }
          }}
          networkProfile={networkProfile}
        />
        {/*
          当前后处理链在可玩相机接管后只输出全屏 pass，导致 overview / explore 空白。
          可玩模式优先使用 R3F 直接渲染；封面阶段保留 Composer 以便后续独立修复。
        */}
        {ready && (
          <ProgressiveFeatureBoundary
            resetKey={atmosphereStyle}
            fallback={null}
          >
            {mode === "intro" && !effectsDisabledForQa ? (
              <Suspense fallback={null}>
                <ProgressiveVisualEffectComposer
                  lowTier={lowTier}
                  atmosphereStyle={atmosphereStyle}
                />
              </Suspense>
            ) : null}
          </ProgressiveFeatureBoundary>
        )}
      </Canvas>

      {performanceDiagnosticsEnabled && (
        <Suspense fallback={null}>
          <PerformanceDiagnosticsPanel
            enabled
            mode={mode}
            entry={performanceEntry}
            renderDpr={renderDpr}
            qualityTier={lowTier ? "low" : "high"}
            networkProfile={networkProfile}
          />
        </Suspense>
      )}

      <CameraQaPanel visible={cameraQaVisible && exploring} />

      <header className={`world-header${playing ? "" : " is-intro"}`}>
        <button
          type="button"
          className="xinhua-brand"
          onClick={() => window.location.reload()}
          aria-label="重新开始漫步新华"
        >
          <span>游</span>
          <strong>漫步新华</strong>
        </button>
        {playing && (
          <div className="world-tool-stack">
            {overview && (
              <LightingSwitcher
                className="lighting-hud-switcher"
                atmosphereStyle={atmosphereStyle}
                onChange={selectAtmosphereStyle}
              />
            )}
            <nav className="world-tools" aria-label="体验工具">
              {exploring && (
                <button
                  type="button"
                  className="overview-toggle"
                  onClick={showOverview}
                  aria-label="查看新华街道全览"
                >
                  <span aria-hidden="true">⌁</span>
                  查看全览
                </button>
              )}
              <button type="button" onClick={() => setHelpOpen(true)} aria-label="查看操作说明">?</button>
              <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? "退出全屏" : "进入全屏"}>
                {fullscreen ? "↙" : "↗"}
              </button>
            </nav>
          </div>
        )}
      </header>

      {!playing && (
        <XinhuaIntroSurface
          ready={ready}
          loadingMessage={
            !rendererReady
              ? "正在校准街景与光影"
              : characterIdentityStatus === null
                ? "正在准备轻量人物"
                : "正在准备出发"
          }
          onBegin={begin}
        />
      )}

      {playing && (
        <>
          <div className="desktop-controls" aria-hidden="true">
            <span><kbd>WASD</kbd> 移动</span>
            <span><kbd>SHIFT</kbd> {overview ? "快走" : "奔跑"}</span>
            {exploring && <span><kbd>SPACE</kbd> 跳跃</span>}
            {exploring && <span><kbd>拖拽</kbd> 转动视角</span>}
            {overview && <span>靠近地标以查看并进入</span>}
          </div>
          <TouchControls showPace={exploring} />

        </>
      )}

      {overview && nearPoi && (
        <aside className="overview-poi-card" aria-live="polite">
          <figure
            className={`overview-poi-photo${loadedOverviewPhoto === nearPoi.photo.src ? " is-loaded" : ""}`}
            aria-busy={loadedOverviewPhoto !== nearPoi.photo.src}
          >
            <img
              key={nearPoi.photo.src}
              src={nearPoi.photo.src}
              alt={`${nearPoi.name}实景`}
              decoding="async"
              loading="eager"
              fetchPriority="high"
              referrerPolicy="no-referrer"
              onLoad={(event) => {
                const image = event.currentTarget;
                void image.decode().catch(() => undefined).finally(() => {
                  setLoadedOverviewPhoto(nearPoi.photo.src);
                });
              }}
              onError={() => {
                overviewPhotoCache.current.delete(nearPoi.photo.src);
              }}
            />
            <figcaption>
              <a href={nearPoi.photo.sourceUrl} target="_blank" rel="noreferrer">
                实景图 · {nearPoi.photo.sourceLabel}
              </a>
            </figcaption>
          </figure>
          <div className="overview-poi-card-body">
            <p>{nearPoi.eyebrow}</p>
            <h2>{nearPoi.name}</h2>
            <span className="overview-poi-card-copy">{nearPoi.description}</span>
            <button type="button" onClick={enterPoi}>进入 {nearPoi.name}</button>
          </div>
        </aside>
      )}

      {helpOpen && (
        <div className="panel-layer" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={() => setHelpOpen(false)}>
          <article className="help-panel" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="panel-close" onClick={() => setHelpOpen(false)} aria-label="关闭操作说明">×</button>
            <p>HOW TO ROAM</p>
            <h2 id="help-title">随便走走就好</h2>
            <ul>
              <li className="atmosphere-switcher">
                <span>光线</span>
                <LightingSwitcher
                  atmosphereStyle={atmosphereStyle}
                  onChange={selectAtmosphereStyle}
                />
                <small aria-live="polite">
                  当前：{XINHUA_ATMOSPHERES[atmosphereStyle].label}
                </small>
              </li>
              <li>全览地图中用 <kbd>WASD</kbd> 或摇杆移动，靠近 POI 后选择“进入”</li>
              <li>闲逛状态中按 <kbd>Shift</kbd> 奔跑，按 <kbd>Space</kbd> 跳跃</li>
              <li>闲逛时拖拽转动镜头，滚轮拉近或拉远</li>
              <li>点击“查看全览”可随时返回固定比例的新华街道全景</li>
              <li>手机下方三分之一区域轻点跳跃、拖动移动；移动中第二指可在全屏轻点跳跃或拖动视角</li>
              <li>
                成品角色：
                <a href="https://www.blenderstudio.cn/zh-hans/characters/rain/v1/" target="_blank" rel="noreferrer">
                  Rain Rig © Blender Foundation | cloud.blender.org
                </a>
                {" · CC-BY · 已优化适配"}
              </li>
            </ul>
          </article>
        </div>
      )}

      <footer className="study-note">
        非官方独立重建 · 体验参考 <a href="https://messenger.abeto.co/" target="_blank" rel="noreferrer">Messenger by abeto</a>
        <span> · 地图数据 <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></span>
        <span> · 全览街区高度为多源证据估算，非测绘级</span>
        <span> · 角色 <a href="https://www.blenderstudio.cn/zh-hans/characters/rain/v1/" target="_blank" rel="noreferrer">Rain Rig © Blender Foundation | cloud.blender.org</a></span>
        <span> · <a href="/building-evidence-lab">建筑证据实验室</a></span>
      </footer>
    </main>
  );
}
