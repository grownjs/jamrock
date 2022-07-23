const { Grown, app } = require('./bin/cli.cjs')(process.argv.slice(2));

module.exports = app;
module.exports.init = cb => {
  if (cb) cb(Grown, app);
  return Grown;
};
