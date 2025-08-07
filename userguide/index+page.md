<head>
  <title>Jamrock | Introduction</title>
</head>

# Introduction

**Jamrock** will enable you to write web pages the old way, you won't need to deal with back-end vs front-end nuances anymore!

Just run everything on the server and keep JavaScript usage low on the browser.

## The building blocks

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

Pages can declare its own route handlers through the `export&nbsp;default` object.

They can be set as boolean, to enable certain methods, or functions to handle the whole request, e.g.

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
      // handle error
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

If you don't want to execute certain page through the GET method just use `GET: false` to disable it.

> [!NOTE]
> Handlers using the syntax `['METHOD /path/with/:params']` are also registered as routes for the page,
> all declared parameters will be passed as arguments.
>
> If you declare a `catch` or `finally` handler they'll be called as result of evaluating the requested handlers.
>
> Additional handlers may be invoked if they match a requested action, e.g. `&lt;form action="?/someAction" method="POST"&gt;`.

In some cases you may want to run some code prior executing your handlers, to enable such behavior you must declare a `use` property.

Then, define some functions through a `+server.mjs` script, e.g.

```js | Example of middleware module
export function http(conn) {
  // `http` handler executes on every request!
}

export function csrf(conn) {
  conn.req.csrfProtect();
}

export default {
  ['GET /some/:stuff'](conn) {
    console.log('Got', conn.params.stuff);
  },

  catch(e, conn) {
    // do something
  },
  finally(response, conn) {
    return response;
  }
};
```

This way you can setup shared behaviour in your applications,
like authentication, shared props or state, etc.

1. Routes declared on the `export&nbsp;default` object are evaluated if they match,
   here is where you need to place api-routes as they don't require a page to exists.
2. The `+server.mjs` file can be placed at any level within the pages directory, following the same strategy as `+layout.html` or `+error.html` resolution.
3. These functions will receive the `jamrock:conn` first, any given options will be passed as the second argument.
   Those options should be set like this, e.g. `use: [['name', &lbrace; ... }]]`

You can define `catch` and `finally` handlers on this object as well,
they'll receive the error/response and connection respectively.

> [!WARNING]
> Make sure you return the given or modified `response` argument in your `finally` handler,
> the framework relies on this value to build the final response.

## Request

To play with the request you'll need the `jamrock:conn` module:

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
    - `status_code` &mdash; get/set the response status code
    - `resp_body` &mdash; get/set the response body
    - `base_url` &mdash; get/set the `&lt;base href="/" /&gt;` path
    - `cookies` &mdash; request cookies as object
    - `headers` &mdash; request headers as object
    - `session` &mdash; saved session from store
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
    - `resp_cookies` &mdash; response cookies (readonly)
    - `resp_headers` &mdash; response headers (readonly)
    - `has_body` &mdash; `true` if the response has a body value
    - `has_status` &mdash; `true` if the response has a status code
    - `is_xhr` &mdash; `true` if the request is `XMLHttpRequest`
    - `env` &mdash; safe copy of `process.env` (readonly)
  </mkd>
</details>

<details>
  <summary>Available methods</summary>
  <mkd>
    - `cookie(key, value, options)` &mdash; set response cookies
    - `header(key, value)` &mdash; set response headers
    - `redirect(url, code)` &mdash; ends request with a redirection
    - `flash(group, message)` &mdash; writes to the session flash
    - `raise(code, message)` &mdash; ends the request as failure
    - `protect(value)` &mdash; decorates an unsafe value
    - `unsafe(value)` &mdash; `true` if value is already unsafe
    - `toJSON()` &mdash; serialized verson of the `conn` object (safe)
  </mkd>
</details>

> [!WARNING]
> Unsafe values are omitted if found during the rendering of page components,
> it prevents from leaking sensitive values by mistake.

## Response

We have server routes, actions, handlers and middleware.

They all are functions and they can return anything:

- `number` &mdash; just the status-code, without body
- `string` &mdash; just the body, ends with a `200 OK`
- `&lbrace; ... }` &mdash; object-like values will be sent as JSON
- `[number, string, &lbrace; ... }]` &mdash; status, body, and headers
- `new Response(string | null, ...)` &mdash; standarized `Response`

In turn, page components will return an AST that can be serialized as HTML or sent as JSON.

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
