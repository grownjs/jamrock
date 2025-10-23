<head>
  <title>Jamrock | Conn</title>
</head>

# The `jamrock:conn` module

The connection context wraps the current request and response,
also providing some useful stuff.

## How it works?

**Jamrock** will execute your code in some order:
matching _middleware_ goest first, then _actions_ and finally the page _handlers_.

Returned values will be used to produce a response:

- `number` &mdash; just the status-code, without body
- `string` &mdash; just the body, ends with a `200 OK`
- `&lbrace; ... }` &mdash; object-like values will be sent as JSON
- `[number, string, &lbrace; ... }]` &mdash; status, body, and headers
- `new Response(string | null, ...)` &mdash; standarized `Response`

> [!CAUTION]
> If you want to return an array, like a list of values, use an object with a property
> containing its value instead.
>
> Otherwise, the framework will try to extract the `status`, `body`,
> and `headers` parameters from your value.

If no response is set, matching pages will be rendered and respond with `200 OK`.

<hr class="break" />

## Available properties

### **req**

The standard `Request` object as described on the MDN.

> [!NOTE]
> Supported runtimes will have their own implementation.

---

### **store**

This is a simplified API to Redis (if enabled), falling back to memory.

Useful for saving saving data across instances, application state is saved here.

---

### **method**

Returns any of the following values: `GET`, `PUT`, `POST`, `PATCH` or `DELETE`.

> [!NOTE]
> All non `GET` calls will require a valid csrf-token to be executed.

---

### **server**

Instantiated server information like `proto`, `host` or `port`.

---

### **base_url**

Use this property to _get/set_ the `&lt;base href="/" /&gt;` path.

> [!NOTE]
> Usually you don't need to touch this, but if you're routing the application
> outside the root `/` you might need to change it.
>
> This is because all paths from assets and resources are absolute once compiled.

---

### **cookies**

Request cookies as object, to set cookies see the `cookie()` method below.

---

### **session**

Saved session from the Redis store (or memory store).

---

### **headers**

Request headers as object, `Response` headers can be set with `resp_headers`, see below.

---

### **options**

Given framework options to the current instance _(read-only)_.

---

### **aborted**

Returns `true` if request has ended.

> [!NOTE]
> This value is derived from the `req.signal` found on the original `Request` object.

---

### **params**

Mixed _query_, _body_ and _path_ params in that order.

---

### **path_info**

List of path segments, i.e. for `/a/b/c` you'll get `['a', 'b', 'c']`.

---

### **path_params**

Route parameters, i.e. `/foo/:bar` would produce a `&lbrace; foo: 'bar' }` object as value.

---

### **body_params**

Request body as object.

> [!IMPORTANT]
> The body is not parsed on every request, you need to call `req.parseBody()` to achieve that.
>
> A common pattern is having an `http` middleware that you can `use` in your handlers.

---

### **request_path**

Requested url's pathname, i.e. `/path/to/x`.

---

### **query_string**

Requested url's query string, i.e. `foo=bar&baz=buzz`

---

### **query_params**

Requested url's query as object, i.e. `&lbrace; foo: 'bar', baz: 'buzz' }`

---

### **csrf_token**

Calculated crsf-token for the request.

> [!NOTE]
> This is injected by the framework but you can use it as needed.
>
> To enable it you need to call `req.csrfProtect()` on every request,
> try using a middleware for that.

---

### **resp_cookies**

Response cookies _(Map object)_.

> [!IMPORTANT]
> **Jamrock** will use this to build the final response.

---

### **resp_headers**

Response headers _(Headers object)_.

> [!IMPORTANT]
> **Jamrock** will use this to build the final response.

---

### **status_code**

Low-level way to _get/set_ the response status code.

> [!IMPORTANT]
> Once set, the framework will stop executing handlers and page components, etc.
>
> If you want to set a different status code without ending the response call `status()` instead.

---

### **resp_body**

Low-level way to _get/set_ the response body.

> [!NOTE]
> These low-level methods are intended for functions that may return values while
> setting the response directly on the `conn` object.
>
> **Jamrock** use them to build a `Response` for you if already set.

---

### **has_body**

Returns `true` if the response has a body value.

---

### **is_close**

Returns `true` if the response is already closed.

1. Calls to `status()` will set the `status_code` but keep the response open.
2. Calls to `redirect()` set the `status_code` and close the response.

---

### **is_json**

Returns `true` if the request accepts `application/json`.

---

### **is_xhr**

Returns `true` if the request is `XMLHttpRequest`.

<hr class="break" />

## Available methods

### **cookie(key, value[, options])**

Set response cookies, if `value` is `null` then the cookie will be set as expired (e.g. `&lbrace; expires: new Date(0) }`).

If options is a _number_ then the expiration is set _N_ seconds in the future (e.g. `&lbrace; expires: Date.now() + N }`).

Supported options are: `&lbrace; value, maxAge, domain, path, expires, httpOnly, secure, sameSite }`.

> [!NOTE]
> The `expires` option can be an integer, _Date_ object or a formatted date _string_.

---

### **header(key, value)**

Set response headers directly on `resp_headers`.

> [!NOTE]
> This method is a shortcut for `resp_headers.set()`.

---

### **status(code)**

Sets the `status_code` without closing the response.

Use this method if you want your pages to be rendered with different statuses,
useful for custom error-pages, etc.

> [!CAUTION]
> You can set the `status_code` once, more calls are disallowed.

---

### **redirect(url[, code])**

Ends the request with a redirection.

> [!NOTE]
> Calling this will close the response without blocking.

---

### **toJSON()**

Serialized request-info without body.

---

### **flash(type, message)**

Writes messages to the session flash.

Calling `flash()` without arguments will return and clear the whole flash-info from session.

> [!IMPORTANT]
> Messages are stored and returned in a single array.

---

### **raise(code, message[, exception])**

Ends the request with a failure.

It throws an exception with the given `status` as field,
use `exception` to instantiate a different class than _Error_, e.g.

```js
raise(404, 'User not found', class CustomError extends Error {});
```

---

### **send(code, [body, [headers]])**

Ends the request with the given arguments.

The body will be calculated by the framework, it can be a _string_, _Buffer_ or plain _object_.

```js
send(201, { success: true });
```

> [!NOTE]
> Plain objects will be serialized as JSON and
> the `&lbrace; 'content-type': 'application/json' }` header will be set.

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/hooks#top">Hooks</a>
  </span>
  <a href="/conn#top">
    &uarr; Back to the top
  </a>
</nav>
