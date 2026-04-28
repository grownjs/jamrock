/**
 * Server-side no-op adapter for the `ansi_up` browser package.
 *
 * In the browser the playground's importmap maps `/@/userguide/adapters/ansi_up.mjs`
 * to the real CDN package — this file is never actually fetched by the browser.
 * On the server and in tests this no-op implementation is loaded instead.
 *
 * @module adapters/ansi_up
 */

export default class AnsiUp {
  /** @type {boolean} */
  use_classes = false;

  /**
   * Convert ANSI escape sequences to plain text (server no-op).
   * @param {string} txt
   * @returns {string}
   */
  ansi_to_html(txt) {
    return txt;
  }
}
