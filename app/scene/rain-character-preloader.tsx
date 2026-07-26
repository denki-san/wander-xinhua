"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect } from "react";
import {
  RAIN_HERO_MODEL_PATH,
  RAIN_IDENTITY_MODEL_PATH,
} from "./rain-character-assets";

export type RainIdentityPreloadStatus = "identity" | "procedural";

/**
 * Loading 封面阶段只等待轻量 Identity；完成后再低优先级预热 Hero。
 * 组件不渲染任何内容，只负责把“人物可玩状态”纳入开始按钮门槛。
 */
export function RainIdentityPreloader({
  onSettled,
}: {
  onSettled: (status: RainIdentityPreloadStatus) => void;
}) {
  useGLTF(RAIN_IDENTITY_MODEL_PATH);

  useEffect(() => {
    document.documentElement.dataset.xinhuaCharacterIdentityPreloaded = "true";
    performance.mark("xinhua-character-identity-ready");
    onSettled("identity");
    useGLTF.preload(RAIN_HERO_MODEL_PATH);
  }, [onSettled]);

  return null;
}
/** Identity 请求失败时也必须解除封面，转入零请求的程序化保险层。 */
export function RainIdentityPreloadFallback({
  onSettled,
}: {
  onSettled: (status: RainIdentityPreloadStatus) => void;
}) {
  useEffect(() => {
    document.documentElement.dataset.xinhuaCharacterIdentityPreloaded = "failed";
    performance.mark("xinhua-character-identity-fallback-ready");
    onSettled("procedural");
  }, [onSettled]);

  return null;
}
