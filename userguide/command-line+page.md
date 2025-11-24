<head>
  <title>Jamrock | Command Line</title>
</head>

# Command Line

Ensure you've installed **jamrock**:

```
<b>curl</b> -L get.jamrock.dev | <b>bash</b>
...
<b>jamrock</b> --version
■ Jamrock v0.0.0 (node v23.6.0, HEAD)
```

> [!WARNING]
> **Jamrock** installs at your `$HOME/.local/bin` for global usage.

Additional arguments like `FOO=bar` will expand the `process.env` object,
e.g. `jamrock build NODE_ENV=production PORT=80`

> [!TIP]
> You can also use `./bin/&lbrace;node,deno,bun}` if you have the required runtime installed.
>
> The installation script will ask you for a runtime for global usage only!

## Usage details

Run `jamrock --help`:

```
<b>■ Jamrock v0.0.0</b> (node v22.4.0, HEAD)

<span>Usage:</span> ./bin/{node,deno,bun} <b>&lt;COMMAND&gt;</b> <var>[OPTIONS]</var>

  <b>init</b>   Generates a new application into the given directory
  <b>serve</b>  Starts the web-server on the given <var>--port</var> and <var>--host</var>
  <b>build</b>  Compiles *.{md,html} sources into server-components
  <b>write</b>  SSG from pre-built sources <em>(use after build)</em>
  <b>route</b>  Prints the available routes found

<span>Options:</span>

  <var>--src</var>      Directory of *.{md,html} files to compile <em>(default is ./src)</em>
  <var>--dest</var>     Destination for compiled files <em>(default is ./dest)</em>
  <var>--watch</var>    Enable file-watching on the web-server
  <var>--prefix</var>   Prefix for bundled resources
  <var>--target</var>   Value for &lt;base href="..." /&gt; (default is /)

  <var>--port</var>     The port number to bind the web-server
  <var>--host</var>     The host address to bind the web-server

  <var>--uws</var>      Use uWebSockets.js instead of native HTTP <em>(node)</em>
  <var>--https</var>    Enable HTTPS (requires SSL_KEY_FILE and SSL_KEY_FILE)

  <var>--dts</var>      Produce the .d.ts definitions from web-server routes
  <var>--name</var>     Filter routes by name <em>(contains)</em>
  <var>--path</var>     Filter routes by path <em>(contains)</em>
  <var>--method</var>   Filter routes by method <em>(exact match)</em>
```

### <b>init</b>

This action create a new project into the target directory, e.g.

```
<b>jamrock</b> init my-app
```

> [!WARNING]
> If the directory already exists you'll be warned, but you can <var>--force</var>
> to overwrite everything in the target directory.

### <b>serve</b>

Spins up a web-server with optional live-reload support, intended for production and development.

> [!TIP]
> Use `--watch` to enable the development mode, `--src` and `--dest`
> to configure the source and destination folders respectively.

### <b>build</b>

Compiles everything down as modules, intended for production.

> [!IMPORTANT]
> Use the `--prefix` to setup a different path for loading ESM from sources,
> e.g. `/@/path/to/component.html` (the default is `@`)

### <b>write</b>

Execute all compiled sources to produce static pages.

> [!CAUTION]
> This removes dynamic client-side JavaScript usage, only compiled
> components that can be downloaded without server dependencies may work.

### <b>route</b>

This action will show the declared routes from pages and middleware found in the sources.

> [!TIP]
> You can filter out the matching routes with the
> <var>--name</var>, <var>--path</var> and <var>--method</var> flags respectively.

By using the <var>--dts</var> flag, this action will write a `routes.d.ts` file.

> [!NOTE]
> We don't support TypeScript yet, but you should be able to write your own `.ts` modules
> and consume the generated modules from your code on a separate process.
>
> As long as you compile your `.ts` modules and they become reachable by `import` calls
> on runtime, the framework would work fine.

Being said, you may find a proof of concept of this is on the `./scripts/check.ts` file on [this repository](https://github.com/grownjs/jamrock/blob/master/scripts/check.ts).

---

## dev.config.mjs

Some options can be configured through a module file,
this is because they would need you to load additional modules.

### redis

Redis is encouraged for production, since the sessions and pub/sub support is
stored in memory by default, which is intended for development only.

```js
// enables the built-in support for Redis
export default {
  redis: true,
};

// enables and configure the Redis connection
export default {
  redis: {
    url: '...',
  },
};
```

### unocss

If you want to use UnoCSS make sure you have the appropriate `unocss.config.mjs`
module on the `./pages` directory, stylesheets will be calculated from the
used classes by rendered components on every request.

```js
// enables the built-in support for UnoCSS
export default {
  unocss: true,
};
```

### markdown

Specific options for markdown are set here,
for now you can enable `emojify` and `twemoji` only.

```js
// enable emoji shortcuts and inlining as images
export default {
  markdown: {
    emojify: true,
    twemoji: true,
  },
};
```

### generators

```js
// configure support for preprocessors
export default {
  less: await import(typeof Deno !== 'undefined'
    ? 'npm:less'
    : 'less'),
};
```

> [!TIP]
> The `typeof Deno` is a dirty-check for making the configuration cross-runtime,
> otherwise it may not work as expected. Bun and NodeJS are pretty OK without the `npm:` prefix.

---

## Development

Run `jamrock server --watch` to start watching from the `./pages` directory.

You can have other stuff on this folder but it will be ignored, only `.md` and `.html` files and their dependencies are watched.

> [!IMPORTANT]
> The command above will not fail even if the directory does not exists,
> the watcher will work as you start adding files.
>
> Use `jamrock dev` as shortcut for this task.

---

## Production

Run `jamrock serve` and that's it!

> [!CAUTION]
> Just make sure you have built your pages first.

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/components#top">Components</a>
  </span>
  <a href="/command-line#top">
    &uarr; Back to the top
  </a>
</nav>
