# Jamrock Syntax Specification

**Version:** 0.0.0 (pre-release)
**Last Updated:** 2026-04-13

---

## Overview

Jamrock uses Svelte 5-inspired syntax in `.html` component files. This spec documents the template language, directives, and runtime behavior.

---

## File Types

| Extension | Purpose |
|-----------|---------|
| `.html` | Component file (Svelte-like syntax) |
| `.md` | Markdown page (compiles to HTML component) |
| `+page.html` | Route page component |
| `+page.md` | Route page (Markdown) |
| `+layout.html` | Layout wrapper |
| `+error.html` | Error boundary |
| `+server.mjs` | Server middleware/handler |

---

## Template Syntax

### Interpolation

```html
{variable}
{obj.property}
{fn()}
```

- Expressions are evaluated and HTML-escaped
- Use `{@html ...}` for raw HTML

### Conditionals

```html
{#if condition}
  content
{/if}

{#if condition}
  content
{:else}
  other
{/if}

{#if a}
  a
{:else if b}
  b
{:else}
  other
{/if}
```

### Loops

```html
{#each items as item}
  <li>{item.name}</li>
{/each}

{#each items as item, i}
  <li>{i}: {item.name}</li>
{/each}

{#each items as item, i (item.id)}
  <li>{item.name}</li>  <!-- keyed each -->
{/each}
```

### Snippets (Reusable Template Blocks)

```html
{#snippet name(arg1, arg2)}
  <div>{arg1} - {arg2}</div>
{/snippet}

{@render name(value1, value2)}
```

### Slots / Children

```html
<!-- Parent component -->
<div>
  {@render children?.()}
</div>

<!-- Usage -->
<Parent>
  <p>Child content</p>
</Parent>
```

### Raw HTML

```html
{@html rawHtmlString}
```

---

## Script Contexts

### Per-Request Script (default)

```html
<script>
  // Runs on each request
  let count = 0;
  function increment() { count++; }
</script>
```

### Module Script (runs once)

```html
<script context="module">
  // Runs once at module load
  export const metadata = { title: 'Page' };
</script>
```

### Client Script (browser only)

```html
<script context="client">
  // Only included in client bundle
  document.addEventListener('click', handler);
</script>
```

---

## Styling

### Scoped CSS (default)

```html
<style>
  .button { color: red; }  /* Scoped to this component */
</style>
```

### Global CSS

```html
<style global>
  .button { color: red; }  /* Global styles */
</style>
```

### Less

```html
<style lang="less">
  @primary: #333;
  .button { color: @primary; }
</style>
```

### External Stylesheet

```html
<style global src="./styles.less" />
```

---

## Directives

### Event Handlers

```html
<!-- Function reference (no quotes needed) -->
<button onclick={handler}>Click</button>
<button onclick="{handler}">Click</button>

<!-- Arrow functions (quotes required due to => syntax) -->
<button onclick={() => count++}>Click</button>  <!-- ❌ Broken! -->
<button onclick="{() => count++}">Click</button>  <!-- ✓ Works -->

<!-- Inline function calls -->
<button onclick="{increment}">Click</button>
```

**Note:** Arrow functions require quotes because `=>` contains `>` which would otherwise close the tag.

### Two-Way Binding

```html
<input bind:value={name} />
<input type="checkbox" bind:checked={active} />
```

### Class Directive

```html
<div class={isActive ? 'active' : ''}>...</div>
<div class:active={isActive}>...</div>  <!-- Svelte-style -->
```

### Use Directive (actions)

```html
<script context="module">
  function tooltip(node) {
    // Setup - node is the DOM element
    const tip = document.createElement('div');
    tip.textContent = node.getAttribute('title');
    document.body.appendChild(tip);
    
    return {
      destroy() {
        tip.remove();
      }
    };
  }
</script>

<button use:tooltip title="Click me">Hover</button>
```

**Note:** Actions are defined in `context="module"` scripts and receive the DOM node as their first argument.

---

## Imports

### Built-in Modules

```html
<script>
  import { request_path, method } from 'jamrock:conn';
  import { onComplete, getContext, setContext } from 'jamrock:hooks';
  import { signal, computed, effect, ref } from 'jamrock';
</script>
```

### Component Imports

```html
<script>
  import Button from './components/button.html';
  import Layout from './+layout.html';
</script>
```

---

## Signals (Reactivity)

### Declaration

```html
<script>
  import { signal, computed } from 'jamrock';
  
  let count = signal(0);
  let doubled = computed(() => count.value * 2);
</script>
```

### Usage in Templates

Use `$` prefix to read signal values:

```html
<p>Count: {$count}</p>
<p>Doubled: {$doubled}</p>
```

The `$` prefix is compiled to `.value` access:

| Template | Compiled |
|----------|----------|
| `{$count}` | `count.value` |
| `{$count + 1}` | `count.value + 1` |
| `{$obj.name}` | `obj.value.name` |

### Update

```html
<button onclick="{() => count.value = count.value + 1}">Increment</button>
```

### How It Works

1. Declare signals without `$`: `let count = signal(0)`
2. Use `$` prefix in templates to read: `{$count}` → compiles to `count.value`
3. Signals are objects with `.value` property (both SSR and client)
4. Read: `count.value` / Write: `count.value = newValue`

---

## Special Elements

### Fragment

```html
<fragment>
  <!-- No wrapper element -->
</fragment>
```

### Component

```html
<Component prop={value}>
  <p>Child content</p>
</Component>
```

---

## Server-Side Features

### Request Context (`jamrock:conn`)

```javascript
import {
  request_path,  // Current URL path
  method,        // HTTP method
  query_params,  // Query string params
  body_params,   // POST body params
  headers,       // Request headers
  params,        // Route params
} from 'jamrock:conn';
```

**Extended connection** (Node/Deno/Bun only):

```javascript
import {
  session,       // Session state object
  cookie,        // Set cookies: cookie(name, value, options)
  flash,         // Flash messages: flash(type, value)
  csrf_token,    // CSRF token for forms
  csrfProtect,   // Validate CSRF token
} from 'jamrock:conn';
```

**Note:** `session`, `cookie`, `flash`, `csrf_token`, and `csrfProtect` are only available in Node/Deno/Bun runtimes, not GTK4.

### Hooks (`jamrock:hooks`)

```javascript
import {
  after,     // Run after render
  get,       // Get context value
  set,       // Set context value
  render,    // Render child content
} from 'jamrock:hooks';
```

---

## Markdown Pages

### Front Matter

```markdown
---
title: Page Title
---

# Heading

Content here...
```

### Inline Head Tags

```markdown
<head>
  <title>Page Title</title>
</head>

# Heading
```

---

## GTK4 Elements (Desktop)

For GTK4 desktop apps, use these elements instead of HTML:

| Element | Description |
|---------|-------------|
| `vstack` | Vertical box container |
| `hstack` | Horizontal box container |
| `box` | Generic container |
| `label` | Text label |
| `button` | Button with label |
| `entry` | Text input field |
| `toggle` | Switch widget |
| `push` | Toggle button |
| `progress` | Progress bar |
| `level` | Level bar indicator |
| `range` | Scale/slider widget |
| `scroll` | Scrollable container |
| `listview` | List view widget |
| `dropdown` | Dropdown selector |

Example:

```html
<script>
  let clicks = 0;
  function onClick() { clicks++; }
</script>

<vstack>
  <label>Clicks: {clicks}</label>
  <button onclick={onClick}>Click Me</button>
</vstack>
```

---

## Compilation Output

Components compile to ES modules with these exports:

| Export | Description |
|--------|-------------|
| `__template` | Render function (vnode generator) |
| `__doctype` | DOCTYPE declaration |
| `__metadata` | Head elements |
| `__attributes` | HTML attributes |
| `__scripts` | Script blocks |
| `__styles` | Style blocks |
| `__fragments` | Fragment definitions |
| `__handler` | Server handler (if `+server.mjs`) |
| `__src` | Source file path |
| `__dest` | Compiled file path |
| `__context` | Script context type |

---

## Changelog

### 2026-04-13
- Initial spec creation
- Documented GTK4 elements for desktop apps
- Noted signal syntax (`$signal`) for reactivity
- Clarified arrow function syntax in event handlers (quotes required)
- Fixed signal API: use `.value` property, not function calls
- Removed unsupported `transition:` and `animate:` directives
- Added complete GTK4 element list
- Clarified `jamrock:conn` exports (base vs extended)
- Documented `use:` directive with action example
- Renamed `jamrock:hooks` exports to short names: `after`, `get`, `set`, `render`

---

## TODO / Open Questions

- [ ] TypeScript support (`lang="ts"` in script tags)
- [ ] Source maps for production builds
- [ ] WebKitGTK preview vs GTK widget rendering
- [x] Signal syntax finalization — **Done: use `.value` property**
- [x] Arrow function syntax in attributes — **Done: quotes required**
