/* eslint-disable max-len */

import { test } from '@japa/runner';
import * as td from 'testdouble';

import { load } from '../src/markup/index.mjs';
import { Expr } from '../src/markup/expr.mjs';
import { isVNode } from '../src/utils.mjs';

test.group('vnodes', () => {
  test('should invalidate lists of scalars', ({ expect }) => {
    expect(isVNode()).toBeFalsy();
    expect(isVNode([])).toBeFalsy();
    expect(isVNode(1)).toBeFalsy();
    expect(isVNode({})).toBeFalsy();
    expect(isVNode(true)).toBeFalsy();

    expect(isVNode(['h1'])).toBeFalsy();
    expect(isVNode(['h1', null])).toBeFalsy();
    expect(isVNode(['h1', undefined])).toBeFalsy();
  });

  test('should validate if first argument is an object', ({ expect }) => {
    expect(isVNode(['h1', {}])).toBeTruthy();
    expect(isVNode(['h1', Function])).toBeFalsy();
    expect(isVNode(['h1', Object.create(null)])).toBeFalsy();
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
    expect(Expr.from('{1+2}').wrap()).toEqual('1+2');
    expect(Expr.from('{"abc"}').wrap()).toEqual('"abc"');

    expect(Expr.from('{1+2}').append('3').wrap('')).toEqual('1+2,\n3');
    expect(Expr.from('{1+2}').append('3').wrap('', null, true)).toEqual('$$.$(1+2) +\n$$.$(3)');

    expect(Expr.from('{1+2}').concat('3').wrap('')).toEqual('1+2,\n"3"');
    expect(Expr.from('{1+2}').concat('3').wrap('', null, true)).toEqual('$$.$(1+2) +\n"3"');
  });

  test('should handle object-merge syntax', ({ expect }) => {
    expect(Expr.props({
      $: Expr.from('...x').append('...y'),
    }, '')).toEqual('\n...x,\n...y,');
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
});

test.group('parsing', t => {
  t.each.teardown(() => {
    td.reset();
  });

  test('should validate some elements', ({ expect }) => {
    expect(() => load('<title />')).toThrow(/Element 'title' should appear within the 'head'/);
    expect(() => load('<page><body /></page>')).toThrow(/Element 'body' cannot be nested inside 'page'/);
  });

  test('should validate given fragments', ({ expect }) => {
    expect(() => load('<fragment>x</fragment>')).toThrow(/Fragment requires an unique name/);
    expect(load('<fragment name=x>y</fragment>', 'frag.html').fragments).toEqual({
      x: {
        attributes: { '@location': 'frag.html:1:1', name: 'x' },
        elements: [{ chunk: true, expr: [{ content: 'y', type: 'text' }], raw: [] }],
        offset: { column: 0, line: 0, index: 0 },
        name: 'fragment',
        type: 'element',
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
      fragments: {},
      markup: {
        attributes: { '@location': 'page.html:5:7' },
        content: [],
      },
      scripts: [{
        attributes: {},
        identifier: 'page(0)',
        content: '               \n        export const value = 42;\n      ',
        offset: { column: 14, index: 15, line: 1 },
        root: null,
      }, {
        attributes: {},
        identifier: 'page(1)',
        content: '                                                                           \n\n\n\n               \n          console.log(42);\n        ',
        offset: { column: 16, index: 94, line: 5 },
        root: 'body',
      }],
      styles: [],
    });
  });

  test('should extract document attributes', ({ expect }) => {
    expect(load(`
      <html lang="es-MX">
        ...
      </html>
      !
    `, 'source.html').markup).toEqual({
      content: [{ chunk: true, expr: [{ content: '\n        ...\n      ', type: 'text' }], raw: [] }, { chunk: true, expr: [{ content: '\n      !\n    ', type: 'text' }], raw: [] }],
      document: { lang: 'es-MX' },
    });
  });

  test('should build an AST from given markup', ({ expect }) => {
    td.replace(Math, 'random', td.func('random'));
    td.when(Math.random()).thenReturn(12.34);

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
      fragments: {},
      markup: {
        content: [
          {
            attributes: { '@location': 'markup.html:9:7' },
            elements: [
              { chunk: true, expr: [{ content: 'Got: ', type: 'text' }, { content: { expr: ['{value}'], raw: [] }, type: 'code' }], raw: [] },
            ],
            name: 'h1',
            type: 'element',
            offset: { column: 6, line: 8, index: 146 },
          },
        ],
        doctype: { html: true },
        metadata: [{
          attributes: {},
          elements: [{ chunk: true, expr: [{ content: 'OSOM', type: 'text' }], raw: [] }],
          offset: { column: 8, line: 3, index: 44 },
          name: 'title',
          type: 'element',
        }],
      },
      scripts: [{
        attributes: {},
        identifier: 'markup(0)',
        content: '                                                                           \n\n\n\n             \n        export let value = 42;\n      ',
        offset: { column: 14, index: 92, line: 5 },
        root: null,
      }],
      styles: [{
        attributes: { scoped: true },
        identifier: 'markup(1)',
        content: '                                                                                                                                                                 \n\n\n\n\n\n\n\n                   \n        h1 { color: red; }\n      ',
        offset: { column: 20, index: 188, line: 9 },
        root: null,
      }],
    });
  });
});
