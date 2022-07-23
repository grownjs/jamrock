import { compile } from '../lib/deno/compiler.js';

compile({
  glob: '*.html',
  src: './tests/fixtures',
  dest: './generated/output',
});
