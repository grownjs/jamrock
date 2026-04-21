<head>
  <title>Jamrock | Middleware</title>
</head>

# Middleware

Middleware functions run before your route handlers, enabling authentication, logging, CSRF protection, and other cross-cutting concerns.

## Defining Middleware

Create a `+server.mjs` file in any directory. Exported functions become middleware:

```js
export function auth(conn) {
  const token = conn.headers.get('authorization');
  if (!token) {
    return conn.redirect('/login');
  }
}

export function log(conn) {
  console.log(`${conn.method} ${conn.request_path}`);
}

export default {
  use: ['auth', 'log'],
};
```

## Using Middleware

Pages declare their middleware dependencies through the `use` array:

```html
<script>
  export default {
    use: ['auth', 'csrf'],
    POST: true,
  };
</script>

<form method="POST">
  <button type="submit">Protected Action</button>
</form>
```

## Middleware Resolution

Middleware files are resolved hierarchically:

1. Root `+server.mjs` applies to all routes
2. Nested `+server.mjs` files add to the chain
3. Middleware runs in order: root → parent → current

```
pages/
├── +server.mjs           # Applies to all routes
├── index+page.html       # Uses root middleware
└── admin/
    ├── +server.mjs       # Adds admin middleware
    └── dashboard+page.html  # Uses both middleware chains
```

## Built-in Middleware

### CSRF Protection

```js
export function csrf(conn) {
  conn.req.csrfProtect();
}
```

Enable it in your page:

```html
<script>
  export default {
    use: ['csrf'],
    POST: true,
  };
</script>
```

### Session Middleware

Sessions are available through `conn.req.session`:

```js
export function session(conn) {
  const user = conn.session.user;
  if (!user) {
    return conn.redirect('/login');
  }
}
```

## Route Handlers

`+server.mjs` can also define API routes without a page:

```js
export default {
  use: ['auth'],

  ['GET /api/users']() {
    return Response.json([{ id: 1, name: 'Alice' }]);
  },

  ['POST /api/users']({ body }) {
    return Response.json({ created: true }, { status: 201 });
  },

  catch(error, conn) {
    console.error(error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  },

  finally(response) {
    response.headers.set('X-Response-Time', Date.now());
    return response;
  },
};
```

## Error Handling

The `catch` handler receives errors from the middleware chain:

```js
export default {
  use: ['auth'],

  catch(error, conn) {
    if (error.name === 'UnauthorizedError') {
      return conn.req.redirect('/login');
    }
    throw error;
  },

  finally(response) {
    return response;
  },
};
```

> [!WARNING]
> Always return the response in `finally` handlers. The framework needs this to build the final response.

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/conn#top">Request API</a>
  </span>
  <a href="/middleware#top">
    &uarr; Back to the top
  </a>
</nav>
