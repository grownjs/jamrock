import env from '../lib/bun/main.mjs';

env({
  dest: './generated/output',
  src: process.env.CI ? './generated' : './examples',
}).build();
