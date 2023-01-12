import { expect } from 'expect';

import jsdom from 'jsdom';
import * as happydom from 'happy-dom';

import { test, createSandbox } from '../lib/nodejs/test.mjs';

let driver = 'somedom';
if (process.env.JS_DOM) {
  driver = 'jsdom';
  test.install({ jsdom });
} else if (process.env.HAPPY_DOM) {
  driver = 'happy-dom';
  test.install({ happydom });
}

import('./smoke-test.mjs').then(({ run }) => run(test, driver, expect, createSandbox));
