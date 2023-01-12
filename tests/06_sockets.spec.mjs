/* eslint-disable max-len */

import { test } from '@japa/runner';
import * as td from 'testdouble';
import * as path from 'path';
import * as fs from 'fs';

import * as sockets from '../src/handler/sockets.mjs';

import { createTranspiler } from '../src/server/shared.mjs';
import { middleware } from '../src/handler/main.mjs';
import { stringify } from '../src/templ/utils.mjs';
import { Template } from '../src/templ/main.mjs';
import { sleep } from '../src/utils/shared.mjs';

import {
  fixture, server, flatten, view,
} from './helpers/utils.mjs';

test.group('sockets support', t => {
  t.each.setup(() => {
    td.replace(Template, 'read', x => fs.readFileSync(x).toString());
    td.replace(Template, 'exists', x => fs.existsSync(x) && fs.statSync(x).isFile());
    td.replace(Template, 'transpile', createTranspiler({ createMortero: () => import('mortero'), path }));
  });
  t.each.teardown(() => {
    process.debug = 0;
    td.reset();
  });

  test('should render chunks through a callback', async ({ expect }) => {
    const ctx = {
      subscribe: td.func('subscribe'),
      connect: td.func('connect'),
      socket: false,
    };

    const chunks = [];
    const date = new Date().toString().substr(0, 21);
    const result = await view('tests/fixtures/iterators.html', null, ctx);

    stringify(result, value => chunks.push(value));

    const markup = chunks.join('');

    expect(markup.split(date).length).toBeGreaterThanOrEqual(5);

    expect(markup).toContain('1. 42-1\n');
    expect(markup).toContain('2. 123456789101112131415\n');

    expect(markup).toContain('4. [object GeneratorFunction]\n');
    expect(markup).toContain('5. OSOM');

    expect(markup).toContain('<button data-location="tests/fixtures/iterators.html:48:1" data-source="tests/fixtures/iterators.html/1" data-on:click="true" name="_action" value=onChange>');
    expect(markup).toContain('<h1 data-location="tests/fixtures/hello.html:4:1">Hi, OSOM.</h1>');
  });

  test('should emit exceeding data from iterators', async ({ expect }) => {
    const ctx = {
      subscribe: td.func('subscribe'),
      connect: td.func('connect'),
    };
    const socket = {
      on: () => null,
      emit: td.func('callback'),
    };

    setTimeout(() => {
      ctx.socket = socket;
    }, 100);

    const result = await view('tests/fixtures/fragments.html', null, ctx);
    const markup = stringify(result);

    expect(markup).toEqual(`<!DOCTYPE html>
<html data-location="tests/fixtures/fragments.html"><head>
<meta charset="utf-8" /><base href="/" /></head><body>
<x-fragment name="tests/fixtures/fragments.html/1/test" data-location="tests/fixtures/fragments.html:13:1"><b data-location="tests/fixtures/fragments.html:14:3">OK</b></x-fragment><x-fragment name="tests/fixtures/fragments.html/1/other" limit=3 data-location="tests/fixtures/fragments.html:16:1">

123</x-fragment><x-fragment name="tests/fixtures/fragments.html/1/anything" interval=5 data-location="tests/fixtures/fragments.html:21:1">

${Array.from({ length: 100 }).map((_, i) => i).join('')}</x-fragment></body></html>`.replaceAll('\n\n', ''));

    await sleep(700);

    const { calls, callCount } = td.explain(socket.emit);
    const givenArgs = flatten(calls.reduce((memo, x) => memo.concat(x.args[3]), []));

    expect(callCount).toBeGreaterThanOrEqual(3);
    expect(givenArgs.length).toBeGreaterThanOrEqual(21);
    expect(givenArgs.slice(0, 10)).toEqual([100, 101, 102, 103, 104, 105, 106, 107, 108, 109]);
    expect(givenArgs.sort((a, b) => a - b)).toEqual([5].concat(Array.from({ length: 21 }).map((_, x) => x + 100)));

    const a = givenArgs.findIndex(x => x === 4);
    const b = givenArgs.findIndex(x => x === 5);

    expect(b).toBeGreaterThan(a);

    const m = givenArgs.findIndex(x => x === 100);
    const n = givenArgs.findIndex(x => x === 101);

    expect(n).toBeGreaterThan(m);
  });

  test('should be able to intercept websocket calls', async ({ expect }) => {
    const socket = {
      on: td.func('subscriber'),
      emit: td.func('emitter'),
    };

    const ctx = {
      conn: {
        someStuff: () => 42,
        current_path: '/app',
        current_module: 'app+page.html',
      },
      route: {
        layout: null,
        error: null,
      },
      useRef: () => null,
      onError: () => null,
      useState: () => [],
      useEffect: () => null,
      registerComponent: mod => mod,
    };

    const app = server(async conn => {
      ctx.write = out => conn.res.write(out);

      setTimeout(() => {
        ctx.socket = socket;
      }, 100);

      if (conn.path_info.length > 0) {
        ctx.conn.current_path = conn.path_info.join('/');
        ctx.conn.current_module = `${ctx.conn.current_path}+page.html`;
        await fixture.partial(ctx.conn.current_module, null, ctx, middleware);
        await sleep(150);
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

    sockets.setup(app, null, null, 100);

    await app.request('GET /loops', (err, conn) => {
      conn.res.ok(err);

      expect(conn.res.body.split('<li data-location="generated/loops+page.html:').length).toEqual(101);
      expect(conn.res.body).toContain('<ul data-location="generated/loops+page.html:10:1" data-fragment="generated/loops+page.html/1/test" data-interval=5>');
    });

    ctx.streams.get('generated/loops+page.html/1/test').cancel();
    client.send('rpc:trigger');
    await sleep(200);

    app.emit('close', _ws);
    wss.stop();

    expect(ev).toEqual([
      ['IN', 'rpc:trigger'],
      ['CALL', 'trigger', [], ''],
      ['OUT', 'keep'],
    ]);

    const { callCount, calls } = td.explain(socket.emit);

    expect(closed).toEqual(1);
    expect(callCount).toBeGreaterThanOrEqual(5);
    expect(calls[0].args[1]).toEqual('generated/loops+page.html/1/test');
  });
});
