// QuickJS / txiki.js — fill globals expected by Jamrock server core
if (typeof globalThis.process === 'undefined') {
  globalThis.process = { env: {}, argv: [], shared: {} };
}
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = { subtle: null };
}
