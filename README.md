<img src="https://github.com/grownjs/jamrock-guide/raw/master/docs/images/jamrock.svg" alt="Jamrock" width="200" height="50">

> WIP: development in progress, stuff may change.

[![Build Status](https://github.com/grownjs/jamrock/workflows/build/badge.svg)](https://github.com/grownjs/jamrock/actions)
[![codecov](https://codecov.io/gh/grownjs/jamrock/branch/master/graph/badge.svg)](https://codecov.io/gh/grownjs/jamrock)
[![NPM version](https://badge.fury.io/js/jamrock.svg)](http://badge.fury.io/js/jamrock)


# What is jamrock?

views, data (send fast, resume later), ws/sse vs xhr calls?

## RUN:

```bash
node jam
bun run jam
deno run jam
```

## LIVE PLAYGROUND

we should be able to generate the static files includes all the fixtures and explanations,
fine if they go as chapters, tutorials, etc. but the main question is, how to?

using just mortero works, as for other static sites...

- [x] syntax-highlighting
- [x] sources/includes
- [x] pug/markdown
- [x] fn-helpers
- [x] entries

what else we'll need?

# TODO (client-side runtime is imminent!!)

- [ ] runtime (nodejs, deno, bun)
  - [ ] client-side
    - [ ] client components
      - [ ] built-in runtime
    - [ ] svelte components
      - [ ] hydrate?

- [ ] triggers and ws bindings? (aka server-calls? OR ?/actions)

- [ ] nested-components are not working on first-run!! (see uploads),
      ^ seems like relative paths are always taken from the entry-file and
        not from the resolved ancestor... e.g. components/debugger imports
        ./tabs but it tries to resolve against upload+page and not through components/debugger!

- [ ] consider id registerComponent and friends are still applicable,
      ^ seems so... at least testing use them, so client shall too...

still applicable? may be just for nodejs...
- [ ] watcher/compiler
  - [x] compiler works on nodejs/deno/bun
  - [x] watcher not planned yet... kinda works!

ESM LEXER?

```js
// https://github.com/guybedford/es-module-lexer
// FIXME: this would help to replace rewrite imports/exports ?
import { parse } from 'es-module-lexer/js';
async function main() {
  try {
    const t = await parse('import {x} from "y"; export const foo = 42');
    console.log(t);
  } catch (e) {
    console.log(e);
  }
}
main();
```

## Server handler

The entry point to your application is the web-server, you need to save this **server.js** file in the root of your project, or within a folder, if so ensure you set the appropriate `--cwd` to resolve the application files.

```js
const server = require('jamrock/server');

module.exports = server.init();
```

If you like, you can rename this file, just use `--app` to properly resolve from there.

> Checkout the complete [user guide](//docs.jamrock.dev) to learn more.

## Page components

Write a **pages/index.html** file to start working on some stuff:

```html
<script>
  import { session, put_session } from 'jamrock:conn';

  export let value = session.name || 'world';

  $: name = value.toUpperCase();
  $: put_session('name', value);
</script>

<p>Hello, {name}.</p>
<input bind:value />
```

When you start the server as described below you'll be able to see this page rendered in your browser.

> Checkout the complete [user guide](//docs.jamrock.dev) to learn more.

## Configuring your scripts

Declare some `scripts` in your **package.json** file to enable them as shortcuts:

```json
{
  "scripts": {
    "start": "jamrock server up",
    "watch": "jamrock server up -rw --no-redis --",
    "dist": "jamrock dist pages --"
  },
  "dependencies": {
    "jamrock": "github:grownjs/jamrock#master"
  }
}
```

1. Using `npm run watch` will suffice to start working with the framework, the `-rw` flags enable the reload/watch modes respectively, `--no-redis` will disable Redis as needed. This is particulary useful for local development, or testing.

The `npm start` script will start the Jamrock server ready for production usage.

2. However, prior this you would like to compile the required assets for your application (if any), so `npm run dist` is used to accomplish the task. This is also true if you're running under CI or you're preparing the files for release.

The built-in bundler shall handle your styles and scripts, images or svg sprites. Even works for static pages, it ain't much, but it's honest work.

After math, you'll have two main **jamrock** tasks: `server` and `dist`.

> Checkout the complete [user guide](//docs.jamrock.dev) to learn more.

## Bundler and watch-modes

Other tooling should enable watching both tasks, while you edit the server pages, the bundler will watch for changes too, you know.

For this, a `Makefile` will enable `make dev` to get both tasks running in parallel:

```make
dev:
  @npm run dist --watch & npm run watch
```

Alternatively, you can use **make** to enable a more powerful set of custom tasks:

```make
dev:
  @make -s watch

dist: deps
  @npm run dist $(DIST_FLAGS)

watch: deps
  @make -s dist DIST_FLAGS="--watch" & make -s watch-app

watch-app: deps
  @npm run watch

deps:
  @(((ls node_modules | grep .) > /dev/null 2>&1) || npm i) || true
```

This configuration is very extensible, as bonus, you might notice how the `deps` target will check and install packages if `node_modules` is empty or missing.

> Checkout the complete [user guide](//docs.jamrock.dev) to learn more.

## Command Line

```bash
$ npm i -g jamrock # OR `yarn global add jamrock`
```

Run `jamrock` without arguments or with `--help` to display usage info.

> Alternatively, you can use **jam** or **rock** as aliases for **jamrock** 🔥.

#### Available options

- &nbsp; &nbsp; &nbsp; &nbsp; `--cwd` &mdash; Override the sources directory (default: `pages`)
- `-e, --env` &mdash; Override the NODE_ENV value (default: `development`)
- `-a, --app` &mdash; Override the application's entry file (default: `server`)
- `-U, --uws` &mdash; Enable uWebsocket.js instead of the http(s) module

- &nbsp; &nbsp; &nbsp; &nbsp; `--proxy` &mdash; Enable if you got a 'Parse error' behind a proxy (bad-headers)
- &nbsp; &nbsp; &nbsp; &nbsp; `--no-auth` &mdash; Disable the `/auth` endpoint for built-in passport integrations
- &nbsp; &nbsp; &nbsp; &nbsp; `--no-redis` &mdash; Disable redis for caching, use built-in memory instead
- &nbsp; &nbsp; &nbsp; &nbsp; `--no-inline` &mdash; Disable script injection for generated client-code

- `-D, --dest` &mdash; Set the output directory
- `-p, --port` &mdash; Set the port for the web-server
- `-h, --host` &mdash; Set the hostname for the web-server
- `-s, --serve` &mdash; Public folders to serve (default: public)
- `-u, --upload` &mdash; Save uploaded files here (default: /tmp)

- `-l, --lint` &mdash; Run ESLint over all sources
- `-q, --quiet` &mdash; Hide most logging output
- `-d, --debug` &mdash; Enable sourceMaps
- `-r, --reload` &mdash; Reset module if changed
- `-V, --verbose` &mdash; Enable additional logs

- `-y, --only` &mdash; Filter out matching files
- `-w, --watch` &mdash; Enable live-server watching
- `-c, --chdir` &mdash; Changes the current working directory
- `-f, --files` &mdash; Directory where uploaded files are saved

Set `NODE_ENV=production` to enable minification of all outputs.

> Checkout the complete [user guide](//docs.jamrock.dev) to learn more.
