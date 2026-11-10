'use strict';

/**
 * @file models/ShiftRegistration.js
 * @description Model quản lý thời gian CTV đăng ký có thể tham gia trực Studio (Availability) (FR-05).
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ShiftRegistration = sequelize.define(
    'ShiftRegistration',
    {
      id: {
        type: DataTypes.CHAR(36),
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      periodId: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        field: 'period_id',
      },
      userId: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        field: 'user_id',
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      session: {
        type: DataTypes.STRING(10),
        allowNull: false,
        validate: {
          isIn: [['S', 'C', 'T']],
        },
      },
      note: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      tableName: 'ShiftRegistrations',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['period_id', 'user_id', 'date', 'session'],
          name: 'UQ_ShiftRegistrations_Slot',
        },
        {
          fields: ['period_id'],
        },
        {
          fields: ['user_id'],
        },
        {
          fields: ['date'],
        },
      ],
    }
  );

  return ShiftRegistration;
};

