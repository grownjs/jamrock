import { expect } from 'expect';
import * as happydom from 'happy-dom';
import { test, createSandbox } from '../lib/bun/test.js';

let driver = 'somedom';
if (process.env.HAPPY_DOM) {
  driver = 'happy-dom';
  test.install({ happydom });
}

import('./smoke-test.mjs').then(({ run }) => run(test, driver, expect, createSandbox));
