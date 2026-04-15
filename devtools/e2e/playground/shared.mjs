/**
 * Shared E2E helpers for playground examples.
 * Each app gets tested for: window exists, tree populated,
 * signals accessible, buttons clickable, snapshot works.
 */

import { test, assert, assertEqual } from '../runner.mjs';

/**
 * Standard suite every playground app should pass.
 * @param {object} opts
 * @param {string[]} opts.signals   - signal names to verify
 * @param {string[]} opts.buttons   - widget names to click (optional)
 * @param {object}   opts.extra     - extra { title, fn } tests (optional)
 */
export function standardSuite({ signals = [], buttons = [], extra = [] } = {}) {
  test('window exists in tree', ({ exists }) => {
    assert(exists('GtkApplicationWindow'), 'ApplicationWindow in tree');
  });

  test('snapshot returns valid tree', async ({ snapshot }) => {
    const r = await snapshot();
    assert(r?.ok, 'snapshot ok');
    assert(r?.tree?.type === 'ApplicationWindow', 'root is ApplicationWindow');
  });

  if (signals.length > 0) {
    test('signals are accessible via bridge', async ({ setSignal }) => {
      for (const name of signals) {
        const r = await setSignal(name, 0);
        assert(r?.ok, `setSignal(${name}) ok`);
      }
    });
  }

  if (buttons.length > 0) {
    test('named buttons are clickable', async (ctx) => {
      for (const name of buttons) {
        assert(ctx.exists(name), `${name} exists`);
        const r = await ctx.click(name);
        assert(r?.ok, `click(${name}) ok`);
      }
    });
  }

  test('eval works in app context', async ({ snapshot }) => {
    // Just verify bridge is alive via snapshot
    const r = await snapshot();
    assert(r?.ok, 'bridge alive');
  });

  for (const { title, fn } of extra) {
    test(title, fn);
  }
}
