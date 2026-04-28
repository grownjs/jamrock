/**
 * Server-side no-op adapter for `@codemirror/lang-javascript`.
 * Browser: importmap intercepts `/@/userguide/adapters/codemirror-lang-javascript.mjs` → CDN.
 *
 * @module adapters/codemirror-lang-javascript
 */

/** @returns {any[]} */
export function javascript() {
  return [];
}
