/* eslint-disable max-len */

import { test } from '@japa/runner';
import * as td from 'testdouble';

import {
  fixture, server, setup, reset, build,
} from './helpers/utils.mjs';

import { Template } from '../src/templ/main.ts';
import { match } from '../src/handler/match.ts';

import { preflight, middleware, controllers, middlewares } from '../src/handler/main.ts';

fixture.fromFile('routing-test/app+page.html');
fixture.fromFile('routing-test/pages/[slug]+page.html');
fixture.fromFile('routing-test/pages/+server.js');
fixture.fromFile('routing-test/api/+server.mjs');
fixture.fromFile('routing-test/+server.ts');
fixture.fromFile('routing-test/very/nested/path/to/+server.mjs');
fixture.fromFile('routing-test/very/nested/+server.mjs');
fixture.fromFile('routing-test/nested/campaigns/[id]/participations/[detail]+page.html');
fixture.fromFile('routing-test/nested/campaigns/[id]/participations/index+page.html');
fixture.fromFile('routing-test/nested/campaigns/[id]/index+page.html');
fixture.fromFile('routing-test/nested/campaigns/index+page.html');
fixture.fromFile('routing/errors/+error.html');

test.group('routing and controllers', t => {
  t.each.setup(() => {
    td.replace(console, 'info', td.func('logger'));
  });
  t.each.teardown(() => {
    process.debug = 0;
    td.reset();
  });

  test('should extract routes from sources', ({ expect }) => {
    setup();

    const cwd = process.cwd();
    const testDir = `${cwd}/generated/routing-test`;
    const api = Template.glob(`${testDir}/**/+server.{ts,js,mjs}`);
    const files = Template.glob(`${testDir}/**/*.html`);
    const routes = controllers(testDir, files.concat(api));

    reset();

    expect(routes.map(x => `${x.verb} ${x.path}`).sort()).toEqual([
      'GET /api/some/:stuff',
      'GET /api/v1',
      'GET /app',
      'GET /nested/campaigns',
      'GET /nested/campaigns/:id',
      'GET /nested/campaigns/:id/participations',
      'GET /nested/campaigns/:id/participations/:detail',
      'GET /pages/:slug',
      'GET /pages/:slug/osom',
      'GET /pages/sitemap.xml',
      'GET /very/nested/path/to',
      'PATCH /app/:id',
      'POST /app',
    ].sort());

    expect(Object.isFrozen(routes)).toBeTruthy();
    expect(routes.PageName).not.toBeUndefined();
    expect(routes.postApp).not.toBeUndefined();

    expect(routes[0].url).toBeInstanceOf(Function);
    expect(routes.namedRoute.url).toBeInstanceOf(Function);
    expect(routes.namedRoute.path).toEqual('/app/:id');
    expect(routes.namedRoute.url({ id: 123 })).toEqual('/app/123');
    expect(routes.namedRoute.src).toEqual(`${testDir}/app+page.html`);

    expect(routes.OSOM.middleware).toEqual(`${testDir}/pages/+server.js`);
    expect(routes.getPagesSlugPage.middleware).toEqual(`${testDir}/pages/+server.js`);
    expect(routes.getApiSomeStuff.middleware).toEqual(`${testDir}/api/+server.mjs`);
    expect(routes.getPagesSitemapXml.middleware).toEqual(`${testDir}/pages/+server.js`);

    expect(routes.getVeryNestedPathTo.middlewares).toEqual([
      `${testDir}/very/nested/+server.mjs`,
      `${testDir}/+server.ts`,
    ]);

    expect(routes.getNestedCampaignsIdParticipationsDetailPage.all).toEqual([
      `${testDir}/nested/campaigns/[id]/participations/[detail]+page.html`,
      `${testDir}/nested/campaigns/[id]/participations/index+page.html`,
      `${testDir}/nested/campaigns/[id]/index+page.html`,
      `${testDir}/nested/campaigns/index+page.html`,
    ]);
  });
});

test.group('module invocation', t => {
  let ctx;
  t.each.setup(() => {
    td.replace(console, 'info', td.func('logger'));

    ctx = {
      conn: {
        headers: new Map(),
        unsafe: () => null,
        someStuff: () => 42,
        current_path: '/app',
        current_module: 'routing-test/app+page.html',
      },
      route: {
        layout: null,
        error: null,
      },
      depth: 0,
      stack: [],
      uuid: 'jam-uuid',
      signal: v => ({ value: v }),
      computed: fn => ({ value: fn() }),
      effect: () => null,
      trap: () => null,
      scope: v => ({ value: v }),
      ref: () => ({ current: null }),
    };
  });
  t.each.teardown(() => {
    process.debug = 0;
    td.reset();
  });

  test('should be able to invoke modules', async ({ expect }) => {
    ctx.conn.routes = {
      namedRoute: { url: td.func('named') },
    };

    td.when(ctx.conn.routes.namedRoute.url([['id', 123]]))
      .thenReturn('/app/123');

    expect(td.explain(console.info).callCount).toEqual(0);

    const markup = await fixture.partialSync('routing-test/app+page.html', null, ctx);

    expect(td.explain(console.info).callCount).toEqual(2);
    expect(td.explain(ctx.conn.routes.namedRoute.url).callCount).toEqual(1);

    expect(markup).toEqual([
      '<!DOCTYPE html>\n',
      '<html data-location="routing-test/app+page.html"><head>\n',
      '<meta charset="utf-8" /><base href="/" />\n  <title>OSOM</title>\n</head><body>\n',
      '<h1 data-location="routing-test/app+page.html:7:1" class=active>Hello World</h1>',
      '<a href="/app/123" data-location="routing-test/app+page.html:25:3">LINK</a></body></html>',
    ].join(''));
  });

  test('should be able to handle middleware calls', async ({ expect }) => {
    ctx.write = td.func('out');
    ctx.conn.someStuff = td.func('out');

    const func = td.func('middleware');

    await fixture.partial('routing-test/app+page.html', null, ctx, func);

    expect(td.explain(func).callCount).toEqual(1);
    expect(td.explain(ctx.write).callCount).toEqual(13);
    expect(td.explain(console.info).callCount).toEqual(2);
    expect(td.explain(ctx.conn.someStuff).callCount).toEqual(1);

    let markup;
    const app = server(async conn => {
      markup = '';
      ctx.write = out => {
        conn.res.write(out);
        markup += out;
      };
      await fixture.partialSync('routing-test/app+page.html', null, ctx, func);
      conn.res.end();
    });

    await app.request('/', (err, conn) => {
      conn.res.ok(err);
      expect(conn.res.body).toEqual(markup);
      expect(markup).toContain('<!DOCTYPE html>');
      expect(markup).toContain('<html data-location="routing-test/app+page.html"><head>');
    });
  });
});

test.group('preflight and routing', t => {
  let ctx;
  t.each.setup(() => {
    ctx = {
      conn: {
        headers: new Map(),
        method: 'PUT',
      },
    };
  });
  t.each.teardown(() => {
    td.reset();
  });

  test('should handle preflight of middlewares', async ({ expect }) => {
    const now = new Date();
    const values = [];

    function handler(conn) {
      conn.headers.set('x-time', now);
    }

    await preflight(ctx.conn, {
      PUT: handler,
      thing(_, options) {
        values.push(options.value);
      },
      stuff() {
        values.push(-1);
      },
    }, {
      use: [['thing', { value: 42 }], 'stuff'],
    });

    expect(values).toEqual([42, -1]);
    expect(ctx.conn.headers.get('x-time')).toEqual(now);
  });

  test('should be able to handle page routing', async ({ expect }) => {
    setup();

    const cwd = process.cwd();
    const testDir = `${cwd}/generated/routing-test`;
    const api = Template.glob(`${testDir}/**/+server.mjs`);
    const files = Template.glob(`${testDir}/**/*.html`);
    const pages = controllers(testDir, files.concat(api));

    reset();

    const ctx2 = {
      conn: {
        headers: new Map(),
        unsafe: () => null,
        someStuff: () => 42,
      },
      route: { layout: null, error: null },
      depth: 0,
      stack: [],
      uuid: 'jam-uuid',
      signal: v => ({ value: v }),
      computed: fn => ({ value: fn() }),
      effect: () => null,
      trap: () => null,
      scope: v => ({ value: v }),
      ref: () => ({ current: null }),
    };

    const app = server(async conn => {
      ctx2.write = out => conn.res.write(out);

      if (conn.request_path) {
        let found;
        pages.some(route => {
          const matches = match(conn, route);
          if (matches) found = matches;
          return matches;
        });

        if (found) {
          ctx2.called = true;
          ctx2.components = [];
          ctx2.conn.params = found.params;
          ctx2.conn.req.params = found.params;

          if (found.middlewares && !found.src) {
            ctx2.conn.current_options = {};

            const set = [found.middleware].concat(found.middlewares);
            const mods = await Promise.all(set.map(Template.reload));
            const result = await middlewares(ctx2, found, mods);

            conn.res.write(String(result));
          } else {
            try {
              setup();

              for (const src of found.all) {
                const tpl = await build(src.replace(`${cwd}/generated`, '.'));
                ctx2.components.push(tpl.module);
              }

              const props = { ...ctx2.conn.req.params };
              await fixture.partialSync(found.src.replace(`${cwd}/generated`, '.'), props, ctx2, middleware);
            } catch (e) {
              console.log('E_REQUEST', e, found);
            } finally {
              reset();
            }
          }
        }
      }
      conn.res.end();
    }, ctx2);

    await app.request('GET', '/pages/example', (err, conn) => {
      expect(conn.res.body).toContain('Got: example');
      conn.res.ok(err);
    });

    await app.request('GET', '/api/some/thing', (err, conn) => {
      expect(conn.res.body).toEqual('42, thing');
      conn.res.ok(err);
    });

    await app.request('GET', '/nested/campaigns/1/participations/2', (err, conn) => {
      expect(conn.res.body).toContain('Campaigns:');
      expect(conn.res.body).toContain('Campaign:');
      expect(conn.res.body).toContain('Participations:');
      expect(conn.res.body).toContain('Detail: 1, 2');
      conn.res.ok(err);
    });
  });
});

test.group('page route-methods', t => {
  let ctx;
  t.each.setup(async () => {
    td.replace(console, 'info', td.func('logger'));

    ctx = {
      conn: {
        headers: new Map(),
        unsafe: () => null,
        someStuff: () => 42,
        current_path: '/app',
        current_module: 'routing-test/app+page.html',
      },
      route: { layout: null, error: null },
      depth: 0,
      stack: [],
      uuid: 'jam-uuid',
      signal: v => ({ value: v }),
      computed: fn => ({ value: fn() }),
      effect: () => null,
      trap: () => null,
      scope: v => ({ value: v }),
      ref: () => ({ current: null }),
    };

    try {
      setup();
      const error = await build('./routing/errors/+error.html');
      ctx.route.error = error.module;
    } catch (e) {
      console.log('E_ERROR', e);
    } finally {
      reset();
    }
  });
  t.each.teardown(() => {
    process.debug = 0;
    td.reset();
  });

  test('should be able to handle page route-methods', async ({ expect }) => {
    const app = server(async conn => {
      ctx.write = out => conn.res.write(out);

      if (conn.request_path) {
        if (conn.request_path.indexOf(ctx.conn.current_path) === 0) {
          ctx.conn.current_route = {};
          const result = await fixture.partial(ctx.conn.current_module, {}, ctx, middleware);
          ctx.write(result);
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
      expect(conn.res.body).toContain('Error 404');
      conn.res.ok(err, 404);
    });
  });
});
