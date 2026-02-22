function notImplemented(method) {
  throw new Error([
    `[spidermonkey] '${method}' is not implemented yet.`,
    'See docs/spidermonkey-runtime.md for current constraints and next steps.',
  ].join(' '));
}

export default function createSpiderMonkeyEnvironment() {
  return {
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
