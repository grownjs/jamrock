module.exports = ({ Token }) => async function buildNew(userId, type) {
  await Token.clear(userId, type);
  return Token.create({ userId, type });
};
