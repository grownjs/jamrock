<head>
  <title>Jamrock | Fragments</title>
</head>

# Fragments

Fragments are meant for client-side only, their purpose is extracting sections
of markup into functions that can be called several times.

They capture used locals to track its dependencies, the framework will use this
information to coordinate later updates.

> [!TIP]
> They can be target of requests made on the client,
> so the framework can execute only the requested parts and not the whole page!

## Markup containers

Fragments are declared within your components, i.e. client-side components are wrapped in fragments.

```html
<Example tag="p" />
```

In turn this could yield:

```html
<p data-component="pages/components/Example:1">...</p>
```

In comparison with a fragment:

```html
<fragment tag="ul" name="a-list">
  {#each data as item}
  <li>{item}</li>
  {/each}
</fragment>
```

That would yield:

```html
<ul data-fragment="a-list">
  ...
</ul>
```

The purpose of these sections is to make partial updates on the DOM,
instead of patching the whole page after every request.

> [!IMPORTANT]
> In the case of client-side components this makes sense, as we require a container to mount the actual component.
>
> But for fragments, the render loop occurs on the server so we use the fragment to
> identify the node to patch on the DOM back on the browser.

## Asynchronous updates

Other application of fragments is for rendering markup from dynamic state, like generators, promises or even large amounts of data.

> [!TIP]
> In example, we could have 100 items, render only the first 10 and the rest will be rendered after the page is served.
>
> To make this possible, we capture and accumulate the data as needed, and once the client connects through WebSockets we send the pending markup.
>
> This is enabled automatically by the framework if you wrap your loops or conditionales with fragments.

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/scripting#top">Scripting</a>
  </span>
  <a href="/#top">
    &uarr; Back to the top
  </a>
</nav>
