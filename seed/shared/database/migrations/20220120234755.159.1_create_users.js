/* eslint-disable */
'use strict';
module.exports = {
  up: (queryInterface, dataTypes) => [
    () =>
      queryInterface.createTable('users', {
        id: {
          type: dataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: dataTypes.STRING,
        },
        picture: {
          type: dataTypes.STRING,
        },
        platform: {
          type: dataTypes.STRING,
        },
        identifier: {
          type: dataTypes.STRING,
        },
        email: {
          type: dataTypes.STRING,
          unique: true,
        },
        role: {
          type: dataTypes.ENUM('ROOT', 'ADMIN', 'USER', 'GUEST'),
        },
        password: {
          type: dataTypes.STRING,
        },
        verified: {
          type: dataTypes.BOOLEAN,
        },
        createdAt: {
          type: dataTypes.DATE,
        },
        updatedAt: {
          type: dataTypes.DATE,
        },
      }),
  ],
  down: (queryInterface, dataTypes) => [
    () =>
      queryInterface.dropTable('users'),
  ],
};
