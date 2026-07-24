"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FullCinema,
  IdentityCinema,
  ModelBoundary,
  ProgrammaticMassing,
  RepeatedDetails,
} from "./HybridModelComparison";
import styles from "./hybrid-model-test.module.css";

type LoadTier = "massing" | "identity" | "detail";
type LoadingPolicy = "auto" | "save-data";

type StageTimes = {
  playableMs: number | null;
  identityRequestedMs: number | null;
  identityVisibleMs: number | null;
  fullRequestedMs: number | null;
  fullVisibleMs: number | null;
};

type TierTransition = {
  from: LoadTier;
  to: LoadTier;
  distance: number;
  atMs: number;
};

type ControlProbe = {
  sequence: number;
  fromDistance: number;
  toDistance: number;
  issuedMs: number;
  appliedMs: number | null;
  responseMs: number | null;
};

export type ProgressiveExperimentSnapshot = {
  ready: boolean;
  policy: LoadingPolicy;
  allowFull: boolean;
  distance: number;
  tier: LoadTier;
  activeVisual: "massing" | "identity" | "full";
  stageTimes: StageTimes;
  transitions: TierTransition[];
  controls: ControlProbe[];
};

declare global {
  interface Window {
    __PROGRESSIVE_LOD_TEST__?: ProgressiveExperimentSnapshot & {
      setDistance: (distance: number) => number;
    };
  }
}

const INITIAL_DISTANCE = 82;

function elapsedSince(startedAt: React.RefObject<number>) {
  return Number((performance.now() - startedAt.current).toFixed(1));
}

function tierWithHysteresis(distance: number, current: LoadTier): LoadTier {
  if (current === "massing") {
    return distance <= 58 ? "identity" : "massing";
  }
  if (current === "identity") {
    if (distance <= 36) return "detail";
    if (distance > 64) return "massing";
    return "identity";
  }
  return distance > 42 ? "identity" : "detail";
}

function ProgressiveCamera({
  distance,
  controlSequence,
  onApplied,
}: {
  distance: number;
  controlSequence: number;
  onApplied: (sequence: number) => void;
}) {
  const { camera } = useThree();
  useLayoutEffect(() => {
    const height = Math.max(10, 6 + distance * 0.14);
    camera.position.set(0, height, -distance);
    camera.lookAt(0, 6, 0);
    camera.updateProjectionMatrix();
    if (controlSequence > 0) onApplied(controlSequence);
  }, [camera, controlSequence, distance, onApplied]);
  return null;
}

function FirstPlayableFrame({ onReady }: { onReady: () => void }) {
  const didPublish = useRef(false);
  useFrame(() => {
    if (didPublish.current) return;
    didPublish.current = true;
    onReady();
  });
  return null;
}

function ProgressiveScene({
  distance,
  controlSequence,
  tier,
  allowFull,
  fullReady,
  onControlApplied,
  onPlayable,
  onIdentityReady,
  onFullReady,
}: {
  distance: number;
  controlSequence: number;
  tier: LoadTier;
  allowFull: boolean;
  fullReady: boolean;
  onControlApplied: (sequence: number) => void;
  onPlayable: () => void;
  onIdentityReady: () => void;
  onFullReady: () => void;
}) {
  const showIdentity = tier === "identity" || tier === "detail";
  const showFull = allowFull && tier === "detail";
  const activeFull = showFull && fullReady;

  return (
    <>
      <color attach="background" args={["#9db0b2"]} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[-18, 28, 20]} intensity={2.4} />
      <directionalLight position={[22, 12, -14]} intensity={0.8} />
      <ProgressiveCamera
        distance={distance}
        controlSequence={controlSequence}
        onApplied={onControlApplied}
      />
      <FirstPlayableFrame onReady={onPlayable} />
      {!activeFull && <ProgrammaticMassing />}
      {!activeFull && showIdentity && (
        <ModelBoundary fallback={null}>
          <Suspense fallback={null}>
            <IdentityCinema onReady={onIdentityReady} />
          </Suspense>
        </ModelBoundary>
      )}
      {tier === "detail" && !activeFull && <RepeatedDetails />}
      {showFull && (
        <ModelBoundary fallback={null}>
          <Suspense fallback={null}>
            <FullCinema onReady={onFullReady} />
          </Suspense>
        </ModelBoundary>
      )}
    </>
  );
}

function initialSnapshot(policy: LoadingPolicy): ProgressiveExperimentSnapshot {
  return {
    ready: false,
    policy,
    allowFull: policy === "auto",
    distance: INITIAL_DISTANCE,
    tier: "massing",
    activeVisual: "massing",
    stageTimes: {
      playableMs: null,
      identityRequestedMs: null,
      identityVisibleMs: null,
      fullRequestedMs: null,
      fullVisibleMs: null,
    },
    transitions: [],
    controls: [],
  };
}

export function ProgressiveLodExperiment({ policy }: { policy: LoadingPolicy }) {
  const startedAt = useRef(0);
  const snapshotRef = useRef(initialSnapshot(policy));
  const [snapshot, setSnapshot] = useState(() => initialSnapshot(policy));
  const [distance, setDistance] = useState(INITIAL_DISTANCE);
  const distanceRef = useRef(INITIAL_DISTANCE);
  const tierRef = useRef<LoadTier>("massing");
  const [tier, setTier] = useState<LoadTier>("massing");
  const [identityReady, setIdentityReady] = useState(false);
  const [fullReady, setFullReady] = useState(false);
  const [controlSequence, setControlSequence] = useState(0);
  const sequenceRef = useRef(0);

  useLayoutEffect(() => {
    startedAt.current = performance.now();
  }, []);

  const mutateSnapshot = useCallback((
    mutate: (current: ProgressiveExperimentSnapshot) => ProgressiveExperimentSnapshot,
  ) => {
    const next = mutate(snapshotRef.current);
    snapshotRef.current = next;
    setSnapshot(next);
  }, []);

  const markPlayable = useCallback(() => {
    mutateSnapshot((current) => {
      if (current.stageTimes.playableMs !== null) return current;
      return {
        ...current,
        ready: true,
        stageTimes: {
          ...current.stageTimes,
          playableMs: elapsedSince(startedAt),
        },
      };
    });
  }, [mutateSnapshot]);

  const markIdentityReady = useCallback(() => {
    setIdentityReady(true);
    mutateSnapshot((current) => {
      if (current.stageTimes.identityVisibleMs !== null) return current;
      return {
        ...current,
        activeVisual: "identity",
        stageTimes: {
          ...current.stageTimes,
          identityVisibleMs: elapsedSince(startedAt),
        },
      };
    });
  }, [mutateSnapshot]);

  const markFullReady = useCallback(() => {
    setFullReady(true);
    mutateSnapshot((current) => {
      if (current.stageTimes.fullVisibleMs !== null) return current;
      return {
        ...current,
        activeVisual: "full",
        stageTimes: {
          ...current.stageTimes,
          fullVisibleMs: elapsedSince(startedAt),
        },
      };
    });
  }, [mutateSnapshot]);

  const applyControl = useCallback((sequence: number) => {
    mutateSnapshot((current) => ({
      ...current,
      controls: current.controls.map((probe) => {
        if (probe.sequence !== sequence || probe.appliedMs !== null) return probe;
        const appliedMs = elapsedSince(startedAt);
        return {
          ...probe,
          appliedMs,
          responseMs: Number((appliedMs - probe.issuedMs).toFixed(1)),
        };
      }),
    }));
  }, [mutateSnapshot]);

  const setDistanceForTest = useCallback((nextDistance: number) => {
    const normalized = Math.max(20, Math.min(100, Number(nextDistance)));
    const sequence = ++sequenceRef.current;
    const issuedMs = elapsedSince(startedAt);
    const fromDistance = distanceRef.current;
    distanceRef.current = normalized;
    mutateSnapshot((current) => ({
      ...current,
      distance: normalized,
      controls: [
        ...current.controls,
        {
          sequence,
          fromDistance,
          toDistance: normalized,
          issuedMs,
          appliedMs: null,
          responseMs: null,
        },
      ],
    }));
    setControlSequence(sequence);
    setDistance(normalized);
    return sequence;
  }, [mutateSnapshot]);

  useEffect(() => {
    const nextTier = tierWithHysteresis(distance, tierRef.current);
    if (nextTier === tierRef.current) return;
    const previousTier = tierRef.current;
    tierRef.current = nextTier;
    setTier(nextTier);
    mutateSnapshot((current) => {
      const now = elapsedSince(startedAt);
      const stageTimes = { ...current.stageTimes };
      if (nextTier === "identity" && stageTimes.identityRequestedMs === null) {
        stageTimes.identityRequestedMs = now;
      }
      if (nextTier === "detail" && stageTimes.fullRequestedMs === null && current.allowFull) {
        stageTimes.fullRequestedMs = now;
      }
      let activeVisual = current.activeVisual;
      if (nextTier === "massing") activeVisual = "massing";
      else if (nextTier === "identity" && identityReady) activeVisual = "identity";
      else if (nextTier === "detail" && fullReady) activeVisual = "full";
      return {
        ...current,
        tier: nextTier,
        activeVisual,
        stageTimes,
        transitions: [
          ...current.transitions,
          { from: previousTier, to: nextTier, distance, atMs: now },
        ],
      };
    });
  }, [distance, fullReady, identityReady, mutateSnapshot]);

  useEffect(() => {
    window.__PROGRESSIVE_LOD_TEST__ = {
      ...snapshot,
      setDistance: setDistanceForTest,
    };
    return () => {
      delete window.__PROGRESSIVE_LOD_TEST__;
    };
  }, [setDistanceForTest, snapshot]);

  const displaySnapshot = useMemo(() => ({
    ...snapshot,
    controls: snapshot.controls.slice(-6),
  }), [snapshot]);

  return (
    <section className={styles.shell} data-test-ready={snapshot.ready ? "true" : "false"}>
      <div className={styles.canvas}>
        <Canvas
          dpr={1}
          shadows={false}
          camera={{ fov: 42, near: 0.1, far: 300 }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        >
          <ProgressiveScene
            distance={distance}
            controlSequence={controlSequence}
            tier={tier}
            allowFull={snapshot.allowFull}
            fullReady={fullReady}
            onControlApplied={applyControl}
            onPlayable={markPlayable}
            onIdentityReady={markIdentityReady}
            onFullReady={markFullReady}
          />
        </Canvas>
      </div>
      <aside className={styles.panel}>
        <p className={styles.eyebrow}>渐进式 LOD 实验 · 2026-07-24</p>
        <h1 className={styles.title}>上海影城路线加载测试</h1>
        <p className={styles.summary}>
          Massing 立即可玩，Identity 恢复辨识度，Full 只在近景且网络策略允许时加载。
        </p>
        <pre id="test-progressive-metrics" className={styles.metrics}>
          {JSON.stringify(displaySnapshot, null, 2)}
        </pre>
      </aside>
      <div className={styles.badge}>
        {snapshot.policy === "save-data" ? "弱网省流" : "自动升级"} · {snapshot.activeVisual}
      </div>
    </section>
  );
}
