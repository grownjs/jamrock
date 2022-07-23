/* eslint-disable max-len */

import { test } from '@japa/runner';
import * as util from 'util';
import { runInNewContext } from 'vm';

import {
  transform, variables, resolve,
  readable, writable, connect, derived, get,
} from '../src/reactor/index.mjs';

function compile(code, ...args) {
  return transform(variables(code), ...args);
}

test.group('compiler', () => {
  test('should transform import/export symbols', ({ expect }) => {
    expect(compile(`
      import "x";
      export { y } from './ref';
      export { default as z } from './test';
    `, false, deps => deps)).toEqual({
      alias: {},
      code: '\n      /*!#7*/await __loader("x");\n      const { y } =await __loader("./ref");$def(_$, { y });\n      _$.z=await __loader("./test");\n    ',
      deps: [],
      hasVars: true,
      variables: [],
      keys: ['y'],
      locals: { y: 'export' },
    });
  });

  test('should transform aliased exports and locals', ({ expect }) => {
    const test1 = compile(`
      let cssClass = null;
      export { cssClass as class };

      const data = 42;
      let local = null;
    `);
    expect(test1.hasVars).toEqual(true);
    expect(test1.locals).toEqual({ data: 'const', class: 'export', local: 'var' });
    expect(test1.alias).toEqual({ cssClass: 'class' });
    expect(test1.keys).toEqual(['cssClass', 'local']);
    expect(test1.deps).toEqual(['cssClass', 'data', 'local']);
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
    `).code).toEqual(`async $$ => {with ($$) {
      $get(async () => {x = y/*!#@@@*/}, []);
      $get(async () => { if (z) {}/*!#@@@*/}, []);
      $get(async () => { if (z) {
        ok
      }/*!#@@@*/}, []);
      $get(async () => { path = to.replace(/\\/$/, '')/*!#@@@*/}, []);
      $get(async () => { active = exact
        ? (path || '/') === request_path
        : request_path.indexOf(path || '/') === 0/*!#@@@*/}, []);
      $get(async () => { className = \`\${className || ''}\${active ? ' active' : ''}\`.trim()/*!#@@@*/}, []);
      $get(async () => { {
        x = -1;
      }/*!#@@@*/}, []);
      $get(async () => { {
        if (x) {
          y = 0;
        }
      }/*!#@@@*/}, []);
                        \n      $get(async () => { data = await x/*!#@@@*/}, []);
      $get(async () => { foo = x
        ? y
        : z/*!#@@@*/}, []);
      $get(async () => { try {
        x;
      } catch (e) {
        y;
      } finally {
        z;
      }/*!#@@@*/}, []);
      $get(async () => { if (x) {
        a;
      } else if (y) {
        b;
      } else {
        c;
      }/*!#@@@*/}, []);
    }}`);
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
    `).code).toEqual(`async $$ => {with ($$) {
      await $set(async () => {  value=void 0, a=void 0,b=void 0,c=void 0,x=void 0,m=void 0,o=void 0,e=void 0,y=void 0,bar=void 0,other=void 0,key=void 0,next=void 0,baz=void 0,ok=void 0,bazzinga=void 0,used=void 0,values=void 0,foo = 0/*!#@@@*/});
      $get(async () => { value = value.toUpperCase()/*!#@@@*/}, ['value']);
      $get(async () => { if (a) { if (b && c.d || (x && m.n[o]) ) { e } }/*!#@@@*/}, ['a', 'b', 'c', 'x', 'm', 'o', 'e']);
      $get(async () => { if (m === 'n') { }/*!#@@@*/}, ['m']);
      $get(async () => { if (x.q === 'JOE' && y) {
        foo = bar
        other = 42;
        color = 'red';
        a = b ? c : ok;
        typeof other;
        key in next;
        for (let item of values);
      }/*!#@@@*/}, ['x', 'y', 'bar', 'b', 'c', 'ok', 'other', 'key', 'next', 'values']);
      $get(async () => { foo = bar.baz/*!#@@@*/}, ['bar']);
      $get(async () => { testing = other[key[next]].value/*!#@@@*/}, ['other', 'key', 'next']);
      $get(async () => { foo = bar[baz.buzz[x[y].z][ok]] = bazzinga/*!#@@@*/}, ['bar', 'baz', 'x', 'y', 'ok']);
      $get(async () => { console.log({ used, values, key: foo.bar })/*!#@@@*/}, ['used', 'values', 'foo']);
    }}`);
  });

  test('should rewrite complex expressions from exported symbols', ({ expect }) => {
    const js = `
      export const foo = bar(new Date(), {
        baz: () => {
          return ({ x: 42 });
        },
      });
    `;

    expect(compile(js).code).toEqual(`async $$ => {with ($$) {
      foo =await $set(async () => ( bar(new Date(), {
        baz: () => {
          return ({ x: 42 });
        },
      })/*!#@@@*/));
    }}`);
  });
});

test.group('resolve', () => {
  const data = {
    b: undefined,
    c: undefined,
  };

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

  const expected = `
    async $$ => {with ($$) {
    const {isArray} =await import("util");$def(_$, { isArray });
    const utils =await import("util");$def(_$, { utils });
    a =await $set(async () => ( 42/*!#@@@*/));
    await $set(async () => { b = 0/*!#@@@*/});
    await $set(async () => { c = a / b/*!#@@@*/});
    _$={ x: 'y' };
    complex =await $set(async () => ( {
      value: 'OSOM',
    }/*!#@@@*/));
    await $set(async () => { object = {
      foo: 'bar',
    }/*!#@@@*/});
    $get(async () => { console.log('FX',{a,b,c})/*!#@@@*/}, ['b', 'c']);
    b = 8;
    b = 5;
    console.log('END',{a,b,c});
  }}`;

  async function check(src, _data) {
    const msg = [];
    const debug = { log: (...args) => msg.push(args) };
    const options = { importModuleDynamically: () => util };
    const { data: result } = await runInNewContext(`resolve(null, data, ${src})`, { console: debug, resolve, data: _data }, options);
    return { msg, result };
  }

  test('should return exported symbols after eval', async ({ expect }) => {
    let x;
    const cb = () => { x = -1; };
    const scope = { x: 42, def: undefined };
    const sample = compile('export const def = x / 2;');
    const { data: result } = await runInNewContext(`resolve(null, scope, ${sample.code}, cb)`, { resolve, scope, cb });

    expect(x).toEqual(-1);
    expect(result.x).toEqual(42);
    expect(result.def).toEqual(42 / 2);
  });

  test('should execute once and update multiple times', async ({ expect }) => {
    const output = compile(source).code.replace(/__loader/g, 'import');
    expect(output).toEqual(expected.trim());

    const a = await check(output, { ...data, a: undefined, complex: undefined });
    expect(a.msg).toEqual([
      ['FX', { a: 42, b: 0, c: Infinity }],
      ['FX', { a: 42, b: 8, c: 5.25 }],
      ['FX', { a: 42, b: 5, c: 8.4 }],
      ['END', { a: 42, b: 5, c: 8.4 }],
    ]);
    expect(a.result).toEqual({
      a: 42,
      b: 5,
      c: 8.4,
      isArray: util.isArray,
      utils: util,
      complex: { value: 'OSOM' },
      default: { x: 'y' },
    });
  });

  test('should reevaluate setters on local assignments', async ({ expect }) => {
    // eslint-disable-next-line no-new-func
    const { data: m } = await resolve(null, data, new Function('ctx', `
      with (ctx) {
        const a = 42;
        $set(() => { b = 2; });
        $set(() => { c = a * b; });
      }
    `));
    expect(m).toEqual({ b: 2, c: 84 });
  });

  test('should evaluate effects atfer definition', async ({ expect }) => {
    let t;
    await resolve(null, data, ctx => {
      ctx.$get(() => { t = 1; }, []);
    });
    expect(t).toEqual(1);
  });

  test('should evaluate effects asynchronously', async ({ expect }) => {
    const p = [];
    let r;
    await resolve(null, data, ctx => {
      p.push('BEFORE');
      ctx.$get(async () => {
        p.push('PENDING');
        await new Promise(ok => setTimeout(() => {
          p.push('EFFECT');
          r = 1;
          ok();
        }, 200));
        p.push('DONE');
      }, []);
    }, () => {
      p.push('COMMIT');
    });
    expect(r).toEqual(1);
    expect(p).toEqual(['BEFORE', 'PENDING', 'COMMIT', 'EFFECT', 'DONE']);
  });

  test('should work over declared locals only', async ({ expect }) => {
    const AsyncFunction = (async () => {}).constructor;
    const { data: res } = await resolve(null, { color: undefined, value: undefined, other: undefined }, new AsyncFunction('ctx', `
      with (ctx) {
        await $set(async () => { value = 'Jude'; });
        await $set(async () => { other = -1; });

        $get(async () => { value = value.toUpperCase() }, ['value']);
        $get(async () => { if (value === 'JOE') {
          other = 42;
          color = 'red';
        } }, ['value']);

        value = 'joe';
      }
    `));
    expect(res).toEqual({ color: 'red', value: 'JOE', other: 42 });
  });

  test('should run body, after and callback code in order', async ({ expect }) => {
    function pause(ms) {
      return new Promise(ok => setTimeout(ok, ms));
    }

    const stack = [];
    await resolve(null, {}, async () => {
      stack.push(1);
      await pause(100);
      stack.push(2);
      return async () => {
        stack.push(3);
        await pause(100);
        stack.push(4);
      };
    }, async () => {
      stack.push(5);
      await pause(100);
      stack.push(6);
    });
    expect(stack).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test('should work fine with self-references and initial values', async ({ expect }) => {
    const locals = { name: undefined };
    const retval = (...v) => resolve(null, locals, ctx => {
      ctx.$get(() => { ctx.name = `${ctx.name || ''} x`.trim(); }, ['name']);
      if (v.length) while (v.length) ctx.name = v.shift();
    });

    const xy = await Promise.all([retval(), retval('m'), retval('n', 'o')]);

    expect(xy.map(x => x.data.name).join('')).toEqual('xm xo x');
  });

  test('should allow to return aliased locals, e.g. { cssClass as class }', async ({ expect }) => {
    const { data: classes } = await resolve(null, {}, ctx => {
      let cssClass;
      ctx.$def(ctx._$, { class: cssClass });
      cssClass = 'active';
      return () => ctx.$def(ctx._$, { class: cssClass });
    });
    expect(classes.class).toEqual('active');
  });
});

test.group('store', () => {
  test('should accept scalar values and context getters', async ({ expect }) => {
    const count = writable(0);
    const getter = connect(x => x.y);
    let temp;
    await resolve({ y: 42 }, { cc: undefined, dd: undefined }, ctx => {
      ctx.cc = count;
      ctx.dd = getter;
      temp = { cc: ctx.cc, dd: ctx.dd };
    });
    count.update(x => x + 2);
    expect(get(count)).toEqual(2);
    expect(temp).toEqual({ cc: 0, dd: 42 });

    await new Promise(next => {
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
      setTimeout(() => {
        end();

        const elapsed = derived(
          time,
          $time => Math.round(($time - start) / 100));

        try {
          expect(get(elapsed)).toEqual(4);
          expect(times.length).toEqual(5);
        } finally {
          next();
        }
      }, 500);
    });
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
  });
});
