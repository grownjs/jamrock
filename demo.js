require('@grown/bud')(`${__dirname}/seed`);

const props = {
  slots: {
    default: [Math.random()],
  },
};

if (!process.env.SYNC) {
  require('./test')(async elem => {
    let dom;
    let el;
    if (!process.env.BUNDLE) {
      el = require('./seed/build/client/example');
      await el.mount(document.body, props);
      dom = document.body;
    } else {
      require('./seed/build/client/example.bundle');
      el = await elem('seed:example', props);
      dom = el.source.target;
    }

    console.log(dom.innerHTML);
  });
} else {
  const html = require('.');
  const vdom = require('./seed/build/client/example').render(props);

  console.log(html.transpile.taggify(vdom));
}
