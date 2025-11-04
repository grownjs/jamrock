/* eslint-disable max-len */

import { test } from '@japa/runner';
import { createGenerator } from '@unocss/core';

import { Readable } from 'stream';
import * as td from 'testdouble';
import * as fs from 'fs';
import s from 'tiny-dedent';
import mime from 'mime/lite';

import { Block } from '../src/markup/block.mjs';
import { format } from '../src/utils/server.mjs';
import { Template } from '../src/templ/main.mjs';
import { createTranspiler } from '../src/server/helpers.mjs';
import { fixture, render, compile, build, setup, reset } from './helpers/utils.mjs';

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
fixture`./unocss.html
  <p class="m-1" class:m-3=1 class:p-2={false}>OSOM</p>
`;

// eslint-disable-next-line no-unused-expressions
fixture`./fonts/Bravo.otf
  FONT
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
      src: url('./fonts/Bravo.otf');
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
fixture`./nested/path/module.mjs
  export const truth = 42;
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
    <script scoped>
      import { truth } from '../module.mjs';
      console.log({ self, truth });
    </script>

    <script type="module">
      import kindOf from 'kind-of';
      console.log({ kindOf });
    </script>

    <script>
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

  <!-- special tags -->
  {@html markup}
  {@html ['h1', Object.fromEntries([]), 'It works.']}

  <style lang="less">
    @red: #ff0;
    p { color: @red; }
    @font-face {
      font-family: Alpha;
      src: url('../../../fonts/Bravo.otf');
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

// eslint-disable-next-line no-unused-expressions
fixture`./server.html
  <script>
    import Client from './client.html';
    const data = [1,2,3];
  </script>
  <main id="app">
    <Client {data} class="red" on:idle>OSOM</Client>
  </main>
`;

// eslint-disable-next-line no-unused-expressions
fixture`./client.html
  <script context="client">
    import Root from './root.html';
    export let data = [];
  </script>
  <Root>{@render $$props.children?.()}</Root>
`;

// eslint-disable-next-line no-unused-expressions
fixture`./root.html
  <script>
    export let children;
  </script>
  <section>{@render children?.()}</section>
`;

// eslint-disable-next-line no-unused-expressions
fixture`./pause-icon.svg
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
    <path d="M4 4h10v24h-10zM18 4h10v24h-10z" />
  </svg>
`;

// eslint-disable-next-line no-unused-expressions
fixture`./resources+page.html
  <embed src="pause-icon.svg" />

  <svg>
    <path d="M6 4l20 12-20 12z" />
  </svg>

  <svg src="./pause-icon.svg" class="osom" />

  <head>
    <link rel="icon" href="pause-icon.svg" />
  </head>

  <img src="pause-icon.svg" />
`;

// eslint-disable-next-line no-unused-expressions
fixture`./markdown+page.html
  <script>
    const value = 'OSOM';
  </script>

  # It works.
  - {value}

  <b>OK</b>

  ## sub
  - other

  &lt;WUT&gt;

  CODE:

  \`\`\`
  ■ Jamrock v#[pkg.version] (node {process.version})
  Processing ./pages to ./build
  Listening on <a href="http://localhost:8080" target="_blank">http://localhost:8080</a>
  \`\`\`

  TEXT

  <blockquote>
    <mkd tag="code">SOME _STUFF_</mkd>
    <mkd>
      ### OSOM
    </mkd>
  </blockquote>

  Test for emojis:
  - One is :beers:
  - Two is :coffee:
`;

// eslint-disable-next-line no-unused-expressions
fixture`./inlines+page.html
  <head>
    <link rel="stylesheet" href="//unpkg.com/highlight.js@10.7.3/styles/tomorrow.css" inline />
    <link rel="stylesheet" href="//fonts.googleapis.com/css?family=Montserrat" inline />
  </head>
`;

// eslint-disable-next-line no-unused-expressions
fixture`./directives+page.html
  <form @multipart>
    <textarea value="<h1>It works</h1>" />
    <select value="42">
      <option>42</option>
      <option>-1</option>
    </select>
    <button test:id="btn">Click me</button>
  </form>
  <form @async />
  <form @put />
  <form @post />
  <form @patch />
  <form @delete />
`;

test.group('template transformation', t => {
  t.each.setup(async () => {
    const Inspect = {
      __src: '',
      __dest: '',
      __styles: [],
      __scripts: [],
      __doctype: () => ({}),
      __template: () => ['FIXME'],
      __metadata: () => [],
      __attributes: () => ({}),
    };

    function loader() {
      return { Inspect };
    }

    Template.cache = new Map();
    td.replace(Template, 'load', loader);
    td.replace(Template, 'read', x => fs.readFileSync(x).toString());
    td.replace(Template, 'file', x => new Blob([fs.readFileSync(x)], { name: x, type: mime.getType(x) }));
    td.replace(Template, 'exists', x => fs.existsSync(x) && fs.statSync(x).isFile());
    td.replace(Template, 'transpile', createTranspiler({ fs, Readable, getESbuildModule: () => import('esbuild') }));
  });
  t.each.teardown(() => {
    delete Template.cache;
    process.debug = 0;
    td.reset();
  });

  test('should compile recursively to ESM', async ({ expect }) => {
    td.replace(Math, 'random', () => 1);
    td.replace(Date, 'now', () => 0);

    const tpl = await build('./nested/path/to/transformed.html', {
      generators: {
        less: await import('less'),
      },
    });

    expect(tpl.module.enabled).toEqual(false);
    expect(tpl.module.name).toEqual('OSOM');

    expect(tpl.partial.assets.js).toEqual([
      ['x', 'generated/nested/path/to/transformed(0).js', [
        'generated/nested/path/to/generated/nested/path/module.mjs',
      ]],
      ['x', 'generated/nested/path/to/transformed(1).js', []],
      ['x', 'generated/nested/path/to/transformed(2).js', []],
    ]);

    const { attrs, meta, html, css, js } = await tpl.render();

    expect(js).toEqual([
      ['x', 'nested/path/to/transformed(0).js'],
      ['x', 'nested/path/to/transformed(1).js'],
      ['x', 'nested/path/to/transformed(2).js'],
    ]);

    expect(css).toEqual(['nested/path/to/transformed(0).css']);

    expect(Template.read('generated/nested/path/to/transformed(0).css'))
      .toContain('p:where(.jam-420){color:#ff0;}\n@font-face{font-family:Alpha;src:url(generated/fonts/Bravo.otf);}');

    expect(html).toContain(`<p data-location="nested/path/to/transformed.html:68:3" class="jam-420">OK: 28</p>
    <span>OSOM</span>
  <h1>It works.</h1><x-fragment name=test interval=60 data-location="nested/path/to/transformed.html:84:1">
  OSOM: FIXME</x-fragment><h1 data-location="nested/path/to/hello.html:4:1">Hi, PATEKE.</h1><pre data-location="nested/path/to/transformed.html:90:1">42</pre>TEST(FIXME)
INNER(FIXME)
NOOP(FIXME)
ROUTER(FIXME)


[HTML: <del data-location="nested/path/to/static.html:6:1">!!</del>]`);

    expect({ attrs, meta }).toEqual({
      attrs: { class: 'main x-42', '@ref': 'x' },
      meta: [
        ['meta', { charset: 'utf-8' }],
        ['base', { href: '/' }],
        ['title', {}, ['Untitled "', '42', '"']],
      ],
    });
  });

  test('should collect assets from components', async ({ expect }) => {
    const tpl = await build('./resources+page.html');
    const { media, html, meta } = await tpl.render();

    expect(meta[3]).toEqual(['link', { rel: 'icon', href: '@/generated/pause-icon.svg' }, []]);

    expect(media).toEqual({
      'resources+page.html': [
        'generated/pause-icon.svg',
      ],
    });

    expect(format(html)).toEqual(s(`
      <embed src="@/generated/pause-icon.svg" />
        <svg data-location="resources+page.html:3:1">
            <path d="M6 4l20 12-20 12z" data-location="resources+page.html:4:3" />
          </svg>
          <svg class=osom data-location="resources+page.html:7:1">
            <use xlink:href="#pause-icon" data-location="generated/pause-icon.svg" />
            </svg>
            <img src="@/generated/pause-icon.svg" data-location="resources+page.html:13:1" />
              <svg width=0 height=0 style="position:absolute" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                <symbol id="pause-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
                  <path d="M4 4h10v24h-10zM18 4h10v24h-10z" />
                  </symbol>
                </svg>
    `).trim());
  });

  test('should render markdown on pages', async ({ expect }) => {
    const tpl = await build('./markdown+page.html', { emojify: true, twemoji: true });
    const { html } = await tpl.render();

    expect(format(html)).toContain(s(`
      <h1 id="it-works">It works.</h1>
      <ul>
        <li>OSOM</li>
      </ul>
      <b data-location="markdown+page.html:8:1">OK</b>
      <h2 id=sub>sub</h2>
      <ul>
        <li>other</li>
      </ul>
      <p>&lt;WUT&gt;</p>
      <p>CODE:</p>
      <pre class=hljs>
        <code>■ Jamrock v#[pkg.version] (node &lbrace;process.version&rbrace;)
          Processing ./pages to ./build
            Listening on <a href="http://localhost:8080" target="_blank">http://localhost:8080</a>
          </code>
        </pre>
        <p>TEXT</p>
        <blockquote data-location="markdown+page.html:26:1">
            <code data-location="markdown+page.html:27:3">SOME <em>STUFF</em>
        </code>
          <h3 id=osom>OSOM</h3>\n`));

    expect(html).toContain('<img class=emoji draggable=false alt=🍻 ');
    expect(html).toContain('<img class=emoji draggable=false alt=☕ ');
  });

  test('should inline stylesheets', async ({ expect }) => {
    setup();
    process.env.NODE_ENV = 'production';
    const tpl = await build('./inlines+page.html');
    const props = await tpl.render();
    reset();

    expect(props.meta.some(_ => _[0] === 'style' && _[1]['@html'])).toBeTruthy();
    expect(props.meta.at(-2)[1]['@html']).toContain('/http___fonts');
  });

  test('should handle @tagged enhancements', async ({ expect }) => {
    const tpl = await build('./directives+page.html');
    const { html } = await tpl.render();

    expect(html).toContain('enctype="multipart/form-data" method=POST');
    expect(html).toContain('&lt;h1&gt;It works&lt;/h1&gt;</textarea>');
    expect(html).toContain('<option selected>42</option>');
    expect(html).toContain('<button data-test:id="btn"');
    expect(html).toContain('<form data-async');
    expect(html).toContain('<input type=hidden name="_method" value=PUT /></form>');
    expect(html).toContain('<input type=hidden name="_method" value=PATCH /></form>');
    expect(html).toContain('<input type=hidden name="_method" value=DELETE /></form>');
  });

  test('should manage server/client components', async ({ expect }) => {
    const tpl = await build('./server.html');
    const { html } = await tpl.render();

    expect(html).toEqual([
      '<main id=app data-location="server.html:5:1">',
      '<div data-component="generated/root.html" class=red data-location="server.html:6:3" data-on:idle="true">',
      '<section data-location="root.html:4:1">OSOM</section></div></main>',
    ].join(''));
  });

  test('should scope css-selectors', async ({ expect }) => {
    const tpl = await build('./scoping.html');
    const { html, css } = await tpl.render({ bar: 42 });

    expect(css).toEqual(['scoping(0).css']);

    expect(Template.read('generated/scoping(0).css'))
      .toContain(`p:where(.jam-420){color:red;}
.foo:where(.jam-420){color:green;}
p:where(.jam-420) .foo:where(.jam-420):not(.x){color:yellow;}
p[data-root]:where(.jam-420) .foo:where(.jam-420){color:black;}
ul:where(.jam-420) li span:where(.jam-420){color:pink;}
.name:where(.jam-420){color:purple;}`);

    expect(html).toEqual([
      '<p data-root data-location="scoping.html:9:1" class="jam-420">',
      '<span class="foo jam-420" data-location="scoping.html:10:3">OK</span></p>',
      '<ul data-location="scoping.html:12:1" class="jam-420"><li data-location="scoping.html:13:3">',
      '<span class="name 42 jam-420" data-location="scoping.html:13:7">OSOM</span>',
      '<span data-location="scoping.html:13:52" class="jam-420">💣</span></li></ul>',
      '<a data-location="scoping.html:15:1" class="jam-420 name" />',
    ].join(''));
  });

  test('should scope nested css-selectors', async ({ expect }) => {
    const tpl = await build('./nested.html');
    const { html, css } = await tpl.render();

    expect(css).toEqual(['nested(0).css', 'nested(1).css']);

    expect(Template.read('generated/nested(1).css'))
      .toContain(`@font-face{font-family:Alpha;src:url(generated/fonts/Bravo.otf);}
@supports (display: flex){.flex-container > *{text-shadow:0 0 2px blue;float:none;}
.flex-container{display:flex;}}
[class]{color:cyan;}`);

    expect(Template.read('generated/nested(0).css'))
      .toContain(`h1:where(.jam-420){color:blue;}
@media screen and (min-width: 100px){h1:where(.jam-420){color:red;}}`);

    expect(html).toEqual([
      '<h1 data-location="nested.html:23:1" class="jam-420">OSOM</h1>',
      '<div class="flex-container" data-location="nested.html:24:1">!</div>',
    ].join(''));
  });

  test('should support css-generators, like unocss', async ({ expect }) => {
    const generators = {
      css: await createGenerator({
        rules: [
          ['m-1', { margin: '0.25rem' }],
        ],
      }),
    };

    const tpl = await build('./unocss.html', { generators });
    const { css } = await tpl.render();

    expect(css).toEqual(['unocss.css']);
    expect(Template.read('generated/unocss.css')).toContain('.m-1{margin:0.25rem;}');
  });
});

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
    const checks = [
      ['{#each a ? b : c as _}{/each}'],
      ['{#each a ? b : c}{/each}'],
      ['{#each users< as u}{/each}', "Unexpected token '<' at source.html:1:13"],
      ['{#each valid as u!}{/each}', "Unexpected token '!' at source.html:1:18"],
      ['{stuff"}', 'Invalid or unexpected token at source.html:1:7'],
      ['{stuff!}', "Unexpected token '!' at source.html:1:7"],
      ['{(1,2])}', "Unexpected token ']' at source.html:1:6"],
      ['{[[,]}', "Unexpected token ']' at source.html:1:5"],
      ['{a..b}', "Unexpected token '.' at source.html:1:3"],
      ['{@html 42}'],
    ];

    for (const [code, err] of checks) {
      const tpl = await compile(code);
      if (err) {
        expect(tpl.failure.stack).toContain(err);
      } else {
        expect(tpl.failure).toBeUndefined();
      }
    }
  });
});

test.group('core utilties', t => {
  t.each.setup(() => {
    td.replace(Template, 'exists', x => fs.existsSync(x) && fs.statSync(x).isFile());
  });
  t.each.teardown(() => {
    td.reset();
  });

  test('Template.load', async ({ expect }) => {
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

  test('Template.join', ({ expect }) => {
    expect(Template.join('/a/b/c', './d')).toEqual('/a/b/c/d');
    expect(Template.join('/a/b/c/', './d')).toEqual('/a/b/c/d');
    expect(Template.join('/a/b/c/', '../d')).toEqual('/a/b/d');
    expect(Template.join('/a/b/c/', '../../d')).toEqual('/a/d');
    expect(Template.join('/a/b/c', '../../../d')).toEqual('/d');
    expect(Template.join('/a/b/c/', '../../../../d')).toEqual('/d');

    const sample = './stores.mjs';
    const source = 'examples/login+page.html';
    const target = 'build/examples/login+page.generated.mjs';

    const a = Template.join(Template.dirname(source), sample);
    const b = Template.join(Template.dirname(target), sample);
    const c = Template.relative(b, a);

    expect(a).toEqual('examples/stores.mjs');
    expect(b).toEqual('build/examples/stores.mjs');
    expect(c).toEqual('../../examples/stores.mjs');
  });

  test('Template.path', ({ expect }) => {
    td.replace(Template, 'exists');
    td.when(Template.exists('node_modules/jamrock/package.json')).thenReturn(true);

    expect(Template.path('node:util')).toEqual('node:util');
    expect(Template.path('jamrock:components')).toEqual('jamrock:components');
  });

  test('Template.dirname', ({ expect }) => {
    expect(Template.dirname('a/b/c')).toEqual('a/b');
  });

  test('Template.compile', async ({ expect }) => {
    setup();
    const imported = ['generated/nested/noop.html'];
    const shared = {
      cwd: 'generated',
      generators: {
        less: await import('less'),
      },
    };
    const tpl = fixture.get('./nested/path/to/transformed.html');
    const mod = new Block(tpl.source, tpl.filepath, shared);
    const mods = await Template.compile((src, file, opts) => new Block(src, file, opts), mod, shared, imported);
    reset();

    expect(mods.map(_ => (_.src ? [_.src, _.dest] : [_.dest]))).toEqual([
      ['nested/path/to/transformed.html', 'generated/nested/path/to/transformed.html'],
      ['generated/nested/path/to/transformed(0).js'],
      ['generated/nested/path/to/transformed(1).js'],
      ['generated/nested/path/to/transformed(2).js'],
      ['generated/nested/path/to/transformed(0).css'],
      ['nested/path/to/test.html', 'generated/nested/path/to/test.html'],
      ['nested/path/inner.html', 'generated/nested/path/inner.html'],
      // ['nested/noop.html', 'generated/nested/noop.html'],
      ['router.html', 'generated/router.html'],
      ['nested/path/to/hello.html', 'generated/nested/path/to/hello.html'],
      ['nested/path/to/static.html', 'generated/nested/path/to/static.html'],
    ]);
  });

  test('Template.imports', ({ expect }) => {
    setup();
    expect(Template.imports(`
      import from './src/markup/html.mjs';
    `, process.cwd())).toEqual({
      'src/markup/html.mjs': {
        children: [
          'src/markup/expr.mjs',
          'src/utils/server.mjs',
          'src/utils/base.mjs',
          'src/utils/shared.mjs',
          'src/render/hooks.mjs',
          'src/utils/client.mjs',
          'src/markup/adapter.mjs',
          'src/markup/utils.mjs',
        ],
      },
      'src/markup/expr.mjs': {
        children: [
          'src/utils/server.mjs',
          'src/utils/base.mjs',
          'src/utils/shared.mjs',
        ],
      },
      'src/utils/server.mjs': {
        children: [
          'src/utils/base.mjs',
          'src/utils/shared.mjs',
        ],
      },
      'src/utils/base.mjs': {
        children: [],
      },
      'src/utils/shared.mjs': {
        children: [],
      },
      'src/markup/adapter.mjs': {
        children: [
          'src/utils/server.mjs',
          'src/utils/base.mjs',
          'src/utils/shared.mjs',
          'src/markup/expr.mjs',
        ],
      },
      'src/markup/utils.mjs': {
        children: [
          'src/markup/expr.mjs',
          'src/utils/server.mjs',
          'src/utils/base.mjs',
          'src/utils/shared.mjs',
          'src/render/hooks.mjs',
          'src/utils/client.mjs',
        ],
      },
      'src/render/hooks.mjs': {
        children: [
          'src/utils/client.mjs',
          'src/utils/base.mjs',
          'src/utils/shared.mjs',
        ],
      },
      'src/utils/client.mjs': {
        children: [
          'src/utils/base.mjs',
          'src/utils/shared.mjs',
        ],
      },
    });
    reset();
  });
});
