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
