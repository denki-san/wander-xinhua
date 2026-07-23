"use client";

/* eslint-disable @next/next/no-html-link-for-pages */

import { EffectComposer } from "@react-three/postprocessing";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Color,
  Group,
  Material,
  MathUtils,
  Mesh,
  Vector3,
} from "three";
import { InkOutline, PaperWash, WatercolourSky } from "../scene/visual-effects";
import { XingfuliBlock } from "../scene/xingfuli-block";
import styles from "./style-lab.module.css";

type StyleId = "atlas" | "summer" | "comic";
type MovementKey = "forward" | "back" | "left" | "right";
type CharacterQaMotion = "walk" | "run" | null;

type StyleContract = {
  id: StyleId;
  number: string;
  name: string;
  english: string;
  thesis: string;
  palette: string[];
  proof: string;
};

const STYLE_CONTRACTS: StyleContract[] = [
  {
    id: "atlas",
    number: "01",
    name: "新华墨线档案",
    english: "INK ATLAS",
    thesis: "证据优先。冷青水彩、真实比例与地图阅读感共同建立一份可漫游的社区档案。",
    palette: ["#69bab6", "#e9e7df", "#485d58", "#d5b966"],
    proof: "保留当前版本，作为真实空间、建筑身份和既有墨线语言的基线。",
  },
  {
    id: "summer",
    number: "02",
    name: "新华盛夏绘本",
    english: "SUMMER STORYBOOK",
    thesis: "情绪优先。奶油云、低角度暖阳、梧桐绿与可爱漫游者把新华路定格在盛夏傍晚。",
    palette: ["#73b9e8", "#ffe8b0", "#688f62", "#d87863"],
    proof: "让天空、道路纵深、人物比例和长阴影共同表达同一个下午，而不只是叠加滤镜。",
  },
  {
    id: "comic",
    number: "03",
    name: "新华漫画微缩城",
    english: "COMIC DIORAMA",
    thesis: "传播优先。粗轮廓、海报色块、图形云和夸张角色把真实街区变成一座城市玩具。",
    palette: ["#66c5c2", "#f3ead8", "#263a38", "#e6654f"],
    proof: "建筑位置与身份不变，但每一帧都强调剪影、色块和可分享的漫画构图。",
  },
];

const STYLE_INPUT: Record<MovementKey, boolean> = {
  forward: false,
  back: false,
  left: false,
  right: false,
};

const STYLE_NUDGE: Record<MovementKey, number> = {
  forward: 0,
  back: 0,
  left: 0,
  right: 0,
};

const STYLE_SPRINT = { active: false };

const STYLE_BY_ID = Object.fromEntries(
  STYLE_CONTRACTS.map((contract) => [contract.id, contract]),
) as Record<StyleId, StyleContract>;

const STYLE_URL_EVENT = "style-lab-url-change";
const RAIN_CHARACTER_PATH = "/models/character/rain-summer-wanderer.glb?v=151816b1fe82";

function requestedStyle(): StyleId {
  if (typeof window === "undefined") return "atlas";
  const style = new URLSearchParams(window.location.search).get("style");
  return style === "summer" || style === "comic" ? style : "atlas";
}

function requestedQaMotion(): CharacterQaMotion {
  if (typeof window === "undefined") return null;
  const motion = new URLSearchParams(window.location.search).get("qaMotion");
  return motion === "walk" || motion === "run" ? motion : null;
}

function subscribeToRequestedStyle(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(STYLE_URL_EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(STYLE_URL_EVENT, callback);
  };
}

function useStyleLabKeyboard(onStyle: (style: StyleId) => void) {
  useEffect(() => {
    const movement: Record<string, MovementKey> = {
      KeyW: "forward",
      ArrowUp: "forward",
      KeyS: "back",
      ArrowDown: "back",
      KeyA: "left",
      ArrowLeft: "left",
      KeyD: "right",
      ArrowRight: "right",
    };
    const stylesByKey: Record<string, StyleId> = {
      Digit1: "atlas",
      Digit2: "summer",
      Digit3: "comic",
    };
    const update = (event: KeyboardEvent, value: boolean) => {
      const movementKey = movement[event.code];
      if (movementKey) {
        event.preventDefault();
        setInput(movementKey, value);
      }
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
        event.preventDefault();
        STYLE_SPRINT.active = value;
      }
      if (value && stylesByKey[event.code]) onStyle(stylesByKey[event.code]);
    };
    const down = (event: KeyboardEvent) => update(event, true);
    const up = (event: KeyboardEvent) => update(event, false);
    const reset = () => {
      Object.keys(STYLE_INPUT).forEach((key) => {
        const movementKey = key as MovementKey;
        STYLE_INPUT[movementKey] = false;
        STYLE_NUDGE[movementKey] = 0;
      });
      STYLE_SPRINT.active = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
      reset();
    };
  }, [onStyle]);
}

function setInput(key: MovementKey, value: boolean) {
  if (value && !STYLE_INPUT[key]) STYLE_NUDGE[key] += 0.55;
  STYLE_INPUT[key] = value;
}

function clearStyleNudge() {
  Object.keys(STYLE_NUDGE).forEach((key) => {
    STYLE_NUDGE[key as MovementKey] = 0;
  });
}

function CloudCluster({
  position,
  scale,
  color,
  graphic = false,
}: {
  position: [number, number, number];
  scale: number;
  color: string;
  graphic?: boolean;
}) {
  const parts = graphic
    ? [
      [0, 0, 0, 2.1, 0.72],
      [-1.7, -0.1, 0.1, 1.35, 0.62],
      [1.65, -0.08, -0.08, 1.42, 0.66],
      [-0.55, 0.48, -0.05, 1.28, 0.84],
      [0.78, 0.38, 0.05, 1.05, 0.78],
    ]
    : [
      [0, 0, 0, 2.2, 0.88],
      [-1.65, -0.12, 0.08, 1.3, 0.75],
      [1.72, -0.08, -0.12, 1.5, 0.76],
      [-0.62, 0.6, -0.08, 1.42, 1.05],
      [0.72, 0.5, 0.08, 1.18, 0.96],
    ];
  return (
    <group position={position} scale={scale} rotation-y={Math.PI / 2}>
      {parts.map(([x, y, z, width, height], index) => (
        <mesh key={index} position={[x, y, z]} scale={[width, height, 0.72]}>
          <sphereGeometry args={[1, graphic ? 10 : 18, graphic ? 7 : 12]} />
          <meshToonMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}

function SummerAtmosphere() {
  return (
    <group name="summer-storybook-atmosphere">
      <mesh position={[64, 17.5, -35]}>
        <sphereGeometry args={[4.5, 24, 16]} />
        <meshBasicMaterial color="#ffd37d" />
      </mesh>
      <CloudCluster position={[48, 15.5, -17]} scale={2.1} color="#fff1cf" />
      <CloudCluster position={[72, 16.5, 0]} scale={1.65} color="#fff7df" />
      <CloudCluster position={[35, 13, -29]} scale={1.35} color="#ffe7b0" />
      {[-26, -8, 14, 34].map((z, index) => (
        <mesh key={z} position={[58 + index * 8, 4.5 + index % 2, z]} scale={[8, 5.4, 6]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshToonMaterial color={index % 2 ? "#4f7755" : "#628a5e"} />
        </mesh>
      ))}
    </group>
  );
}

function ComicAtmosphere() {
  return (
    <group name="comic-diorama-atmosphere">
      <mesh position={[68, 17, -35]}>
        <sphereGeometry args={[4.3, 16, 10]} />
        <meshBasicMaterial color="#f6c64d" />
      </mesh>
      <CloudCluster position={[46, 15.5, -17]} scale={2} color="#f4f0df" graphic />
      <CloudCluster position={[72, 16.5, 0]} scale={1.6} color="#f4f0df" graphic />
      <CloudCluster position={[34, 13, -29]} scale={1.3} color="#f4f0df" graphic />
      {[-27, -10, 10, 29].map((z, index) => (
        <mesh key={z} position={[58 + index * 9, 4.2 + index % 2, z]} scale={[7.6, 5.2, 5.4]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshToonMaterial color={index % 2 ? "#46775b" : "#57906a"} />
        </mesh>
      ))}
    </group>
  );
}

type ColorMaterial = Material & {
  color?: Color;
  roughness?: number;
  metalness?: number;
  flatShading?: boolean;
};

function retintMaterial(material: ColorMaterial, style: StyleId) {
  if (!material.color || style === "atlas") return;
  const hsl = { h: 0, s: 0, l: 0 };
  material.color.getHSL(hsl);
  const isGreen = hsl.h > 0.19 && hsl.h < 0.48 && hsl.s > 0.13;
  const isBlue = hsl.h >= 0.48 && hsl.h < 0.66 && hsl.s > 0.1;
  const isWarm = (hsl.h < 0.15 || hsl.h > 0.94) && hsl.s > 0.14;
  let target: string;

  if (style === "summer") {
    if (isGreen) target = hsl.l < 0.38 ? "#42694d" : "#6e9568";
    else if (isBlue) target = hsl.l < 0.45 ? "#5e8587" : "#8eb4b4";
    else if (isWarm) target = "#cf725f";
    else if (hsl.l > 0.7) target = "#f2e5cb";
    else if (hsl.l < 0.32) target = "#385148";
    else target = "#b6ae96";
    material.color.lerp(new Color(target), 0.7);
    if ("roughness" in material) material.roughness = 0.88;
  } else {
    if (isGreen) target = hsl.l < 0.38 ? "#315945" : "#57906a";
    else if (isBlue) target = "#69b9b5";
    else if (isWarm) target = "#e6654f";
    else if (hsl.l > 0.68) target = "#f1e9d8";
    else if (hsl.l < 0.34) target = "#263a38";
    else target = "#839086";
    material.color.copy(new Color(target));
    if ("roughness" in material) material.roughness = 0.96;
    if ("metalness" in material) material.metalness = 0;
    if ("flatShading" in material) material.flatShading = true;
  }
  material.needsUpdate = true;
}

function StyledXingfuli({ style }: { style: StyleId }) {
  const root = useRef<Group>(null);
  const retinted = useRef(new WeakSet<Material>());
  useFrame(() => {
    root.current?.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (retinted.current.has(material)) return;
        retinted.current.add(material);
        retintMaterial(material as ColorMaterial, style);
        object.castShadow = true;
        object.receiveShadow = true;
      });
    });
  });
  return (
    <group ref={root} key={style} name={`style-${style}-xingfuli`}>
      <XingfuliBlock loadDetailedArchitecture />
    </group>
  );
}

function StreetGround({ style }: { style: StyleId }) {
  const ground = style === "summer" ? "#d8cda9" : style === "comic" ? "#d7d2bd" : "#a6aaa0";
  const lane = style === "summer" ? "#bdad88" : style === "comic" ? "#b7b8aa" : "#8e9690";
  return (
    <group>
      <mesh position={[0, 0, -7]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[145, 70]} />
        <meshToonMaterial color={ground} />
      </mesh>
      <mesh position={[0, 0.025, -7]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[112, 9.2]} />
        <meshToonMaterial color={lane} />
      </mesh>
      {Array.from({ length: 22 }, (_, index) => (
        <mesh key={index} position={[-48 + index * 4.7, 0.045, -7]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[2.35, 0.08]} />
          <meshBasicMaterial color={style === "comic" ? "#f2ead8" : "#e4dac0"} />
        </mesh>
      ))}
    </group>
  );
}

function DemoCharacter({
  style,
}: {
  style: StyleId;
}) {
  const { camera } = useThree();
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const position = useRef(new Vector3(-31, 0.12, -7));
  const velocity = useRef(new Vector3());
  const phase = useRef(0);
  const cameraGoal = useMemo(() => new Vector3(), []);
  const cameraTarget = useMemo(() => new Vector3(), []);

  const profile = style === "summer"
    ? {
      skin: "#b87958", hair: "#26302d", upper: "#fff0c8", lower: "#52628f", shoes: "#735548",
      head: 0.32, headY: 1.67, torsoWidth: 0.62, torsoY: 1.18, torsoHeight: 0.68,
    }
    : style === "comic"
      ? {
        skin: "#c88969", hair: "#263a38", upper: "#2f6660", lower: "#253e50", shoes: "#f2bd3e",
        head: 0.37, headY: 1.65, torsoWidth: 0.7, torsoY: 1.12, torsoHeight: 0.66,
      }
      : {
        skin: "#c99373", hair: "#111c1c", upper: "#657772", lower: "#202b2f", shoes: "#555650",
        head: 0.24, headY: 1.72, torsoWidth: 0.55, torsoY: 1.2, torsoHeight: 0.74,
      };

  useEffect(() => {
    camera.position.set(-40, 4.7, -4.8);
    camera.lookAt(-28, 1.42, -7);
  }, [camera]);

  useFrame((_, delta) => {
    const forward = Number(STYLE_INPUT.forward) - Number(STYLE_INPUT.back);
    const side = Number(STYLE_INPUT.right) - Number(STYLE_INPUT.left);
    velocity.current.set(forward, 0, side);
    let strength = Math.min(1, velocity.current.length());
    let travel = 4.6 * Math.min(delta, 1 / 30);
    if (strength > 0) clearStyleNudge();
    if (strength === 0) {
      const nudgeForward = STYLE_NUDGE.forward - STYLE_NUDGE.back;
      const nudgeSide = STYLE_NUDGE.right - STYLE_NUDGE.left;
      velocity.current.set(nudgeForward, 0, nudgeSide);
      strength = Math.min(1, velocity.current.length());
      if (strength > 0) {
        travel = Math.min(0.8, velocity.current.length());
        clearStyleNudge();
      }
    }
    if (strength > 0) {
      velocity.current.normalize().multiplyScalar(travel);
      position.current.add(velocity.current);
      position.current.x = MathUtils.clamp(position.current.x, -39, 39);
      position.current.z = MathUtils.clamp(position.current.z, -10.5, -3.2);
      phase.current += delta * 9.5;
    } else {
      phase.current += delta * 2.1;
    }
    const stride = Math.sin(phase.current) * strength;
    if (root.current) {
      root.current.position.copy(position.current);
      if (strength > 0) root.current.rotation.y = Math.atan2(velocity.current.x, velocity.current.z);
    }
    if (body.current) body.current.position.y = strength > 0
      ? Math.abs(stride) * 0.055
      : Math.sin(phase.current) * 0.018;
    if (leftArm.current) leftArm.current.rotation.x = stride * 0.65;
    if (rightArm.current) rightArm.current.rotation.x = -stride * 0.65;
    if (leftLeg.current) leftLeg.current.rotation.x = -stride * 0.58;
    if (rightLeg.current) rightLeg.current.rotation.x = stride * 0.58;
    cameraGoal.set(position.current.x - 9.2, 4.45, position.current.z + 2.25);
    camera.position.lerp(cameraGoal, 1 - Math.exp(-delta * 4.2));
    cameraTarget.set(position.current.x + 5.2, 1.62, position.current.z);
    camera.lookAt(cameraTarget);
  });

  return (
    <group ref={root} rotation-y={Math.PI / 2} name={`style-${style}-wanderer`}>
      <mesh position={[0, 0.035, 0]} rotation-x={-Math.PI / 2} scale={[0.72, 1.08, 1]}>
        <circleGeometry args={[0.5, 24]} />
        <meshBasicMaterial color="#263a38" transparent opacity={0.22} />
      </mesh>
      <group ref={body} scale={style === "comic" ? 1.08 : 1}>
        <mesh position={[0, profile.torsoY, 0]} castShadow>
          <capsuleGeometry args={[profile.torsoWidth * 0.42, profile.torsoHeight * 0.58, 6, 12]} />
          <meshToonMaterial color={profile.upper} />
        </mesh>
        <group position={[0, profile.headY, 0]}>
          <mesh scale={[0.92, 1.03, 0.9]} castShadow>
            <sphereGeometry args={[profile.head, 18, 13]} />
            <meshToonMaterial color={profile.skin} />
          </mesh>
          <mesh position={[0, profile.head * 0.24, -profile.head * 0.08]} scale={[0.98, 0.78, 0.95]} castShadow>
            <sphereGeometry args={[profile.head * 1.03, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
            <meshToonMaterial color={profile.hair} />
          </mesh>
          {[-0.115, 0.115].map((x) => (
            <mesh key={x} position={[x, -0.015, profile.head * 0.86]}>
              <sphereGeometry args={[style === "comic" ? 0.028 : 0.021, 8, 6]} />
              <meshBasicMaterial color="#182220" />
            </mesh>
          ))}
          {style === "summer" && (
            <group position={[0, profile.head * 0.84, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.48, 0.48, 0.055, 24]} />
                <meshToonMaterial color="#e1b45e" />
              </mesh>
              <mesh position={[0, 0.14, 0]} castShadow>
                <cylinderGeometry args={[0.24, 0.29, 0.25, 18]} />
                <meshToonMaterial color="#edc878" />
              </mesh>
              <mesh position={[0, 0.06, 0]}>
                <cylinderGeometry args={[0.295, 0.295, 0.06, 18]} />
                <meshToonMaterial color="#a65e49" />
              </mesh>
            </group>
          )}
          {style === "comic" && (
            <group position={[0, profile.head * 0.82, -0.02]} rotation-z={-0.08}>
              <mesh castShadow>
                <sphereGeometry args={[0.29, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
                <meshToonMaterial color="#df5e4d" />
              </mesh>
              <mesh position={[0, -0.02, 0.23]} scale={[1.4, 0.45, 0.8]} castShadow>
                <sphereGeometry args={[0.2, 12, 7]} />
                <meshToonMaterial color="#df5e4d" />
              </mesh>
            </group>
          )}
        </group>
        {[-1, 1].map((side) => (
          <group
            key={`arm-${side}`}
            ref={side < 0 ? leftArm : rightArm}
            position={[side * profile.torsoWidth * 0.58, 1.39, 0]}
          >
            <mesh position={[0, -0.28, 0]} castShadow>
              <capsuleGeometry args={[style === "comic" ? 0.105 : 0.085, 0.42, 5, 9]} />
              <meshToonMaterial color={profile.upper} />
            </mesh>
            <mesh position={[0, -0.54, 0.01]} castShadow>
              <sphereGeometry args={[style === "comic" ? 0.12 : 0.09, 10, 8]} />
              <meshToonMaterial color={profile.skin} />
            </mesh>
          </group>
        ))}
        {[-1, 1].map((side) => (
          <group
            key={`leg-${side}`}
            ref={side < 0 ? leftLeg : rightLeg}
            position={[side * 0.16, 0.78, 0]}
          >
            <mesh position={[0, -0.3, 0]} castShadow>
              <capsuleGeometry args={[style === "comic" ? 0.13 : 0.11, 0.43, 5, 9]} />
              <meshToonMaterial color={profile.lower} />
            </mesh>
            <mesh position={[0, -0.64, 0.1]} scale={[1, 0.72, 1.65]} castShadow>
              <sphereGeometry args={[style === "comic" ? 0.17 : 0.14, 12, 8]} />
              <meshToonMaterial color={profile.shoes} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function RainDemoCharacter() {
  const { camera } = useThree();
  const { scene, animations } = useGLTF(RAIN_CHARACTER_PATH);
  const root = useRef<Group>(null);
  const position = useRef(new Vector3(-31, 0.025, -7));
  const velocity = useRef(new Vector3());
  const cameraGoal = useMemo(() => new Vector3(), []);
  const cameraTarget = useMemo(() => new Vector3(), []);
  const qaMotion = useMemo(() => requestedQaMotion(), []);
  const activeAction = useRef<string | null>(null);
  const model = useMemo(() => {
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      object.frustumCulled = false;
    });
    return scene;
  }, [scene]);
  const { actions } = useAnimations(animations, model);

  useEffect(() => {
    camera.position.set(-35.8, 2.9, -5.8);
    camera.lookAt(-29.8, 1.2, -7);
  }, [camera]);

  useEffect(() => {
    const idle = actions.Idle_Neutral;
    idle?.reset().fadeIn(0.14).play();
    activeAction.current = idle ? "Idle_Neutral" : null;
    return () => {
      activeAction.current = null;
    };
  }, [actions]);

  useFrame((_, delta) => {
    const forward = qaMotion ? 1 : Number(STYLE_INPUT.forward) - Number(STYLE_INPUT.back);
    const side = qaMotion ? 0 : Number(STYLE_INPUT.right) - Number(STYLE_INPUT.left);
    velocity.current.set(forward, 0, side);
    let strength = Math.min(1, velocity.current.length());
    const running = qaMotion === "run" || (STYLE_SPRINT.active && strength > 0);
    let travel = (running ? 7.2 : 3.6) * Math.min(delta, 1 / 30);
    if (strength > 0) clearStyleNudge();
    if (strength === 0) {
      const nudgeForward = STYLE_NUDGE.forward - STYLE_NUDGE.back;
      const nudgeSide = STYLE_NUDGE.right - STYLE_NUDGE.left;
      velocity.current.set(nudgeForward, 0, nudgeSide);
      strength = Math.min(1, velocity.current.length());
      if (strength > 0) {
        travel = Math.min(0.8, velocity.current.length());
        clearStyleNudge();
      }
    }
    if (strength > 0) {
      velocity.current.normalize().multiplyScalar(travel);
      position.current.add(velocity.current);
      position.current.x = MathUtils.clamp(position.current.x, -39, 39);
      position.current.z = MathUtils.clamp(position.current.z, -10.5, -3.2);
    }
    if (root.current) {
      root.current.position.copy(position.current);
      if (strength > 0) root.current.rotation.y = Math.atan2(velocity.current.x, velocity.current.z);
    }

    const nextAction = strength > 0.02
      ? (running ? "Run" : "Walk")
      : "Idle_Neutral";
    if (activeAction.current !== nextAction) {
      if (activeAction.current) actions[activeAction.current]?.fadeOut(0.16);
      actions[nextAction]?.reset().fadeIn(0.16).play();
      activeAction.current = nextAction;
    }

    cameraGoal.set(position.current.x - 4.8, 2.9, position.current.z + 1.2);
    camera.position.lerp(cameraGoal, 1 - Math.exp(-delta * 4.2));
    cameraTarget.set(position.current.x + 1.2, 1.2, position.current.z);
    camera.lookAt(cameraTarget);
  });

  return (
    <group ref={root} rotation-y={Math.PI / 2} name="style-summer-rain-wanderer">
      <mesh position={[0, 0.002, 0]} rotation-x={-Math.PI / 2} scale={[0.78, 1.12, 1]}>
        <circleGeometry args={[0.5, 24]} />
        <meshBasicMaterial color="#263a38" transparent opacity={0.2} />
      </mesh>
      <primitive object={model} scale={1.03} />
    </group>
  );
}

function StyleCharacter({ style }: { style: StyleId }) {
  return style === "summer" ? <RainDemoCharacter /> : <DemoCharacter style={style} />;
}

function StyleEffects({ style }: { style: StyleId }) {
  return (
    <EffectComposer multisampling={0}>
      {style !== "summer" && <InkOutline />}
      <PaperWash />
    </EffectComposer>
  );
}

function StyleScene({ style }: { style: StyleId }) {
  const isSummer = style === "summer";
  const isComic = style === "comic";
  return (
    <>
      {style === "atlas" ? (
        <WatercolourSky />
      ) : (
        <color attach="background" args={[isSummer ? "#76bce8" : "#69c5c1"]} />
      )}
      <fog
        attach="fog"
        args={[
          isSummer ? "#9ccbdc" : isComic ? "#7bcac3" : "#73aaa6",
          62,
          150,
        ]}
      />
      <ambientLight intensity={isSummer ? 0.66 : isComic ? 0.82 : 0.6} />
      <hemisphereLight
        args={[
          isSummer ? "#d8eeff" : isComic ? "#d7ffff" : "#eff8e9",
          isSummer ? "#9b795e" : isComic ? "#3d5d52" : "#536056",
          isSummer ? 1.15 : isComic ? 1.05 : 0.74,
        ]}
      />
      <directionalLight
        position={isSummer ? [-36, 22, -20] : isComic ? [-24, 34, -16] : [-12, 42, 28]}
        intensity={isSummer ? 3.25 : isComic ? 2.8 : 2.35}
        color={isSummer ? "#ffd79a" : isComic ? "#fff0c6" : "#fff2ce"}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-58}
        shadow-camera-right={58}
        shadow-camera-top={42}
        shadow-camera-bottom={-42}
        shadow-camera-near={1}
        shadow-camera-far={150}
        shadow-bias={-0.0003}
      />
      <StreetGround style={style} />
      {isSummer && <SummerAtmosphere />}
      {isComic && <ComicAtmosphere />}
      <Suspense fallback={null}>
        <StyledXingfuli style={style} />
      </Suspense>
      <StyleCharacter style={style} />
      <StyleEffects style={style} />
    </>
  );
}

function DirectionButton({
  label,
  input,
  className,
}: {
  label: string;
  input: MovementKey;
  className: string;
}) {
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setInput(input, true);
      }}
      onPointerUp={() => setInput(input, false)}
      onPointerCancel={() => setInput(input, false)}
      onPointerLeave={() => setInput(input, false)}
    >
      {label}
    </button>
  );
}

export function StyleLab() {
  const style = useSyncExternalStore(
    subscribeToRequestedStyle,
    requestedStyle,
    () => "atlas",
  );
  const [ready, setReady] = useState(false);

  const selectStyle = useCallback((nextStyle: StyleId) => {
    const url = new URL(window.location.href);
    url.searchParams.set("style", nextStyle);
    window.history.replaceState({}, "", url);
    window.dispatchEvent(new Event(STYLE_URL_EVENT));
  }, []);

  useStyleLabKeyboard(selectStyle);
  const contract = STYLE_BY_ID[style];

  return (
    <section className={styles.lab} data-style={style} aria-label="新华漫游志三种视觉风格比较">
      <div className={styles.canvasWrap}>
        <Canvas
          key={style}
          shadows
          dpr={[1, 1.6]}
          camera={{ fov: style === "comic" ? 46 : style === "summer" ? 44 : 48, near: 0.1, far: 260 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          onCreated={() => setReady(true)}
        >
          <StyleScene style={style} />
        </Canvas>
      </div>

      <header className={styles.header}>
        <a className={styles.brand} href="/" aria-label="返回新华漫游志">
          <span>游</span>
          <strong>新华视觉试验场</strong>
        </a>
        <p>同一地点 · 同一操作 · 三种自洽方向</p>
      </header>

      <aside className={styles.manifesto} aria-live="polite">
        <div className={styles.styleNumber}>{contract.number}</div>
        <p className={styles.eyebrow}>{contract.english}</p>
        <h1>{contract.name}</h1>
        <p className={styles.thesis}>{contract.thesis}</p>
        <div className={styles.palette} aria-label="当前风格色盘">
          {contract.palette.map((color) => (
            <span key={color} style={{ backgroundColor: color }} title={color} />
          ))}
        </div>
        <p className={styles.proof}>{contract.proof}</p>
        {style === "summer" && (
          <a
            className={styles.characterCredit}
            href="https://www.blenderstudio.cn/zh-hans/characters/rain/v1/"
            target="_blank"
            rel="noreferrer"
          >
            成品角色：Rain Rig © Blender Foundation | cloud.blender.org · CC-BY · 已优化适配
          </a>
        )}
        {style === "atlas" && (
          <a className={styles.fullVersion} href="/?start=xingfuli-canonical">
            打开完整当前版本
          </a>
        )}
      </aside>

      <nav className={styles.choices} aria-label="选择视觉风格">
        {STYLE_CONTRACTS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === style ? styles.choiceActive : undefined}
            aria-pressed={item.id === style}
            onClick={() => selectStyle(item.id)}
          >
            <span>{item.number}</span>
            <b>{item.name}</b>
            <small>{item.english}</small>
          </button>
        ))}
      </nav>

      <div className={styles.controlsHint} aria-hidden="true">
        <kbd>WASD</kbd>
        <span>沿幸福里内街移动</span>
        <kbd>Shift</kbd>
        <span>奔跑</span>
        <kbd>1 / 2 / 3</kbd>
        <span>切换风格</span>
      </div>

      <div className={styles.touchControls} aria-label="移动控制">
        <DirectionButton label="↑" input="forward" className={styles.forward} />
        <DirectionButton label="←" input="left" className={styles.left} />
        <DirectionButton label="↓" input="back" className={styles.back} />
        <DirectionButton label="→" input="right" className={styles.right} />
      </div>

      {!ready && <div className={styles.loading}>正在准备三种新华路风格…</div>}
      {style === "comic" && <div className={styles.comicTexture} aria-hidden="true" />}
      {style === "summer" && <div className={styles.sunWash} aria-hidden="true" />}
    </section>
  );
}
