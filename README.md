# Nota

Nota is a focused, offline-capable PWA for learning to recognize written musical notes quickly.

- Treble and bass clefs, naturals plus sharps and flats, and two naming systems
- Piano-key and note-name answers
- Practice and two-second Speed modes
- Local progress in IndexedDB
- English and Russian UI

## Development

```sh
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm format
pnpm build
```

The production build includes a service worker and installable manifest. Progress is local to the device; no account or server is needed.

## Releases

`main` is released by [semantic-release](https://semantic-release.gitbook.io/): every push runs
`.github/workflows/release.yml`, which reads the Conventional Commit messages since the last tag and,
when they warrant a version, tags it and publishes GitHub release notes. `feat:` bumps the minor,
`fix:`/`perf:` the patch, a `!` or `BREAKING CHANGE:` the major; `chore:`, `ci:`, `docs:`, `style:`,
`test:` and `refactor:` release nothing on their own.

Nothing is committed back to `main` — the ruleset on the branch allows only pull requests — so the
changelog lives in the [releases](https://github.com/balakin/nota/releases) rather than in a file,
and the version in `package.json` stays where it is.

Only a new release deploys: the workflow then builds the released tag and publishes `dist/` to GitHub
Pages at [nota.balakin.io](https://nota.balakin.io). The domain is configured in the repository's
Pages settings, so the site is served from the root and needs no Vite `base`.
