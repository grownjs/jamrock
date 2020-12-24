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
  ],
  down: (queryInterface, dataTypes) => [
    () =>
      queryInterface.dropTable('tokens'),
  ],
};
