"use client";

/* eslint-disable @next/next/no-img-element -- POI 实景图由动态数据提供，并需要保留对应的外部图源链接。 */

import { EffectComposer } from "@react-three/postprocessing";
import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import type { EffectComposer as PostprocessingEffectComposer } from "postprocessing";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { inputState, resetInput, setMoveVector } from "./scene/input";
import {
  InkOutline,
  PaperWash,
  WatercolourSky,
} from "./scene/visual-effects";
import { mapPoiById } from "./scene/poi-data";
import { XinhuaWorld } from "./scene/xinhua-world";
import mapData from "./scene/xinhua-map-data.json";

const TOUCH_STICK_TRAVEL = 42;
const INITIAL_OVERVIEW_POSITION = [
  mapData.landmarks.xingfuli.position[0],
  mapData.landmarks.xingfuli.position[1],
] as const;

const VisualEffectComposer = memo(function VisualEffectComposer({
  lowTier,
}: {
  lowTier: boolean;
}) {
  const composerRef = useRef<PostprocessingEffectComposer>(null);

  useLayoutEffect(() => {
    const composer = composerRef.current;
    return () => composer?.dispose();
  }, []);

  return (
    <EffectComposer
      ref={composerRef}
      multisampling={lowTier ? 0 : 2}
    >
      {lowTier
        ? <PaperWash />
        : [<InkOutline key="ink-outline" />, <PaperWash key="paper-wash" />]}
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

function TouchControls({ showJump }: { showJump: boolean }) {
  const zone = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [jumping, setJumping] = useState(false);

  useEffect(() => {
    const element = zone.current;
    if (!element) return;

    const clearMove = () => {
      pointerId.current = null;
      setKnob({ x: 0, y: 0 });
      setOrigin(null);
      setMoveVector(0, 0);
    };
    const beginMove = (event: PointerEvent) => {
      if (event.pointerType !== "touch" || pointerId.current !== null) return;
      if (!(event.target instanceof HTMLCanvasElement)) return;
      const bounds = element.getBoundingClientRect();
      if (
        event.clientX < bounds.left
        || event.clientX > bounds.right
        || event.clientY < bounds.top
        || event.clientY > bounds.bottom
      ) return;

      // 在捕获阶段仅接管下半屏触摸；鼠标和触控板仍会直达 Canvas 控制镜头。
      event.preventDefault();
      event.stopPropagation();
      pointerId.current = event.pointerId;
      center.current = { x: event.clientX, y: event.clientY };
      setOrigin({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
      setKnob({ x: 0, y: 0 });
      setMoveVector(0, 0);
      event.target.setPointerCapture(event.pointerId);
    };
    const updateMove = (event: PointerEvent) => {
      if (pointerId.current !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      let x = event.clientX - center.current.x;
      let y = event.clientY - center.current.y;
      const length = Math.hypot(x, y);
      if (length > TOUCH_STICK_TRAVEL) {
        x = x / length * TOUCH_STICK_TRAVEL;
        y = y / length * TOUCH_STICK_TRAVEL;
      }
      setKnob({ x, y });
      setMoveVector(x / TOUCH_STICK_TRAVEL, y / TOUCH_STICK_TRAVEL);
    };
    const endMove = (event: PointerEvent) => {
      if (pointerId.current !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      clearMove();
    };

    window.addEventListener("pointerdown", beginMove, { capture: true, passive: false });
    window.addEventListener("pointermove", updateMove, { capture: true, passive: false });
    window.addEventListener("pointerup", endMove, { capture: true, passive: false });
    window.addEventListener("pointercancel", endMove, { capture: true, passive: false });
    window.addEventListener("blur", clearMove);
    return () => {
      window.removeEventListener("pointerdown", beginMove, true);
      window.removeEventListener("pointermove", updateMove, true);
      window.removeEventListener("pointerup", endMove, true);
      window.removeEventListener("pointercancel", endMove, true);
      window.removeEventListener("blur", clearMove);
      resetInput();
    };
  }, []);

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
      {showJump && (
        <button
          type="button"
          className={`touch-jump${jumping ? " is-pressed" : ""}`}
          onPointerDown={(event) => {
            event.preventDefault();
            inputState.jump = true;
            setJumping(true);
          }}
          onPointerUp={() => {
            inputState.jump = false;
            setJumping(false);
          }}
          onPointerCancel={() => {
            inputState.jump = false;
            setJumping(false);
          }}
          aria-label="跳跃"
        >
          跳
        </button>
      )}
    </div>
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
  const [fullscreen, setFullscreen] = useState(false);
  // 在 Canvas 首次创建前确定渲染档位，避免低配置设备先分配一套高配后处理资源。
  const [lowTier] = useState(detectLowTier);
  const [touchCapable, setTouchCapable] = useState(false);
  const playerPosition = useRef<readonly [number, number]>(INITIAL_OVERVIEW_POSITION);
  const overviewPhotoPreload = useRef<HTMLImageElement | null>(null);
  const [overviewStartPosition, setOverviewStartPosition] = useState<readonly [number, number]>(
    INITIAL_OVERVIEW_POSITION,
  );
  const playing = mode !== "intro";
  const exploring = mode === "explore";
  const overview = mode === "overview";
  const nearPoi = mapPoiById(nearPoiId);

  useEffect(() => {
    const coarse = window.matchMedia("(any-pointer: coarse)").matches;
    const touch = coarse || (navigator.maxTouchPoints ?? 0) > 0;
    const frame = window.requestAnimationFrame(() => {
      setTouchCapable(touch);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const firstOverviewPhoto = mapPoiById("xingfuli")?.photo.src;
    if (!firstOverviewPhoto) return;
    const preview = new Image();
    preview.fetchPriority = "high";
    preview.decoding = "sync";
    preview.src = firstOverviewPhoto;
    overviewPhotoPreload.current = preview;
    void preview.decode().catch(() => undefined);
    return () => {
      overviewPhotoPreload.current = null;
    };
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
        shadows
        dpr={lowTier ? 1.25 : [1, 1.75]}
        camera={{
          fov: 50,
          near: 0.1,
          far: 800 * mapData.meta.environmentScale,
          position: [35, 34, 42],
        }}
        gl={{
          antialias: true,
          toneMapping: ACESFilmicToneMapping,
          outputColorSpace: SRGBColorSpace,
          powerPreference: "high-performance",
        }}
        onCreated={() => setReady(true)}
      >
        <WatercolourSky />
        <XinhuaWorld
          mode={mode}
          onNearAction={setNearAction}
          onOpenAction={() => setActionOpen(true)}
          nearPoiId={nearPoiId}
          overviewStartPosition={overviewStartPosition}
          destinationPreset={destinationPreset}
          onNearPoi={setNearPoiId}
          onPositionChange={(position) => {
            playerPosition.current = position;
          }}
        />
        {/* 合成器在模式切换时保持挂载，避免重新创建时清空颜色缓冲；各效果按档位单独启停。 */}
          <VisualEffectComposer lowTier={lowTier} />
      </Canvas>

      {!ready && (
        <div className="loading-screen" role="status" aria-label="正在装载新华路三维街区">
          <span className="loading-envelope" />
          <b>LOADING XINHUA</b>
        </div>
      )}

      <header className="world-header">
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
          <p>WANDER · XINHUA · SHANGHAI</p>
          <h1 id="intro-title" aria-label="新华漫游志">
            <span>新华</span><span>漫游志</span>
          </h1>
          <button type="button" onClick={begin} disabled={!ready}>从全览出发</button>
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
          <TouchControls showJump={exploring} />

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
          <figure className="overview-poi-photo">
            <img
              key={nearPoi.photo.src}
              src={nearPoi.photo.src}
              alt={`${nearPoi.name}实景`}
              decoding="sync"
              loading="eager"
              fetchPriority="high"
              referrerPolicy="no-referrer"
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
              <li>全览地图中用 <kbd>WASD</kbd> 或摇杆移动，靠近 POI 后选择“进入”</li>
              <li>闲逛状态中按 <kbd>Shift</kbd> 奔跑，按 <kbd>Space</kbd> 跳跃</li>
              <li>闲逛时拖拽转动镜头，滚轮拉近或拉远</li>
              <li>点击“查看全览”可随时返回固定比例的新华街道全景</li>
              <li>手机下半屏任意处拖动移动；闲逛时上半屏可拖动镜头</li>
            </ul>
          </article>
        </div>
      )}

      <footer className="study-note">
        非官方独立重建 · 体验参考 <a href="https://messenger.abeto.co/" target="_blank" rel="noreferrer">Messenger by abeto</a>
        <span> · 地图数据 <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></span>
      </footer>
    </main>
  );
}
