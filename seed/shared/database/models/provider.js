const mailer = require('jamrock/mailer');

module.exports = {
  util: () => require('./helpers'),
  mailer: () => mailer('shared/mailings/generated'),
  useAuth() {
    return this.Session.Auth.effect(token => {
      return this.Models.get('Session').checkToken(token);
    }, {
      input: (req, data, definition) => {
        const [name, id] = definition.split('.');

        this.Models.get(name).getSchema(id).assert(data.input);
      },
    });
  },
  getUser() {},
  getToken() {},
  getSession() {},
};
