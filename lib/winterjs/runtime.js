// WinterJS provides all WinterCG globals — just stub process
if (typeof globalThis.process === 'undefined') {
  globalThis.process = { env: { NODE_ENV: 'production' }, argv: [], shared: {} };
} else if (!globalThis.process.env) {
  globalThis.process.env = { NODE_ENV: 'production' };
}

if (!globalThis.structuredClone) {
  globalThis.structuredClone = v => JSON.parse(JSON.stringify(v));
}
