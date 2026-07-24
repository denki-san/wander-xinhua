import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Vector3 } from "three";
import {
  inputState,
  isTouchJumpRegionActive,
  isTouchTapGesture,
  normalizeMoveVector,
  resetInput,
  setMoveVector,
  shouldSprintFromAnalog,
  triggerJumpPulse,
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

test("走路和跑步可在保持摇杆方向时即时切换", () => {
  assert.equal(shouldSprintFromAnalog(1, 0, false), false);
  assert.equal(shouldSprintFromAnalog(0.7, 0, true), false);
  assert.equal(shouldSprintFromAnalog(1, 0, true), true);

  setMoveVector(1, 0, false);
  assert.equal(inputState.sprint, false);
  setMoveVector(0.7, 0, true);
  assert.equal(inputState.sprint, false);
  setMoveVector(1, 0, true);
  assert.equal(inputState.sprint, true);
  const heldMove = { x: inputState.moveX, y: inputState.moveY };
  setMoveVector(heldMove.x, heldMove.y, false);
  assert.equal(inputState.sprint, false);
  assert.deepEqual(
    { x: inputState.moveX, y: inputState.moveY },
    heldMove,
  );
  setMoveVector(heldMove.x, heldMove.y, true);
  assert.equal(inputState.sprint, true);
  resetInput();
});

test("只有触屏轻点触发跳跃，镜头拖动和鼠标点击不会误触", () => {
  assert.equal(isTouchTapGesture("touch", 0, 120), true);
  assert.equal(isTouchTapGesture("touch", 10, 240), true);
  assert.equal(isTouchTapGesture("touch", 10.1, 120), false);
  assert.equal(isTouchTapGesture("touch", 2, 241), false);
  assert.equal(isTouchTapGesture("mouse", 0, 80), false);
  assert.equal(isTouchTapGesture("touch", Number.NaN, 80), false);
});

test("静止时仅下三分之一可跳，移动时全屏轻点都可跳", () => {
  assert.equal(isTouchJumpRegionActive(false, false, false), false);
  assert.equal(isTouchJumpRegionActive(true, false, false), true);
  assert.equal(isTouchJumpRegionActive(false, true, false), true);
  assert.equal(isTouchJumpRegionActive(false, false, true), true);
});

test("多指跳跃脉冲可以续期且会自动复位", async () => {
  triggerJumpPulse(12);
  assert.equal(inputState.jump, true);
  await new Promise((resolve) => setTimeout(resolve, 6));
  triggerJumpPulse(12);
  await new Promise((resolve) => setTimeout(resolve, 8));
  assert.equal(inputState.jump, true);
  await new Promise((resolve) => setTimeout(resolve, 8));
  assert.equal(inputState.jump, false);
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

test("满幅 180° 转向以更舒缓的速度达到九成", () => {
  const up = new Vector3(0, 1, 0);
  const target = new Vector3(0, 0, 1);
  const current = new Vector3(0, 0, -1);
  const frame = 1 / 60;
  let elapsed = 0;

  while (current.angleTo(target) > Math.PI / 10 && elapsed < 1) {
    dampTangentTowards(current, target, up, 7.2, frame, current, 8.5);
    elapsed += frame;
  }

  assert.ok(elapsed >= 0.38, `转向过快：${elapsed.toFixed(3)}s`);
  assert.ok(elapsed <= 0.5, `转向过慢：${elapsed.toFixed(3)}s`);
});

test("移动端下三分之一共享轻点跳跃和拖动摇杆，且永不显示跳跃按钮", async () => {
  const [experience, styles, world] = await Promise.all([
    readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(experience, /className="touch-stick-zone"/);
  assert.match(experience, /className=\{`touch-stick\$\{origin \? " is-active" : ""\}`\}/);
  assert.match(experience, /setPointerCapture\(event\.pointerId\)/);
  assert.match(experience, /event\.pointerType !== "touch"/);
  assert.match(experience, /event\.target instanceof HTMLCanvasElement/);
  assert.match(experience, /addEventListener\("pointerdown", beginMove, \{ capture: true/);
  assert.match(experience, /matchMedia\("\(any-pointer: coarse\)"\)/);
  assert.match(experience, /navigator\.maxTouchPoints/);
  assert.match(experience, /get\("touchQa"\) === "1"/);
  assert.match(experience, /touchCapable \? " is-touch" : ""/);
  assert.match(experience, /new URLSearchParams\(window\.location\.search\)\.get\("start"\)/);
  assert.match(experience, /setMode\(requestedPreset \? "explore" : "overview"\)/);
  assert.match(experience, /useState<"walk" \| "run">\("run"\)/);
  assert.match(experience, /aria-label="移动速度模式"/);
  assert.match(experience, /onPointerDown=\{\(event\) => \{[\s\S]*?selectPace\("walk"\)/);
  assert.match(experience, /onPointerDown=\{\(event\) => \{[\s\S]*?selectPace\("run"\)/);
  assert.match(experience, /onClick=\{\(\) => selectPace\("walk"\)\}/);
  assert.match(experience, /onClick=\{\(\) => selectPace\("run"\)\}/);
  assert.match(experience, /<TouchControls showPace=\{exploring\} \/>/);
  assert.match(experience, /手机下方三分之一区域轻点跳跃、拖动移动；移动中第二指可在全屏轻点跳跃或拖动视角/);
  assert.match(experience, /if \(!moveActivated\.current && length <= TOUCH_TAP_MAX_TRAVEL\) return/);
  assert.match(experience, /secondaryTapCandidates/);
  assert.match(experience, /startedInStickZone: insideStickZone/);
  assert.match(experience, /startedWhileMoving: moveActivated\.current/);
  assert.match(experience, /第二根手指不拦截 Canvas/);
  assert.match(experience, /isTouchJumpRegionActive\(/);
  const secondaryPointerBranchStart = experience.indexOf("if (pointerId.current !== null)");
  const idleZoneGuardStart = experience.indexOf("if (!insideStickZone) return");
  assert.ok(secondaryPointerBranchStart >= 0);
  assert.ok(idleZoneGuardStart > secondaryPointerBranchStart);
  assert.doesNotMatch(
    experience.slice(secondaryPointerBranchStart, idleZoneGuardStart),
    /preventDefault|stopPropagation|setPointerCapture/,
  );
  assert.match(experience, /isTouchTapGesture\(/);
  assert.match(experience, /triggerJumpPulse\(\)/);
  assert.doesNotMatch(experience, /touch-jump/);
  assert.doesNotMatch(experience, /aria-label="跳跃"/);
  assert.doesNotMatch(world, /isTouchTapGesture\(/);
  assert.doesNotMatch(world, /triggerJumpPulse\(\)/);
  assert.match(world, /canvas\.hasPointerCapture\(activePointerId\)/);
  assert.match(world, /canvas\.releasePointerCapture\(activePointerId\)/);
  assert.match(world, /cancelDrag\(\);\s*canvas\.removeEventListener\("pointerdown"/);
  assert.match(styles, /\.touch-stick-zone\s*\{/);
  assert.match(styles, /\.touch-stick-zone\s*\{[^}]*bottom:\s*0/s);
  assert.match(styles, /\.touch-stick-zone\s*\{[^}]*left:\s*0/s);
  assert.match(styles, /\.touch-stick-zone\s*\{[^}]*width:\s*100%/s);
  assert.match(styles, /\.touch-stick-zone\s*\{[^}]*height:\s*calc\(100% \/ 3\)/s);
  assert.match(styles, /\.touch-stick-zone\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(styles, /\.xinhua-stage\.is-touch\s*\{\s*min-height:\s*0/);
  assert.match(styles, /\.xinhua-stage\.is-touch \.touch-controls\s*\{\s*display:\s*block/);
  assert.match(styles, /\.touch-stick\s*\{[^}]*visibility:\s*hidden/s);
  assert.match(styles, /\.touch-stick\s*\{[^}]*opacity:\s*0/s);
  assert.match(styles, /\.touch-stick\.is-active\s*\{[^}]*visibility:\s*visible/s);
  assert.match(styles, /\.touch-stick\.is-active\s*\{[^}]*opacity:\s*1/s);
  assert.doesNotMatch(styles, /\.touch-jump\s*\{/);
  assert.match(styles, /\.touch-pace-toggle\s*\{[^}]*right:\s*14px/s);
  assert.match(styles, /\.touch-pace-toggle\s*\{[^}]*bottom:\s*22px/s);
  assert.match(styles, /\.touch-pace-toggle button\.is-active\s*\{/);
});

test("游玩舞台禁止文字选择和 iOS 长按菜单", async () => {
  const styles = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(styles, /\.xinhua-stage\s*\{[^}]*-webkit-touch-callout:\s*none/s);
  assert.match(styles, /\.xinhua-stage\s*\{[^}]*-webkit-user-select:\s*none/s);
  assert.match(styles, /\.xinhua-stage\s*\{[^}]*user-select:\s*none/s);
});

test("探索和全览人物速度均小幅降低", async () => {
  const world = await readFile(
    new URL("../app/scene/xinhua-world.tsx", import.meta.url),
    "utf8",
  );

  assert.match(world, /const CHARACTER_TURN_DAMPING = 7\.2/);
  assert.match(world, /const CHARACTER_MAX_TURN_SPEED = 8\.5/);
  assert.match(world, /const EXPLORE_WALK_SPEED = 3\.1/);
  assert.match(world, /const EXPLORE_RUN_SPEED = 6\.8/);
  assert.match(world, /const OVERVIEW_MOVE_SPEED = 94/);
  assert.match(world, /EXPLORE_WALK_SPEED \* \(usingAnalog \? analogMagnitude : 1\)/);
});

test("反向转身与状态化构图不会被相机反馈环改写", async () => {
  const world = await readFile(
    new URL("../app/scene/xinhua-world.tsx", import.meta.url),
    "utf8",
  );

  assert.match(world, /const CAMERA_DISTANCE = 5\.35/);
  assert.match(world, /const CAMERA_FORWARD_FOLLOW_HEIGHT = 2\.25/);
  assert.match(
    world,
    /const CAMERA_DEFAULT_PITCH = CAMERA_FORWARD_FOLLOW_HEIGHT\s*\/ Math\.hypot\(CAMERA_DISTANCE, CAMERA_FORWARD_FOLLOW_HEIGHT\)/,
  );
  assert.match(world, /const reverseTurnActive = useRef\(false\)/);
  assert.match(world, /reverseMoveDirection\.current\.copy\(s\.inputMove\)/);
  assert.match(world, /movementCameraFollowWeight\(\s*x,\s*z,\s*reverseTurnActive\.current/s);
  assert.match(
    world,
    /CAMERA_DEFAULT_PITCH - currentPitch\) \* dampingFactor\(followDamping, delta\)/,
  );
  assert.match(world, /s\.move\.copy\(reverseMoveDirection\.current\)/);
  assert.match(world, /reverseTurnTranslationScale\(/);
  assert.match(world, /CAMERA_FORWARD_FRAMING_RIGHT_OFFSET \* forwardFramingWeight\(x, z\)/);
  assert.match(world, /CAMERA_STOP_FRAMING_DISTANCE \* lastLateralMoveWeight\.current \* settleEnvelope/);
  assert.match(world, /idleFramingElapsed\.current \+= Math\.max\(0, rawDelta\)/);
  assert.match(world, /cameraLookTarget\.copy\(s\.cameraTarget\)\.add\(cameraFramingOffset\.current\)/);
  assert.match(world, /camera\.lookAt\(s\.cameraLookTarget\)/);
  assert.doesNotMatch(
    world,
    /\.addScaledVector\(s\.rigRight, CAMERA_TARGET_SHOULDER_OFFSET\)\s*\.add\(cameraFramingOffset\.current\)/,
  );
  assert.doesNotMatch(world, /inputState\.sprint[\s\S]{0,120}movementCameraFollowWeight/);
});

test("首页远景按最窄视场适配完整社区并抑制摩尔纹闪烁", async () => {
  const [world, effects, experience, roadLandmarks] = await Promise.all([
    readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/visual-effects.tsx", import.meta.url), "utf8"),
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
  assert.equal((experience.match(/<EffectComposer/g) ?? []).length, 1);
  assert.match(experience, /multisampling=\{lowTier \? 0 : 2\}/);
  assert.match(experience, /const VisualEffectComposer = memo/);
  assert.match(experience, /enableNormalPass=\{!lowTier\}/);
  assert.match(experience, /<SSAO/);
  assert.match(experience, /<ToneMapping mode=\{ToneMappingMode\.ACES_FILMIC\} \/>/);
  assert.match(experience, /<InkOutline atmosphereStyle=\{atmosphereStyle\} \/>/);
  assert.match(experience, /<PaperWash atmosphereStyle=\{atmosphereStyle\} \/>/);
  assert.doesNotMatch(experience, /<NormalPassControl/);
  assert.match(experience, /<VisualEffectComposer lowTier=\{lowTier\} atmosphereStyle=\{atmosphereStyle\} \/>/);
  assert.doesNotMatch(experience, /\{!playing && \(\s*<VisualEffectComposer/s);
  assert.doesNotMatch(experience, /key=\{mode\}/);
  assert.match(world, /<XinhuaRoadLandmarks[\s\S]*?showLabels=\{showDetailLabels\}[\s\S]*?priorityPreset=\{priorityPreset\}[\s\S]*?loadMode=\{landmarkLoadMode\}/);
  assert.doesNotMatch(roadLandmarks, /LandmarkLoadingVolume/);
  assert.match(roadLandmarks, /<Suspense fallback=\{null\}>/);
  assert.match(effects, /const LIGHTING_V3_OUTLINE_STRENGTH = 0\.32/);
  assert.match(effects, /const AUTUMN_AFTERNOON_OUTLINE_STRENGTH = 0\.56/);
  assert.match(effects, /\["uStrength", new Uniform\(strength\)\]/);
  assert.match(effects, /\["uColor", new Uniform\(new Color\("#31423f"\)\)\]/);
  assert.doesNotMatch(effects, /setEnabled|activeStrength/);
  assert.match(effects, /texture2D\(inputBuffer, uv \+ offset\)\.rgb/);
  assert.doesNotMatch(effects, /uNormalBuffer/);
  assert.doesNotMatch(effects, /setAnimated|private animated/);
  assert.doesNotMatch(effects, /length\(uv - 0\.5\)/);
  assert.match(effects, /max\(edge\.x, edge\.y\)/);

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
  const [world, experience] = await Promise.all([
    readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(world, /useLayoutEffect\(\(\) => \{/);
  assert.match(world, /cameraBase\.addScaledVector\(cameraRight, CAMERA_SHOULDER_OFFSET\)/);
  assert.match(world, /cameraTarget\.addScaledVector\(cameraRight, CAMERA_TARGET_SHOULDER_OFFSET\)/);
  assert.match(world, /const desiredCamera = cameraBase\.clone\(\)\.add\(cameraOffset\.current\)/);
  assert.match(world, /resolvePlanarSpringArm\(/);
  assert.match(world, /addScaledVector\(armDirection\.normalize\(\), resolvedArmLength\.current\)/);
  assert.match(world, /camera\.lookAt\(cameraTarget\)/);
  assert.match(world, /addScaledVector\(s\.rigRight, CAMERA_SHOULDER_OFFSET\)/);
  assert.match(world, /addScaledVector\(s\.rigRight, CAMERA_TARGET_SHOULDER_OFFSET\)/);
  assert.match(world, /<IntroCamera active=\{mode === "intro"\} \/>/);
  assert.match(world, /\{exploring && \(\s*<PlayableWanderer/s);
  assert.match(world, /if \(!activeRef\.current\) return/);
  assert.match(experience, /const composer = composerRef\.current/);
  assert.match(experience, /return \(\) => composer\?\.dispose\(\)/);
  assert.match(experience, /<VisualEffectComposer lowTier=\{lowTier\} atmosphereStyle=\{atmosphereStyle\} \/>/);
  assert.match(world, /cameraRelativeInputToPlanarMove\(/);
  assert.match(world, /camera\.getWorldDirection\(s\.viewForward\)/);
  assert.match(world, /addScaledVector\(s\.rigRight, CAMERA_SHOULDER_OFFSET\)/);
  assert.match(world, /stepSpringArmLength\(/);
  assert.match(world, /CAMERA_MANUAL_FOLLOW_GRACE_SECONDS = 0\.35/);
  assert.match(world, /remainingDeadlineMs\(manualFollowGraceUntilMs\.current, performance\.now\(\)\)/);
  assert.match(world, /CAMERA_MIN_ZOOM_DISTANCE = 4\.6/);
  assert.match(world, /nextCameraZoomDistance\(/);
  assert.match(world, /normalizeWheelDeltaY\(/);
  assert.match(world, /const CHARACTER_MAX_TURN_SPEED = 8\.5/);
  assert.match(world, /resolvedArmLength\.current \?\? collisionArmLength/);
  assert.doesNotMatch(world, /Math\.max\(6\.4, zoom\.current/);
  assert.doesNotMatch(world, /driveSignature|CAMERA_FALLBACK_YAWS|lastSafeCameraPosition/);
  assert.doesNotMatch(world, /addScaledVector\(currentForward, -0\.52\)/);
});

test("探索态使用视口自适应 FOV，并提供只读相机 QA 遥测", async () => {
  const [world, experience] = await Promise.all([
    readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(world, /function ResponsiveCameraProjection/);
  assert.match(world, /explorationVerticalFov\(size\.width, size\.height\)/);
  assert.match(world, /<ResponsiveCameraProjection exploring=\{exploring\} \/>/);
  assert.match(world, /updateCameraQa\(\{/);
  assert.match(world, /if \(cameraQaEnabled\) \{\s*updateCameraQa\(\{/);
  assert.match(world, /desiredArmYawDegrees:/);
  assert.match(world, /actualArmYawDegrees:/);
  assert.match(experience, /cameraQaEnabled=\{cameraQaVisible\}/);
  assert.match(experience, /get\("cameraQa"\) === "1"/);
  assert.match(experience, /data-testid="camera-qa"/);
});
