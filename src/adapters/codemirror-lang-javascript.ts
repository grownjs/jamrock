/**
 * Server-side no-op adapter for `@codemirror/lang-javascript`.
 * In the browser the importmap maps the real package specifier to CDN.
 */

/* @browser-only: re-exports from '@codemirror/lang-javascript' via importmap */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function javascript(..._args: any[]): any[] {
  return [];
}
