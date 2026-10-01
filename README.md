<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/logo-dark.svg">
    <img src=".github/assets/logo.svg" alt="" width="72" height="72">
  </picture>
  <br>
  Nota
</h1>

<p align="center">
  <a href="https://nota.balakin.io"><img alt="Open the app" src="https://img.shields.io/badge/app-nota.balakin.io-blue"></a>
  <a href="https://github.com/balakin/nota/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/balakin/nota?sort=semver"></a>
  <br>
  <a href="https://github.com/balakin/nota/actions/workflows/verify.yml"><img alt="Verify" src="https://img.shields.io/github/actions/workflow/status/balakin/nota/verify.yml?branch=main&label=verify"></a>
  <a href="https://github.com/balakin/nota/actions/workflows/release.yml"><img alt="Release and deploy" src="https://img.shields.io/github/actions/workflow/status/balakin/nota/release.yml?branch=main&label=release"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/github/license/balakin/nota"></a>
</p>

**Don’t count. Recognize.**

Nota is a focused, offline-capable PWA for learning to recognize written musical notes quickly.

- Treble and bass clefs, naturals plus sharps and flats, ledger lines either side of both staves, and two naming systems
- Piano-key and note-name answers
- Practice mode with no clock at all, and Speed mode with a deadline you choose (two seconds by default)
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
