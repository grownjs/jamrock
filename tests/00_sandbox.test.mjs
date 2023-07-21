/* eslint-disable max-len */

import { test } from '@japa/runner';

import { fixture } from './helpers/utils.mjs';

// eslint-disable-next-line no-unused-expressions
fixture`./components.html
  <script context="module">
    import Component from './component.html';
    import Static from './static.html';
  </script>
  <head>
    <title>It works?</title>
  </head>
  <body class="something" />
  <Component>
    {#snippet other()}...{/snippet}
  </Component>
  <Static>
    {#snippet after(value)}!!!({value}???){/snippet}
  </Static>
`;

// eslint-disable-next-line no-unused-expressions
fixture`./component.html
  <script>
    export let value = 42;
  </script>
  {#snippet children(target)}
    Got: {value}{@render target?.()}
  {/snippet}
  {@render children($$props.other)}
`;

// eslint-disable-next-line no-unused-expressions
fixture`./static.html
  {#snippet after(value)}({value}){/snippet}
  <h1>It works.</h1>
  {@render after(42)}
`;

// eslint-disable-next-line no-unused-expressions
fixture`./tree.html
  <script>
    import Tree from './tree.html';
    export let data = [];
  </script>
  {#if data.length}
    <ul>
      {#each data as item}
        <li>
          {item.label}
          <Tree data={item.children} />
        </li>
      {/each}
    </ul>
  {/if}
`;

// eslint-disable-next-line no-unused-expressions
fixture`./tpl.html
  <script>
    import Tree from './tree.html';
    export let tree = [];
  </script>
  <Tree data={tree} />
`;

// eslint-disable-next-line no-unused-expressions
fixture`./test+module.mjs
  export let y = 42;
  export function bar() {
    y++;
  }
`;

// eslint-disable-next-line no-unused-expressions
fixture`./example.html
  <script context="module">
    import { y, bar } from './test+module.mjs';
    export let truth = 42;
  </script>

  <script>
    export let value = 0;
    function inc() {
      value++;
      truth--;
    }
    inc();
  </script>

  {#snippet sum(a, b)}
    <data>{a} + {b} = {a + b}</data>
    <button on:click={inc}>{value}</button>
  {/snippet}

  <p>Got: {y}</p>

  <button on:click={bar}>++</button>

  <fragment name="example">
    {@render sum(1, 2)} ({truth})
  </fragment>

  <script>
    export default {
      DELETE: true,
      ['GET /:stuff']() {
        console.log('OSOM');
      },
    };
  </script>
`;

test.group('new compiler', () => {
  test('should transform components into modules', async ({ expect }) => {
    const { code, render } = await fixture.use('./example.html');

    expect(code).toContain('"path":"/:stuff"');
    expect(code).toContain('__actions = {\n    DELETE');
    expect(code).toContain('let value = $$props.value ?? 0;');
    expect(code).toContain('const sum = $$props.sum ?? __snippets.sum;');

    const { html } = await render();

    expect(html).toContain('<x-fragment name=example data-location');
    expect(html).toContain('<p data-location="example.html:20:1">Got: 42</p>');
    expect(html).toContain('<data data-location="example.html:16:3">1 + 2 = 3</data>');
    expect(html).toContain('<button data-location="example.html:17:3">1</button> (41)');
    expect(html).toContain('<button data-location="example.html:22:1">++</button>');
  });

  test('should import components as modules', async ({ expect }) => {
    await fixture.use(['./static.html', './component.html']);

    const mod = await fixture.use('./components.html');
    const { html } = await mod.render();

    // expect(html).toContain('Got: 42...<h1 data-location="static.html:2:1">It works.</h1>!!!(42???)');
    expect(html).toContain('Got: 42<h1 data-location="static.html:2:1">It works.</h1>!!!(42???)');
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

    await fixture.use('./tree.html');

    const tpl = await fixture.use('./tpl.html');
    const { html } = await tpl.render({ tree: data });

    const sample = [
      '<ul data-location="tree.html:6:3">',
      '  <li data-location="tree.html:8:7">a',
      '    <ul data-location="tree.html:6:3">',
      '      <li data-location="tree.html:8:7">',
      '        b',
      '        <ul data-location="tree.html:6:3">',
      '          <li data-location="tree.html:8:7">c</li></ul>',
      '      </li>',
      '    </ul>',
      '  </li>',
      '</ul>',
    ].map(_ => _.trim()).join('');

    expect(html).toEqual(sample);
  });
});
