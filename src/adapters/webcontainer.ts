/**
 * Server-side no-op adapter for `@webcontainer/api`.
 * In the browser the importmap maps the real package specifier to CDN.
 */

/* @browser-only: re-exports from '@webcontainer/api' via importmap */

export class WebContainer {
  static async boot(): Promise<WebContainer> {
    return new WebContainer();
  }

  async mount(_files: unknown): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async spawn(_cmd: string, _args?: string[]): Promise<any> {
    return { output: { pipeTo: () => {} }, exit: Promise.resolve(0) };
  }

  on(_event: string, _handler: unknown): void {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fs: any = {
    writeFile: async () => {},
    readFile: async () => '',
    mkdir: async () => {},
  };
}
