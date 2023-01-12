import env from '../lib/nodejs/main.mjs';

env({
  dest: './generated/output',
  src: process.env.CI ? './generated' : './examples',
}).build();
