# Jamrock

> The herbsman's web framework

Jamrock is a server-side rendering (SSR) web framework for JavaScript. It uses Svelte 5-style syntax in `.html` component files with SvelteKit-inspired file-system routing.

**Status:** Pre-release (v0.0.0), actively developed on the `next` branch. `master` holds stable changes.

---

## Features

- **SSR-first** — All rendering happens on the server; minimal JavaScript on the client
- **Multi-runtime** — Runs on Node.js, Deno, Bun, GTK4/GJS (desktop), Txiki.js, WinterJS
- **Svelte 5 syntax** — Components use familiar Svelte syntax in `.html` files
- **File-system routing** — SvelteKit-style routing with `+page.html`, `+layout.html`, `+error.html`, `+server.mjs`
- **Scoped CSS** — Styles are scoped by default; Less and UnoCSS supported
- **Streaming** — Real-time updates via fragments, generators, and SSE/WebSockets
- **Progressive enhancement** — Forms work without JavaScript; enhanced with client-side hydration
- **Fine-grained reactivity** — Signals for efficient DOM updates
- **Desktop apps** — Build native GTK4 applications with the same component syntax

---

## Quick Start

```bash
# Install
curl -L get.jamrock.dev | bash

# Create a new app
jamrock init my-app
cd my-app
npm install
npm run dev
```

Open http://localhost:8080 in your browser.

---

## Project Structure

```
my-app/
├── pages/                    # Source directory (default)
│   ├── index+page.html       # Route: /
│   ├── about+page.html       # Route: /about
│   ├── blog/
│   │   ├── index+page.html   # Route: /blog
│   │   └── [slug]+page.html  # Route: /blog/:slug
│   ├── +layout.html          # Layout wrapper
│   ├── +error.html           # Error boundary
│   └── +server.mjs           # Middleware/API routes
├── components/               # Reusable components
│   └── navlink.html
├── dev.config.mjs            # Configuration
└── build/                    # Compiled output
```

---

## Routing

### File-Based Routes

| Filename | Route |
|----------|-------|
| `index+page.html` | `/` |
| `about+page.html` | `/about` |
| `blog/[slug]+page.html` | `/blog/:slug` |
| `(lang).blog+page.html` | `/:lang?/blog` |
| `[...path]+page.html` | `/*path` |
| `_site/sitemap[.xml]+page.html` | `/sitemap.xml` |

### Special Files

| File | Purpose |
|------|---------|
| `+page.html` / `+page.md` | Route component |
| `+layout.html` | Layout wrapper (applies to nested routes) |
| `+error.html` | Error boundary for subtree |
| `+server.mjs` | Middleware, handlers, data loading |

---

## Components

### Script Contexts

```html
<script>                        <!-- Server-side per-request logic -->
<script context="module">      <!-- Module-level (runs once) -->
<script context="client">      <!-- Browser-only JavaScript -->
```

### Props and Slots

```html
<script>
  export let title;
  export let children;
</script>

<h1>{title}</h1>
{@render children?.()}
```

### Template Syntax

```html
{variable}                     <!-- Interpolation -->
{#if condition}...{/if}        <!-- Conditional -->
{#each items as item}...{/each} <!-- Loop -->
{#snippet name(args)}...{/snippet} <!-- Reusable snippet -->
{@render children?.()}         <!-- Render slot -->
{@html rawString}              <!-- Render raw HTML -->
```

### Client-Side Signals

Client-side components use **signals** for fine-grained reactivity:

```html
<script context="client">
  import { signal, computed, effect } from 'jamrock';

  const count = signal(0);
  const doubled = computed(() => count.value * 2);

  effect(() => {
    document.title = `Count: ${count.value}`;
  });
</script>

<button on:click={() => count.value++}>{count.value}</button>
<p>Doubled: {doubled.value}</p>
```

**DOM bindings with `s:*` attributes:**

```html
<span s:textContent={message}></span>
<button s:disabled={isLoading}>Submit</button>
<div s:style.color={themeColor}></div>
```

---

## Styling

### Scoped CSS (Default)

```html
<style>
  h1 { color: red; }
  .active { font-weight: bold; }
</style>
```

### Less

```html
<style lang="less">
  @primary: #79C551;
  .button {
    color: @primary;
    &:hover { color: darken(@primary, 10%); }
  }
</style>
```

### UnoCSS

Enable in `dev.config.mjs`:

```js
export default { unocss: true };
```

Use utility classes:

```html
<div class="flex gap-4 p-2 text-center">...</div>
```

---

## Server-Side Logic

### Request Context (`jamrock:conn`)

```html
<script>
  import { method, headers, redirect, params } from 'jamrock:conn';

  if (method === 'GET' && !headers.has('authorization')) {
    redirect('/login');
  }
</script>
```

### Handlers

```html
<script>
  export default {
    use: ['csrf'],           // Middleware to invoke
    POST: true,              // Allow POST requests
    DELETE() { /* ... */ },  // Handle DELETE
    ['GET /:id']({ id }) {   // Custom route handler
      console.log(id);
    },
  };
</script>
```

### Middleware (`+server.mjs`)

```js
export function http(conn) {
  // Runs on every request
}

export function csrf(conn) {
  conn.req.csrfProtect();
}

export default {
  use: ['http', 'csrf'],
  ['GET /api/users']() {
    return Response.json([{ id: 1, name: 'Alice' }]);
  },
};
```

---

## Fragments (Live Updates)

Fragments enable real-time DOM updates without full page reloads:

```html
<fragment name="list" tag="ul" mode="append" limit="10">
  {#each data as item}
    <li>{item}</li>
  {/each}
</fragment>
```

Options:
- `name` — Unique identifier (required)
- `tag` — HTML element to render as
- `mode` — `append`, `prepend`, or `replace`
- `limit` — Max items before pausing
- `timeout` — Max execution time (ms)

---

## CLI Commands

```bash
jamrock init <dir>     # Create new application
jamrock serve           # Start development server
jamrock build           # Compile for production
jamrock route           # List available routes

# Options
--src <dir>            # Source directory (default: ./pages)
--dest <dir>           # Output directory (default: ./build)
--port <number>        # Server port (default: 8080)
--watch                # Enable file watching
--dts                  # Generate TypeScript definitions
```

### Runtime-Specific Launchers

```bash
./bin/node serve --watch
./bin/deno serve --port 3000
./bin/bun serve
./bin/gjs serve         # GTK4/GJS runtime
```

---

## Configuration (`dev.config.mjs`)

```js
export default {
  src: 'pages',
  dest: 'build',
  port: 3000,
  host: '0.0.0.0',
  prefix: '@',
  
  // CSS generators
  unocss: true,
  less: await import('less'),
  
  // Markdown options
  markdown: {
    emojify: true,
    twemoji: true,
  },
  
  // Session storage (production)
  redis: {
    url: process.env.REDIS_URL,
  },
};
```

---

## Supported Runtimes

| Runtime | Status | Notes |
|---------|--------|-------|
| Node.js | Stable | Primary target |
| Deno | Stable | Requires `--allow-all` |
| Bun | Stable | Fastest builds |
| GTK4/GJS | Experimental | Desktop applications (26+ widgets) |
| Txiki.js | WIP | Lightweight runtime |
| WinterJS | WIP | WinterCG/edge deployment |
| Cloudflare | WIP | Workers adapter |
| Vercel Edge | WIP | Edge functions |

### GTK4 Desktop Apps

Build native desktop applications using GTK4 widgets:

```html
<script>
  import { signal } from 'jamrock';
  let count = signal(0);
</script>

<vstack spacing="10">
  <label>Count: {$count}</label>
  <button onclick={() => count.value++}>Increment</button>
</vstack>
```

Run with: `./bin/gjs serve --src playground`

**Available widgets:** `vstack`, `hstack`, `box`, `grid`, `scroll`, `overlay`, `stack`, `paned`, `expander`, `revealer`, `frame`, `button`, `toggle`, `check`, `entry`, `search`, `spin`, `range`, `dropdown`, `color`, `font`, `file`, `label`, `image`, `spinner`, `progress`, `level`, `calendar`, `clock`, `textview`, `listview`, `columnview`, `treeview`

---

## Architecture

### Source Modules (`src/`)

| Module | Purpose |
|--------|---------|
| `markup/` | HTML parsing, expression evaluation, CSS scoping, AST walking |
| `templ/` | Template class — compilation, caching, response serialization |
| `render/` | Async/sync rendering pipelines, React-style hooks |
| `handler/` | Route matching/ranking, middleware orchestration |
| `server/` | Request/response handling, sessions, cookies, CSRF, Redis |
| `client/` | Browser hydration, DOM patching, live socket, form handling |

### Runtime Adapters (`lib/`)

Each adapter implements `createEnvironment()` with runtime-specific modules:

```
lib/
├── nodejs/     # Primary adapter
├── deno/       # Deno-specific
├── bun/        # Bun-specific
└── gtk4/       # GJS/SpiderMonkey
```

### Entry Points

| File | Output | Purpose |
|------|--------|---------|
| `src/main.ts` | `dist/main.mjs` | Core library |
| `src/server.ts` | `dist/server.mjs` | Server module |
| `src/client.js` | `dist/client.mjs` | Browser hydration |
| `src/gtk.js` | `dist/gtk.mjs` | GTK4 adapter |

---

## Development

### Build

```bash
make dist              # Full distribution build
npm run build          # Raw mortero build
make nodejs:build      # Node.js-specific
make deno:build        # Deno-specific
make bun:build         # Bun-specific
```

### Test

```bash
npm test               # Lint + unit tests
npm run test:unit      # Unit tests only
npm run test:e2e       # Browser tests (TestCafe)
npm run test:ci        # Coverage report

# Per-runtime
make test-nodejs
make test-deno
make test-bun
make gjs-test          # GTK4/GJS smoke tests
```

### Examples

```bash
make start:node        # Serve examples on port 3000
make start:bun
make start:deno
```

### Documentation Site

```bash
make docs              # Dev server for userguide/
make dist-docs         # Production build with Pagefind
make deploy            # Deploy to gh-pages
```

---

## Documentation

Live documentation: **https://jamrock.site/**

Pages:
- [Introduction](/introduction) — Routes, handlers, middleware, request/response
- [Command Line](/command-line) — CLI usage and configuration
- [Components](/components) — File naming, props, templating, markdown
- [Fragments](/fragments) — Live DOM updates
- [Directives](/directives) — Special attributes, forms
- [Routing](/routing) — File-based routing, dynamic segments
- [Middleware](/middleware) — Request pipeline, error handling
- [Configuration](/configuration) — Build options, generators
- [Deployment](/deployment) — Runtime targets, production setup
- [Conn API](/conn) — Request context reference

---

## Known Issues

- **`components/svg-icon.html`** — Not implemented; SVG icons are inlined in layouts
- **GJS `btoa`/`atob`** — Implemented via `GLib.base64_encode/decode`
- **GJS `crypto.subtle.sign`** — Mocked with `GLib.compute_hmac_for_string`

## Recent Changes

### 2026-04-14
- Fixed JSDOM localStorage issue (somedom update)
- Fixed signal handling in SSR vs client contexts
- Added 26+ GTK4 widgets for desktop apps
- Consolidated polyfills for SSR vs GTK4 builds
- 76 unit tests passing

---

## License

MIT — Alvaro Cabrera <pateketrueke@gmail.com>
