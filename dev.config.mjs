// FIXME: this should be watched an restart the process if changed
export default {
  generators: {
    less: await import(typeof Deno !== 'undefined' ? 'npm:less' : 'less'),
  },
  markdown: {
    emojify: true,
    twemoji: true,
  },
};
