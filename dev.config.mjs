export default {
  generators: {
    less: await import(typeof Deno !== 'undefined' ? 'npm:less' : 'less'),
  },
  markdown: {
    emojify: true,
    twemoji: true,
  },
  unocss: true,
};
