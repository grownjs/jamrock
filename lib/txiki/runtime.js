// QuickJS / txiki.js — fill globals expected by Jamrock server core
if (typeof globalThis.process === 'undefined') {
  globalThis.process = { env: { NODE_ENV: 'production' }, argv: [], shared: {} };
} else if (!globalThis.process.env) {
  globalThis.process.env = { NODE_ENV: 'production' };
}
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = { subtle: null };
}
if (!globalThis.structuredClone) {
  globalThis.structuredClone = v => JSON.parse(JSON.stringify(v));
}
