# SpiderMonkey Runtime Exploration

## Summary

A full Jamrock runtime adapter for SpiderMonkey (`js` shell) is not yet feasible without additional platform glue.

Jamrock runtime adapters currently depend on:

- file system and path APIs (`fs`, `path`)
- an HTTP server implementation
- websocket support for hot reload / sockets
- dynamic module loading compatible with Jamrock's ESM outputs

SpiderMonkey shell does not provide these primitives out of the box in a way compatible with the existing adapters.

## Findings

1. Existing adapters (`lib/nodejs`, `lib/bun`, `lib/deno`, `lib/gtk4`) all supply `createEnvironment({ fs, path }, options, external)`.
2. The server side requires a real request/response runtime (`createServer`) and websocket-capable host for development mode.
3. The SpiderMonkey shell is better suited for script execution than hosting a production-style HTTP runtime.

## Practical Path Forward

1. Keep SpiderMonkey support marked experimental.
2. Start with build/test-only primitives (no `serve` support).
3. Add a host bridge (native wrapper or embedding layer) that provides:
   - HTTP listener
   - WebSocket hooks
   - file system and path compatibility
4. Wire runtime detection only after the bridge is in place.

## Scaffold

An explicit placeholder scaffold lives in `lib/spidermonkey/` to make the intended adapter shape clear while preventing accidental use as a complete runtime.
