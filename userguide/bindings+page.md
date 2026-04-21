<head>
  <title>Jamrock | Bindings</title>
</head>

# Bindings

Bindings connect form elements and DOM properties to values. There are two kinds: **server bindings** that collect state for form submissions, and **client bindings** that keep the DOM in sync with signals reactively.

---

## Form Bindings (server-side)

### bind:value

Marks an input for automatic collection into the request body:

```html
<input type="text" name="username" bind:value />
```

When any bound element changes, the framework simulates a form submission with all bound values included — without requiring an explicit `<form>`.

### bind:checked

For checkbox and radio inputs:

```html
<input type="checkbox" name="agree" bind:checked />
```

### bind:group

Groups radio buttons or multi-select checkboxes under a single name:

```html
<input type="radio" name="size" value="sm" bind:group />
<input type="radio" name="size" value="md" bind:group />
<input type="radio" name="size" value="lg" bind:group />
```

---

## DOM Reference (client-side)

### bind:this

Captures a reference to the actual DOM element. Client-only:

```html
<script context="client">
  import { ref } from 'jamrock';

  const input = ref(null);

  function focusInput() {
    input.current?.focus();
  }
</script>

<input bind:this={input} placeholder="Type here" />
<button onclick={focusInput}>Focus</button>
```

---

## Signal Bindings — s:*

Use `s:*` attributes to bind DOM properties to client signals. Updates are pushed to the DOM automatically whenever the signal changes:

```html
<script context="client">
  import { signal } from 'jamrock';

  const label = signal('Hello');
  const isDisabled = signal(false);
  const color = signal('green');
</script>

<!-- Text content -->
<span s:textContent={label}></span>

<!-- Attribute toggle -->
<button s:disabled={isDisabled}>Submit</button>

<!-- Individual style property -->
<div s:style.color={color}>Colored text</div>

<!-- Class name -->
<div s:className={color}>...</div>
```

> `s:*` bindings are one-way: signal → DOM. Combine with an event handler for two-way binding.

### Two-way binding pattern

```html
<script context="client">
  import { signal } from 'jamrock';
  const name = signal('');
</script>

<input
  s:value={name}
  oninput={(e) => $name = e.target.value}
  placeholder="Your name"
/>
<p>Hello, {$name || 'stranger'}!</p>
```

---

## Summary

| Binding | Layer | Purpose |
|---------|-------|---------|
| `bind:value` | Server | Collect input value for form submission |
| `bind:checked` | Server | Collect checkbox / radio state |
| `bind:group` | Server | Collect grouped radio / checkbox |
| `bind:this` | Client | Reference to the DOM element |
| `s:propName` | Client | Reactive DOM property → signal |
| `s:style.prop` | Client | Reactive inline style → signal |
| `s:className` | Client | Reactive class → signal |

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/scripting#top">Scripting</a>
  </span>
  <a href="/bindings#top">
    &uarr; Back to the top
  </a>
</nav>
