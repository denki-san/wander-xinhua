# Messenger Official Runtime and Source Audit

Status: completed

Research date: 2026-07-24

Scope: distinguish Abeto's original `Messenger` from the public
`promptwhisper/messenger` reconstruction; establish what is directly observable
from the official runtime, what is stated by the original creators, and whether
an official source repository is public.

## Sources

- Official experience: <https://messenger.abeto.co/>
- Official entry bundle observed on the research date:
  <https://messenger.abeto.co/assets/App3D-DwM1eiaC.js>
- Officially served avatar geometry endpoints:
  - <https://messenger.abeto.co/assets/geometries/avatar/avatar.drc>
  - <https://messenger.abeto.co/assets/geometries/avatar/avatar-bones.drc>
  - <https://messenger.abeto.co/assets/geometries/avatar/accessories/base.drc>
  - <https://messenger.abeto.co/assets/geometries/avatar/avatar-idle.drc>
- Creator interview: [Communication Arts: Messenger](https://www.commarts.com/webpicks/messenger)
- Third-party reconstruction, not the original source:
  <https://github.com/promptwhisper/messenger> at commit
  `2a7d54aceb5edc294a17bde0c7935e2356926b58`.

## Research question and quality contract

Questions:

1. Is `promptwhisper/messenger` the original Messenger source repository?
2. Is an original source repository or an official technical description public?
3. How did the third-party reconstruction obtain its playable character data?
4. Which technical conclusions can inform `wander-xinhua` without copying
   protected implementation or assets?

Quality contract:

- Separate official creator statements, public-runtime observations, and
  conclusions inferred from them.
- Record the immutable third-party revision and official asset checksums used
  for the asset-origin conclusion.
- Do not copy official binaries, models, textures, fonts, audio, or minified
  production code into this repository.
- Do not call original Messenger source code open source unless an official
  repository and licence are independently verified.

## Direct observations

### The original is a deployed application, not this GitHub repository

`promptwhisper/messenger` describes itself as an independent technical study.
Its README explicitly says that the original compiled application code is not
included, while its `docs/ASSET_LICENSES.md` says the material under `public/`
originates from or is based on the original Abeto experience and is not covered
by the repository MIT licence. Its only current commit at the audited revision
is `2a7d54aceb5edc294a17bde0c7935e2356926b58` (2026-06-30).

Therefore the repository is a third-party React/Three.js reconstruction, not
the official Messenger source repository. Its MIT licence applies to that
repository's original source code only; it does not license the bundled
third-party media.

### Official runtime directly delivers character geometry and animation

The official HTML loads a minified application bundle from the same
`messenger.abeto.co` origin. In that official bundle, the avatar's initial data
names `avatar/avatar` as its model, `avatar/avatar-bones` as its rig, and
`avatar/avatar-idle`, `avatar/avatar-walk`, `avatar/avatar-run`,
`avatar/avatar-air`, and `avatar/avatar-afk` as animation inputs. The loader
forms `.drc` paths under the official geometry asset base.

The four endpoints listed above each returned HTTP 200 on the research date.
This proves that Draco-compressed avatar data is publicly delivered to a browser
as part of the original experience. Public delivery makes inspection possible;
it does not grant permission to redistribute or reuse the data.

The following SHA-256 comparisons were made in a temporary research directory:

| Official endpoint | SHA-256 | Third-party path | Result |
| --- | --- | --- | --- |
| `avatar/avatar-bones.drc` | `d08c4ef50e835c7cf189ff5d1f89e7e02989640a3a7cfbeb6fe3c05c335780ba` | `public/assets/geometries/avatar/avatar-bones.drc` | identical |
| `avatar/accessories/base.drc` | `68f1cd0c8e4e6ba4992ff59592555f169f21cfdaaf3cc623075be26fb4474556` | `public/assets/geometries/avatar/accessories/base.drc` | identical |
| `avatar/avatar-idle.drc` | `a99361950e8ac98d99347de55dc1e158e6d795c910ba02c051a53f53e03458d9` | `public/assets/geometries/avatar/avatar-idle.drc` | identical |

`avatar/avatar.drc` was also publicly reachable, but no identically named
counterpart exists in the audited third-party tree; the conclusion is limited
to the three exact matches above.

### Official technical and design statements

In the Communication Arts interview, original creator Vicente Lucendo states:

- the project was made by a team of two and uses a small spherical world so
  players can explore without invisible boundaries;
- models were made in Blender and Houdini and the front end uses Three.js;
- shaders, controls, camera, networking code, and back end were custom made;
- the team capped a world at ten players for calmness, although the technology
  could support much higher concurrent presence;
- the character menu provides appearance options and emoji communication.

These are creator statements, stronger evidence than a showcase's stack guess.
They do not publish source code, shader source, the backend, authoring files,
or a licence for shipped assets.

### Public runtime architecture observations

The official bundle exposes a WebSocket endpoint,
`wss://multiplayer-server-76608060529.us-central1.run.app`, and contains a
browser-side WebSocket client. This is consistent with the creator's statement
that networking is custom made, but it is not evidence about the server-side
implementation or protocol semantics.

The public client bundle is minified. Requests for the conventional
`App3D-DwM1eiaC.js.map` and `webgl-CS4l6lxD.js.map` paths returned the site's
HTML fallback rather than a source map. A public GitHub profile exists for
`vlucendo`, but this research did not find a public official Messenger
repository through the official domain, the bundle, or targeted GitHub searches.

## Inferred conclusion

As of this audit, the original source should be treated as unpublished or at
least not publicly verified. The strongest official technical documentation
found is the creator interview plus the observable deployed client. The
`promptwhisper/messenger` repository should be treated as a reverse-engineered
study that reuses officially delivered assets, not as provenance for the
original design or implementation.

The exact checksum matches establish that at least the avatar rig, base body
accessory, and idle animation in that third-party repository are byte-for-byte
copies of assets served by the official site. This explains reports that someone
"recovered the character model from an official link": the client must fetch
these binary files to render the avatar. It does not demonstrate that the
official Blender/Houdini authoring files, original source code, or an official
export licence are public.

## Reuse boundary for wander-xinhua

Allowed research-level lessons:

- Build a continuous, deliberately small walkable loop before increasing map
  area; this is a product and level-design lesson, not a geometry copy target.
- Keep collision-only geometry separate from visible terrain and test camera
  obstruction against it.
- Define mobile as a separate render-cost and control tier, not a compressed
  desktop HUD.
- Use compact, independently authored skeletal assets with explicit runtime
  animation states, materials, and loading budgets.
- Keep social presence low-pressure and bounded if it is ever in scope.

Not allowed:

- Copy or redistribute `Messenger` `.drc`, `.ktx2`, font, icon, audio,
  original art, code, shader text, dialogue, quest structure, or network
  protocol.
- Treat a publicly requestable asset URL as an asset licence.
- Represent the third-party MIT licence as a licence for Abeto's original
  runtime assets.

## Unknowns and follow-up

- An official public repository, original source licence, and official build
  pipeline remain unknown.
- The official authoring-file structure, animation data schema, server protocol,
  and production performance measurements are not established by this audit.
- If Abeto, Vicente Lucendo, or Michael Sungaila publishes a repository,
  technical talk, or explicit asset licence, add it as a new source and revisit
  these boundaries rather than overwriting this record.
