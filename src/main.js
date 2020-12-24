const Store = require('./reactor').store;
const factory = require('./jamrock');
const transpile = require('./render/transpile');

const { Template, Mortero } = require('./jamrock/template');
const { JS_RUNTIME, LIVE_RELOAD } = require('./jamrock/reloader');

module.exports = Object.assign(factory, {
  JS_RUNTIME,
  LIVE_RELOAD,
  transpile,
  Template,
  Mortero,
  Store,
});
