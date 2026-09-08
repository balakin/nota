# Nota

Nota is a focused, offline-capable PWA for learning to recognize written musical notes quickly.

- Treble and bass clefs, naturals plus sharps and flats, and two naming systems
- Piano-key and note-name answers
- Practice and Speed modes, with a Speed deadline you choose (two seconds by default)
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

Releases are managed by [release-please](https://github.com/googleapis/release-please). Every push to
`main` runs `.github/workflows/release.yml`, which reads the Conventional Commit messages since the
last tag and keeps a `chore(main): release x.y.z` pull request open, carrying the `CHANGELOG.md`
entry and the `package.json` bump. Merging that pull request tags the version, publishes the release
notes, and deploys the tagged build to GitHub Pages at
[nota.balakin.io](https://nota.balakin.io). Nothing is deployed until the release is merged.

`feat:` bumps the minor, `fix:`/`perf:` the patch, a `!` or `BREAKING CHANGE:` the major; `chore:`,
`ci:`, `style:` and `test:` release nothing on their own.
