'use strict';

/**
 * @file models/DutyPeriod.js
 * @description Model quản lý đợt đăng ký ca trực Studio theo tháng (FR-05).
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DutyPeriod = sequelize.define(
    'DutyPeriod',
    {
      id: {
        type: DataTypes.CHAR(36),
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      month: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 12,
        },
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 2020,
          max: 2050,
        },
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'OPEN',
        validate: {
          isIn: [['OPEN', 'CLOSED', 'ARRANGING', 'CONFIRMED']],
        },
      },
      registrationDeadline: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'registration_deadline',
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdByUserId: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        field: 'created_by_user_id',
      },
      confirmedByUserId: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        field: 'confirmed_by_user_id',
      },
      confirmedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'confirmed_at',
      },
    },
    {
      tableName: 'DutyPeriods',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['month', 'year'],
          name: 'UQ_DutyPeriods_MonthYear',
        },
        {
          fields: ['status'],
        },
      ],
    }
  );

  return DutyPeriod;
};

