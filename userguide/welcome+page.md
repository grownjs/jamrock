<head>
  <title>Jamrock | The herbsman's web framework</title>
</head>

**Jamrock** is a framework for making web pages,

1. It compiles your `.html` files into something that can be called pages and components.
2. The server will execute them against the request and responds with plain old HTML.
3. That's it, like it used to be.

## Sounds familiar? Give it a try!

Install **jamrock** in your `$HOME`:

```
<b>curl</b> -L get.jamrock.dev | <b>bash</b>
```

And create a sample application:

```
<b>jamrock</b> init my-app
<b>cd</b> my-app
<b>npm</b> install
<b>bin/node</b> dev
```

You should get something like this:

```
<b>■ Jamrock v0.0.0</b> (node v23.6.0)
Processing ./pages to ./build
Listening on <a href="http://localhost:8080" target="_blank">http://localhost:8080</a>
```

Open that URL in your browser and explore!

<blockquote>
  <p class="gap-sm flex centered">
    <svg src="./images/beaker.svg" size="16" />
    <span>Continue reading the <a href="/">available documentation</a>.</span>
  </p>
</blockquote>
