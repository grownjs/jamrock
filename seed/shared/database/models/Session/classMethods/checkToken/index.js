const {
  SessionExpired,
} = require('~/shared/errors');

module.exports = ({ util, Session }) => async function checkToken(token) {
  const session = await Session.findOne({
    where: {
      token,
    },
  });

  if (!session || (new Date() >= session.expirationDate)) {
    throw new SessionExpired('Session has been expired.');
  }

  session.expirationDate = util.expiration(session.role);

  await session.save();

  return session;
};
