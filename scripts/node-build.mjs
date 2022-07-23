import { compile } from '../lib/nodejs/compiler.mjs';

compile({
  glob: '*.html',
  src: './generated',
  dest: './generated/output',
});
