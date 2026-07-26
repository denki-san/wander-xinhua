"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Mesh } from "three";
import {
  FILM_ART_CENTER_IDENTITY_MODEL_PATH,
} from "./film-art-center-tier-contract.mjs";

/**
 * 电影艺术中心 Identity 直接复用已通过 MCP3 的独立 GLB。
 * 外层继续使用与 Hero 相同的位置、朝向、尺度和 Z 轴翻转。
 */
export function FilmArtCenterIdentity({
  source = FILM_ART_CENTER_IDENTITY_MODEL_PATH,
}: {
  source?: string;
}) {
  const { scene } = useGLTF(source);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    return clone;
  }, [scene]);

  return (
    <primitive
      object={model}
      scale={[1, 1, -1]}
      userData={{
        building: "film-art-center",
        stage: "identity",
        source,
      }}
    />
  );
}
