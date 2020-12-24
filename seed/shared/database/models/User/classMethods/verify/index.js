const {
  UserNotFound,
} = require('~/shared/errors');

module.exports = ({ util, User }) => async function verify(email, password, userId) {
  const query = {
    where: {
      email,
    },
  };

  if (!email && userId) {
    query.where = {
      id: userId,
    };
  }

  const user = await User.findOne(query);
  const result = (user && user.password)
    ? await util.compare(password, user.password)
    : null;

  if (!(user && result)) {
    throw new UserNotFound('User not found.');
  }

  return user;
};
