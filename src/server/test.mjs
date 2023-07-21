import { Runtime, Render, Util } from 'jamrock/core';

let all = [{ on: [], off: [], test: [] }];
let depth = 0;
let errors = 0;
let options;
async function run(main, stack) {
  const debug = process.argv.slice(2).includes('--stack');

  try {
    Render.enable(options);

    window.Jamrock = { Runtime: { ...Runtime } };

    Object.assign(window.Jamrock.Runtime, Render, Render.createRender());

    const tabs = Array.from({ length: depth }).join('  ');

    if (stack.t) console.log(tabs + stack.t);

    try {
      await main(window);
      await Promise.all(stack.on.map(fn => fn()));

      console.log(`1..${stack.test.length}`);

      for (const { t, fn } of stack.test) {
        let ok;
        try {
          await fn(window);
          ok = true;
        } finally {
          if (t) console.log(`${tabs}  ${ok ? 'ok' : 'not ok'} - ${t}`);
        }
      }
    } catch (e) {
      // console.log('E_MATCH', e);
      console.error((e.matcherResult ? e.matcherResult : e)[debug ? 'stack' : 'message']);
      errors++;
    } finally {
      await Promise.all(stack.off.map(fn => fn()));
    }
  } catch (e) {
    // console.log('E_RUN', e);
    console.error(e[debug ? 'stack' : 'message']);
    errors++;
  } finally {
    Render.disable();
    process.exit(errors > 0 ? 1 : 0);
  }
}

export const test = Object.defineProperties(async (t, fn) => {
  if (Util.Is.func(t)) {
    fn = t;
    t = null;
  }

  all[depth].test.push({ t, fn });
}, {
  install: { value: opts => { options = opts; } },
  before: { value: fn => { all[depth].on.push(fn); } },
  after: { value: fn => { all[depth].off.push(fn); } },
  group: { value: async (t, fn) => {
    if (Util.Is.func(t)) {
      fn = t;
      t = null;
    }

    all.push({ t, on: [], off: [], test: [] });
    depth++;
    await run(fn, all[depth]);
    depth--;
  } },
});
