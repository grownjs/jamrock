import env from '../lib/nodejs/main.mjs';

env({
  dest: './build/output',
  src: process.env.CI ? './generated' : './examples',
}).build();
