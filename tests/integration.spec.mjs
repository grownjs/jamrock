/* eslint-disable max-len */

import { test } from '@japa/runner';
import * as td from 'testdouble';

import {
  fixture, server, setup, reset,
} from './helpers/utils.mjs';

import { match } from '../src/handler/match.mjs';
import { routify } from '../src/handler/utils.mjs';
import * as sockets from '../src/handler/sockets.mjs';
import { middleware, controllers } from '../src/handler/main.mjs';

function tick(ms) {
  return new Promise(ok => setTimeout(ok, ms));
}

// eslint-disable-next-line no-unused-expressions
fixture`./client.svelte
  <script>
    export let value;
  </script>
  <style>
    div { color: red }
  </style>
  <div>Got: {value}</div>
  <slot />
`;

// eslint-disable-next-line no-unused-expressions
fixture`./svelte.html
  <script>
    import Client from './client';
    import Main from './main';
  </script>
  <Client value="42">
    <h1>It works.</h1>
  </Client>
  <Main>OSOM</Main>

  <div>
    <Main>
      1
      <section>
        <Client>
          2
          <fieldset>
            <Main>
              3
            </Main>
          </fieldset>
        </Client>
      </section>
    </Main>
  </div>
`;

// eslint-disable-next-line no-unused-expressions
fixture`./empty.html
  Just an {'empty'.toUpperCase()} component
`;

// eslint-disable-next-line no-unused-expressions
fixture`./loops.html
<script>
  let i = 0;
  async function *data() {
    for (;;) {
      yield i++;
      if (i > 150) break;
    }
  }
</script>
<fragment tag="ul" name="data" interval="5">
  {#each data as x}
    <li>{x}</li>
  {/each}
</fragment>
`;

// eslint-disable-next-line no-unused-expressions
fixture`./main.html
  <script context="client">
    import { onError, useRef, useState, useEffect } from 'jamrock';

    import Empty from './empty';

    export let message = 'Really?';
    export let answer = 'OSOM';
    export let markup = '';

    const [fun, check] = useState('FIXME');

    const ref = useRef();

    onError(e => {
      if (confirm('Are you OK?')) {
        check('Thank you!');
      } else {
        check(':(');
      }
    });

    useEffect(() => {
      if (fun === 'D:') throw new Error(fun);
      if (fun === '42') alert(ref.current.outerHTML);
    }, [fun]);

    if (markup.includes('HTML')) {
      markup += '!!';
    }

    function callme() {
      // may be
    }
  </script>

  <div>
    <slot name="before" />
    <button on:click="{() => check(prompt(message))}">insight</button>
    <button onclick="{() => check(answer)}">truth</button>
    <p {ref} onsomethingelse={callme}>Your answer: {fun}</p>
    <Empty />
    [<slot />:<slot name="after" />]
    {@raw ['h1', Object.fromEntries([['style', 'color:red']]), 'It works.']}
    {@html markup}
  </div>

  <style>
    button { color: red }
  </style>
`;

// eslint-disable-next-line no-unused-expressions
fixture`./app.html
  <script>
    console.info('It works.');
  </script>
  <head>
    <title>OSOM</title>
  </head>
  <h1 class:active>Hello World</h1>
  <script>
    import { someStuff, write, routes } from 'jamrock/conn';

    console.info(someStuff());

    const active = true;

    $: if (write) write('NOPE');

    export default {
      as: 'PageName',
      ['GET']: () => console.info('GET'),
      ['POST /']: () => console.info('POST'),
      ['PATCH /:id'] as namedRoute: () => console.info('PATCH'),
    };
  </script>
  {#if routes}
    <a href="{routes.namedRoute.url([['id', 123]])}">LINK</a>
  {/if}
`;

// eslint-disable-next-line no-unused-expressions
fixture`./pages/[slug]/+page.html
  <script>
    export default {
      ['GET /osom'] as OSOM: () => null,
    };
  </script>
  <p>Got: {slug}</p>
`;

test.group('integration only!', t => {
  let ctx;
  t.each.setup(() => {
    td.replace(console, 'info', td.func('logger'));
    td.replace(Math, 'random', td.func('random'));
    td.when(Math.random()).thenReturn(12.34);

    ctx = {
      conn: {
        someStuff: () => 42,
        current_module: 'app.html',
      },
      useRef: () => null,
      onError: () => null,
      useState: () => [],
      useEffect: () => null,
      registerComponent: (_, mod) => mod,
    };
  });
  t.each.teardown(() => {
    td.reset();
  });

  test('should translate filepaths into routes', ({ expect }) => {
    expect(routify('index.html')).toEqual('/');
    expect(routify('about/+page.html')).toEqual({ path: 'about', kind: 'page' });
    expect(routify('pages/[slug]/+error.html')).toEqual({ path: 'pages/:slug', kind: 'error' });
    expect(routify('github/[...path]/+layout.html')).toEqual({ path: 'github/*path', kind: 'layout' });
    expect(routify('github/(lang).[...path]/+layout.html')).toEqual({ path: 'github/:lang?/*path', kind: 'layout' });
    expect(routify('__use/__this/__organize/__routes/blog.[...entry]/+page.html')).toEqual({ path: 'blog/*entry', kind: 'page' });
  });

  test('should match routes through RegExp', ({ expect }) => {
    expect(match({ method: 'GET', request_path: '/foo/bar' }, '/foo/bar')).toEqual({ path: '/foo/bar', params: [] });
    expect(match({ method: 'GET', request_path: '/a/bar' }, '/:foo/bar')).toEqual({ path: '/:foo/bar', params: { foo: 'a' } });
    expect(match({ method: 'GET', request_path: '/es/sub/title' }, '/:lang?/*name')).toEqual({ path: '/:lang?/*name', params: { lang: 'es', name: 'sub/title' } });
  });

  test('should be able to invoke bundles', async ({ expect }) => {
    const render = await fixture.bundle('main.html');
    const markup = await render({
      slots: {
        default: [['fragment', { '@html': '<b>DUB</b>' }]],
        before: ['*'],
        after: ['NIX'],
      },
    });

    expect(markup).toContain('*<button data-location=generated/main.html:38:3 class=jam-xc8n1fu8>insight</button>');
    expect(markup).toContain('<button data-location=generated/main.html:39:3 class=jam-xc8n1fu8>truth</button>');
    expect(markup).toContain('<p data-location=generated/main.html:40:3>Your answer: FIXME</p>');

    expect(markup).toContain('<div data-location=generated/main.html:41:3 data-component=generated/empty.html>Just an EMPTY component');
    expect(markup).toContain('<h1 style=color:red>It works.</h1>');
    expect(markup).toContain('[<b>DUB</b>:NIX]');
  });

  test('should render .svelte components', async ({ expect }) => {
    let x = 0.123;
    // eslint-disable-next-line no-return-assign
    td.replace(Math, 'random', () => { return x += 0.001; });
    const markup = await fixture.partial('svelte.html', null, ctx);

    td.replace(Math, 'random', td.func());

    expect(markup).toContain('<div data-location=generated/svelte.html:5:1 data-component=generated/client.svelte>');
    expect(markup).toContain('<h1 data-location=generated/svelte.html:6:3>It works.</h1></div>');
    expect(markup).toContain('<div class="svelte-1njum0u">Got: 42</div>');
    expect(markup).toContain('<p data-location=generated/main.html:40:3 data-on:somethingelse=callme>Your answer: </p>');
    expect(markup).toContain('<div data-location=generated/main.html:41:3 data-component=generated/empty.html>Just an EMPTY component');

    expect(markup).not.toContain('[object AsyncFunction]');
    expect(markup).not.toContain('[object Function]');
    expect(markup).not.toContain('[object Promise]');
    expect(markup).not.toContain('[object Object]');

    expect(markup).toContain('1\n');
    expect(markup).toContain('2\n');
    expect(markup).toContain('3\n');
  });

  test('should be able to invoke modules', async ({ expect }) => {
    ctx.conn.routes = {
      namedRoute: { url: td.func('named') },
    };

    td.when(ctx.conn.routes.namedRoute.url([['id', 123]]))
      .thenReturn('/app/123');

    const markup = await fixture.partial('app.html', null, ctx);

    expect(td.explain(ctx.conn.routes.namedRoute.url).callCount).toEqual(1);

    expect(markup).toContain('<title>OSOM</title></head><body>');
    expect(markup).toContain('<h1 data-location=generated/app.html:7:1 class=active>Hello World</h1>');
    expect(markup).toContain('<a href=/app/123 data-location=generated/app.html:25:3>LINK</a>');
  });

  test('should be able to handle middleware calls', async ({ expect }) => {
    ctx.write = td.func('out');
    ctx.conn.someStuff = td.func('out');

    const func = td.func('middleware');

    await fixture.partial('app.html', null, ctx, func);

    expect(td.explain(func).callCount).toEqual(1);
    expect(td.explain(ctx.write).callCount).toEqual(11);
    expect(td.explain(console.info).callCount).toEqual(2);
    expect(td.explain(ctx.conn.someStuff).callCount).toEqual(1);

    let markup;
    const app = server(async conn => {
      markup = '';
      ctx.write = out => {
        conn.res.write(out);
        markup += out;
      };
      await fixture.partial('app.html', null, ctx, func);
      conn.res.end();
    });

    await app.request('/', (err, conn) => {
      conn.res.ok(err);
      expect(conn.res.body).toEqual(markup);
    });
  });

  test('should be able to handle route methods', async ({ expect }) => {
    const app = server(async conn => {
      ctx.cwd = 'generated';
      ctx.write = out => conn.res.write(out);

      if (conn.request_path) {
        if (conn.request_path.indexOf('/app') === 0) {
          await fixture.partial('app.html', null, ctx, middleware);
        }
      }
      conn.res.end();
    }, ctx);

    expect(td.explain(console.info).callCount).toEqual(0);

    await app.request('/', (err, conn) => {
      expect(td.explain(console.info).callCount).toEqual(0);
      expect(conn.req.method).toEqual('GET');
      expect(conn.req.url).toEqual('/');
      conn.res.ok(err, 200);
    });

    await app.request('/app', (err, conn) => {
      expect(td.explain(console.info).callCount).toEqual(3);
      expect(conn.req.method).toEqual('GET');
      expect(conn.req.url).toEqual('/app');
      conn.res.ok(err);
    });

    await app.request('POST /app', (err, conn) => {
      expect(td.explain(console.info).callCount).toEqual(6);
      expect(conn.req.method).toEqual('POST');
      expect(conn.req.url).toEqual('/app');
      conn.res.ok(err);
    });

    await app.request('DELETE', '/app', (err, conn) => {
      expect(td.explain(console.info).callCount).toEqual(8);
      expect(conn.req.method).toEqual('DELETE');
      expect(conn.req.url).toEqual('/app');
      expect(conn.res.body).toContain('<pre>Error: Route');
      conn.res.ok(err, "Route 'DELETE /' not found in app.html", 404);
    });
  });

  test('should be able to handle socket calls', async ({ expect }) => {
    const socket = {
      on: td.func('subscriber'),
      emit: td.func('emitter'),
      send: td.func('sender'),
      fail: console.debug,
    };

    const app = server(async conn => {
      ctx.cwd = 'generated';
      ctx.write = out => conn.res.write(out);

      setTimeout(() => {
        ctx.socket = socket;
      }, 100);

      if (conn.path_info.length > 0) {
        ctx.conn.current_module = `${conn.path_info.join('/')}.html`;
        await fixture.partial(ctx.conn.current_module, null, ctx, middleware);
        await tick(150);
      }
      conn.res.end();
    }, ctx);

    const ev = [];
    const wss = app.sockets();
    const client = wss.connect();

    let _ws;
    let closed = 0;
    app.on('open', ws => {
      _ws = ws;
      ws.on('message', x => ev.push(['IN', x]));
      client.on('disconnect', () => closed++);
      client.on('message', x => ev.push(['OUT', x.data]));
      client.on('callback', (...args) => ev.push(['CALL', ...args]));
    });

    sockets.setup(app, null, 100);

    await app.request('GET /loops', (err, conn) => {
      conn.res.ok(err);

      expect(conn.res.body.split('<li data-location=generated/loops.html:').length).toEqual(101);
      expect(conn.res.body).toContain('<ul data-location=generated/loops.html:10:1 data-fragment=data.0 data-interval=5>');
    });

    ctx.streams['generated/loops.html']['data.0'].cancel();
    client.send('rpc:trigger');
    await tick(200);

    app.emit('close', _ws);
    wss.stop();

    expect(ev).toEqual([
      ['IN', 'rpc:trigger'],
      ['CALL', 'trigger', [], ''],
      ['OUT', 'keep'],
    ]);

    const { callCount, calls } = td.explain(socket.send);

    expect(closed).toEqual(1);
    expect(callCount).toBeGreaterThanOrEqual(5);
    expect(calls[0].args[0]).toContain('generated/loops.html data.0');
  });

  test('should be able to handle page routing', async ({ expect }) => {
    setup();

    ctx.cwd = `${process.cwd()}/generated`;

    const pages = await controllers(ctx.cwd, 'pages/**/*.html');

    expect(pages[0].src).toEqual(pages.getPagesSlug.src);
    expect(pages[1].src).toEqual(pages.OSOM.src);
    expect(pages.getPagesSlug.path).toEqual('/:slug');
    expect(pages.getPagesSlug.fullpath).toEqual('/pages/:slug');
    expect(pages.OSOM.fullpath).toEqual('/pages/osom');

    reset();

    const app = server(async conn => {
      ctx.write = out => conn.res.write(out);

      if (conn.request_path) {
        let found;
        pages.some(route => {
          const matches = match(conn, route.fullpath);
          if (matches) found = { ...route, matches };
          return matches;
        });

        if (found) {
          ctx.called = true;
          ctx.conn.req.params = found.matches.params;

          await fixture.partial(found.src.replace(ctx.cwd, '').substr(1), ctx.conn.req.params, ctx, middleware);
        }
      }
      conn.res.end();
    }, ctx);

    await app.request('GET', '/pages/example', (err, conn) => {
      expect(conn.res.body).toContain('Got: example');
      conn.res.ok(err);
    });
  });

  test('should extract routes from sources', async ({ expect }) => {
    setup();

    const routes = await controllers(`${process.cwd()}/generated`, '*.html');

    reset();

    expect(routes.map(x => `${x.verb} ${x.fullpath}`)).toEqual([
      'GET /app',
      'POST /app',
      'PATCH /app/:id',
      'GET /empty',
      'GET /loops',
      'GET /main',
      'GET /svelte',
    ]);

    expect(Object.isFrozen(routes)).toBeTruthy();
    expect(routes.getApp).not.toBeUndefined();
    expect(routes.postApp).not.toBeUndefined();

    expect(routes[0].url).toBeInstanceOf(Function);
    expect(routes[0].fullpath).toEqual('/app');
    expect(routes.namedRoute.url).toBeInstanceOf(Function);
    expect(routes.namedRoute.fullpath).toEqual('/app/:id');
    expect(routes.namedRoute.url({ id: 123 })).toEqual('/app/123');
    expect(routes.namedRoute.src).toContain(`${process.cwd()}/generated/app.`);
  });
});
