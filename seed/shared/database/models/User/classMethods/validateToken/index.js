const {
  UserNotFound,
  EmailMismatch,
} = require('~/shared/errors');

module.exports = ({ Token, User }) => async function validateToken(email, token) {
  const user = await User.findOne({ where: { email } });

  if (!user) {
    throw new UserNotFound('The user does not exists.');
  }

  const access = await Token.findOne({ where: { token, userId: user.id } });

  if (!access) {
    throw new EmailMismatch('Invalid request (access denied).');
  }

  user.verified = true;
  return user.save();
};
