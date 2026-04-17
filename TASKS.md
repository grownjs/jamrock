# TASKS.md

```
opencode -s ses_27c33742fffea807HnhPWr7C2M
opencode -s ses_26dfb94d3ffexIax7xHQPplg8D
```

Consolidated pending work for the Jamrock project.

---

## Planned Tasks

- [x] [Remove esbuild — replace bundler with import rewriter](.journal/2026-04-15/plans/04-remove-esbuild-import-rewriter.md) (ok)

---

## Backlog

- [ ] [Source map support for browser dev tools](.journal/2026-04-14/plans/03-source-maps.md)
- [x] Fix GTK4 Explorer crash with 50+ widgets — `sanitizeLabel()` strips 4-byte emoji before passing to GTK Pango; blocklist removed; all playground components accessible (ok)
- [ ] Reduce `@ts-expect-error` usage in GTK4 code (22 in `src/gtk4/elements.ts`)
- [ ] Reduce `eslint-disable` usage (67 total) — largest offenders: `src/client/livesocket.ts` (11), `tests/06_sockets.test.mjs` (8), `bin/cli.mjs` (4)
- [ ] Update TypeScript (5.5.4 → 6.0.2) — ESLint 8 → 10 deferred (flat config required, airbnb-base has no ESLint 10 support)
