const { conn, writable } = require('../../store');

const number = writable(0);
const logged = conn(({ session }) => !!session.auth);
const profile = conn(({ session }) => session.user || null);

module.exports = {
  number,
  logged,
  profile,
};
