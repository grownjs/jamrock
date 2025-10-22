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

## Templating

We've been using stuff like `&lbrace;...}`, `&lbrace;@render ...}` and `&lbrace;#snippet ...}`,
they are template-tags or expressions.

They just render any given values on specific ways,
enabling you to compose using logical expressions, loops and so on.

Let's explore all the available tags:

### &lbrace;...}

They can render simple values or basic JavaScript expressions.

> [!CAUTION]
> Try to keep things simple, we don't support fully featured JavaScript expressions to abuse from!

### &lbrace;#snippet ...}

Declare reusable chunks of markup in your components.

They can appear at component root to behave as fallbacks if they're not given as props, i.e.

```html
<script>
  export let sample;
</script>

{#snippet sample(value)}
  Got: {value}
{/snippet}

<div>{@render sample(42)}</div>
```

> [!NOTE]
> Snippets are values, so they can be passed down as arguments
> that you can pass again or render, etc.

### &lbrace;@render ...}

Will take any expression to produce markup.

> [!TIP]
> It's encouraged to call these expressions with `?.()`
> to avoid unexpected exceptions if you don't control them.

### &lbrace;#if ...}

It'll render the underlying block if the expressions is truthy, i.e.

```html
{#if true}
  42
{/if}
```

> [!CAUTION]
> As any other expression given, keep it simple for now!

### &lbrace;:else ...}

You can use `&lbrace;:else}` or `&lbrace;:else if ...}` blocks
to render as fallbacks from their previous condition.

> [!TIP]
> These tags are not limited to if's,
> they can be used to declare fallbacks
> from `&lbrace;#each ...}` blocks, see below.

### &lbrace;#each ...}

Allows to iterate values within the template,
it can take arrays, generators, promises, etc.

Almost anything that can produce an iterator, e.g.

```html
<script>
  const empty = Promise.resolve([]);
  const numbers = [1, 2, 3];
  function *values() {
    yield 1;
    yield 2;
    yield 3;
  }
</script>

{#each empty as _}
  Not empty
{:else}
  Empty
{/each}

{#each numbers as num}
  {num}
{/each}

{#each values as val}
  {val}
{/each}
```

> [!NOTE]
> These iterators are limited by time and length, so they'll be stopped once
> a given limit or maximum execution time is reached.
>
> Any value after is discarded [unless you have a fragment](./fragments#top) around,
> but that'll be explored on the next section!

### &lbrace;@raw ...}

These expressions will be inlined as is on the compiled code,
be wise and careful if you don't know what to do.

### &lbrace;@html ...}

This will render any given string as HTML.

> [!CAUTION]
> Its contents is not processed, so it'll be rendered as is.

### &lbrace;@debug ...}

It'll print out the `JSON.stringify(&lbrace; ... })` result from any given argument,
variables are just treated as object fields.

> [!WARNING]
> This will not support expressions, just variable names.

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/fragments#top">Fragments</a>
  </span>
  <a href="/components#top">
    &uarr; Back to the top
  </a>
</nav>
