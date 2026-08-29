# Nota

Nota is a focused, offline-capable PWA for learning to recognize written musical notes quickly.

- Treble and bass clefs, natural notes, and two naming systems
- Piano-key and note-name answers
- Practice and two-second Speed modes
- Local progress in IndexedDB
- English and Russian UI

## Development

```sh
npm install
npm run dev
npm test
npm run lint
npm run format:check
npm run build
```

The production build includes a service worker and installable manifest. Progress is local to the device; no account or server is needed.
