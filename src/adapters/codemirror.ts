/**
 * Server-side no-op adapter for the `codemirror` browser package.
 *
 * Exports `EditorView` and `basicSetup` as no-ops so SSR does not crash.
 * In the browser the importmap maps `codemirror` to the real CDN package.
 */

/* @browser-only: re-exports from 'codemirror' via importmap */

export class EditorView {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(_config?: any) {}
  destroy() {}
  static updateListener = { of: () => null };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const basicSetup: any = null;
