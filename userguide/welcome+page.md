<head>
  <title>Jamrock | The herbsman's web framework</title>
</head>

**Jamrock** is a framework for authoring web pages.

It runs everything on the server and keep JavaScript usage on the browser low.

_&mdash; it ain't much but it's honest work!_ 💣

## Give it a try!!

Install **jamrock** in your `$HOME`:

```
<b>curl</b> -L get.jamrock.dev | <b>bash</b>
```

The installer will ask you for a runtime: `node`, `deno` or `bun`.

Let's try `node` and create a sample application:

```
<b>jamrock</b> init my-app
<b>cd</b> my-app
<b>npm</b> install
<b>npm</b> run dev
```

You should get something like this:

```
<b>■ Jamrock v0.0.0</b> (node v23.6.0)
Processing ./pages to ./build
Listening on <a href="http://localhost:8080" target="_blank">http://localhost:8080</a>
```

Open that URL in your browser and explore.

<blockquote>
  <p class="gap-sm flex centered">
    <svg src="./images/beaker.svg" size="16" />
    <span>See the <a href="/#top">available documentation here!</a></span>
  </p>
</blockquote>
