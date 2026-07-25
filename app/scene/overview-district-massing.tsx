"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Mesh } from "three";
import runtimeManifest from "./xinhua-district-massing-runtime.json" with { type: "json" };

/**
 * 预编译的街区体块只负责建立城市肌理，不参与碰撞、射线交互或阴影。
 * GLB 加载失败时由外层 ProgressiveFeatureBoundary 回退到原有全览。
 */
export function OverviewDistrictMassing() {
  const { scene } = useGLTF(runtimeManifest.url);
  const model = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.name = "overview-district-massing";
    cloned.userData = {
      ...cloned.userData,
      assetId: runtimeManifest.assetId,
      sourceSha256: runtimeManifest.sha256,
      overviewOnly: true,
      collision: false,
    };
    cloned.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.castShadow = false;
      object.receiveShadow = false;
      object.frustumCulled = true;
      object.userData = {
        ...object.userData,
        districtMassing: true,
        raycastTarget: false,
      };
      object.raycast = () => {};
    });
    return cloned;
  }, [scene]);

  return <primitive object={model} />;
}

export default OverviewDistrictMassing;
