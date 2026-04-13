import env from '../lib/nodejs/main.mjs';

env({
  dest: './build/output',
  src: './examples',
  generators: {
    less: await import('less'),
  },
}).build();
