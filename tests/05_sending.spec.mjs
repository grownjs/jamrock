/* eslint-disable max-len */

import { test } from '@japa/runner';

import * as td from 'testdouble';
import * as path from 'path';
import * as fs from 'fs';

import { createTranspiler } from '../src/server/shared.mjs';
import { stringify } from '../src/templ/utils.mjs';
import { Template } from '../src/templ/main.mjs';
import { view } from './helpers/utils.mjs';

test.group('sending markup', t => {
  t.each.setup(() => {
    td.replace(Template, 'read', x => fs.readFileSync(x).toString());
    td.replace(Template, 'write', (...x) => fs.writeFileSync(...x));
    td.replace(Template, 'exists', x => fs.existsSync(x) && fs.statSync(x).isFile());
    td.replace(Template, 'transpile', createTranspiler({ createMortero: () => import('mortero'), path }));
  });
  t.each.teardown(() => {
    td.reset();
  });

  test('should handle components > slots', async ({ expect }) => {
    const result = await view('tests/fixtures/slots.html');
    const markup = stringify(result);

    expect(markup).toContain('<div data-location="tests/fixtures/component.html:1:1">(FOO)</div>');
    expect(markup).toContain('<div data-location="tests/fixtures/component.html:1:1"><span data-location="tests/fixtures/slots.html:7:12">X</span>BAR)</div>');
    expect(markup).toContain('<div data-location="tests/fixtures/component.html:1:1">(BAZ<span data-location="tests/fixtures/slots.html:8:12">Y</span></div>');
    expect(markup).toContain('<div data-location="tests/fixtures/component.html:1:1"><span data-location="tests/fixtures/slots.html:9:12">X</span>Z<span data-location="tests/fixtures/slots.html:9:40">y</span></div>');
    expect(markup).toContain('<main data-location="tests/fixtures/layout.html:1:1"><div data-location="tests/fixtures/component.html:1:1">xBUZZ)</div>');
    expect(markup).toContain('<div data-location="tests/fixtures/component.html:1:1">_...)</div></main>');
  });

  test('should merge page metadata and assets', async ({ expect }) => {
    const result = await view('tests/fixtures/nested.html', { lang: 'es-MX', fixme: 'nope' });
    const markup = stringify(result);

    expect(markup).toEqual(`<!DOCTYPE html>
<html lang="es-MX" data-location="tests/fixtures/nested.html"><head>
<meta charset="utf-8" /><base href="/" /><title>OSOM</title><meta http-equiv=refresh content="2; url=/login" /></head><body class="just nope" data-location="tests/fixtures/heading.html:11:1">
</body></html>`);
  });

  test('should render components for ssr and is-land modes', async ({ expect }) => {
    const result = await view('tests/fixtures/bundle.html');
    const markup = stringify(result).replace(/<script[^<>]*>[^]*<\/script>/);

    expect(markup).not.toContain('<x-fragment>');
    expect(markup).toContain('[<b data-location="tests/fixtures/bundle.html:13:21">OSOM: 21</b>]OK(FOO: 42)[NESTED:?]');
    expect(markup).toContain('[]OK(BAR)[NESTED:?]\n');
    expect(markup).toContain('[]OK(MAIN)[NESTED:?]\n');
    expect(markup).toContain('<div data-stuff=42 data-location="tests/fixtures/bundle.html:25:1" data-component="tests/fixtures/osom.svelte:2" data-on:interaction="true">');
    expect(markup).toContain('<div class="svelte-1njum0u">OSOM: <h1 data-location="tests/fixtures/bundle.html:26:3">It works.</h1></div></div>');
    // eslint-disable-next-line quotes
    expect(markup).toContain(`[HTML: <h1 data-location="tests/fixtures/static.html:5:1" class="jam-x1plh5jo">I'm static HTML!</h1><p data-location="tests/fixtures/static.html:8:3">&amp; I am some text...</p>]`);

    const other = await view('tests/fixtures/scripts.html', { value: -1 });
    const html = stringify(other);

    expect(html).toContain('li::before');
    expect(html).toContain('color:blue;');
    expect(html).toContain('*:where(.jam-x19ys0y0){margin:0;}');

    expect(html).toContain('console.log(el);');
    expect(html).toContain('console.log(truth());');
    expect(html).toContain('var el = Fragment.for("...");');

    expect(html).toContain('<script src="//unpkg.com/somedom"></script>');
    expect(html).toContain('import { truth } from "/~/tests/fixtures/utils.mjs";');

    expect(html).toContain('<p data-location="tests/fixtures/test.html:25:1">Count: 0(42)</p>');
    expect(html).toContain('<button data-location="tests/fixtures/test.html:26:1" data-source="tests/fixtures/test.html/2" data-on:click="true" name="_action" value=inc>+</button>');
  });
});
