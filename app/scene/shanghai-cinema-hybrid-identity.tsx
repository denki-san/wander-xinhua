"use client";

import { useGLTF } from "@react-three/drei";
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import {
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import { ProgressiveFeatureBoundary } from "../progressive-feature-boundary";
import {
  SHANGHAI_CINEMA_IDENTITY_CACHE_VERSION,
  SHANGHAI_CINEMA_IDENTITY_MODEL_PATH,
} from "./xinhua-road-identity-contract";

export const SHANGHAI_CINEMA_HYBRID_IDENTITY_MODEL =
  `${SHANGHAI_CINEMA_IDENTITY_MODEL_PATH}?v=${SHANGHAI_CINEMA_IDENTITY_CACHE_VERSION}`;

type Transform = {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: [number, number, number];
};

function cinemaFrontZ(x: number) {
  const radiusX = 15.2;
  const radiusZ = 7.15;
  const normalized = Math.min(1, Math.abs(x) / radiusX);
  return 0.35 - radiusZ * Math.sqrt(Math.max(0, 1 - normalized * normalized));
}

function blenderPosition(x: number, y: number, z: number): [number, number, number] {
  // Hero GLB 在导出时镜像 X、运行时再翻转 Z；Identity 代码构件遵守相同坐标约定。
  return [-x, z, y];
}

function cloneConfiguredScene(source: Group) {
  const clone = source.clone(true);
  clone.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return clone;
}

export function ShanghaiCinemaIdentityGlb({
  onReady,
}: {
  onReady?: () => void;
}) {
  const { scene } = useGLTF(SHANGHAI_CINEMA_HYBRID_IDENTITY_MODEL);
  const model = useMemo(() => cloneConfiguredScene(scene), [scene]);
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  return <primitive object={model} scale={[1, 1, -1]} />;
}

function useInstanceMatrices(
  ref: RefObject<InstancedMesh | null>,
  transforms: Transform[],
) {
  useLayoutEffect(() => {
    const instances = ref.current;
    if (!instances) return;
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const position = new Vector3();
    const scale = new Vector3();
    const rotation = new Object3D();
    transforms.forEach((transform, index) => {
      position.set(...transform.position);
      rotation.rotation.set(...(transform.rotation ?? [0, 0, 0]));
      quaternion.setFromEuler(rotation.rotation);
      scale.set(...transform.scale);
      matrix.compose(position, quaternion, scale);
      instances.setMatrixAt(index, matrix);
    });
    instances.instanceMatrix.needsUpdate = true;
    instances.computeBoundingSphere();
  }, [ref, transforms]);
}

function BoxInstances({
  transforms,
  color,
  roughness = 0.7,
  metalness = 0,
  opacity = 1,
  depthWrite = true,
}: {
  transforms: Transform[];
  color: string;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  depthWrite?: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  useInstanceMatrices(ref, transforms);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, transforms.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={depthWrite}
      />
    </instancedMesh>
  );
}

function CylinderInstances({
  transforms,
  color,
  radialSegments = 10,
}: {
  transforms: Transform[];
  color: string;
  radialSegments?: number;
}) {
  const ref = useRef<InstancedMesh>(null);
  useInstanceMatrices(ref, transforms);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, transforms.length]}
      castShadow
      receiveShadow
    >
      <cylinderGeometry args={[1, 1, 1, radialSegments]} />
      <meshStandardMaterial color={color} roughness={0.42} metalness={0.35} />
    </instancedMesh>
  );
}

export function ShanghaiCinemaProgrammaticBody() {
  const glassMaterial = useMemo(() => new MeshStandardMaterial({
    color: new Color("#4f7478"),
    roughness: 0.25,
    metalness: 0.06,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  }), []);
  const lightGlassMaterial = useMemo(() => new MeshStandardMaterial({
    color: new Color("#79a2a5"),
    roughness: 0.2,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  }), []);
  const ellipse = useMemo(() => new CylinderGeometry(1, 1, 1, 64), []);
  useEffect(() => () => {
    glassMaterial.dispose();
    lightGlassMaterial.dispose();
    ellipse.dispose();
  }, [ellipse, glassMaterial, lightGlassMaterial]);

  const glassBoxes = useMemo<Transform[]>(() => [
    { position: [-11.45, 2.35, 4.15], scale: [3.45, 4.3, 10.8] },
    { position: [11.45, 2.35, 4.15], scale: [3.45, 4.3, 10.8] },
    { position: [-7.4, 10.3, 5.2], scale: [7.35, 12.4, 4.05] },
  ], []);
  const whiteBoxes = useMemo<Transform[]>(() => [
    {
      position: [-12.15, 4.62, 4.0],
      rotation: [0, 0, -0.03],
      scale: [4.25, 0.36, 11.95],
    },
    {
      position: [12.15, 4.62, 4.0],
      rotation: [0, 0, 0.03],
      scale: [4.25, 0.36, 11.95],
    },
    { position: [-11.25, 10.225, 5.2], scale: [0.58, 13.35, 4.35] },
    { position: [-3.55, 10.225, 5.2], scale: [0.58, 13.35, 4.35] },
    { position: [-7.4, 16.85, 5.2], scale: [8.3, 0.75, 4.4] },
  ], []);

  return (
    <group name="shanghai-cinema-hybrid-programmatic-body">
      <mesh position={[0, 0.12, -1.2]} receiveShadow>
        <boxGeometry args={[38, 0.24, 26]} />
        <meshStandardMaterial color="#aaa69d" roughness={0.92} />
      </mesh>
      <mesh
        geometry={ellipse}
        material={glassMaterial}
        position={[0, 2.45, 0.35]}
        scale={[14.25, 4.65, 6.65]}
      />
      <mesh
        geometry={ellipse}
        material={lightGlassMaterial}
        position={[9.8, 7.9, 0.8]}
        scale={[4.45, 5.6, 3.45]}
      />
      <BoxInstances
        transforms={glassBoxes}
        color="#4f7478"
        roughness={0.25}
        metalness={0.06}
        opacity={0.7}
        depthWrite={false}
      />
      <BoxInstances transforms={whiteBoxes} color="#e4e1da" roughness={0.72} />
    </group>
  );
}

export function ShanghaiCinemaRepeatedDetails() {
  const silver = "#929f9d";
  const shadowWhite = "#cfd0ca";
  const lobbyMullions = useMemo<Transform[]>(() => Array.from({ length: 31 }, (_, index) => {
    const sourceX = -13.5 + index * 0.9;
    return {
      position: blenderPosition(sourceX, cinemaFrontZ(sourceX) + 0.5, 2.05),
      scale: [0.05, 3.95, 0.05],
    };
  }), []);
  const frontColumns = useMemo<Transform[]>(() => (
    [-9.6, -6.4, -3.2, 0, 3.2, 6.4, 9.6].map((sourceX) => ({
      position: blenderPosition(sourceX, cinemaFrontZ(sourceX) - 0.12, 2.05),
      scale: [0.14, 4, 0.14] as [number, number, number],
    }))
  ), []);
  const towerVertical = useMemo<Transform[]>(() => Array.from({ length: 9 }, (_, column) => ({
    position: blenderPosition(4.2 + column * 0.8, 3.145, 11.2),
    scale: [0.085, 8.2, 0.07],
  })), []);
  const towerHorizontal = useMemo<Transform[]>(() => Array.from({ length: 10 }, (_, row) => ({
    position: blenderPosition(7.4, 3.13, 7.2 + row * 0.9),
    scale: [6.75, 0.09, 0.075],
  })), []);
  const ribbonJoints = useMemo<Transform[]>(() => Array.from({ length: 37 }, (_, index) => {
    const sourceX = -14.7 + index * (29.4 / 36);
    const normalized = sourceX / 15.2;
    const lower = 3.92 + 0.48 * ((normalized + 1) * 0.5)
      + 0.23 * Math.cos(normalized * Math.PI);
    const crown = Math.max(0, 1 - ((normalized + 0.15) / 0.95) ** 2);
    const upper = 7.15 + 2.15 * crown + 0.15 * ((1 - normalized) * 0.5);
    if (((sourceX - 8.05) / 4.35) ** 2 < 1) return null;
    return {
      position: blenderPosition(
        sourceX,
        cinemaFrontZ(sourceX) - 0.025,
        (lower + upper) * 0.5,
      ),
      scale: [0.028, Math.max(0.2, upper - lower - 0.18), 0.055] as [
        number,
        number,
        number,
      ],
    };
  }).filter((value): value is Transform => value !== null), []);
  const stairSteps = useMemo<Transform[]>(() => {
    const start = new Vector3(11, -9.55, 0.35);
    const control = new Vector3(17.2, -7.15, 2.05);
    const end = new Vector3(14.55, -1.25, 4.35);
    return Array.from({ length: 32 }, (_, index) => {
      const t = index / 31;
      const point = start.clone().multiplyScalar((1 - t) ** 2)
        .add(control.clone().multiplyScalar(2 * (1 - t) * t))
        .add(end.clone().multiplyScalar(t ** 2));
      const tangent = control.clone().sub(start).multiplyScalar(2 * (1 - t))
        .add(end.clone().sub(control).multiplyScalar(2 * t));
      const angle = Math.atan2(tangent.y, tangent.x);
      return {
        position: blenderPosition(point.x, point.y, point.z),
        rotation: [0, -(angle + Math.PI / 2), 0] as [number, number, number],
        scale: [3.35, 0.17, 0.62] as [number, number, number],
      };
    });
  }, []);
  const shadowWhiteDetails = useMemo(
    () => [...towerVertical, ...towerHorizontal, ...stairSteps],
    [stairSteps, towerHorizontal, towerVertical],
  );

  return (
    <group name="shanghai-cinema-hybrid-instanced-details">
      <CylinderInstances transforms={lobbyMullions} color={silver} />
      <CylinderInstances transforms={frontColumns} color="#e4e1da" radialSegments={20} />
      <BoxInstances transforms={shadowWhiteDetails} color={shadowWhite} />
      <BoxInstances transforms={ribbonJoints} color="#d6d5d0" />
    </group>
  );
}

export function ShanghaiCinemaHybridIdentity({
  includeDetails = true,
  onReady,
}: {
  includeDetails?: boolean;
  onReady?: () => void;
}) {
  return (
    <group
      name="shanghai-cinema-custom-hybrid-identity"
      userData={{
        building: "shanghai-cinema",
        stage: "identity",
        lodStrategy: "custom-landmark-hybrid",
        source: "productionized-20260722-hybrid-comparison",
        massingVisibility: "cover-only",
      }}
    >
      <ShanghaiCinemaProgrammaticBody />
      <ProgressiveFeatureBoundary
        resetKey={SHANGHAI_CINEMA_HYBRID_IDENTITY_MODEL}
        fallback={null}
      >
        <Suspense fallback={null}>
          <ShanghaiCinemaIdentityGlb onReady={onReady} />
        </Suspense>
      </ProgressiveFeatureBoundary>
      {includeDetails && <ShanghaiCinemaRepeatedDetails />}
    </group>
  );
}
