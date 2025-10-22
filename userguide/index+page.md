<head>
  <title>Jamrock | Introduction</title>
</head>

# The building blocks

Everything starts from somewhere,

1. Routes are the entry-point for your application, and they are defined through page components or middleware.
2. The `Request` object is available through the `jamrock:conn` module,
   it provides most stuff for common chores.
3. The `Response` is calculated by the framework, but you can also provide your own
   (this is what the `redirect()` helper does).

## Routes

Files ending with `+page.html` will be used to declare routes.

They're transformed using the following rules:

| Filename | Route |
| - | - |
| `index+page.html` | `/` |
| `login+page.html` | `/login` |
| `(lang).blog+page.html` | `/:lang?/blog` |
| `hello.[name]+page.html` | `/hello/:name` |
| `posts/$post_id+page.html` | `/posts/:post_id` |
| `_site/sitemap[.xml]+page.html` | `/sitemap.xml` |
| `_site/articles/[...slug]+page.html` | `/articles/*slug` |

> [!NOTE]
> Path parameters can be declared as `$param` or `[param]`,
> optional parameters use parentheses (e.g. `(param)`),
> and catch-all parameters as `[...param]`.
>
> Segments are taken from nested folders or `.` separators,
> any of them starting with `_` are just ignored from final paths.
>
> File extensions are preserved by using the `[.ext]` syntax.

## Handlers

Pages can declare its own route handlers through the `export default` object.

They can be set as boolean, to enable some methods, or functions to handle the whole request, e.g.

```html | Example of module handlers
<script>
  export default {
    // middleware to invoke, see below
    use: ['csrf'],

    // allow for POST requests, no action
    POST: true,

    // action for DELETE requests
    DELETE() {
      // do something
    },

    // route-handlers for this component
    ['GET /:article_id']({ article_id }) {
      console.log({ article_id });
    },

    catch(e) {
      // handle errors
    },
    finally() {
      // this always run
    },

    someAction() {
      // used on form actions
    },
  };
</script>
```

By default all pages will respond to GET requests, depending on their handlers they can respond to other methods.

If you don't want to execute a page through the GET method just use `GET: false` to disable it.

> [!NOTE]
> Handlers using the syntax `['METHOD /path/with/:params']` are also registered as routes for the page,
> all declared parameters will be passed as arguments.
>
> If you declare a `catch` or `finally` handler they'll be called as result of evaluating the requested handlers.
>
> Additional handlers may be invoked if they match a requested action, e.g. `&lt;form action="?/someAction" method="POST"&gt;`.

## Middleware

In some cases you may want to run some code prior executing your handlers, to enable such behavior you must declare a `use` property.

This is how you can define some middleware functions in a `+server.mjs` script, e.g.

```js | Example of middleware module
export function http(conn) {
  // `http` handler executes on every request!
}

export function csrf(conn) {
  conn.req.csrfProtect();
}

export default {
  use: ['http'],
  
  ['GET /some/:stuff']({ params }) {
    console.log('Got', params.stuff);
  },

  catch(e, conn) {
    // do something
  },
  finally(response) {
    return response;
  }
}
```

Exported functions are registered as middleware by name,
these `+server.mjs` scripts are loaded automatically by the framework:

1. Routes declared on the `export default` object are evaluated if they match,
   here is where you need to place api-routes as they don't require a page to exist.
2. The `+server.mjs` file can be placed at any level within the pages directory, following the same strategy as `+layout.html` or `+error.html` resolution.
3. These functions will receive the `jamrock:conn` object as their first argument, any other values will be passed as the second argument, etc.
   Extra options should be set like this, e.g. `use: [['csrf', ...]]`

Declared `catch` and `finally` handlers on this object will receive
the error and response, with the `jamrock:conn` object as the last argument.

> [!WARNING]
> Make sure you return the given or modified `response` argument in your `finally` handler,
> the framework relies on this value to build the final response.
>
> Avoid errors within `catch` handlers, otherwise they might not be handled et all!

## Request

To access the request you'll need the `jamrock:conn` module:

```html | Example of request handling
<script>
  import { method, headers, redirect } from 'jamrock:conn';

  if (method === 'GET' && !headers.has('token')) {
    redirect('/login');
  }
</script>

<h1>It works.</h1>
```

Requests to page components will always render something,
however `redirect` calls can stop any further rendering.

Below is a list of all sort of things you may use:

<details>
  <summary>Available properties</summary>
  <mkd>
    - `req` &mdash; the original `Request` object
    - `store` &mdash; reference to shared `Map` store
    - `method` &mdash; `GET` | `PUT` | `POST` | `PATCH` | `DELETE`
    - `server` &mdash; instantiated server object
    - `base_url` &mdash; _get/set_ the `&lt;base href="/" /&gt;` path
    - `cookies` &mdash; request cookies as object
    - `session` &mdash; saved session from store
    - `headers` &mdash; request headers as object
    - `options` &mdash; framework options
    - `aborted` &mdash; `true` if request has ended
    - `params` &mdash; mixed _path_, _query_ and _body_ params
    - `path_info` &mdash; list of path segments
    - `path_params` &mdash; route parameters
    - `body_params` &mdash; request body as object
    - `request_path` &mdash; requested url's pathname
    - `query_string` &mdash; requested url's query string
    - `query_params` &mdash; requested url's query as object
    - `csrf_token` &mdash; calculated token for the request
    - `resp_cookies` &mdash; response cookies _(readonly)_
    - `resp_headers` &mdash; response headers _(readonly)_
    - `status_code` &mdash; _get/set_ the response status code
    - `has_status` &mdash; `true` if the response has a status code
    - `resp_body` &mdash; _get/set_ the response body
    - `has_body` &mdash; `true` if the response has a body value
    - `is_json` &mdash; `true` if the request accepts `application/json`
    - `is_xhr` &mdash; `true` if the request is `XMLHttpRequest`
    - `env` &mdash; safe copy of `process.env` _(readonly)_
  </mkd>
</details>

<details>
  <summary>Available methods</summary>
  <mkd>
    - `cookie(key, value, options)` &mdash; set response cookies
    - `header(key, value)` &mdash; set response headers
    - `redirect(url, code)` &mdash; ends request with a redirection
    - `toJSON()` &mdash; serialized request-info without body
    - `flash(group, message)` &mdash; writes to the session flash
    - `raise(code, message)` &mdash; ends the request as failure
  </mkd>
</details>

## Response

Handler functions and middleware can return anything:

- `number` &mdash; just the status-code, without body
- `string` &mdash; just the body, ends with a `200 OK`
- `&lbrace; ... }` &mdash; object-like values will be sent as JSON
- `[number, string, &lbrace; ... }]` &mdash; status, body, and headers
- `new Response(string | null, ...)` &mdash; standarized `Response`

Page components will return an AST that can be rendered as HTML or sent as JSON,
the framework will handle the response for you in such cases.

> [!IMPORTANT]
> If you want to return an array, like a list of values, use an object with a property
> containing its value instead.
>
> Otherwise, the framework will try to extract the `status`, `body`,
> and `headers` parameters from your value.

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/command-line#top">Command Line</a>
  </span>
  <a href="/#top">
    &uarr; Back to the top
  </a>
</nav>
