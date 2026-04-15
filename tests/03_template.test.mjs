/* eslint-disable max-len */

import { test } from '@japa/runner';
import { createGenerator } from '@unocss/core';

import { Readable } from 'stream';
import * as td from 'testdouble';
import * as fs from 'fs';
import s from 'tiny-dedent';
import mime from 'mime/lite';

import { Block } from '../src/markup/block.ts';
import { format } from '../src/utils/server.ts';
import { Template } from '../src/templ/main.ts';
import { createTranspiler } from '../src/server/helpers.ts';
import { fixture, render, compile, build, setup, reset } from './helpers/utils.mjs';

fixture.fromFile('templates/transformed/nested/path/to/hello.html');
fixture.fromFile('templates/transformed/nested/path/to/static.html');
fixture.fromFile('templates/transformed/nested/path/to/test.html');
fixture.fromFile('templates/transformed/nested/path/inner.html');
fixture.fromFile('templates/transformed/nested/noop.html');
fixture.fromFile('templates/transformed/router.html');
fixture.fromFile('styling/scoped/basic.html');
fixture.fromFile('templates/transformed/fonts/Bravo.otf');
fixture.fromFile('templates/transformed/nested.html');
fixture.fromFile('templates/transformed/nested/path/module.mjs');
fixture.fromFile('templates/transformed/nested/path/to/transformed.html');
fixture.fromFile('templates/transformed/server.html');
fixture.fromFile('templates/transformed/client.html');
fixture.fromFile('templates/transformed/root.html');
fixture.fromFile('assets/svg/pause-icon.svg');
fixture.fromFile('assets/svg/svg-embed+page.html');
fixture.fromFile('markdown/basic+page.html');
fixture.fromFile('assets/inline/stylesheets+page.html');
fixture.fromFile('forms/directives+page.html');

test.group('template transformation', t => {
  t.each.setup(async () => {
    const Inspect = `
      export const __src = '';
      export const __dest = '';
      export const __styles = [];
      export const __scripts = [];
      export const __doctype = () => ({});
      export const __vdom = () => ['FIXME'];
      export const __metadata = () => [];
      export const __attributes = () => ({});
    `;

    fs.mkdirSync('/tmp/lib', { recursive: true });
    fs.writeFileSync('/tmp/lib/inspect.mjs', Inspect);
    fs.writeFileSync('/tmp/lib/components', 'export * as Inspect from "./inspect.mjs"');

    Template.cache = new Map();
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

    Template.shared = '/tmp';

    const tpl = await build('./templates/transformed/nested/path/to/transformed.html', {
      generators: {
        less: await import('less'),
      },
    });

    expect(tpl.module.enabled).toEqual(false);
    expect(tpl.module.name).toEqual('OSOM');

    expect(tpl.partial.assets.js).toEqual([
      ['x', 'generated/templates/transformed/nested/path/to/transformed(0).js', []],
      ['x', 'generated/templates/transformed/nested/path/to/transformed(1).js', []],
      ['x', 'generated/templates/transformed/nested/path/to/transformed(2).js', []],
    ]);

    const { attrs, meta, html, css, js } = await tpl.render();

    expect(js).toEqual([
      ['x', 'templates/transformed/nested/path/to/transformed(0).js'],
      ['x', 'templates/transformed/nested/path/to/transformed(1).js'],
      ['x', 'templates/transformed/nested/path/to/transformed(2).js'],
    ]);

    expect(css).toEqual(['templates/transformed/nested/path/to/transformed(0).css']);

    expect(Template.read('generated/templates/transformed/nested/path/to/transformed(0).css'))
      .toContain("p:where(.jam-420){color:#ff0;}\n@font-face{font-family:Alpha;src:url('../../../fonts/Bravo.otf');}");

    expect(html).toContain(`<p data-location="templates/transformed/nested/path/to/transformed.html:68:3" class="jam-420">OK: 28</p>
    <span>OSOM</span>
  <h1>It works.</h1><x-fragment name=test interval=60 data-location="templates/transformed/nested/path/to/transformed.html:84:1">
  OSOM: FIXME</x-fragment><h1 data-location="templates/transformed/nested/path/to/hello.html:4:1">Hi, PATEKE.</h1><pre data-location="templates/transformed/nested/path/to/transformed.html:90:1">42</pre>TEST(FIXME)
INNER(FIXME)
NOOP(FIXME)
ROUTER(FIXME)


[HTML: <del data-location="templates/transformed/nested/path/to/static.html:6:1">!!</del>]`);

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
    const tpl = await build('./assets/svg/svg-embed+page.html');
    const { media, html, meta } = await tpl.render();

    expect(meta[3]).toEqual(['link', { rel: 'icon', href: '@/generated/assets/svg/pause-icon.svg' }, []]);

    expect(media).toEqual({
      'assets/svg/svg-embed+page.html': [
        'generated/assets/svg/pause-icon.svg',
      ],
    });

    expect(format(html)).toEqual(s(`
      <embed src="@/generated/assets/svg/pause-icon.svg" />
        <svg data-location="assets/svg/svg-embed+page.html:3:1">
            <path d="M6 4l20 12-20 12z" data-location="assets/svg/svg-embed+page.html:4:3" />
          </svg>
          <svg class=osom data-location="assets/svg/svg-embed+page.html:7:1">
            <use xlink:href="#pause-icon" data-location="generated/assets/svg/pause-icon.svg" />
            </svg>
            <img src="@/generated/assets/svg/pause-icon.svg" data-location="assets/svg/svg-embed+page.html:13:1" />
              <svg width=0 height=0 style="position:absolute" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                <symbol id="pause-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
                  <path d="M4 4h10v24h-10zM18 4h10v24h-10z" />
                  </symbol>
                </svg>
    `).trim());
  });

  test('should render markdown on pages', async ({ expect }) => {
    const tpl = await build('./markdown/basic+page.html', {
      markdown: { emojify: true, twemoji: true },
    });
    const { html } = await tpl.render();

    expect(format(html)).toContain(s(`
      <h1 id="it-works">It works.</h1>
      <ul>
        <li>OSOM</li>
      </ul>
      <b data-location="markdown/basic+page.html:8:1">OK</b>
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
        <blockquote data-location="markdown/basic+page.html:25:1">
            <code data-location="markdown/basic+page.html:26:3">SOME <em>STUFF</em>
        </code>
          <h3 id=osom>OSOM</h3>\n`));

    expect(html).toContain('<img class=emoji draggable=false alt=🍻 ');
    expect(html).toContain('<img class=emoji draggable=false alt=☕ ');
  });

  test('should inline stylesheets', async ({ expect }) => {
    setup();
    process.env.NODE_ENV = 'production';
    const tpl = await build('./assets/inline/stylesheets+page.html');
    const props = await tpl.render();
    reset();

    expect(props.meta.some(_ => _[0] === 'style' && _[1]['@html'])).toBeTruthy();
    expect(props.meta.at(-2)[1]['@html']).toContain('/http___fonts');
  });

  test('should handle @tagged enhancements', async ({ expect }) => {
    const tpl = await build('./forms/directives+page.html');
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
    const tpl = await build('./templates/transformed/server.html');
    const { html } = await tpl.render();

    expect(html).toEqual([
      '<main id=app data-location="templates/transformed/server.html:5:1">',
      '<div data-component="generated/templates/transformed/root.html" class=red data-location="templates/transformed/server.html:6:3" data-on:idle="true">',
      '<section data-location="templates/transformed/root.html:4:1">OSOM</section></div></main>',
    ].join(''));
  });

  test('should scope css-selectors', async ({ expect }) => {
    const tpl = await build('./styling/scoped/basic.html');
    const { html, css } = await tpl.render({ bar: 42 });

    expect(css).toEqual(['styling/scoped/basic(0).css']);

    expect(Template.read('generated/styling/scoped/basic(0).css'))
      .toContain(`p:where(.jam-420){color:red;}
.foo:where(.jam-420){color:green;}
p:where(.jam-420) .foo:where(.jam-420):not(.x){color:yellow;}
p[data-root]:where(.jam-420) .foo:where(.jam-420){color:black;}
ul:where(.jam-420) li span:where(.jam-420){color:pink;}
.name:where(.jam-420){color:purple;`);

    expect(html).toEqual([
      '<p data-root data-location="styling/scoped/basic.html:9:1" class="jam-420">',
      '<span class="foo jam-420" data-location="styling/scoped/basic.html:10:3">OK</span></p>',
      '<ul data-location="styling/scoped/basic.html:12:1" class="jam-420"><li data-location="styling/scoped/basic.html:13:3">',
      '<span class="name 42 jam-420" data-location="styling/scoped/basic.html:13:7">OSOM</span>',
      '<span data-location="styling/scoped/basic.html:13:52" class="jam-420">💣</span></li></ul>',
      '<a data-location="styling/scoped/basic.html:15:1" class="jam-420 name" />',
    ].join(''));
  });

  test('should scope nested css-selectors', async ({ expect }) => {
    const tpl = await build('./templates/transformed/nested.html');
    const { html, css } = await tpl.render();

    expect(css).toEqual(['templates/transformed/nested(0).css', 'templates/transformed/nested(1).css']);

    expect(Template.read('generated/templates/transformed/nested(1).css'))
      .toContain(`@font-face{font-family:Alpha;src:url('./fonts/Bravo.otf');}
@supports (display: flex){.flex-container > *{text-shadow:0 0 2px blue;float:none;}
.flex-container{display:flex;}}
[class]{color:cyan;}`);

    expect(Template.read('generated/templates/transformed/nested(0).css'))
      .toContain(`h1:where(.jam-420){color:blue;}
@media screen and (min-width: 100px){h1:where(.jam-420){color:red;}}`);

    expect(html).toEqual([
      '<h1 data-location="templates/transformed/nested.html:23:1" class="jam-420">OSOM</h1>',
      '<div class="flex-container" data-location="templates/transformed/nested.html:24:1">!</div>',
    ].join(''));
  });

  test('should support css-generators, like unocss', async ({ expect }) => {
    fixture.fromFile('styling/generators/unocss.html');

    const generators = {
      css: await createGenerator({
        rules: [
          ['m-1', { margin: '0.25rem' }],
        ],
      }),
    };

    const tpl = await build('./styling/generators/unocss.html', { generators });
    const { css } = await tpl.render();

    expect(css).toEqual(['styling/generators/unocss.css']);
    expect(Template.read('generated/styling/generators/unocss.css')).toContain('.m-1{margin:0.25rem;}');
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
    const imported = ['generated/templates/transformed/nested/noop.html'];
    const shared = {
      cwd: 'generated',
      generators: {
        less: await import('less'),
      },
    };
    const tpl = fixture.get('./templates/transformed/nested/path/to/transformed.html');
    const mod = new Block(tpl.source, tpl.filepath, shared);
    const mods = await Template.compile((src, file, opts) => new Block(src, file, opts), mod, shared, imported);
    reset();

    expect(mods.map(_ => (_.src ? [_.src, _.dest] : [_.dest]))).toEqual([
      ['templates/transformed/nested/path/to/transformed.html', 'generated/templates/transformed/nested/path/to/transformed.html'],
      ['generated/templates/transformed/nested/path/to/transformed(0).css'],
      ['generated/templates/transformed/nested/path/to/transformed(0).js'],
      ['generated/templates/transformed/nested/path/to/transformed(1).js'],
      ['generated/templates/transformed/nested/path/to/transformed(2).js'],
      ['templates/transformed/nested/path/to/test.html', 'generated/templates/transformed/nested/path/to/test.html'],
      ['templates/transformed/nested/path/inner.html', 'generated/templates/transformed/nested/path/inner.html'],
      ['templates/transformed/router.html', 'generated/templates/transformed/router.html'],
      ['templates/transformed/nested/path/to/hello.html', 'generated/templates/transformed/nested/path/to/hello.html'],
      ['templates/transformed/nested/path/to/static.html', 'generated/templates/transformed/nested/path/to/static.html'],
    ]);
  });

  test('Template.imports', ({ expect }) => {
    setup();
    expect(Template.imports(`
      import from './src/markup/html.ts';
    `, process.cwd())).toEqual({
      'src/chalk.js': {
        children: [],
      },
      'src/markup/html.ts': {
        children: [
          'src/markup/expr.ts',
          'src/utils/server.ts',
          'src/utils/base.ts',
          'src/chalk.js',
          'src/utils/shared.ts',
          'src/render/hooks.ts',
          'src/utils/client.ts',
          'src/markup/adapter.ts',
          'src/markup/utils.ts',
        ],
      },
      'src/markup/expr.ts': {
        children: [
          'src/utils/server.ts',
          'src/utils/base.ts',
          'src/chalk.js',
          'src/utils/shared.ts',
        ],
      },
      'src/utils/server.ts': {
        children: [
          'src/utils/base.ts',
          'src/chalk.js',
          'src/utils/shared.ts',
        ],
      },
      'src/utils/base.ts': {
        children: [],
      },
      'src/utils/shared.ts': {
        children: [],
      },
      'src/markup/adapter.ts': {
        children: [
          'src/utils/server.ts',
          'src/utils/base.ts',
          'src/chalk.js',
          'src/utils/shared.ts',
          'src/markup/expr.ts',
        ],
      },
      'src/markup/utils.ts': {
        children: [
          'src/markup/expr.ts',
          'src/utils/server.ts',
          'src/utils/base.ts',
          'src/chalk.js',
          'src/utils/shared.ts',
          'src/render/hooks.ts',
          'src/utils/client.ts',
        ],
      },
      'src/render/hooks.ts': {
        children: [
          'src/utils/client.ts',
          'src/utils/base.ts',
          'src/utils/shared.ts',
        ],
      },
      'src/utils/client.ts': {
        children: [
          'src/utils/base.ts',
          'src/utils/shared.ts',
        ],
      },
    });
    reset();
  });
});
