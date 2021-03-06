const path = require('path');

module.exports = [{
  name: 'Jamrock',
  run: ({
    dest, flags, register,
  }) => {
    const { Template, transpile } = require('../dist/jamrock');

    flags.rewrite = transpile.rewrite;

    register(['jam', 'rock', 'html', 'htmlx'], async (params, done) => {
      const name = path.relative('.', params.filepath).replace(/\.\.?\//g, '');

      const isAsset = params.filepath.includes('/assets/');
      const isClient = params.filepath.includes('/client/');

      try {
        const markup = transpile.parts(params.source, params.filepath);

        params.debug = false;

        if (isAsset) {
          params.source = markup.html.trim();
          params.extension = 'html';
        } else if (isClient) {
          return transpile.render(markup, result => {
            params._bundle = true;
            params.source = result.source;
            params.options.platform = 'browser';
            params.children.push(...result.children);

            const src = `${name.replace(/\.\w+$/, '')}.js`;
            const out = flags.rename(src).replace('.js', '.bundle.js');

            return Template.bundle(src, result.source, out, require.resolve('../dist/runtime')).then(done);
          });
        } else {
          const tpl = await Template.compile(name, params.filepath, {
            component: markup,
            runtime: require.resolve('../dist/runtime'),
            jamrock: path.resolve(__dirname, '../dist/shared'),
            reload: !!flags.watch,
            write: false,
            build: true,
            dest,
          });

          params.children.push(...(tpl.children || []));
          params.source = tpl.code;
        }

        done();
      } catch (e) {
        done(e);
      }
    });
  },
}];
