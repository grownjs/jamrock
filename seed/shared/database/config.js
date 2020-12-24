/* istanbul ignore file */

const env = process.env.NODE_ENV || 'development';
const logging = process.silent || env === 'production' ? false : console.log; // eslint-ignore

module.exports = {
  env,
  logging,
  timeout: 1000,
  directory: __dirname,
  seederStorage: 'sequelize',
  storage: `${__dirname}/db.sqlite`,
  dialect: 'sqlite',
  migrations: {
    database: true,
  },
};
