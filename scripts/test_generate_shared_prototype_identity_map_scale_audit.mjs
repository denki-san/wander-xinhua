import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const outputPath = (
  "docs/research/shared-prototypes-identity-map-scale-audit.json"
);
const placementsPath = "docs/research/model-placement-registry-20260725.json";
const identityManifestPath = (
  "docs/research/shared-prototypes-identity-manifest.json"
);
const massingManifestPath = (
  "docs/research/shared-prototypes-massing-manifest.json"
);

const legacyRuntimeBaselines = {
  "lane-lamp-short-arm": {
    envelope: [0.78, 3.36, 0.38],
    source: "app/scene/shared-street-assets.tsx#HeritageLaneLamp",
    collision: "base-only",
    basis: "procedural mesh extrema, rounded to 0.01 scene unit",
  },
  "cantilever-umbrella": {
    envelope: [3.56, 2.57, 3.56],
    source: "app/scene/shared-street-assets.tsx#CantileverCafeUmbrella",
    collision: "none",
    basis: "procedural canopy radius and vertical extrema",
  },
  "outdoor-table-set": {
    envelope: [2.4, 1.07, 2.2],
    source: "app/scene/shared-street-assets.tsx#OutdoorDiningSet",
    collision: "explicit-box",
    basis: "declared footprint and tallest chair extrema",
  },
  "slatted-bench": {
    envelope: [2.35, 0.93, 0.82],
    source: "app/scene/shared-street-assets.tsx#SlattedBench",
    collision: "explicit-box",
    basis: "declared footprint and highest back slat",
  },
  "rectangular-planter": {
    envelopeRange: {
      min: [0.62, 1.36, 0.54],
      max: [1.4, 1.53, 0.72],
    },
    source: (
      "app/scene/shared-street-assets.tsx#StreetPlanter/"
      + "StreetPlanterInstances"
    ),
    collision: "base-only-or-none",
    basis: "square, tall, long and instanced procedural variants",
  },
  "shanghai-dual-classification-bin": {
    envelope: [0.9, 0.91, 0.46],
    source: "app/scene/shared-street-assets.tsx#StreetBinInstances",
    collision: "none",
    basis: "instanced body and cap extrema",
  },
  "irregular-stone-bollard": {
    envelope: [1.6, 1.45, 1.35],
    source: "app/scene/shared-street-assets.tsx#IrregularStoneBollards",
    collision: "base-only",
    basis: "unscaled base geometry before per-instance scale",
  },
};

const heroPlaneTreeModels = [
  "public/models/xinhua-road/plane-tree-a.glb",
  "public/models/xinhua-road/plane-tree-b.glb",
  "public/models/xinhua-road/plane-tree-c.glb",
];

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function glbBounds(path) {
  const buffer = await readFile(new URL(path, root));
  if (buffer.toString("ascii", 0, 4) !== "glTF") {
    throw new Error(`${path} 不是 GLB`);
  }
  const jsonLength = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength));
  const minimum = [Infinity, Infinity, Infinity];
  const maximum = [-Infinity, -Infinity, -Infinity];
  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      const accessor = gltf.accessors[primitive.attributes.POSITION];
      for (let axis = 0; axis < 3; axis += 1) {
        minimum[axis] = Math.min(minimum[axis], accessor.min[axis]);
        maximum[axis] = Math.max(maximum[axis], accessor.max[axis]);
      }
    }
  }
  return minimum.map((value, axis) => (
    Number((maximum[axis] - value).toFixed(4))
  ));
}

function dimensions(bounds) {
  return bounds.min.map((value, axis) => (
    Number((bounds.max[axis] - value).toFixed(4))
  ));
}

function ratios(baseline, candidate) {
  return baseline.map((value, axis) => (
    Number((value / candidate[axis]).toFixed(3))
  ));
}

function placementSummary(placements) {
  const summary = new Map();
  const add = (site, placement) => {
    const slug = placement.prototype.split(":").at(-1);
    const current = summary.get(slug) ?? {
      total: 0,
      sites: {},
      coordinateSpaces: new Set(),
    };
    current.total += 1;
    current.sites[site] = (current.sites[site] ?? 0) + 1;
    current.coordinateSpaces.add(placement.coordinateSpace);
    summary.set(slug, current);
  };
  for (const placement of placements.vegetation.xinhuaRoadPlaneTrees) {
    add("xinhua-road", placement);
  }
  for (const placement of placements.vegetation.xingfuliPlaneTrees) {
    add("xingfuli", placement);
  }
  for (const [site, entries] of Object.entries(placements.streetFurniture)) {
    for (const placement of entries) add(site, placement);
  }
  return Object.fromEntries(
    [...summary.entries()].map(([slug, value]) => [
      slug,
      {
        total: value.total,
        sites: value.sites,
        coordinateSpaces: [...value.coordinateSpaces].sort(),
      },
    ]),
  );
}

const [placements, identityManifest, massingManifest, ...heroTreeBounds] = (
  await Promise.all([
    readJson(placementsPath),
    readJson(identityManifestPath),
    readJson(massingManifestPath),
    ...heroPlaneTreeModels.map(glbBounds),
  ])
);
const counts = placementSummary(placements);
const massingBySlug = new Map(
  massingManifest.assets.map((asset) => [asset.slug, asset]),
);

const assets = identityManifest.assets.map((identity) => {
  const massing = massingBySlug.get(identity.slug);
  const identityEnvelope = dimensions(identity.glb.bounds);
  const massingEnvelope = dimensions(massing.glb.bounds);
  if (identity.slug === "xinhua-plane-tree") {
    const heightRatios = heroTreeBounds.map((bounds) => (
      Number((bounds[1] / identityEnvelope[1]).toFixed(3))
    ));
    return {
      slug: identity.slug,
      assetId: identity.assetId,
      instances: counts[identity.slug],
      massingEnvelope,
      identityEnvelope,
      currentRuntimeHeroEnvelopes: heroTreeBounds.map((bounds, index) => ({
        variant: ["a", "b", "c"][index],
        file: heroPlaneTreeModels[index],
        bounds,
        ratioToIdentity: ratios(bounds, identityEnvelope),
      })),
      transformAudit: {
        stableAcrossCurrentIdentityAndHero: false,
        heroToIdentityHeightRatioRange: [
          Math.min(...heightRatios),
          Math.max(...heightRatios),
        ],
        mapScaleGate: "blocked",
        reason: (
          "The same per-instance scale produces materially different crown "
          + "and height envelopes across current Identity and legacy Hero."
        ),
      },
      collisionAudit: {
        passCount: 0,
        status: "pending-common-tier-collision-proxy-and-map-walkaround",
      },
    };
  }

  const baseline = legacyRuntimeBaselines[identity.slug];
  const runtimeEnvelope = baseline.envelope ?? baseline.envelopeRange.max;
  return {
    slug: identity.slug,
    assetId: identity.assetId,
    instances: counts[identity.slug],
    massingEnvelope,
    identityEnvelope,
    currentRuntimeProcedural: baseline,
    currentRuntimeToIdentityRatio: ratios(
      runtimeEnvelope,
      identityEnvelope,
    ),
    transformAudit: {
      stableAcrossCurrentIdentityAndRuntimeProcedural: false,
      mapScaleGate: "blocked",
      reason: (
        "The current procedural prototype and the new Identity GLB do not "
        + "share one authored envelope under the same placement transform."
      ),
    },
    collisionAudit: {
      passCount: 0,
      status: (
        baseline.collision === "explicit-box"
          ? "pending-proxy-reconciliation-and-map-walkaround"
          : "blocked-missing-or-base-only-proxy"
      ),
    },
  };
});

const audit = {
  version: 1,
  auditedAt: "2026-07-25",
  status: "all-72-instance-map-scale-and-collision-gates-blocked",
  scope: {
    prototypeCount: assets.length,
    instanceCount: assets.reduce(
      (total, asset) => total + asset.instances.total,
      0,
    ),
    xinhuaRoadPlaneTrees: counts["xinhua-plane-tree"].sites["xinhua-road"],
    xingfuliPlaneTrees: counts["xinhua-plane-tree"].sites.xingfuli,
    xinhuaRoadStreetFurniture: placements.streetFurniture.xinhuaRoad.length,
    xingfuliStreetFurniture: placements.streetFurniture.xingfuli.length,
  },
  coordinateContract: {
    authoredMetersPerSceneUnit: 2.7,
    placementTransformsMustRemainTierStable: true,
    xingfuliNonUniformSiteTransformRequiresRuntimeValidation: true,
  },
  sources: {
    placements: placementsPath,
    identityManifest: identityManifestPath,
    massingManifest: massingManifestPath,
    runtimeProcedural: "app/scene/shared-street-assets.tsx",
    runtimePlaneTrees: "app/scene/plane-tree-instances.tsx",
  },
  countsByPrototype: counts,
  assets,
  decisions: {
    runtimePlacementsChanged: 0,
    identityPromotedToProductionMap: 0,
    mapScalePassCount: 0,
    yawPassCount: 0,
    collisionAndPassagePassCount: 0,
    formalIdentityPassCount: 0,
  },
  blockers: [
    "Legacy runtime procedural envelopes are not transform-compatible with the new Identity GLBs.",
    "The three legacy plane-tree Hero variants are 1.371–1.454 times the Identity height under the same instance scale.",
    "Xingfuli applies non-uniform site scaling, so local screenshots cannot prove world scale or clearance.",
    "No per-instance field measurement or map walkaround currently authorizes a global rescale.",
    "Collision proxies are missing, base-only, or not reconciled to the new Identity bounds.",
  ],
  nextGate: [
    "Render the Identity GLBs at all 72 registered transforms in real map QA pages without changing production placements.",
    "Capture site/group and representative close views with deterministic cameras.",
    "Choose one common authored envelope per prototype from evidence, then migrate legacy fallback/Hero or placement scale once.",
    "Regenerate collision proxies from the selected common envelope and run deterministic walkaround paths.",
  ],
};

await writeFile(
  new URL(outputPath, root),
  `${JSON.stringify(audit, null, 2)}\n`,
);
console.log(
  `Shared Identity map scale audit: ${audit.scope.instanceCount} instances, `
  + "formal map pass 0",
);
