<head>
  <title>Jamrock | Fragments</title>
</head>

# Fragments

They are markup containers that render as other HTML elements,
they can outlive the serve-side render and can be updated later.

Client-side components are already fragments, i.e.

```html
<Example tag="p" />
```

would yield:

```html
<p data-component="pages/components/Example:1">...</p>
```

In comparison with a tagged fragment:

```html
<fragment tag="ul" name="a-list">
  {#each data as item}
  <li>{item}</li>
  {/each}
</fragment>
```

would yield:

```html
<ul data-fragment="a-list">
  ...
</ul>
```

> [!IMPORTANT]
> If you omit the `tag` attribute the element is rendered as `x-fragment`,
> which is supported by a custom-element.

The purpose of these elements is to make partial updates on the DOM,
instead of patching the whole page after every request.

Fragments are great to replace, append or prepend data.

## Patching options

Updates are driven by the framework,
but you can configure certain aspects.

```html
<fragment name="x" mode="prepend" limit="10" timeout="200" interval="50">
  ...
</fragment>
```

> [!IMPORTANT]
> Thw `name` prop is required and it must be unique within the component.

### interval <em>(default: 0)</em>

It will push updates every given milliseconds.

### timeout <em>(default: 50)</em>

On timeout iterators will pause, render and resumed later.

### limit <em>(default: 100)</em>

Once limit is reached iterators will pause, render and resumed later.

### mode <em>(default: append)</em>

How the patching is applied: `append`, `prepend` or `replace`.

The framework use the above options and use the whole fragment as a template,
the resulting AST is patched on the existing node on the DOM.

> [!WARNING]
> Options are applied to every iterator found within the fragment,
> try to use one iterator per fragment for simplicity.

---

## Patching scope

Not all values are watched for patching.

Generators and promises are the only data type that can be streamed at the moment,
the framework will handle all the logic to subscribe, publish and render from them.

> [!NOTE]
> Scoped values within the fragments are captured from their previous render,
> they are reused for all the upcoming renders.
>
> They're still references and they can carry new values.

### Promises

Any given promise will be awaited until the maximum execution-time is reached.

If they don't resolve on time its value will be sent after the response is sent.

### Generators

Iterators produced by generators can be paused if the maximum execution-time is reached.

They are also paused by exceeding the limit of rendered items.

The framework will resume the iterators and new items will be sent to the browser.

---

## Patching components

**Jamrock** will handle these updates for you.

i.e, you may have a client-side component this way:

```html
<Example value="42" on:interaction />
```

> [!TIP]
> These components are always server-side rendered,
> and optionally instantiated on the client-side if needed.
>
> We'll explore that on the [next section](/directives#top)!

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/directives#top">Directives</a>
  </span>
  <a href="/fragments#top">
    &uarr; Back to the top
  </a>
</nav>
