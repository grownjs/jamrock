<head>
  <title>Jamrock | Fragments</title>
</head>

# Fragments

Similar to snippets, fragments are portions of markup,
but they can outlive the serve-side render and update later.

## Markup containers

Client-side components are already fragments, i.e.

```html
<Example tag="p" />
```

would yield:

```html
<p data-component="pages/components/Example:1">...</p>
```

In comparison with a plain fragment:

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

The purpose of these elements is to make partial updates on the DOM,
instead of patching the whole page after every request.

Fragments are great to replace, append or prepend data.

> [!NOTE]
> For now, only fragments can be updated from iterators running.
>
> Manually updating them is not supported yet.

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

> [!WARNING]
> Options are applied on any `&lbrace;#each ...}` found within the fragment,
> try to use one iterator per fragment for simplicity.
>
> Patching operations occur after the framework handles the initial render or patch
> after every request.
>
> Iterators will last for that request only.

## Patching components

**Jamrock** will handle these updates for you,
client components are always server-side rendered and can
be instantiated in several ways.

We'll explore that on the [directives section](/directives#top).

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/directives#top">Directives</a>
  </span>
  <a href="/fragments#top">
    &uarr; Back to the top
  </a>
</nav>
