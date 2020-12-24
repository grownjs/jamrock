const vm = require('vm');
const { expect } = require('chai');
const { compiler, store, loop } = require('../src/reactor');

/* global describe, it */

function transform(code, ...args) {
  return compiler.transform(compiler.variables(code), ...args);
}

describe('reactor', () => {
  describe('compiler', () => {
    it('should transform import/export symbols', () => {
      expect(transform(`
        import "x";
        export { y } from './ref';
        export { default as z } from './test';
      `, null, null, false, deps => deps)).to.eql({
        alias: {},
        children: ['x', './ref', './test'],
        code: "\n        /*!#9*/require(\"x\");\n        const { y } =require(\"./ref\");$def(_$, { y });\n        _$.z=require(\"./test\");\n      ",
        deps: [],
        hasVars: true,
        variables: [],
        keys: ['y'],
        locals: { y: 'export' },
      });
    });

    it('should transform aliased exports and locals', () => {
      const test1 = transform(`
        let cssClass = null;
        export { cssClass as class };

        const data = 42;
        let local = null;
      `);
      expect(test1.hasVars).to.eql(true);
      expect(test1.locals).to.eql({ data: 'const', class: 'export', local: 'var' });
      expect(test1.alias).to.eql({ cssClass: 'class' });
      expect(test1.keys).to.eql(['cssClass', 'local']);
      expect(test1.deps).to.eql(['cssClass', 'data', 'local']);
    });

    it('should rewrite label expressions as side-effects', () => {
      expect(transform(`
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
      `).code).to.eql(`async $$ => {with ($$) {
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
                          \n        $get(async () => { data = await x/*!#@@@*/}, []);
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

    it('should include used locals as dependencies on effects', () => {
      expect(transform(`
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
      `).code).to.eql(`async $$ => {with ($$) {
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

    it('should rewrite complex expressions from exported symbols', () => {
      const js = `
        export const foo = bar(new Date(), {
          baz: () => {
            return ({ x: 42 });
          },
        });
      `;

      expect(transform(js).code).to.eql(`async $$ => {with ($$) {
        foo =await $set(async () => ( bar(new Date(), {
          baz: () => {
            return ({ x: 42 });
          },
        })/*!#@@@*/));
      }}`);
    });
  });

  describe('store', () => {
    it('should accept scalar values and context getters', async () => {
      const {
        get, conn, derived, readable, writable,
      } = store;
      const count = writable(0);
      const getter = conn(x => x.y);
      let temp;
      await loop({ y: 42 }, { cc: undefined, dd: undefined }, async ctx => {
        with (ctx) {
          cc = count;
          dd = getter;
          temp = { cc, dd };
        }
      });
      count.update(x => x + 2);
      expect(get(count)).to.eql(2);
      expect(temp).to.eql({ cc: 0, dd: 42 });

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
            $time => Math.round(($time - start) / 100)
          );

          try {
            expect(get(elapsed)).to.eql(4);
            expect(times.length).to.eql(5);
          } finally {
            next();
          }
        }, 500);
      });
    });
  });

  describe('loop', () => {
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
      const {isArray} =require("util");$def(_$, { isArray });
      const utils =require("util");$def(_$, { utils });
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

    async function test(src, data) {
      const msg = [];
      const debug = { log: (...args) => msg.push(args) };
      const { data: result } = await vm.runInNewContext(`loop(null, data, ${src})`, { console: debug, require, loop, data })
      return { msg, result };
    }

    it('should return exported symbols after eval', async () => {
      let x;
      const cb = () => { x = -1; };
      const scope = { x: 42, def: undefined };
      const sample = transform('export const def = x / 2;');
      const { data: result } = await vm.runInNewContext(`loop(null, scope, ${sample.code}, cb)`, { loop, scope, cb });

      expect(x).to.eql(-1);
      expect(result.x).to.eql(42);
      expect(result.def).to.eql(42 / 2);
    });

    it('should execute once and update multiple times', async () => {
      const output = transform(source).code;
      expect(output).to.eql(expected.trim());

      const a = await test(output, { ...data, a: undefined, complex: undefined });
      expect(a.msg).to.eql([
        ['FX', { 'a': 42, 'b': 0, 'c': Infinity }],
        ['FX', { 'a': 42, 'b': 8, 'c': 5.25 }],
        ['FX', { 'a': 42, 'b': 5, 'c': 8.4 }],
        ['END', { 'a': 42, 'b': 5, 'c': 8.4 }],
      ]);
      expect(a.result).to.eql({
        a: 42,
        b: 5,
        c: 8.4,
        isArray: require('util').isArray,
        utils: require('util'),
        complex: { value: 'OSOM' },
        default: { x: 'y' },
      });
    });

    it('should reevaluate setters on local assignments', async () => {
      const { data: m } = await loop(null, data, async ctx => {
        with (ctx) {
          const a = 42;
          $set(() => { b = 2; });
          $set(() => { c = a * b; });
        }
      });
      expect(m).to.eql({ b: 2, c: 84 });
    });

    it('should evaluate effects atfer definition', async () => {
      let t;
      await loop(null, data, async ctx => {
        with (ctx) {
          $get(() => { t = 1; }, []);
        }
      });
      expect(t).to.eql(1);
    });

    it('should evaluate effects asynchronously', async () => {
      const p = [];
      let r;
      await loop(null, data, async ctx => {
        with (ctx) {
          p.push('BEFORE');
          $get(async () => {
            p.push('PENDING');
            await new Promise(ok => setTimeout(() => {
              p.push('EFFECT');
              r = 1;
              ok();
            }, 200))
            p.push('DONE');
          }, []);
        }
      }, () => {
        p.push('COMMIT');
      });
      expect(r).to.eql(1);
      expect(p).to.eql(['BEFORE', 'PENDING', 'COMMIT', 'EFFECT', 'DONE']);
    });

    it('should work over declared locals only', async () => {
      const { data: res } = await loop(null, { color: undefined, value: undefined, other: undefined }, async ctx => {
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
      });
      expect(res).to.eql({ color: 'red', value: 'JOE', other: 42 });
    });

    it('should run body, after and callback code in order', async () => {
      const stack = [];
      await loop(null, {}, async () => {
        stack.push(1);
        await(100);
        stack.push(2);
        return async () => {
          stack.push(3);
          await(100);
          stack.push(4);
        };
      }, async () => {
        stack.push(5);
        await(100);
        stack.push(6);
      });
      expect(stack).to.eql([1, 2, 3, 4, 5, 6]);
    });

    it('should work fine with self-references and initial values', async () => {
      const locals = { name: undefined };
      const retval = (...v) => loop(null, locals, async ctx => {
        with (ctx) {
          $get(() => { name = `${name || ''} x`.trim(); }, ['name']);
          if (v.length) while (v.length) name = v.shift();
        }
      });

      const xy = await Promise.all([retval(), retval('m'), retval('n', 'o')]);

      expect(xy.map(x => x.data.name).join('')).to.eql('xm xo x');
    });

    it('should allow to return aliased locals, e.g. { cssClass as class }', async () => {
      const { data: classes } = await loop(null, {}, async ctx => {
        with (ctx) {
          let cssClass;
          $def(_$, { class: cssClass });
          cssClass = 'active';
          return () => $def(_$, { class: cssClass });
        }
      });
      expect(classes.class).to.eql('active');
    });
  });
});
