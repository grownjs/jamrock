export default {
  generators: {
    less: await import(typeof Deno !== 'undefined' ? 'npm:less' : 'less'),
  }
};
