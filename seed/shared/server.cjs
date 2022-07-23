try {
  module.exports = require('jamrock/server')
    .init(Grown => {
      Grown.use(require('./database'));
    });

  if (require.main === module) {
    module.exports.listen(process.env.PORT || 8080);
  }
} catch (e) {
  console.error('E_FATAL', e);
}
