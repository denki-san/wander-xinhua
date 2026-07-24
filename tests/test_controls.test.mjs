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
  assert.match(experience, /new URLSearchParams\(window\.location\.search\)\.get\("start"\)/);
  assert.match(experience, /setMode\(requestedPreset \? "explore" : "overview"\)/);
  assert.match(styles, /\.touch-stick-zone\s*\{/);
  assert.match(styles, /height:\s*50svh/);
  assert.doesNotMatch(styles, /\.touch-stick-zone\s*\{[^}]*max-height:/s);
  assert.match(styles, /\.touch-stick-zone\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(styles, /\.xinhua-stage\.is-touch\s*\{\s*min-height:\s*0/);
  assert.match(styles, /\.xinhua-stage\.is-touch \.touch-controls\s*\{\s*display:\s*block/);
});

test("首页远景按最窄视场适配完整社区并抑制摩尔纹闪烁", async () => {
  const [world, postEffects, composer, experience, roadLandmarks] = await Promise.all([
    readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/postprocessing-effects.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/visual-effect-composer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/xinhua-road-landmarks.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(world, /INTRO_MAP_RADIUS/);
  assert.match(world, /Math\.min\(verticalHalfFov, horizontalHalfFov\)/);
  assert.doesNotMatch(world, /INTRO_ORBIT_SPEED|applyAxisAngle\(WORLD_UP, orbit\)/);
  assert.match(world, /direction\.copy\(INTRO_CAMERA_DIRECTION\)/);
  assert.match(world, /prefers-reduced-motion: reduce/);
  assert.match(world, /const reducedMotion = useRef\(\s*typeof window !== "undefined"/s);
  assert.match(world, /reducedMotion\.current\) camera\.position\.copy\(desired\)/);
  assert.match(world, /\{exploring && \(\s*<fog/s);
  assert.match(experience, /far: 800 \* mapData\.meta\.environmentScale/);
  assert.match(experience, /fov:\s*50/);
  assert.match(experience, /const \[lowTier\] = useState\(detectLowTier\)/);
  assert.match(experience, /dpr=\{lowTier \? 1\.25 : \[1, 1\.75\]\}/);
  assert.match(experience, /antialias: true/);
  assert.equal((composer.match(/<EffectComposer/g) ?? []).length, 1);
  assert.match(composer, /multisampling=\{lowTier \? 0 : 2\}/);
  assert.match(composer, /const VisualEffectComposer = memo/);
  assert.match(composer, /enableNormalPass=\{!lowTier\}/);
  assert.match(composer, /<SSAO/);
  assert.match(composer, /<ToneMapping mode=\{ToneMappingMode\.ACES_FILMIC\} \/>/);
  assert.match(composer, /<InkOutline atmosphereStyle=\{atmosphereStyle\} \/>/);
  assert.match(composer, /<PaperWash atmosphereStyle=\{atmosphereStyle\} \/>/);
  assert.doesNotMatch(composer, /<NormalPassControl/);
  assert.match(experience, /<ProgressiveVisualEffectComposer/);
  assert.match(experience, /ready && networkProfile === "standard"/);
  assert.doesNotMatch(experience, /key=\{mode\}/);
  assert.match(world, /<ProgressiveXinhuaRoadFullLayer/);
  assert.doesNotMatch(roadLandmarks, /LandmarkLoadingVolume/);
  assert.match(roadLandmarks, /<ProgressiveFeatureBoundary/);
  assert.match(roadLandmarks, /<LandmarkProgressiveProxy landmark=\{landmark\} identity \/>/);
  assert.match(postEffects, /const LIGHTING_V3_OUTLINE_STRENGTH = 0\.32/);
  assert.match(postEffects, /const AUTUMN_AFTERNOON_OUTLINE_STRENGTH = 0\.56/);
  assert.match(postEffects, /\["uStrength", new Uniform\(strength\)\]/);
  assert.match(postEffects, /\["uColor", new Uniform\(new Color\("#31423f"\)\)\]/);
  assert.doesNotMatch(postEffects, /setEnabled|activeStrength/);
  assert.match(postEffects, /texture2D\(inputBuffer, uv \+ offset\)\.rgb/);
  assert.doesNotMatch(postEffects, /uNormalBuffer/);
  assert.doesNotMatch(postEffects, /setAnimated|private animated/);
  assert.doesNotMatch(postEffects, /length\(uv - 0\.5\)/);
  assert.match(postEffects, /max\(edge\.x, edge\.y\)/);

  const map = JSON.parse(await readFile(
    new URL("../app/scene/xinhua-map-data.json", import.meta.url),
    "utf8",
  ));
  const halfWidth = (map.bounds.maxX - map.bounds.minX) / 2;
  const halfDepth = (map.bounds.maxZ - map.bounds.minZ) / 2;
  const radius = Math.hypot(halfWidth, halfDepth) * 1.08;
  const verticalHalfFov = 50 / 2 * Math.PI / 180;
  const phoneAspect = 390 / 844;
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * phoneAspect);
  const fitDistance = radius / Math.sin(Math.min(verticalHalfFov, horizontalHalfFov));
  const farPlane = 800 * map.meta.environmentScale;
  assert.ok(farPlane > fitDistance + radius, "竖屏远景不应被相机最远裁切面截断");
});

test("进入游玩态时立即切到低位后肩镜头且视觉合成器不重挂", async () => {
  const [world, experience, composer] = await Promise.all([
    readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/visual-effect-composer.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(world, /useLayoutEffect\(\(\) => \{/);
  assert.match(world, /cameraBase\.addScaledVector\(cameraRight, CAMERA_SHOULDER_OFFSET\)/);
  assert.match(world, /cameraTarget\.addScaledVector\(cameraRight, CAMERA_TARGET_SHOULDER_OFFSET\)/);
  assert.match(world, /camera\.position\.copy\(cameraBase\)\.add\(cameraOffset\.current\)/);
  assert.match(world, /camera\.lookAt\(cameraTarget\)/);
  assert.match(world, /addScaledVector\(s\.cameraRight, CAMERA_SHOULDER_OFFSET\)/);
  assert.match(world, /addScaledVector\(s\.cameraRight, CAMERA_TARGET_SHOULDER_OFFSET\)/);
  assert.match(world, /<IntroCamera active=\{mode === "intro"\} \/>/);
  assert.match(world, /\{exploring && \(\s*<PlayableWanderer/s);
  assert.match(world, /if \(!activeRef\.current\) return/);
  assert.match(composer, /const composer = composerRef\.current/);
  assert.match(composer, /return \(\) => composer\?\.dispose\(\)/);
  assert.match(experience, /<ProgressiveVisualEffectComposer/);
  assert.match(world, /lastSafeCameraPosition/);
  assert.match(world, /isPlanarCameraCandidateClearInPolygon/);
  assert.doesNotMatch(world, /addScaledVector\(currentForward, -0\.52\)/);
});
