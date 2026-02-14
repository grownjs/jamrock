/* eslint-disable max-len */

import { test } from '@japa/runner';

import * as server from '../src/server.ts';

test.group('server integration', () => {
  test('testing functions', async ({ expect }) => {
    expect(typeof server.test).toEqual('function');
    process.env.HEADLESS = true;
    await server.test.group('test.group() should run wrapped tests', () => {
      server.test('test() will run a single test', () => {
        // nothing to do yet
      });
      server.test('test() will run a single test', () => {
        throw new Error('OK');
      });
    });
  });
});
