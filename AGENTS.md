# Guidance for agents working in Nota

Nota is a local-first web app for training instant musical-note recognition. Progress lives in a
single `PersistedState` object, persisted to IndexedDB with a `localStorage` fallback. There is no
backend.

Two tracks answer the same questions, with different engines.

**Train** is free-form: pick clefs and a range, run a session against a clock.

**Learning** is a ladder of levels in sections, each section walled off by a mixed level. It has no
session length: one press of Start plans a short **run** from what the level currently needs. A note
earns at most **one credit per run** and needs several credits to count as learned, so a level takes
several runs by construction — recalling something once in each of several spaced sessions retains
far better than recalling it repeatedly in one. That state lives in `state.learning.levels`, keyed by
level then by note; a Learning answer also writes the global note stats and day rolls, so the
progress dashboard reports everything practised, but only credits open a level.

## Commands

```bash
pnpm dev            # vite dev server
pnpm build          # tsc -b + vite build
pnpm test           # vitest run
pnpm lint           # eslint (type-checked); `lint:fix` applies fixes
pnpm format         # prettier --check; `format:fix` rewrites
pnpm i18n:extract   # extract messages into src/locales/*.po
```

## Module structure

- Every concern lives in its own folder under `src/`. Files inside a module are **flat** — no nested
  subfolders. The one exception is `__tests__/`, the module's co-located tests.
- The `src/` root is reserved for `main.tsx`, `index.css`, and `vite-env.d.ts`. Never create
  `src/__tests__/` — anything worth testing belongs in a named module.
- File names are kebab-case, including component files (`note-map-item.tsx`).
- Tests are named after what they cover and use the `.spec.ts` / `.spec.tsx` extension
  (`src/practice/__tests__/pick-next.spec.ts`). Vitest setup lives outside `src/`, in `tests/`.

### The modules

- `app-shell/` — the root `App`, header, primary nav, offline banner, document `lang`/title/theme
- `app-state/` — persisted state shape, migrations, and the `useAppState` hook that hydrates and saves it
- `practice/` — the practice runtime: setup screen, `usePracticeSession`, live session UI, result page
- `learning/` — the level path: sections and levels, per-note credits, the run planner, landmark hints, and the run runtime
- `training/` — the pure training engine: mastery states, day rollups, question weighting, range selection, normalized answers
- `music/` — pitches, naming systems, staff geometry, and the recognition curriculum
- `notation/` — the staff component and its VexFlow renderer
- `piano/` — the fixed one-octave keyboard layout and the piano component
- `progress/` — the progress dashboard: a global date range over the day rollups, feeding every panel
- `onboarding/`, `settings/`, `research/` — the remaining pages
- `router/` — hash routing (`usePage`)
- `storage/` — IndexedDB persistence
- `i18n/`, `locales/` — Lingui setup and `.po` catalogs
- `pwa/` — service-worker registration
- `ui/` — shared presentational primitives (icon, metric, section title, toggle picker)
- `utils/` — small pure helpers shared across modules

## Conventions

- Always `import type` for type-only imports.
- Keep engine logic (`training/`, `music/`, `piano/piano-layout.ts`) pure and framework-free; React
  state machines live in `use-*.ts` hooks next to the UI they serve.
- **i18n**: every user-visible string goes through the Lingui macros (`` t`…` `` / `<Trans>`).
  Catalogs are compiled on the fly by the Vite plugin — no manual compile step. After adding strings,
  run `pnpm i18n:extract` and fill in the `ru` translations before committing.
