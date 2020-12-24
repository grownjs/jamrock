module.exports = ({ util, User, Session }) => async function checkLogin(type, params) {
  const [user] = await User.findOrCreate({
    where: {
      platform: type,
      identifier: params.id,
    },
    defaults: {
      email: params.email,
      name: params.name,
      role: 'GUEST',
      verified: true,
    },
    hooks: false,
  });

  if ((!user.picture || user.picture.includes('://')) && params.picture) {
    const filePath = `public/files/${user.platform}_${user.identifier}_${Date.now()}.png`;
    const destFile = await util.fetch(params.picture, filePath);

    await user.update({ picture: `files/${destFile}` });
  }

  const session = await Session.create({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: session.userId,
      role: session.role,
      email: session.email,
      name: user.name,
      picture: user.picture,
      platform: user.platform,
    },
    token: session.token,
    expirationDate: session.expirationDate,
  };
};
