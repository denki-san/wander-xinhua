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
  assert.equal(buffer.readUInt32LE(16), 0x4e4f534a);
  const length = buffer.readUInt32LE(12);
  return {
    buffer,
    json: JSON.parse(buffer.toString("utf8", 20, 20 + length)),
  };
}

function triangleCount(gltf) {
  return (gltf.meshes ?? []).reduce(
    (meshTotal, mesh) => meshTotal + mesh.primitives.reduce(
      (primitiveTotal, primitive) => {
        const accessor = primitive.indices
          ?? primitive.attributes.POSITION;
        return primitiveTotal + gltf.accessors[accessor].count / 3;
      },
      0,
    ),
    0,
  );
}

test("独立审查失败的 8 个道路 POI 已改为 exact-footprint 或 site-feature 净体块", async () => {
  const [manifest, spec, inventory] = await Promise.all([
    readJson("docs/research/xinhua-road-clean-massing-manifest.json"),
    readJson("docs/research/xinhua-road-clean-massing-geometry-spec.json"),
    readJson("docs/research/data/xinhua-building-inventory-20260724-185400.json"),
  ]);
  const inventoryWayIds = new Set(
    inventory.buildings
      .filter(({ osm }) => osm.type === "way")
      .map(({ osm }) => osm.id),
  );
  assert.equal(manifest.prototypeCount, 8);
  assert.equal(spec.assets.length, 8);
  assert.equal(manifest.assets.length, 8);
  assert.equal(manifest.identityAllowed, false);
  assert.equal(manifest.totalChildren, 38);
  assert.equal(
    new Set(manifest.assets.map(({ assetId }) => assetId)).size,
    8,
  );
  for (const asset of spec.assets) {
    assert.equal(asset.membershipConfidence !== undefined, true);
    for (const wayId of asset.candidateWayIds) {
      assert.equal(inventoryWayIds.has(wayId), true, `${asset.id} 缺少 way ${wayId}`);
    }
  }
  const pocket = spec.assets.find(({ id }) => id === "xinhua-pocket-park");
  assert.equal(pocket.kind, "site-feature");
  assert.deepEqual(pocket.candidateWayIds, []);
  assert.equal(pocket.children.includes("path-slab"), true);
  assert.equal(
    spec.placementContract.compoundRule,
    "one child mesh per candidate way; courtyard and path remain negative space",
  );
});

test("8 个 Massing v2 保留旧批次并新增 Blender、GLB、双视角与逐 child 记录", async () => {
  const manifest = await readJson(
    "docs/research/xinhua-road-clean-massing-manifest.json",
  );
  for (const asset of manifest.assets) {
    await Promise.all([
      access(new URL(asset.outputs.blend, root)),
      access(new URL(asset.outputs.previews.canonical, root)),
      access(new URL(asset.outputs.previews.side, root)),
      access(
        new URL(
          `public/models/tiers/xinhua-road/massing/${asset.assetId.split(":").at(-1)}-massing.glb`,
          root,
        ),
      ),
    ]);
    const recordPath = (
      `docs/research/build-records/tiers/xinhua-road/massing-v2/`
      + `${asset.assetId.split(":").at(-1)}-massing.json`
    );
    const [record, glb] = await Promise.all([
      readJson(recordPath),
      readGlb(asset.outputs.glb),
    ]);
    assert.equal(record.batch, "clean-footprint-v2");
    assert.equal(record.placement.movementAuthorized, false);
    assert.equal(
      record.heightEvidence.status,
      "unknown-runtime-fallback-not-evidence",
    );
    assert.equal(record.identityAllowed, false);
    assert.equal(
      record.glb.sha256,
      createHash("sha256").update(glb.buffer).digest("hex"),
    );
    assert.equal(record.glb.bytes, glb.buffer.length);
    assert.equal(record.glb.nodes, record.children.length);
    assert.equal(record.glb.meshes, record.children.length);
    assert.equal(record.glb.materials, 1);
    assert.equal(record.glb.images, 0);
    assert.equal(record.glb.textures, 0);
    assert.equal(record.glb.triangles, triangleCount(glb.json));
    assert.equal(record.glb.transformedNodes.length, 0);
    assert.ok(record.glb.bytes <= 160_000);
    assert.ok(record.glb.triangles <= 1_200);
    for (const node of glb.json.nodes) {
      assert.equal(node.extras?.tier, "massing");
      if (record.assetId.endsWith("xinhua-pocket-park")) {
        assert.equal(node.extras?.map_binding, "not-a-building");
      } else {
        assert.equal(node.extras?.geometry_evidence, "observed-osm-footprint");
        assert.equal(
          node.extras?.height_evidence,
          "unknown-runtime-fallback-not-evidence",
        );
      }
    }
  }
  await Promise.all([
    access(
      new URL(
        "test_artifacts/all-models/massing-v2/test_xinhua-road-clean-massing-v2-canonical-contact-sheet.png",
        root,
      ),
    ),
    access(
      new URL(
        "test_artifacts/all-models/massing-v2/test_xinhua-road-clean-massing-v2-side-contact-sheet.png",
        root,
      ),
    ),
  ]);
});

test("道路 Massing v2 有按资产隔离和确定性三分之四机位", async () => {
  const [worldSource, roadSource, experienceSource, qa] = await Promise.all([
    readFile(new URL("app/scene/xinhua-world.tsx", root), "utf8"),
    readFile(new URL("app/scene/xinhua-road-massing.tsx", root), "utf8"),
    readFile(new URL("app/xinhua-experience.tsx", root), "utf8"),
    readJson("docs/research/xinhua-road-clean-massing-runtime-qa.json"),
  ]);
  assert.match(roadSource, /onlyLandmarkId/);
  assert.match(roadSource, /runtimeCorrectionScaleZ/);
  assert.match(worldSource, /RoadMassingIsolationQaCamera/);
  assert.match(worldSource, /gl\.render\(scene, camera\)/);
  assert.match(experienceSource, /qaModelId/);
  assert.match(experienceSource, /isolated-three-quarter/);
  assert.equal(qa.assets.length, 8);
  assert.equal(
    qa.assets.filter(({ runtimeGeometryVisual }) => (
      runtimeGeometryVisual === "pass"
    )).length,
    8,
  );
  assert.equal(qa.independentReview.formalMassingPassCount, 0);
  assert.equal(qa.independentReview.identityAllowedCount, 0);
  assert.equal(qa.formalGate.mapAcceptance, "blocked");
});

test("OSM 顶点经 Blender、glTF 和 runtime Z 修正后可往返原世界坐标", async () => {
  const [manifest, inventory] = await Promise.all([
    readJson("docs/research/xinhua-road-clean-massing-manifest.json"),
    readJson("docs/research/data/xinhua-building-inventory-20260724-185400.json"),
  ]);
  const sourceByWay = new Map(
    inventory.buildings
      .filter(({ osm }) => osm.type === "way")
      .map((building) => [building.osm.id, building]),
  );
  let checkedWays = 0;
  for (const asset of manifest.assets) {
    const slug = asset.assetId.split(":").at(-1);
    const record = await readJson(
      `docs/research/build-records/tiers/xinhua-road/massing-v2/${slug}-massing.json`,
    );
    const [pivotX, pivotZ] = record.placement.position;
    const { yaw, scale } = record.placement;
    const cosine = Math.cos(yaw);
    const sine = Math.sin(yaw);
    for (const child of record.children) {
      if (!child.sourceWayId) continue;
      const source = sourceByWay.get(child.sourceWayId);
      assert.ok(source, `缺少 source way ${child.sourceWayId}`);
      const reconstructed = child.localFootprint.map(([localX, blenderY]) => {
        // Blender Y 导出为 Three -Z；runtime scaleZ=-1 后恢复 localZ=BlenderY。
        const exportedThreeZ = -blenderY;
        const correctedLocalZ = -exportedThreeZ;
        return [
          pivotX + scale * (cosine * localX + sine * correctedLocalZ),
          pivotZ + scale * (-sine * localX + cosine * correctedLocalZ),
        ];
      });
      const byCoordinate = ([leftX, leftZ], [rightX, rightZ]) => (
        leftX - rightX || leftZ - rightZ
      );
      const actual = reconstructed.toSorted(byCoordinate);
      const expected = source.positioning.footprint.toSorted(byCoordinate);
      assert.equal(actual.length, expected.length);
      for (let index = 0; index < actual.length; index += 1) {
        assert.ok(
          Math.abs(actual[index][0] - expected[index][0]) <= 0.0002
          && Math.abs(actual[index][1] - expected[index][1]) <= 0.0002,
          `${slug} way ${child.sourceWayId} 的坐标往返漂移超过局部点六位小数量化容差`,
        );
      }
      checkedWays += 1;
    }
  }
  assert.equal(checkedWays, 31);
});
