# Hero Plane Tree Model Brief

## Subject

- Common Chinese project name: 上海梧桐 / 法国梧桐
- Botanical target: `Platanus × hispanica` (syn. `Platanus × acerifolia`, London plane)
- Intended use: a hero-quality, reusable street-tree asset for Xinhua Wonder and a dedicated WebGL inspection page

## Intended stylization level

- Refined low-poly with a tactile, warm, hand-authored look
- Match the visual density of `references/plane-tree/style-target.png` without treating that generated marketing image as factual geometry
- Preserve a readable branch skeleton and crown gaps from street distance
- Avoid photogrammetry, photo textures, and billboard-only foliage

## World scale and coordinate convention

- Blender: metres, Z-up, front comparison view looking from Y-negative toward the origin
- Runtime: metres, Three.js Y-up after GLB import
- Target height: approximately 12.5–13.5 m
- Target crown spread: approximately 8.5–9.5 m
- Clear trunk height before the main fork: approximately 4.2–4.8 m

## Placement evidence

- This first asset is a species/street-context study, not a survey of one exact Xinhua Road tree.
- The avenue reference is used only to infer mature street-tree spacing, raised crowns, and the way adjacent crowns can knit together.
- Exact placement, lean, pruning scars, and crown direction must be varied when the asset is later placed on a real street.

## Primary reference URLs

- Kew taxon record: https://powo.science.kew.org/taxon/685854-1
- Canonical full-tree photo: https://commons.wikimedia.org/wiki/File:Platanus_x_acerifolia.jpg
- Avenue/canopy photo: https://commons.wikimedia.org/wiki/File:Platanus_acerifolia_trees_(1).jpg
- Bark-detail photo: https://commons.wikimedia.org/wiki/File:Plane_tree_bark_pattern.jpg

## Local reference photo paths

- `research/references/plane-tree/plane-tree-canonical.jpg`
- `research/references/plane-tree/plane-tree-avenue.jpg`
- `research/references/plane-tree/plane-tree-bark.jpg`
- `research/references/plane-tree/style-target.png`

## Canonical comparison photo

- `research/references/plane-tree/plane-tree-canonical.jpg`
- View direction: near-frontal, ground-level portrait view; trunk close to the centre; the whole tree reads against the sky
- Known mismatch to runtime: the photographed tree is more columnar and less street-pruned than the Xinhua-road hero variant; the runtime camera uses a wider landscape crop

## Confirmed silhouette and massing

- Tall, pale trunk with a raised crown
- Strong trunk taper and a multi-way fork
- Broad upper crown with irregular gaps rather than a continuous sphere
- Long lateral scaffolding branches that remain visible through the foliage

## Branch, bark and foliage rhythm

- Primary fork: five visibly different directions, including lateral and rearward limbs
- Secondary and tertiary branches: upward-biased, asymmetrical, with decreasing radius and no floating crown clumps
- Bark: overlapping cream, sage-grey, taupe and brown patches concentrated on the trunk and lower scaffold limbs
- Leaves: individually modelled, five-lobed plane-tree silhouettes; three colour families; varied scale and rotation
- Signature fruit: a few small hanging spherical seed heads, used sparingly

## Material palette

- Bark base: warm grey-brown
- Exfoliated bark: pale cream, sage-grey and muted ochre
- Leaves: dark blue-green, mid sage-green and sunlit olive-green
- Fruit and fine twigs: dark umber
- No photographic images embedded in the GLB

## Identifying details

1. Mottled exfoliating bark with irregular map-like patches
2. High, multi-way street-tree fork and readable branch hierarchy
3. Broad five-lobed leaf silhouettes rather than generic disks or spheres
4. Sparse hanging seed balls
5. Asymmetrical crown gaps that reveal the scaffold structure
6. A gently flared root collar with six flattened, uneven buttress roots that taper into the ground

## Site context to include in the viewer

- Simple stone tree pit and pavement for scale
- Soft sky and directional daylight
- A height ruler and a human-scale reference in UI/scene
- Turntable, manual orbit, foliage visibility and branch-structure modes

## Details intentionally omitted

- Micro bark normal maps and photographic texture atlases
- Hundreds of twig generations below the gameplay-readable scale
- Exact pruning wounds of any single real tree
- Seasonal leaf loss, flowers, and dense fruit clusters
- Wind-rig bones in the first hero asset; runtime applies a restrained whole-crown motion cue

## Repeated-object variant plan

- This deliverable is the hero parent asset.
- The avenue implementation should derive at least three deterministic variants by changing trunk lean, fork angles, crown spread, rotation, leaf density and pruning profile.
- Repeated trees should share materials and use instancing or merged batches at street scale.

## Collision and camera-clearance plan

- Runtime collision uses a simple tapered trunk capsule; crown and branches do not block the player.
- Keep at least 1.2 m clear of entrances and 0.8 m clear of the curb-facing camera path.
- The inspection camera starts outside the crown envelope and constrains zoom before it clips through the trunk.

## Acceptance targets

- Editable `.blend`, deterministic English-named generator, English-named `.glb`, and fixed-camera preview all exist.
- GLB contains no embedded images and no more than eight runtime nodes.
- Tree reads as a plane tree with foliage hidden as well as shown.
- Browser errors are empty, orbit/zoom/touch interactions work, and the page remains usable on a phone.
- The asset stays visually coherent under the Xinhua Wonder daylight palette and remains suitable for later LOD/instancing work.
