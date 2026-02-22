// WinterJS provides all WinterCG globals — just stub process
if (typeof globalThis.process === 'undefined') {
  globalThis.process = { env: {}, argv: [], shared: {} };
}
