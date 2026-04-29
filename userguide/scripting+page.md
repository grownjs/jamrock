<head>
  <title>Jamrock | Scripting</title>
</head>

# Scripting

Jamrock components support three script contexts, each running in a different environment.

## Script Contexts

| Context | Runs | Use for |
| - | - | - |
| `<script>` | Server (every request) | Data loading, signal declarations, props |
| `<script context="module">` | Server (once, shared) | RPC exports, shared state, middleware |
| `<script context="client">` | Browser only | DOM effects, client-only signal logic |

```html
<!-- Runs on every request — declare signals and load data here -->
<script>
  import { signal } from 'jamrock';

  let count = signal(0);
  let items = await fetch('/api/items').then(r => r.json());
</script>

<!-- Exported functions become RPC endpoints -->
<script context="module">
  export async function increment(conn) {
    // runs on the server when rpc:call fires
  }
</script>

<!-- Runs in the browser only -->
<script context="client">
  import { effect } from 'jamrock';

  effect(() => {
    document.title = `Count: ${count.value}`;
  });
</script>
```

---

## Signals in Templates

The `$` prefix in templates reads a signal's current value:

| Template | Compiles to |
| - | - |
| `&lbrace;$count}` | `count.value` |
| `&lbrace;$count + 1}` | `count.value + 1` |
| `class="btn-&lbrace;$active}"` | `"btn-" + active.value` |

**In script code, always use `.value`** — the `$` shorthand is template-only.

```html
<script>
  import { signal } from 'jamrock';

  let count = signal(0);

  function increment() {
    count.value++;       // correct
    // $count++         // only works in templates
  }
</script>

<button onclick={increment}>{$count}</button>
```

---

## SSR vs Client

Signals work in both environments, but behave differently:

| | SSR | Client |
| - | - | - |
| `signal(x)` | Evaluates to `x` for HTML output | Reactive — DOM updates on change |
| `computed(fn)` | Evaluates once | Re-evaluates when deps change |
| `effect(fn)` | Not run | Runs in browser, re-runs on dep change |
| `{$sig}` | Rendered as string | Live binding — updates in place |

> [!NOTE]
> See [Hooks](/hooks#top) for the full signals API reference — `signal`, `computed`, `effect`, `batch`, `untracked`, `trap`.

---

## Browser-Only Packages

Packages resolved via an `<script type="importmap">` (e.g. `codemirror`, `ansi_up`,
`@webcontainer/api`) are available in the browser but do not exist in `node_modules`. On the
server Jamrock replaces their imports with a **no-op proxy** so SSR never crashes.

```html
<script type="importmap">{
  "imports": {
    "codemirror": "https://esm.sh/codemirror@6.0.1"
  }
}</script>

<script context="client">
  import { EditorView } from 'codemirror';   // ← importmap-only package

  const view = new EditorView({ doc: '' });  // safe — proxy handles `new X()`
</script>
```

The proxy handles property access, method calls, and `new` — it simply returns `undefined`
or another proxy, so initialization code that only runs in the browser causes no server crash.

### Adapter Modules for Testing

For unit tests you need a real object you can inspect and stub. Create an **adapter module** — a
thin wrapper that returns a no-op implementation on the server and exposes the full API surface:

```javascript
// my-project/adapters/codemirror.mjs
export class EditorView {
  constructor(_config) {}
  destroy() {}
  static updateListener = { of: () => null };
}
export const basicSetup = null;
```

Then import the adapter in your page instead of the bare specifier:

```html
<script context="client">
  import { EditorView, basicSetup } from './adapters/codemirror.mjs';
</script>
```

In tests, import the adapter directly and replace methods with spies:

```javascript
import { EditorView } from './adapters/codemirror.mjs';
import * as td from 'testdouble';

const view = new EditorView({ doc: '' });
td.replace(view, 'destroy', td.func());

view.destroy();
td.verify(view.destroy());
```

Jamrock ships adapters for the packages used in the userguide playground under
`userguide/adapters/`. Copy any of them as a starting point for your own.

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/hooks#top">Hooks</a>
  </span>
  <a href="/scripting#top">
    &uarr; Back to the top
  </a>
</nav>
