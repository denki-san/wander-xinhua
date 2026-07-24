"use client";

/* eslint-disable @next/next/no-img-element -- POI 实景图由动态数据提供，并需要保留对应的外部图源链接。 */

import {
  EffectComposer,
  SSAO,
  ToneMapping,
} from "@react-three/postprocessing";
import { Canvas } from "@react-three/fiber";
import { NoToneMapping, SRGBColorSpace } from "three";
import {
  ToneMappingMode,
  type EffectComposer as PostprocessingEffectComposer,
} from "postprocessing";
import {
  memo,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
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
import {
  AutumnStorybookSky,
  InkOutline,
  PaperWash,
  StorybookCloudLayer,
} from "./scene/visual-effects";
import {
  DEFAULT_XINHUA_ATMOSPHERE_STYLE,
  type XinhuaAtmosphereStyle,
} from "./scene/atmosphere-contract";
import { MAP_POIS, mapPoiById } from "./scene/poi-data";
import { XinhuaWorld } from "./scene/xinhua-world";
import mapData from "./scene/xinhua-map-data.json";
import { cameraQaState } from "./scene/camera-qa";

const TOUCH_STICK_TRAVEL = 42;
type TouchTapCandidate = {
  startedAtMs: number;
  startX: number;
  startY: number;
  maxTravel: number;
  startedInStickZone: boolean;
  startedWhileMoving: boolean;
};
const POI_PHOTO_NEARBY_PREFETCH_COUNT = 4;
const POI_PHOTO_NEARBY_PREFETCH_INTERVAL_MS = 90;
const POI_PHOTO_BACKGROUND_PREFETCH_DELAY_MS = 1_800;
const POI_PHOTO_BACKGROUND_PREFETCH_INTERVAL_MS = 480;
const INITIAL_OVERVIEW_POSITION = [
  mapData.landmarks.xingfuli.position[0],
  mapData.landmarks.xingfuli.position[1],
] as const;

const ATMOSPHERE_LABELS: Record<XinhuaAtmosphereStyle, string> = {
  "autumn-afternoon": "秋日下午",
  "lighting-v3": "当前光照",
};

const VisualEffectComposer = memo(function VisualEffectComposer({
  lowTier,
  atmosphereStyle,
}: {
  lowTier: boolean;
  atmosphereStyle: XinhuaAtmosphereStyle;
}) {
  const composerRef = useRef<PostprocessingEffectComposer>(null);
  const lightingV3 = atmosphereStyle === "lighting-v3";

  useLayoutEffect(() => {
    const composer = composerRef.current;
    return () => composer?.dispose();
  }, []);

  return (
    <EffectComposer
      ref={composerRef}
      multisampling={lowTier ? 0 : 2}
      enableNormalPass={!lowTier}
      resolutionScale={lowTier ? undefined : 0.5}
    >
      {lightingV3 && !lowTier ? (
        <SSAO
          samples={16}
          rings={3}
          radius={1.45}
          intensity={0.28}
          luminanceInfluence={0.82}
          distanceThreshold={0.92}
          distanceFalloff={0.08}
          rangeThreshold={0.66}
          rangeFalloff={0.14}
          bias={0.045}
        />
      ) : <></>}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {lowTier && lightingV3 ? <></> : <InkOutline atmosphereStyle={atmosphereStyle} />}
      {lowTier && lightingV3 ? <></> : <PaperWash atmosphereStyle={atmosphereStyle} />}
    </EffectComposer>
  );
});

function detectLowTier() {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia("(any-pointer: coarse)").matches;
  const touch = coarse || (navigator.maxTouchPoints ?? 0) > 0;
  const narrow = window.innerWidth < 720;
  const limited = (navigator.hardwareConcurrency ?? 8) <= 4;
  return touch || narrow || limited;
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
        element.dataset.fov = state.fov.toFixed(1);
        element.dataset.manualGraceMs = state.manualGraceMs.toFixed(0);
        element.dataset.goalYaw = state.goalYawDegrees.toFixed(2);
        element.dataset.desiredArmYaw = state.desiredArmYawDegrees.toFixed(2);
        element.dataset.actualArmYaw = state.actualArmYawDegrees.toFixed(2);
        element.textContent = [
          `mode ${state.cameraMode}`,
          `blocker ${state.blockerId ?? "none"}`,
          `arm ${state.resolvedArmLength.toFixed(2)} / ${state.desiredArmLength.toFixed(2)}`,
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

export function XinhuaExperience() {
  const [mode, setMode] = useState<"intro" | "overview" | "explore">("intro");
  const [ready, setReady] = useState(false);
  const [nearAction, setNearAction] = useState(false);
  const [nearPoiId, setNearPoiId] = useState<string | null>(null);
  const [destinationPreset, setDestinationPreset] = useState<string>();
  const [actionOpen, setActionOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [atmosphereStyle, setAtmosphereStyle] = useState<XinhuaAtmosphereStyle>(
    DEFAULT_XINHUA_ATMOSPHERE_STYLE,
  );
  const [fullscreen, setFullscreen] = useState(false);
  // 在 Canvas 首次创建前确定渲染档位，避免低配置设备先分配一套高配后处理资源。
  const [lowTier] = useState(detectLowTier);
  const [touchCapable, setTouchCapable] = useState(false);
  const [cameraQaVisible] = useState(() => (
    typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("cameraQa") === "1"
  ));
  const playerPosition = useRef<readonly [number, number]>(INITIAL_OVERVIEW_POSITION);
  const overviewPhotoCache = useRef(new Map<string, HTMLImageElement>());
  const [loadedOverviewPhoto, setLoadedOverviewPhoto] = useState<string | null>(null);
  const [overviewStartPosition, setOverviewStartPosition] = useState<readonly [number, number]>(
    INITIAL_OVERVIEW_POSITION,
  );
  const playing = mode !== "intro";
  const exploring = mode === "explore";
  const overview = mode === "overview";
  const nearPoi = mapPoiById(nearPoiId);

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
    const [playerX, playerZ] = playerPosition.current;
    const photosByDistance = [...MAP_POIS].sort((left, right) => (
      Math.hypot(left.position[0] - playerX, left.position[1] - playerZ)
      - Math.hypot(right.position[0] - playerX, right.position[1] - playerZ)
    ));
    const timers = photosByDistance.map((poi, index) => window.setTimeout(() => {
      prefetchOverviewPhoto(poi.photo.src, index < 2 ? "high" : "low");
    }, index < POI_PHOTO_NEARBY_PREFETCH_COUNT
      ? index * POI_PHOTO_NEARBY_PREFETCH_INTERVAL_MS
      : POI_PHOTO_BACKGROUND_PREFETCH_DELAY_MS
        + (index - POI_PHOTO_NEARBY_PREFETCH_COUNT) * POI_PHOTO_BACKGROUND_PREFETCH_INTERVAL_MS));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [overview, prefetchOverviewPhoto]);

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
    if (ready) return;

    // 部分 SSR 生产环境会完成 Canvas 水合，却漏掉 react-three-fiber 的 onCreated 回调。
    // 仅在画布已有实际尺寸时解除遮罩，避免功能已可用但入口一直被加载层挡住。
    const fallback = window.setTimeout(() => {
      const canvas = document.querySelector<HTMLCanvasElement>(".xinhua-stage canvas");
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        setReady(true);
      }
    }, 2_500);

    return () => window.clearTimeout(fallback);
  }, [ready]);

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    if (!exploring) return;
    const interact = (event: KeyboardEvent) => {
      if (event.code === "KeyE" && nearAction) {
        event.preventDefault();
        setActionOpen(true);
      }
    };
    window.addEventListener("keydown", interact);
    return () => window.removeEventListener("keydown", interact);
  }, [exploring, nearAction]);

  const begin = useCallback(() => {
    resetInput();
    setNearPoiId(null);
    const requestedPreset = new URLSearchParams(window.location.search).get("start") ?? undefined;
    setDestinationPreset(requestedPreset);
    setMode(requestedPreset ? "explore" : "overview");
  }, []);

  const showOverview = useCallback(() => {
    resetInput();
    setNearAction(false);
    setActionOpen(false);
    setNearPoiId(null);
    setOverviewStartPosition(playerPosition.current);
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

  return (
    <main className={`xinhua-stage is-${mode}${playing ? " is-playing" : ""}${touchCapable ? " is-touch" : ""}`}>
      <Canvas
        shadows="percentage"
        dpr={lowTier ? 1.25 : [1, 1.75]}
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
        onCreated={() => {
          setReady(true);
        }}
      >
        <Suspense fallback={null}>
          <AutumnStorybookSky atmosphereStyle={atmosphereStyle} />
        </Suspense>
        {atmosphereStyle === "lighting-v3" && <StorybookCloudLayer />}
        <XinhuaWorld
          mode={mode}
          lowTier={lowTier}
          atmosphereStyle={atmosphereStyle}
          onNearAction={setNearAction}
          onOpenAction={() => setActionOpen(true)}
          nearPoiId={nearPoiId}
          overviewStartPosition={overviewStartPosition}
          destinationPreset={destinationPreset}
          cameraQaEnabled={cameraQaVisible}
          onNearPoi={setNearPoiId}
          onPositionChange={(position) => {
            playerPosition.current = position;
          }}
        />
        {/* 合成器在模式切换时保持挂载，避免重新创建时清空颜色缓冲；各效果按档位单独启停。 */}
          <VisualEffectComposer lowTier={lowTier} atmosphereStyle={atmosphereStyle} />
      </Canvas>

      {!ready && (
        <div className="loading-screen" role="status" aria-label="正在装载新华路三维街区">
          <span className="loading-envelope" />
          <b>LOADING XINHUA</b>
        </div>
      )}

      <CameraQaPanel visible={cameraQaVisible && exploring} />

      <header className={`world-header${playing ? "" : " is-intro"}`}>
        <button
          type="button"
          className="xinhua-brand"
          onClick={() => window.location.reload()}
          aria-label="重新开始新华漫游志"
        >
          <span>游</span>
          <strong>新华漫游志</strong>
        </button>
        {playing && (
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
        )}
      </header>

      {!playing && (
        <section className={`intro-ui${ready ? "" : " is-waiting"}`} aria-labelledby="intro-title" aria-hidden={!ready}>
          <img
            className="intro-cover-image"
            src="/images/xinhua-pocket-toy-cover.jpg"
            alt=""
            aria-hidden="true"
            decoding="async"
            fetchPriority="high"
          />
          <h1 id="intro-title" aria-label="漫步新华路">
            <span>漫</span><span>步</span><span>新</span><span>华</span><span>路</span>
          </h1>
          <button type="button" onClick={begin} disabled={!ready}>出发</button>
        </section>
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

          {exploring && nearAction && !actionOpen && (
            <button type="button" className="action-prompt" onClick={() => setActionOpen(true)}>
              <span>唯一行动点</span>
              <strong>看看这一平米</strong>
              <kbd>E</kbd>
            </button>
          )}
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

      {actionOpen && (
        <div className="panel-layer" role="dialog" aria-modal="true" aria-labelledby="action-title" onClick={() => setActionOpen(false)}>
          <article className="action-panel" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="panel-close" onClick={() => setActionOpen(false)} aria-label="关闭行动面板">×</button>
            <span className="action-number">1 m²</span>
            <p>新华路街区 · 唯一行动点</p>
            <h2 id="action-title">给街角留出一平方米</h2>
            <p className="action-copy">把一平方米变成邻里可以停一下、聊一句、交换一件小物的地方。当前版本只保留这一处行动入口，其余空间全部用来闲逛。</p>
            <button type="button" className="action-button" onClick={() => setActionOpen(false)}>继续闲逛</button>
          </article>
        </div>
      )}

      {helpOpen && (
        <div className="panel-layer" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={() => setHelpOpen(false)}>
          <article className="help-panel" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="panel-close" onClick={() => setHelpOpen(false)} aria-label="关闭操作说明">×</button>
            <p>HOW TO ROAM</p>
            <h2 id="help-title">随便走走就好</h2>
            <ul>
              <li className="atmosphere-switcher">
                <span>画面氛围</span>
                <div className="atmosphere-buttons" role="group" aria-label="切换画面氛围">
                  {(Object.keys(ATMOSPHERE_LABELS) as XinhuaAtmosphereStyle[]).map((style) => (
                    <button
                      key={style}
                      type="button"
                      className={atmosphereStyle === style ? "is-active" : ""}
                      aria-pressed={atmosphereStyle === style}
                      onClick={() => setAtmosphereStyle(style)}
                    >
                      {ATMOSPHERE_LABELS[style]}
                    </button>
                  ))}
                </div>
                <small aria-live="polite">当前：{ATMOSPHERE_LABELS[atmosphereStyle]}</small>
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
        <span> · 角色 <a href="https://www.blenderstudio.cn/zh-hans/characters/rain/v1/" target="_blank" rel="noreferrer">Rain Rig © Blender Foundation | cloud.blender.org</a></span>
        <span> · <a href="/building-evidence-lab">建筑证据实验室</a></span>
      </footer>
    </main>
  );
}
