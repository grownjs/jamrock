<head>
  <title>Jamrock | Configuration</title>
</head>

# Configuration

Jamrock uses a `dev.config.mjs` file for build and development configuration.

## Basic Configuration

Create `dev.config.mjs` in your project root:

```js
export default {
  src: 'pages',
  dest: 'dist',
  port: 3000,
  host: '0.0.0.0',
  quiet: false,
  prefix: '@',
  public: 'public',
};
```

## Configuration Options

| Option | Default | Description |
| - | - | - |
| `src` | `'pages'` | Source directory for routes |
| `dest` | `'dist'` | Build output directory |
| `port` | `3000` | Development server port |
| `host` | `'127.0.0.1'` | Development server host |
| `quiet` | `false` | Suppress console output |
| `prefix` | `'@'` | Component import prefix |
| `public` | `'public'` | Static assets directory |

## CSS Generators

Enable CSS generators for Less and UnoCSS:

```js
export default {
  generators: {
    less: await import('less'),
  },
  unocss: true,
};
```

### Less

When enabled, use `<style lang="less">` in components:

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

When `unocss: true` is set, UnoCSS utility classes are generated:

```html
<div class="flex gap-4 p-2 text-center">
  Content with utilities
</div>
```

## Markdown Options

Configure markdown rendering:

```js
export default {
  markdown: {
    emojify: true,
    twemoji: true,
  },
};
```

| Option | Default | Description |
| - | - | - |
| `emojify` | `false` | Convert `:emoji:` to unicode |
| `twemoji` | `false` | Use Twemoji for emoji rendering |

## Environment Variables

Access environment variables in your components:

```html
<script>
  const nodeEnv = process.env.NODE_ENV;
  const apiKey = process.env.API_KEY;
</script>
```

### Build-time Variables

Set variables during build:

<pre class="hljs terminal"><code><b>GIT_REVISION</b>=$(git rev-parse HEAD) <b>jamrock</b> build</code></pre>

## Runtime-Specific Config

Different runtimes may have additional options:

```js
export default {
  // Node.js specific
  server: {
    keepAliveTimeout: 65000,
  },

  // Deno specific
  deno: {
    permissions: ['net', 'read', 'write'],
  },
};
```

## Development vs Production

Detect the environment in your code:

```html
<script>
  import { redirect } from 'jamrock:conn';

  if (process.env.NODE_ENV === 'production') {
    // Production-only code
  }
</script>
```

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/deployment#top">Deployment</a>
  </span>
  <a href="/configuration#top">
    &uarr; Back to the top
  </a>
</nav>
