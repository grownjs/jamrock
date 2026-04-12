<head>
  <title>Jamrock | Scripting</title>
</head>

# Scripting

Client-side components in Jamrock use **signals** for reactivity. Signals are fine-grained reactive values that automatically update the DOM when they change.

## Importing Signals

```html
<script context="client">
  import { signal, computed, effect, batch, untracked } from 'jamrock';
</script>
```

## Creating Signals

```html
<script context="client">
  import { signal } from 'jamrock';

  const count = signal(0);
  const name = signal('World');
</script>
```

## Reading and Writing

```js
// Read value
count.value;        // 0

// Write value
count.value = 5;

// Read without subscribing
count.peek();       // 5
```

## Computed Values

Derived values that automatically update when dependencies change:

```html
<script context="client">
  import { signal, computed } from 'jamrock';

  const a = signal(2);
  const b = signal(3);
  const sum = computed(() => a.value + b.value);

  // sum.value === 5
  // Updates automatically when a or b changes
</script>
```

## Effects

Run side effects when signals change:

```html
<script context="client">
  import { signal, effect } from 'jamrock';

  const count = signal(0);

  effect(() => {
    document.title = `Count: ${count.value}`;
    return () => {
      // Cleanup function (optional)
    };
  });
</script>
```

## Batch Updates

Multiple signal updates in a single batch:

```js
import { signal, batch, effect } from 'jamrock';

const a = signal(1);
const b = signal(2);

effect(() => {
  console.log(a.value + b.value);
}); // Logs: 3

batch(() => {
  a.value = 10;
  b.value = 20;
}); // Effect runs once, logs: 30
```

## Untracked Reads

Read signal values without subscribing:

```js
import { signal, effect, untracked } from 'jamrock';

const count = signal(0);

effect(() => {
  // This effect won't re-run when count changes
  const value = untracked(() => count.value);
});
```

## DOM Bindings

Use `s:*` attributes for reactive DOM updates:

```html
<script context="client">
  import { signal } from 'jamrock';

  const message = signal('Hello');
  const isLoading = signal(false);
</script>

<!-- Text content -->
<span s:textContent={message}></span>

<!-- Disabled state -->
<button s:disabled={isLoading}>Submit</button>

<!-- Style property -->
<div s:style.color={themeColor}></div>
```

## Migration from Hooks

| Old (useState) | New (signal) |
|----------------|--------------|
| `const [val, setVal] = useState(0)` | `const val = signal(0)` |
| `val` | `val.value` |
| `setVal(5)` | `val.value = 5` |

| Old (useEffect) | New (effect) |
|-----------------|--------------|
| `useEffect(() => { ... }, [dep])` | `effect(() => { dep.value; ... })` |

| Old (useMemo) | New (computed) |
|---------------|-----------------|
| `useMemo(() => a + b, [a, b])` | `computed(() => a.value + b.value)` |

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/styling#top">Styling</a>
  </span>
  <a href="/scripting#top">
    &uarr; Back to the top
  </a>
</nav>
