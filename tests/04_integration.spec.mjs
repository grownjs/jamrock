/* eslint-disable max-len */

import { test } from '@japa/runner';
import * as td from 'testdouble';

import {
  fixture, server, setup, reset,
} from './helpers/utils.mjs';

import { Template } from '../src/templ/main.mjs';
import { match } from '../src/handler/match.mjs';
import { middleware, controllers } from '../src/handler/main.mjs';

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
fixture`./svelte+layout.html
  <main>
    <slot />
  </main>
`;

// eslint-disable-next-line no-unused-expressions
fixture`./some+error.html
  <script>
    export let failure;
  </script>
  <h2>Error {failure.status}</h2>
  <p>{failure.reason}</p>
  <small>&mdash; {failure.source}</small>
`;

// eslint-disable-next-line no-unused-expressions
fixture`./svelte+page.html
  <script>
    import Client from './client.svelte';
    import Main from './main.html';
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
fixture`./hooks+page.html
  <script>
    function test({ props }) {
      console.log('IT WORKS!', props);
    }
    function doStuff() {
      return node => {
        console.log(node, location.href);
      };
    }
  </script>
  <button use:test>FOO</button>
  <button use:doStuff>BAR</button>
`;

// eslint-disable-next-line no-unused-expressions
fixture`./loops+page.html
<script>
  let i = 0;
  async function *data() {
    for (;;) {
      yield i++;
      if (i > 150) break;
    }
  }
</script>
<fragment tag="ul" name="test" interval="5">
  {#each data as x}
    <li>{x}</li>
  {/each}
</fragment>
`;

// eslint-disable-next-line no-unused-expressions
fixture`./main.html
  <script context="client">
    import { onError, useRef, useState, useEffect } from 'jamrock';

    import Empty from './empty.html';

    export let message = 'Really?';
    export let answer = 'OSOM';
    export let markup = '';

    const [fun, check] = useState('FIXME');
    const [html, update] = useState(markup);

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
      console.log('HTML', update(markup = '<em>OSOM</em>'));
    }
    function fixme() {
      console.log('ANSWER?', answer);
      check(answer);
    }
  </script>

  <div>
    <slot name="before" />
    <button on:click="{() => check(prompt(message))}">insight</button>
    <button onclick="{fixme}">truth</button>
    <p {ref} onsomethingelse={callme}>Your answer: {fun}</p>
    <Empty />
    [<slot />:<slot name="after" />]
    {@html ['h1', Object.fromEntries([['style', 'color:red']]), 'It works.']}
    {@html html}
  </div>

  <style>
    button { color: red }
  </style>
`;

// eslint-disable-next-line no-unused-expressions
fixture`./app+page.html
  <script>
    console.info('It works.');
  </script>
  <head>
    <title>OSOM</title>
  </head>
  <h1 class:active>Hello World</h1>
  <script>
    import { someStuff, write, routes } from 'jamrock:conn';

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
    export let slug;
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
        unsafe: () => null,
        someStuff: () => 42,
        current_path: '/app',
        current_module: 'app+page.html',
      },
      route: {
        layout: null,
        error: null,
      },
      uuid: 'jam',
      useRef: () => null,
      onError: () => null,
      useState: () => [],
      useEffect: () => null,
      registerComponent: mod => mod,
    };
  });
  t.each.teardown(() => {
    process.debug = 0;
    td.reset();
  });

  test('should extract routes from sources', ({ expect }) => {
    setup();

    const cwd = process.cwd();
    const files = Template.glob(`${cwd}/generated/**/*.html`);
    const routes = controllers(`${cwd}/generated`, files);

    reset();

    expect(routes.map(x => `${x.verb} ${x.path}`)).toEqual([
      'GET /pages/:slug/osom',
      'GET /pages/:slug',
      'GET /svelte',
      'GET /hooks',
      'GET /loops',
      'PATCH /app/:id',
      'GET /app',
      'POST /app',
      'GET /app',
    ]);

    expect(Object.isFrozen(routes)).toBeTruthy();
    expect(routes.PageName).not.toBeUndefined();
    expect(routes.postApp).not.toBeUndefined();

    expect(routes[0].url).toBeInstanceOf(Function);
    expect(routes.namedRoute.url).toBeInstanceOf(Function);
    expect(routes.namedRoute.path).toEqual('/app/:id');
    expect(routes.namedRoute.url({ id: 123 })).toEqual('/app/123');
    expect(routes.namedRoute.src).toEqual(`${cwd}/generated/app+page.html`);

    expect(routes.getSveltePage.error).toEqual(null);
    expect(routes.getSveltePage.layout).toEqual(`${cwd}/generated/svelte+layout.html`);
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

    expect(markup).toContain('*<button data-location="generated/main.html:43:3" class="jam-x1704ny8">insight</button>');
    expect(markup).toContain('<button data-location="generated/main.html:44:3" class="jam-x1704ny8">truth</button>');
    expect(markup).toContain('<p data-location="generated/main.html:45:3">Your answer: FIXME</p>');

    expect(markup).toContain('<h1 style="color:red">It works.</h1>');
    expect(markup).toContain('</p>Just an EMPTY component');
    expect(markup).toContain('[<b>DUB</b>:NIX]');
  });

  test('should render .svelte components', async ({ expect }) => {
    const markup = await fixture.partial('svelte+page.html', null, ctx);

    expect(markup).toContain('<div data-location="generated/svelte+page.html:5:1" data-component="generated/client.svelte:2">');
    expect(markup).toContain('<h1 data-location="generated/svelte+page.html:6:3">It works.</h1></div>');
    expect(markup).toContain('<div class="svelte-1njum0u">Got: 42</div>');
    // expect(markup).toContain('<p data-location="generated/main.html:44:3" data-on:somethingelse=callme data-source="generated/main.html/1">Your answer: FIXME</p>');
    expect(markup).toContain('<p data-location="generated/main.html:45:3" data-on:somethingelse="callme">Your answer: FIXME</p>');
    expect(markup).toContain('</p>Just an EMPTY component\n');

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

    const markup = await fixture.partial('app+page.html', null, ctx);

    expect(td.explain(ctx.conn.routes.namedRoute.url).callCount).toEqual(1);

    expect(markup).toContain('<meta charset="utf-8" /><base href="/" /><title>OSOM</title></head><body>');
    expect(markup).toContain('<html data-location="generated/app+page.html">');
    expect(markup).toContain('<h1 data-location="generated/app+page.html:7:1" class=active>Hello World</h1>');
    expect(markup).toContain('<a href="/app/123" data-location="generated/app+page.html:25:3">LINK</a>');
  });

  test('should allow to hook functions into nodes', async ({ expect }) => {
    ctx.conn.store = {
      set: td.func('write'),
    };

    const markup = await fixture.partial('hooks+page.html', null, ctx);

    expect(td.explain(ctx.conn.store.set).callCount).toEqual(2);
    expect(markup).toContain('data-enhance data-use:do-stuff="jam/generated/hooks+page.html/1"');
  });

  test('should be able to handle middleware calls', async ({ expect }) => {
    ctx.write = td.func('out');
    ctx.conn.someStuff = td.func('out');

    const func = td.func('middleware');

    await fixture.partial('app+page.html', null, ctx, func);

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
      await fixture.partial('app+page.html', null, ctx, func);
      conn.res.end();
    });

    await app.request('/', (err, conn) => {
      conn.res.ok(err);
      expect(conn.res.body).toEqual(markup);
    });
  });

  test('should be able to handle page routing', async ({ expect }) => {
    setup();

    // process.debug=1;
    const cwd = process.cwd();
    const files = Template.glob(`${cwd}/generated/pages/**/*.html`);
    const pages = controllers(`${cwd}/generated`, files);

    reset();

    const app = server(async conn => {
      ctx.write = out => conn.res.write(out);

      if (conn.request_path) {
        let found;
        pages.some(route => {
          const matches = match(conn, route);
          if (matches) found = matches;
          return matches;
        });

        if (found) {
          ctx.called = true;
          ctx.conn.req.params = found.params;

          await fixture.partial(found.src.replace(`${cwd}/generated/`, ''), ctx.conn.req.params, ctx, middleware);
        }
      }
      conn.res.end();
    }, ctx);

    await app.request('GET', '/pages/example', (err, conn) => {
      expect(conn.res.body).toContain('Got: example');
      conn.res.ok(err);
    });
  });

  test('should be able to handle page route-methods', async ({ expect }) => {
    const app = server(async conn => {
      ctx.write = out => conn.res.write(out);

      if (conn.request_path) {
        if (conn.request_path.indexOf(ctx.conn.current_path) === 0) {
          ctx.conn.current_route = {};

          await fixture.partial(ctx.conn.current_module, null, ctx, middleware);
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

    ctx.route.error = await fixture.partial('some+error.html', null, ctx, false);
    ctx.route.layout = await fixture.partial('svelte+layout.html', null, ctx, false);

    await app.request('POST /app', (err, conn) => {
      expect(td.explain(console.info).callCount).toEqual(6);
      expect(conn.req.method).toEqual('POST');
      expect(conn.req.url).toEqual('/app');
      conn.res.ok(err, '<main data-location="generated/svelte+layout.html:1:1">');
    });

    await app.request('DELETE', '/app', (err, conn) => {
      expect(td.explain(console.info).callCount).toEqual(8);
      expect(conn.req.method).toEqual('DELETE');
      expect(conn.req.url).toEqual('/app');
      expect(conn.res.body).toContain('Error 404');
      conn.res.ok(err, "Route 'DELETE /' not found in app+page.html", 404);
    });
  });
});
