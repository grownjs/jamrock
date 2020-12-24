const randToken = require('rand-token');
const download = require('download');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const SALT_ROUNDS = 10;

const EXP_TIMES = {
  ADMIN: 45,
  ROOT: 90,
  USER: 30,
  GUEST: 15,
  VALIDATE_EMAIL: 45,
  RECOVER_PASSWORD: 90,
};

async function fetch(url, file) {
  const buffer = await download(url);
  fs.writeFileSync(file, buffer);
  return path.basename(file);
}

async function encode(value, saltRounds) {
  const salt = await bcrypt.genSalt(saltRounds || SALT_ROUNDS);
  const hash = await bcrypt.hash(value, salt);

  return hash;
}

async function compare(value, encoded) {
  const result = await bcrypt.compare(value, encoded);

  return result;
}

function generate(length) {
  return randToken.generate(length);
}

function expiration(kind) {
  const today = new Date();
  const time = EXP_TIMES[kind];

  if (typeof time !== 'number') {
    throw new Error(`Missing expiration for ${kind}`);
  }

  today.setMinutes(today.getMinutes() + time);

  return today;
}

async function updateToken(instance, multiple) {
  if (multiple) {
    if (instance.attributes.role || instance.attributes.type) {
      instance.attributes.expirationDate = expiration(instance.attributes.role || instance.attributes.type);
      instance.attributes.token = generate(16);
    }
  } else if (instance.role || instance.type) {
    instance.expirationDate = expiration(instance.role || instance.type);
    instance.token = generate(16);
  }
  return instance;
}

async function hashPassword(instance, multiple) {
  if (multiple) {
    if (instance.attributes.password) {
      instance.attributes.password = await encode(instance.attributes.password);
    }
  } else if (instance.changed('password')) {
    instance.password = await encode(instance.password);
  }
  return instance;
}

module.exports = {
  fetch,
  encode,
  compare,
  generate,
  expiration,
  updateToken,
  hashPassword,
};
