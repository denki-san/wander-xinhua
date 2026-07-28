"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Mesh, type Object3D } from "three";

const MODEL_BASE =
  "/models/nonbuilding/xingfuli-current-street-furniture";

const MODEL_PATHS = {
  "xingfuli-pointed-entry-bollard":
    `${MODEL_BASE}/xingfuli-pointed-entry-bollard-visible-low.glb?v=b91f86a7cfb4`,
  "xingfuli-water-edge-stone-seat-round":
    `${MODEL_BASE}/xingfuli-water-edge-stone-seat-round-visible-low.glb?v=fad32116f26b`,
  "xingfuli-water-edge-stone-seat-long":
    `${MODEL_BASE}/xingfuli-water-edge-stone-seat-long-visible-low.glb?v=a8b750f081bb`,
  "xingfuli-water-edge-slim-planter":
    `${MODEL_BASE}/xingfuli-water-edge-slim-planter-visible-low.glb?v=85f7a3c39adc`,
} as const;

type AssetSlug = keyof typeof MODEL_PATHS;

export type XingfuliStreetFurniturePlacement = {
  id: string;
  asset: AssetSlug;
  position: [number, number, number];
  yaw: number;
  evidence: "observed-location-family" | "inferred-water-edge-position";
};

// 入口五个点沿用既有审计位置；只替换错误的方盒轮廓并收紧碰撞。
export const XINGFULI_CURRENT_ENTRY_BOLLARDS: XingfuliStreetFurniturePlacement[] = [
  -11.8,
  -9,
  -6.2,
  -3.4,
  -0.6,
].map((z, index) => ({
  id: `east-entry-bollard-${index}`,
  asset: "xingfuli-pointed-entry-bollard",
  position: [44.6, 0.3, z],
  yaw: 0,
  evidence: "observed-location-family",
}));

// 照片确认水边存在这些家族，但没有测绘坐标；以下位置是保守的正式推定值。
export const XINGFULI_CURRENT_WATER_EDGE_FURNITURE: XingfuliStreetFurniturePlacement[] = [
  {
    id: "water-edge-round-seat-west",
    asset: "xingfuli-water-edge-stone-seat-round",
    position: [9, 0.3, -4.95],
    yaw: 0.18,
    evidence: "inferred-water-edge-position",
  },
  {
    id: "water-edge-slim-planter-west",
    asset: "xingfuli-water-edge-slim-planter",
    position: [10.7, 0.3, -4.95],
    yaw: -0.04,
    evidence: "inferred-water-edge-position",
  },
  {
    id: "water-edge-long-seat-west",
    asset: "xingfuli-water-edge-stone-seat-long",
    position: [14.5, 0.3, -4.95],
    yaw: 0.05,
    evidence: "inferred-water-edge-position",
  },
  {
    id: "water-edge-slim-planter-center",
    asset: "xingfuli-water-edge-slim-planter",
    position: [17.1, 0.3, -4.95],
    yaw: 0.03,
    evidence: "inferred-water-edge-position",
  },
  {
    id: "water-edge-round-seat-east",
    asset: "xingfuli-water-edge-stone-seat-round",
    position: [19.5, 0.3, -4.95],
    yaw: -0.22,
    evidence: "inferred-water-edge-position",
  },
  {
    id: "water-edge-long-seat-east",
    asset: "xingfuli-water-edge-stone-seat-long",
    position: [22, 0.3, -4.95],
    yaw: -0.06,
    evidence: "inferred-water-edge-position",
  },
  {
    id: "water-edge-slim-planter-east",
    asset: "xingfuli-water-edge-slim-planter",
    position: [24.2, 0.3, -4.95],
    yaw: 0.02,
    evidence: "inferred-water-edge-position",
  },
];

const ALL_PLACEMENTS = [
  ...XINGFULI_CURRENT_ENTRY_BOLLARDS,
  ...XINGFULI_CURRENT_WATER_EDGE_FURNITURE,
];

function configureModel(source: Object3D) {
  const model = source.clone(true);
  model.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return model;
}

function XingfuliStreetFurnitureModel({
  placement,
}: {
  placement: XingfuliStreetFurniturePlacement;
}) {
  const path = MODEL_PATHS[placement.asset];
  const { scene } = useGLTF(path);
  const model = useMemo(() => configureModel(scene), [scene]);
  return (
    <group
      name={placement.id}
      position={placement.position}
      rotation-y={placement.yaw}
      userData={{
        assetId: placement.asset,
        runtimeTier: "visible-low",
        runtimeState: "visible-low",
        siteBinding: "xingfuli",
        evidence: placement.evidence,
        collision: "base-only",
      }}
    >
      <primitive object={model} />
    </group>
  );
}

export function XingfuliCurrentStreetFurniture() {
  return (
    <group
      name="xingfuli-current-street-furniture"
      userData={{
        package: "xingfuli-current-street-furniture",
        runtimeContract: "visible-low-when-xingfuli-full-hidden-otherwise",
        instanceCount: ALL_PLACEMENTS.length,
      }}
    >
      {ALL_PLACEMENTS.map((placement) => (
        <XingfuliStreetFurnitureModel
          key={placement.id}
          placement={placement}
        />
      ))}
    </group>
  );
}
