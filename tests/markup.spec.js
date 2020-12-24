/* eslint-disable no-unused-expressions */

const { expect } = require('chai');

const { trim } = require('../src/util');
const { taggify } = require('../src/markup/html');
const { compile, render } = require('../src/markup/block');
const { renderSync, renderAsync } = require('../src/render');

/* global describe, it */

describe('markup', () => {
  describe('compiler', () => {
    it('should work on empty templates', () => {
      expect(compile('').render.toString()).to.contain('return [\n];');
    });

    it('should compile async blocks', () => {
      expect(renderSync(compile('<X>y</X>'), {
        X: compile('<slot/>!'),
      })).to.eql([[['y'], '!']]);
    });

    it('should render default slots', () => {
      expect(renderSync(compile('<slot />'))).to.eql([[[]]]);
      expect(renderSync(compile('<slot>x</slot>'))).to.eql([[['x']]]);
    });

    it('should relax xml parsing', () => {
      expect(taggify(renderSync(compile('<foo bar />')))).to.eql('<foo bar></foo>');
      expect(taggify(renderSync(compile('<foo $bar />')))).to.eql('<foo $bar></foo>');
      expect(taggify(renderSync(compile('<foo $bar=x />')))).to.eql('<foo $bar=x></foo>');
      expect(taggify(renderSync(compile('<foo @bar />')))).to.eql('<foo data-bar></foo>');
      expect(taggify(renderSync(compile('<foo @bar=x />')))).to.eql('<foo data-bar=x></foo>');
      expect(taggify(renderSync(compile('<foo {bar} />'), { bar: 42 }))).to.eql('<foo bar=42></foo>');
      expect(taggify(renderSync(compile('<foo bar={baz} />'), { baz: true }))).to.eql('<foo bar></foo>');
      expect(taggify(renderSync(compile('<foo bar="{baz}" />'), { baz: true }))).to.eql('<foo bar></foo>');
      expect(taggify(renderSync(compile('<foo bar="" buzz=bazzinga />')))).to.eql('<foo bar="" buzz=bazzinga></foo>');
    });
  });

  describe('components', () => {
    it('should render default slots', () => {
      expect(renderSync(compile('<Test>\n</Test>', 'nested'), {
        Test: compile('x<slot>y</slot>'),
      })).to.eql([['x', [['y']]]]);

      expect(renderSync(compile('<Test>a</Test>', 'nested'), {
        Test: compile('m<slot>p</slot>'),
      })).to.eql([['m', ['a']]]);
    });

    it('should allow to compose slots', () => {
      expect(renderSync(compile('<Test>b</Test>', 'nested'), {
        Test: compile('n<slot name="bar">q</slot>'),
      })).to.eql([['n', [['q']]]]);

      expect(renderSync(compile('<Test>c<span slot="baz">BAR</span></Test>', 'nested'), {
        Test: compile('o<slot name="baz">r</slot>'),
      })).to.eql([['o', [['span', {}, ['BAR']]]]]);
    });

    it('should render from several slots', () => {
      const items = n => Array.from({ length: n }).map((_, i) => `<Foo>${i % 5 === 0 ? i : ''}</Foo>`);
      const max = process.env.CI ? 20000 : 5000;
      const Foo = compile('<slot>?</slot>');
      const bar = compile(items(max).join(''));

      expect(taggify(renderSync(bar, { Foo }))).to.eql(Object.keys(items(max)).map(x => (x % 5 === 0 ? x : '?')).join(''));
    }).timeout(10000);

    it('should handle recursion through slots', () => {
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
            {#each data}
              <li>
                {label}
                <self data="{children}" />
              </li>
            {/each}
          </ul>
        {/if}
      `);

      const tpl = compile(`
        <Tree data="{tree}" />
      `);

      const html = '<ul><li>a<ul><li>b<ul><li>c</li></ul></li></ul></li></ul>';
      const result = taggify(renderSync(tpl, { tree, Tree })).replace(/\s+/g, '');

      expect(result).to.eql(html);
    });

    it('should handle some destructuring on loops', async () => {
      const Tpl = compile('{#each [[1,2]] as [a, b]}[{a}:{b}]{/each}', null, null, true);
      const result = taggify(await renderAsync(Tpl));

      expect(result).to.eql('[1:2]');
    });
  });

  describe('expressions', () => {
    it('should decorate inline expressions', () => {
      expect(compile('x').render.toString()).to.contain('[\n"x",]');
      expect(compile('{x}').render.toString()).to.contain('\n/*!#0*/ + $$.$(x)');
    });

    it('should render from several nested-blocks', () => {
      const sample = `
        {#each empty}...{:else}EMPTY{/each}
        {#if stuff}
          <h1>
            It <b class="x {y}">works</b>.
          </h1>
          {#each users}
            <p>{name} ({y})</p>
          {/each}
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

      const test = compile(`<div>${sample}</div>`);
      const tree = renderSync(test, {
        stuff: 0,
        times: 3,
        list: ['a', 'b'],
        users: [{ name: 'me' }],
        y: 'osom',
        empty: [],
        test: 1,
      });
      const html = taggify(tree);

      expect(html).to.contain('EMPTY');
      expect(html).to.contain('OSOM');
      expect(html).to.contain('1. a(a)');
      expect(html).to.contain('2. b(b)');
    });
  });

  describe('error handling', () => {
    it('should warn on broken syntax', () => {
      try {
        compile('{x.<}');
      } catch (e) {
        expect(e.sample).to.contains('Unexpected token <');
        expect(e.sample).to.contains('⚠    1 | {x.<}\n~~~~~~~~~~~~^');
      }
    });

    it('should warn on broken blocks', () => {
      try {
        compile(`
          {#if x}
            x
          {:else}
            y
          {/if
        `);
      } catch (e) {
        expect(e.sample).to.contains("Unclosed section, given '\\n            y\\n          {/if\\n");
      }
    });

    it('should capture syntax errors', () => {
      try {
        compile('x{x.} ');
      } catch (e) {
        expect(e.sample).to.contains('Unclosed expression');
        expect(e.sample).to.contains('☐ source.html:1:5');
        expect(e.sample).to.contains('⚠    1 | x{x.} \n~~~~~~~~~~~~~^');
      }
    });

    it('should capture runtime errors', async () => {
      try {
        await render(compile(' {1 + x}'));
      } catch (e) {
        expect(e.sample).to.contains('x is not defined');
        expect(e.sample).to.contains('☐ source.html:1:2');
        expect(trim(e.sample)).to.contains('⚠    1 |  {1 + x}\n~~~~~~~~~~^');
      }
    });

    it('should capture whole stack-traces', async () => {
      const fun = () => console.log(undef); // eslint-disable-line no-undef

      try {
        await render(compile(`

          {#if 1}
            {1 + fun()}
          {/if}
        `, null, null, true), { fun });
      } catch (e) {
        expect(e.sample).to.contains('undef is not defined');
        expect(e.sample).to.contains('☐ source.html:3:11');
        expect(trim(e.sample)).to.contains('⚠    3 |           {#if 1}\n~~~~~~~~~~~~~~~~~~~^');
      }
    });
  });
});
