/* eslint-disable */
'use strict';
module.exports = {
  up: (queryInterface, dataTypes) => [
    () =>
      queryInterface.createTable('tokens', {
        id: {
          type: dataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        type: {
          type: dataTypes.ENUM('VALIDATE_EMAIL', 'RECOVER_PASSWORD'),
        },
        token: {
          type: dataTypes.STRING,
          allowNull: true,
        },
        userId: {
          type: dataTypes.INTEGER,
        },
        expirationDate: {
          type: dataTypes.DATE,
        },
        createdAt: {
          type: dataTypes.DATE,
        },
        updatedAt: {
          type: dataTypes.DATE,
        },
      }),
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
    () =>
      queryInterface.createTable('sessions', {
        id: {
          type: dataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        token: {
          type: dataTypes.STRING,
        },
        email: {
          type: dataTypes.STRING,
        },
        expirationDate: {
          type: dataTypes.DATE,
        },
        role: {
          type: dataTypes.ENUM('ROOT', 'ADMIN', 'USER', 'GUEST'),
        },
        // user <User>
        userId: {
          type: dataTypes.INTEGER,
          references: {
            model: 'users',
            key: 'id',
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
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
      queryInterface.dropTable('sessions'),
    () =>
      queryInterface.dropTable('users'),
    () =>
      queryInterface.dropTable('tokens'),
  ],
};
