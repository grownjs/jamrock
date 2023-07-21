import env from 'jamrock/nodejs';

env({
  uws: false,
  watch: true,
  redis: false,
  src: './src',
  dest: './dist',
})[process.argv.includes('--build') ? 'build' : 'serve']();
