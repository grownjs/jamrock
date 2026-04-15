/**
 * E2E Test Runner
 *
 * Provides test() API backed by the DevTools bridge.
 * Tests run programmatically — no mouse needed.
 *
 * Usage in a test file:
 *   import { test } from '../../devtools/e2e/runner.mjs';
 *
 *   test('counter increments', async ({ click, getText }) => {
 *     await click('btnA');
 *     await click('btnA');
 *     assert(getText('counter') === '2');
 *   });
 */

import { findInTree } from '../lib/tree.mjs';

const PASS = '✓';
const FAIL = '✗';
const SKIP = '○';

// ─── Test registry ────────────────────────────────────────────────────────────

const _tests = [];
let _bridge = null;
let _currentTree = null;

export function setBridge(bridge) {
  _bridge = bridge;

  bridge.on('tree', msg => {
    _currentTree = msg.tree;
  });
}

// ─── Assertion helpers ────────────────────────────────────────────────────────

export class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AssertionError';
  }
}

export function assert(condition, message = 'Assertion failed') {
  if (!condition) throw new AssertionError(message);
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new AssertionError(
      message ?? `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

export function assertIncludes(haystack, needle, message) {
  if (!String(haystack).includes(String(needle))) {
    throw new AssertionError(message ?? `Expected "${haystack}" to include "${needle}"`);
  }
}

// ─── Context (passed to each test function) ───────────────────────────────────

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeContext() {
  function requireBridge() {
    if (!_bridge) throw new Error('Bridge not connected');
  }

  return {
    // Queries
    find(name) {
      return findInTree(_currentTree, name);
    },
    exists(name) {
      return !!findInTree(_currentTree, name);
    },
    getText(name) {
      const node = findInTree(_currentTree, name);
      if (!node) return null;
      // Server-side we only have the tree snapshot, not live widget state.
      // For live text, use snapshot command.
      return node.label ?? node.name ?? null;
    },
    isVisible(name) {
      const node = findInTree(_currentTree, name);
      return node?.visible ?? false;
    },
    isEnabled(name) {
      const node = findInTree(_currentTree, name);
      return node?.sensitive ?? false;
    },
    getPosition(name) {
      const node = findInTree(_currentTree, name);
      if (!node) return null;
      return { x: node.x, y: node.y, width: node.width, height: node.height };
    },

    // Actions (all async, return bridge result)
    async click(name) {
      requireBridge();
      const result = await _bridge.click(name);
      await wait(50); // let signal/tree updates propagate
      return result;
    },
    async activate(name) {
      requireBridge();
      const result = await _bridge.emit(name, 'activate');
      await wait(50);
      return result;
    },
    async setText(name, value) {
      requireBridge();
      const result = await _bridge.setText(name, value);
      await wait(50);
      return result;
    },
    async setValue(name, value) {
      requireBridge();
      const result = await _bridge.setValue(name, value);
      await wait(50);
      return result;
    },
    async setSignal(name, value) {
      requireBridge();
      const result = await _bridge.setSignal(name, value);
      await wait(50);
      return result;
    },
    async emit(name, signal, ...args) {
      requireBridge();
      const result = await _bridge.emit(name, signal, ...args);
      await wait(50);
      return result;
    },
    async highlight(name, duration = 1000) {
      requireBridge();
      return _bridge.highlight(name, duration);
    },
    async snapshot() {
      requireBridge();
      const r = await _bridge.snapshot();
      if (r?.tree) _currentTree = r.tree;
      return r;
    },
    wait,

    // Assertions (convenience wrappers)
    assert,
    assertEqual,
    assertIncludes,
  };
}

// ─── test() API ───────────────────────────────────────────────────────────────

export function test(title, fn, { skip = false, timeout = 10000 } = {}) {
  _tests.push({ title, fn, skip, timeout });
}

test.skip = (title, fn) => test(title, fn, { skip: true });

// ─── Runner ───────────────────────────────────────────────────────────────────

export async function runTests(options = {}) {
  const { onResult, onDone } = options;
  const results = [];

  for (const t of _tests) {
    if (t.skip) {
      const r = { title: t.title, status: 'skip', duration: 0 };
      results.push(r);
      onResult?.(r);
      print(SKIP + ' ' + t.title + ' (skipped)');
      continue;
    }

    const ctx = makeContext();
    const start = Date.now();
    let status = 'pass';
    let error = null;

    try {
      // Race test against timeout
      await Promise.race([
        t.fn(ctx),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Test timeout after ' + t.timeout + 'ms')), t.timeout)
        ),
      ]);
    } catch (e) {
      status = 'fail';
      error = e;
    }

    const duration = Date.now() - start;
    const r = { title: t.title, status, error, duration };
    results.push(r);
    onResult?.(r);

    if (status === 'pass') {
      print(PASS + ' ' + t.title + ' (' + duration + 'ms)');
    } else {
      print(FAIL + ' ' + t.title + ' (' + duration + 'ms)');
      print('    ' + (error?.message ?? String(error)));
    }
  }

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;

  onDone?.({ results, passed, failed, skipped });
  return { results, passed, failed, skipped };
}

export function getTests() {
  return [..._tests];
}
