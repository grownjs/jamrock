const PocketBase = require('pocketbase');

let _client;
module.exports = {
  get client() {
    return _client;
  },
  async connect() {
    _client = new PocketBase('http://localhost:8090');

    await _client.Admins.authViaEmail(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASSWORD);
  },
};
