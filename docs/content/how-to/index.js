import createEnvironment from 'jamrock/nodejs';

const env = createEnvironment({
  uws: false,
  watch: true,
  redis: false,
  src: './src',
  dest: './dist',
  generators: {
    less: await import('less'),
  },
});

if (process.argv.includes('--build')) {
  env.build();
} else {
  env.serve();
}
