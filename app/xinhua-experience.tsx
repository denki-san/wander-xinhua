"use client";

import { EffectComposer } from "@react-three/postprocessing";
import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import type { EffectComposer as PostprocessingEffectComposer } from "postprocessing";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { inputState, resetInput, setMoveVector } from "./scene/input";
import {
  InkOutline,
  NormalPassControl,
  PaperWash,
  WatercolourSky,
} from "./scene/visual-effects";
import { XinhuaWorld } from "./scene/xinhua-world";
import mapData from "./scene/xinhua-map-data.json";

const TOUCH_STICK_TRAVEL = 42;

function DisposableEffectComposer({
  playing,
  lowTier,
}: {
  playing: boolean;
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
      enableNormalPass={!lowTier}
    >
      <NormalPassControl enabled={playing && !lowTier} />
      <InkOutline enabled={playing && !lowTier} />
      <PaperWash animated={playing} />
    </EffectComposer>
  );
}

function detectLowTier() {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia("(any-pointer: coarse)").matches;
  const touch = coarse || (navigator.maxTouchPoints ?? 0) > 0;
  const narrow = window.innerWidth < 720;
  const limited = (navigator.hardwareConcurrency ?? 8) <= 4;
  return touch || narrow || limited;
}

function TouchControls() {
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
    </div>
  );
}

export function XinhuaExperience() {
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [nearAction, setNearAction] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  // 在 Canvas 首次创建前确定渲染档位，避免低配置设备先分配一套高配后处理资源。
  const [lowTier] = useState(detectLowTier);
  const [touchCapable, setTouchCapable] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia("(any-pointer: coarse)").matches;
    const touch = coarse || (navigator.maxTouchPoints ?? 0) > 0;
    const frame = window.requestAnimationFrame(() => {
      setTouchCapable(touch);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const interact = (event: KeyboardEvent) => {
      if (event.code === "KeyE" && nearAction) {
        event.preventDefault();
        setActionOpen(true);
      }
    };
    window.addEventListener("keydown", interact);
    return () => window.removeEventListener("keydown", interact);
  }, [playing, nearAction]);

  const begin = useCallback(() => {
    resetInput();
    setPlaying(true);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen?.();
    }
  }, []);

  return (
    <main className={`xinhua-stage${playing ? " is-playing" : " is-intro"}${touchCapable ? " is-touch" : ""}`}>
      <Canvas
        shadows
        dpr={lowTier ? 1.25 : [1, 1.75]}
        camera={{
          fov: 58,
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
          playing={playing}
          onNearAction={setNearAction}
          onOpenAction={() => setActionOpen(true)}
        />
        <DisposableEffectComposer
          key={playing ? "playing" : "intro"}
          playing={playing}
          lowTier={lowTier}
        />
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
          <button type="button" onClick={begin} disabled={!ready}>开始闲逛</button>
        </section>
      )}

      {playing && (
        <>
          <div className="desktop-controls" aria-hidden="true">
            <span><kbd>WASD</kbd> 移动</span>
            <span><kbd>SHIFT</kbd> 奔跑</span>
            <span><kbd>SPACE</kbd> 跳跃</span>
            <span><kbd>拖拽</kbd> 转动视角</span>
          </div>
          <TouchControls />

          {nearAction && !actionOpen && (
            <button type="button" className="action-prompt" onClick={() => setActionOpen(true)}>
              <span>唯一行动点</span>
              <strong>看看这一平米</strong>
              <kbd>E</kbd>
            </button>
          )}
        </>
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
              <li><kbd>WASD</kbd> 或方向键移动</li>
              <li><kbd>Shift</kbd> 奔跑，<kbd>Space</kbd> 跳跃</li>
              <li>拖拽转动镜头，滚轮拉近或拉远</li>
              <li>手机下半屏任意处拖动移动，上半屏拖动镜头</li>
              <li>右下角按钮用于跳跃</li>
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
