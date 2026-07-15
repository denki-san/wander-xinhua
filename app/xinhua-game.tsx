"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Point = { x: number; y: number };

type Place = Point & {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  color: string;
  icon: string;
};

type Story = {
  title: string;
  eyebrow: string;
  body: string;
  accent: string;
};

const PLACES: Place[] = [
  {
    id: "wawa",
    x: 0.28,
    y: 0.62,
    title: "WAWA 行动入口",
    eyebrow: "一平米行动 · 起点",
    description: "领取今天的行动邀请，把一个小小的想法带进街区。",
    color: "#ffb238",
    icon: "信",
  },
  {
    id: "xingfuli",
    x: 0.55,
    y: 0.47,
    title: "幸福里步行街",
    eyebrow: "真实街区节点",
    description: "番禺路 381 号附近的街区切片，也是这次漫游的中心。",
    color: "#f36f48",
    icon: "里",
  },
  {
    id: "merchant",
    x: 0.72,
    y: 0.39,
    title: "一方小店",
    eyebrow: "虚构商户 · 待合作",
    description: "今天它想借出门口的一平米，放一张邻里交换桌。",
    color: "#ca5549",
    icon: "店",
  },
  {
    id: "garden",
    x: 0.76,
    y: 0.67,
    title: "口袋花园",
    eyebrow: "街区故事点",
    description: "一块被树荫包住的停留地，故事以后会由居民共同补充。",
    color: "#478d66",
    icon: "园",
  },
  {
    id: "action-map",
    x: 0.47,
    y: 0.77,
    title: "行动地图牌",
    eyebrow: "线上线下连接点",
    description: "点亮已经拜访的地点，生成一条可以在线下继续走的路线。",
    color: "#7d663f",
    icon: "图",
  },
];

const MISSIONS = [
  {
    target: "wawa",
    title: "送出第一张行动邀请",
    short: "前往 WAWA 行动入口",
    result: {
      title: "邀请已装进信袋",
      eyebrow: "行动 01 · 已完成",
      body: "你领到了一张“一平米行动”邀请。它不要求做一件大事，只邀请人们从身边的一小块地方开始。",
      accent: "#ffb238",
    },
  },
  {
    target: "merchant",
    title: "点亮一家街角小店",
    short: "把邀请送到一方小店",
    result: {
      title: "小店门口亮起来了",
      eyebrow: "行动 02 · 已完成",
      body: "店主决定把门口的一平米变成邻里交换桌。真实合作后，这里可以换成商户故事、活动和到店入口。",
      accent: "#ca5549",
    },
  },
  {
    target: "action-map",
    title: "找到今年的行动地图",
    short: "前往行动地图牌",
    result: {
      title: "你的漫游路线已生成",
      eyebrow: "行动 03 · 已完成",
      body: "WAWA 行动入口 → 幸福里 → 一方小店 → 行动地图牌。下一版可在这里接入真实二维码、报名和线下打卡。",
      accent: "#7d663f",
    },
  },
];

const BUILDINGS = [
  { x: 0.12, y: 0.18, w: 0.13, h: 0.16, color: "#e7c79e" },
  { x: 0.12, y: 0.41, w: 0.12, h: 0.13, color: "#d89776" },
  { x: 0.39, y: 0.14, w: 0.15, h: 0.12, color: "#f0d8b3" },
  { x: 0.62, y: 0.13, w: 0.17, h: 0.12, color: "#d6b084" },
  { x: 0.81, y: 0.24, w: 0.11, h: 0.18, color: "#efcf9c" },
  { x: 0.59, y: 0.51, w: 0.12, h: 0.12, color: "#d88267" },
  { x: 0.83, y: 0.52, w: 0.1, h: 0.16, color: "#e9c694" },
  { x: 0.1, y: 0.72, w: 0.14, h: 0.12, color: "#e4b989" },
  { x: 0.67, y: 0.79, w: 0.16, h: 0.1, color: "#e7c79e" },
];

const TREES: Point[] = [
  { x: 0.08, y: 0.12 },
  { x: 0.29, y: 0.2 },
  { x: 0.33, y: 0.37 },
  { x: 0.48, y: 0.32 },
  { x: 0.58, y: 0.35 },
  { x: 0.88, y: 0.16 },
  { x: 0.87, y: 0.74 },
  { x: 0.62, y: 0.7 },
  { x: 0.35, y: 0.83 },
  { x: 0.23, y: 0.88 },
];

const clamp = (value: number, min = 0.055, max = 0.945) =>
  Math.min(max, Math.max(min, value));

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function XinhuaGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<Point>({ x: 0.39, y: 0.58 });
  const targetRef = useRef<Point | null>(null);
  const keysRef = useRef(new Set<string>());
  const sizeRef = useRef({ width: 1, height: 1, dpr: 1 });
  const [started, setStarted] = useState(false);
  const [missionIndex, setMissionIndex] = useState(0);
  const [visited, setVisited] = useState<string[]>([]);
  const [nearbyId, setNearbyId] = useState<string | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [hint, setHint] = useState("轻点地图，让信使走到那里");
  const [soundOn, setSoundOn] = useState(true);

  const activeMission = MISSIONS[missionIndex] ?? null;
  const activePlace = useMemo(
    () => PLACES.find((place) => place.id === activeMission?.target),
    [activeMission],
  );

  const setTarget = useCallback((point: Point) => {
    targetRef.current = { x: clamp(point.x), y: clamp(point.y) };
    setHint("正在前往目的地…");
  }, []);

  const focusPlace = useCallback(
    (place: Place) => {
      setTarget({ x: place.x - 0.045, y: place.y + 0.055 });
    },
    [setTarget],
  );

  const playTone = useCallback(() => {
    if (!soundOn || typeof window === "undefined") return;
    const AudioContextClass =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;
    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(520, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(760, audio.currentTime + 0.14);
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audio.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.22);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.24);
    oscillator.addEventListener("ended", () => void audio.close());
  }, [soundOn]);

  const interact = useCallback(() => {
    if (!nearbyId) {
      setHint("再靠近一点，就能和地点互动");
      return;
    }

    const place = PLACES.find((item) => item.id === nearbyId);
    if (!place) return;
    setVisited((items) => (items.includes(place.id) ? items : [...items, place.id]));

    if (activeMission?.target === place.id) {
      setStory(activeMission.result);
      setMissionIndex((index) => index + 1);
      setHint("行动完成，新的线索已经出现");
      playTone();
      return;
    }

    setStory({
      title: place.title,
      eyebrow: place.eyebrow,
      body: place.description,
      accent: place.color,
    });
    setHint("这里已经收进你的街区手册");
  }, [activeMission, nearbyId, playTone]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        event.preventDefault();
        targetRef.current = null;
        keysRef.current.add(key);
      }
      if (key === "e" || key === "enter") interact();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase());
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [interact]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      sizeRef.current = { width: rect.width, height: rect.height, dpr };
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let frame = 0;
    let last = performance.now();
    let lastNearby: string | null = null;

    const draw = (now: number) => {
      const { width, height, dpr } = sizeRef.current;
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#f3dfb8");
      gradient.addColorStop(0.48, "#eecf9c");
      gradient.addColorStop(1, "#dcbf8c");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      const sx = (x: number) => x * width;
      const sy = (y: number) => y * height;
      const unit = Math.min(width, height);

      // 真实路网关系的风格化白盒：番禺路、法华镇路、幸福路与幸福里步行街。
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#c9af84";
      context.lineWidth = Math.max(18, unit * 0.07);
      context.beginPath();
      context.moveTo(sx(0.31), sy(-0.05));
      context.lineTo(sx(0.32), sy(1.05));
      context.stroke();

      context.lineWidth = Math.max(16, unit * 0.06);
      context.beginPath();
      context.moveTo(sx(-0.05), sy(0.72));
      context.lineTo(sx(1.05), sy(0.84));
      context.stroke();

      context.lineWidth = Math.max(13, unit * 0.048);
      context.beginPath();
      context.moveTo(sx(0.56), sy(-0.05));
      context.quadraticCurveTo(sx(0.7), sy(0.18), sx(1.05), sy(0.18));
      context.stroke();

      context.strokeStyle = "#f7e7c7";
      context.lineWidth = Math.max(8, unit * 0.028);
      context.beginPath();
      context.moveTo(sx(0.35), sy(0.49));
      context.bezierCurveTo(sx(0.52), sy(0.36), sx(0.72), sy(0.35), sx(0.82), sy(0.47));
      context.stroke();

      // 建筑使用统一色板与轻微投影，保持低多边形识别感。
      for (const building of BUILDINGS) {
        const x = sx(building.x);
        const y = sy(building.y);
        const w = sx(building.w);
        const h = sy(building.h);
        context.fillStyle = "rgba(91, 63, 39, 0.14)";
        roundedRect(context, x + 7, y + 9, w, h, 10);
        context.fill();
        context.fillStyle = building.color;
        roundedRect(context, x, y, w, h, 10);
        context.fill();
        context.fillStyle = "rgba(255,255,255,.45)";
        roundedRect(context, x + w * 0.13, y + h * 0.16, w * 0.56, h * 0.12, 4);
        context.fill();
        context.fillStyle = "rgba(111,70,42,.32)";
        roundedRect(context, x + w * 0.15, y + h * 0.44, w * 0.14, h * 0.32, 4);
        context.fill();
        roundedRect(context, x + w * 0.38, y + h * 0.44, w * 0.14, h * 0.32, 4);
        context.fill();
        roundedRect(context, x + w * 0.61, y + h * 0.44, w * 0.14, h * 0.32, 4);
        context.fill();
      }

      for (const tree of TREES) {
        const x = sx(tree.x);
        const y = sy(tree.y);
        context.fillStyle = "rgba(72, 67, 42, .18)";
        context.beginPath();
        context.ellipse(x + 5, y + 8, unit * 0.022, unit * 0.012, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#7f9e65";
        context.beginPath();
        context.arc(x, y, unit * 0.018, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#4e7557";
        context.beginPath();
        context.arc(x - unit * 0.011, y + unit * 0.008, unit * 0.014, 0, Math.PI * 2);
        context.arc(x + unit * 0.012, y + unit * 0.007, unit * 0.015, 0, Math.PI * 2);
        context.fill();
      }

      context.save();
      context.fillStyle = "rgba(87, 60, 38, .62)";
      context.font = `600 ${Math.max(11, unit * 0.018)}px ui-sans-serif, system-ui`;
      context.fillText("番禺路", sx(0.335), sy(0.91));
      context.fillText("法华镇路", sx(0.04), sy(0.765));
      context.fillText("幸福路", sx(0.78), sy(0.15));
      context.fillStyle = "rgba(255,255,255,.78)";
      context.fillText("幸福里步行街", sx(0.5), sy(0.43));
      context.restore();

      const player = playerRef.current;
      let dx = 0;
      let dy = 0;
      const keys = keysRef.current;
      if (keys.has("w") || keys.has("arrowup")) dy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) dy += 1;
      if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
      if (keys.has("d") || keys.has("arrowright")) dx += 1;
      const target = targetRef.current;
      if (dx || dy) {
        const length = Math.hypot(dx, dy) || 1;
        player.x = clamp(player.x + (dx / length) * delta * 0.24);
        player.y = clamp(player.y + (dy / length) * delta * 0.24);
      } else if (target) {
        const tx = target.x - player.x;
        const ty = target.y - player.y;
        const distance = Math.hypot(tx, ty);
        if (distance < 0.008) {
          targetRef.current = null;
          setHint("到达了，看看附近有什么");
        } else {
          const speed = Math.min(delta * 0.26, distance);
          player.x = clamp(player.x + (tx / distance) * speed);
          player.y = clamp(player.y + (ty / distance) * speed);
        }
      }

      let nextNearby: string | null = null;
      let closest = Number.POSITIVE_INFINITY;
      for (const place of PLACES) {
        const distance = Math.hypot(place.x - player.x, place.y - player.y);
        if (distance < 0.095 && distance < closest) {
          nextNearby = place.id;
          closest = distance;
        }

        const x = sx(place.x);
        const y = sy(place.y);
        const pulse = 1 + Math.sin(now / 430 + place.x * 10) * 0.08;
        const isActive = activeMission?.target === place.id;
        const isVisited = visited.includes(place.id);
        if (isActive) {
          context.strokeStyle = "rgba(255,255,255,.75)";
          context.lineWidth = 2;
          context.beginPath();
          context.arc(x, y, unit * 0.042 * pulse, 0, Math.PI * 2);
          context.stroke();
        }
        context.fillStyle = "rgba(76, 49, 31, .18)";
        context.beginPath();
        context.ellipse(x + 4, y + unit * 0.03, unit * 0.035, unit * 0.014, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = isVisited ? "#5e694f" : place.color;
        context.beginPath();
        context.arc(x, y, unit * 0.032, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#fff9e9";
        context.font = `700 ${Math.max(12, unit * 0.022)}px ui-sans-serif, system-ui`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(isVisited ? "✓" : place.icon, x, y + 1);
      }

      if (nextNearby !== lastNearby) {
        lastNearby = nextNearby;
        setNearbyId(nextNearby);
      }

      const px = sx(player.x);
      const py = sy(player.y);
      context.fillStyle = "rgba(57, 45, 35, .2)";
      context.beginPath();
      context.ellipse(px + 3, py + unit * 0.025, unit * 0.025, unit * 0.011, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#27352f";
      context.beginPath();
      context.arc(px, py - unit * 0.018, unit * 0.015, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#f7aa35";
      roundedRect(context, px - unit * 0.018, py - unit * 0.003, unit * 0.036, unit * 0.043, unit * 0.01);
      context.fill();
      context.fillStyle = "#fff4d8";
      roundedRect(context, px - unit * 0.014, py + unit * 0.004, unit * 0.028, unit * 0.018, unit * 0.004);
      context.fill();

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [activeMission?.target, visited]);

  const onCanvasPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!started) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTarget({
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    });
  };

  const nearby = PLACES.find((place) => place.id === nearbyId);
  const completed = missionIndex >= MISSIONS.length;

  return (
    <main className="game-shell">
      <header className="topbar">
        <a className="brand" href="#map" aria-label="新华信使首页">
          <span className="brand-mark">新</span>
          <span>
            <strong>新华信使</strong>
            <small>幸福里一平米行动地图</small>
          </span>
        </a>
        <div className="topbar-actions">
          <span className="live-chip"><i /> MVP 体验版</span>
          <button className="icon-button" type="button" onClick={() => setSoundOn((value) => !value)} aria-label={soundOn ? "关闭声音" : "打开声音"}>
            {soundOn ? "声" : "静"}
          </button>
        </div>
      </header>

      <section className="game-stage" id="map" aria-label="幸福里可游玩地图">
        <canvas
          ref={canvasRef}
          className="world-canvas"
          onPointerDown={onCanvasPointer}
          aria-label="幸福里周边风格化地图。可点击地图移动新华信使，或使用键盘方向键。"
          role="img"
        />

        <div className="map-caption" aria-hidden="true">
          <span>31.2064° N · 121.4257° E</span>
          <strong>幸福里街区切片</strong>
        </div>

        <aside className="mission-card" aria-live="polite">
          <div className="mission-heading">
            <span>今日行动</span>
            <b>{Math.min(missionIndex, MISSIONS.length)} / {MISSIONS.length}</b>
          </div>
          <div className="progress-track"><i style={{ width: `${(Math.min(missionIndex, 3) / 3) * 100}%` }} /></div>
          {completed ? (
            <>
              <p className="mission-kicker">路线已点亮</p>
              <h1>一平米，也能让街区发生一点变化。</h1>
              <p>你完成了第一段新华漫游。下一版会接入真实商户、活动与线下入口。</p>
              <button className="primary-button" type="button" onClick={() => {
                setMissionIndex(0);
                setVisited([]);
                playerRef.current = { x: 0.39, y: 0.58 };
                setStory(null);
              }}>再走一次</button>
            </>
          ) : (
            <>
              <p className="mission-kicker">行动 {String(missionIndex + 1).padStart(2, "0")}</p>
              <h1>{activeMission?.title}</h1>
              <p>{activeMission?.short}</p>
              {activePlace && <button className="primary-button" type="button" onClick={() => focusPlace(activePlace)}>带我过去</button>}
            </>
          )}
        </aside>

        <nav className="place-strip" aria-label="街区地点">
          {PLACES.map((place) => (
            <button
              key={place.id}
              type="button"
              className={activeMission?.target === place.id ? "is-active" : ""}
              onClick={() => focusPlace(place)}
              aria-label={`前往${place.title}`}
            >
              <i style={{ background: place.color }}>{visited.includes(place.id) ? "✓" : place.icon}</i>
              <span>{place.title}</span>
            </button>
          ))}
        </nav>

        <div className="action-dock" aria-live="polite">
          <span>{nearby ? `已靠近：${nearby.title}` : hint}</span>
          <button type="button" onClick={interact} disabled={!nearbyId}>
            {nearby ? "进行互动" : "靠近地点"}
          </button>
        </div>

        <div className="controls-tip"><kbd>WASD</kbd><span>或轻点地图移动</span></div>

        {!started && (
          <div className="intro-layer">
            <div className="intro-card">
              <p className="intro-kicker">XINHUA ROAD · SHANGHAI</p>
              <h1>把街区装进一封<br />可以行走的信里。</h1>
              <p>你是今天的“新华信使”。从幸福里出发，用三次很轻的行动，认识一间小店、一张地图和一平方米的可能。</p>
              <div className="intro-meta">
                <span>约 3 分钟</span><span>无需登录</span><span>手机可玩</span>
              </div>
              <button type="button" className="start-button" onClick={() => setStarted(true)}>
                开始今天的漫游 <b>→</b>
              </button>
            </div>
          </div>
        )}

        {story && (
          <div className="story-layer" role="dialog" aria-modal="true" aria-labelledby="story-title" onClick={() => setStory(null)}>
            <article className="story-card" style={{ "--story-accent": story.accent } as React.CSSProperties} onClick={(event) => event.stopPropagation()}>
              <button className="story-close" type="button" onClick={() => setStory(null)} aria-label="关闭故事卡">×</button>
              <span className="story-symbol">信</span>
              <p>{story.eyebrow}</p>
              <h2 id="story-title">{story.title}</h2>
              <div className="story-divider" />
              <blockquote>{story.body}</blockquote>
              <button type="button" className="story-next" onClick={() => setStory(null)}>收进街区手册</button>
            </article>
          </div>
        )}
      </section>

      <footer className="site-footer">
        <span>当前为非官方概念体验，商户与故事内容为虚构占位。</span>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">地图参考 © OpenStreetMap contributors</a>
      </footer>
    </main>
  );
}
