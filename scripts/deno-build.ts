import env from '../lib/deno/main.mjs';

env({
  dest: './generated/output',
  src: process.env.CI ? './generated' : './examples',
}).build();
