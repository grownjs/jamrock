const { updateToken, hashPassword } = require('./models/helpers');

module.exports = {
  async beforeCreate(instance) {
    await updateToken(instance);
    await hashPassword(instance);
  },
  async beforeUpdate(instance) {
    await updateToken(instance);
    await hashPassword(instance);
  },
  async beforeBulkUpdate(instance) {
    await updateToken(instance, true);
    await hashPassword(instance, true);
  },
};
