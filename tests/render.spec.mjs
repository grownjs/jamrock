import { test } from '@japa/runner';

import { taggify } from '../src/markup/html.mjs';
import { compile } from '../src/templ/compile.mjs';
import { render } from './helpers/utils.mjs';

// FIXME: too verbose... bundle?? rename to sync?
test.group('generated markup', () => {
  test('should relax html parsing', ({ expect }) => {
    expect(taggify(render(compile('<foo bar />', { sync: true }))))
      .toEqual('<foo bar data-location=source.html:1:1></foo>');
    expect(taggify(render(compile('<foo $bar />', { sync: true }))))
      .toEqual('<foo $bar data-location=source.html:1:1></foo>');
    expect(taggify(render(compile('<foo $bar=x />', { sync: true }))))
      .toEqual('<foo $bar=x data-location=source.html:1:1></foo>');
    expect(taggify(render(compile('<foo @bar />', { sync: true }))))
      .toEqual('<foo data-bar data-location=source.html:1:1></foo>');
    expect(taggify(render(compile('<foo @bar=x />', { sync: true }))))
      .toEqual('<foo data-bar=x data-location=source.html:1:1></foo>');
    expect(taggify(render(compile('<foo {bar} />', { sync: true }), { bar: 42 })))
      .toEqual('<foo bar=42 data-location=source.html:1:1></foo>');
    expect(taggify(render(compile('<foo bar={baz} />', { sync: true }), { baz: true })))
      .toEqual('<foo bar data-location=source.html:1:1></foo>');
    expect(taggify(render(compile('<foo bar="{baz}" />', { sync: true }), { baz: true })))
      .toEqual('<foo bar data-location=source.html:1:1></foo>');
    expect(taggify(render(compile('<foo bar="" buzz=bazzinga />', { sync: true }))))
      .toEqual('<foo bar="" buzz=bazzinga data-location=source.html:1:1></foo>');
  });
});

test.group('generated code', () => {
  test('should prefix expressions with their offsets', ({ expect }) => {
    const fn1 = compile(`
      <h1>
        {#if name}
          Hi, {name}.
        {/if}
      </h1>
    `, { sync: true }).render.toString();

    expect(fn1).toContain('/*!#3:9*/ $$.if');
    expect(fn1).toContain('/*!#4:15*/ name');

    const fn2 = compile(`
      <div><Stuff><b><Foo>OK</Foo></b></Stuff>{x}</div>
    `).render.toString();

    expect(fn2).toContain('/*!#2:7*/');
    expect(fn2).toContain('/*!#2:12*/');
    expect(fn2).toContain('/*!#2:19*/');
    expect(fn2).toContain('/*!#2:22*/');
    expect(fn2).toContain('/*!#2:47*/');
  });
});

test.group('expressions', () => {
  test('should render from several nested-expressions', ({ expect }) => {
    const sample = `
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
          <li>{i + 1}. {item}({this})</li>
        {/each}
      </ul>
    `;

    const tpl = compile(`<div>${sample}</div>`, { sync: true });
    const tree = render(tpl, {
      stuff: 0,
      times: 3,
      list: ['a', 'b'],
      empty: [],
      test: 1,
    });

    const html = taggify(tree);

    expect(html).toContain('EMPTY');
    expect(html).toContain('OSOM');
    expect(html).toContain('1. a([object Object])');
    expect(html).toContain('2. b([object Object])');
  });
});

test.group('using slots', () => {
  test('should render default slots', ({ expect }) => {
    expect(render(compile('<Test>\n</Test>', { sync: true }), {
      Test: compile('x<slot>y</slot>', { sync: true }),
    })).toEqual([['x', [['y']]]]);

    expect(render(compile('<Test>a</Test>', { sync: true }), {
      Test: compile('m<slot>p</slot>', { sync: true }),
    })).toEqual([['m', ['a']]]);
  });

  test('should allow to compose slots', ({ expect }) => {
    expect(render(compile('<Test>b</Test>', { sync: true }), {
      Test: compile('n<slot name="bar">q</slot>', { sync: true }),
    })).toEqual([['n', [['q']]]]);

    expect(render(compile('<Test>c<span slot="baz">BAR</span></Test>', { sync: true }), {
      Test: compile('o<slot name="baz">r</slot>', { sync: true }),
    })).toEqual([['o', [['span', { '@location': 'source.html:1:8' }, ['BAR']]]]]);
  });

  test('should render from several slots', ({ expect }) => {
    const items = n => Array.from({ length: n }).map((_, i) => `<Foo>${i % 5 === 0 ? i : ''}</Foo>`);
    const max = process.env.CI ? 50000 : 15000;
    const Foo = compile('<slot>?</slot>', { sync: true });
    const bar = compile(items(max).join(''), { sync: true });

    expect(taggify(render(bar, { Foo }))).toEqual(Object.keys(items(max)).map(x => (x % 5 === 0 ? x : '?')).join(''));
  }).timeout(10000);

  test('should handle recursion through slots', ({ expect }) => {
    const tree = [{
      label: 'a',
      children: [{
        label: 'b',
        children: [{
          label: 'c',
          children: [],
        }],
      }],
    }];

    const Tree = compile(`
      {#if data.length}
        <ul>
          {#each data as item}
            <li>
              {item.label}
              <self data="{item.children}" />
            </li>
          {/each}
        </ul>
      {/if}
    `, { sync: true });

    const tpl = compile(`
      <Tree data={tree} />
    `, { sync: true });

    const html = [
      '<ul data-location=source.html:3:9>',
      '<li data-location=source.html:5:13>a<ul data-location=source.html:3:9>',
      '<li data-location=source.html:5:13>b<ul data-location=source.html:3:9>',
      '<li data-location=source.html:5:13>c</li>',
      '</ul></li></ul></li></ul>',
    ].join('');

    const result = taggify(render(tpl, { tree, Tree }));

    expect(result.replace(/>\s*/g, '>').replace(/\s*</g, '<')).toEqual(html);
  });
});

test.group('using loops', () => {
  test('should handle array-destructuring on loops', ({ expect }) => {
    const Tpl = compile('{#each [[1,2]] as [a, b]}[{a}:{b}]{/each}', { sync: true });
    const result = taggify(render(Tpl));

    expect(result).toEqual('[1:2]');
  });

  test('should keep outer state from inner loops', ({ expect }) => {
    const Tpl = compile(`
      <h3>Hi {name},</h3>
      {#each users as u}
        <p>{u.name} - {name} ({outer})</p>
      {/each}
    `, { sync: true });

    const data = {
      users: [{ name: 'Jesús', age: 33 }],
      name: 'John Wick',
      outer: 42,
    };

    const result = taggify(render(Tpl, data));

    expect(result).toContain('Hi John Wick,');
    expect(result).toContain('Jesús - John Wick (42)');
  });
});
