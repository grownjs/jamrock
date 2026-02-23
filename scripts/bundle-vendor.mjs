import { build } from 'esbuild';
import { mkdirSync, existsSync } from 'fs';

const vendorDir = 'lib/vendor';

if (!existsSync(vendorDir)) {
  mkdirSync(vendorDir, { recursive: true });
}

// Use the browser bundle — less.render(content, { filename }) is all we need,
// no filesystem @import or Node-specific features are used. The browser bundle
// is fully self-contained (no Node builtins) so it works across all runtimes
// including GJS/SpiderMonkey which has neither import.meta nor Node modules.
const lessShim = `
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
  const headNode = {
    appendChild: () => {},
    removeChild: () => {},
  };
  globalThis.document = {
    currentScript: null,
    getElementsByTagName: (tag) => (tag === 'head' ? [headNode] : []),
    createElement: () => ({ setAttribute: () => {}, appendChild: () => {} }),
    createTextNode: () => ({}),
    head: headNode,
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
  banner: { js: lessShim },
  define: { 'process.env.NODE_ENV': '"production"' },
});

console.log('Built lib/vendor/less.js');

await build({
  entryPoints: ['@unocss/core'],
  bundle: true,
  format: 'esm',
  outfile: `${vendorDir}/unocss-core.js`,
  platform: 'neutral',
  define: { 'process.env.NODE_ENV': '"production"' },
});

console.log('Built lib/vendor/unocss-core.js');
