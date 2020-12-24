const vm = require('vm');
const path = require('path');
const td = require('testdouble');
const { expect } = require('chai');
const mock = require('mock-require');

const { trim } = require('../src/util');
const { loop } = require('../src/reactor');
const { Template } = require('../src/jamrock/template');

function tpl(src) {
  return async ctx => {
    const opts = {
      dest: 'generated',
      limit: 10,
      build: true,
      reload: true,
      inline: true,
      stream: false,
      runtime: require.resolve('../browser'),
      jamrock: path.resolve(__dirname, '../dist/shared'),
    };

    const { context, template } = await Template.require(src, opts, '/tmp')(ctx, Symbol('CTX'));

    context.debugger = console;

    return {
      render: async el => {
        const result = await template.render(context, el);
        return result;
      },
      compact: async el => {
        const result = await template.render(context, el);
        const markup = await Template.compact(ctx, result, context, opts);
        return markup;
      },
      stringify: async (el, callback, teardown) => {
        try {
          const result = await template.render(context, el, null, callback);
          const markup = await Template.compact(ctx, result, context, opts);
          return Template.stringify(result, context, opts, markup.scripts, markup.styles, true);
        } finally {
          if (teardown) await teardown(context, template);
        }
      },
    };
  };
}

/* global beforeEach, afterEach, describe, it */
/* eslint-disable no-unused-expressions */

describe('Template', () => {
  const ctx = {
    req_headers: {},
    body_params: {},
    request_path: '/',
    method: 'GET',
    path_info: [],
    session: {},
    req: { uuid: 1 },
    redirect: url => {
      ctx.redirect_to = url;
    },
    put_session: (k, v) => {
      if (typeof k === 'object') Object.assign(ctx.session, k);
      else ctx.session[k] = v;
    },
  };

  beforeEach(() => {
    mock('jamrock', require('../src/jamrock'));
  });

  afterEach(() => {
    delete require.cache[require.resolve('../src/jamrock/template')];
    mock.stopAll();
    td.reset();
  });

  describe('errors', () => {
    it('should trace import calls', async () => {
      try {
        const { stringify } = await tpl('tests/fixtures/broken/bad-import.html')(ctx);
        await stringify();
      } catch (e) {
        expect(e.sample).to.contains("Cannot find module 'undef'");
        expect(e.sample).to.contains('tests/fixtures/broken/bad-import.html:2:3');
        expect(trim(e.sample)).to.contains("    2 |   import broken from 'undef';");
      }
    });

    it('should trace invalid calls', async () => {
      try {
        const { stringify } = await tpl('tests/fixtures/broken/undefined-function.html')(ctx);
        await stringify();
      } catch (e) {
        expect(e.sample).to.contains('Invalid left-hand side in assignment');
        expect(e.sample).to.contains('☐ tests/fixtures/broken/undefined-function.html:2:14');
        expect(trim(e.sample)).to.contains('⚠    2 |   export let 1 = broken();\n~~~~~~~~~~~~~~~~~~~~~~^');
      }
    });

    it('should trace undefined locals', async () => {
      try {
        const { stringify } = await tpl('tests/fixtures/broken/undefined-variable.html')(ctx);
        await stringify();
      } catch (e) {
        expect(e.sample).to.contains('undef is not defined');
        expect(e.sample).to.contains('☐ tests/fixtures/broken/undefined-variable.html:1:3');
        expect(trim(e.sample)).to.contains('⚠    1 |   {undef}\n~~~~~~~~~~~^');
      }
    });

    it('should trace component failures', async () => {
      try {
        const { stringify } = await tpl('tests/fixtures/broken/bad-component.html')(ctx);
        await stringify();
      } catch (e) {
        expect(e.sample).to.contains('undef is not defined');
        expect(e.sample).to.contains('☐ tests/fixtures/broken/undefined-variable.html:1:3');
        expect(trim(e.sample)).to.contains('⚠    1 |   {undef}\n~~~~~~~~~~~^');
      }
    });
  });

  describe('render', () => {
    it('empty.html', async () => {
      const { render } = await tpl('tests/fixtures/empty.html')(ctx);
      const result = await render();

      expect(result).to.eql([]);
    });

    it('import.html', async () => {
      const Example = require('./fixtures/example');
      delete Example._loaded;

      td.replace(Example, 'connect', td.func('connect'));

      const { render } = await tpl('tests/fixtures/import.html')(ctx);
      const result = await render();

      expect(td.explain(Example.connect).callCount).to.eql(1);
      expect(result.join('').trim()).to.eql('42');
    });

    it('reactor.html', async () => {
      const m = {
        module: { exports: {} },
      };

      const test = await Template.compile('empty.html', `${__dirname}/fixtures/reactor.html`);
      const render = await vm.runInNewContext(`let __filename;${test.code};c$$`, m);
      expect(render).to.eql(m.module.exports);

      const loader = p => require(path.resolve(`${__dirname}/fixtures`, p));
      const data = await render({ req_headers: {} }, { foo: 'baz' }, loader, loop);

      expect(data).to.eql({
        data: {
          foo: 'BAZ', value: 42, other: -1, x: 42,
        },
      });
    });

    it('self.html', async () => {
      const data = [];

      function wait(ms) {
        return new Promise(ok => setTimeout(ok, ms));
      }
      function push(value) {
        data.push(value);
      }

      const { stringify } = await tpl('tests/fixtures/self.html')(ctx);
      const result = await stringify({ wait, push });

      expect(data).to.eql([undefined, 1, 1, 0]);
      expect(result.replace(/>\s+</g, '><').replace(/>\s+/g, '>').replace(/\s+</g, '<'))
        .to.eql('<!DOCTYPE html><html><body><ul><li>a<ul><li>b<ul><li>c</li></ul></li></ul></li></ul></body></html>');
    });

    it('slots.html', async () => {
      const { stringify } = await tpl('tests/fixtures/slots.html')(ctx);
      const result = await stringify();

      expect(result).to.contains('<div>(FOO)</div>');
      expect(result).to.contains('<div><span>X</span>BAR)</div>');
      expect(result).to.contains('<div>(BAZ<span>Y</span></div>');
      expect(result).to.contains('<div><span>X</span>Z<span>y</span></div>');
      expect(result).to.contains('<main>\n  \n  <div>xBUZZ)</div>\n  <div>_...)</div>\n\n</main>');
      // expect(result).to.contains('<main>\n  \n  <div>xBUZZ)</div>\n\n  <div>_...)</div>\n\n\n</main>');
    });

    it('module.html', async () => {
      const { stringify } = await tpl('tests/fixtures/module.html')(ctx);
      const result = await stringify();

      expect(result).to.contains('42\n-1\n</body>');
    });

    it('hooks.html', async () => {
      const { stringify } = await tpl('tests/fixtures/hooks.html')(ctx);
      await stringify();

      expect(ctx.redirect_to).to.eql('/42');
    });

    it('bundle.html', async () => {
      const { stringify } = await tpl('tests/fixtures/bundle.html')(ctx);
      const result = await stringify();

      expect(result).to.contains('<div id=component-');
      expect(result).to.contains('module.exports');
      expect(result).to.contains('window.Jamrock');

      const base = path.basename(process.cwd());

      expect(result).to.contains(`"${base}:sample"`);

      const html = result
        .replace(/<script[^<>]*>[^]*<\/script>/, '')
        .replace(/ data-other[^<>]*/, '')
        .replace(/>\s*/g, '>');

      expect(html).to.contains('data-component=./sample>[<b>OSOM: 21</b>]OK(FOO: 42)[NESTED:?]');
      expect(html).to.contains('data-component=../fixtures/sample>[]OK(BAR)[NESTED:?]');
      expect(html).to.contains('data-component=~/tests/fixtures/other>MAIN[]OK()[NESTED:<b>OSOM</b>]');
      expect(result).to.contains('<b data-other');
    });

    it('context.html', async () => {
      const { stringify } = await tpl('tests/fixtures/context.html')(ctx);

      const end = td.func('callback');
      const tick = td.func('iterator');
      const result = await stringify(null, tick, end);

      expect(result).to.contains(' 0\n');
      expect(result).to.contains(' 1\n');
      expect(result).to.contains(JSON.stringify({ children: [0, 1] }, null, 2));

      expect(result).to.contains(' 2\n');
      expect(result).to.contains(' 3\n');
      expect(result).to.contains(JSON.stringify({ children: [2, 3] }, null, 2));

      expect(result).to.contains('\n4\n</body>');

      expect(td.explain(end).callCount).to.eql(1);
      expect(td.explain(tick).callCount).to.eql(0);
    });

    it('scripts.html', async () => {
      const { stringify } = await tpl('tests/fixtures/scripts.html')(ctx);
      const result = await stringify();

      expect(result).to.contains('<script src=//unpkg.com/somedom></script>');
      expect(result).to.contains('var Jamrock');
      expect(result).to.contains('var Fragment');
      expect(result).to.contains('var LiveSocket');
      expect(result).to.contains('// scripts.js');
      expect(result).to.contains('var el = Fragment.for("...");');
      expect(result).to.contains('import { truth } from "/~/tests/fixtures/utils.js";');
      expect(result).to.contains('let x = 0;');
      expect(result).to.contains('if (x < 3) {');
      expect(result).to.contains('  console.log(truth());');
      expect(result).to.contains('console.log(el);');
    });

    it('styles.html', async () => {
      const { stringify } = await tpl('tests/fixtures/styles.html')(ctx);
      const result = await stringify();

      expect(result).to.contains('li[data-styles-');
      expect(result).to.match(/\[data-styles-[\w=-]+\]::before/);
      expect(result).to.contains('<p data-styles-');
      expect(result).to.contains('* { margin: 0; }');
      expect(result).to.contains('> .nested{');
      expect(result).to.contains('\nhtml, body ');
      expect(result).to.contains('style="color: red; font-size: 10px"');
      expect(result).to.match(/data-styles-\S+ class="test y"/);

      expect(result.split('STYLED').length).to.eql(4);
      expect(result.split('span[data-styled-').length).to.eql(2);
    });

    it('effects.html', async () => {
      const { stringify } = await tpl('tests/fixtures/effects.html')(ctx);
      const result = await stringify();

      expect(result).to.contains('<h1>Hi, You.</h1>');
    });

    it('heading.html', async () => {
      const { compact } = await tpl('tests/fixtures/heading.html')(ctx);
      const result = await compact({ lang: 'es', stuff: 1, fixme: 'ok' });

      expect(result).to.eql({
        attrs: { class: 'just ok' },
        head: [['meta', { 'http-equiv': 'refresh', content: '2; url=/login', stuff: 1 }]],
        html: { lang: 'es' },
        body: [],
        set: [],
        scripts: [],
        styles: '',
      });
    });

    it('bindings.html', async () => {
      const { stringify } = await tpl('tests/fixtures/bindings.html')(ctx);
      const result = await stringify();

      expect(result).to.contains('value=world data-bind-value=value');
      expect(result).to.contains('value=0 data-bind-value=count');
      expect(result).to.contains('<form method=POST>');
      expect(result).to.contains('<input type=hidden name=_method value=PATCH />');
    });

    it('escapes.html', async () => {
      td.replace(console, 'debug', td.func('debug'));

      const { stringify } = await tpl('tests/fixtures/escape.html')(ctx);
      const html = await stringify({ outer: '<b>bold</b>' });

      expect(html).to.contains('\n3\n</body>');
      expect(html).to.contains('&lt;b&gt;bold');
      expect(html).to.contains('&lt;i&gt;italic');
      expect(html).to.contains('result: <i>italic</i>');
      expect(td.explain(console.debug).calls[0].args[0].value).to.eql('<i>italic</i>');
    });

    it('locals.html', async () => {
      const { stringify } = await tpl('tests/fixtures/locals.html')(ctx);
      const result = await stringify({ a: 42, b: -1 });

      expect(result).to.contains('A.-1\n</body>');
    });

    it('props.html', async () => {
      const { stringify } = await tpl('tests/fixtures/props.html')(ctx);
      const result = await stringify({
        props: { class: 'a test' },
        foo: { bar: Promise.resolve('baz') },
        bool: true,
      });

      expect(result).to.contains('<a class="a test" x=baz bool y="a -> b"></a>');
    });

    it('interpolation.html', async () => {
      const { stringify } = await tpl('tests/fixtures/interpolation.html')(ctx);
      const result = await stringify();

      expect(result).to.contains('</a>: 42\n</body>');
    });

    it('fragments.html', async () => {
      const { compact, stringify } = await tpl('tests/fixtures/fragments.html')(ctx);
      const result = await compact();

      expect(result).to.eql({
        attrs: {},
        body: [
          ['fragment', { id: 'test' }, [['b', {}, ['OK']]]],
          ['p', { id: 'chunk' }, ['OSOM']],
        ],
        set: [{
          id: 'test',
          children: [['b', {}, ['OK']]],
        }],
        head: [],
        html: {},
        styles: '',
        scripts: [],
      });

      const markup = await stringify();

      expect(markup).to.contains('<b>OK</b>');
      expect(markup).to.contains('</x-fragment>');
      expect(markup).to.contains('<p id=chunk>OSOM');
    });

    it('enhancements.html', async () => {
      const { stringify } = await tpl('tests/fixtures/enhancements.html')(ctx);
      const result = await stringify();

      expect(result).to.contains('value=""');
      expect(result).to.contains('<select>');
      expect(result).to.contains('<option selected>');
      expect(result).to.contains('<textarea>&lt;h1');
    });

    it('directives.html', async () => {
      const fun = () => null;

      const { compact } = await tpl('tests/fixtures/directives.html')(ctx);
      const result = await compact({ fun });

      expect(result.body).to.eql([
        // '\n                 ',
        ['div', { 'data-ontest': true, 'data-x-y': 'z', onclick: fun }],
        // '\n',
      ]);
    });

    it('attributes.html', async () => {
      const ref = { value: 'FOO' };
      const test = { value: 'BAR' };

      const { render } = await tpl('tests/fixtures/attributes.html')(ctx);
      const result = await render({ ref, test, class: 'fixed' });

      expect(result).to.eql([
        // '\n                               ',
        [
          '\n                            OSOM, BAR, FOO, OSOM, fixed\n',
        ],
        // '\n',
      ]);
    });

    it('iterators.html', async () => {
      const { stringify } = await tpl('tests/fixtures/iterators.html')(ctx);
      const deferred = {};

      const result = await stringify(null, (e, key, value) => {
        expect(e).to.be.null;
        deferred[key] = deferred[key] || [];
        deferred[key].push(value);
      });

      const date = new Date().toString().substr(0, 21);

      expect(result.split(date).length).to.greaterThanOrEqual(10);
      expect(deferred.aGenerator).to.eql([11, 12, 13, 14, 15]);
      expect(result).to.contains('1. -1\n');
      expect(result).to.contains('2. 12345678910\n');

      expect(result).to.contains('4. -42\n');
      expect(result).to.contains('5. OSOM\n');
      expect(result).to.contains('Hi, OSOM');
    });

    it('session.html', async () => {
      ctx.method = 'POST';

      const { stringify } = await tpl('tests/fixtures/session.html')(ctx);
      const result = await stringify();

      expect(result).to.match(/<main>\s*OSOM, Don.\s*42/);
    });

    it('dependencies.html', async () => {
      const test = await Template.compile('deps.html', `${__dirname}/fixtures/dependencies.html`);

      expect(test.children).to.eql([`${__dirname}/fixtures/components.html`]);
    });
  });
});
