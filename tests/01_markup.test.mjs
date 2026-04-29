/* eslint-disable max-len */

import { test } from '@japa/runner';
import * as td from 'testdouble';

import { Block } from '../src/markup/index.ts';
import { Expr } from '../src/markup/expr.ts';
import { Is } from '../src/utils/server.ts';

function load(code, file) {
  return new Block(code, file || 'test.html');
}

test.group('vnodes', () => {
  test('should invalidate lists of scalars', ({ expect }) => {
    expect(Is.vnode()).toBeFalsy();
    expect(Is.vnode([])).toBeFalsy();
    expect(Is.vnode(1)).toBeFalsy();
    expect(Is.vnode({})).toBeFalsy();
    expect(Is.vnode(true)).toBeFalsy();

    expect(Is.vnode(['h1'])).toBeFalsy();
    expect(Is.vnode(['h1', null])).toBeFalsy();
    expect(Is.vnode(['h1', undefined])).toBeFalsy();
  });

  test('should validate if first argument is an object', ({ expect }) => {
    expect(Is.vnode(['h1', {}])).toBeTruthy();
    expect(Is.vnode(['h1', Function])).toBeFalsy();
    expect(Is.vnode(['h1', Object.create(null)])).toBeTruthy();
  });
});

test.group('Expr', () => {
  test('should validate given expressions', ({ expect }) => {
    expect(Expr.has('')).toBeFalsy();
    expect(Expr.has('{x}')).toBeTruthy();
    expect(Expr.has('{x}?')).toBeTruthy();
    expect(Expr.has('{{x}}', true)).toBeFalsy();
  });

  test('should wrap given expressions', ({ expect }) => {
    expect(Expr.from('{1+2}').wrap()).toEqual('$$.$(1+2)');
    expect(Expr.from('{"abc"}').wrap()).toEqual('$$.$("abc")');

    expect(Expr.from('{1+2}').append('3').wrap('')).toEqual('$$.$(1+2)\n,$$.$(3)');
    expect(Expr.from('{1+2}').append('3').wrap('', false)).toEqual('1+2\n+3');

    expect(Expr.from('{1+2}').concat('3').wrap('')).toEqual('$$.$(1+2)\n,"3"');
    expect(Expr.from('{1+2}').concat('3').wrap('', false)).toEqual('1+2\n+"3"');
  });

  test('should handle object-merge syntax', ({ expect }) => {
    expect(Expr.props({
      $: Expr.from('...x').append('...y'),
    }, '')).toEqual('\n...x\n,...y,');
  });

  test('should parse and compile snippets', ({ expect }) => {
    expect(Expr.from('{#snippet sum(a, b)}')).toEqual({
      args: ['a', 'b'],
      block: true,
      expr: ['{#snippet sum(a, b)}'],
      name: 'sum',
      open: true,
      raw: [],
      tag: '#snippet',
    });
  });

  test('should parse and compile conditionals', ({ expect }) => {
    expect(Expr.unwrap('[{value}]').expr).toEqual([
      { type: 'text', content: '[' },
      { type: 'code', content: Expr.from('{value}') },
      { type: 'text', content: ']' },
    ]);
    expect(Expr.unwrap('[{#if true}1{:else}2{/if}]').expr).toEqual([
      { type: 'text', content: '[' },
      { type: 'code', content: Expr.from('{#if true}') },
      { type: 'text', content: '1' },
      { type: 'code', content: Expr.from('{:else}') },
      { type: 'text', content: '2' },
      { type: 'code', content: Expr.from('{/if}') },
      { type: 'text', content: ']' },
    ]);
    expect(Expr.unwrap('[{#each [1, 2] as i}[{i}]{/each}]').expr).toEqual([
      { type: 'text', content: '[' },
      { type: 'code', content: Expr.from('{#each [1, 2] as i}') },
      { type: 'text', content: '[' },
      { type: 'code', content: Expr.from('{i}') },
      { type: 'text', content: ']' },
      { type: 'code', content: Expr.from('{/each}') },
      { type: 'text', content: ']' },
    ]);
  });

  test('should validate blocks', ({ expect }) => {
    expect(() => load(`<p>x<p>
      {#if true}
        <p>{m.n}</p>
      {/if}
    `, 'invalid.html')).toThrow(/Unexpected '\/if' after 3:21/);

    expect(() => load(`
      {#snippet valid()}
        {#snippet nested()}
          INVALID
        {/snippet}
      {/snippet}
    `, 'invalid-snippets.html')).toThrow(/Unexpected snippet/);

    expect(() => load(`
      {#snippet valid()}
        INVALID
      {/each}
    `, 'invalid-snippets.html')).toThrow(/Unexpected '\/each'/);

    expect(() => load(`
      {#each [1, 2, 3]}
        INVALID
      {/if}
    `, 'invalid-snippets.html')).toThrow(/Unexpected '\/if'/);
  });
});

test.group('parsing', t => {
  t.each.setup(() => {
    td.replace(Math, 'random', () => 0.0001);
    td.replace(Date, 'now', () => 0);
  });
  t.each.teardown(td.reset);

  const script = s => Block.script(s, false, '/path/to');

  test('should rewrite exports', ({ expect }) => {
    const code = Block.exports(`
      let messages = [];
      let classes = [];
      export {
        messages as from,
        classes as class,
      };
    `);

    expect(code).toContain('messages = $$props.from ?? messages;');
    expect(code).toContain('classes = $$props.class ?? classes;');
  });

  test('should rewrite imports', ({ expect }) => {
    expect(script(`
      import {
        a as foo, bar
      } from 'jamrock:stuff';
`)).toEqual({
      prelude: "\n      import  {\n        a as foo, bar\n      }  from '/path/to/lib/stuff';",
      interlude: '\n',
    });

    expect(script(`
      import { existsSync, unlinkSync } from 'node:fs';
`)).toEqual({
      prelude: "\n      import { existsSync, unlinkSync } from 'node:fs';",
      interlude: '\n',
    });
  });

  test('should rewrite scripts', ({ expect }) => {
    expect(script(`
      import * as nohooks from 'nohooks';
`)).toEqual({
      prelude: "\n      import * as nohooks from 'nohooks';",
      interlude: '\n',
    });

    expect(script("import { signal } from 'jamrock';")).toEqual({
      prelude: '',
      interlude: "const  { signal }  = __loader('jamrock');\n",
    });

    expect(script(`
      import { truth } from '../mod.mjs';
`)).toEqual({
      prelude: "\n      import  { truth }  from /*@@*/__resolve('../mod.mjs');",
      interlude: '\n',
    });

    expect(script(`
      import Test from '../test.html';
`)).toEqual({
      prelude: "\n      import Test from '../test.generated.mjs?_=0';",
      interlude: '\n',
    });

    expect(script([
      "import { Inspect } from 'jamrock:components';\n",
      "import Test from './hello.generated.mjs';\n",
      "import Markup from './static.generated.mjs';\n",
      "import Test1 from './test.generated.mjs';\n",
      "import Test2 from '../inner.generated.mjs';\n",
      "import Test3 from '../../noop.generated.mjs';\n",
      "import Test4 from '../../../router.generated.mjs';\n",
    ].join(''))).toEqual({
      prelude: [
        "import  { Inspect }  from '/path/to/lib/components';\n",
        "import  Test  from /*@@*/__resolve('./hello.generated.mjs');\n",
        "import  Markup  from /*@@*/__resolve('./static.generated.mjs');\n",
        "import  Test1  from /*@@*/__resolve('./test.generated.mjs');\n",
        "import  Test2  from /*@@*/__resolve('../inner.generated.mjs');\n",
        "import  Test3  from /*@@*/__resolve('../../noop.generated.mjs');\n",
        "import  Test4  from /*@@*/__resolve('../../../router.generated.mjs');",
      ].join(''),
      interlude: '\n',
    });

    expect(script([
      "import { redirect } from 'jamrock:conn';\n",
      "import Hello from './hello.generated.mjs';\n",
    ].join(''))).toEqual({
      prelude: "\nimport  Hello  from /*@@*/__resolve('./hello.generated.mjs');",
      interlude: "const  { redirect }  = __loader('jamrock:conn');\n",
    });
  });

  test('should collect browser package imports as __imports metadata in client scripts', ({ expect }) => {
    const result = Block.script([
      "import { EditorView, basicSetup } from 'codemirror';\n",
      "import { html as langHtml } from '@codemirror/lang-html';\n",
      "import AnsiUp from 'ansi_up';\n",
      'const ansi = new AnsiUp();',
    ].join(''), false, '/path/to', true);

    // Prelude no longer has noops — they live inside __handler as $$props destructuring
    expect(result.prelude).toBe('');
    expect(result.interlude).toBe('\nconst ansi = new AnsiUp();');

    // clientImports holds structured descriptors for the runtime to pre-load
    expect(result.clientImports).toEqual([
      { local: 'EditorView', from: 'codemirror', name: 'EditorView' },
      { local: 'basicSetup', from: 'codemirror', name: 'basicSetup' },
      { local: 'langHtml', from: '@codemirror/lang-html', name: 'html' },
      { local: 'AnsiUp', from: 'ansi_up', name: 'default' },
    ]);
  });

  test('should rewrite modules', ({ expect }) => {
    const code = Block.module(`
      let messages = [];
      export { messages as from };
    `);

    expect(code).toContain('let messages = [];');
    expect(code).toContain('({from: messages});');
  });

  test('should resolve on unwrap', ({ expect }) => {
    const sample = Block.unwrap(`
      import x from './bar.mjs';
      import y from /*@@*/__resolve('./foo.mjs');
    `, './path/to/sample.html', './build/sample.generated.mjs');

    expect(sample).toContain("import x from './bar.mjs';");
    expect(sample).toContain("import y from '../path/to/foo.mjs';");
  });

  test('should validate some elements', ({ expect }) => {
    expect(() => load('<title />')).toThrow(/Element 'title' should appear within the 'head'/);
    expect(() => load('<page><body /></page>')).toThrow(/Element 'body' cannot be nested inside 'page'/);
  });

  test('should validate given fragments', ({ expect }) => {
    expect(() => load('<fragment>x</fragment>')).toThrow(/Fragment requires a unique name/);
    expect(() => load('<fragment name="x">x</fragment><fragment name="x">x</fragment>')).toThrow(/Fragment requires a unique name/);
    expect(load('<fragment name=x>y</fragment>', 'frag.html').fragments).toEqual({
      x: {
        attributes: { '@location': 'frag.html:1:1', name: 'x' },
        elements: [{ expr: [{ content: 'y', type: 'text' }], raw: [] }],
        snippets: {},
        offset: {
          start: { column: 0, line: 0, index: 0 },
          end: 29,
          close: 16,
        },
        ref: 'x',
        // scope: [],
        // props: ['name'],
        name: 'x-fragment',
        type: 'fragment',
      },
    });
  });

  test('should extract nested scripts and styles', ({ expect }) => {
    expect(load(`
      <script>
        export const value = 42;
      </script>
      <body>
        <script>
          console.log(42);
        </script>
      </body>
    `, 'page.html')).toEqual({
      context: 'module',
      media: [],
      markup: {
        attributes: { '@location': 'page.html:5:7', '@ref': 'x04nym8e' },
        content: [],
      },
      scripts: [{
        attributes: {},
        identifier: 'page(0)',
        content: '               \n        export const value = 42;\n      ',
        offset: { column: 14, index: 15, line: 1 },
        ref: null,
        root: null,
      }, {
        attributes: {},
        identifier: 'page(1)',
        content: '                                                                           \n\n\n\n               \n          console.log(42);\n        ',
        offset: { column: 16, index: 94, line: 5 },
        ref: 'x04nym8e',
        root: 'body',
      }],
      fragments: {},
      snippets: {},
      styles: [],
      rules: [],
    });
  });

  test('should extract document attributes', ({ expect }) => {
    expect(load(`
      <html lang="es-MX">
        ...
      </html>
      !
    `, 'source.html').markup).toEqual({
      content: [{ expr: [{ content: '\n        ...\n      ', type: 'text' }], raw: [] }, { expr: [{ content: '\n      !\n    ', type: 'text' }], raw: [] }],
      document: { lang: 'es-MX' },
    });
  });

  test('should wrap nodes within snippets', ({ expect }) => {
    expect(load(`
      {#snippet sum(a, b)}
        <i>{a} + {b} = {a + b}</i>
      {/snippet}
    `, 'snippets.html')).toEqual({
      context: 'static',
      media: [],
      fragments: {},
      snippets: {
        sum: {
          args: ['a', 'b'],
          body: [
            {
              attributes: { '@location': 'snippets.html:3:9' },
              elements: [
                {
                  expr: [
                    { type: 'code', content: { expr: ['{a}'], raw: [] } },
                    { type: 'text', content: ' + ' },
                    { type: 'code', content: { expr: ['{b}'], raw: [] } },
                    { type: 'text', content: ' = ' },
                    { type: 'code', content: { expr: ['{a + b}'], raw: [] } },
                  ],
                  raw: [],
                },
              ],
              name: 'i',
              offset: { close: 38, end: 62, start: { column: 8, index: 36, line: 2 } },
              snippets: {},
              type: 'element',
            },
          ],
        },
      },
      markup: {
        content: [
          {
            expr: [],
            raw: [],
          },
          {
            expr: [],
            raw: [],
          },
        ],
      },
      rules: [],
      styles: [],
      scripts: [],
    });
  });

  test('should attach snippets to nodes', ({ expect }) => {
    expect(load(`
      {#snippet sum(a, b)}
        {a} + {b} = {a + b}
      {/snippet}
      <body>
        <Nested>
          {#snippet bar()}FIXME{/snippet}
        </Nested>
      </body>
    `, 'snippets.html')).toEqual({
      context: 'static',
      media: [],
      fragments: {},
      snippets: {
        sum: {
          args: ['a', 'b'],
          body: [
            { type: 'code', content: { expr: ['{a}'], raw: [] } },
            { type: 'text', content: ' + ' },
            { type: 'code', content: { expr: ['{b}'], raw: [] } },
            { type: 'text', content: ' = ' },
            { type: 'code', content: { expr: ['{a + b}'], raw: [] } },
          ],
        },
      },
      markup: {
        attributes: { '@location': 'snippets.html:5:7' },
        content: [
          {
            expr: [],
            raw: [],
          },
          {
            attributes: {
              '@location': 'snippets.html:6:9',
            },
            elements: [
              {
                expr: [],
                raw: [],
              },
            ],
            name: 'Nested',
            // scope: ['bar'],
            // props: [],
            offset: { close: 101, end: 162, start: { column: 8, index: 94, line: 5 } },
            snippets: {
              bar: {
                args: [],
                body: [{ content: 'FIXME', type: 'text' }],
              },
            },
            type: 'element',
          },
        ],
      },
      rules: [],
      styles: [],
      scripts: [],
    });
  });

  test('should attach constants to blocks', ({ expect }) => {
    const tpl = load(`
      {#if true}
        {@const truth = 42}
        Got: {truth}
      {/if}
    `, 'constants.html');

    expect(tpl.markup).toEqual({
      content: [{
        expr: [
          { type: 'code', content: { block: true, expr: ['{#if true}'], open: true, raw: [], tag: '#if' } },
          { type: 'text', content: '\n        Got: ' },
          { type: 'code', content: { expr: ['{truth}'], raw: [] } },
          { type: 'code', content: { block: true, expr: ['{/if}'], open: false, raw: [], tag: '/if' } },
        ],
        raw: [],
      }],
    });
    expect(tpl.markup.content[0].expr[0].content.context).toEqual({
      truth: {
        value: '42',
        position: { col: 9, line: 3 },
      },
    });
  });

  test('should build an AST from given markup', ({ expect }) => {
    expect(load(`
      <!DOCTYPE html>
      <head>
        <title>OSOM</title>
      </head>
      <script>
        export let value = 42;
      </script>
      <h1>Got: {value}</h1>
      <style scoped>
        h1 { color: red; }
      </style>
    `, 'markup.html')).toEqual({
      context: 'module',
      media: [],
      fragments: {},
      snippets: {},
      markup: {
        content: [
          {
            attributes: { '@location': 'markup.html:9:7' },
            elements: [
              {
                expr: [
                  { content: 'Got: ', type: 'text' },
                  { content: { expr: ['{value}'], raw: [] }, type: 'code' },
                ],
                raw: [],
              },
            ],
            snippets: {},
            name: 'h1',
            type: 'element',
            offset: {
              start: { column: 6, line: 8, index: 146 },
              end: 167,
              close: 149,
            },
          },
        ],
        doctype: { html: true },
        metadata: [{
          attributes: {},
          elements: [{ expr: [{ content: 'OSOM', type: 'text' }], raw: [] }],
          snippets: {},
          offset: {
            start: { column: 8, line: 3, index: 44 },
            end: 63,
            close: 50,
          },
          name: 'title',
          type: 'element',
        }],
      },
      scripts: [{
        attributes: {},
        identifier: 'markup(0)',
        content: '                                                                           \n\n\n\n             \n        export let value = 42;\n      ',
        offset: { column: 14, index: 92, line: 5 },
        ref: null,
        root: null,
      }],
      styles: [{
        attributes: { scoped: true },
        identifier: 'markup(1)',
        content: '                                                                                                                                                                 \n\n\n\n\n\n\n\n                   \n        h1 { color: red; }\n      ',
        offset: { column: 20, index: 188, line: 9 },
        ref: null,
        root: null,
      }],
      rules: [],
    });
  });
});
