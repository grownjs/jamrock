const Mailor = require('mailor');

module.exports = (dest, overrides) => {
  if (!Mailor[`@${dest}`]) {
    Mailor[`@${dest}`] = Mailor.buildMailer(dest, {
      maildev: ['test', 'development'].includes(process.env.NODE_ENV) || process.env.MAILDEV === 'YES',
      ...overrides,
    });
  }
  return Mailor[`@${dest}`];
};
