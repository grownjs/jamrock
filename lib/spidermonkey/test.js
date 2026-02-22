export * from '../../dist/server.mjs';

export const createSandbox = () => {
  throw new Error([
    "[spidermonkey] 'createSandbox' is not implemented yet.",
    'See docs/spidermonkey-runtime.md for current constraints and next steps.',
  ].join(' '));
};
