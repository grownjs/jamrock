<head>
  <title>Jamrock | Hooks</title>
</head>

# Hooks

Jamrock provides React-style hooks for backward compatibility, but **signals** are the recommended approach for new code.

## Available Hooks

### useRef

Create a mutable reference:

```html
<script context="client">
  import { useRef } from 'jamrock';

  const inputRef = useRef(null);

  function focus() {
    inputRef.current.focus();
  }
</script>

<input ref={inputRef} />
<button on:click={focus}>Focus</button>
```

### useState (Legacy)

> [!WARNING]
> `useState` is deprecated. Use `signal` instead.

```html
<script context="client">
  import { useState } from 'jamrock';

  const [count, setCount] = useState(0);
</script>

<button on:click={() => setCount(count + 1)}>{count}</button>
```

**Recommended:**

```html
<script context="client">
  import { signal } from 'jamrock';

  const count = signal(0);
</script>

<button on:click={() => count.value++}>{count.value}</button>
```

### useEffect (Legacy)

> [!WARNING]
> `useEffect` is deprecated. Use `effect` instead.

```html
<script context="client">
  import { useState, useEffect } from 'jamrock';

  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);
</script>
```

**Recommended:**

```html
<script context="client">
  import { signal, effect } from 'jamrock';

  const count = signal(0);

  effect(() => {
    document.title = `Count: ${count.value}`;
  });
</script>
```

### useMemo (Legacy)

> [!WARNING]
> `useMemo` is deprecated. Use `computed` instead.

```html
<script context="client">
  import { useState, useMemo } from 'jamrock';

  const [a, setA] = useState(2);
  const [b, setB] = useState(3);

  const sum = useMemo(() => a + b, [a, b]);
</script>
```

**Recommended:**

```html
<script context="client">
  import { signal, computed } from 'jamrock';

  const a = signal(2);
  const b = signal(3);

  const sum = computed(() => a.value + b.value);
</script>
```

## onError

Handle errors in client-side components:

```html
<script context="client">
  import { onError } from 'jamrock';

  onError((error) => {
    console.error('Component error:', error);
  });
</script>
```

## createContext

Create a context for sharing state across components:

```html
<script context="client">
  import { createContext, signal } from 'jamrock';

  const ThemeContext = createContext({ theme: 'light' });
</script>
```

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/events#top">Events</a>
  </span>
  <a href="/hooks#top">
    &uarr; Back to the top
  </a>
</nav>
