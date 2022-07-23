const props = {
  markup: '<b>OSOM</b>',
  slots: {
    default: [Math.random()],
    before: [['span', { '@html': '<b>RAW</b>' }]],
    after: [['em', null, 'B']],
  },
};

require('../test')(async elem => {
  await import('../generated/main.mjs');
  // await import('../generated/client.client.mjs');
  // await import('../generated/main.mjs');
  // console.log(window.Jamrock.components);
  const el = await elem('jamrock:main', props);
  const dom = el.source.target;

  console.log(dom.outerHTML);
});
