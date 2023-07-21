import env from '../lib/deno/main.mjs';

env({
  dest: './build/output',
  src: process.env.CI ? './generated' : './examples',
}).build();
