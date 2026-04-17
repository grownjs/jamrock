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

test.group('Client-side signals', t => {
  t.each.setup(() => {
    setup();
  });
  t.each.teardown(() => {
    process.debug = 0;
    td.reset();
    reset();
  });

  test('should render signal-based counter with SSR fallback', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./signal-counter.html
      <script>
        export let count = 0;
      </script>
      <div data-test:id="counter">
        <p data-test:id="count">Count: {count}</p>
        <p data-test:id="doubled">Doubled: {count * 2}</p>
      </div>
    `;

    const ctx = useContext();

    const markup = await fixture.partial('signal-counter.html', { count: 0 }, ctx);

    expect(markup).toContain('data-test:id="counter"');
    expect(markup).toContain('Count: 0');
    expect(markup).toContain('Doubled: 0');
  });

  test('should render counter with different initial values', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./signal-counter-5.html
      <script>
        export let count = 5;
      </script>
      <div data-test:id="counter">
        <p data-test:id="count">Count: {count}</p>
        <p data-test:id="doubled">Doubled: {count * 2}</p>
      </div>
    `;

    const ctx = useContext();

    const markup = await fixture.partial('signal-counter-5.html', { count: 5 }, ctx);

    expect(markup).toContain('Count: 5');
    expect(markup).toContain('Doubled: 10');
  });

  test('should render list with reactive pattern', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./signal-list.html
      <script>
        let items = ['alpha', 'beta', 'gamma'];
      </script>
      <div data-test:id="list-app">
        <p data-test:id="count">Items: {items.length}</p>
        <ul data-test:id="list">
          {#each items as item}
            <li>{item}</li>
          {/each}
        </ul>
      </div>
    `;

    const ctx = useContext();

    const markup = await fixture.partial('signal-list.html', {}, ctx);

    expect(markup).toContain('data-test:id="list-app"');
    expect(markup).toContain('alpha');
    expect(markup).toContain('gamma');
  });

  test('should render conditional tabs with default state', async ({ expect }) => {
    fixture.fromFile('client/conditional-tabs+page.html');

    const ctx = useContext();

    const markup = await fixture.partial('client/conditional-tabs+page.html', { activeTab: 'home' }, ctx);

    expect(markup).toContain('data-test:id="tabs"');
    expect(markup).toContain('data-test:id="tab-home"');
    expect(markup).toContain('Home content');
  });

  test('should render different tab panels based on state', async ({ expect }) => {
    fixture.fromFile('client/conditional-tabs+page.html');

    const ctx = useContext();

    const markupAbout = await fixture.partial('client/conditional-tabs+page.html', { activeTab: 'about' }, ctx);
    expect(markupAbout).toContain('About content');
    expect(markupAbout).not.toContain('Home content');

    const markupSettings = await fixture.partial('client/conditional-tabs+page.html', { activeTab: 'settings' }, ctx);
    expect(markupSettings).toContain('Settings content');
  });
});

test.group('RPC + Signal composition', t => {
  t.each.setup(() => {
    setup();
  });
  t.each.teardown(() => {
    process.debug = 0;
    td.reset();
    reset();
  });

  test('should render ws:call directive on form', async ({ expect }) => {
    fixture.fromFile('rpc/counter+page.html');

    const ctx = useContext();

    const markup = await fixture.partial('rpc/counter+page.html', null, ctx);

    expect(markup).toContain('data-test:id="count"');
    expect(markup).toContain('data-test:id="increment-form"');
  });

  test('should render ws:yield with generator fragment', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./ws-yield-test.html
      <script>
        function* items() {
          let i = 0;
          while (i < 5) {
            yield i;
            i++;
          }
        }
      </script>
      <fragment name="yield-test" limit="10">
        {#each items as x}
          <span>{x}</span>
        {/each}
      </fragment>
    `;

    const ctx = useContext();

    const markup = await fixture.partial('ws-yield-test.html', null, ctx);

    expect(markup).toContain('<x-fragment');
    expect(markup).toContain('limit=10');
  });

  test('should render bind:value alongside ws:call', async ({ expect }) => {
    fixture.fromFile('bindings/form+page.html');

    const ctx = useContext();

    const markup = await fixture.partial('bindings/form+page.html', null, ctx);

    expect(markup).toContain('data-bind:value="textValue"');
    expect(markup).toContain('data-bind:checked="checkedValue"');
  });

  test('should render on:click alongside signal', async ({ expect }) => {
    fixture.fromFile('events/click+page.html');

    const ctx = useContext();

    const markup = await fixture.partial('events/click+page.html', null, ctx);

    expect(markup).toContain('data-data-test:id="click-btn"');
    expect(markup).toContain('Clicks: 0');
  });
});

test('cleanup fixtures', ({ expect }) => {
  const count = fixture.cleanup();
  expect(count).toBeGreaterThan(0);
});