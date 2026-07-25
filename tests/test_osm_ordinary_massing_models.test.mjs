import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function readGlb(path) {
  const buffer = await readFile(new URL(path, root));
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.readUInt32LE(16);
  assert.equal(jsonType, 0x4e4f534a);
  return {
    buffer,
    json: JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength)),
  };
}

function triangleCount(gltf) {
  return (gltf.meshes ?? []).reduce(
    (meshTotal, mesh) => meshTotal + mesh.primitives.reduce(
      (primitiveTotal, primitive) => {
        const accessorIndex = primitive.indices
          ?? primitive.attributes.POSITION;
        return primitiveTotal + gltf.accessors[accessorIndex].count / 3;
      },
      0,
    ),
    0,
  );
}

test("864 个普通 OSM 建筑都有稳定 Massing 节点和逐栋证据边界", async () => {
  const [inventory, manifest] = await Promise.all([
    readJson("docs/research/data/xinhua-building-inventory-20260724-185400.json"),
    readJson("docs/research/osm-ordinary-massing-manifest.json"),
  ]);
  const ordinary = inventory.buildings.filter(
    ({ role }) => role === "ordinary-building",
  );
  assert.equal(ordinary.length, 864);
  assert.equal(manifest.scope.buildingCount, 864);
  assert.equal(manifest.scope.chunkCount, 14);
  assert.equal(manifest.instances.length, 864);
  assert.equal(new Set(manifest.instances.map(({ id }) => id)).size, 864);
  assert.deepEqual(
    manifest.instances.map(({ id }) => id).sort(),
    ordinary.map(({ id }) => id).sort(),
  );
  assert.equal(
    manifest.scope.sourceInventorySha256,
    createHash("sha256")
      .update(
        await readFile(
          new URL(
            "docs/research/data/xinhua-building-inventory-20260724-185400.json",
            root,
          ),
        ),
      )
      .digest("hex"),
  );

  for (const instance of manifest.instances) {
    assert.match(instance.id, /^building:xinhua:osm-/);
    assert.match(instance.nodeName, /^osm-(way|relation)-/);
    assert.equal(instance.runtimeGroupPosition.length, 3);
    assert.ok(instance.footprint.length >= 3);
    assert.ok(instance.footprintAreaSqMeters > 0);
    assert.ok(instance.heightMeters > 0);
    assert.ok(instance.heightSceneUnits > 0);
    assert.equal(instance.geometryEvidence, "observed-osm-footprint");
    assert.equal(
      instance.photoEvidenceStatus,
      "photo-evidence-unavailable-for-massing",
    );
    assert.equal(instance.massing, "generated-footprint-extrusion");
    assert.equal(
      instance.runtimeGate,
      "overview-runtime-pass-formal-sampling-blocked",
    );
  }
});

test("14 个普通建筑分块都有可编辑 Blend、审计 GLB、双视角和 build record", async () => {
  const manifest = await readJson(
    "docs/research/osm-ordinary-massing-manifest.json",
  );
  let buildingCount = 0;
  let totalBytes = 0;
  let totalTriangles = 0;

  for (const chunk of manifest.chunks) {
    buildingCount += chunk.buildingCount;
    totalBytes += chunk.glbBytes;
    totalTriangles += chunk.triangles;
    await Promise.all([
      access(new URL(chunk.blend, root)),
      access(new URL(chunk.previews.canonical, root)),
      access(new URL(chunk.previews.side, root)),
    ]);
    const [record, glb] = await Promise.all([
      readJson(chunk.buildRecord),
      readGlb(chunk.glb),
    ]);
    assert.equal(
      record.status,
      "blender-glb-overview-runtime-pass-formal-gate-blocked",
    );
    assert.equal(record.buildingCount, chunk.buildingCount);
    assert.deepEqual(record.chunkOrigin, chunk.origin);
    assert.equal(record.outputs.glb, chunk.glb);
    assert.equal(
      record.glb.sha256,
      createHash("sha256").update(glb.buffer).digest("hex"),
    );
    assert.equal(record.glb.bytes, glb.buffer.length);
    assert.equal(record.glb.nodes, chunk.buildingCount);
    assert.equal(record.glb.meshes, chunk.buildingCount);
    assert.equal(record.glb.materials, 1);
    assert.equal(record.glb.images, 0);
    assert.equal(record.glb.textures, 0);
    assert.equal(record.glb.triangles, triangleCount(glb.json));
    assert.equal(record.rootTransforms.transformedNodeCount, 0);
    assert.ok(record.glb.bytes < 350_000);
    assert.ok(record.glb.triangles < 4_000);
    assert.equal(
      glb.json.nodes.filter(
        (node) => ["translation", "rotation", "scale", "matrix"]
          .some((key) => key in node),
      ).length,
      0,
    );
    assert.equal(
      new Set(glb.json.nodes.map(({ name }) => name)).size,
      chunk.buildingCount,
    );
    for (const node of glb.json.nodes) {
      assert.equal(node.extras?.tier, "massing");
      assert.match(node.extras?.asset_id, /^building:xinhua:osm-/);
      assert.equal(node.extras?.evidence_geometry, "observed-osm-footprint");
    }
  }

  assert.equal(buildingCount, 864);
  assert.equal(totalBytes, 1_525_432);
  assert.equal(totalTriangles, 17_068);
  await Promise.all([
    access(
      new URL(
        "test_artifacts/all-models/massing/osm-ordinary/test_osm-ordinary-massing-canonical-contact-sheet.png",
        root,
      ),
    ),
    access(
      new URL(
        "test_artifacts/all-models/massing/osm-ordinary/test_osm-ordinary-massing-side-contact-sheet.png",
        root,
      ),
    ),
    access(
      new URL(
        "test_artifacts/all-models/massing/osm-ordinary/test_osm-ordinary-massing-threejs-overview.jpg",
        root,
      ),
    ),
  ]);
});

test("普通建筑 Three.js 总览通过，但抽样、碰撞和去重完成前禁止进入 Identity", async () => {
  const [manifest, qa, source] = await Promise.all([
    readJson("docs/research/osm-ordinary-massing-manifest.json"),
    readJson("docs/research/osm-ordinary-massing-runtime-qa.json"),
    readFile(
      new URL("app/scene/osm-ordinary-massing.tsx", root),
      "utf8",
    ),
  ]);
  assert.equal(
    manifest.status,
    "massing-generated-overview-runtime-pass-formal-gate-blocked",
  );
  assert.equal(
    manifest.runtimeQa,
    "docs/research/osm-ordinary-massing-runtime-qa.json",
  );
  assert.equal(qa.network.glbRequests, 14);
  assert.equal(qa.network.glbResponses, 14);
  assert.equal(qa.network.glbFailures, 0);
  assert.equal(qa.runtime.canvasCount, 1);
  assert.equal(qa.runtime.stage, "playable");
  assert.equal(qa.formalGate.overviewLoadAndRender, "pass");
  assert.equal(qa.formalGate.overall, "blocked");
  assert.equal(qa.formalGate.identityAllowed, false);
  assert.equal(qa.formalGate.streetFixedCameraSamples, "pending");
  assert.equal(qa.formalGate.deterministicApproachAndWalkaround, "pending");
  assert.equal(qa.formalGate.namedAndCoreOverlapDeduplication, "pending");
  assert.match(source, /OSM_ORDINARY_MASSING_CHUNKS/);
  assert.match(source, /qaOnly: true/);
  assert.equal(
    (source.match(/id: "r\d+c\d+"/g) ?? []).length,
    14,
  );
});
