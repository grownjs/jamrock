const port = process.env.DEV_PORT || process.env.PORT || 8080;

module.exports = {
  facebook: {
    clientID: () => process.env.FB_CLIENT_ID,
    clientSecret: () => process.env.FB_CLIENT_SECRET,
    callbackURL: `${process.env.PUBLIC_URL || `http://localhost:${port}`}/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'email', 'picture.type(large)'],
  },
};
