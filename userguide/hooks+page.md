<head>
  <title>Jamrock | Hooks</title>
</head>

# Hooks

Jamrock uses **signals** from somedom for fine-grained reactivity in both SSR and client-side contexts.

## Available APIs

### signal

Create a reactive value:

```html
<script>
  import { signal } from 'jamrock';

  let count = signal(0);
</script>

<button onclick={() => count.value++}>{$count}</button>
```

> [!NOTE]
> Use `$count` in templates to read the value. This compiles to `count.value`.
> In script code, always use `count.value` to read or write.

### computed

Create a derived value that auto-updates when dependencies change:

```html
<script>
  import { signal, computed } from 'jamrock';

  let a = signal(2);
  let b = signal(3);
  let sum = computed(() => a.value + b.value);
</script>

<p>Sum: {$sum}</p>
```

### effect

Run side effects when signals change:

```html
<script context="client">
  import { signal, effect } from 'jamrock';

  const count = signal(0);

  effect(() => {
    document.title = `Count: ${count.value}`;
  });
</script>
```

> [!NOTE]
> `effect` is primarily for client-side code. In SSR, signals are evaluated once for stringification.

### batch

Group multiple signal updates into one:

```html
<script>
  import { signal, batch } from 'jamrock';

  let a = signal(1);
  let b = signal(2);

  function updateBoth() {
    batch(() => {
      a.value = 10;
      b.value = 20;
    });
  }
</script>
```

### untracked

Read signals without subscribing:

```html
<script>
  import { signal, untracked, effect } from 'jamrock';

  let count = signal(0);

  effect(() => {
    // This effect won't re-run when count changes
    const current = untracked(() => count.value);
    console.log('Current count:', current);
  });
</script>
```

### trap

Error boundary for effects:

```html
<script context="client">
  import { trap, effect, signal } from 'jamrock';

  const count = signal(0);

  trap((error) => {
    console.error('Error:', error);
  });

  effect(() => {
    if (count.value < 0) throw new Error('Invalid count');
  });
</script>
```

### ref

Create a mutable reference (useful for DOM references):

```html
<script context="client">
  import { ref } from 'jamrock';

  const inputRef = ref(null);

  function focus() {
    inputRef.current.focus();
  }
</script>

<input bind:this={inputRef} />
<button onclick={focus}>Focus</button>
```

## SSR vs Client Behavior

| Context | Behavior |
|---------|----------|
| SSR | Signals are evaluated to their values for HTML stringification |
| Client | `$signal` functions are preserved for somedom reactivity |

> [!IMPORTANT]
> `$$props` is NOT a signal — it's the props object. Never use `.value` on it.

## Template Syntax

| Template | Compiled |
|----------|----------|
| `{$count}` | `count.value` |
| `{$count + 1}` | `count.value + 1` |
| `class="btn-{$count}"` | `"btn-" + count.value` |

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/events#top">Events</a>
  </span>
  <a href="/hooks#top">
    &uarr; Back to the top
  </a>
</nav>
