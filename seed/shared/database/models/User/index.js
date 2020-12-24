module.exports = {
  $schema: require('./schema.json'),
  $uiSchema: require('./uiSchema.json'),
  $attributes: {
    findAll: ['email', 'name', 'role', 'verified', 'picture', 'platform', 'identifier'],
  },
};
