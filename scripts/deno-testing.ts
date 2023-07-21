// @ts-nocheck

import { DOMParser } from 'https://deno.land/x/deno_dom/deno-dom-wasm.ts';

import { expect } from 'npm:expect';
import { test, createSandbox } from '../lib/deno/test.js';

let driver = 'somedom';
if (process.env.DENO_DOM) {
  driver = 'deno-dom';

  const happydom = {
    Window: class Window {
      constructor() {
        this.document = new DOMParser().parseFromString('', 'text/html');
        this.Event = Event;
      }
    },
  };
  test.install({ happydom });
}

import('./smoke-test.mjs').then(({ run }) => run(test, driver, expect, createSandbox));
