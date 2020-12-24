const { conn, session } = require('jamrock/store');
const { join } = require('path');
const { tmpdir } = require('os');

module.exports = {
  saveDir: conn(ctx => join(tmpdir(), ctx.session.uuid)),
  isLogged: session('auth', value => !!value),
  userSession: session('profile', { path: '/', files: {} }),
  currentInfo: conn(ctx => (ctx.session.user ? ctx.session.user.currentInfo : null)),
};
