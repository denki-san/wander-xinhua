import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import {
  resolveShanghaiCinemaDelivery,
  SHANGHAI_CINEMA_ASSET_ID,
  SHANGHAI_CINEMA_BYTES,
  SHANGHAI_CINEMA_CACHE_VERSION,
  SHANGHAI_CINEMA_CDN_URL,
  SHANGHAI_CINEMA_LOCAL_FALLBACK,
  SHANGHAI_CINEMA_LOCAL_FALLBACK_PATH,
  SHANGHAI_CINEMA_SHA256,
} from "../app/scene/shanghai-cinema-delivery-contract.mjs";

const root = new URL("../", import.meta.url);
const assetLock = JSON.parse(
  await readFile(new URL("config/asset-lock.json", root), "utf8"),
);
const buildRecord = JSON.parse(
  await readFile(
    new URL(
      "docs/research/build-records/shanghai-cinema-cdn-pilot.json",
      root,
    ),
    "utf8",
  ),
);
const runtimeSource = await readFile(
  new URL("app/scene/xinhua-road-landmarks.tsx", root),
  "utf8",
);
const nginxSource = await readFile(
  new URL("deploy/nginx/xinhua.denkisan.me.conf", root),
  "utf8",
);

test("上海影城 Hero 的 source、CDN 和本地 fallback 锁定同一 lineage", async () => {
  const asset = assetLock.assets.find(
    ({ assetId }) => assetId === SHANGHAI_CINEMA_ASSET_ID,
  );
  assert.ok(asset);
  assert.equal(asset.version, "cdn-pilot-v1");
  assert.equal(asset.source.storage, "main-repository");
  assert.equal(asset.source.path, buildRecord.source.path);

  const source = await readFile(new URL(asset.source.path, root));
  assert.equal(source.byteLength, asset.source.bytes);
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    asset.source.sha256,
  );

  const runtime = asset.runtime[0];
  assert.equal(runtime.tier, "hero");
  assert.equal(runtime.delivery, "cdn");
  assert.equal(runtime.location, SHANGHAI_CINEMA_CDN_URL);
  assert.equal(runtime.sha256, SHANGHAI_CINEMA_SHA256);
  assert.equal(runtime.bytes, SHANGHAI_CINEMA_BYTES);
  assert.equal(runtime.fallbackLocation, buildRecord.runtime.path);
  assert.equal(
    `/${runtime.fallbackLocation.replace(/^public\//, "")}?v=${runtime.cacheVersion}`,
    SHANGHAI_CINEMA_LOCAL_FALLBACK,
  );
  assert.equal(
    SHANGHAI_CINEMA_LOCAL_FALLBACK_PATH,
    `/${runtime.fallbackLocation.replace(/^public\//, "")}`,
  );
  assert.equal(runtime.cacheVersion, SHANGHAI_CINEMA_CACHE_VERSION);
  assert.match(runtime.location, new RegExp(`/sha256/${runtime.sha256}/`));

  const localRuntime = await readFile(new URL(runtime.fallbackLocation, root));
  assert.equal(localRuntime.byteLength, runtime.bytes);
  assert.equal(
    createHash("sha256").update(localRuntime).digest("hex"),
    runtime.sha256,
  );
  assert.deepEqual(runtime.bounds, buildRecord.runtime.bounds);
  assert.equal(runtime.triangles, buildRecord.runtime.triangles);
  assert.equal(
    asset.lineage.buildRecord,
    "docs/research/build-records/shanghai-cinema-cdn-pilot.json",
  );
  assert.equal(
    (await stat(new URL(asset.lineage.generator, root))).isFile(),
    true,
  );
});

test("上海影城交付 resolver 默认走 immutable CDN，可确定性强制本地回退", () => {
  const primary = resolveShanghaiCinemaDelivery("");
  assert.deepEqual(primary, {
    assetId: SHANGHAI_CINEMA_ASSET_ID,
    requestedPath: SHANGHAI_CINEMA_CDN_URL,
    loadedPath: SHANGHAI_CINEMA_CDN_URL,
    status: "cdn",
    sha256: SHANGHAI_CINEMA_SHA256,
    bytes: SHANGHAI_CINEMA_BYTES,
  });

  for (const search of [
    "?asset-cdn-fallback=shanghai-cinema",
    "?asset-cdn-fallback=all",
    "?asset-cdn-fallback=house-315%2Cshanghai-cinema",
  ]) {
    const fallback = resolveShanghaiCinemaDelivery(search);
    assert.equal(fallback.requestedPath, SHANGHAI_CINEMA_CDN_URL);
    assert.equal(fallback.loadedPath, SHANGHAI_CINEMA_LOCAL_FALLBACK);
    assert.equal(fallback.status, "local-fallback");
  }

  const oldManifest = resolveShanghaiCinemaDelivery("", null);
  assert.equal(oldManifest.loadedPath, SHANGHAI_CINEMA_LOCAL_FALLBACK);
  assert.equal(oldManifest.status, "local-fallback");
});

test("运行时保持 distance load，并按 CDN → app GLB → Identity 回退", () => {
  assert.match(
    runtimeSource,
    /userData=\{\{ stage: "full", loading: "distance-state-on-demand" \}\}/,
  );
  assert.match(
    runtimeSource,
    /landmark\.id === SHANGHAI_CINEMA_ASSET_ID[\s\S]*?<ShanghaiCinemaRuntimeAsset/,
  );
  assert.match(
    runtimeSource,
    /<ProgressiveFeatureBoundary[\s\S]*?<Suspense fallback=\{fallback\}>[\s\S]*?<ShanghaiCinemaDeliveryModel delivery=\{localFallbackDelivery\}/,
  );
  assert.match(
    runtimeSource,
    /fallback=\{\([\s\S]*?<LandmarkProgressiveProxy landmark=\{landmark\} identity \/>/,
  );
  assert.match(
    runtimeSource,
    /fallback=\{activeModelFailureFallback\}[\s\S]*?<Suspense fallback=\{landmarkIdentityFallback\}>/,
  );
  assert.match(
    runtimeSource,
    /function ShanghaiCinemaIdentityFailure[\s\S]*?xinhuaAssetDeliveryStatus = "identity-fallback"/,
  );
  assert.doesNotMatch(
    runtimeSource,
    /useGLTF\.preload\([^)]*SHANGHAI_CINEMA/,
  );
  assert.equal(buildRecord.scope.nonFirstScreenHero, true);
  assert.equal(buildRecord.runtime.firstScreenPreload, false);
});

test("Nginx route 将 SHA 路径映射为可长期缓存的 GLB", () => {
  assert.match(nginxSource, new RegExp(
    `location = /cdn/sha256/${SHANGHAI_CINEMA_SHA256}/shanghai-cinema\\.glb\\.bin\\.js`,
  ));
  assert.match(nginxSource, /model\/gltf-binary js;/);
  assert.match(
    nginxSource,
    /max_ranges 0;/,
  );
  assert.match(
    nginxSource,
    /add_header Cache-Control "public, max-age=31536000, immutable";/,
  );
  assert.match(
    nginxSource,
    /error_page 404 = @shanghai_cinema_asset_not_found;/,
  );
  assert.match(
    nginxSource,
    /location @shanghai_cinema_asset_not_found[\s\S]*?Cache-Control "no-store" always;[\s\S]*?return 404;/,
  );
  assert.match(nginxSource, /Access-Control-Allow-Origin "\*" always;/);
  assert.match(
    nginxSource,
    new RegExp(`X-Content-SHA256 "${SHANGHAI_CINEMA_SHA256}";`),
  );
  assert.equal(buildRecord.cdn.publicValidation.status, "passed");
  assert.ok(
    buildRecord.cdn.publicValidation.cloudflareObservations.some(
      ({ cacheStatus }) => cacheStatus === "HIT",
    ),
  );
});
