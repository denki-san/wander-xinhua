"use client";

import {
  EffectComposer,
  SSAO,
  ToneMapping,
} from "@react-three/postprocessing";
import {
  ToneMappingMode,
  type EffectComposer as PostprocessingEffectComposer,
} from "postprocessing";
import { memo, useLayoutEffect, useRef } from "react";
import type { XinhuaAtmosphereStyle } from "./atmosphere-contract";
import { InkOutline, PaperWash } from "./postprocessing-effects";

const VisualEffectComposer = memo(function VisualEffectComposer({
  lowTier,
  atmosphereStyle,
}: {
  lowTier: boolean;
  atmosphereStyle: XinhuaAtmosphereStyle;
}) {
  const composerRef = useRef<PostprocessingEffectComposer>(null);
  const lightingV3 = atmosphereStyle === "lighting-v3";

  useLayoutEffect(() => {
    const composer = composerRef.current;
    return () => composer?.dispose();
  }, []);

  return (
    <EffectComposer
      ref={composerRef}
      multisampling={lowTier ? 0 : 2}
      enableNormalPass={!lowTier}
      resolutionScale={lowTier ? undefined : 0.5}
    >
      {lightingV3 && !lowTier ? (
        <SSAO
          samples={16}
          rings={3}
          radius={1.45}
          intensity={0.28}
          luminanceInfluence={0.82}
          distanceThreshold={0.92}
          distanceFalloff={0.08}
          rangeThreshold={0.66}
          rangeFalloff={0.14}
          bias={0.045}
        />
      ) : <></>}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {lowTier && lightingV3 ? <></> : <InkOutline atmosphereStyle={atmosphereStyle} />}
      {lowTier && lightingV3 ? <></> : <PaperWash atmosphereStyle={atmosphereStyle} />}
    </EffectComposer>
  );
});

export default VisualEffectComposer;
