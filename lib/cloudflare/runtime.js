// Cloudflare Workers provides WinterCG globals
if (typeof globalThis.process === 'undefined') {
  globalThis.process = {
    env: globalThis.WORKER_ENV || { NODE_ENV: 'production' },
    argv: [],
    shared: {
      printLog: (...a) => console.log(...a),
      printError: (...a) => console.error(...a),
    },
  };
} else {
  if (!globalThis.process.env) globalThis.process.env = globalThis.WORKER_ENV || { NODE_ENV: 'production' };
  if (!globalThis.process.shared) {
    globalThis.process.shared = {
      printLog: (...a) => console.log(...a),
      printError: (...a) => console.error(...a),
    };
  }
}

if (!globalThis.structuredClone) {
  globalThis.structuredClone = v => JSON.parse(JSON.stringify(v));
}
