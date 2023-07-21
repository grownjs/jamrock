import env from '../lib/bun/main.mjs';

env({
  dest: './build/output',
  src: process.env.CI ? './generated' : './examples',
}).build();
