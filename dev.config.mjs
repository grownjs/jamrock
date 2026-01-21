export default {
  generators: {
    less: typeof imports !== 'undefined'
      ? undefined // TODO: port LESS.js for gjs?
      : await import(typeof Deno !== 'undefined' ? 'npm:less' : 'less'),
  },
  markdown: {
    emojify: true,
    twemoji: true,
  },
  unocss: true,
};
