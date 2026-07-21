# Building Evidence Lab migration

The standalone `building-evidence-lab` project was functionally migrated into
`wander-xinhua` on 2026-07-19.

## Runtime routes

- `/building-evidence-lab`
- `/building-evidence-lab/plane-tree`

The existing Wander Xinhua home route remains unchanged. Its footer links to
the lab.

## Mapped content

- Standalone `app/WonderWorkbench.tsx` → `app/building-evidence-lab/WonderWorkbench.tsx`
- Standalone `app/PlaneTreeViewer.tsx` → `app/building-evidence-lab/PlaneTreeViewer.tsx`
- Standalone `app/lib/` → `app/building-evidence-lab/lib/`
- Unique lab assets → `public/models/building-evidence-lab/`
- House 315 and Shanghai Cinema reuse `public/models/xinhua-road/`
- Hudec Memorial reuses `public/models/requested-pois/`
- Standalone `public/og.png` → `public/building-evidence-lab-og.png`
- Standalone `research/` → root `research/`
- Standalone README and error log → `docs/building-evidence-lab*.md`
- Standalone artifact checks → `tests/building-evidence-lab.test.mjs`

## Intentionally not copied

These are generated, machine-local, redundant, or unsafe to merge:

- `.git/`
- `node_modules/`
- `dist/`, `.vinext/`, `.wrangler/`
- the standalone `.openai/hosting.json`
- duplicate worker, database, Vite, TypeScript, lint and package scaffolding

`wander-xinhua` keeps its own package configuration and Sites project ID.
Blender `.blend1` backups remain in the migrated research archive but are not
intended for Git.
The standalone folder remains as a safety copy until the user explicitly asks
to remove it.
