const {
  EmailMismatch,
} = require('~/shared/errors');

module.exports = ({ mailer, User, Token }) => async function addUser(email, resend) {
  const prevUser = await User.findOne({ where: { email } });

  if ((prevUser && prevUser.verified) || (prevUser && !resend)) {
    throw new EmailMismatch(`Invalid request (${prevUser ? 'already exists' : 'access denied'}).`);
  }

  const [user] = await User.findOrCreate({
    hooks: false,
    where: { email },
    defaults: { role: 'GUEST', email },
  });

  const token = await Token.buildNew(user.id, 'VALIDATE_EMAIL');

  await mailer.emailConfirmation({
    data: {
      token: token.token,
      email: user.email,
    },
    email: user.email,
    subject: 'Please confirm your e-mail address',
  });
};
