# Urban Wanderer Character Source

## Current runtime character

- Runtime asset: `public/models/character/urban-wanderer.glb`
- Editable source: `assets/models/source/character/urban-wanderer.blend`
- Generator: `scripts/create_urban_wanderer_character.py`
- Fixed-camera preview: `assets/models/source/character/urban-wanderer-preview.png`
- Generated: 2026-07-18
- Runtime SHA-256: `4138a8a736036626002163bb7c9aea1666c31b1ad5049300fedc020567197a66`

The runtime character is an original recombination and restyling of the
Quaternius Ultimate Modular Men Pack:

- `Suit_Head` supplies the short-haired head.
- `Casual_Body` supplies the neutral hoodie upper body.
- `Casual2_Legs` supplies straight trousers.
- `Casual2_Feet` supplies low-top sneakers.

The source pack is CC0 and is stored in
`assets/models/source/character/quaternius-modular-men`. The original source
files remain unchanged. License evidence is stored in
`QUATERNIUS_MODULAR_MEN_LICENSE.txt`.

The runtime GLB contains four independently named skinned slots:

- `Slot_Head_Default`
- `Slot_Upper_Default`
- `Slot_Lower_Default`
- `Slot_Shoes_Default`

Before export, the generator removes unused UV and color data, welds source
vertices duplicated only for hard normals, and recalculates smooth shading.
This keeps the original silhouette and skinning while removing the visible
triangle color blocks. It also embeds `Idle_Neutral`, `Walk`, and `Run`, so the
page loads one 370KB character file instead of a separate multi-megabyte
animation library.
No backpack, bag, shoulder strap, weapon, logo, or replacement carrying prop is
included.

See `docs/research/urban-wanderer-character-brief.md` for official source URLs,
input hashes, visual selection rationale, camera targets, and derivation
boundaries.

## Preserved previous character

- Runtime asset: `public/models/character/urban-messenger.glb`
- Upstream asset: KayKit Character Pack: Adventurers 1.0, `Rogue.glb`
- Upstream repository: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
- Upstream commit: `672074b73ba276876a19e8816ecdc5241817ab47`
- Retrieved: 2026-07-17
- License: Creative Commons Zero 1.0 Universal; see `LICENSE.txt`

The previous GLB and preview remain available only for rollback and visual
comparison. They are not loaded by the application.
