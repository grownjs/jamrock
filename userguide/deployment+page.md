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

## Static Export

For static hosting (GitHub Pages, Netlify, etc.):

1. Pre-render routes at build time
2. Serve as static HTML

```bash
jamrock build --static
```

## Cloudflare Workers

Use the Cloudflare adapter:

```js
import createCloudflareEnvironment from 'jamrock/cloudflare';

export default createCloudflareEnvironment({
  src: 'pages',
  dest: 'dist',
});
```

Deploy with Wrangler:

```bash
wrangler deploy
```

## Vercel Edge

Deploy to Vercel Edge Functions:

```js
import createVercelEdgeEnvironment from 'jamrock/vercel-edge';

export default createVercelEdgeEnvironment({
  src: 'pages',
});
```

## AWS Lambda (LLRT)

Use the LLRT adapter for low-latency Lambda:

```js
import createLLRTEnvironment from 'jamrock/llrt';

export const handler = createLLRTEnvironment({
  src: 'pages',
});
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
