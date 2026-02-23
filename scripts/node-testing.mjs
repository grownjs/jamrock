import { expect } from 'expect';

import * as jsdom from 'jsdom';
import * as happydom from 'happy-dom';

import { test, createSandbox } from '../lib/nodejs/test.mjs';

let driver = 'somedom';
if (process.env.JS_DOM) {
  driver = 'jsdom';
  test.install({ jsdom });
} else if (process.env.HAPPY_DOM) {
  driver = 'happy-dom';
  test.install({ happydom });
  const { Window } = happydom;
  const window = new Window();
  if (!window.SyntaxError) window.SyntaxError = SyntaxError;
  globalThis.window = window;
  globalThis.document = window.document;
}

import('./smoke-test.mjs').then(({ run }) => run(test, driver, expect, createSandbox));
