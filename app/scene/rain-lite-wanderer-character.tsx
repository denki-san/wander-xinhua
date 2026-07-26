"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Group, type Object3D } from "three";
import { inputState } from "./input";
import {
  RAIN_CHARACTER_VISUAL_SCALE,
  RAIN_IDENTITY_MODEL_PATH,
} from "./rain-character-assets";

/**
 * Rain Identity 与 Hero 使用相同骨架、动作名、视觉比例和外层 Group，
 * 因而升级时不会改变碰撞、相机或角色位置。
 */
export default function RainLiteWandererCharacter({
  outerRef,
  scale = 1,
}: {
  outerRef: RefObject<Group | null>;
  scale?: number;
}) {
  const { scene, animations } = useGLTF(RAIN_IDENTITY_MODEL_PATH);
  const model = useMemo(() => {
    scene.traverse((object) => {
      const mesh = object as Object3D & {
        isMesh?: boolean;
        castShadow?: boolean;
        receiveShadow?: boolean;
        frustumCulled?: boolean;
      };
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
      }
    });
    return scene;
  }, [scene]);
  const { actions } = useAnimations(animations, model);
  const activeAction = useRef<string | null>(null);
  const qaMotion = useMemo(() => {
    if (typeof window === "undefined") return null;
    const value = new URLSearchParams(window.location.search).get("qaMotion");
    return value === "walk" || value === "run" ? value : null;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.xinhuaCharacterTier = "identity";
    performance.mark("xinhua-character-identity-visible");
    return () => {
      if (document.documentElement.dataset.xinhuaCharacterTier === "identity") {
        delete document.documentElement.dataset.xinhuaCharacterTier;
      }
    };
  }, []);

  useEffect(() => {
    const idle = actions.Idle_Neutral;
    idle?.reset().fadeIn(0.12).play();
    activeAction.current = idle ? "Idle_Neutral" : null;
    return () => {
      activeAction.current = null;
    };
  }, [actions]);

  useFrame(() => {
    const analogStrength = Math.min(1, Math.hypot(inputState.moveX, inputState.moveY));
    const keyboardMoving =
      inputState.forward || inputState.back || inputState.left || inputState.right;
    const moveStrength = analogStrength > 0 ? analogStrength : (keyboardMoving ? 1 : 0);
    const nextAction = qaMotion === "run"
      ? "Run"
      : qaMotion === "walk"
        ? "Walk"
        : moveStrength <= 0.02
          ? "Idle_Neutral"
          : (inputState.sprint ? "Run" : "Walk");

    if (activeAction.current === nextAction) return;
    if (activeAction.current) actions[activeAction.current]?.fadeOut(0.16);
    actions[nextAction]?.reset().fadeIn(0.16).play();
    activeAction.current = nextAction;
  });

  return (
    <group ref={outerRef} scale={scale}>
      <primitive object={model} scale={RAIN_CHARACTER_VISUAL_SCALE} />
    </group>
  );
}
