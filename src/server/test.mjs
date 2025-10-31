// @ts-check

import { Runtime, Render } from '../main.mjs';

/**
 * @typedef {object} TestGroup
 * @property {string} t - Description
 * @property {function} fn - Callback function
 */

/**
 * @typedef {object} TestStack
 * @property {string} [t] - Description
 * @property {function[]} on - Before functions
 * @property {function[]} off - After functions
 * @property {TestGroup[]} test - Callback functions
 */

/**
 * @type {TestStack[]}
 */
const all = [{ on: [], off: [], test: [] }];

let depth = 0;
let errors = 0;
let options;

/**
 * Executes a given stack of functions.
 * @param {function} main - Window wrapper for context
 * @param {TestStack} stack - Single stack of test functions
 */
async function run(main, stack) {
  const debug = process.argv.slice(2).includes('--stack');

  try {
    Render.enable(options);

    // @ts-expect-error
    window.Jamrock = { Runtime: { ...Runtime } };

    // @ts-expect-error
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
    console.error(e);
    errors++;
  } finally {
    Render.disable();
    if (!process.env.HEADLESS) process.exit(errors > 0 ? 1 : 0);
  }
}

/**
 * Main function for adding tests.
 * @param {string}    t
 * @param {function}  fn
 */
export function test(t, fn) {
  all[depth].test.push({ t, fn });
}

/**
 * @param {any}  opts
 */
test.install = opts => { options = opts; };

/**
 * @param {function}  fn
 */
test.before = fn => { all[depth].on.push(fn); };

/**
 * @param {function}  fn
 */
test.after = fn => { all[depth].off.push(fn); };

/**
 * @param {string}    t
 * @param {function}  fn
 */
test.group = async (t, fn) => {
  all.push({ t, on: [], off: [], test: [] });
  depth++;
  await run(fn, all[depth]);
  depth--;
};
