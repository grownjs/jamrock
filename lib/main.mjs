/* global Bun, Deno, imports */

import { Util } from '../dist/main.mjs';

export function createLocalEnvironment() {
  if (typeof imports !== 'undefined') return import('./gtk4/test.js');
  if (typeof Deno !== 'undefined') return import('./deno/test.js');
  if (typeof Bun !== 'undefined') return import('./bun/test.js');
  return import('./nodejs/test.mjs');
}

/**
  @typedef {import('./env').Options} Options
  */

/**
  @template T
  @param {Options} opts
  @return {Promise<T>}
  */
export async function configureApplication(opts = {}) {
  const { test, createSandbox } = await createLocalEnvironment();

  const env = await createSandbox({
    src: (opts && opts.src) || './pages',
    dest: (opts && opts.dest) || './build',
  });

  const routes = Object.freeze(env.routes.reduce((memo, route) => {
    Util.set(memo, route.name, route);
    memo.push(route);
    return memo;
  }, []));

  return { env, test, routes };
}
