/* eslint-disable */
/* eslint-disable max-len */

import { runInNewContext } from 'vm';
import { test } from '@japa/runner';
import { createGenerator } from '@unocss/core';

import * as td from 'testdouble';
import * as path from 'path';
import * as fs from 'fs';

import { load, render, flatten } from './helpers/utils.mjs';

import { Template } from '../src/templ/main.mjs';
import { compile, get } from '../src/templ/compile.mjs';
import { createTranspiler } from '../src/server/shared.mjs';
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
    import Test from './hello.html';
    import Markup from './static.html';

    import Test1 from './test.html';
    import Test2 from '../inner.html';
    import Test3 from '../../noop.html';
    import Test4 from '../../../router.html';
    import Test5 from '~/tests/fixtures/id.js';
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
  {@html ['h1', Object.fromEntries([]), 'It works.']}

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

  [HTML: <Markup>!!</Markup>]
`;

test.group('template transformation', t => {
  let head;
  let tail;
  t.each.setup(async () => {
    Template.cache = new Map();
    td.replace(Template, 'read', x => fs.readFileSync(x).toString());
    td.replace(Template, 'exists', x => fs.existsSync(x) && fs.statSync(x).isFile());
    td.replace(Template, 'transpile', createTranspiler({ createMortero: () => import('mortero'), path }));

    ([head, ...tail] = await get('tests/fixtures/transformed.html', code));
  });
  t.each.teardown(() => {
    delete Template.cache;
    process.debug = 0;
    td.reset();
  });

  test('should compile to ESM', async ({ expect }) => {
    expect(tail.length).toEqual(3);
    expect(tail[0].content).toContain('$$.$(name)');
    expect(tail[1].src).toEqual('tests/fixtures/test.html');
    expect(tail[2].src).toEqual('tests/fixtures/static.html');

    const mod = await load(null, head);
    const out = await Template.render(mod, null, {
      ms: 10,
      value: 42,
      markup: ['b', {}, 'OSOM'],
      Test: {},
      Test1: {},
      Test2: {},
      Test3: {},
      Test4: {},
      Test5: {},
      Test6: {},
      Markup: {},
      Inspect: {},
    }, { depth: 0 });

    expect(out.doc.lang).toEqual('es-MX');
    expect(out.scripts['tests/fixtures/transformed.html'][0]).toEqual([true, '/* tests/fixtures/transformed.html(0) */\nconsole.log(42);\n']);
    expect(out.scripts['tests/fixtures/transformed.html'][1][0]).toBeTruthy();
    expect(out.scripts['tests/fixtures/transformed.html'][2][0]).toBeFalsy();
    expect(out.scripts['tests/fixtures/transformed.html'][1][1]).toContain('import kindOf');
    expect(out.scripts['tests/fixtures/transformed.html'][2][1]).toContain('http-url:');
    expect(flatten(out.styles['tests/fixtures/transformed.html']).join('')).toContain('color:#ff0;');
    expect(out.body[4]).toEqual(['h1', {}, 'It works.']);
    expect(out.head[0]).toEqual(['title', {}, ['Untitled "42"']]);
    expect(out.attrs.class).toEqual('main');
    expect(out.body[3]).toEqual(['b', {}, 'OSOM']);
  });

  test('should allow to run compiled modules', async ({ expect }) => {
    td.replace(Template, 'load', td.func('import'));

    td.when(Template.load(td.matchers.isA(String), 'tests/fixtures/transformed.html', 'generated/tpl.cjs'))
      .thenResolve({});

    td.when(Template.load('jamrock:components', 'tests/fixtures/transformed.html', 'generated/tpl.cjs'))
      .thenResolve({ Inspect: () => ({ render: () => ['p', {}, 'FIXME'] }) });

    td.when(Template.load('./hello.html', 'tests/fixtures/transformed.html', 'generated/tpl.cjs'))
      .thenResolve(() => ({ render: ({ name }) => `Hi, ${name}.` }));

    td.when(Template.load('./static.html', 'tests/fixtures/transformed.html', 'generated/tpl.cjs'))
      .thenResolve(load(null, tail.find(x => x.src.includes('static'))));

    td.when(Template.load(td.matchers.isA(String)))
      .thenDo(mod => Template.import(mod));

    td.when(Template.load('node:util', td.matchers.isA(String), td.matchers.isA(String)))
      .thenResolve(import('node:util'));

    const ctx = { truth: -1, template: code };
    const mod = await load(null, head);

    const result = await Template.execute(mod, 'generated/tpl.cjs', ctx, { enabled: true });
    const markup = stringify(result);

    expect(markup).toContain('tests/fixtures/transformed(4).js');
    expect(markup).toContain('<h1>It works.</h1>');
    expect(markup).toContain('<p>FIXME</p>');
    expect(markup).toContain('Hi, PATEKE.');
    expect(markup).toContain('<span>OSOM</span>');
    expect(markup).toContain('[HTML: <h1 data-location="tests/fixtures/static.html:5:1" class="jam-x1plh5jo">I\'m static HTML!</h1>!!OK]');
  });
});

test.group('stylesheet scoping', t => {
  t.each.setup(() => {
    td.replace(Template, 'transpile', createTranspiler({ createMortero: () => import('mortero'), path }));
  });
  t.each.teardown(() => {
    td.reset();
  });

  test('should scope css-selectors', async ({ expect }) => {
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
      <a class:name={1} />
    `, { props: ['bar'] });

    const mod = await load(null, head);
    const result = await Template.execute(mod, 'generated/tpl.cjs', null, { bar: 'osom' });
    const markup = stringify(result);

    expect(markup).toContain('p:where(.jam-xg9mejp){');
    expect(markup).toContain('.foo:where(.jam-xg9mejp){');
    expect(markup).toContain('p:where(.jam-xg9mejp) .foo:where(.jam-xg9mejp):not(.x){');
    expect(markup).toContain('p[data-root]:where(.jam-xg9mejp) .foo:where(.jam-xg9mejp){');
    expect(markup).toContain('ul:where(.jam-xg9mejp) li span:where(.jam-xg9mejp){');
    expect(markup).toContain('.name:where(.jam-xg9mejp){');

    expect(markup).toContain('<p data-root data-location="tests/fixtures/transformed.html:10:7" class="jam-xg9mejp">');
    expect(markup).toContain('<span class="foo jam-xg9mejp" data-location="tests/fixtures/transformed.html:11:9">OK</span>');
    expect(markup).toContain('<ul data-location="tests/fixtures/transformed.html:13:7" class="jam-xg9mejp">');
    expect(markup).toContain('<li data-location="tests/fixtures/transformed.html:14:9">');
    expect(markup).toContain('<span class="name osom jam-xg9mejp" data-location="tests/fixtures/transformed.html:14:13">OSOM</span>');
    expect(markup).toContain('<span data-location="tests/fixtures/transformed.html:14:50" class="jam-xg9mejp">💣</span>');
    expect(markup).toContain('<a data-location="tests/fixtures/transformed.html:16:7" class="jam-xg9mejp name"></a>');
  });

  test('should scope nested css-selectors', async ({ expect }) => {
    const [head] = await get('tests/fixtures/transformed.html', `
      <style>
        h1 { color: blue }
        @media screen and (min-width: 100px) {
          h1 { color: red }
        }
      </style>
      <style global>
        @font-face {
          font-family: Alpha;
          src: url('Bravo.otf');
        }
        @supports (display: flex) {
          .flex-container > * {
            text-shadow: 0 0 2px blue;
            float: none;
          }
          .flex-container {
            display: flex;
          }
        }
        [class] { color: cyan }
      </style>
      <h1>OSOM</h1>
      <div class="flex-container">!</div>
    `, { props: ['bar'] });

    const mod = await load(null, head);
    const result = await Template.execute(mod, 'generated/tpl.cjs', null, { bar: 'osom' });
    const markup = stringify(result);

    expect(markup).toContain('@media screen and (min-width: 100px){h1:where(.jam-xg9mejp){color:red;}');
    expect(markup).toContain('h1:where(.jam-xg9mejp){color:blue;}');
    expect(markup).toContain('@supports (display: flex){');
    expect(markup).toContain('[class]{color:cyan;}');
  });

  test('should provide support for css-generators, like unocss', async ({ expect }) => {
    const generators = {
      css: createGenerator({
        rules: [
          ['m-1', { margin: '0.25rem' }],
        ],
      }),
    };

    const [head] = await get('tests/fixtures/stylesheets.html', `
      <p class="m-1" class:m-3=1 class:p-2={false}>OSOM</p>
    `, { generators });

    const mod = await load(null, head);
    const result = await Template.execute(mod, 'generated/tpl.cjs');
    const markup = stringify(result);

    expect(markup).toContain('/* tests/fixtures/stylesheets.html */\n.m-1{margin:0.25rem;}');
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
    `, { props: ['users'] });

    await render(Tpl, { users: [{ name: 'foo' }] }, true);

    // console.log(Tpl);

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
      await Template.load('./test.html', 'tests/fixtures/transformed.html', 'generated/tpl.cjs');
    } catch (e) {
      expect(e.message).toEqual("Cannot import 'tests/fixtures/test.html' file as module");
    }
  });
});

test.group('compiler support', t => {
  t.each.setup(() => {
    td.replace(Template, 'read', x => fs.readFileSync(x).toString());
    td.replace(Template, 'read', x => fs.readFileSync(x).toString());
    td.replace(Template, 'exists', x => fs.existsSync(x) && fs.statSync(x).isFile());
    td.replace(Template, 'transpile', createTranspiler({ createMortero: () => import('mortero'), path }));
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
    const result = await Template.execute(main, 'generated/tpl.cjs', ctx);
    const markup = stringify(result);

    expect(markup).toContain('Hi, Hank.');
  });

  test('should handle self within fragments', async ({ expect }) => {
    const [head] = await get('tests/fixtures/self.html');
    const ctx = { template: Template.read(head.src), socket: false };

    const main = await load(null, head);
    const result = await Template.execute(main, 'generated/tpl.cjs', ctx);
    const markup = stringify(result);

    expect(markup).toContain('<x-fragment name="tests/fixtures/self.html/1/re" key="x:0" data-location="tests/fixtures/self.html:20:5">');
    expect(markup).toContain('<x-fragment name="tests/fixtures/self.html/2/re" key="x:0.1" data-location="tests/fixtures/self.html:20:5">');
    expect(markup).toContain('<x-fragment name="tests/fixtures/self.html/3/re" key="x:0.1.2" data-location="tests/fixtures/self.html:20:5">');
    expect(markup).toContain('<li data-location="tests/fixtures/self.html:22:9">a');
    expect(markup).toContain('<li data-location="tests/fixtures/self.html:22:9">b');
    expect(markup).toContain('<li data-location="tests/fixtures/self.html:22:9">c');
  });
});
