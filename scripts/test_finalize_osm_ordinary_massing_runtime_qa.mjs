import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const manifestUrl = new URL(
  "docs/research/osm-ordinary-massing-manifest.json",
  root,
);
const qaPath = "docs/research/osm-ordinary-massing-runtime-qa.json";
const qaUrl = new URL(qaPath, root);
const qa = JSON.parse(await readFile(qaUrl, "utf8"));
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
const runtimeGate = "overview-runtime-pass-formal-sampling-blocked";

if (qa.formalGate.overall !== "blocked" || qa.formalGate.identityAllowed) {
  throw new Error("OSM 普通建筑运行时记录不得在抽样完成前放行 Identity");
}

manifest.status = "massing-generated-overview-runtime-pass-formal-gate-blocked";
manifest.runtimeQa = qaPath;
manifest.qualityBoundary.height = (
  "11 levels-derived among ordinary buildings; "
  + "853 runtime fallback heights explicitly unknown"
);
for (const chunk of manifest.chunks) {
  chunk.runtimeGate = runtimeGate;
}
for (const instance of manifest.instances) {
  instance.runtimeGate = runtimeGate;
}

for (const chunk of manifest.chunks) {
  const recordUrl = new URL(chunk.buildRecord, root);
  const record = JSON.parse(await readFile(recordUrl, "utf8"));
  record.status = "blender-glb-overview-runtime-pass-formal-gate-blocked";
  record.runtimeGate = runtimeGate;
  record.runtimeQa = {
    file: qaPath,
    screenshot: qa.visualReview.screenshot,
    overviewLoadAndRender: "pass",
    formalGate: "blocked",
    identityAllowed: false,
  };
  await writeFile(recordUrl, `${JSON.stringify(record, null, 2)}\n`);
}

await writeFile(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`);
