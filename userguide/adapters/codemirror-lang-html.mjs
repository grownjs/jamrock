/**
 * Server-side no-op adapter for `@codemirror/lang-html`.
 * Browser: importmap intercepts `/@/userguide/adapters/codemirror-lang-html.mjs` → CDN.
 *
 * @module adapters/codemirror-lang-html
 */

/** @returns {any[]} */
export function html() {
  return [];
}
