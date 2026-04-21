<head>
  <title>Jamrock | Actions</title>
</head>

# Actions

Actions are named server-side handlers triggered by form submissions. They let you validate input, mutate state, and redirect — entirely on the server, no client JS required.

## Defining an Action

Export named functions inside `export default` alongside HTTP method declarations:

```html
<script>
  import { body_params, redirect, flash } from 'jamrock:conn';

  export default {
    use: ['csrf'],
    POST: true,

    async save() {
      const { title, body } = body_params;
      if (!title) {
        flash('error', 'Title is required');
        return;
      }
      // ... persist to DB
      redirect('/posts');
    }
  };
</script>

<form method="POST" action="?/save">
  <input name="title" placeholder="Title" />
  <textarea name="body"></textarea>
  <button type="submit">Publish</button>
</form>
```

The `?/actionName` query syntax routes the POST request to that specific action. Multiple actions can coexist in a single page.

---

## Action Lifecycle

```
Form submit → CSRF check → middleware chain → action fn → redirect / flash / render
```

1. **Validate** — inspect `body_params`, return early on failure
2. **Mutate** — write to DB, update session, call external APIs
3. **Respond** — `redirect()` to another page, or return to re-render with new state

```html
<script>
  import { body_params, session, redirect, flash } from 'jamrock:conn';

  export default {
    use: ['csrf'],
    POST: true,

    async login() {
      const { email, password } = body_params;

      if (!email || !password) {
        flash('error', 'All fields are required');
        return;
      }

      const user = await db.findUser(email, password);
      if (!user) {
        flash('error', 'Invalid credentials');
        return;
      }

      session.user = user;
      redirect('/dashboard');
    }
  };
</script>

<form method="POST" action="?/login">
  <input name="email" type="email" />
  <input name="password" type="password" />
  <button type="submit">Sign in</button>
</form>
```

---

## CSRF Protection

All non-GET requests require a valid CSRF token. Enable `csrf` middleware and the framework injects the token into forms automatically:

```html
<script>
  export default {
    use: ['csrf'],
    POST: true,
    async create() { /* ... */ }
  };
</script>

<form method="POST" action="?/create">
  <!-- csrf_token injected automatically -->
  <button type="submit">Create</button>
</form>
```

> [!IMPORTANT]
> Without `use: ['csrf']`, non-GET requests are rejected with `403 Forbidden`.

---

## Flash Messages

`flash(type, message)` stores a one-time message in the session, readable after a redirect:

```html
<script>
  import { flash, redirect } from 'jamrock:conn';

  export default {
    use: ['csrf'],
    POST: true,
    async delete() {
      await db.items.delete(body_params.id);
      flash('success', 'Item deleted');
      redirect('/items');
    }
  };
</script>
```

On the destination page, call `flash()` with no arguments to read and clear:

```html
<script>
  import { flash } from 'jamrock:conn';
  const messages = flash();
</script>

{#each messages as msg}
  <p class="alert-{msg.type}">{msg.message}</p>
{/each}
```

> [!NOTE]
> Flash messages are stored in the session and cleared on first read. They survive exactly one redirect.

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/bindings#top">Bindings</a>
  </span>
  <a href="/actions#top">
    &uarr; Back to the top
  </a>
</nav>
