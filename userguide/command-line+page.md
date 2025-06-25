<head>
  <title>Jamrock | Command Line</title>
</head>

**Jamrock** gets installed on `/usr/local/bin/jamrock` for regular use.

Additional arguments like `FOO=bar` will expand the `process.env` object,
e.g. `jamrock build NODE_ENV=production PORT-80`

> [!TIP]
> You may also use `./bin/&lbrace;node,deno,bun}` if you have the required runtime installed.

## Usage details

Without arguments, the executable will yield something like this:

```text
■ Jamrock v0.0.0 (node v22.4.0, HEAD)

Usage: ./bin/{node,deno,bun} &lt;COMMAND&gt; [OPTIONS]

  serve  Starts the web-server on the given --port and --host
  build  Compiles *.{md,html} sources into page components
  route  Prints the available routes found

Options:

  --src      Directory of *.{md,html} files to compile (default is ./src)
  --dest     Destination for compiled files (default is ./dest)
  --watch    Enable file-watching on the web-server

  --port     The port number to bind the web-server
  --host     The host address to bind the web-server

  --uws      Use uWebSockets.js instead of native HTTP (node)
  --redis    Enable redis for sessions and pub/sub events
  --unocss   Enable stylesheet pre-compilation with UnoCSS

  --dts      Produce the .d.ts definitions from web-server routes
  --name     Filter routes by name (contains)
  --path     Filter routes by path (contains)
  --method   Filter routes by method (exact match)
```

> [!WARNING]
> We don't support TypeScript yet, but you should be able to write your own `.ts` modules
> and consume the generated definitions from your routes.
>
> As long as you compile your `.ts` modules and they become reachable by `import` calls
> on runtime, the framework would work fine.

## Development

Run `jamrock server --watch` to start watching from the `./pages` directory.

You can have other stuff on this folder but it will be ignored, only `.md` and `.html` files and their dependencies are watched.

> [!IMPORTANT]
> The command above will not fail even if the directory does not exists,
> the watcher will work as you start adding files.
>
> Use `jamrock dev` as shortcut for this task.

## Production

Run `jamrock serve` and that's it!

Just make sure you have built your pages first.

> [!TIP]
> Redis is encouraged for production, since the sessions and pub/sub support is
> stored in memory by default, which is intended for development only.
>
> If you want to use UnoCSS make sure you have the appropriate `unocss.config.mjs`
> module on the `./pages` directory, stylesheets will be calculated from the
> used classes by rendered components on every request.

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/components">Components</a>
  </span>
  <a href="javascript:document.body.scrollTop=0">
    &uarr; Back to the top
  </a>
</nav>
