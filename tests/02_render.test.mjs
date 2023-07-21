import { test } from '@japa/runner';

import { compile, render } from './helpers/utils.mjs';

async function check(code, opts, props) {
  const t = await compile(code, opts);
  const v = await render(t, props);
  return v.html;
}

test.group('generated markup', () => {
  test('should decode entities', async ({ expect }) => {
    expect(await check('&times;')).toEqual('×');
  });

  test('should relax html parsing', async ({ expect }) => {
    expect(await check('<foo bar />'))
      .toEqual('<foo bar data-location="source.html:1:1"></foo>');
    expect(await check('<foo $bar />'))
      .toEqual('<foo $bar data-location="source.html:1:1"></foo>');
    expect(await check('<foo $bar=x />'))
      .toEqual('<foo $bar=x data-location="source.html:1:1"></foo>');
    expect(await check('<foo @bar />'))
      .toEqual('<foo data-bar data-location="source.html:1:1"></foo>');
    expect(await check('<foo @bar=x />'))
      .toEqual('<foo data-bar=x data-location="source.html:1:1"></foo>');
    expect(await check('<foo {bar} />', { props: ['bar'] }, { bar: 42 }))
      .toEqual('<foo bar=42 data-location="source.html:1:1"></foo>');
    expect(await check('<foo bar={baz} />', { props: ['baz'] }, { baz: true }))
      .toEqual('<foo bar data-location="source.html:1:1"></foo>');
    expect(await check('<foo bar="{baz}" />', { props: ['baz'] }, { baz: true }))
      .toEqual('<foo bar data-location="source.html:1:1"></foo>');
    expect(await check('<foo bar="" buzz=bazzinga />'))
      .toEqual('<foo bar="" buzz=bazzinga data-location="source.html:1:1"></foo>');
  });
});

test.group('generated code', () => {
  test('should prefix expressions with their offsets', async ({ expect }) => {
    const fn1 = await compile(`
      <h1>
        {#if name}
          Hi, {name}.
        {/if}
      </h1>
    `);

    expect(fn1.code).toContain('/*!#3:9*/ await $$.if');
    expect(fn1.code).toContain('/*!#4:15*/ $$.$(name)');

    const fn2 = await compile(`
      <div><Stuff><b><Foo>OK</Foo></b></Stuff>{x}</div>
    `);

    expect(fn2.code).toContain('/*!#2:7*/');
    expect(fn2.code).toContain('/*!#2:12*/');
    expect(fn2.code).toContain('/*!#2:19*/');
    expect(fn2.code).toContain('/*!#2:22*/');
    expect(fn2.code).toContain('/*!#2:47*/');
  });

  test('should expand props with colons (data-shortcuts)', async ({ expect }) => {
    const f = await compile('<li test:id="form.{form.name}.elements.{name}" use:hook>...</li>', { props: ['form', 'name', 'hook'] });
    const o = await render(f, { form: { name: 'x' }, name: 'y', hook: () => null });

    expect(o.html).toEqual('<li data-test:id="form.x.elements.y" data-location="source.html:1:1">...</li>');
  });
});

test.group('expressions', () => {
  test('should render from several nested-expressions', async ({ expect }) => {
    const sample = `
      {% debug empty,stuff,test,times,list,$$props}
      {#each empty}...{:else}EMPTY{/each}
      {#if stuff}
        ...
      {:else if test > 2}
        NOPE
      {:else if test >= 1}
        OSOM
      {:else}
        {#each times}
          Nop<wbr />e.
        {/each}
      {/if}
      <ul>
        {#each list as item, i}
          {#if !item.x}y{/if}
          <li>{i + 1}. {item}</li>
        {/each}
      </ul>
    `;

    const tpl = await compile(`<div>${sample}</div>`, { props: ['stuff', 'times', 'list', 'empty', 'test'] });
    const { html } = await render(tpl, {
      stuff: 0,
      times: 3,
      list: ['a', 'b'],
      empty: [],
      test: 1,
    });

    expect(html).toContain('EMPTY');
    expect(html).toContain('OSOM');
    expect(html).toContain('1. a');
    expect(html).toContain('2. b');
    expect(html).not.toContain('debug empty');
  });
});

test.group('using loops', () => {
  test('should handle array-destructuring on loops', async ({ expect }) => {
    const tpl = await compile('{#each [[1,2]] as [a, b]}[{a}:{b}]{/each}');
    const { html } = await render(tpl);

    expect(html).toEqual('[1:2]');
  });

  test('should keep outer state from inner loops', async ({ expect }) => {
    const tpl = await compile(`
      <h3>Hi {name},</h3>
      {#each users as u}
        <p>{u.name} - {name} ({outer})</p>
      {/each}
    `, { props: ['name', 'users', 'outer'] });

    const data = {
      users: [{ name: 'Jesús', age: 33 }],
      name: 'John Wick',
      outer: 42,
    };

    const { html } = await render(tpl, data);

    expect(html).toContain('Hi John Wick,');
    expect(html).toContain('Jesús - John Wick (42)');
  });
});

//  test('skip: pin: should be able to invoke bundles', async ({ expect }) => {
//    const render = await fixture.bundle('main.html');
//    const markup = await render({
//      slots: {
//        default: [['fragment', { '@html': '<b>DUB</b>' }]],
//        before: ['*'],
//        after: ['NIX'],
//      },
//    });
//
//    expect(markup).toContain('*<button data-location="generated/main.html:43:3" class="jam-x1704ny8">insight</button>');
//    expect(markup).toContain('<button data-location="generated/main.html:44:3" class="jam-x1704ny8">truth</button>');
//    expect(markup).toContain('<p data-location="generated/main.html:45:3">Your answer: FIXME</p>');
//
//    expect(markup).toContain('<h1 style="color:red">It works.</h1>');
//    expect(markup).toContain('</p>Just an EMPTY component');
//    expect(markup).toContain('[<b>DUB</b>:NIX]');
//  });
