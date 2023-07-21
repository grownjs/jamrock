import env from '../lib/deno/main.mjs';

env({
  watch: true,
  src: './examples',
  dest: './build/output',
}).serve();
