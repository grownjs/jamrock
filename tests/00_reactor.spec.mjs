/* eslint-disable max-len */

import { test } from '@japa/runner';
import * as util from 'util';
import { runInNewContext } from 'vm';

import {
  variables, resolver,
  get, readable, writable, derived, computed,
} from '../src/reactor/index.mjs';

import {
  transform,
} from '../src/templ/builder.mjs';

function compile(code) {
  const partial = transform(variables(code), 'false', true);
  partial.code = partial.code.replace(/unwrap`([^]*?)`\.end/g, '$1');
  return partial;
}

test.group('compiler', () => {
  test('should transform import/export symbols', ({ expect }) => {
    expect(compile(`
      import "x";
      export { y } from './ref';
      export { default as z } from './test';
    `)).toEqual({
      code: `var __resolve = async function ({ $$slots, $$props }, $$src, $$dest, $$fx, $$sync, $$import, $$defaults = Object.create(null)) { var self = this;
  /*!#7*/await $$import("x", $$src, $$dest);
      const { y } =await $$import("./ref", $$src, $$dest);Object.assign($$defaults,{y});
      $$defaults.z=await $$import("./test", $$src, $$dest);
    ;return { ctx: $$defaults, data: () => ({ self, $$slots, $$props }) };
}, __render = false, __props = [];
`,
      keys: [],
      scope: [],
      locals: {},
      aliases: { default: 'z' },
    });
  });

  test('should transform aliased exports and locals', ({ expect }) => {
    const test1 = compile(`
      let cssClass = null;
      export { cssClass as class };

      export function foo() {}

      const data = 42;
      let local = null;
    `);
    expect(test1.locals).toEqual({ data: 'const', cssClass: 'export', local: 'var', foo: 'function' });
    expect(test1.aliases).toEqual({ cssClass: 'class' });
    expect(test1.scope).toEqual(['foo', ['class', 'cssClass'], 'data', 'local']);
    expect(test1.keys).toEqual(['foo', 'cssClass']);
  });

  test('should rewrite label expressions as side-effects', ({ expect }) => {
    expect(compile(`
      $:x = y;
      $: if (z) {}
      $: if (z) {
        ok
      }
      $: path = to.replace(/\\/$/, '');
      $: active = exact
        ? (path || '/') === request_path
        : request_path.indexOf(path || '/') === 0;
      $: className = \`\${className || ''}\${active ? ' active' : ''}\`.trim();
      $: {
        x = -1;
      }
      $: {
        if (x) {
          y = 0;
        }
      }
      // $: if (x) { y }
      $: data = await x;
      $: foo = x
        ? y
        : z;
      $: try {
        x;
      } catch (e) {
        y;
      } finally {
        z;
      }
      $: if (x) {
        a;
      } else if (y) {
        b;
      } else {
        c;
      }
    `).code).toEqual(`var __resolve = async function ({ $$slots, $$props }, $$src, $$dest, $$fx, $$sync, $$import, $$defaults = Object.create(null)) { var self = this;
  \n      let x;$$fx(async () => {x = y/*!#@@@*/}, () => []);
      $$fx(async () => { if (z) {}/*!#@@@*/}, () => []);
      $$fx(async () => { if (z) {
        ok
      }/*!#@@@*/}, () => []);
      let path;$$fx(async () => { path = to.replace(/\\/$/, '')/*!#@@@*/}, () => []);
      let active;$$fx(async () => { active = exact
        ? (path || '/') === request_path
        : request_path.indexOf(path || '/') === 0/*!#@@@*/}, () => [path]);
      let className;$$fx(async () => { className = \`\${className || ''}\${active ? ' active' : ''}\`.trim()/*!#@@@*/}, () => [className, active]);
      $$fx(async () => {
        x = -1;
      }/*!#@@@*/, () => []);
      $$fx(async () => {
        if (x) {
          y = 0;
        }
      }/*!#@@@*/, () => []);
                        \n      let data;$$fx(async () => { data = await x/*!#@@@*/}, () => []);
      let foo;$$fx(async () => { foo = x
        ? y
        : z/*!#@@@*/}, () => []);
      $$fx(async () => { try {
        x;
      } catch (e) {
        y;
      } finally {
        z;
      }/*!#@@@*/}, () => []);
      $$fx(async () => { if (x) {
        a;
      } else if (y) {
        b;
      } else {
        c;
      }/*!#@@@*/}, () => []);
    ;return { ctx: $$defaults, data: () => ({ foo, data, className, active, path, x, self, $$slots, $$props }) };
}, __render = false, __props = [];
`);
  });

  test('should include used locals as dependencies on effects', ({ expect }) => {
    expect(compile(`
      export let  value, a,b,c,x,m,o,e,y,bar,other,key,next,baz,ok,bazzinga,used,values,foo = 0;
      $: value = value.toUpperCase();
      $: if (a) { if (b && c.d || (x && m.n[o]) ) { e } }
      $: if (m === 'n') { }
      $: if (x.q === 'JOE' && y) {
        foo = bar
        other = 42;
        color = 'red';
        a = b ? c : ok;
        typeof other;
        key in next;
        for (let item of values);
      }
      $: foo = bar.baz;
      $: testing = other[key[next]].value;
      $: foo = bar[baz.buzz[x[y].z][ok]] = bazzinga;
      $: console.log({ used, values, key: foo.bar });
    `).code).toEqual(`var __resolve = async function ({ value:value$$, a:a$$, b:b$$, c:c$$, x:x$$, m:m$$, o:o$$, e:e$$, y:y$$, bar:bar$$, other:other$$, key:key$$, next:next$$, baz:baz$$, ok:ok$$, bazzinga:bazzinga$$, used:used$$, values:values$$, foo:foo$$, $$slots, $$props }, $$src, $$dest, $$fx, $$sync, $$import, $$defaults = Object.create(null)) { var self = this;
  \n      let/*!@@*/value=value$$??void 0;let/*!@@*/a=a$$??void 0;let/*!@@*/b=b$$??void 0;let/*!@@*/c=c$$??void 0;let/*!@@*/x=x$$??void 0;let/*!@@*/m=m$$??void 0;let/*!@@*/o=o$$??void 0;let/*!@@*/e=e$$??void 0;let/*!@@*/y=y$$??void 0;let/*!@@*/bar=bar$$??void 0;let/*!@@*/other=other$$??void 0;let/*!@@*/key=key$$??void 0;let/*!@@*/next=next$$??void 0;let/*!@@*/baz=baz$$??void 0;let/*!@@*/ok=ok$$??void 0;let/*!@@*/bazzinga=bazzinga$$??void 0;let/*!@@*/used=used$$??void 0;let/*!@@*/values=values$$??void 0;let/*!@@*/foo=foo$$?? 0;
      $$fx(async () => { value = value.toUpperCase()/*!#@@@*/}, () => [value]);
      $$fx(async () => { if (a) { if (b && c.d || (x && m.n[o]) ) { e } }/*!#@@@*/}, () => [a, b, c, x, m, o, e]);
      $$fx(async () => { if ($$sync(m === 'n') { }/*!#@@@*/}, () => [m]));
      $$fx(async () => { if (x.q === 'JOE' && y) {
        $$sync(foo = bar
        other = 42);
        color = 'red';
        $$sync(a = b ? c : ok);
        typeof other;
        key in next;
        for (let item of values);
      }/*!#@@@*/}, () => [x, y, bar, b, c, ok, other, key, next, values]);
      $$fx(async () => { foo = bar.baz/*!#@@@*/}, () => [bar]);
      let testing;$$fx(async () => { testing = other[key[next]].value/*!#@@@*/}, () => [other, key, next]);
      $$fx(async () => { foo = bar[baz.buzz[x[y].z][ok]] = bazzinga/*!#@@@*/}, () => [bar, baz, x, y, ok]);
      $$fx(async () => { console.log({ used, values, key: foo.bar })/*!#@@@*/}, () => [used, values, foo]);
    ;return { ctx: $$defaults, data: () => ({ testing, value, a, b, c, x, m, o, e, y, bar, other, key, next, baz, ok, bazzinga, used, values, foo, self, $$slots, $$props }) };
}, __render = false, __props = ["value","a","b","c","x","m","o","e","y","bar","other","key","next","baz","ok","bazzinga","used","values","foo"];
`);
  });

  test('should rewrite expressions from exported symbols', ({ expect }) => {
    const js = `
      export const foo = bar(new Date(), {
        baz: () => {
          return ({ x: 42 });
        },
      });
    `;

    expect(compile(js).code).toEqual(`var __resolve = async function ({ foo:foo$$, $$slots, $$props }, $$src, $$dest, $$fx, $$sync, $$import, $$defaults = Object.create(null)) { var self = this;
  \n      const/*!@@*/foo=foo$$?? bar(new Date(), {
        baz: () => {
          return ({ x: 42 });
        },
      });
    ;return { ctx: $$defaults, data: () => ({ foo, self, $$slots, $$props }) };
}, __render = false, __props = ["foo"];
`);
  });
});

test.group('resolver', () => {
  const source = `
  export {isArray} from 'util';
  export utils from 'util';
  export const a = 42;
  export let b = 0;
  export let c = a / b;
  export default { x: 'y' };
  export const complex = {
    value: 'OSOM',
  };
  export let object = {
    foo: 'bar',
  };
  $: console.log('FX',{a,b,c});
  b = 8;
  b = 5;
  console.log('END',{a,b,c});
`;

  const expected = `var __resolve = async function ({ a:a$$, b:b$$, c:c$$, complex:complex$$, object:object$$, $$slots, $$props }, $$src, $$dest, $$fx, $$sync, $$import, $$defaults = Object.create(null)) { var self = this;
  const {isArray} =await $$import("util", $$src, $$dest);Object.assign($$defaults,{isArray});
  const utils =await $$import("util", $$src, $$dest);Object.assign($$defaults,utils);
  const/*!@@*/a=a$$?? 42;  let/*!@@*/b=b$$?? 0;
  let/*!@@*/c=c$$?? a / b;
  $$defaults.default={ x: 'y' };
  const/*!@@*/complex=complex$$?? {
    value: 'OSOM',
  };
  let/*!@@*/object=object$$?? {
    foo: 'bar',
  };
  $$fx(async () => { console.log('FX',{a,b,c})/*!#@@@*/}, () => [a, b, c]);
  $$sync(b = 8);
  $$sync(b = 5);
  console.log('END',{a,b,c});
;return { ctx: $$defaults, data: () => ({ a, b, c, complex, object, self, $$slots, $$props }) };
}, __render = false, __props = ["a","b","c","complex","object"];
`;

  async function env(code, context, callback) {
    const ctx = Object.create(null);
    const state = resolver();
    const options = { importModuleDynamically: () => util };

    await runInNewContext(`${code};module.exports=__resolve`, { module: ctx }, options);
    return state.resolve(ctx.exports, context, null, null, x => import(x), 0, callback);
  }

  test('should compute state while run effects', async ({ expect }) => {
    const output = compile(source).code;
    expect(output).toEqual(expected);

    const result = await env(output, { a: 1, b: 2 });
    delete result.self;
    expect(result).toEqual({
      a: 1,
      b: 5,
      c: 0.5,
      complex: { value: 'OSOM' },
      object: { foo: 'bar' },
      $$props: undefined,
      $$slots: undefined,
    });
  });
});

test.group('store', () => {
  test('should handle stores, scalar values and context getters', async ({ expect }) => {
    const count = writable(0);
    const getter = computed(x => x.y);
    const time = readable(new Date(), function start(set) {
      const interval = setInterval(() => {
        set(new Date());
      }, 100);

      return function stop() {
        clearInterval(interval);
      };
    });

    const times = [];
    const start = new Date();
    const end = time.subscribe(now => {
      times.push(now);
    });

    const elapsed = derived(
      time,
      $time => Math.round(($time - start) / 100));

    setTimeout(end, 500);

    const ctx = { y: 42 };
    const state = resolver(ctx);

    const result = await state.resolve(() => {
      const tt = time;
      const cc = count;
      const dd = getter;
      return { ctx: null, data: () => ({ tt, cc, dd }) };
    }, {}, null, null, x => import(x), 500, () => {
      expect(get(count)).toEqual(0);
      process.nextTick(() => count.update(x => x + 2));
    });

    expect(result.cc.current).toEqual(2);
    expect(result.dd.current).toEqual(42);
    expect(times.length).toEqual(5);
    expect(get(elapsed)).toEqual(4);
  });

  test('should respond to get/set methods on the .current property', ({ expect }) => {
    const count1 = readable(0);

    expect(() => {
      count1.current += 1;
    }).toThrow(/Cannot set property current/);
    expect(count1.current).toEqual(0);

    const count2 = writable(0);

    expect(() => {
      count2.current += 1;
    }).not.toThrow();
    expect(count2.current).toEqual(1);
    expect(count2 + 1).toEqual(2);
  });
});
