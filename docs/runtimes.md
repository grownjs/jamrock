# Runtimes

Jamrock supports multiple JavaScript runtimes, each with different capabilities. This document explains which commands are available for each runtime.

## Capability Overview

| Runtime | Serve | Build | Watch | Init | Notes |
|---|---|---|---|---|---|
| **node** | ✅ | ✅ | ✅ | ✅ | Primary dev runtime |
| **bun** | ✅ | ✅ | ✅ | ✅ | Fastest build |
| **deno** | ✅ | ✅ | ✅ | ✅ | Needs `--allow-all` |
| **gjs** | ✅ | ✅ | ✅ | ❌ | GTK4/Linux required; no `init` |
| **txiki** | ✅ | ❌ | ❌ | ❌ | Lightweight prod server |
| **winterjs** | ✅ | ❌ | ❌ | ❌ | WinterCG/edge deployment |

## Runtime Types

### Dev Runtimes

Dev runtimes have full `fs`/`path` support and can run all CLI commands. Use these for development workflows.

- **node** — Primary development runtime. All features supported.
- **bun** — Fastest build and serve. Recommended for local development.
- **deno** — Full support but requires `--allow-all` permissions.
- **gjs** — GTK4/GJS runtime for desktop applications. Supports serve, build, and watch, but not `init` (no `cpSync`/`chmodSync` APIs).

### Prod-Only Runtimes

Prod-only runtimes have stubbed or limited `fs` support. They can only run `serve`.

- **txiki** — Lightweight JavaScript runtime. Has partial fs but no file watcher.
- **winterjs** — WinterCG-compatible runtime for edge deployment. All fs operations are no-ops.

## Usage

```bash
# Dev runtimes (all commands)
./bin/node serve --watch
./bin/bun build --src ./pages --dest ./build
./bin/deno init my-app
./bin/gjs serve

# Prod-only runtimes (serve only)
./bin/txiki serve --port 8080
./bin/winterjs serve --port 8080
```

## Error Messages

When attempting to use unsupported commands, you'll receive a clear error:

```
Error: 'build' requires a dev runtime (node, bun, deno, gjs). Current runtime only supports 'serve'.
```

## Implementation Details

Each runtime exports a `capabilities` object in `lib/{runtime}/main.mjs`:

```js
export const capabilities = { serve: true, build: true, watch: true, init: true };
```

The CLI checks these capabilities before executing commands and displays appropriate error messages for unsupported operations.
