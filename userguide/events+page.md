<head>
  <title>Jamrock | Events</title>
</head>

# Events

Jamrock supports four event patterns, each at a different layer. Pick the one that matches where the work happens:

| Pattern | Runs on | Use when |
|---------|---------|----------|
| `onclick={fn}` | Browser | Pure client interaction, no server needed |
| `on:click` + hydration | Browser, lazy | Same, but loaded on demand |
| `@on:submit` | Server | Form submission handled server-side, no full reload |
| `rpc:call` | Server (SSE) | Trigger a server function, patch live fragments |

---

## onclick

Standard DOM handler. Runs in the browser. Works with any signal or DOM logic:

```html
<script context="client">
  import { signal } from 'jamrock';
  const count = signal(0);
</script>

<button onclick={() => $count++}>Clicked {$count} times</button>
```

---

## on:event + hydration

Same as `onclick`, but the client script is loaded lazily. The `on:` prefix on a lifecycle attribute controls *when* the component is hydrated:

```html
<script context="client">
  function greet(e) { alert(`Hello from ${e.target.textContent}`); }
</script>

<button on:click={greet} on:interaction>Say hello</button>
```

Available hydration strategies:

| Value | Triggers when |
|-------|--------------|
| `on:idle` | Browser is idle (`requestIdleCallback`) |
| `on:visible` | Element enters viewport (`IntersectionObserver`) |
| `on:interaction` | First user interaction (click, keydown, etc.) |
| `on:media="(query)"` | Media query matches |
| `on:savedata` | User has data-saver enabled |

> [!TIP]
> Use `on:interaction` as the default — it defers loading until the user actually needs the component.

---

## @on:submit (server-delegated forms)

Add `@on:submit` to a form to handle submission on the server without a full page reload. The response is evaluated and the DOM is patched accordingly.

```html
<script>
  import { body_params, flash, redirect } from 'jamrock:conn';

  export default {
    use: ['csrf'],
    POST: true,
    async submit() {
      const { message } = body_params;
      // ... process on server
      flash('success', 'Sent!');
      redirect('/');
    }
  };
</script>

<form @on:submit="submit" @async method="POST">
  <input name="message" placeholder="Message" />
  <button type="submit">Send</button>
</form>
```

> [!NOTE]
> `@async` enables client-side interception of the form submit. Without it, the form works as a plain HTML form — still functional, just with a full reload.

---

## rpc:call (server function trigger)

Wire a DOM event directly to a named server export. When triggered, the server function runs, dirty fragments are re-rendered, and the diff is pushed to the client via SSE — no page reload, no manual fetch.

```html
<script>
  import { session } from 'jamrock:conn';

  export async function increment() {
    session.count = (session.count || 0) + 1;
  }
</script>

<button rpc:call="increment">+1</button>

<fragment name="counter">
  Count: {session.count || 0}
</fragment>
```

> [!NOTE]
> `rpc:call` requires an active SSE connection. Fragments in the same component are automatically re-rendered when their data changes. See the [RPC section](/introduction#top) for the full picture.

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/actions#top">Actions</a>
  </span>
  <a href="/events#top">
    &uarr; Back to the top
  </a>
</nav>
