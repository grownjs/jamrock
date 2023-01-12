import env from '../lib/nodejs/main.mjs';

env({
  uws: true,
  watch: true,
  src: './examples',
  dest: './generated/output',
}).serve();
