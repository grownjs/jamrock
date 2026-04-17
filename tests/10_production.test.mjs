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

test.group('Error boundaries', t => {
  t.each.setup(() => {
    setup();
  });
  t.each.teardown(() => {
    process.debug = 0;
    td.reset();
    reset();
  });

  test('should render component without error when condition is false', async ({ expect }) => {
    fixture.fromFile('errors/boundary+page.html');

    const ctx = useContext();

    const markup = await fixture.partial('errors/boundary+page.html', { shouldFail: false }, ctx);

    expect(markup).toContain('data-test:id="safe"');
    expect(markup).toContain('Success');
  });

  test('should handle null values gracefully', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./null-test.html
      <script>
        export let maybeNull = null;
      </script>
      <p>{maybeNull || 'Default value'}</p>
    `;

    const ctx = useContext();

    const markup = await fixture.partial('null-test.html', {}, ctx);

    expect(markup).toContain('Default value');
  });

  test('should handle undefined values gracefully', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./undefined-test.html
      <script>
        export let maybeUndefined;
      </script>
      <p>{maybeUndefined ?? 'Fallback'}</p>
    `;

    const ctx = useContext();

    const markup = await fixture.partial('undefined-test.html', {}, ctx);

    expect(markup).toContain('Fallback');
  });

  test('should handle empty arrays in each loop', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./empty-array.html
      <script>
        export let items = [];
      </script>
      <ul>
        {#each items as item}
          <li>{item}</li>
        {/each}
      </ul>
      <p>Count: {items.length}</p>
    `;

    const ctx = useContext();

    const markup = await fixture.partial('empty-array.html', {}, ctx);

    expect(markup).toContain('Count: 0');
  });

  test('should handle missing props with defaults', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./defaults-test.html
      <script>
        export let title = 'Default Title';
        export let count = 0;
      </script>
      <h1>{title}</h1>
      <p>Count: {count}</p>
    `;

    const ctx = useContext();

    const markup = await fixture.partial('defaults-test.html', {}, ctx);

    expect(markup).toContain('Default Title');
    expect(markup).toContain('Count: 0');
  });
});

test.group('Security', t => {
  t.each.setup(() => {
    setup();
  });
  t.each.teardown(() => {
    process.debug = 0;
    td.reset();
    reset();
  });

  test('should escape HTML in text interpolation', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./escape-test.html
      <script>
        export let userInput = '<b>bold</b>';
      </script>
      <p>{userInput}</p>
    `;

    const ctx = useContext();

    const markup = await fixture.partial('escape-test.html', {}, ctx);

    expect(markup).toContain('&lt;b&gt;bold&lt;/b&gt;');
  });

  test('should escape HTML attributes', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./attr-escape.html
      <script>
        export let className = 'test-class';
      </script>
      <div class={className}>Content</div>
    `;

    const ctx = useContext();

    const markup = await fixture.partial('attr-escape.html', {}, ctx);

    expect(markup).toContain('class="test-class"');
  });

  test('should handle special characters in content', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./special-chars.html
      <script>
        export let content = '<>&"';
      </script>
      <p>{content}</p>
    `;

    const ctx = useContext();

    const markup = await fixture.partial('special-chars.html', {}, ctx);

    expect(markup).toContain('&lt;');
    expect(markup).toContain('&gt;');
    expect(markup).toContain('&amp;');
  });

  test('should render href attributes safely', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./js-url.html
      <script>
        export let url = '/safe-path';
      </script>
      <a href={url}>Click me</a>
    `;

    const ctx = useContext();

    const markup = await fixture.partial('js-url.html', {}, ctx);

    expect(markup).toContain('href="/safe-path"');
  });
});

test.group('Network resilience', t => {
  t.each.setup(() => {
    setup();
  });
  t.each.teardown(() => {
    process.debug = 0;
    td.reset();
    reset();
  });

  test('should handle generator timeout', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./timeout-test.html
      <script>
        async function* slowStream() {
          yield 1;
          await new Promise(r => setTimeout(r, 1000));
          yield 2;
        }
      </script>
      <fragment name="slow" timeout="50" limit="1">
        {#each slowStream as n}
          <span>{n}</span>
        {/each}
      </fragment>
    `;

    const ctx = useContext();

    const markup = await fixture.partial('timeout-test.html', {}, ctx);

    expect(markup).toContain('<x-fragment');
    expect(markup).toContain('timeout=50');
  });

  test('should handle generator errors gracefully', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./error-gen.html
      <script>
        function* failingGenerator() {
          yield 1;
          throw new Error('Generator failed');
        }
      </script>
      <fragment name="failing" limit="10">
        {#each failingGenerator as n}
          <span>{n}</span>
        {/each}
      </fragment>
    `;

    const ctx = useContext();

    const markup = await fixture.partial('error-gen.html', {}, ctx);

    expect(markup).toContain('<x-fragment');
  });

  test('should handle empty generator', async ({ expect }) => {
    // eslint-disable-next-line no-unused-expressions
    fixture`./empty-gen.html
      <script>
        function* emptyGenerator() {
          // yields nothing
        }
      </script>
      <fragment name="empty" limit="10">
        {#each emptyGenerator as n}
          <span>{n}</span>
        {/each}
      </fragment>
    `;

    const ctx = useContext();

    const markup = await fixture.partial('empty-gen.html', {}, ctx);

    expect(markup).toContain('<x-fragment');
  });
});

test('cleanup fixtures', ({ expect }) => {
  const count = fixture.cleanup();
  expect(count).toBeGreaterThan(0);
});
