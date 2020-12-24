module.exports = ({ Token }) => async function clear(userId, type) {
  await Token.destroy({
    where: {
      type,
      userId,
    },
  });
};
