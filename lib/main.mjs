import { set } from '../dist/server.mjs';

export function createLocalEnvironment() {
  // eslint-disable-next-line no-nested-ternary
  return typeof Deno !== 'undefined'
    ? import('./deno/test.js')
    : typeof Bun !== 'undefined'
      ? import('./bun/test.js')
      : import('./nodejs/test.mjs');
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
    set(memo, route.name, route);
    memo.push(route);
    return memo;
  }, []));

  return { env, test, routes };
}
