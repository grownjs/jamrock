/**
 * Server-side no-op adapter for the `ansi_up` browser package.
 *
 * On the server: exports a minimal no-op class that passes text through unchanged.
 * In the browser: the importmap maps `ansi_up` to the real CDN package; the adapter
 * re-exports from there so both environments share the same import path.
 */

// Conditional export: browser gets the real package via importmap.
// Node/test environments get the no-op class below.
// The importmap continues to map `ansi_up` → CDN URL, so the browser build
// of this adapter works without changes.

/* @browser-only: re-exports from 'ansi_up' via importmap */

export default class AnsiUp {
  use_classes = false;

  ansi_to_html(txt: string): string {
    return txt;
  }
}
