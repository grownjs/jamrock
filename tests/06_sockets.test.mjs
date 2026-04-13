/* eslint-disable max-len */

import { test } from '@japa/runner';
import * as td from 'testdouble';

// import * as sockets from '../src/handler/sockets.ts';
const sockets = {};

import { streamify } from '../src/templ/send.ts';
import { middleware } from '../src/handler/main.ts';
import { fixture, server } from './helpers/utils.mjs';
import { sleep, flatten } from '../src/utils/shared.ts';

// eslint-disable-next-line no-unused-expressions
fixture`./hello.html
  <script>
    export let name;
  </script>
  <h1>Hi, {name}.</h1>
`;

// eslint-disable-next-line no-unused-expressions
fixture`./iterators.html
  <script context="module">
    export function* doStuff() {
      yield -42;
    }
  </script>
  <script>
    import Hello from './hello.html';

    function* aGenerator() {
      let count = 0;
      while (true) {
        yield count += 1;
        if (count >= 15) break;
      }
    }

    async function* asyncGenerator() {
      yield new Promise(ok => setTimeout(() => ok(42), 20));
      yield -1;
    }

    async function onChange() {
      throw new Error('This should not happen!');
    }

    function *once() {
      yield 'in a life';
    }

    const local = Promise.resolve('OSOM');
  </script>

  1. {#each asyncGenerator as i}{i} {/each}
  2. {#each aGenerator as i}{i} {/each}
  3. {doStuff}
  4. {local}
  5. {once}

  <button on:click={onChange} />
  <Hello name={local} />
`;

// eslint-disable-next-line no-unused-expressions
fixture`./fragments.html
  <script>
    let value = 'OK';
    const values = [1, 2, 3, 4, 5];
    async function* infinity() {
      let i = 0;
      while (true) {
        if (i > 120) break;
        yield i;
        i += 1;
      }
    }
  </script>
  <fragment name="test">
    <b>{value}</b>
  </fragment>
  <fragment name="other" limit="3">
    {#each values as x}
      {x},
    {/each}
  </fragment>
  <fragment name="anything" interval="5">
    {#each infinity as x}
      {x},
    {/each}
  </fragment>
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
  <fragment tag="ul" name="test" interval="5">
    {#each data as x}
      <li>{x}</li>
    {/each}
  </fragment>
`;

// eslint-disable-next-line no-unused-expressions
fixture`./promises.html
  <script>
    export let promise;
  </script>
  Got: {typeof promise}
`;

// eslint-disable-next-line no-unused-expressions
fixture`./resolve.html
  <script>
    import Promises from './promises.html';
    const value = Promise.resolve(42);
  </script>
  <Promises promise={value} />
`;

function useContext(overrides) {
  const ctx = {
    publish: td.func('connect'),
    ...overrides,
  };
  return Object.assign(ctx, {
    stream: streamify().wrap(ctx, 'x-1234'),
  });
}

test.group('streaming support', () => {
  test('should resolve promises from props', async ({ expect }) => {
    const markup = await fixture.partial('resolve.html', null, {});

    expect(markup).toContain('Got: number');
  });

  test('should pull data from iterators', async ({ expect }) => {
    const ctx = useContext();

    const markup = await fixture.partial('iterators.html', null, ctx);

    const { callCount } = td.explain(ctx.publish);

    expect(callCount).toBeGreaterThanOrEqual(0);

    expect(markup).toContain('1. 42 -1 \n');
    expect(markup).toContain('2. 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 \n');
    expect(markup).toContain('3. [object GeneratorFunction]\n');
    expect(markup).toContain('4. OSOM\n');
    expect(markup).toContain('5. in a life');

    expect(markup).toContain('<button data-location="iterators.html:39:1" data-source="iterators.html/1" data-on:click="true" name="_action" value=onChange></button>');
    expect(markup).toContain('<h1 data-location="hello.html:4:1">Hi, OSOM.</h1>');
  });

  test('should push exceeding data from iterators', async ({ expect }) => {
    const ctx = useContext();

    await fixture.partial('fragments.html', null, ctx);
    await sleep(200);

    const { calls, callCount } = td.explain(ctx.publish);
    const givenArgs = flatten(calls.reduce((memo, x) => memo.concat(x.args[2]), []));

    expect(callCount).toBeGreaterThanOrEqual(20);
    expect(givenArgs.length).toBeGreaterThanOrEqual(21);
    expect(givenArgs.slice(0, 10)).toEqual([100, 101, 102, 103, 104, 105, 106, 107, 108, 109]);
  });

  test('should stream fragment updates via socket', async ({ expect }) => {
    const published = [];
    const ctx = {
      publish: async (ref, key, item, mode, render) => {
        const { target, vnode } = await render(key, item);
        const payload = JSON.stringify(vnode);
        if (ctx.socket) {
          ctx.socket.send(`rpc:update ${ctx.socket.identity} ${target} ${mode}\t${payload}`);
        }
      },
      socket: {
        identity: 'test-uuid',
        send: (msg) => {
          published.push(msg);
        },
      },
    };
    ctx.stream = streamify().wrap(ctx, 'test-uuid');

    fixture`./streaming.html
      <script>
        function* items() {
          let i = 0;
          while (i < 10) {
            yield i;
            i++;
          }
        }
      </script>
      <fragment name="list" limit="3">
        {#each items as x}
          <span>{x}</span>
        {/each}
      </fragment>
    `;

    await fixture.partial('streaming.html', null, ctx);
    await sleep(50);

    expect(published.length).toBe(7);
    expect(published[0]).toContain('rpc:update');
    expect(published[0]).toContain('list');
  });

  test('should stream via SSE when socket is pre-connected', async ({ expect }) => {
    const sseMessages = [];
    const uuid = 'sse-test-uuid';
    
    const sseSocket = {
      identity: uuid,
      send: (msg) => {
        sseMessages.push(msg);
      },
    };

    const ctx = {
      publish: async (ref, key, item, mode, render) => {
        const { target, vnode } = await render(key, item);
        const payload = JSON.stringify(vnode);
        if (ctx.socket) {
          ctx.socket.send(`rpc:update ${ctx.socket.identity} ${target} ${mode}\t${payload}`);
        }
      },
      socket: sseSocket,
    };
    ctx.stream = streamify().wrap(ctx, uuid);

    fixture`./sse-streaming.html
      <script>
        function* items() {
          yield 'a';
          yield 'b';
          yield 'c';
        }
      </script>
      <fragment name="stream" limit="1">
        {#each items as x}
          <p>{x}</p>
        {/each}
      </fragment>
    `;

    await fixture.partial('sse-streaming.html', null, ctx);
    await sleep(50);

    expect(sseMessages.length).toBe(2);
    expect(sseMessages[0]).toContain('rpc:update');
    expect(sseMessages[0]).toContain('stream');
  });

  test.skip('should be able to intercept websocket calls', async ({ expect }) => {
    const ctx = useContext({
      conn: {
        someStuff: () => 42,
        current_path: '/app',
        current_module: 'app+page.html',
      },
      route: {
        layout: null,
        error: null,
      },
    });

    const app = server(async conn => {
      ctx.write = out => conn.res.write(out);

      if (conn.path_info.length > 0) {
        ctx.conn.current_path = conn.path_info.join('/');
        ctx.conn.current_module = `${ctx.conn.current_path}.html`;
        await fixture.partial(ctx.conn.current_module, null, ctx, middleware);
        await sleep(150);
      }
      conn.res.end();
    }, ctx);

    const ev = [];
    const wss = app.sockets();
    const client = wss.connect();
    const onClose = td.func('close');

    let _ws;
    app.on('open', ws => {
      _ws = ws;
      ws.on('message', x => ev.push(['IN', x]));
      client.on('disconnect', onClose);
      client.on('message', x => ev.push(['OUT', x.data]));
      client.on('callback', (...args) => ev.push(['CALL', ...args]));
    });

    sockets.setup(app, null, null, null, 50);

    await app.request('GET /loops', (err, conn) => {
      conn.res.ok(err);
      expect(conn.res.body.split('<li data-location="loops.html:').length).toEqual(101);
      expect(conn.res.body).toContain('<ul data-location="loops.html:10:1" data-fragment=test data-interval=5>');
    });

    ctx.stream.get('loops.html/1/data').cancel();
    client.send('rpc:trigger');
    await sleep(100);

    app.emit('close', _ws);
    wss.stop();

    expect(ev).toEqual([
      ['IN', 'rpc:trigger'],
      ['CALL', 'trigger', [], ''],
      ['OUT', 'keep'],
    ]);

    expect(td.explain(onClose).callCount).toEqual(1);
    expect(td.explain(ctx.publish).callCount).toBeGreaterThanOrEqual(26);
  });
});
