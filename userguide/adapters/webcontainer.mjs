/**
 * Server-side no-op adapter for `@webcontainer/api`.
 * Browser: importmap intercepts `/@/userguide/adapters/webcontainer.mjs` → CDN.
 *
 * @module adapters/webcontainer
 */

export class WebContainer {
  /** @returns {Promise<WebContainer>} */
  static async boot() {
    return new WebContainer();
  }

  /** @param {unknown} _files */
  async mount(_files) {}

  /**
   * @param {string} _cmd
   * @param {string[]} [_args]
   * @returns {Promise<{ output: { pipeTo: (w: any) => void }, exit: Promise<number> }>}
   */
  async spawn(_cmd, _args) {
    return { output: { pipeTo: () => {} }, exit: Promise.resolve(0) };
  }

  /** @param {string} _event @param {unknown} _handler */
  on(_event, _handler) {}

  fs = {
    /** @param {string} _path @param {string} _data */
    writeFile: async (_path, _data) => {},
    /** @param {string} _path @returns {Promise<string>} */
    readFile: async (_path) => '',
    /** @param {string} _path */
    mkdir: async (_path) => {},
  };
}
