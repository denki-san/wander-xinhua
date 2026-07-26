#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const COMPONENT_FORMAT = {
  5120: { bytes: 1, method: "getInt8" },
  5121: { bytes: 1, method: "getUint8" },
  5122: { bytes: 2, method: "getInt16" },
  5123: { bytes: 2, method: "getUint16" },
  5125: { bytes: 4, method: "getUint32" },
  5126: { bytes: 4, method: "getFloat32" },
};
const TYPE_COMPONENTS = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function parseGlb(buffer, path) {
  if (
    buffer.toString("utf8", 0, 4) !== "glTF"
    || buffer.readUInt32LE(4) !== 2
  ) {
    throw new Error(`${path} 不是 glTF 2.0 GLB`);
  }
  const jsonLength = buffer.readUInt32LE(12);
  const jsonChunk = buffer.subarray(20, 20 + jsonLength);
  const binaryHeaderOffset = 20 + jsonLength;
  const binaryLength = buffer.readUInt32LE(binaryHeaderOffset);
  const binaryChunk = buffer.subarray(
    binaryHeaderOffset + 8,
    binaryHeaderOffset + 8 + binaryLength,
  );
  return {
    path,
    buffer,
    jsonChunk,
    binaryChunk,
    json: JSON.parse(jsonChunk.toString("utf8")),
  };
}

function accessorUses(json) {
  const uses = new Map();
  for (const [meshIndex, mesh] of (json.meshes ?? []).entries()) {
    for (const [primitiveIndex, primitive] of mesh.primitives.entries()) {
      for (const [semantic, accessorIndex] of Object.entries(
        primitive.attributes ?? {},
      )) {
        const current = uses.get(accessorIndex) ?? [];
        current.push({
          meshIndex,
          primitiveIndex,
          semantic,
          material: json.materials?.[primitive.material]?.name ?? null,
        });
        uses.set(accessorIndex, current);
      }
      if (primitive.indices !== undefined) {
        const current = uses.get(primitive.indices) ?? [];
        current.push({
          meshIndex,
          primitiveIndex,
          semantic: "INDICES",
          material: json.materials?.[primitive.material]?.name ?? null,
        });
        uses.set(primitive.indices, current);
      }
    }
  }
  return uses;
}

function accessorBytes(parsed, accessorIndex) {
  const accessor = parsed.json.accessors[accessorIndex];
  const view = parsed.json.bufferViews[accessor.bufferView];
  const component = COMPONENT_FORMAT[accessor.componentType];
  const componentCount = TYPE_COMPONENTS[accessor.type];
  if (!component || !componentCount) {
    throw new Error(`不支持 accessor ${accessorIndex} 的数据类型`);
  }
  const elementBytes = component.bytes * componentCount;
  const stride = view.byteStride ?? elementBytes;
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const chunks = [];
  for (let index = 0; index < accessor.count; index += 1) {
    const offset = start + index * stride;
    chunks.push(parsed.binaryChunk.subarray(offset, offset + elementBytes));
  }
  return Buffer.concat(chunks);
}

function accessorValues(parsed, accessorIndex) {
  const accessor = parsed.json.accessors[accessorIndex];
  const view = parsed.json.bufferViews[accessor.bufferView];
  const component = COMPONENT_FORMAT[accessor.componentType];
  const componentCount = TYPE_COMPONENTS[accessor.type];
  const elementBytes = component.bytes * componentCount;
  const stride = view.byteStride ?? elementBytes;
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const data = new DataView(
    parsed.binaryChunk.buffer,
    parsed.binaryChunk.byteOffset,
    parsed.binaryChunk.byteLength,
  );
  const values = [];
  for (let index = 0; index < accessor.count; index += 1) {
    const elementOffset = start + index * stride;
    for (let componentIndex = 0; componentIndex < componentCount; componentIndex += 1) {
      const offset = elementOffset + componentIndex * component.bytes;
      values.push(data[component.method](offset, true));
    }
  }
  return values;
}

function differingByteCount(first, second) {
  let count = Math.abs(first.length - second.length);
  const shared = Math.min(first.length, second.length);
  for (let index = 0; index < shared; index += 1) {
    if (first[index] !== second[index]) count += 1;
  }
  return count;
}

function metrics(parsed) {
  let triangles = 0;
  let primitives = 0;
  const bounds = {
    min: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
    max: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
  };
  for (const mesh of parsed.json.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      primitives += 1;
      const position = parsed.json.accessors[primitive.attributes.POSITION];
      const indices = primitive.indices === undefined
        ? position
        : parsed.json.accessors[primitive.indices];
      triangles += indices.count / 3;
      for (let axis = 0; axis < 3; axis += 1) {
        bounds.min[axis] = Math.min(bounds.min[axis], position.min[axis]);
        bounds.max[axis] = Math.max(bounds.max[axis], position.max[axis]);
      }
    }
  }
  return {
    bytes: parsed.buffer.length,
    fileSha256: sha256(parsed.buffer),
    jsonChunkBytes: parsed.jsonChunk.length,
    jsonChunkSha256: sha256(parsed.jsonChunk),
    binaryChunkBytes: parsed.binaryChunk.length,
    binaryChunkSha256: sha256(parsed.binaryChunk),
    nodes: parsed.json.nodes?.length ?? 0,
    meshes: parsed.json.meshes?.length ?? 0,
    primitives,
    triangles,
    materials: parsed.json.materials?.length ?? 0,
    materialNames: (parsed.json.materials ?? []).map(({ name }) => name),
    images: parsed.json.images?.length ?? 0,
    textures: parsed.json.textures?.length ?? 0,
    accessors: parsed.json.accessors?.length ?? 0,
    bufferViews: parsed.json.bufferViews?.length ?? 0,
    bounds,
  };
}

function compare(first, second) {
  const uses = accessorUses(first.json);
  const differingAccessors = [];
  for (let index = 0; index < first.json.accessors.length; index += 1) {
    const firstBytes = accessorBytes(first, index);
    const secondBytes = accessorBytes(second, index);
    if (firstBytes.equals(secondBytes)) continue;
    const firstValues = accessorValues(first, index);
    const secondValues = accessorValues(second, index);
    let maxAbsoluteValueDelta = 0;
    for (let valueIndex = 0; valueIndex < firstValues.length; valueIndex += 1) {
      maxAbsoluteValueDelta = Math.max(
        maxAbsoluteValueDelta,
        Math.abs(firstValues[valueIndex] - secondValues[valueIndex]),
      );
    }
    differingAccessors.push({
      accessorIndex: index,
      type: first.json.accessors[index].type,
      componentType: first.json.accessors[index].componentType,
      count: first.json.accessors[index].count,
      differingBytes: differingByteCount(firstBytes, secondBytes),
      maxAbsoluteValueDelta,
      uses: uses.get(index) ?? [],
    });
  }
  const nonTexcoordAccessorDifferences = differingAccessors.filter(
    ({ uses: accessorUse }) => accessorUse.some(
      ({ semantic }) => semantic !== "TEXCOORD_0",
    ),
  );
  return {
    first: first.path,
    second: second.path,
    exactFileMatch: first.buffer.equals(second.buffer),
    exactJsonChunkMatch: first.jsonChunk.equals(second.jsonChunk),
    exactBinaryChunkMatch: first.binaryChunk.equals(second.binaryChunk),
    differingFileBytes: differingByteCount(first.buffer, second.buffer),
    differingBinaryBytes: differingByteCount(
      first.binaryChunk,
      second.binaryChunk,
    ),
    differingAccessors,
    differingAccessorIndexes: differingAccessors.map(
      ({ accessorIndex }) => accessorIndex,
    ),
    onlyTexcoordAccessorsDiffer: (
      differingAccessors.length > 0
      && nonTexcoordAccessorDifferences.length === 0
    ),
    nonTexcoordAccessorDifferences,
  };
}

export async function auditGlbSet({ reference, roundtripA, roundtripB }) {
  const entries = await Promise.all(
    [reference, roundtripA, roundtripB].map(async (path) => (
      parseGlb(await readFile(path), path)
    )),
  );
  const [referenceParsed, roundtripAParsed, roundtripBParsed] = entries;
  const fileMetrics = Object.fromEntries(entries.map((entry) => [
    entry.path,
    metrics(entry),
  ]));
  const comparisons = {
    referenceToRoundtripA: compare(referenceParsed, roundtripAParsed),
    referenceToRoundtripB: compare(referenceParsed, roundtripBParsed),
    roundtripAToRoundtripB: compare(roundtripAParsed, roundtripBParsed),
  };
  const metricValues = Object.values(fileMetrics);
  const structuralMetricKeys = [
    "bytes",
    "nodes",
    "meshes",
    "primitives",
    "triangles",
    "materials",
    "images",
    "textures",
    "accessors",
    "bufferViews",
  ];
  const exactStructureMatch = structuralMetricKeys.every(
    (key) => metricValues.every(({ [key]: value }) => (
      value === metricValues[0][key]
    )),
  );
  const exactBoundsMatch = metricValues.every(({ bounds }) => (
    JSON.stringify(bounds) === JSON.stringify(metricValues[0].bounds)
  ));
  const exactMaterialOrderMatch = metricValues.every(({ materialNames }) => (
    JSON.stringify(materialNames)
      === JSON.stringify(metricValues[0].materialNames)
  ));
  return {
    schemaVersion: 1,
    assetId: "shanghai-cinema",
    purpose: "hero-source-reproduction",
    fileMetrics,
    comparisons,
    summary: {
      exactPublicShaReproduced: (
        comparisons.referenceToRoundtripA.exactFileMatch
        && comparisons.referenceToRoundtripB.exactFileMatch
      ),
      exactRoundtripDeterminism: (
        comparisons.roundtripAToRoundtripB.exactFileMatch
      ),
      exactJsonChunkMatch: Object.values(comparisons).every(
        ({ exactJsonChunkMatch }) => exactJsonChunkMatch,
      ),
      exactStructureMatch,
      exactBoundsMatch,
      exactMaterialOrderMatch,
      onlyTexcoordAccessorsDiffer: Object.values(comparisons).every(
        ({ onlyTexcoordAccessorsDiffer }) => onlyTexcoordAccessorsDiffer,
      ),
      verdict: (
        comparisons.referenceToRoundtripA.exactFileMatch
        && comparisons.referenceToRoundtripB.exactFileMatch
        && comparisons.roundtripAToRoundtripB.exactFileMatch
          ? "pass-exact-source-reproduction"
          : "blocked-exact-sha-texcoord-float-nondeterminism"
      ),
    },
  };
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    values[argument.slice(2)] = argv[index + 1];
    index += 1;
  }
  for (const key of ["reference", "roundtrip-a", "roundtrip-b"]) {
    if (!values[key]) throw new Error(`缺少 --${key}`);
  }
  return {
    reference: values.reference,
    roundtripA: values["roundtrip-a"],
    roundtripB: values["roundtrip-b"],
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await auditGlbSet(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
