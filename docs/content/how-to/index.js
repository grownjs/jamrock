import env from 'jamrock/nodejs';

env({
  uws: false,
  watch: true,
  redis: false,
  src: './src',
  dest: './dist',
  generators: {
    less: await import('less'),
  },
})[process.argv.includes('--build') ? 'build' : 'serve']();
