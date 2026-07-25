"use client";

import { Html, useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo } from "react";
import {
  Color,
  MathUtils,
  Mesh,
  type PerspectiveCamera,
  Vector3,
} from "three";
import facilityManifest from "../../docs/research/facility-prototypes-massing-manifest.json";
import facilityGeometrySpec from "../../docs/research/facility-prototypes-massing-geometry-spec.json";

type FacilityInstance = {
  id: string;
  position: [number, number, number];
  yaw?: number;
  coordinateSpace: string;
  runtimeScale?: number;
};

type FacilityManifestAsset = {
  assetId: string;
  outputSlug: string;
  semanticSlug: string;
  status: string;
  formalMassingPass: boolean;
  originContract: {
    authoredMetersPerSceneUnit: number;
  };
  outputs: {
    glb: string;
  };
  instance: FacilityInstance;
  glb: {
    sha256: string;
    bounds: {
      min: [number, number, number];
      max: [number, number, number];
    };
  };
};

type FacilityGeometryPrototype = {
  id: string;
  instances: FacilityInstance[];
};

const FACILITY_MASSING_ASSETS = (
  facilityManifest.assets as unknown as FacilityManifestAsset[]
).map((asset) => ({
  ...asset,
  path: `${asset.outputs.glb.replace(/^public/, "")}?v=${asset.glb.sha256.slice(0, 12)}`,
}));

const FACILITY_MASSING_BY_ID = new Map(
  FACILITY_MASSING_ASSETS.map((asset) => [asset.outputSlug, asset]),
);
const FACILITY_PROTOTYPE_BY_ID = new Map(
  (
    facilityGeometrySpec.prototypes as unknown as FacilityGeometryPrototype[]
  ).map((prototype) => [prototype.id, prototype]),
);

export const FACILITY_PROTOTYPE_MASSING_IDS = FACILITY_MASSING_ASSETS.map(
  (asset) => asset.outputSlug,
);

export function isFacilityPrototypeMassingId(
  value: string | null | undefined,
): value is string {
  return Boolean(value && FACILITY_MASSING_BY_ID.has(value));
}

function FacilityPrototypeMassingAsset({
  assetId,
}: {
  assetId: string;
}) {
  const asset = FACILITY_MASSING_BY_ID.get(assetId);
  if (!asset) return null;
  return <LoadedFacilityPrototypeMassingAsset asset={asset} />;
}

function LoadedFacilityPrototypeMassingAsset({
  asset,
}: {
  asset: (typeof FACILITY_MASSING_ASSETS)[number];
}) {
  const { scene } = useGLTF(asset.path);
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
    <group
      name={`facility-prototype-massing-${asset.outputSlug}`}
      userData={{
        assetId: asset.outputSlug,
        semanticPrototype: asset.semanticSlug,
        tier: "massing",
        qaOnly: true,
        displayScale: 1,
        authoredMetersPerSceneUnit: asset.originContract.authoredMetersPerSceneUnit,
        formalMassingPass: asset.formalMassingPass,
        sourceStatus: asset.status,
      }}
    >
      <primitive object={model} />
    </group>
  );
}

export function FacilityPrototypeMassingMapAsset({
  assetId,
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
  showQaMarker = false,
}: {
  assetId: string;
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
  showQaMarker?: boolean;
}) {
  const asset = FACILITY_MASSING_BY_ID.get(assetId);
  if (!asset) return null;
  const [minX, minY, minZ] = asset.glb.bounds.min;
  const [maxX, maxY, maxZ] = asset.glb.bounds.max;
  const width = Math.max(maxX - minX, 0.2);
  const height = Math.max(maxY - minY, 0.2);
  const depth = Math.max(maxZ - minZ, 0.2);
  const center: [number, number, number] = [
    (minX + maxX) * 0.5,
    (minY + maxY) * 0.5,
    (minZ + maxZ) * 0.5,
  ];
  return (
    <group
      name={`facility-prototype-map-${assetId}`}
      position={position}
      rotation-y={rotationY}
      scale={scale}
      userData={{
        assetId,
        semanticPrototype: asset.semanticSlug,
        tier: "massing",
        mapQa: true,
        authoredScalePreserved: scale === 1,
      }}
    >
      <Suspense fallback={null}>
        <LoadedFacilityPrototypeMassingAsset asset={asset} />
      </Suspense>
      {showQaMarker ? (
        <group
          name={`facility-prototype-map-marker-${assetId}`}
          position={center}
          userData={{
            assetId,
            qaOverlay: true,
            changesPlacement: false,
          }}
        >
          <mesh>
            <boxGeometry args={[width, height, depth]} />
            <meshBasicMaterial
              color="#ffd23f"
              transparent
              opacity={0.92}
              wireframe
              depthTest={false}
            />
          </mesh>
          <Html
            center
            position={[0, height * 0.7 + 0.8, 0]}
            distanceFactor={11}
            style={{
              background: "#171b1d",
              border: "2px solid #ffd23f",
              borderRadius: 4,
              color: "#fff5bf",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 11,
              lineHeight: 1.2,
              padding: "4px 6px",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            {assetId} · map QA
          </Html>
        </group>
      ) : null}
    </group>
  );
}

export type FacilityPrototypeSite = "shangsheng" | "huashan" | "xingfuli";

function assetSite(assetId: string): FacilityPrototypeSite | null {
  if (assetId.startsWith("shangsheng-")) return "shangsheng";
  if (assetId.startsWith("huashan-")) return "huashan";
  if (assetId.startsWith("xingfuli-")) return "xingfuli";
  return null;
}

function mapInstances(
  asset: (typeof FACILITY_MASSING_ASSETS)[number],
): FacilityInstance[] {
  if (asset.outputSlug !== "shangsheng-wayfinding-totem") {
    return [asset.instance];
  }
  const prototype = FACILITY_PROTOTYPE_BY_ID.get(asset.assetId);
  return prototype?.instances ?? [asset.instance];
}

export function FacilityPrototypeMassingMapAssets({
  site,
  onlyAssetId,
}: {
  site: FacilityPrototypeSite;
  onlyAssetId?: string;
}) {
  const assets = FACILITY_MASSING_ASSETS.filter((asset) => (
    assetSite(asset.outputSlug) === site
    && (!onlyAssetId || asset.outputSlug === onlyAssetId)
  ));
  return (
    <group
      name={`facility-prototype-massing-map-${site}`}
      userData={{
        tier: "massing",
        mapQa: true,
        onlyAssetId: onlyAssetId ?? null,
      }}
    >
      {assets.flatMap((asset) => (
        mapInstances(asset).map((instance) => (
          <FacilityPrototypeMassingMapAsset
            key={`${asset.outputSlug}:${instance.id}`}
            assetId={asset.outputSlug}
            position={instance.position}
            rotationY={instance.yaw ?? 0}
            showQaMarker={Boolean(onlyAssetId)}
          />
        ))
      ))}
    </group>
  );
}

export function facilityPrototypeMassingMapFrame(assetId: string) {
  const asset = FACILITY_MASSING_BY_ID.get(assetId);
  if (!asset) return null;
  return {
    assetId,
    site: assetId === "one-square-metre-action"
      ? "xingfuli"
      : assetSite(assetId),
    instance: asset.instance,
    bounds: asset.glb.bounds,
  };
}

function ScaleReference({
  assetId,
}: {
  assetId: string;
}) {
  const asset = FACILITY_MASSING_BY_ID.get(assetId);
  if (!asset) return null;
  const [minX, , minZ] = asset.glb.bounds.min;
  const [, , maxZ] = asset.glb.bounds.max;
  const authoredMetersPerSceneUnit = (
    asset.originContract.authoredMetersPerSceneUnit
  );
  const personHeight = 1.75 / authoredMetersPerSceneUnit;
  const rulerHeight = 1 / authoredMetersPerSceneUnit;
  const z = minZ - Math.max(0.6, (maxZ - minZ) * 0.08);

  return (
    <group
      name="facility-prototype-authored-scale-reference"
      position={[minX, 0, z]}
      userData={{
        personHeightMeters: 1.75,
        rulerHeightMeters: 1,
        authoredMetersPerSceneUnit,
      }}
    >
      <mesh position={[0, personHeight * 0.52, 0]} castShadow>
        <capsuleGeometry args={[
          personHeight * 0.11,
          personHeight * 0.55,
          4,
          8,
        ]} />
        <meshToonMaterial color="#d36c54" />
      </mesh>
      <mesh position={[0, personHeight * 0.92, 0]} castShadow>
        <sphereGeometry args={[personHeight * 0.11, 12, 8]} />
        <meshToonMaterial color="#d36c54" />
      </mesh>
      <mesh position={[personHeight * 0.34, rulerHeight * 0.5, 0]}>
        <boxGeometry args={[
          personHeight * 0.025,
          rulerHeight,
          personHeight * 0.025,
        ]} />
        <meshBasicMaterial color="#f4d46b" />
      </mesh>
    </group>
  );
}

export function FacilityPrototypeMassingQaScene({
  assetId,
}: {
  assetId: string;
}) {
  const asset = FACILITY_MASSING_BY_ID.get(assetId);
  if (!asset) return null;
  const [minX, minY, minZ] = asset.glb.bounds.min;
  const [maxX, maxY, maxZ] = asset.glb.bounds.max;
  const footprintSpan = Math.max(maxX - minX, maxZ - minZ, 2.4);

  return (
    <group
      name="facility-prototype-massing-qa-scene"
      userData={{
        assetId,
        semanticPrototype: asset.semanticSlug,
        tier: "massing",
        qaOnly: true,
        authoredScalePreserved: true,
      }}
    >
      <color attach="background" args={[new Color("#1b2525")]} />
      <hemisphereLight color="#fff6df" groundColor="#38423d" intensity={1.55} />
      <directionalLight
        castShadow
        position={[
          footprintSpan * 0.62,
          Math.max(8, footprintSpan * 0.92),
          footprintSpan * 0.68,
        ]}
        intensity={2.1}
        color="#ffe5b6"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-footprintSpan}
        shadow-camera-right={footprintSpan}
        shadow-camera-top={footprintSpan}
        shadow-camera-bottom={-footprintSpan}
      />
      <mesh
        position={[
          (minX + maxX) / 2,
          minY - Math.max(0.025, footprintSpan * 0.0025),
          (minZ + maxZ) / 2,
        ]}
        receiveShadow
      >
        <boxGeometry args={[
          footprintSpan * 1.7,
          Math.max(0.05, footprintSpan * 0.006),
          footprintSpan * 1.7,
        ]} />
        <meshToonMaterial color="#2d3937" />
      </mesh>
      <ScaleReference assetId={assetId} />
      <Suspense fallback={null}>
        <FacilityPrototypeMassingAsset assetId={assetId} />
      </Suspense>
      <Html
        center
        transform
        sprite
        position={[
          (minX + maxX) / 2,
          maxY + Math.max(0.45, footprintSpan * 0.08),
          (minZ + maxZ) / 2,
        ]}
        distanceFactor={Math.max(7, footprintSpan * 0.9)}
      >
        <span
          style={{
            color: "#f4efe4",
            background: "rgba(23, 30, 30, 0.88)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: "999px",
            display: "block",
            fontSize: "10px",
            padding: "3px 7px",
            whiteSpace: "nowrap",
          }}
        >
          {assetId} · authored scale 1:1
        </span>
      </Html>
    </group>
  );
}

export function FacilityPrototypeMassingQaCamera({
  active,
  assetId,
}: {
  active: boolean;
  assetId?: string;
}) {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    if (!active || !assetId) return;
    const asset = FACILITY_MASSING_BY_ID.get(assetId);
    if (!asset) return;
    const perspective = camera as PerspectiveCamera;
    const min = new Vector3(...asset.glb.bounds.min);
    const max = new Vector3(...asset.glb.bounds.max);
    const center = min.clone().add(max).multiplyScalar(0.5);
    const sizeVector = max.clone().sub(min);
    const radius = Math.max(sizeVector.length() * 0.5, 1.2);
    const verticalHalfFov = MathUtils.degToRad(perspective.fov / 2);
    const horizontalHalfFov = Math.atan(
      Math.tan(verticalHalfFov) * Math.max(0.35, size.width / size.height),
    );
    const fitDistance = (
      radius / Math.sin(Math.min(verticalHalfFov, horizontalHalfFov))
    ) * 1.32;
    const direction = new Vector3(1.18, 0.78, 1.28).normalize();

    perspective.position.copy(center).addScaledVector(direction, fitDistance);
    perspective.up.set(0, 1, 0);
    perspective.lookAt(center);
    perspective.updateProjectionMatrix();
  }, [active, assetId, camera, size.height, size.width]);

  return null;
}
