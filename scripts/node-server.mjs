import env from '../lib/nodejs/main.mjs';

env({
  uws: true,
  watch: true,
  src: './examples',
  dest: './build/output',
}).serve();
