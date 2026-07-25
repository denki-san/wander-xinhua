# Shangsheng Xinsuo and Huashan Building Evidence Audit

- Audited: 2026-07-25
- Scope: all Shangsheng building footprints in the production registry and
  Huashan service-building way `743778426`
- Rule: project-level photos prove only a family or site relationship; they do
  not become single-building evidence without a numbered plan overlay.

## Confirmed Shangsheng buildings

| OSM way | Confirmed identity | Evidence status | Modeling boundary |
| --- | --- | --- | --- |
| `864847877` | 孙科别墅 | High confidence; OSM name plus official single-building photos | Existing V2 may be retained; uncovered facades stay unknown |
| `864847881` | 哥伦比亚乡村俱乐部 | High confidence; OSM name, historic drawings and current photos | New V2 allowed after per-building Brief |
| `864847883` | 海军俱乐部及泳池 | High confidence; OSM name and pool/club photos | Rebuild V2 allowed after separating pool interior from hidden exterior |

### Directly observed identity cues

- 孙科别墅：red barrel tiles, fish-scale rough render, three pointed arches,
  second-floor balcony, round corner tower, north arched porch, chimneys.
- 哥伦比亚乡村俱乐部：low pitched roof, round arches, south loggia and
  terrace, central curved gable, twisted columns, rough render, wood shutters.
- 海军俱乐部：rectangular pool, three-sided two-storey arcade, continuous
  arches, fountain wall, pool mosaic, central niche and tall sports-hall volume.

The source URLs and unknown rear/roof boundaries are recorded in the referenced
Sun Ke manifest and in the source list below.

## Phase II: observed project facts

The official environmental report identifies:

- five new multi-storey buildings, `N1` through `N5`;
- one retained single-storey masonry building, `30#`;
- N1–N5 are four to five storeys, steel structure, no more than 24m high, and
  linked on levels two to four;
- approximate floor areas: N1 6005m², N2 3021m², N3 4289m², N4 4974m²,
  N5 5384m²;
- retained 30# is about 663m² and used for community sport and education.

PDF page 78 (printed page 74), figure 7 `项目平面布置图`, directly labels the
Phase-II positions and storeys:

- N1 is the east/northeast five-storey volume;
- N2 is the north-central five-storey volume;
- N3 is the central five-storey volume;
- N4 is the west/northwest four-storey volume;
- N5 is the southwest five-storey volume;
- retained 30# is the isolated east-west one-storey bar at the southeast edge.

The full official PDF, full rendered page and lossless detail crop are recorded
in `docs/research/shangsheng-phase-two-reference-manifest.json`.

The official plan can be geographically registered against the OVAL masterplan
using Anxi Road, Niuqiaobang Road, Panyu Road, the Phase-II boundary and the
existing campus buildings. The registered plan proves that the current
11-building OSM extract does not contain five complete N1–N5 footprints.

### Family-level observed cues

- small interlocked volumes, pilotis, cantilevers, bridges and terraces;
- beige and grey render, washed-stone and striped cement textures;
- glass curtain-wall portions, metal railings and planted terraces;
- N1: red stair/facade language and mosaic wayfinding;
- N2: arches, decorative metal balcony and yellow terrazzo;
- N4: green patterned glass, green signage and arches;
- N5: iridescent glass language;
- N3: no equally specific public single-building facade description found.

All localized references are in
`docs/research/shangsheng-phase-two-reference-manifest.json`.

### Corrected local image scopes

- `phase-two-n1-official-1.jpg` is an art-season campaign graphic, not a
  building photo.
- `phase-two-n1-official-2.png` shows the historic Navy Club swimming pool, not
  N1.
- `phase-two-n1-official-3.png` visibly shows current building number 17 and a
  red exterior stair. It proves those visible cues for current 17 only; its
  source-page relationship does not by itself prove N1 or an OSM way.

## Phase-II OSM binding audit

| OSM way | Observed overlay state | Binding decision |
| --- | --- | --- |
| `864847892` | southeast east-west bar; OSM footprint about 626m²; official 30# is the same isolated southeast bar and about 663m² | **30#, high confidence**; 37m² / 5.6% area difference is consistent with footprint/generalization differences |
| `1364679204` | north-central Phase-II zone; about 852m² | N2-zone candidate, medium confidence; do not rename it N2 because the complete five-storey volume and linked parts are not represented |
| `1364679205` | west/northwest Phase-II zone; about 475m² | N4-zone or sub-volume candidate, low confidence; it is far too small to represent the complete 4974m² four-storey N4 |
| `864847856` | north entrance area, outside the Phase-II project boundary | Not N1–N5 or 30# |
| `1364679201` | north of Phase II; `historic=building`; about 1735m² | Existing building, not an N building |
| `1368808689` | north of Phase II; about 986m² | Existing-campus footprint; not an N building |
| `1368808690` | north of Phase II; about 906m² | Existing-campus footprint; not an N building |
| `1537478450` | northwest of Phase II; `historic=building`; about 576m² | Existing building, not retained 30# |

### Coverage result

- `864847892 = 30#` is supported by official number, position, orientation,
  isolated form and area.
- N1, N3 and N5 have no corresponding building way in the current OSM extract.
- N2 and N4 zones intersect only coarse/partial ways `1364679204` and
  `1364679205`; these do not establish a reliable one-building/one-way mapping.
- The five N buildings form linked, fragmented volumes. Assigning an entire N
  identity to one coarse way would erase bridges, voids, terraces and the other
  linked footprint parts.

### Unknown

- authoritative GIS/CAD polygons for the complete N1–N5 volumes;
- whether ways `1364679204` and `1364679205` are outdated whole-building
  generalizations or only roof/sub-volume outlines;
- N3 identity cues;
- rear facades, roof equipment and bridge-node detail for each new building;
- identities, dates, functions and entrances of all unnamed footprints.

Way `864847892` may now be named retained 30# for footprint-level Massing, with
one storey and the official function boundary. Its Identity and Hero tiers
remain blocked because no verified single-building facade views were found.
N1–N5 Identity/Hero remain blocked, and Massing should use the official plan or
new georeferenced polygons rather than pretending the current OSM extract is
complete.

## Huashan service building

- OSM way: `743778426`
- Direct OSM evidence: `building=yes`, `building:levels=1`
- Approximate footprint: 3–4m square, next to basketball-court way `743778425`

Government sources confirm that Huashan Greenland contains a basketball court,
fitness areas, public toilet, reading room and other park facilities. None of
the located government photos clearly shows way `743778426` itself.

Observed: one-storey footprint and court adjacency.

Inferred: it may be a management, equipment, duty or other small service
building.

Unknown: official name, actual function, entrance direction, facade openings,
wall/roof materials, signs, equipment and all single-building canonical/side
views. It must not be labelled as a toilet, reading room or management room
without new evidence.

## Sources

- Shanghai environmental report:
  <https://static.shcn.gov.cn/cncms/2021/0426/9cc3cf48-4b9d-4668-9aa7-71833130b8ea.pdf>
- Shanghai planning authority, Phase II N1:
  <https://ghzyj.sh.gov.cn/cn/20230111/dd4065f7bf46488aa38efd20154b4159.html>
- Shanghai culture authority, 2025 project status:
  <https://whlyj.sh.gov.cn/gqfc/20250522/23600be3bafa42f5adb073f80b68e1ed.html>
- OVAL Phase II:
  <https://www.ovalpartnership.com/zh/project/Columbia-Circle-Phase-II>
- Changning government, Phase II opening:
  <https://www.shcn.gov.cn/col7344/20240327/1257062.html>
- Changning government, N1:
  <https://www.shcn.gov.cn/col7344/20230504/1235631.html>
- Sun Ke Villa:
  <https://mzj.sh.gov.cn/lnb-xw/20201117/a91886a37b954de283d159a39afca025.html>
- Country Club and Navy Club restoration:
  <https://www.thepaper.cn/newsDetail_forward_11596806>
- Changning building reading:
  <https://www.shcn.gov.cn/col3991/20241008/1269200.html>
- Huashan sports facilities:
  <https://zwgk.shcn.gov.cn/xxgk/cgss-tyjzdgz/2025/147/77777.html>
- Huashan route photo set:
  <https://www.shcn.gov.cn/col6991/20250824/1296845.html>

## Next hard gate

1. Obtain a georeferenced CAD/GIS export or authoritative current footprint
   plan for the complete N1–N5 linked volumes.
2. Alternatively, update OSM from current orthophoto/survey evidence while
   preserving every bridge, void and detached sub-volume.
3. Bind each resulting polygon or polygon group to the official N zones and
   record one-to-many relationships instead of forcing one way per building.
4. Add verified single-building facade sets before Identity/Hero work.
5. Keep missing faces, roof equipment and functions explicitly unknown.
