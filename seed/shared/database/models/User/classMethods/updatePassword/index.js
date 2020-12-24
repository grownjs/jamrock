const {
  PasswordMismatch,
  OldPasswordMismatch,
} = require('~/shared/errors');

module.exports = ({ util, User }) => async function updatePassword(userId, oldPassword, newPassword, confirmPassword) {
  let user;

  try {
    user = await User.verify(null, oldPassword, userId);
  } catch (e) {
    throw new OldPasswordMismatch(e, 'Old password does not match.');
  }

  if (newPassword !== confirmPassword) {
    throw new PasswordMismatch('Wrong password confirmation.');
  }

  const encrypted = await util.encode(newPassword);

  user.password = encrypted;

  return user.save();
};
