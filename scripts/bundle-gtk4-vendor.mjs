import { build } from 'esbuild';
import { mkdirSync, existsSync } from 'fs';

const vendorDir = 'lib/gtk4/vendor';

if (!existsSync(vendorDir)) {
  mkdirSync(vendorDir, { recursive: true });
}

const processShim = `
if (typeof globalThis.process === 'undefined' || !globalThis.process.env) {
  globalThis.process = { env: { NODE_ENV: 'production' }, platform: 'linux', version: 'v20.0.0', argv: [] };
}
if (typeof globalThis.location === 'undefined') {
  globalThis.location = { protocol: 'file:', href: 'file:///', hostname: 'localhost' };
}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    currentScript: null,
    getElementsByTagName: () => [],
    createElement: () => ({ setAttribute: () => {}, appendChild: () => {} }),
    createTextNode: () => ({}),
    head: { appendChild: () => {} },
    documentElement: {},
  };
}
`;

await build({
  entryPoints: ['less/dist/less.js'],
  bundle: true,
  format: 'esm',
  outfile: `${vendorDir}/less.js`,
  platform: 'browser',
  banner: { js: processShim },
  define: { 'process.env.NODE_ENV': '"production"' },
});

console.log('Built lib/gtk4/vendor/less.js');

await build({
  entryPoints: ['@unocss/core'],
  bundle: true,
  format: 'esm',
  outfile: `${vendorDir}/unocss-core.js`,
  platform: 'browser',
  define: { 'process.env.NODE_ENV': '"production"' },
});

console.log('Built lib/gtk4/vendor/unocss-core.js');
