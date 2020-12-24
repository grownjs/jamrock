module.exports = {
  $schema: require('./schema.json'),
  $uiSchema: {
    user: {
      'ui:hidden': true,
    },
  },
  $attributes: {
    findAll: ['token', 'email', 'expirationDate', 'role', 'userId'],
  },
};
