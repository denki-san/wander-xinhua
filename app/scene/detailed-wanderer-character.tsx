"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Group, type Object3D } from "three";
import { inputState } from "./input";

const CHARACTER_MODEL_PATH = "/models/character/rain-summer-wanderer.glb?v=f9721e54f034";
const CHARACTER_VISUAL_SCALE = 1.3;

export default function DetailedWandererCharacter({
  outerRef,
  scale = 1,
}: {
  outerRef: RefObject<Group | null>;
  scale?: number;
}) {
  const { scene, animations } = useGLTF(CHARACTER_MODEL_PATH);
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
    const nextAction = moveStrength <= 0.02
      ? "Idle_Neutral"
      : (inputState.sprint ? "Run" : "Walk");

    if (activeAction.current === nextAction) return;
    if (activeAction.current) actions[activeAction.current]?.fadeOut(0.16);
    actions[nextAction]?.reset().fadeIn(0.16).play();
    activeAction.current = nextAction;
  });

  return (
    <group ref={outerRef} scale={scale}>
      <primitive object={model} scale={CHARACTER_VISUAL_SCALE} />
    </group>
  );
}
