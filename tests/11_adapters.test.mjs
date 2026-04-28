/* eslint-disable max-len */

/**
 * Tests for src/adapters/* — server-side no-op implementations of browser-only packages.
 *
 * The adapters let server-side code (SSR, unit tests) import browser packages without
 * crashing. In the browser the importmap maps the real specifiers to CDN URLs.
 *
 * For unit tests: import the adapter directly and optionally replace methods with spies.
 */

import { test } from '@japa/runner';
import * as td from 'testdouble';

import AnsiUp from '../src/adapters/ansi_up.ts';
import { EditorView, basicSetup } from '../src/adapters/codemirror.ts';
import { html } from '../src/adapters/codemirror-lang-html.ts';
import { javascript } from '../src/adapters/codemirror-lang-javascript.ts';
import { oneDark } from '../src/adapters/codemirror-theme-one-dark.ts';
import { WebContainer } from '../src/adapters/webcontainer.ts';

test.group('adapters — server-side no-ops', () => {
  test('AnsiUp: constructor does not throw', ({ expect }) => {
    const ansi = new AnsiUp();
    expect(ansi).toBeTruthy();
  });

  test('AnsiUp: ansi_to_html returns input unchanged', ({ expect }) => {
    const ansi = new AnsiUp();
    expect(ansi.ansi_to_html('\x1b[32mgreen\x1b[0m')).toBe('\x1b[32mgreen\x1b[0m');
  });

  test('AnsiUp: use_classes is settable', ({ expect }) => {
    const ansi = new AnsiUp();
    ansi.use_classes = true;
    expect(ansi.use_classes).toBe(true);
  });

  test('EditorView: constructor does not throw', ({ expect }) => {
    const view = new EditorView({ doc: 'hello' });
    expect(view).toBeTruthy();
  });

  test('EditorView: destroy is a no-op', ({ expect }) => {
    const view = new EditorView();
    expect(() => view.destroy()).not.toThrow();
  });

  test('basicSetup: is null (no-op)', ({ expect }) => {
    expect(basicSetup).toBeNull();
  });

  test('codemirror-lang-html: html() returns empty array', ({ expect }) => {
    expect(html()).toEqual([]);
  });

  test('codemirror-lang-javascript: javascript() returns empty array', ({ expect }) => {
    expect(javascript()).toEqual([]);
  });

  test('codemirror-theme-one-dark: oneDark is null (no-op)', ({ expect }) => {
    expect(oneDark).toBeNull();
  });

  test('WebContainer: boot() resolves to instance', async ({ expect }) => {
    const wc = await WebContainer.boot();
    expect(wc).toBeInstanceOf(WebContainer);
  });

  test('WebContainer: mount is a no-op', async ({ expect }) => {
    const wc = new WebContainer();
    await expect(wc.mount({})).resolves.toBeUndefined();
  });

  test('WebContainer: spawn returns output and exit', async ({ expect }) => {
    const wc = new WebContainer();
    const proc = await wc.spawn('node', ['--version']);
    expect(proc.output).toBeDefined();
    await expect(proc.exit).resolves.toBe(0);
  });
});

test.group('adapters — mocking with testdouble', t => {
  t.each.teardown(td.reset);

  test('AnsiUp: ansi_to_html can be replaced with a spy', ({ expect }) => {
    const ansi = new AnsiUp();
    td.replace(ansi, 'ansi_to_html', td.func());
    td.when(ansi.ansi_to_html('\x1b[32mfoo\x1b[0m')).thenReturn('<span class="ansi-green">foo</span>');

    const result = ansi.ansi_to_html('\x1b[32mfoo\x1b[0m');
    expect(result).toBe('<span class="ansi-green">foo</span>');
  });

  test('AnsiUp: can verify ansi_to_html was called', ({ expect }) => {
    const ansi = new AnsiUp();
    td.replace(ansi, 'ansi_to_html', td.func());

    ansi.ansi_to_html('some output');

    td.verify(ansi.ansi_to_html('some output'));
    expect(true).toBe(true); // td.verify throws if call not found
  });
});
