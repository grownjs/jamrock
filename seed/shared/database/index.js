module.exports = require('jamrock/models')({
  config: require('./config'),
  hooks: require('./hooks'),
  refs: require('./generated').default,
});
