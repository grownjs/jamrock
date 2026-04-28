/**
 * Server-side no-op adapter for the `codemirror` browser package.
 * Browser: importmap intercepts `/@/userguide/adapters/codemirror.mjs` → CDN.
 *
 * @module adapters/codemirror
 */

export class EditorView {
  /** @param {object} [_config] */
  constructor(_config) {}
  destroy() {}
  /** @type {{ of: (listener: any) => null }} */
  static updateListener = { of: () => null };
}

/** @type {null} */
export const basicSetup = null;
