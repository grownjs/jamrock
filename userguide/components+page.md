<head>
  <title>Jamrock | Components</title>
</head>

# Components

We have three types of components:

1. Dynamic server-side or page components
2. Client-side components with some functionality
3. Static components with some functionality or markup

Server-side components will have a `&lt;script&gt;` tag without context,
or `&lt;script context="module"&gt;` for module-level functionality.

Client-side components will have a `&lt;script context="client"&gt;`

> [!IMPORTANT]
> Static components may not contain script tags,
> but can access their props through the `$$props` variable.
>
> We explore [other kind of scripts](./scripts) later,
> for now we'll focus on static or dynamic components with or without context.

## File-naming

Any `.&lbrace;md,html}` file within the `./pages` directory is a component,
if the filename ends on `+page`, `+error` or `+layout` then it will
be used to declare and decorate your application routes.

You can also place `+server.mjs` files aside your components,
they'll also decorate your routes with additional middleware definitions,
handlers and actions.

> [!NOTE]
> This results in a tree of all your declared routes with their nearest layout,
> error and middleware modules found.
>
> We save this information with your compiled files for later usage
> in a `index.json` file, i.e. `jamrock route` use this file.

## Composition

To use other components to _compose_ the UI you need to import them.

```html
<script>
  import Hello from './components/hello.html';
</script>

<Hello>World</Hello>
```

> [!WARNING]
> You can't import components in your own modules
> as they are resolved at compile time.
>
> Also, importing page-components from other pages is disallowed.

### Content

Use the `children` prop to render any given content.

```html
<script>
  export let children;
</script>

<div>Hello {@render children?.()}</div>
```

The result from above would be `&lt;div&gt;Hello World&lt;/div&gt;`.

### Props

Top-level `export` declarations are the props, e.g.

```html
<script>
  export let test;
  export let value;
</script>

Got: {test} ({typeof value} {value})
```

> [!TIP]
> Using `let` helps to omit initial values,
> while `const` will enforce you otherwise,
> however the former is preferred.

Now your component can be used this way:

```html
<Example test="OSOM" value={42} />
```

It would yield: `Got: OSOM (number 42)`

> [!CAUTION]
> Passing props between server-side components is granted for any type (almost!),
> but when you pass props to client-side components they should be serializable values.

In the case of static components without a `&lt;script&gt;` tag you should use `$$props.thing` syntax to access any given prop.

## Snippets

You can declare snippets for your components this way:

```html
<Example>
  {#snippet other()}...{/snippet}
</Example>
```

And then, render them as markup:

```html
<div>Got: {@render $$props.other?.()}</div>
```

So snippets is the way to pass chunks of markup as props.

> [!IMPORTANT]
> Here we're using `$$props` as a shortcut,
> but you can use `export let other;` if you prefer.
>
> Component is treated as static as it does not
> have an initialization script block.
>
> Snippets are compiled as functions,
> try playing around with some arguments!

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/templating#top">Templating</a>
  </span>
  <a href="/components#top">
    &uarr; Back to the top
  </a>
</nav>
