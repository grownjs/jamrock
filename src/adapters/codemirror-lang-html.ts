/**
 * Server-side no-op adapter for `@codemirror/lang-html`.
 * In the browser the importmap maps the real package specifier to CDN.
 */

/* @browser-only: re-exports from '@codemirror/lang-html' via importmap */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function html(..._args: any[]): any[] {
  return [];
}
