"use client";

import { EffectComposer } from "@react-three/postprocessing";
import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import { useCallback, useEffect, useRef, useState } from "react";
import { inputState, resetInput, setMoveVector } from "./scene/input";
import { InkOutline, PaperWash, WatercolourSky } from "./scene/visual-effects";
import { XinhuaWorld } from "./scene/xinhua-world";

function TouchControls() {
  const base = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [jumping, setJumping] = useState(false);
  const travel = 42;

  useEffect(() => () => resetInput(), []);

  const release = useCallback((event: React.PointerEvent) => {
    if (pointerId.current !== event.pointerId) return;
    pointerId.current = null;
    setKnob({ x: 0, y: 0 });
    setMoveVector(0, 0);
  }, []);

  return (
    <div className="touch-controls">
      <div
        ref={base}
        className="touch-stick"
        aria-label="移动摇杆"
        onPointerDown={(event) => {
          event.preventDefault();
          pointerId.current = event.pointerId;
          center.current = { x: event.clientX, y: event.clientY };
          base.current?.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (pointerId.current !== event.pointerId) return;
          event.preventDefault();
          let x = event.clientX - center.current.x;
          let y = event.clientY - center.current.y;
          const length = Math.hypot(x, y);
          if (length > travel) {
            x = x / length * travel;
            y = y / length * travel;
          }
          setKnob({ x, y });
          setMoveVector(x / travel, y / travel);
        }}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <span style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
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
  const [lowTier, setLowTier] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const narrow = window.innerWidth < 720;
    const limited = (navigator.hardwareConcurrency ?? 8) <= 4;
    const frame = window.requestAnimationFrame(() => setLowTier(coarse || narrow || limited));
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
    <main className={`xinhua-stage${playing ? " is-playing" : " is-intro"}`}>
      <Canvas
        shadows
        dpr={lowTier ? 1 : [1, 1.75]}
        camera={{ fov: 58, near: 0.1, far: 500, position: [0, 30, 46] }}
        gl={{
          antialias: !lowTier,
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
        {lowTier ? (
          <EffectComposer multisampling={0}>
            <PaperWash />
          </EffectComposer>
        ) : (
          <EffectComposer multisampling={2} enableNormalPass>
            <InkOutline />
            <PaperWash />
          </EffectComposer>
        )}
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
          aria-label="重新开始新华信使"
        >
          <span>新</span>
          <strong>新华信使</strong>
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
          <p>XINHUA ROAD · SHANGHAI</p>
          <h1 id="intro-title"><span>新华</span><span>信使</span></h1>
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
              <li>手机使用左侧摇杆与右侧跳跃按钮</li>
            </ul>
          </article>
        </div>
      )}

      <footer className="study-note">
        非官方独立重建 · 技术体验参考 <a href="https://messenger.abeto.co/" target="_blank" rel="noreferrer">Messenger by abeto</a>
      </footer>
    </main>
  );
}
