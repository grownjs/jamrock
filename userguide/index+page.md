<head>
  <title>Jamrock | Server-first web framework</title>
</head>

<section class="hero-words">
  <p class="tagline">Server-first.<br />Fragment-driven.<br /><span class="tagline-accent">No SPA required.</span></p>
  <p class="hero-sub">Write HTML components that run on the server. Add interactivity exactly where you need it — with fragments, signals, or server functions. Nothing more.</p>
</section>

<div class="layer layer-server">
<div class="layer-marker layer-marker-server">01</div>
<h3>Server Render</h3>
<p>Components run on the server. Request data, session, params — all available at render time. Full HTML shipped, zero JS by default.</p>
</div>

```html
<script>
  import { params } from 'jamrock:conn';
  const { name } = params;
</script>

<h1>Hello, {name}!</h1>
```

<div class="layer layer-fragment">
<div class="layer-marker layer-marker-fragment">02</div>
<h3>Fragments</h3>
<p>Named regions of the page that can be updated live via SSE — without a full reload, without a client router, without any boilerplate.</p>
</div>

```html
<fragment name="feed" interval="5">
  {#each posts as post}
    <article>{post.title}</article>
  {/each}
</fragment>
```

<div class="layer layer-client">
<div class="layer-marker layer-marker-client">03</div>
<h3>Client Signals</h3>
<p>When you genuinely need client reactivity, reach for signals. Declare them in a client script, reference them with <code>$</code> in templates.</p>
</div>

```html
<script context="client">
  import { signal } from 'jamrock';
  const count = signal(0);
</script>

<button onclick={() => $count++}>
  Clicked {$count} times
</button>
```

---

<section class="quickstart">
<h2>Try it now</h2>
<p>Install <strong>jamrock</strong> and pick a runtime — <code>node</code>, <code>deno</code>, or <code>bun</code>:</p>
</section>

```shell
curl -L get.jamrock.dev | bash
```

<p>Then scaffold your first app:</p>

```shell
jamrock init my-app
cd my-app && npm install
npm run dev
```

<p class="install-out"><span class="out-dim">■</span> <strong>Jamrock v0.0.0</strong> <span class="out-dim">(node v23)</span><br />
  <span class="out-dim">Processing</span> ./pages <span class="out-dim">→</span> ./build<br />
  <span class="out-dim">Listening on</span> <a href="http://localhost:8080" target="_blank">http://localhost:8080</a>
</p>

---

<nav class="home-nav flex between centered">
  <p class="out-dim"><em>&mdash; it ain't much, but it's honest work.</em></p>
  <a href="/introduction#top" class="home-cta">Read the docs &rarr;</a>
</nav>
