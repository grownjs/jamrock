import env from '../lib/bun/main.mjs';

env({
  watch: true,
  src: './examples',
  dest: './build/output',
}).serve();
