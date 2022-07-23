/* eslint-disable max-len */

import { test } from '@japa/runner';
import Mortero from 'mortero';
import * as td from 'testdouble';
import * as path from 'path';
import * as fs from 'fs';
import * as store from '../src/reactor/store.mjs';

import { createTranspiler } from '../lib/shared.mjs';
import { Template } from '../src/templ/main.mjs';
import { stringify } from '../src/templ/utils.mjs';
import { sleep, flatten } from '../src/utils.mjs';
import { view } from './helpers/utils.mjs';

Mortero.use([{
  name: 'Jamrock',
  run: ({ register }) => register(['html']),
}]);

test.group('sending markup', t => {
  let shared;
  t.each.setup(() => {
    shared = {
      useState: td.func('useState'),
    };

    td.when(shared.useState(td.matchers.anything()))
      .thenReturn([null, td.func('setState')]);

    Template.cache = new Map();
    Template.cache.set('jamrock', { module: shared });
    Template.cache.set('jamrock/store', { module: store });

    td.replace(Template, 'read', x => fs.readFileSync(x).toString());
    td.replace(Template, 'write', (...x) => fs.writeFileSync(...x));
    td.replace(Template, 'exists', x => fs.existsSync(x) && fs.statSync(x).isFile());
    td.replace(Template, 'transpile', createTranspiler({ Mortero, path }));
  });
  t.each.teardown(() => {
    td.reset();
  });

  test('should handle components > slots', async ({ expect }) => {
    const result = await view('tests/fixtures/slots.html');
    const markup = stringify(result);

    expect(markup).toContain('<div data-location=tests/fixtures/component.html:1:1>(FOO)</div>');
    expect(markup).toContain('<div data-location=tests/fixtures/component.html:1:1><span data-location=tests/fixtures/slots.html:7:12>X</span>BAR)</div>');
    expect(markup).toContain('<div data-location=tests/fixtures/component.html:1:1>(BAZ<span data-location=tests/fixtures/slots.html:8:12>Y</span></div>');
    expect(markup).toContain('<div data-location=tests/fixtures/component.html:1:1><span data-location=tests/fixtures/slots.html:9:12>X</span>Z<span data-location=tests/fixtures/slots.html:9:40>y</span></div>');
    expect(markup).toContain('<main data-location=tests/fixtures/layout.html:1:1><div data-location=tests/fixtures/component.html:1:1>xBUZZ)</div>');
    expect(markup).toContain('<div data-location=tests/fixtures/component.html:1:1>_...)</div></main>');
  });

  test('should merge page metadata and assets', async ({ expect }) => {
    const result = await view('tests/fixtures/nested.html', { lang: 'es-MX', fixme: 'nope' });
    const markup = stringify(result);

    expect(markup).toEqual(`<!DOCTYPE html>
<html lang=es-MX><head>
<title>OSOM</title><meta http-equiv=refresh content="2; url=/login" /></head><body class="just nope" data-location=tests/fixtures/heading.html:11:1>
</body></html>`);
  });

  test('should render chunks through a callback', async ({ expect }) => {
    const ctx = {
      subscribe: td.func('subscribe'),
      connect: td.func('connect'),
    };

    const chunks = [];
    const date = new Date().toString().substr(0, 21);
    const result = await view('tests/fixtures/iterators.html', null, ctx);

    stringify(result, value => chunks.push(value));

    const markup = chunks.join('');

    expect(markup.split(date).length).toBeGreaterThanOrEqual(5);

    expect(markup).toContain('1. -1\n');
    expect(markup).toContain('2. 123456789101112131415\n');

    expect(markup).toContain('4. -42\n');
    expect(markup).toContain('5. OSOM\n');

    expect(markup).toContain('<button data-location=tests/fixtures/iterators.html:56:1 data-on:click name=_cta value=onChange>');
    expect(markup).toContain('<h1 data-location=tests/fixtures/hello.html:1:1>Hi, [object AsyncFunction].</h1>');
  });

  test('should emit exceeding data from iterators', async ({ expect }) => {
    const ctx = {
      subscribe: td.func('subscribe'),
      connect: td.func('connect'),
    };
    const socket = {
      on: () => null,
      fail: console.debug,
      send: td.func('sender'),
      emit: td.func('callback'),
    };

    setTimeout(() => {
      ctx.socket = socket;
    }, 100);

    const result = await view('tests/fixtures/fragments.html', null, ctx);
    const markup = stringify(result);

    expect(markup).toEqual(`<!DOCTYPE html>
<html><head>
</head><body>
<x-fragment name=test.0 data-location=tests/fixtures/fragments.html:13:1><b data-location=tests/fixtures/fragments.html:14:3>OK</b></x-fragment><x-fragment name=values.0 limit=3 data-location=tests/fixtures/fragments.html:16:1>
  \n    1\n  \n    2\n  \n    3\n  \n</x-fragment><x-fragment name=infinity.0 interval=5 data-location=tests/fixtures/fragments.html:21:1>
  ${Array.from({ length: 100 }).map((_, i) => `\n    ${i}\n  `).join('')}\n</x-fragment></body></html>`);

    await sleep(700);

    const { calls, callCount } = td.explain(socket.send);
    const givenArgs = flatten(calls.reduce((memo, x) => memo.concat(JSON.parse(x.args[0].split('\t')[1])), []));

    expect(callCount).toBeGreaterThanOrEqual(5);
    expect(givenArgs.length).toEqual(23);
    expect(givenArgs.sort((a, b) => a - b)).toEqual([4, 5].concat(Array.from({ length: 21 }).map((_, x) => x + 100)));

    const a = givenArgs.findIndex(x => x === 4);
    const b = givenArgs.findIndex(x => x === 5);

    expect(b).toBeGreaterThan(a);

    const m = givenArgs.findIndex(x => x === 100);
    const n = givenArgs.findIndex(x => x === 101);

    expect(n).toBeGreaterThan(m);
  });

  test('should render components for ssr and is-land modes', async ({ expect }) => {
    const registeredComponents = {};
    const registerComponent = (ref, chunk) => {
      registeredComponents[ref] = chunk;
      return chunk;
    };

    const result = await view('tests/fixtures/bundle.html', null, { registerComponent, ...shared });
    const markup = stringify(result).replace(/\sdata-[\w-]+-html=\w+/g, '').replace(/<script[^<>]*>[^]*<\/script>/);

    expect(markup).not.toContain('<x-fragment>');
    expect(markup).toContain('[<b data-location=tests/fixtures/bundle.html:12:21>OSOM: 21</b>]OK(FOO: 42)[NESTED:?]');
    expect(markup).toContain('[]OK(BAR)[NESTED:?]\n');
    expect(markup).toContain('[]OK(MAIN)[NESTED:?]\n');
    expect(markup).toContain('<div data-stuff=42 data-location=tests/fixtures/bundle.html:24:1 data-component=tests/fixtures/osom.svelte>');
    expect(markup).toContain('<div class="svelte-1njum0u">OSOM: <h1 data-location=tests/fixtures/bundle.html:25:3>It works.</h1></div></div>');

    const other = await view('tests/fixtures/scripts.html', { value: -1 }, { registerComponent, ...shared });
    const html = stringify(other);

    expect(html).toContain('li::before');
    expect(html).toContain('color: blue;');

    expect(html).toContain('console.log(el);');
    expect(html).toContain('console.log(truth());');
    expect(html).toContain('window.Jamrock.Browser._');
    expect(html).toContain('var el = Fragment.for("...");');

    expect(html).toContain('<script src=//unpkg.com/somedom></script>');
    expect(html).toContain('import { truth } from "/~/tests/fixtures/utils.js";');

    expect(html).toContain('<p data-location=tests/fixtures/test.html:25:1>Count: (42)</p>');
    expect(html).toContain('<button data-location=tests/fixtures/test.html:26:1 data-on:click name=_cta value=inc>+</button>');
  });
});
