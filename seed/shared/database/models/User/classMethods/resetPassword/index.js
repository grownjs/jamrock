const {
  PasswordMismatch,
} = require('~/shared/errors');

module.exports = ({ util, User, Token }) => async function setPassword(token, newPassword, confirmPassword) {
  const { userId } = await Token.verify(token, 'RECOVER_PASSWORD');

  if (newPassword !== confirmPassword) {
    throw new PasswordMismatch('Wrong password confirmation.');
  }

  const encrypted = await util.encode(newPassword);

  await Token.clear(userId, 'RECOVER_PASSWORD');

  return User.update({
    password: encrypted,
  }, {
    where: {
      id: userId,
    },
  });
};
