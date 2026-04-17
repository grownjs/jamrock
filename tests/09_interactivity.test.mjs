/* eslint-disable max-len */

import { test } from '@japa/runner';
import * as td from 'testdouble';

import { streamify } from '../src/templ/send.ts';
import { fixture, setup, reset } from './helpers/utils.mjs';

function useContext(overrides) {
  const uuid = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ctx = {
    publish: td.func('publish'),
    ...overrides,
  };
  return Object.assign(ctx, {
    stream: streamify().wrap(ctx, uuid),
  });
}

test.group('RPC generators', t => {
  t.each.setup(() => {
    setup();
  });
  t.each.teardown(() => {
    process.debug = 0;
    reset();
  });

  test('should render counter with fragment', async ({ expect }) => {
    fixture.fromFile('rpc/counter+page.html');

    const ctx = useContext();

    const markup = await fixture.partial('rpc/counter+page.html', null, ctx);

    expect(markup).toContain('data-test:id="count"');
    expect(markup).toContain('data-test:id="increment-form"');
    expect(markup).toContain('data-test:id="decrement-form"');
  });

  test('should render fragment with generator', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./stream-test.html
      <script>
        function* items() {
          let i = 0;
          while (i < 10) {
            yield i;
            i++;
          }
        }
      </script>
      <fragment name="stream-test" limit="3">
        {#each items as x}
          <span>{x}</span>
        {/each}
      </fragment>
    `;

    const ctx = useContext();

    const markup = await fixture.partial('stream-test.html', null, ctx);

    expect(markup).toContain('<x-fragment');
    expect(markup).toContain('limit=3');
  });

  test('should render fragment with async generator', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./async-gen.html
      <script>
        async function* slowNumbers() {
          let i = 0;
          while (i < 10) {
            yield i;
            i++;
          }
        }
      </script>
      <fragment name="slow" limit="3">
        {#each slowNumbers as n}
          <span>{n}</span>
        {/each}
      </fragment>
    `;

    const ctx = useContext();

    const markup = await fixture.partial('async-gen.html', null, ctx);

    expect(markup).toContain('<x-fragment');
    expect(markup).toContain('limit=3');
  });
});

test.group('bindings', t => {
  t.each.setup(() => {
    setup();
  });
  t.each.teardown(() => {
    process.debug = 0;
    td.reset();
    reset();
  });

  test('should render bind:value on text input', async ({ expect }) => {
    fixture.fromFile('bindings/form+page.html');

    const markup = await fixture.partial('bindings/form+page.html', null, useContext());

    expect(markup).toContain('data-data-test:id="text-input"');
    expect(markup).toContain('data-bind:value="textValue"');
  });

  test('should render bind:checked on checkbox', async ({ expect }) => {
    fixture.fromFile('bindings/form+page.html');

    const markup = await fixture.partial('bindings/form+page.html', null, useContext());

    expect(markup).toContain('data-data-test:id="checkbox-input"');
    expect(markup).toContain('data-bind:checked="checkedValue"');
  });

  test('should render bind:value on number input', async ({ expect }) => {
    fixture.fromFile('bindings/form+page.html');

    const markup = await fixture.partial('bindings/form+page.html', null, useContext());

    expect(markup).toContain('data-data-test:id="number-input"');
    expect(markup).toContain('data-bind:value="numberValue"');
  });

  test('should render bind:value on textarea', async ({ expect }) => {
    fixture.fromFile('bindings/form+page.html');

    const markup = await fixture.partial('bindings/form+page.html', null, useContext());

    expect(markup).toContain('data-data-test:id="textarea-input"');
    expect(markup).toContain('data-bind:value="textareaValue"');
  });

  test('should display initial bound values', async ({ expect }) => {
    fixture.fromFile('bindings/form+page.html');

    const markup = await fixture.partial('bindings/form+page.html', null, useContext());

    expect(markup).toContain('(empty)');
    expect(markup).toContain('no');
    expect(markup).toContain('0');
  });
});

test.group('events', t => {
  t.each.setup(() => {
    setup();
  });
  t.each.teardown(() => {
    process.debug = 0;
    td.reset();
    reset();
  });

  test('should render on:click handler', async ({ expect }) => {
    fixture.fromFile('events/click+page.html');

    const markup = await fixture.partial('events/click+page.html', null, useContext());

    expect(markup).toContain('data-data-test:id="click-btn"');
    expect(markup).toContain('data-on:click="true"');
  });

  test('should render on:dblclick handler', async ({ expect }) => {
    fixture.fromFile('events/click+page.html');

    const markup = await fixture.partial('events/click+page.html', null, useContext());

    expect(markup).toContain('data-data-test:id="dblclick-btn"');
    expect(markup).toContain('data-on:dblclick');
  });

  test('should render initial state', async ({ expect }) => {
    fixture.fromFile('events/click+page.html');

    const markup = await fixture.partial('events/click+page.html', null, useContext());

    expect(markup).toContain('Clicks: 0');
    expect(markup).toContain('Last: ');
  });
});

test.group('fragments', t => {
  t.each.setup(() => {
    setup();
  });
  t.each.teardown(() => {
    process.debug = 0;
    td.reset();
    reset();
  });

  test('should render fragment with name attribute', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./frag-name.html
      <fragment name="test-frag">
        <p>Content</p>
      </fragment>
    `;

    const markup = await fixture.partial('frag-name.html', null, useContext());

    expect(markup).toContain('<x-fragment name="test-frag"');
    expect(markup).toContain('<p>Content</p>');
  });

  test('should render fragment with limit attribute', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./frag-limit.html
      <script>
        function* items() {
          yield 1;
          yield 2;
          yield 3;
        }
      </script>
      <fragment name="limited" limit="2">
        {#each items as i}{i} {/each}
      </fragment>
    `;

    const ctx = useContext();
    const markup = await fixture.partial('frag-limit.html', null, ctx);

    expect(markup).toContain('<x-fragment');
    expect(markup).toContain('limit=2');
  });

  test('should render fragment with interval attribute', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./frag-interval.html
      <script>
        async function* stream() {
          yield 'a';
          yield 'b';
        }
      </script>
      <fragment name="streaming" interval="100">
        {#each stream as s}{s} {/each}
      </fragment>
    `;

    const ctx = useContext();
    const markup = await fixture.partial('frag-interval.html', null, ctx);

    expect(markup).toContain('<x-fragment');
    expect(markup).toContain('interval=100');
  });

  test('should render fragment with mode attribute', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./frag-mode.html
      <fragment name="appender" mode="append">
        <span>Appended</span>
      </fragment>
    `;

    const markup = await fixture.partial('frag-mode.html', null, useContext());

    expect(markup).toContain('<x-fragment');
    expect(markup).toContain('mode=append');
  });

  test('should render fragment with custom tag', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./frag-tag.html
      <fragment tag="ul" name="list">
        <li>Item</li>
      </fragment>
    `;

    const markup = await fixture.partial('frag-tag.html', null, useContext());

    expect(markup).toContain('<ul');
    expect(markup).toContain('data-fragment=list');
  });
});

test('cleanup fixtures', ({ expect }) => {
  const count = fixture.cleanup();
  expect(count).toBeGreaterThan(0);
});
