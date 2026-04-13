<head>
  <title>Jamrock | Hooks</title>
</head>

# Hooks

Jamrock uses **signals** for reactivity. The old React-style hooks have been removed.

## Available APIs

### signal

Create a reactive value:

```html
<script context="client">
  import { signal } from 'jamrock';

  const count = signal(0);
</script>

<button on:click={() => count.value++}>{count.value}</button>
```

### computed

Create a derived value:

```html
<script context="client">
  import { signal, computed } from 'jamrock';

  const a = signal(2);
  const b = signal(3);
  const sum = computed(() => a.value + b.value);
</script>

<p>Sum: {sum.value}</p>
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

### scope

Share state across components:

```html
<script context="client">
  import { scope, effect } from 'jamrock';

  const Theme = scope('light');

  Theme.value = 'dark';

  Theme.provide('blue', () => {
    // Theme.value === 'blue' here
  });
</script>
```

### ref

Create a mutable reference:

```html
<script context="client">
  import { ref } from 'jamrock';

  const inputRef = ref(null);

  function focus() {
    inputRef.current.focus();
  }
</script>

<input ref={inputRef} />
<button on:click={focus}>Focus</button>
```

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/events#top">Events</a>
  </span>
  <a href="/hooks#top">
    &uarr; Back to the top
  </a>
</nav>
