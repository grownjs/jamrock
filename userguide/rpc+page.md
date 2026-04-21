<head>
  <title>Jamrock | RPC</title>
</head>

# RPC

RPC lets you call server functions directly from the browser — no API endpoints, no `fetch()`, no JSON marshalling. You export a function, wire it to a DOM event with `rpc:call`, and the framework handles the rest.

When triggered:
1. The browser sends the payload to the server
2. The server function runs
3. The framework re-renders any dirty fragments in the component
4. The diff is pushed to the browser via SSE and patched in place

No full reload. No client router. No boilerplate.

---

## Defining Server Functions

RPC functions live in `<script context="module">` — they run once on server load and are shared across all requests:

```html
<script context="module">
  const items = [];

  export function addItem(payload) {
    items.push({ id: Date.now(), text: payload.text });
  }
</script>

<script>
  export const data = items;
</script>

<form rpc:call={addItem}>
  <input name="text" placeholder="New item" />
  <button type="submit">Add</button>
</form>

<fragment name="list">
  {#each data as item}
    <li>{item.text}</li>
  {/each}
</fragment>
```

The server script (`<script>` without context) reads from module state and exposes it as props. The fragment re-renders against fresh props every time the function runs.

---

## Payload

The payload passed to your function comes from the triggering element:

**From a form** — all form field values as an object:

```html
<script context="module">
  export function save(payload) {
    // payload = { title: '...', body: '...' }
  }
</script>

<form rpc:call={save}>
  <input name="title" />
  <textarea name="body"></textarea>
  <button type="submit">Save</button>
</form>
```

**From a button** — the button's `name` and `value` attributes:

```html
<script context="module">
  export function like(payload) {
    // payload = { comment_id: '42' }
  }
</script>

<button rpc:call={like} name="comment_id" value={c.id}>
  Like
</button>
```

**From a hidden input alongside a button** — include hidden fields in the same form or fieldset.

---

## Fragments

A `<fragment>` marks a region of the page that gets re-rendered when RPC runs. Give it a unique `name`:

```html
<fragment name="counter">
  Count: {count}
</fragment>
```

> [!IMPORTANT]
> The `name` must be unique within the component. The fragment re-renders with fresh server-script state after every RPC call.

Fragments support a few patching options:

| Prop | Default | Description |
|------|---------|-------------|
| `name` | *(required)* | Unique identifier within the component |
| `mode` | `append` | How updates are applied: `append`, `prepend`, `replace` |
| `interval` | `0` | Push updates every N milliseconds |
| `timeout` | `50` | Pause iterators after N ms, resume later |
| `limit` | `100` | Pause after N rendered items |

---

## Full Example — Nested Comments

The canonical example: a recursive comment thread where likes and replies update in place without a reload.

```html
<script context="module">
  const _comments = [
    { id: 1, body: 'Great post!', likes: 0, msgs: [] },
  ];

  export function addComment(payload) {
    const parent = findById(_comments, +payload.message_id);
    if (parent) {
      parent.msgs.unshift({ id: Date.now(), body: payload.message, likes: 0, msgs: [] });
      parent.count = (parent.count || 0) + 1;
    }
  }

  export function incrementLikes(payload) {
    const comment = findById(_comments, +payload.comment_id);
    if (comment) comment.likes++;
  }

  function findById(list, id) {
    for (const c of list) {
      if (c.id === id) return c;
      const found = findById(c.msgs, id);
      if (found) return found;
    }
  }
</script>

<script>
  import Comments from './comments.html';
  export const data = _comments;
  export const key = 0;
</script>

<fragment name="live-comments" key="comments:{key}">
  {#each data as c}
    <li>
      <p>{c.body}</p>

      <form class="reply-form" rpc:call={addComment}>
        <input type="hidden" name="message_id" value={c.id} />
        <input type="text" name="message" placeholder="Reply..." />
        <button type="submit">Reply</button>
      </form>

      <button rpc:call={incrementLikes} name="comment_id" value={c.id}>
        Like ({c.likes})
      </button>

      {#if c.count > 0}
        <Comments data={c.msgs} key="{key}.{c.id}" />
      {/if}
    </li>
  {/each}
</fragment>
```

### The key prop

When a component is used recursively, each instance needs a unique fragment namespace. The `key` prop namespaces the fragment name — `key="comments:0.1.6"` — so the framework can target the right one.

Export a `key` from the server script and the parent passes it down with a dot-separated suffix:

```html
export const key = 0;          <!-- root instance -->
<Comments key="{key}.{c.id}" /> <!-- child gets "0.42", "0.43", etc. -->
```

---

## REST-style RPC

For client-side scripts that need to call server functions directly, import `rpc` from `jamrock`:

```html
<script context="client">
  import { rpc } from 'jamrock';

  async function handleClick() {
    await rpc('comments/incrementLikes', { comment_id: 42 });
  }
</script>

<button onclick={handleClick}>Like</button>
```

This sends a `POST` to `/_rpc/{module}/{fn}` and returns the server function's return value. Fragments are still re-rendered server-side — the client just receives confirmation.

> [!TIP]
> Prefer `rpc:call` for most cases — it's declarative and wires directly to DOM events with no client script required. Reach for `rpc()` when you need async control flow on the client.

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/fragments#top">Fragments</a>
  </span>
  <a href="/rpc#top">
    &uarr; Back to the top
  </a>
</nav>
