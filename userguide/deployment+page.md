<head>
  <title>Jamrock | Deployment</title>
</head>

# Deployment

Jamrock supports multiple runtimes. Choose the one that fits your infrastructure.

## Supported Runtimes

| Runtime | Status | Use Case |
| - | - | - |
| Node.js | Stable | General-purpose, npm ecosystem |
| Deno | Stable | TypeScript-native, secure defaults |
| Bun | Stable | Fast startup, Node-compatible |
| GTK4/GJS | Experimental | Desktop applications |

## Building for Production

Build your application before deployment:

<pre class="hljs terminal"><code><b>jamrock</b> build</code></pre>

This creates a `dist/` directory with compiled templates, bundled assets, and static files.

---

## Running the Server

Use the `./bin/RUNTIME` wrapper for your preferred runtime — the commands are identical across all three:

<pre class="hljs terminal"><code><span class="out-dim"># Development (pick your runtime)</span>
<b>./bin/node</b> dev
<b>./bin/deno</b> dev
<b>./bin/bun</b>  dev

<span class="out-dim"># Production</span>
<b>./bin/node</b> build &amp;&amp; <b>./bin/node</b> serve</code></pre>

### Docker

```html
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN ./bin/node build
EXPOSE 3000
CMD ["./bin/node", "serve"]
```

---

## GTK4 Desktop Apps

Build native desktop applications with GTK4 widgets:

<pre class="hljs terminal"><code><span class="out-dim"># Development server</span>
<b>./bin/gjs</b> serve --src playground

<span class="out-dim"># Widget explorer</span>
<b>./bin/gjs</b> explorer</code></pre>

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
> GTK4 apps use the same component syntax as web apps, but with GTK widget elements instead of HTML.

---

## Static Export

Pre-render all routes to static HTML for hosting on GitHub Pages, Netlify, or any CDN:

<pre class="hljs terminal"><code><b>jamrock</b> build &amp;&amp; <b>jamrock</b> write</code></pre>

---

## Session Storage

For production, configure a persistent session store:

```js
export default {
  redis: {
    url: process.env.REDIS_URL,
  },
};
```

> [!NOTE]
> The default memory store is fine for development. Use Redis for any multi-instance or persistent production setup.

## Health Checks

Add a health endpoint in your `+server.mjs`:

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
  <a href="/deployment#top">
    &uarr; Back to the top
  </a>
</nav>
