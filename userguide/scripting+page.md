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

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/hooks#top">Hooks</a>
  </span>
  <a href="/scripting#top">
    &uarr; Back to the top
  </a>
</nav>
