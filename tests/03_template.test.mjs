/* eslint-disable max-len */

// import { runInNewContext } from 'vm';
import { test } from '@japa/runner';
// import { createGenerator } from '@unocss/core';

import * as td from 'testdouble';
import * as path from 'path';
import * as fs from 'fs';

// import { load, render, flatten } from './helpers/utils.mjs';

import { Template } from '../src/templ/main.mjs';
import { createTranspiler } from '../src/server/shared.mjs';
import { fixture, render, compile, build } from './helpers/utils.mjs';
// import { highlight, stringify } from '../src/templ/utils.mjs';

// eslint-disable-next-line no-unused-expressions
fixture`./nested/path/to/hello.html
  <script>
    export let name;
  </script>
  <h1>Hi, {name}.</h1>
`;

// eslint-disable-next-line no-unused-expressions
fixture`./nested/path/to/static.html
  <head>
    <meta charset="{$$props.charset || 'utf8'}" />
    <link rel="stylesheet" href="style.css" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <element tag="{$$props.random > 0.5 ? 'em' : 'del'}">
    {@render $$props.children?.()}
  </element>
`;

// eslint-disable-next-line no-unused-expressions
fixture`./nested/path/to/test.html
  TEST({@render $$props.children?.()})
`;

// eslint-disable-next-line no-unused-expressions
fixture`./nested/path/inner.html
  INNER({@render $$props.children?.()})
`;

// eslint-disable-next-line no-unused-expressions
fixture`./nested/noop.html
  NOOP({@render $$props.children?.()})
`;

// eslint-disable-next-line no-unused-expressions
fixture`./router.html
  ROUTER({@render $$props.children?.()})
`;

// eslint-disable-next-line no-unused-expressions
fixture`./scoping.html
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
    <li><span class="name {$$props.bar}">OSOM</span> <span>💣</span></li>
  </ul>
  <a class:name={1} />
`;

// eslint-disable-next-line no-unused-expressions
fixture`./nested.html
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
`;

// eslint-disable-next-line no-unused-expressions
fixture`./nested/path/to/transformed.html
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

    export let ms = 60;
    export let value = 42;

    export const markup = \`
      <span>\${name}</span>
    \`;

    export function sum(a, b) {
      return a + b;
    }

    export default {
      as: 'Example',
      use: ['web'],
      routes: {
        ['GET /fail']: shouldFail,
      },
    };

    const props = {};
  </script>

  <html lang="es-MX" />

  <body class="main x-{value}">
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
    <p {...props}>OK: {value / 1.5}</p>
  {/if}

  <!-- directives -->
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

  [HTML: <Markup>!!</Markup>]
`;

test.group('template transformation', t => {
  t.each.setup(async () => {
    const Inspect = {
      __template() {
        return () => ['FIXME'];
      },
    };

    function loader() {
      return { Inspect };
    }

    Template.cache = new Map();
    td.replace(Template, 'load', loader);
    td.replace(Template, 'read', x => fs.readFileSync(x).toString());
    td.replace(Template, 'exists', x => fs.existsSync(x) && fs.statSync(x).isFile());
    td.replace(Template, 'transpile', createTranspiler({ createMortero: () => import('mortero'), path }));
  });
  t.each.teardown(() => {
    delete Template.cache;
    process.debug = 0;
    td.reset();
  });

  test('should compile recursively to ESM', async ({ expect }) => {
    const tpl = await build('./nested/path/to/transformed.html');

    expect(tpl.module.enabled).toEqual(false);
    expect(tpl.module.name).toEqual('OSOM');

    td.replace(Math, 'random', () => 1);

    const { attrs, meta, html, css } = await tpl.render();

    expect(css).toEqual(`p:where(.jam-420){color:#ff0;}
@font-face{font-family:Alpha;src:url('../Bravo.otf');}`);

    expect(html).toContain(`<p data-location="nested/path/to/transformed.html:67:3" class="jam-420">OK: 28</p>
    <span>OSOM</span>
  <h1>It works.</h1><x-fragment name=test interval=60 data-location="nested/path/to/transformed.html:83:1">
  OSOM: FIXME</x-fragment><h1 data-location="nested/path/to/hello.html:4:1">Hi, PATEKE.</h1><pre data-location="nested/path/to/transformed.html:89:1">42</pre>TEST(FIXME)
INNER(FIXME)
NOOP(FIXME)
ROUTER(FIXME)


[HTML: <element tag=del data-location="nested/path/to/static.html:6:1">!!</element>]`);

    expect({ attrs, meta }).toEqual({
      attrs: { class: 'main x-42' },
      meta: [
        ['title', {}, ['Untitled "', '42', '"']],
      ],
    });
  });

  test('should scope css-selectors', async ({ expect }) => {
    const tpl = await build('./scoping.html');
    const { html, css } = await tpl.render({ bar: 42 });

    expect(css).toEqual([
      'p:where(.jam-420){color:red;}',
      '.foo:where(.jam-420){color:green;}',
      'p:where(.jam-420) .foo:where(.jam-420):not(.x){color:yellow;}',
      'p[data-root]:where(.jam-420) .foo:where(.jam-420){color:black;}',
      'ul:where(.jam-420) li span:where(.jam-420){color:pink;}',
      '.name:where(.jam-420){color:purple;}',
    ].join('\n'));

    expect(html).toEqual([
      '<p data-root data-location="scoping.html:9:1" class="jam-420">',
      '<span class="foo jam-420" data-location="scoping.html:10:3">OK</span></p>',
      '<ul data-location="scoping.html:12:1" class="jam-420"><li data-location="scoping.html:13:3">',
      '<span class="name 42 jam-420" data-location="scoping.html:13:7">OSOM</span>',
      '<span data-location="scoping.html:13:52" class="jam-420">💣</span></li></ul>',
      '<a class:name="1" data-location="scoping.html:15:1" class="jam-420"></a>',
    ].join(''));
  });

  test('should scope nested css-selectors', async ({ expect }) => {
    const tpl = await build('./nested.html');
    const { html, css } = await tpl.render();

    expect(css).toEqual([
      'h1:where(.jam-420){color:blue;}',
      '@media screen and (min-width: 100px)',
      'h1:where(.jam-420){color:red;}',
      "@font-face{font-family:Alpha;src:url('../Bravo.otf');}",
      '@supports (display: flex)',
      '.flex-container > *{text-shadow:0 0 2px blue;float:none;}',
      '.flex-container{display:flex;}',
      '[class]{color:cyan;}',
    ].join('\n'));

    expect(html).toEqual([
      '<h1 data-location="nested.html:23:1" class="jam-420">OSOM</h1>',
      '<div class="flex-container" data-location="nested.html:24:1">!</div>',
    ].join(''));
  });
});

//    test('skip: skip: should provide support for css-generators, like unocss', async ({ expect }) => {
//      const generators = {
//        css: createGenerator({
//          rules: [
//            ['m-1', { margin: '0.25rem' }],
//          ],
//        }),
//      };

//      const [head] = await get('tests/fixtures/stylesheets.html', `
//        <p class="m-1" class:m-3=1 class:p-2={false}>OSOM</p>
//      `, { generators });

//      const mod = await load(null, head);
//      const result = await Template.execute(mod, 'generated/tpl.cjs');
//      const markup = stringify(result);

//      expect(markup).toContain('/* tests/fixtures/stylesheets.html */\n.m-1{margin:0.25rem;}');
//    });
// });

test.group('parse and runtime errors', () => {
  test('should trace runtime-errors', async ({ expect }) => {
    const tpl = await compile(`
      {#each users as u}
        <p>{u.name} {undef}</p>
      {/each}
    `, { props: ['users'] });

    await render(tpl, { users: [{ name: 'foo' }] });

    expect(tpl.failure.name).toEqual('ReferenceError');
    expect(tpl.failure.stack).toContain('\n⚠    3 |         <p>{u.name} {undef}</p>\n');
    expect(tpl.failure.stack).toContain('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^\n');
    expect(tpl.failure.message).toEqual('undef is not defined');
  });

  test('should trace parse-errors', async ({ expect }) => {
    const tpl = await compile(`
      {#each users< as u}
        ...
      {/each}
    `);

    expect(tpl.failure.name).toEqual('SyntaxError');
    expect(tpl.failure.stack).toContain('\n⚠    2 |       {#each users< as u}\n');
    expect(tpl.failure.stack).toContain('\n~~~~~~~~~~~~~~~^\n');
    expect(tpl.failure.message).toEqual('Invalid syntax found');
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
    const cwd = process.cwd();

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

test.group('core utilities', t => {
  t.each.teardown(() => {
    td.reset();
  });

  test('Template.join', ({ expect }) => {
    expect(Template.join('a/b/c', '../../d')).toEqual('a/d');
    expect(Template.join('a/b/c', '../../../d')).toEqual('d');
    expect(Template.join('a/b/c', '../../../../d')).toEqual('../d');
  });

  test('Template.path', ({ expect }) => {
    td.replace(Template, 'exists');
    td.when(Template.exists('tests/fixtures/sample/index.cjs')).thenReturn(true);
    td.when(Template.exists('tests/fixtures/hello.html')).thenReturn(true);
    td.when(Template.exists('tests/fixtures/hello.mjs')).thenReturn(true);
    td.when(Template.exists('tests/fixtures/id.js')).thenReturn(true);
    td.when(Template.exists('router.html')).thenReturn(true);
    td.when(Template.exists('noop/index.mjs')).thenReturn(true);
    td.when(Template.exists('node_modules/jamrock/package.json')).thenReturn(true);

    expect(Template.path('node:util', 'tests/fixtures/transformed.html')).toEqual('node:util');
    expect(Template.path('jamrock:components', 'tests/fixtures/transformed.html')).toEqual('jamrock:components');
    expect(Template.path('./hello.html', 'tests/fixtures/transformed.html')).toEqual('tests/fixtures/hello.html');
    expect(Template.path('./hello', 'tests/fixtures/transformed.html')).toEqual('tests/fixtures/hello.mjs');
    expect(Template.path('../../noop', 'tests/fixtures/transformed.html')).toEqual('noop/index.mjs');
    expect(Template.path('../../../router.html', 'tests/fixtures/transformed.html')).toEqual('router.html');
    expect(Template.path('~/tests/fixtures/id', 'tests/fixtures/transformed.html')).toEqual('tests/fixtures/id.js');
    expect(Template.path('~/tests/fixtures/sample', 'tests/fixtures/bundle.html', 'generated/tpl.cjs')).toEqual('tests/fixtures/sample/index.cjs');
  });

  test('Template.dirname', ({ expect }) => {
    expect(Template.dirname('a/b/c')).toEqual('a/b');
  });
});

//  test.group('compiler support', t => {
//    t.each.setup(() => {
//      td.replace(Template, 'read', x => fs.readFileSync(x).toString());
//      td.replace(Template, 'read', x => fs.readFileSync(x).toString());
//      td.replace(Template, 'exists', x => fs.existsSync(x) && fs.statSync(x).isFile());
//      td.replace(Template, 'transpile', createTranspiler({ createMortero: () => import('mortero'), path }));
//    });
//    t.each.teardown(() => {
//      td.reset();
//    });

//    test('skip: skip: should return compiled templates', async ({ expect }) => {
//      const [head, ...tail] = await get('tests/fixtures/components.html');

//      const ctx = { template: Template.read(head.src) };

//      Template.cache = new Map();

//      for (let i = 0; i < tail.length; i += 1) {
//        Template.cache.set(tail[i].src, {
//          module: await load(null, tail[i]),
//        });
//      //}

//      const main = await load(null, head);
//      const result = await Template.execute(main, 'generated/tpl.cjs', ctx);
//      const markup = stringify(result);

//      expect(markup).toContain('Hi, Hank.');
//    });

//    test('skip: skip: should handle self within fragments', async ({ expect }) => {
//      const [head] = await get('tests/fixtures/self.html');
//      const ctx = { template: Template.read(head.src), socket: false };

//      const main = await load(null, head);
//      const result = await Template.execute(main, 'generated/tpl.cjs', ctx);
//      const markup = stringify(result);

//      expect(markup).toContain('<x-fragment name="tests/fixtures/self.html/1/re" key="x:0" data-location="tests/fixtures/self.html:20:5">');
//      expect(markup).toContain('<x-fragment name="tests/fixtures/self.html/2/re" key="x:0.1" data-location="tests/fixtures/self.html:20:5">');
//      expect(markup).toContain('<x-fragment name="tests/fixtures/self.html/3/re" key="x:0.1.2" data-location="tests/fixtures/self.html:20:5">');
//      expect(markup).toContain('<li data-location="tests/fixtures/self.html:22:9">a');
//      expect(markup).toContain('<li data-location="tests/fixtures/self.html:22:9">b');
//      expect(markup).toContain('<li data-location="tests/fixtures/self.html:22:9">c');
//    });
// });
