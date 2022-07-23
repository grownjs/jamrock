import { compile } from '../lib/bun/compiler.js';

compile({
  glob: '*.html',
  src: './tests/fixtures',
  dest: './generated/output',
});
