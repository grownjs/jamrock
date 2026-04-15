/* eslint-disable max-len */

import { test } from '@japa/runner';

import { fixture } from './helpers/utils.mjs';

fixture.fromFile('components/main.html');
fixture.fromFile('components/basic/constants.html');
fixture.fromFile('components/basic/static.html');
fixture.fromFile('components/snippets/component.html');
fixture.fromFile('components/snippets/components.html');
fixture.fromFile('components/recursive/tree.html');
fixture.fromFile('components/recursive/tree-test.html');
fixture.fromFile('modules/test.mjs');
fixture.fromFile('components/basic/example.html');
fixture.fromFile('templates/loops/each-fragment.html');

test.group('new compiler', () => {
  test('should attach scoped variables into fragments', async ({ expect }) => {
    const partial = await fixture.use('./templates/loops/each-fragment.html', { transform: true });
    expect(partial.__fragments.loop.s).toEqual(['data']);
  });

  test('should transform components into modules', async ({ expect }) => {
    const { code, render } = await fixture.use('./components/basic/example.html', { transform: true });

    expect(code).toContain('"path":"/:stuff"');
    expect(code).toContain('__default = {\n    DELETE');
    expect(code).toContain('let value = $$props.value ?? 0;');
    expect(code).toContain('const sum = $$props.sum ?? __snippets.sum;');
    expect(code).toContain('s: ["truth"],');

    const { html } = await render();

    expect(html).toContain('<x-fragment name=example data-location');
    expect(html).toContain('<p data-location="components/basic/example.html:20:1">Got: 42</p>');
    expect(html).toContain('<data data-location="components/basic/example.html:16:3">1 + 2 = 3</data>');
    expect(html).toContain('<button data-location="components/basic/example.html:17:3">1</button> (41)');
    expect(html).toContain('<button data-location="components/basic/example.html:22:1">++</button>');
  });

  test('should import components as modules', async ({ expect }) => {
    await fixture.use(['./components/basic/static.html', './components/snippets/component.html']);

    const mod = await fixture.use('./components/snippets/components.html');
    const { html } = await mod.render();

    expect(html).toContain('Got: 42<h1 data-location="components/basic/static.html:2:1">It works.</h1>!!!(42???)');
  });

  test('should handle self-imports for recursion', async ({ expect }) => {
    const data = [{
      label: 'a',
      children: [{
        label: 'b',
        children: [{
          label: 'c',
          children: [],
        }],
      }],
    }];

    await fixture.use('./components/recursive/tree.html');

    const tpl = await fixture.use('./components/recursive/tree-test.html');
    const { html } = await tpl.render({ tree: data });

    const sample = [
      '<ul data-location="components/recursive/tree.html:6:3">',
      '  <li data-location="components/recursive/tree.html:8:7">a',
      '    <ul data-location="components/recursive/tree.html:6:3">',
      '      <li data-location="components/recursive/tree.html:8:7">',
      '        b',
      '        <ul data-location="components/recursive/tree.html:6:3">',
      '          <li data-location="components/recursive/tree.html:8:7">c</li></ul>',
      '      </li>',
      '    </ul>',
      '  </li>',
      '</ul>',
    ].map(_ => _.trim()).join('');

    expect(html).toEqual(sample);
  });

  test('should handle @const expressions', async ({ expect }) => {
    const tpl = await fixture.use('./components/basic/constants.html');
    expect(tpl.code).toContain('/*!#2:3*/const truth=42;');

    const result = await tpl.render();
    expect(result.html).toEqual('42');
  });
});
