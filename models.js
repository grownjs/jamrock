module.exports = require('modelorama')
  .setup(Grown => {
    Grown.use(require('@grown/model/db'));
    Grown.use(require('@grown/model/cli'));
  });
