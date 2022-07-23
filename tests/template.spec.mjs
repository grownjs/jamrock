/* eslint-disable max-len */

import { runInNewContext } from 'vm';
import { test } from '@japa/runner';
import Mortero from 'mortero';
import * as td from 'testdouble';
import * as path from 'path';
import * as fs from 'fs';

import { load, render } from './helpers/utils.mjs';

import { Template } from '../src/templ/main.mjs';
import { createTranspiler } from '../lib/shared.mjs';
import { compile, get } from '../src/templ/compile.mjs';
import { highlight, stringify } from '../src/templ/utils.mjs';

const cwd = process.cwd();

const code = `
  <script context="module">
    import { inspect } from 'node:util';

    function shouldFail() {
      throw new Error('FAIL');
    }

    export const enabled = false;
    export const name = 'OSOM';
  </script>

  <script>
    import { Inspect } from 'jamrock:components';
    import Test from './hello';

    import Test1 from './test';
    import Test2 from '../inner';
    import Test3 from '../../noop';
    import Test4 from '../../../router';
    import Test5 from '~/tests/fixtures/id';
    import Test6 from 'mortero:parse';

    export let ms = 60;
    export let value = 42;
    export const markup = \`
      <span>\${name}</span>
    \`;

    export default {
      as: 'Example',
      use: ['web'],
      routes: {
        ['GET /fail']: shouldFail,
      },
    };

    $: double = value * 2;
  </script>

  <html lang="es-MX" />
  <body class="main">
    <script>
      console.log(42);
    </script>
    <script type="module">
      import kindOf from 'https://cdn.skypack.dev/kind-of';
      console.log({ kindOf });
    </script>
    <script bundle>
      import isNumber from 'https://cdn.skypack.dev/is-number';
      console.log({ isNumber });
    </script>
  </body>

  <head>
    <title>Untitled "{value}"</title>
  </head>

  <!-- some logic -->
  {#if Math.random() > 0.5}
    <p>OK: {value / 1.5}</p>
  {/if}

  directives:
  {@html markup}
  {@raw ['h1', Object.fromEntries([]), 'It works.']}

  <style lang="less">
    @red: #ff0;
    p { color: @red; }
    @font-face {
      font-family: Alpha;
      src: url('Bravo.otf');
    }
  </style>

  <fragment name="test" interval={ms}>
    OSOM: <Inspect {value} />
  </fragment>

  <Test name="PATEKE" />
  <pre>{inspect(value)}</pre>
  {#if enabled}<Inspect {value} />{/if}

  <Test1>FIXME</Test1>
  <Test2>FIXME</Test2>
  <Test3>FIXME</Test3>
  <Test4>FIXME</Test4>
  <Test5>FIXME</Test5>
  <Test6>FIXME</Test6>
`;

test.group('template transformation', t => {
  let head;
  let tail;
  t.each.setup(async () => {
    Template.cache = new Map();
    td.replace(Template, 'transpile', createTranspiler({ Mortero, path }));
    td.replace(Template, 'read', x => fs.readFileSync(x).toString());
    td.replace(Template, 'exists', x => fs.existsSync(x) && fs.statSync(x).isFile());

    ([head, ...tail] = await get('tests/fixtures/transformed.html', code));
  });
  t.each.teardown(() => {
    delete Template.cache;
    td.reset();
  });

  test('should compile to CommonJS', async ({ expect }) => {
    expect(tail.length).toEqual(2);
    expect(tail[0].content).toContain('$$.$(name)');
    expect(tail[1].src).toEqual('tests/fixtures/test.html');

    const mod = await load(null, head);
    const out = await Template.render(mod, null, {
      ms: 10,
      value: 42,
      markup: '<b>OSOM</b>',
      Test: {},
      Test1: {},
      Test2: {},
      Test3: {},
      Test4: {},
      Test5: {},
      Test6: {},
      Inspect: {},
    });

    expect(out.doc.lang).toEqual('es-MX');
    expect(out.scripts[0]).toEqual([true, 'console.log(42);\n']);
    expect(out.scripts[1][0]).toBeTruthy();
    expect(out.scripts[2][0]).toBeFalsy();
    expect(out.scripts[1][1]).toContain('import kindOf');
    expect(out.scripts[2][1]).toContain('http-url:');
    expect(out.styles[0]).toContain('color: #ff0;');
    expect(out.body[6]).toEqual(['h1', {}, 'It works.']);
    expect(out.meta[0]).toEqual(['title', {}, ['Untitled "42"']]);
    expect(out.attrs.class).toEqual('main');
  });

  test('should allow to run compiled modules', async ({ expect }) => {
    td.replace(Template, 'load', td.func('import'));

    td.when(Template.load(td.matchers.isA(String), 'tests/fixtures/transformed.html', 'generated/tpl.cjs'))
      .thenResolve({});

    td.when(Template.load('jamrock:components', 'tests/fixtures/transformed.html', 'generated/tpl.cjs'))
      .thenResolve({ Inspect: () => ({ render: () => ['p', {}, 'FIXME'] }) });

    td.when(Template.load('./hello', 'tests/fixtures/transformed.html', 'generated/tpl.cjs'))
      .thenResolve(() => ({ render: ({ name }) => `Hi, ${name}.` }));

    td.when(Template.load(td.matchers.isA(String)))
      .thenDo(mod => Template.import(mod));

    const ctx = { truth: -1, template: code };
    const mod = await load(null, head);

    const result = await Template.resolve(mod, 'generated/tpl.cjs', ctx, { enabled: true });
    const markup = stringify(result);

    expect(markup).toContain('// tests/fixtures/transformed(4).js');
    expect(markup).toContain('<h1>It works.</h1>');
    expect(markup).toContain('<p>FIXME</p>');
    expect(markup).toContain('Hi, PATEKE.');
    expect(markup).toContain('<span>OSOM</span>');
  });
});

test.group('stylesheet scoping', t => {
  t.each.setup(() => {
    td.replace(Template, 'transpile', createTranspiler({ Mortero, path }));
  });
  t.each.teardown(() => {
    td.reset();
  });

  test('should scope css-selectors', async ({ expect }) => {
    td.replace(Math, 'random', td.func('random'));
    td.when(Math.random()).thenReturn(12.34);

    const [head] = await get('tests/fixtures/transformed.html', `
      <style>
        p { color: red; }
        .foo { color: green; }
        p .foo:not(.x) { color: yellow; }
        p[data-root] .foo { color: black; }
        ul li span { color: pink; }
        .name { color: purple; }
      </style>
      <p data-root>
        <span class="foo">OK</span>
      </p>
      <ul>
        <li><span class="name {bar}">OSOM</span> <span>💣</span></li>
      </ul>
    `);

    const mod = await load(null, head);
    const result = await Template.resolve(mod, 'generated/tpl.cjs', null, { bar: 'osom' });
    const markup = stringify(result);

    expect(markup).toContain('\np.jam-xc8n1fu8.jam-xc8n1fu8 ');
    expect(markup).toContain('\n.foo.jam-xc8n1fu8.jam-xc8n1fu8');
    expect(markup).toContain('\np.jam-xc8n1fu8 .foo.jam-xc8n1fu8:not(.x)');
    expect(markup).toContain('\np[data-root].jam-xc8n1fu8 .foo.jam-xc8n1fu8 ');
    expect(markup).toContain('\nul.jam-xc8n1fu8 li span.jam-xc8n1fu8 ');
    expect(markup).toContain('\n.name.jam-xc8n1fu8.jam-xc8n1fu8 ');

    expect(markup).toContain('<p data-root data-location=tests/fixtures/transformed.html:10:7 class=jam-xc8n1fu8>');
    expect(markup).toContain('<span class="foo jam-xc8n1fu8" data-location=tests/fixtures/transformed.html:11:9>OK</span>');
    expect(markup).toContain('<ul data-location=tests/fixtures/transformed.html:13:7 class=jam-xc8n1fu8>');
    expect(markup).toContain('<li data-location=tests/fixtures/transformed.html:14:9>');
    expect(markup).toContain('<span class="name osom jam-xc8n1fu8" data-location=tests/fixtures/transformed.html:14:13>OSOM</span>');
    expect(markup).toContain('<span data-location=tests/fixtures/transformed.html:14:50 class=jam-xc8n1fu8>💣</span>');
  });
});

test.group('syntax highlighting', () => {
  test('should highlight syntax for debug', ({ expect }) => {
    expect(highlight(code, true)).toContain(`
  &lt;<span style="color:rgb(0,0,187)">fragment</span> <span style="color:rgb(187,187,0)">name</span>=<span style="color:rgb(0,187,187)">&quot;test&quot;</span> <span style="color:rgb(187,187,0)">interval</span>={ms}&gt;
    OSOM: &lt;<span style="color:rgb(0,0,187)">Inspect</span> {value} /&gt;
  &lt;/<span style="color:rgb(0,0,187)">fragment</span>&gt;
`);
  });
});

test.group('parse and runtime errors', t => {
  t.each.teardown(() => {
    td.reset();
  });

  test('should trace runtime-errors', async ({ expect }) => {
    const Tpl = compile(`
      <script>
        export const users = [];
      </script>

      {#each users as u}
        <p>{u.name} {undef}</p>
      {/each}
    `);

    await render(Tpl, { users: [{ name: 'foo' }] }, true);

    expect(Tpl.failure.name).toEqual('ReferenceError');
    expect(Tpl.failure.stack).toContain('\n⚠    7 |         <p>{u.name} {undef}</p>\n');
    expect(Tpl.failure.stack).toContain('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^\n');
    expect(Tpl.failure.message).toEqual('undef is not defined');
  });

  test('should trace parse-errors', ({ expect }) => {
    td.replace(Template, 'eval', _code => {
      const ctx = {};
      runInNewContext(`result = ${_code}`, ctx);
      return ctx.result;
    });

    const Tpl = compile(`
      {#each users< as u}
        ...
      {/each}
    `);

    expect(Tpl.failure.name).toEqual('SyntaxError');
    expect(Tpl.failure.stack).toContain('\n⚠    2 |       {#each users< as u}\n');
    expect(Tpl.failure.stack).toContain('\n~~~~~~~~~~~~~~~^\n');
    expect(Tpl.failure.message).toEqual('invalid syntax');
  });
});

test.group('dynamic loading', t => {
  t.each.setup(() => {
    td.replace(Template, 'exists', x => fs.existsSync(x) && fs.statSync(x).isFile());
  });
  t.each.teardown(() => {
    td.reset();
  });

  test('should resolve from shared modules', async ({ expect }) => {
    td.replace(process, 'cwd');
    td.when(process.cwd())
      .thenReturn(`${cwd}/tests/fixtures`);

    const mjs = await Template.load('dummy:a');
    const cjs = await Template.load('dummy:b');
    const js = await Template.load('dummy:c');

    expect(mjs.value).toEqual(42);
    expect(mjs.default).toBeUndefined();
    expect(cjs.default).toEqual({ value: 42 });
    expect(cjs.value).toEqual(42);
    expect(js.default).toEqual({ value: 42 });
    expect(js.value).toBeUndefined();
  });

  test('should resolve from relative sources', async ({ expect }) => {
    const utils = await Template.load('./utils', 'tests/fixtures/transformed.html', 'generated/tpl.cjs');

    expect(utils.truth()).toEqual(42);
  });

  test('should warn on importing .html sources', async ({ expect }) => {
    try {
      await Template.load('./test', 'tests/fixtures/transformed.html', 'generated/tpl.cjs');
    } catch (e) {
      expect(e.message).toEqual("Cannot import 'tests/fixtures/test.html' template");
    }
  });
});

test.group('compiler support', t => {
  t.each.setup(() => {
    td.replace(Template, 'transpile', createTranspiler({ Mortero, path }));
    td.replace(Template, 'read', x => fs.readFileSync(x).toString());
    td.replace(Template, 'read', x => fs.readFileSync(x).toString());
    td.replace(Template, 'exists', x => fs.existsSync(x) && fs.statSync(x).isFile());
  });
  t.each.teardown(() => {
    td.reset();
  });

  test('should return compiled templates', async ({ expect }) => {
    const [head, ...tail] = await get('tests/fixtures/components.html');

    const ctx = { template: Template.read(head.src) };

    Template.cache = new Map();

    for (let i = 0; i < tail.length; i += 1) {
      Template.cache.set(tail[i].src, {
        module: await load(null, tail[i]),
      });
    }

    const main = await load(null, head);
    const result = await Template.resolve(main, 'generated/tpl.cjs', ctx);
    const markup = stringify(result);

    expect(markup).toContain('Hi, Hank.');
  });
});
