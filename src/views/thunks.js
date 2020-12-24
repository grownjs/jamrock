const {
  createRender, registerComponent,
} = require('../render/component');

const Fragment = require('./fragment');

const { $, $$ } = createRender(Fragment);

module.exports = { $, $$, registerComponent };
