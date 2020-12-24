const {
  UserNotFound,
} = require('~/shared/errors');

module.exports = ({ User }) => async function getUser(id, email) {
  const query = {
    where: {},
  };

  if (id) {
    query.where.id = id;
  } else if (email) {
    query.where.email = email;
  }

  const user = await User.findOne(query);

  if (!user) {
    throw new UserNotFound('The user does not exists.');
  }

  return user;
};
