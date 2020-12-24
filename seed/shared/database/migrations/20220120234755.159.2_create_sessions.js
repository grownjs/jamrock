/* eslint-disable */
'use strict';
module.exports = {
  up: (queryInterface, dataTypes) => [
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
  ],
};
