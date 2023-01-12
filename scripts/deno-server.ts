import env from '../lib/deno/main.mjs';

env({
  watch: true,
  src: './examples',
  dest: './generated/output',
}).serve();
