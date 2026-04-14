# Jamrock Syntax Specification

**Version:** 0.0.0 (pre-release)
**Last Updated:** 2026-04-14

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

Jamrock uses signals from somedom for fine-grained reactivity in both SSR and client-side contexts.

### Declaration

```html
<script>
  import { signal, computed, effect } from 'jamrock';
  
  let count = signal(0);
  let doubled = computed(() => count.value * 2);
</script>
```

### Usage in Templates

Use `$` prefix to read signal values in templates:

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

### In Attributes

For attributes, the `$` prefix is also compiled:

```html
<button class="btn-{$count}">Click</button>
<!-- Compiles to: class="btn-" + count.value -->
```

### Update

```html
<button onclick="{() => count.value = count.value + 1}">Increment</button>
```

### Signal API

| Function | Description |
|----------|-------------|
| `signal(value)` | Create reactive value with `.value` property |
| `computed(fn)` | Create derived value, auto-updates when dependencies change |
| `effect(fn)` | Run side effect when dependencies change |
| `batch(fn)` | Group multiple updates into one |
| `untracked(fn)` | Read signals without subscribing |

### How It Works

1. **Declaration:** `let count = signal(0)` — creates reactive container
2. **Template usage:** `{$count}` → compiles to `count.value`
3. **Read:** `count.value` — get current value
4. **Write:** `count.value = newValue` — update and notify subscribers
5. **SSR:** Signals are evaluated to their values for stringification
6. **Client:** `$signal` functions are preserved for somedom reactivity

### Important Notes

- `$$props` is NOT a signal — it's the props object, never use `.value`
- Signal names in templates must use `$` prefix: `{$count}` not `{count}`
- In script code, always use `.value`: `count.value` not `count()`

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

### Layout Containers

| Element | Description |
|---------|-------------|
| `vstack` | Vertical box container |
| `hstack` | Horizontal box container |
| `box` | Generic container with `spacing`, `homogeneous` props |
| `grid` | Grid layout with `row`, `column`, `row-span`, `col-span` |
| `scroll` | Scrollable container |
| `overlay` | Stack widgets on top of each other |
| `stack` | Switch between visible children |
| `paned` | Resizable split pane |
| `expander` | Collapsible container |
| `revealer` | Animated show/hide container |
| `frame` | Bordered container with label |
| `center` | Center box container |

### Input Widgets

| Element | Description |
|---------|-------------|
| `button` | Button with label |
| `toggle` | Switch widget |
| `push` | Toggle button |
| `check` | Checkbox |
| `entry` | Text input field |
| `search` | Search entry with clear button |
| `spin` | Numeric spinner |
| `range` | Scale/slider widget |
| `dropdown` | Dropdown selector |
| `color` | Color picker button |
| `font` | Font picker button |
| `file` | File chooser button |

### Display Widgets

| Element | Description |
|---------|-------------|
| `label` | Text label (supports markup) |
| `image` | Image from file or resource |
| `spinner` | Loading spinner |
| `progress` | Progress bar |
| `level` | Level bar indicator |
| `calendar` | Calendar widget |
| `clock` | Digital clock display |
| `textview` | Multi-line text editor |
| `listview` | List view widget |
| `columnview` | Table with columns |
| `treeview` | Hierarchical tree view |

### Example

```html
<script>
  import { signal } from 'jamrock';
  
  let clicks = signal(0);
  function onClick() { clicks.value++; }
</script>

<vstack spacing="10">
  <label>Clicks: {$clicks}</label>
  <button onclick={onClick}>Click Me</button>
</vstack>
```

### GTK4-Specific Attributes

| Attribute | Description |
|-----------|-------------|
| `spacing` | Gap between children (box containers) |
| `homogeneous` | Equal child sizes (box containers) |
| `halign` / `valign` | Alignment: `fill`, `start`, `end`, `center`, `baseline` |
| `hexpand` / `vexpand` | Allow widget to expand |
| `margin-top` / `margin-bottom` / `margin-start` / `margin-end` | Margins |
| `opacity` | Widget opacity (0-1) |
| `sensitive` | Enable/disable widget |
| `visible` | Show/hide widget |

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

### 2026-04-14
- Added complete GTK4 widget reference (26+ widgets)
- Documented GTK4-specific attributes
- Expanded signal documentation with API reference
- Clarified signal behavior in SSR vs client contexts
- Noted `$$props` is not a signal

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
- [x] GTK4 widget coverage — **Done: 26+ widgets documented**
- [x] Signal behavior in SSR vs client — **Done: documented**
