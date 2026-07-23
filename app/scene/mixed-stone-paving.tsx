"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { InstancedMesh, Object3D } from "three";

const STONE_LENGTHS = [0.82, 1.12, 1.48, 1.92] as const;
const STONE_COLORS = ["#a09f98", "#a7a69f", "#aeaca3"] as const;
const STONE_DEPTH = 0.72;
const ROW_COUNT = 19;
const LANE_MIN_X = -46.8;
const LANE_MAX_X = 46.8;
const LANE_MIN_Z = -13.65;

type PaverPlacement = { x: number; z: number };
type PaverBatchDefinition = {
  id: string;
  length: number;
  color: string;
  placements: PaverPlacement[];
};

function stableIndex(row: number, tile: number, salt: number, modulo: number) {
  return Math.abs((row + 17) * 97 + (tile + 23) * 53 + salt * 29) % modulo;
}

function buildPaverBatches(): PaverBatchDefinition[] {
  const buckets = new Map<string, PaverBatchDefinition>();
  for (let row = 0; row < ROW_COUNT; row += 1) {
    const z = LANE_MIN_Z + row * (STONE_DEPTH + 0.025);
    let x = LANE_MIN_X + (row % 2 ? -0.56 : 0);
    let tile = 0;
    while (x < LANE_MAX_X) {
      const lengthIndex = stableIndex(row, tile, 3, STONE_LENGTHS.length);
      const colorIndex = stableIndex(row, tile, 7, STONE_COLORS.length);
      const length = STONE_LENGTHS[lengthIndex];
      const centerX = x + length / 2;
      if (centerX + length / 2 <= LANE_MAX_X + 0.05) {
        const id = `${lengthIndex}-${colorIndex}`;
        const batch = buckets.get(id) ?? {
          id,
          length,
          color: STONE_COLORS[colorIndex],
          placements: [],
        };
        batch.placements.push({ x: centerX, z });
        buckets.set(id, batch);
      }
      x += length + 0.035;
      tile += 1;
    }
  }
  return [...buckets.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function PaverBatch({ batch }: { batch: PaverBatchDefinition }) {
  const instances = useRef<InstancedMesh>(null);
  const helper = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => {
    if (!instances.current) return;
    batch.placements.forEach((placement, index) => {
      helper.position.set(placement.x, 0.281, placement.z);
      helper.updateMatrix();
      instances.current?.setMatrixAt(index, helper.matrix);
    });
    instances.current.instanceMatrix.needsUpdate = true;
    instances.current.computeBoundingSphere();
  }, [batch, helper]);
  return (
    <instancedMesh
      ref={instances}
      args={[undefined, undefined, batch.placements.length]}
      receiveShadow
      userData={{
        assetId: "mixed-gray-paving",
        variant: batch.id,
        seed: 67,
        collision: "none",
        evidenceRef: "docs/research/assets/poi-references/xingfuli/xingfuli-smartshanghai-03-2021.jpeg",
      }}
    >
      <boxGeometry args={[batch.length - 0.025, 0.012, STONE_DEPTH]} />
      <meshToonMaterial color={batch.color} />
    </instancedMesh>
  );
}

export function MixedStonePaving({ name = "mixed-gray-paving-system" }: { name?: string }) {
  const batches = useMemo(() => buildPaverBatches(), []);
  return (
    <group
      name={name}
      userData={{
        assetId: "mixed-gray-paving",
        variant: "longitudinal-running-bond",
        seed: 67,
        drawCalls: batches.length,
        evidenceRef: "docs/research/assets/poi-references/xingfuli/xingfuli-smartshanghai-03-2021.jpeg",
      }}
    >
      <mesh position={[0, 0.16, -7]} receiveShadow>
        <boxGeometry args={[94, 0.12, 14]} />
        <meshToonMaterial color="#91938e" />
      </mesh>
      {batches.map((batch) => <PaverBatch key={batch.id} batch={batch} />)}
      {[-13.98, -0.02].map((z) => (
        <mesh key={z} position={[0, 0.285, z]} receiveShadow>
          <boxGeometry args={[94, 0.018, 0.16]} />
          <meshToonMaterial color="#747b76" />
        </mesh>
      ))}
    </group>
  );
}
