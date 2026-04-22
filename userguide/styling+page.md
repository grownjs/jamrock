<head>
  <title>Jamrock | Styling</title>
</head>

# Styling

Jamrock supports three styling approaches: plain CSS in `<style>` tags, Less for variables and nesting, and UnoCSS for utility classes. All three can coexist.

---

## Component Styles

Add a `<style>` tag to any component. Styles are injected globally — there is no automatic scoping:

```html
<style>
  .card {
    border: 1px solid #ccc;
    border-radius: 6px;
    padding: 1rem;
  }
</style>

<div class="card">...</div>
```

---

## Less

Enable Less in `dev.config.mjs`:

```js
export default {
  generators: {
    less: await import(typeof Deno !== 'undefined' ? 'npm:less' : 'less'),
  },
};
```

Then use `lang="less"` on your style tag:

```html
<style lang="less">
  @primary: #79C551;
  @radius: 6px;

  .button {
    background: @primary;
    border-radius: @radius;
    &:hover { background: darken(@primary, 10%); }
  }
</style>
```

### Global Less Stylesheet

For site-wide styles, link an external Less file from your layout using the `src` attribute:

```html
<style global src="./lib/styles.less" />
```

The `global` attribute tells the compiler to process the file and inject it once into the page, not per-component.

---

## UnoCSS

Enable UnoCSS in `dev.config.mjs` and place a `unocss.config.mjs` in your pages directory:

```js
// dev.config.mjs
export default {
  unocss: true,
};
```

```js
// pages/unocss.config.mjs
import { defineConfig, presetUno } from 'unocss';
export default defineConfig({ presets: [presetUno()] });
```

Use utility classes directly in templates — they are generated from your rendered HTML on every request:

```html
<div class="flex gap-4 p-4 rounded border border-gray-200">
  <button class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
    Submit
  </button>
</div>
```

> [!TIP]
> UnoCSS and Less can coexist — use Less for component-level variables and design tokens, UnoCSS for layout utilities.

---

## Design Tokens

The recommended pattern is a single Less file with design tokens as variables, imported globally from your layout:

```less
// lib/tokens.less
@brand:     #79C551;
@accent:    #B3E72D;
@bg:        #01111F;
@text:      #BEBEBE;
@radius-sm: 3px;
@radius-md: 6px;
```

```less
// lib/styles.less
@import 'tokens';

body {
  background: @bg;
  color: @text;
}
```

Any component using `lang="less"` can then `@import` the same tokens file for consistency.

---

## Inline Styles & class:

For conditional or dynamic styles, use `style:` and `class:` directives:

```html
<!-- Toggle a class based on a value -->
<div class:active="{isActive}">...</div>

<!-- Set a specific style property -->
<span style:color="{labelColor}">Status</span>
```

See [Directives](/directives#top) for the full list.

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/routing#top">Routing</a>
  </span>
  <a href="/styling#top">
    &uarr; Back to the top
  </a>
</nav>
