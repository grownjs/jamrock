<head>
  <title>Jamrock | Directives</title>
</head>

# Directives

Directives are special HTML attributes that tell the framework how to handle an element — on the server, in the browser, or both.

## Attribute Conventions

| Prefix | Rendered as | Purpose |
| - | - | - |
| `class:name` | `class="name"` (conditional) | Toggle a CSS class |
| `style:prop` | `style="prop: ..."` | Set a single style property |
| `bind:value` | `data-bind="value"` | Two-way client binding |
| `on:event` | `data-on="event"` | Hydration strategy or delegated event |
| `use:action` | `data-use="action"` | Attach a client-side action |
| `rpc:call` | `data-rpc:call="fn"` | Wire a server function to an event |
| `@attr` | `data-attr` | Arbitrary `data-*` decoration |

> [!NOTE]
> Prefixed attributes become `data-*` in the output — they carry no runtime cost until JavaScript reads them.

## Special attributes

You can use prefixed attributes to set individual properties on a given element like `class` or `style`,
other will be render as `data-*` attributes to declare behavior for JavaScript.

### on:

This attribute tells the framework how to hydrate a client-side component
on the browser, available values are: `idle`, `visible`, `media`, `savedata` and `interaction`.

Other values like `on:click` are rendered as `onclick` and so.

> [!NOTE]
> Client-side components are pretty basic, we'll explore them
> later on the [scripting section](./scripting#top).

### use:

This will attach client-side behavior to the rendered element.

> [!TIP]
> Same as `on:` and `bind:` attributes this requires JavaScript on the client-side to work.
>
> Using `on:` attributes will configure how these _hooks_ are loaded and instantiated.

### bind:

You can collect some state from inputs and other form elements with JavaScript this way.

```html
<input type="number" name="current_value" bind:value />
```

The framework will create a request with all bound elements on the current page,
it's like simulating the `&lt;form&gt;` behavior.

> [!NOTE]
> As you noticed this requires JavaScript on the client-side.
>
> We'll explore all these nuances on [its dedicated section](./scripting#top) later.

### class:

Will set a single `className` based on its evaluated value, any falsy value will ignore it.

```html
<hr class:blank="{$$props.is_blank}" />
```

### style:

This way you can set particular styles on the given element.

```html
<span style:border="{$$props.has_border ? '1px solid red' : ''}">...</span>
```

Any falsy or empty value will omit the style from the render,
`0` is taken as valid and will render the style-prop.

---

## Raw HTML

You can use the `@html` attribute to render arbitrary text as HTML.

```html
<div @html="<h1>It works!</h1>">...</div>
```

It would yield: `&lt;div&gt;&lt;h1&gt;It works!&lt;h1&gt;&lt;/div&gt;`

### &lt;template&gt;

Render HTML without any other element around, e.g.

```html
<template @html="<h1>It works!</h1>" />
```

It would yield: `&lt;h1&gt;It works!&lt;h1&gt;`

> [!CAUTION]
> These methods have no sanitization and they'll render as is,
> it may break your webpage if malformed, etc. Use them only
> if you control how the HTML is written.

---

## HTML Forms

When building the state for your application forms are
the preferred way to do it.

For shaping the request you can use `@put`, `@post`, `@patch` or `@delete`
to set its `method`; the framework will decorate the rendered `&lt;form&gt;`
to include the required attributes and elements as needed.

> [!IMPORTANT]
> These directives will keep the form working as is,
> with no JavaScript being required to make it work.

### @async

Adding this directive to your forms will enable JavaScript
to process and handle the request originated by them.

The framework will evaluate the response to choose
between patching the DOM, redirecting or reloading the page, etc.

> [!IMPORTANT]
> An advantage of asynchronous forms is keeping the form state
> between requests, however certain elements will reset for now
> (e.g. `&lt;input type="file" /&gt;`).

### @reset

This directive will reset the form after a successful request.

> [!NOTE]
> Any response with a non 2xx status code is treated as a failure
> and the form will not be resetted.

### @confirm

The user will be prompted with a `confirm()` dialog to submit the form,
this is the dumbest way to make it conditional.

> [!TIP]
> More advanced behavior can be made with JavaScript on the client-side,
> that's what a progressive enhancement is.
>
> We're about to dig into that, let's continue!

---

## RPC Directives

### rpc:call

Wires a DOM event to a `context="module"` server export. When the event fires, the function runs on the server and any dirty fragments in the component are re-rendered and pushed via SSE.

```html
<button rpc:call="addItem">Add</button>
```

```html
<!-- Pass a value alongside the call -->
<button rpc:call="removeItem" name="id" value="42">Remove</button>
```

> [!TIP]
> See [RPC](/rpc#top) for the full cycle and how to define the server function.

### rpc:yield

Marks an element as a yield target — a named slot where the server can push out-of-band HTML updates independently of the surrounding fragment.

```html
<span rpc:yield="status">Pending</span>
```

> [!NOTE]
> `rpc:yield` is used for fine-grained partial updates within a fragment, without re-rendering the whole fragment.

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/scripting#top">Scripting</a>
  </span>
  <a href="/directives#top">
    &uarr; Back to the top
  </a>
</nav>
