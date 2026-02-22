function notImplemented(method) {
  throw new Error([
    `[spidermonkey] '${method}' is not implemented yet.`,
    'See docs/spidermonkey-runtime.md for current constraints and next steps.',
  ].join(' '));
}

export const getUnoCSSModule = () => import('@unocss/core');
export const getLessModule = () => Promise.resolve(null);

export default function createSpiderMonkeyEnvironment() {
  return {
    getUnoCSSModule,
    getLessModule,
    serve() {
      notImplemented('serve');
    },
    build() {
      notImplemented('build');
    },
    static() {
      notImplemented('static');
    },
  };
}
