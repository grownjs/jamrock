<head>
  <title>Jamrock | Deployment</title>
</head>

# Deployment

Jamrock supports multiple runtimes and deployment targets. Choose the one that fits your infrastructure.

## Supported Runtimes

| Runtime | Status | Use Case |
| - | - | - |
| Node.js | Stable | General-purpose, npm ecosystem |
| Deno | Stable | TypeScript-native, secure defaults |
| Bun | Stable | Fast startup, Node-compatible |
| GTK4/GJS | Experimental | Desktop applications |
| WinterJS | WIP | Serverless, WinterCG compatible |
| Cloudflare Workers | WIP | Edge deployment |
| Vercel Edge | WIP | Vercel platform |
| AWS LLRT | WIP | AWS Lambda |

## Building for Production

Build your application before deployment:

```bash
jamrock build
```

This creates a `dist/` directory with:
- Compiled templates
- Bundled assets
- Static files

## Node.js

The primary deployment target:

```bash
# Development
jamrock dev

# Production
jamrock build
node dist/server.mjs
```

Or use the CLI:

```bash
jamrock serve --port 3000
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npx jamrock build
EXPOSE 3000
CMD ["node", "dist/server.mjs"]
```

## Deno

```bash
# Development
deno run --allow-all --unstable lib/deno/main.mjs

# Production
deno run --allow-all --unstable dist/server.mjs
```

### Deno Deploy

Deno Deploy works with minimal configuration:

```js
import { createEnvironment } from './dist/server.mjs';

Deno.serve(handler);
```

## Bun

```bash
# Development
bun run lib/bun/main.mjs

# Production
bun run dist/server.mjs
```

## GTK4 Desktop Apps

Build native desktop applications with GTK4 widgets:

```bash
# Development
./bin/gjs serve --src playground

# Run the explorer
./bin/gjs explorer
```

### Available Widgets

Layout: `vstack`, `hstack`, `box`, `grid`, `scroll`, `overlay`, `stack`, `paned`, `expander`, `revealer`, `frame`, `center`

Input: `button`, `toggle`, `push`, `check`, `entry`, `search`, `spin`, `range`, `dropdown`, `color`, `font`, `file`

Display: `label`, `image`, `spinner`, `progress`, `level`, `calendar`, `clock`, `textview`, `listview`, `columnview`, `treeview`

### Example

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

> [!NOTE]
> GTK4 apps use the same component syntax as web apps, but with GTK-specific elements instead of HTML.

## Static Export

For static hosting (GitHub Pages, Netlify, etc.):

1. Pre-render routes at build time
2. Serve as static HTML

```bash
jamrock build --static
```

## Session Storage

For production, configure a persistent session store:

```js
export default {
  session: {
    store: 'redis',
    url: process.env.REDIS_URL,
  },
};
```

> [!NOTE]
> In serverless environments, use external session storage like Redis, DynamoDB, or Upstash.

## Health Checks

Add a health endpoint:

```js
export default {
  ['GET /health']() {
    return Response.json({ status: 'ok' });
  },
};
```

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/styling#top">Styling</a>
  </span>
  <a href="/#top">
    &uarr; Back to the top
  </a>
</nav>
