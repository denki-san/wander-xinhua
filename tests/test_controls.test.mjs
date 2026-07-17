import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Vector3 } from "three";
import {
  inputState,
  normalizeMoveVector,
  resetInput,
  setMoveVector,
} from "../app/scene/input.ts";
import {
  dampTangentTowards,
  dampingFactor,
} from "../app/scene/world-math.ts";

const EPSILON = 1e-9;

test("模拟摇杆保留圆周上的连续输入角度", () => {
  for (let degrees = 0; degrees < 360; degrees += 15) {
    const angle = degrees * Math.PI / 180;
    const sourceX = Math.cos(angle) * 0.8;
    const sourceY = Math.sin(angle) * 0.8;
    const move = normalizeMoveVector(sourceX, sourceY);
    const cross = sourceX * move.y - sourceY * move.x;
    const dot = sourceX * move.x + sourceY * move.y;

    assert.ok(move.magnitude > 0);
    assert.ok(Math.abs(cross) < EPSILON, `未保留 ${degrees}° 的方向`);
    assert.ok(dot > 0, `错误翻转了 ${degrees}° 的方向`);
  }
});

test("模拟摇杆使用径向死区并向共享状态写入连续分量", () => {
  assert.deepEqual(normalizeMoveVector(0.08, -0.08), { x: 0, y: 0, magnitude: 0 });

  setMoveVector(0.61, -0.37);
  assert.ok(inputState.moveX > 0);
  assert.ok(inputState.moveY < 0);
  assert.ok(Math.abs(inputState.moveX / inputState.moveY - 0.61 / -0.37) < EPSILON);

  resetInput();
  assert.equal(inputState.moveX, 0);
  assert.equal(inputState.moveY, 0);
});

test("转向阻尼不随 30fps 或 60fps 改变结果", () => {
  const up = new Vector3(0, 1, 0);
  const target = new Vector3(0, 0, 1);
  const at30fps = dampTangentTowards(
    new Vector3(1, 0, 0),
    target,
    up,
    5,
    1 / 30,
  );
  const at60fps = new Vector3(1, 0, 0);
  dampTangentTowards(at60fps, target, up, 5, 1 / 60, at60fps);
  dampTangentTowards(at60fps, target, up, 5, 1 / 60, at60fps);

  assert.ok(at30fps.distanceTo(at60fps) < EPSILON);
  assert.ok(Math.abs(dampingFactor(5, 1 / 30) - (1 - Math.exp(-5 / 30))) < EPSILON);
});

test("移动端下方触发区与浮动摇杆结构已接入", async () => {
  const [experience, styles] = await Promise.all([
    readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(experience, /className="touch-stick-zone"/);
  assert.match(experience, /setPointerCapture\(event\.pointerId\)/);
  assert.match(experience, /event\.pointerType !== "touch"/);
  assert.match(experience, /event\.target instanceof HTMLCanvasElement/);
  assert.match(experience, /addEventListener\("pointerdown", beginMove, \{ capture: true/);
  assert.match(experience, /matchMedia\("\(any-pointer: coarse\)"\)/);
  assert.match(experience, /navigator\.maxTouchPoints/);
  assert.match(experience, /touchCapable \? " is-touch" : ""/);
  assert.match(styles, /\.touch-stick-zone\s*\{/);
  assert.match(styles, /height:\s*min\(48svh, 430px\)/);
  assert.match(styles, /\.touch-stick-zone\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(styles, /\.xinhua-stage\.is-touch\s*\{\s*min-height:\s*0/);
  assert.match(styles, /\.xinhua-stage\.is-touch \.touch-controls\s*\{\s*display:\s*block/);
});

test("首页远景按最窄视场适配完整社区并抑制摩尔纹闪烁", async () => {
  const [world, effects, experience] = await Promise.all([
    readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/visual-effects.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(world, /INTRO_MAP_RADIUS/);
  assert.match(world, /Math\.min\(verticalHalfFov, horizontalHalfFov\)/);
  assert.doesNotMatch(world, /INTRO_ORBIT_SPEED|applyAxisAngle\(WORLD_UP, orbit\)/);
  assert.match(world, /direction\.copy\(INTRO_CAMERA_DIRECTION\)/);
  assert.match(world, /prefers-reduced-motion: reduce/);
  assert.match(world, /const reducedMotion = useRef\(\s*typeof window !== "undefined"/s);
  assert.match(world, /reducedMotion\.current\) camera\.position\.copy\(desired\)/);
  assert.match(world, /\{playing && \(\s*<fog/s);
  assert.match(experience, /far: 800 \* mapData\.meta\.environmentScale/);
  assert.match(experience, /const \[lowTier\] = useState\(detectLowTier\)/);
  assert.match(experience, /dpr=\{lowTier \? 1\.25 : \[1, 1\.75\]\}/);
  assert.match(experience, /antialias: true/);
  assert.equal((experience.match(/<EffectComposer/g) ?? []).length, 1);
  assert.match(experience, /multisampling=\{lowTier \? 0 : 2\}/);
  assert.match(experience, /enableNormalPass=\{!lowTier\}/);
  assert.match(experience, /<NormalPassControl enabled=\{playing && !lowTier\} \/>/);
  assert.match(experience, /<InkOutline enabled=\{playing && !lowTier\} \/>/);
  assert.match(experience, /<PaperWash animated=\{playing\} \/>/);
  assert.match(effects, /if \(!enabled\) return null/);
  assert.match(effects, /normalPassRef\.current\.enabled = enabled/);
  assert.match(effects, /effect\.setAnimated\(animated\)/);
  assert.match(effects, /if \(!this\.animated\) return/);
  assert.doesNotMatch(effects, /length\(uv - 0\.5\)/);
  assert.match(effects, /max\(edge\.x, edge\.y\)/);

  const map = JSON.parse(await readFile(
    new URL("../app/scene/xinhua-map-data.json", import.meta.url),
    "utf8",
  ));
  const halfWidth = (map.bounds.maxX - map.bounds.minX) / 2;
  const halfDepth = (map.bounds.maxZ - map.bounds.minZ) / 2;
  const radius = Math.hypot(halfWidth, halfDepth) * 1.08;
  const verticalHalfFov = 58 / 2 * Math.PI / 180;
  const phoneAspect = 390 / 844;
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * phoneAspect);
  const fitDistance = radius / Math.sin(Math.min(verticalHalfFov, horizontalHalfFov));
  const farPlane = 800 * map.meta.environmentScale;
  assert.ok(farPlane > fitDistance + radius, "竖屏远景不应被相机最远裁切面截断");
});

test("进入游玩态时立即把相机从首页远景切到角色身后", async () => {
  const [world, experience] = await Promise.all([
    readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(world, /useLayoutEffect\(\(\) => \{/);
  assert.match(world, /camera\.position\.copy\(cameraBase\)\.add\(cameraOffset\.current\)/);
  assert.match(world, /camera\.lookAt\(cameraTarget\)/);
  assert.match(world, /<IntroCamera active=\{!playing\} \/>/);
  assert.match(world, /\{playing && <PlayableMessenger/);
  assert.match(world, /if \(!activeRef\.current\) return/);
  assert.match(experience, /key=\{playing \? "playing" : "intro"\}/);
  assert.match(experience, /const composer = composerRef\.current/);
  assert.match(experience, /return \(\) => composer\?\.dispose\(\)/);
});
