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
<fragment name="x" limit="10" timeout="200" interval="50">
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

> [!WARNING]
> Options are applied on any `&lbrace;#each ...}` found within the fragment,
> try to use one iterator per fragment for simplicity.

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/scripting#top">Scripting</a>
  </span>
  <a href="/#top">
    &uarr; Back to the top
  </a>
</nav>
