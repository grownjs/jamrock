const Therror = require('therror');

module.exports = {
  UserNotFound: class extends Therror.HTTP(404) {},
  UserNotVerified: class extends Therror.HTTP(403) {},

  EmailMismatch: class extends Therror.HTTP(400) {},
  PasswordMismatch: class extends Therror.HTTP(400) {},
  OldPasswordMismatch: class extends Therror.HTTP(400) {},
  ResetPasswordExpired: class extends Therror.HTTP(401) {},

  TokenExpired: class extends Therror.HTTP(401) {},
  SessionNotFound: class extends Therror.HTTP(401) {},
  SessionExpired: class extends Therror.HTTP(401) {},
};
